# SmellS by Borbone — everything

Two folders:

- **`smells-by-borbone-site/`** — the actual website (React + Vite).
- **`supabase/`** — the backend, as a Supabase Edge Function + database:
  menu persistence (so admin panel edits actually stick) and real payments via
  Flouci. See [`supabase/README.md`](supabase/README.md) for setup — start
  there, since menu persistence depends on it.
- **`payment-backend/`** — the *old* Express/Render version, kept for reference
  only. The Supabase setup above replaces it.

## Quick start (just the website, no backend yet)

```
cd smells-by-borbone-site
npm install
npm run dev
```

Opens at `http://localhost:5173`. Menu browsing, bill, everything works.
Admin panel edits won't persist until the backend below is deployed.

## Getting menu edits to actually save (do this first)

1. Deploy the backend — [`supabase/README.md`](supabase/README.md) walks
   through creating a free Supabase project, applying the database migration,
   and deploying the Edge Function, step by step.
2. In `smells-by-borbone-site/src/App.jsx`, set `PAYMENT_API_BASE_URL` to
   `https://YOUR_REFERENCE_ID.supabase.co/functions/v1` (no `/api` suffix —
   see the Supabase README), and `ADMIN_API_KEY` to match the secret you set.
3. Rebuild (`npm run build`) and redeploy the site.

## Real payments (Flouci — whenever you're ready, separate step)

The same `supabase/` backend covers Flouci — its README has the setup. Once
you've added the Flouci secrets, set `DEMO_MODE = false` in `App.jsx`,
rebuild, redeploy.

## If the site ever shows a blank page / "stops working"

It shouldn't just go blank — `src/main.jsx` has an error boundary around
the whole app, so a crash shows an actual error message instead of
nothing. If that ever shows up, screenshot the message and the stack trace
below it.
