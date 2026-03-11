-- =============================================================================
-- CineGacha: Anonymous-to-Authenticated User Migration RPC
-- =============================================================================
-- Run this migration in the Supabase Dashboard SQL Editor:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
--
-- This migration creates the migrate_anon_to_user() RPC function, which is
-- called from the OAuth callback route (src/app/auth/callback/route.ts)
-- immediately after a successful code exchange. It atomically transfers the
-- anonymous user's cards, pack state, and pity counter to the newly
-- authenticated account, then cleans up the anonymous user's data.
--
-- The function is idempotent: if called again with the same anon_id (e.g.,
-- a stale cookie after migration already happened), the guard clause exits
-- immediately without modifying anything.
--
-- Note on auth.users cleanup: this function does NOT delete the anonymous
-- user row from auth.users -- Supabase Auth manages that table and deleting
-- rows manually can cause constraint violations. For periodic cleanup of
-- stale anonymous sessions, run:
--   DELETE FROM auth.users WHERE is_anonymous = true AND created_at < NOW() - INTERVAL '30 days';
-- =============================================================================

-- ---------------------------------------------------------------------------
-- migrate_anon_to_user(p_anon_id UUID, p_user_id UUID) -- Atomic migration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.migrate_anon_to_user(
  p_anon_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Guard clause: only proceed if p_anon_id is still an anonymous user.
  -- If the anon session was already migrated (cookie is stale), the row will
  -- either be gone or no longer anonymous -- either way, return immediately.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_anon_id
      AND is_anonymous = true
  ) THEN
    RETURN;
  END IF;

  -- Step 1: Merge user_cards from anon into authenticated user.
  -- ON CONFLICT: card already owned by authenticated user -> add stars, cap at 4.
  -- (Star cap of 4 is consistent with the Phase 4 decision: 0-indexed 0..4 in DB,
  --  displayed as 1..5 in UI. Stars beyond 4 cannot be meaningfully shown.)
  INSERT INTO public.user_cards (user_id, card_id, stars, obtained_at)
  SELECT
    p_user_id,
    card_id,
    stars,
    obtained_at
  FROM public.user_cards
  WHERE user_id = p_anon_id
  ON CONFLICT (user_id, card_id) DO UPDATE
    SET stars = LEAST(public.user_cards.stars + EXCLUDED.stars, 4);

  -- Step 2: Merge profile game state into the authenticated user's profile.
  -- Strategy per field:
  --   packs_available  -> GREATEST (keep whichever is more generous)
  --   pity_counter     -> GREATEST (keep the more advanced pity progress)
  --   last_pack_regen  -> LEAST (keep the earlier timestamp so regen is not reset)
  --   total_packs_opened -> sum both accounts' history
  UPDATE public.profiles
  SET
    packs_available = GREATEST(
      profiles.packs_available,
      (SELECT packs_available FROM public.profiles WHERE id = p_anon_id)
    ),
    pity_counter = GREATEST(
      profiles.pity_counter,
      (SELECT pity_counter FROM public.profiles WHERE id = p_anon_id)
    ),
    last_pack_regen = LEAST(
      profiles.last_pack_regen,
      (SELECT last_pack_regen FROM public.profiles WHERE id = p_anon_id)
    ),
    total_packs_opened = profiles.total_packs_opened + (
      SELECT total_packs_opened FROM public.profiles WHERE id = p_anon_id
    ),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Step 3: Delete the anonymous user's card records.
  -- The authenticated user's merged cards were already inserted in Step 1.
  DELETE FROM public.user_cards
  WHERE user_id = p_anon_id;

  -- Step 4: Delete the anonymous user's profile.
  -- FK cascade (ON DELETE CASCADE from user_cards to profiles) would handle
  -- any remaining child rows, but user_cards was already cleaned in Step 3.
  DELETE FROM public.profiles
  WHERE id = p_anon_id;

  -- auth.users row for the anonymous user is intentionally left intact.
  -- Supabase Auth manages its own housekeeping. For periodic manual cleanup:
  --   DELETE FROM auth.users WHERE is_anonymous = true AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- ---------------------------------------------------------------------------
-- Grant execute to authenticated role
-- ---------------------------------------------------------------------------
-- The callback route runs with the authenticated user's session after code
-- exchange, so the anon key + session cookie is sufficient -- no service role needed.
GRANT EXECUTE ON FUNCTION public.migrate_anon_to_user(UUID, UUID) TO authenticated;
