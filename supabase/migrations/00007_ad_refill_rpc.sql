-- =============================================================================
-- Ad-Based Pack Refill RPC
-- =============================================================================
-- Grants 10 packs and resets the regen timer when a user watches an ad.
-- Guard: only works when packs_available = 0 (after regen is computed).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refill_packs_ad(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_packs_to_add INTEGER;
  v_elapsed_seconds FLOAT;
BEGIN
  -- Lock profile row
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Compute any regen that happened while waiting
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_profile.last_pack_regen));
  v_packs_to_add := LEAST(
    FLOOR(v_elapsed_seconds / 120)::INTEGER,
    10 - v_profile.packs_available
  );
  v_profile.packs_available := v_profile.packs_available + v_packs_to_add;

  -- Guard: only allow refill when at 0 packs
  IF v_profile.packs_available > 0 THEN
    RAISE EXCEPTION 'Packs not empty — ad refill only allowed at 0 packs';
  END IF;

  -- Refill to 10 and reset timer
  UPDATE public.profiles SET
    packs_available = 10,
    last_pack_regen = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return same shape as get_pack_status
  RETURN jsonb_build_object(
    'packs_available', 10,
    'pity_counter', v_profile.pity_counter,
    'pity_threshold', 10,
    'next_pack_at', NULL,
    'total_packs_opened', v_profile.total_packs_opened
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refill_packs_ad(UUID) TO authenticated;
