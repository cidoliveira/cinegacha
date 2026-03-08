-- Migration: Remove studio card type and add rarity tracking columns
--
-- Changes:
--   1. Drop the existing card_type CHECK constraint
--   2. Add new constraint allowing only 'movie', 'actor', 'director' (no studio)
--   3. Add rarity_score column (FLOAT) for debugging/analytics of computed rarity
--   4. Add popularity_snapshot column (FLOAT) to track TMDB popularity at card creation

-- Step 1: Drop existing card_type constraint
ALTER TABLE card_pool
  DROP CONSTRAINT IF EXISTS card_pool_card_type_check;

-- Step 2: Add new constraint without 'studio'
ALTER TABLE card_pool
  ADD CONSTRAINT card_pool_card_type_check
  CHECK (card_type IN ('movie', 'actor', 'director'));

-- Step 3: Add rarity_score for analytics
ALTER TABLE card_pool
  ADD COLUMN IF NOT EXISTS rarity_score FLOAT;

-- Step 4: Add popularity_snapshot to track TMDB popularity at ingestion time
ALTER TABLE card_pool
  ADD COLUMN IF NOT EXISTS popularity_snapshot FLOAT;
