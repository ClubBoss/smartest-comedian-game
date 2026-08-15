# Production Deployment

Canonical production topology:

- Cloudflare Workers: Next.js application, Route Handlers and public web surfaces.
- Supabase: Postgres, Realtime and private Storage.
- GitHub Actions: exact-main deployment authority.

The deployment lane intentionally follows the same operating pattern already used by the owner's Live Cash / Sharky repositories: GitHub-held Cloudflare credentials, exact-SHA deployment, then remote smoke before admission.

## One-time infrastructure

Create one dedicated Supabase project for this game. Do not reuse another product database.

Add these GitHub repository secrets under Settings -> Secrets and variables -> Actions:

1. `CLOUDFLARE_API_TOKEN`
2. `CLOUDFLARE_ACCOUNT_ID`
3. `SUPABASE_ACCESS_TOKEN`
4. `SUPABASE_PROJECT_REF`
5. `SUPABASE_DB_PASSWORD`
6. `SUPABASE_PUBLISHABLE_KEY`
7. `SUPABASE_SECRET_KEY`
8. `QUESTION_BANK_ADMIN_KEY`

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` may use the same Cloudflare account/credential pattern as the owner's existing Cloudflare deployments, provided the token is authorized to deploy Workers in that account.

Use a current Supabase `sb_publishable_...` key for `SUPABASE_PUBLISHABLE_KEY` and a current server-only `sb_secret_...` key for `SUPABASE_SECRET_KEY`. The application retains runtime fallback support for the legacy `SUPABASE_SERVICE_ROLE_KEY` only so existing local/E2E environments do not break; production should use the modern secret key.

`QUESTION_BANK_ADMIN_KEY` should be a new long random value unique to this application.

## Release flow

On a pull request, `Cloudflare Production` performs an OpenNext build with non-production placeholders and a Wrangler dry-run. This proves the application can be adapted to the Workers runtime without needing account credentials.

On accepted `main` or manual dispatch, the production job:

1. checks out the exact target SHA;
2. validates required credentials;
3. runs lint, typecheck and unit tests;
4. links the dedicated Supabase project;
5. previews and applies pending migrations with `supabase db push`;
6. builds the exact SHA through `@opennextjs/cloudflare`;
7. performs a Wrangler production dry-run;
8. deploys the Worker and runtime secrets together;
9. obtains the resulting `workers.dev` URL;
10. smokes `/`, `/host` and `/api/health`;
11. requires `/api/health` to prove both the exact build SHA and live Supabase connectivity.

A failed remote smoke is a failed deployment admission even if Cloudflare accepted the upload.

## Runtime variables

The Worker receives:

- `NEXT_PUBLIC_SUPABASE_URL` (derived from `SUPABASE_PROJECT_REF` during deployment)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `QUESTION_BANK_ADMIN_KEY`
- `APP_BUILD_SHA`

The Supabase secret key and Question Bank admin key must never be committed to the repository or exposed in client code.

## Local Cloudflare preview

After installing dependencies and defining normal local `.env` values:

```bash
npm run preview
```

This builds through OpenNext and runs the app in the Cloudflare Workers runtime rather than the normal Node.js Next dev server.
