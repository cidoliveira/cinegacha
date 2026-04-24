# Security

## Environment Variables

The Supabase anon key is public by design. It is safe to expose to the browser only when row-level security policies protect database access.

Server-only values must never be committed:

- `TMDB_API_READ_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_SECRET`
- OAuth provider client secrets
- Database URLs with passwords

Browser-exposed values are prefixed with `NEXT_PUBLIC_`. Treat them as public configuration, not secrets.

## Admin Routes

Routes under `src/app/api/admin/**` require:

```http
Authorization: Bearer <ADMIN_API_SECRET>
```

They use server-only credentials to seed and refresh the card pool. Deployments should use a strong random `ADMIN_API_SECRET` and should rotate it if it appears in logs, commits, screenshots, or shared terminal output.

## Supabase Service Role

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. It must only be used in server-side code. It must not be sent to the browser, stored in client components, or added to `NEXT_PUBLIC_` variables.

## Secret Hygiene

Before publishing or pushing release branches, run a secret scan across the current tree and all commits. If a real credential ever appears in git history:

1. Rotate the credential in the provider dashboard.
2. Remove the credential from git history.
3. Re-run the scan on the rewritten history.
4. Force-push only after confirming the public history is clean.

## Ignored Private Files

The repo intentionally ignores:

- `.env*` except `.env.local.example`
- `.planning/**`
- `.worktrees/**`
- `docs/plans/**`
- `docs/superpowers/**`
- `.mcp.json`
- `.vercel/**`
- `.next/**`
- `node_modules/**`
- `public/ads.txt`

These files are local workflow, deployment, generated, or account-specific artifacts.
