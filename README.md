# CineGacha

CineGacha is a browser-based gacha game for cinema fans. Players open packs, collect cards based on movies, actors, and directors, and build a persistent collection backed by real TMDB data.

The project is built as a portfolio-grade full-stack app: server-authoritative pack rolls, Supabase persistence, anonymous-first onboarding, OAuth account linking, animated card reveals, rarity effects, and a collection browser.

## Features

- Pack opening flow with timed pack regeneration and pity protection.
- Server-authoritative gacha engine implemented with Supabase PostgreSQL RPCs.
- TMDB-sourced card pool with movies, actors, and directors.
- Rarity tiers from Common through Legendary Rare.
- ATK/DEF card stats derived from TMDB data and duplicate bonuses.
- Anonymous Supabase sessions for first-play onboarding.
- OAuth sign-in with persistent cloud collections.
- Collection page with filtering, sorting, progress tracking, and detail modals.
- Rarity foil, glow, and share-image effects for high-value cards.
- Admin-only seed and refresh routes guarded by a bearer secret.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase Auth, PostgreSQL, RLS, and RPC functions
- Motion for pack and card animations
- TMDB API for source data
- Zod and p-queue for API validation and rate limiting
- html-to-image for share card rendering

## Architecture Highlights

- TMDB is never in the hot path for pack opening. Card data is pre-cached into Supabase.
- Pack rolls, pack counts, pity counters, and duplicate upgrades are handled server-side.
- RLS protects user-owned data while privileged seed operations use a service-role client behind admin-only routes.
- The UI keeps card presentation reusable across pack reveals, collection grids, and detail modals.

Read the full architecture notes in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local Setup

See [docs/SETUP.md](docs/SETUP.md) for environment variables, Supabase setup, migrations, and seed commands.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for secret handling, public versus server-only environment variables, and admin route notes.

## TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

MIT. See [LICENSE](LICENSE).
