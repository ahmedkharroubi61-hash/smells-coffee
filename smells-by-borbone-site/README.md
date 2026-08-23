# SmellS by Borbone — website

This is a real, standalone React project (built with [Vite](https://vitejs.dev)) —
not a Claude.ai preview. Once deployed, it's a normal website.

## Run it locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build for production

```bash
npm run build
```

Produces a `dist/` folder — plain HTML/JS/CSS, deployable anywhere that
serves static files.

```bash
npm run preview   # serve the production build locally, to sanity-check it
```

## Deploy it

Any static host works. Two easy options:

**Netlify** — drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop),
or with the CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Vercel**:
```bash
npm install -g vercel
vercel --prod
```
(Vercel auto-detects Vite — point it at this folder and it builds + deploys.)

Either way, add your own domain afterward from that host's dashboard.

## Three things this site needs before it's fully "live"

1. **Real payments** — `src/App.jsx` currently runs in `DEMO_MODE = true`
   (simulated payments). See `payment-backend/` (shipped separately) for the
   real Konnect-based backend, and its README for exact setup steps. Once
   that's deployed, set `DEMO_MODE = false` and `PAYMENT_API_BASE_URL` to
   its URL in `src/App.jsx`, then rebuild.

2. **Admin panel persistence** — the "Espace gérant" menu editor currently
   saves with `window.storage`, which is a Claude.ai-preview-only API and
   does not exist on a real website. Right now it fails silently (wrapped
   in try/catch), so the site won't crash, but menu edits **won't actually
   save** — they'll look fine until the page reloads, then vanish, for
   every visitor. This needs to be pointed at a real backend/database
   before the admin panel is trustworthy. Ask me to build that piece.

3. **Bundle size** — the production JS bundle is currently ~840 KB
   (mostly the embedded café photos as base64). It works fine as-is, but
   for a faster-loading production site, those images are worth moving to
   real `/public` asset files (loaded as normal `<img src="/photo.jpg">`
   instead of inlined base64) at some point. Not urgent, just worth
   knowing.

## Project structure

```
├── index.html          # entry point Vite serves
├── src/
│   ├── main.jsx         # mounts the app
│   └── App.jsx           # the whole site (menu, bill, payment, admin panel...)
├── package.json
└── vite.config.js
```

Everything about the site — menu items, prices, contact info, opening
hours, the admin passcode — is edited directly in `src/App.jsx`, in the
"EDITABLE CONTENT" section near the top.
