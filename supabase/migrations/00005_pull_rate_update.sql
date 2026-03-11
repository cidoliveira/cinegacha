-- =============================================================================
-- CineGacha: Pull Rate Rebalance
-- =============================================================================
-- Run this migration in the Supabase Dashboard SQL Editor:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
--
-- This migration:
--   1. Updates open_pack RPC with rebalanced pull rates
--      Normal: C=55%, UC=22%, R=13%, SR=6%, SSR=2.5%, UR=1%, LR=0.5%
--      Pity SR+: SR=60%, SSR=25%, UR=10%, LR=5%
-- =============================================================================

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
  v_star_count INTEGER;
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
      -- SR=6, SSR=2.5, UR=1, LR=0.5 -> total=10
      v_roll := random() * 10;
      IF v_roll < 6 THEN
        v_rolled_tier := 'SR';
      ELSIF v_roll < 8.5 THEN
        v_rolled_tier := 'SSR';
      ELSIF v_roll < 9.5 THEN
        v_rolled_tier := 'UR';
      ELSE
        v_rolled_tier := 'LR';
      END IF;
    ELSE
      -- Normal roll: store random() once, use variable in all WHEN comparisons
      -- New weights: C=55%, UC=22%, R=13%, SR=6%, SSR=2.5%, UR=1%, LR=0.5%
      v_roll := random() * 100;
      IF v_roll < 55 THEN
        v_rolled_tier := 'C';
      ELSIF v_roll < 77 THEN
        v_rolled_tier := 'UC';
      ELSIF v_roll < 90 THEN
        v_rolled_tier := 'R';
      ELSIF v_roll < 96 THEN
        v_rolled_tier := 'SR';
      ELSIF v_roll < 98.5 THEN
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

    -- Insert into user_cards (handle duplicates -> increment stars with cap)
    INSERT INTO public.user_cards (user_id, card_id)
    VALUES (p_user_id, v_card.id)
    ON CONFLICT (user_id, card_id) DO UPDATE
    SET stars = LEAST(public.user_cards.stars + 1, 4);

    -- Fetch the current star count after insert/update
    SELECT stars INTO v_star_count
    FROM public.user_cards
    WHERE user_id = p_user_id AND card_id = v_card.id;

    -- Append card to result array (now includes stars)
    v_cards := v_cards || jsonb_build_object(
      'card_id', v_card.id,
      'name', v_card.name,
      'card_type', v_card.card_type,
      'image_path', v_card.image_path,
      'rarity', v_card.rarity,
      'atk', v_card.atk,
      'def', v_card.def,
      'is_new', v_is_new,
      'stars', v_star_count
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
