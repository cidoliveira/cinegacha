-- =============================================================================
-- CineGacha: Initial Database Schema
-- =============================================================================
-- Run this migration in the Supabase Dashboard SQL Editor:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
--
-- This creates all Phase 1 tables with Row Level Security (RLS) enabled on
-- every table. No table is left without RLS.
--
-- Tables: profiles, card_pool, user_cards, albums, user_album_progress
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table 1: profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  packs_available INTEGER NOT NULL DEFAULT 5,
  last_pack_regen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pity_counter INTEGER NOT NULL DEFAULT 0,
  total_packs_opened INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Table 2: card_pool (pre-cached TMDB entities)
-- ---------------------------------------------------------------------------
CREATE TABLE card_pool (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('movie', 'actor', 'director', 'studio')),
  name TEXT NOT NULL,
  image_path TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('C', 'UC', 'R', 'SR', 'SSR', 'UR', 'LR')),
  atk INTEGER NOT NULL,
  def INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  pool_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tmdb_id, card_type)
);

ALTER TABLE card_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view card pool"
  ON card_pool FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_card_pool_rarity ON card_pool (rarity);
CREATE INDEX idx_card_pool_type_rarity ON card_pool (card_type, rarity);

-- ---------------------------------------------------------------------------
-- Table 3: user_cards (player collection)
-- ---------------------------------------------------------------------------
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES card_pool(id),
  stars INTEGER NOT NULL DEFAULT 0,
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- Only SELECT policy: all writes go through SECURITY DEFINER RPC functions
-- to prevent client-side card manipulation.
CREATE POLICY "Users can view their own cards"
  ON user_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_cards_user_id ON user_cards (user_id);
CREATE INDEX idx_user_cards_card_id ON user_cards (card_id);

-- ---------------------------------------------------------------------------
-- Table 4: albums (genre collections)
-- ---------------------------------------------------------------------------
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  genre_id INTEGER,
  card_ids TEXT[] NOT NULL DEFAULT '{}',
  reward_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view albums"
  ON albums FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Table 5: user_album_progress
-- ---------------------------------------------------------------------------
CREATE TABLE user_album_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL REFERENCES albums(id),
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, album_id)
);

ALTER TABLE user_album_progress ENABLE ROW LEVEL SECURITY;

-- Only SELECT policy: all writes go through SECURITY DEFINER RPC functions.
CREATE POLICY "Users can view their own album progress"
  ON user_album_progress FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Profile creation trigger (auto-creates profile on signup)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      'Player'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
