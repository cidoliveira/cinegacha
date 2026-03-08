-- =============================================================================
-- CineGacha: Gacha Engine RPC Functions
-- =============================================================================
-- Run this migration in the Supabase Dashboard SQL Editor:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
--
-- This migration:
--   1. Changes profiles.packs_available default from 5 to 10
--   2. Creates open_pack(UUID) RPC function (atomic pack opening)
--   3. Creates get_pack_status(UUID) RPC function (UI display)
--   4. Grants EXECUTE to authenticated role
--   5. Adds safety-net INSERT policy for profiles
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update default packs for new users: 10 instead of 5
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN packs_available SET DEFAULT 10;

-- ---------------------------------------------------------------------------
-- 2. open_pack(p_user_id UUID) -- Atomic pack opening with weighted rolls
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_pack(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_packs_to_add INTEGER;
  v_elapsed_seconds FLOAT;
  v_cards JSONB := '[]'::JSONB;
  v_rolled_tier TEXT;
  v_card RECORD;
  v_roll FLOAT;
  v_is_new BOOLEAN;
  i INTEGER;
BEGIN
  -- 1. Lock the user's profile row to prevent concurrent opens
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 2. Compute regenerated packs since last_pack_regen
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_profile.last_pack_regen));
  v_packs_to_add := LEAST(
    FLOOR(v_elapsed_seconds / 120)::INTEGER,  -- 1 pack per 120 seconds (2 minutes)
    10 - v_profile.packs_available             -- cap at max 10
  );

  IF v_packs_to_add > 0 THEN
    v_profile.packs_available := v_profile.packs_available + v_packs_to_add;
    -- Advance last_pack_regen by exact interval, NOT to NOW()
    v_profile.last_pack_regen := v_profile.last_pack_regen
      + (v_packs_to_add * INTERVAL '2 minutes');
  END IF;

  -- 3. Check sufficient packs
  IF v_profile.packs_available < 1 THEN
    RAISE EXCEPTION 'No packs available';
  END IF;

  -- 4. Roll 5 cards
  FOR i IN 1..5 LOOP
    -- Pity check FIRST: if counter >= 10, force SR+ on this card
    IF v_profile.pity_counter >= 10 THEN
      -- Roll among SR+ tiers with their relative weights
      -- SR=10, SSR=5, UR=1.5, LR=0.5 -> total=17
      v_roll := random() * 17;
      IF v_roll < 10 THEN
        v_rolled_tier := 'SR';
      ELSIF v_roll < 15 THEN
        v_rolled_tier := 'SSR';
      ELSIF v_roll < 16.5 THEN
        v_rolled_tier := 'UR';
      ELSE
        v_rolled_tier := 'LR';
      END IF;
    ELSE
      -- Normal roll: store random() once, use variable in all WHEN comparisons
      v_roll := random() * 100;
      IF v_roll < 40 THEN
        v_rolled_tier := 'C';
      ELSIF v_roll < 65 THEN
        v_rolled_tier := 'UC';
      ELSIF v_roll < 83 THEN
        v_rolled_tier := 'R';
      ELSIF v_roll < 93 THEN
        v_rolled_tier := 'SR';
      ELSIF v_roll < 98 THEN
        v_rolled_tier := 'SSR';
      ELSIF v_roll < 99.5 THEN
        v_rolled_tier := 'UR';
      ELSE
        v_rolled_tier := 'LR';
      END IF;
    END IF;

    -- Pick random card from rolled tier
    SELECT id, name, card_type, image_path, rarity, atk, def
    INTO v_card
    FROM public.card_pool
    WHERE rarity = v_rolled_tier
    ORDER BY random()
    LIMIT 1;

    -- Empty tier fallback: loop downward through tiers until a card is found
    IF NOT FOUND THEN
      IF v_rolled_tier = 'LR' THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'UR' ORDER BY random() LIMIT 1;
      END IF;
      IF NOT FOUND AND v_rolled_tier IN ('LR', 'UR') THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'SSR' ORDER BY random() LIMIT 1;
      END IF;
      IF NOT FOUND AND v_rolled_tier IN ('LR', 'UR', 'SSR') THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'SR' ORDER BY random() LIMIT 1;
      END IF;
      IF NOT FOUND AND v_rolled_tier IN ('LR', 'UR', 'SSR', 'SR') THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'R' ORDER BY random() LIMIT 1;
      END IF;
      IF NOT FOUND AND v_rolled_tier IN ('LR', 'UR', 'SSR', 'SR', 'R') THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'UC' ORDER BY random() LIMIT 1;
      END IF;
      IF NOT FOUND THEN
        SELECT id, name, card_type, image_path, rarity, atk, def INTO v_card FROM public.card_pool WHERE rarity = 'C' ORDER BY random() LIMIT 1;
      END IF;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Card pool is empty -- no cards available in any tier';
      END IF;
    END IF;

    -- Detect is_new: check BEFORE inserting whether user already owns this card
    SELECT NOT EXISTS (
      SELECT 1 FROM public.user_cards
      WHERE user_id = p_user_id AND card_id = v_card.id
    ) INTO v_is_new;

    -- Insert into user_cards (handle duplicates -> increment stars)
    INSERT INTO public.user_cards (user_id, card_id)
    VALUES (p_user_id, v_card.id)
    ON CONFLICT (user_id, card_id) DO UPDATE
    SET stars = public.user_cards.stars + 1;

    -- Append card to result array
    v_cards := v_cards || jsonb_build_object(
      'card_id', v_card.id,
      'name', v_card.name,
      'card_type', v_card.card_type,
      'image_path', v_card.image_path,
      'rarity', v_card.rarity,
      'atk', v_card.atk,
      'def', v_card.def,
      'is_new', v_is_new
    );
  END LOOP;

  -- 5. Pity update (per-pack, AFTER the loop)
  -- Check if ANY card in this pack was SR+
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_cards) AS c
    WHERE c->>'rarity' IN ('SR', 'SSR', 'UR', 'LR')
  ) THEN
    v_profile.pity_counter := 0;
  ELSE
    v_profile.pity_counter := v_profile.pity_counter + 1;
  END IF;

  -- 6. Update profile: decrement packs, set regen time, update pity, increment total
  UPDATE public.profiles SET
    packs_available = v_profile.packs_available - 1,
    last_pack_regen = v_profile.last_pack_regen,
    pity_counter = v_profile.pity_counter,
    total_packs_opened = v_profile.total_packs_opened + 1,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 7. Return result
  RETURN jsonb_build_object(
    'cards', v_cards,
    'packs_remaining', v_profile.packs_available - 1,
    'pity_counter', v_profile.pity_counter,
    'next_pack_at', CASE
      WHEN v_profile.packs_available - 1 >= 10 THEN NULL
      ELSE v_profile.last_pack_regen + INTERVAL '2 minutes'
    END
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_pack_status(p_user_id UUID) -- Read-only pack state for UI display
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pack_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_packs_to_add INTEGER;
  v_elapsed_seconds FLOAT;
  v_current_packs INTEGER;
  v_next_pack_at TIMESTAMPTZ;
BEGIN
  -- Read profile (no FOR UPDATE -- read-only operation)
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Compute regenerated packs since last_pack_regen
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_profile.last_pack_regen));
  v_packs_to_add := LEAST(
    FLOOR(v_elapsed_seconds / 120)::INTEGER,
    10 - v_profile.packs_available
  );
  v_current_packs := v_profile.packs_available + v_packs_to_add;

  -- Calculate next_pack_at timestamp
  IF v_current_packs >= 10 THEN
    v_next_pack_at := NULL;
  ELSE
    v_next_pack_at := v_profile.last_pack_regen
      + ((v_packs_to_add + 1) * INTERVAL '2 minutes');
  END IF;

  RETURN jsonb_build_object(
    'packs_available', v_current_packs,
    'pity_counter', v_profile.pity_counter,
    'pity_threshold', 10,
    'next_pack_at', v_next_pack_at,
    'total_packs_opened', v_profile.total_packs_opened
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grant execution to authenticated role
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.open_pack(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pack_status(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Safety-net INSERT policy for profiles
-- ---------------------------------------------------------------------------
-- Anonymous users created via signInAnonymously() get their profile row via
-- the handle_new_user() trigger (SECURITY DEFINER, bypasses RLS). This policy
-- is a safety net in case a direct insert is ever needed.
CREATE POLICY "Service can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
