# Architecture

CineGacha is a Next.js and Supabase app built around a simple rule: pack opening must be fast and server-authoritative. The browser presents the experience, while Supabase owns the game state.

## Application Structure

- `src/app/**` contains App Router pages, layouts, route handlers, and server actions.
- `src/components/**` contains reusable UI, gacha, card, collection, auth, and layout components.
- `src/hooks/**` contains client-side state hooks for auth, guest sessions, pack timers, tilt effects, and the local rewarded-ad abstraction.
- `src/lib/**` contains TMDB access, card-pool building, rarity logic, card display helpers, gacha constants, and Supabase clients.
- `supabase/migrations/**` contains the database schema and RPC functions.

## Data Flow

TMDB data is fetched by the card-pool builder, validated, transformed into card records, and stored in Supabase. Runtime pack opening reads from the cached `card_pool` table instead of calling TMDB.

The hot path is:

1. The client asks a server action to open a pack.
2. The server action verifies the Supabase user with `auth.getUser()`.
3. The server action calls the `open_pack` PostgreSQL RPC.
4. The RPC locks the user's profile row, applies pack regeneration, rolls rarity tiers, inserts or upgrades user cards, updates pity counters, and returns the pulled cards.
5. The client animates the returned cards.

## Supabase Model

Supabase owns authentication, persistence, and the gacha engine. Row-level security protects user-owned tables. The browser receives the public anon key, while the service-role key is used only by server-side admin utilities.

The important database responsibilities are:

- `profiles`: pack counts, pity state, and total packs opened.
- `card_pool`: cached TMDB card source data.
- `user_cards`: collected cards and duplicate/star progression.
- `albums`: genre album definitions.
- `user_album_progress`: user-specific album progress.

## Server-Authoritative Gacha

Pack opening is implemented in PostgreSQL RPCs rather than browser code. This prevents users from manipulating pack counts, rarity rolls, or duplicate upgrades from the client.

The gacha system includes:

- Five-card packs.
- Timed pack regeneration.
- Maximum pack capacity.
- Weighted rarity rolls.
- Pity protection after repeated low-rarity packs.
- Duplicate handling through capped star bonuses.

## Card Pool Pipeline

The card-pool builder fetches TMDB movies and credits, validates image availability, computes rarity scores, assigns rarity tiers, calculates ATK/DEF stats, and writes cards into Supabase in batches.

Rarity is snapshotted when a card enters the pool. Later TMDB popularity changes do not silently change an existing card's rarity.

## Auth and Persistence

The app supports anonymous-first play through Supabase anonymous auth. Users can start opening packs without creating an account. When they sign in with GitHub OAuth, the migration flow preserves the existing anonymous collection under the persistent account.

## UI System

The visual system is organized around reusable card components:

- Pack reveal uses animated card slots and rarity pre-cues.
- Collection grid uses the same card presentation at browsing density.
- Detail modals add metadata, stats, duplicate bonus breakdowns, and share-image actions.
- Rarity foil effects are isolated so the collection grid can stay performant.

## Admin Operations

Seed and refresh routes live under `src/app/api/admin/**`. They require `ADMIN_API_SECRET` as a bearer token and use the Supabase service-role key on the server. These routes should not be exposed without a strong secret.
