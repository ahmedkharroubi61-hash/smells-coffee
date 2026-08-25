// Backend base URL. `npm run dev` picks up VITE_API_BASE_URL from
// .env.development (your LOCAL Supabase); `npm run build` falls back to the LIVE
// backend, so the deployed site is unaffected. Must NOT end in /api — callers
// add "/api/...".
export const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://ajpvlyizqzgtjlroeqdf.supabase.co/functions/v1";
