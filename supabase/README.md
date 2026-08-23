# SmellS by Borbone — backend on Supabase

This is the whole backend as **one Supabase Edge Function** (`api`) plus a
database migration. It replaces the old Render + Neon setup: Supabase gives you
both the Postgres database *and* the place the code runs, so there's no separate
server host anymore.

- `functions/api/index.ts` — the entire backend (menu persistence + Flouci payments).
- `migrations/…_init.sql` — the `app_state` and `payments` tables.
- `config.toml` — marks the `api` function as public (no Supabase JWT required).

> **One thing only you can do:** creating the Supabase account and project.
> I can't sign in or create accounts on your behalf. Everything below the
> project-creation step is copy-paste.

---

## 1. Create the Supabase project (you)

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick a name, a strong **database password** (save it), and a region close to
   Tunisia (e.g. `eu-central-1` / Frankfurt).
3. When it finishes provisioning, open **Project Settings → General** and copy
   the **Reference ID** (looks like `abcd1234efgh5678`). You'll need it below.

## 2. Install the Supabase CLI

You don't need a global install — `npx` works. On Windows PowerShell:

```bash
npx supabase --version
```

(Or install it: `scoop install supabase`, if you use Scoop.)

## 3. Link the CLI to your project

Run these from the repo root (`smells/`), where the `supabase/` folder lives:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref YOUR_REFERENCE_ID
```

It will ask for the database password from step 1.

## 4. Create the database tables

```bash
npx supabase db push
```

This applies the migration — creates `app_state` + `payments` with row-level
security locked on (only the function can read/write them).

## 5. Set your secrets

Menu persistence needs only `ADMIN_API_KEY`. Add the Flouci ones whenever you're
ready for real payments — the menu works without them.

```bash
npx supabase secrets set ADMIN_API_KEY="a-long-random-string-you-make-up"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically — do
**not** set those yourself.

When you set up Flouci later, add:

```bash
npx supabase secrets set FLOUCI_PUBLIC_KEY="..." FLOUCI_PRIVATE_KEY="..." FRONTEND_PUBLIC_URL="https://your-site-url" BACKEND_PUBLIC_URL="https://YOUR_REFERENCE_ID.supabase.co/functions/v1/api"
```

- `FRONTEND_PUBLIC_URL` — your deployed **website** URL (Flouci sends customers back here).
- `BACKEND_PUBLIC_URL` — this function's own base URL, exactly as shown above (for the webhook).
- `FRONTEND_ORIGIN` — optional; set it to your site's origin to lock down CORS instead of `*`.

## 6. Deploy the function

```bash
npx supabase functions deploy api
```

(The `config.toml` already marks it public. If your CLI version ignores that,
add `--no-verify-jwt` to the command.)

## 7. Test it

Your backend now lives at:

```
https://YOUR_REFERENCE_ID.supabase.co/functions/v1/api
```

Check health (use `curl.exe` on Windows — plain `curl` is a different tool in
PowerShell):

```bash
curl.exe https://YOUR_REFERENCE_ID.supabase.co/functions/v1/api/health
```

Expected: `{"ok":true,"flouciConfigured":false}` (or `true` once Flouci keys are set).

## 8. Point the frontend at Supabase

In `smells-by-borbone-site/src/App.jsx`:

- Set `PAYMENT_API_BASE_URL` to **`https://YOUR_REFERENCE_ID.supabase.co/functions/v1`**
  — note: **no** `/api` on the end. The frontend already adds `/api/...` to
  every call, and `api` is the function name, so it lines up exactly.
- Set `ADMIN_API_KEY` to the same string you used in step 5.
- Rebuild (`npm run build`) and redeploy the site.

Test: edit something in the admin panel, refresh — it should stick.

---

## Local development (optional)

```bash
npx supabase start           # runs Postgres + the functions runtime in Docker
npx supabase functions serve api --env-file supabase/.env.local
```

Then hit `http://localhost:54321/functions/v1/api/health`. Put local secrets in
`supabase/.env.local` (git-ignored).

## Notes

- The old `payment-backend/` folder (Express) is no longer used — kept only for
  reference. Deploy from `supabase/` now.
- Rate limiting here is best-effort per function isolate. For a café's traffic
  that's plenty; a hard global limit would need a shared store (out of scope).
