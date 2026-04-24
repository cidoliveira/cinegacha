# Setup

## Requirements

- Node.js 22 or newer
- npm
- A Supabase project
- A TMDB API read access token

## Install

```powershell
npm install
```

## Environment Variables

Create `.env.local` from `.env.local.example`:

```powershell
Copy-Item .env.local.example .env.local
```

Fill in:

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Yes | Supabase anon key used by browser clients |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` | Browser | No | Optional Google AdSense client ID for a deployed site |
| `NEXT_PUBLIC_ADSENSE_REWARDED_AD_UNIT` | Browser | No | Reserved for an ad-provider integration |
| `TMDB_API_READ_ACCESS_TOKEN` | Server | Yes for seeding | TMDB API v3 read access token |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes for admin seed routes | Supabase service-role key |
| `ADMIN_API_SECRET` | Server | Yes for admin seed routes | Bearer secret for admin-only API routes |

Values prefixed with `NEXT_PUBLIC_` are bundled for browser use. Do not put private credentials in `NEXT_PUBLIC_` variables.

## Supabase

Apply the SQL migrations in order from `supabase/migrations/**`.

If you use the Supabase CLI, run:

```powershell
supabase db push
```

If you use the Supabase Dashboard, open the SQL editor and apply each migration in filename order.

## Seed the Card Pool

The seed routes require `ADMIN_API_SECRET`.

Seed cards:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/seed" `
  -Headers @{ Authorization = "Bearer $env:ADMIN_API_SECRET" }
```

Seed albums:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/seed-albums" `
  -Headers @{ Authorization = "Bearer $env:ADMIN_API_SECRET" }
```

Refresh the card pool:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/refresh" `
  -Headers @{ Authorization = "Bearer $env:ADMIN_API_SECRET" }
```

## Development

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Verification

```powershell
npm run lint
npm run build
```

## Deployment Notes

`public/ads.txt` is intentionally not committed because it contains account-specific deployment metadata. Add it in your deployment environment only when you operate a site with your own ad account.
