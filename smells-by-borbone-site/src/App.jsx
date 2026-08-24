import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Coffee,
  Croissant,
  CakeSlice,
  GlassWater,
  Sparkles,
  Menu as MenuIcon,
  X,
  MapPin,
  Instagram,
  Facebook,
  Clock,
  ArrowRight,
  Receipt,
  Trash2,
  CreditCard,
  Smartphone,
  Wallet,
  Check,
  AlertCircle,
  Lock,
  Pencil,
  Plus,
  Snowflake,
  CupSoda,
  Milk,
  Citrus,
  User,
} from "lucide-react";
import {
  LOGO_SRC, PHOTO_STOREFRONT, PHOTO_LATTE_ART, PHOTO_CAT_CHAIR, PHOTO_TIRAMISU,
  PHOTO_ICED_DUO, PHOTO_CARAMEL, PHOTO_OREO, PHOTO_REVIEW_LOAI, PHOTO_REVIEW_ONS,
  PHOTO_REVIEW_KHAYREDDINE, PHOTO_REVIEW_PATRIZIA, PHOTO_REVIEW_ROCHDY,
} from "./assets/images.js";
import GlobalStyles from "./GlobalStyles.jsx";
import { primeAudio, playChime, playAlarm, stopAlarm, isIOS, vibrateAlert } from "./lib/audio.js";

/* ==========================================================================
   SmellS — Digital Menu + In-Shop Bill & Payment

   This is a DIGITAL MENU + IN-SHOP BILL, not online ordering. Customers are
   physically in the café: they browse, tap "Aggiungi" on what they've had,
   review "Il tuo conto", and pay before leaving. There is no delivery,
   pickup, shipping, account system, or order queue.

   A note on payments, read before deploying:
   This file renders as a sandboxed, client-only artifact with no backend
   of its own. Real card payments require a secret API key on a server —
   putting that key in frontend code would defeat PCI compliance, which is
   exactly what section 14 of the brief warns against. So DEMO_MODE below
   simulates the create → confirm round trip so the full flow can be
   reviewed end to end. A real, deployable backend that does this correctly
   ships alongside this file — see payment-backend/README.md. It's built on
   Flouci (flouci.com), a Tunisian payment gateway authorized by the
   Central Bank of Tunisia — Stripe does not support merchants based in
   Tunisia, so it isn't an option here. Flip DEMO_MODE to false once that
   backend is deployed and PAYMENT_API_BASE_URL points at it.

   Everything an owner would need to edit — menu items, prices, categories,
   table numbers, contact details — lives in the "EDITABLE CONTENT" block.
   ========================================================================== */



const categories = [
  { id: "hot-coffee", label: "Café Chaud", icon: Coffee },
  { id: "latte-macchiato", label: "Latte Macchiato", icon: Milk },
  { id: "iced-coffee", label: "Iced Coffee", icon: Snowflake },
  { id: "frappuccino", label: "Frappuccino", icon: CupSoda },
  { id: "smoothies", label: "Smoothies", icon: GlassWater },
  { id: "fresh-drinks", label: "Fresh Drinks", icon: Citrus },
  { id: "dessert", label: "Desserts", icon: CakeSlice },
  { id: "drinks", label: "Boissons", icon: GlassWater },
  { id: "extra-drinks", label: "Extra", icon: Sparkles },
];

// price is a plain number (TND) — the single source of truth used both for
// display (via formatPrice) and for calculating the bill. This is the
// starting menu; the café manager can add/edit/remove items from the Admin
// panel (footer link) without touching code — admin login is server-side.
const DEFAULT_MENU_ITEMS = [
  {"id":"hc-espresso-grain","group":"hc-espresso","category":"hot-coffee","name":"Espresso","sizeLabel":"Grain","price":3.8,"available":true},
  {"id":"hc-espresso-capsule","group":"hc-espresso","category":"hot-coffee","name":"Espresso","sizeLabel":"Capsule","price":4.8,"available":true},
  {"id":"hc-espresso-cialda","group":"hc-espresso","category":"hot-coffee","name":"Espresso","sizeLabel":"Cialda","price":4.8,"available":true},
  {"id":"hc-espresso-macchiato-grain","group":"hc-espresso-macchiato","category":"hot-coffee","name":"Espresso Macchiato","sizeLabel":"Grain","price":4,"available":true},
  {"id":"hc-espresso-macchiato-capsule","group":"hc-espresso-macchiato","category":"hot-coffee","name":"Espresso Macchiato","sizeLabel":"Capsule","price":5.3,"available":true},
  {"id":"hc-espresso-macchiato-cialda","group":"hc-espresso-macchiato","category":"hot-coffee","name":"Espresso Macchiato","sizeLabel":"Cialda","price":5.3,"available":true},
  {"id":"hc-americano-grain","group":"hc-americano","category":"hot-coffee","name":"Americano","sizeLabel":"Grain","price":4,"available":true},
  {"id":"hc-americano-capsule","group":"hc-americano","category":"hot-coffee","name":"Americano","sizeLabel":"Capsule","price":5,"available":true},
  {"id":"hc-americano-cialda","group":"hc-americano","category":"hot-coffee","name":"Americano","sizeLabel":"Cialda","price":5,"available":true},
  {"id":"hc-latte-macchiato-grain","group":"hc-latte-macchiato","category":"hot-coffee","name":"Latte Macchiato","sizeLabel":"Grain","price":4.5,"available":true},
  {"id":"hc-latte-macchiato-capsule","group":"hc-latte-macchiato","category":"hot-coffee","name":"Latte Macchiato","sizeLabel":"Capsule","price":5.5,"available":true},
  {"id":"hc-latte-macchiato-cialda","group":"hc-latte-macchiato","category":"hot-coffee","name":"Latte Macchiato","sizeLabel":"Cialda","price":5.5,"available":true},
  {"id":"lm-caramel-m","group":"lm-caramel","category":"latte-macchiato","name":"Caramel","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-caramel-l","group":"lm-caramel","category":"latte-macchiato","name":"Caramel","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-toffee-m","group":"lm-toffee","category":"latte-macchiato","name":"Toffee","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-toffee-l","group":"lm-toffee","category":"latte-macchiato","name":"Toffee","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-noisette-m","group":"lm-noisette","category":"latte-macchiato","name":"Noisette","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-noisette-l","group":"lm-noisette","category":"latte-macchiato","name":"Noisette","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-tiramisu-m","group":"lm-tiramisu","category":"latte-macchiato","name":"Tiramisù","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-tiramisu-l","group":"lm-tiramisu","category":"latte-macchiato","name":"Tiramisù","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-vanille-m","group":"lm-vanille","category":"latte-macchiato","name":"Vanille","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-vanille-l","group":"lm-vanille","category":"latte-macchiato","name":"Vanille","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-speculoos-m","group":"lm-speculoos","category":"latte-macchiato","name":"Speculoos","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-speculoos-l","group":"lm-speculoos","category":"latte-macchiato","name":"Speculoos","sizeLabel":"L","price":7,"available":true},
  {"id":"lm-dolce-m","group":"lm-dolce","category":"latte-macchiato","name":"Dolce","sizeLabel":"M","price":6,"available":true},
  {"id":"lm-dolce-l","group":"lm-dolce","category":"latte-macchiato","name":"Dolce","sizeLabel":"L","price":7,"available":true},
  {"id":"ice-latte-m","group":"ice-latte","category":"iced-coffee","name":"Ice Latte","sizeLabel":"M","price":6.5,"available":true},
  {"id":"ice-latte-l","group":"ice-latte","category":"iced-coffee","name":"Ice Latte","sizeLabel":"L","price":7.5,"available":true},
  {"id":"ice-vanille-m","group":"ice-vanille","category":"iced-coffee","name":"Ice Vanille","sizeLabel":"M","price":8,"available":true},
  {"id":"ice-vanille-l","group":"ice-vanille","category":"iced-coffee","name":"Ice Vanille","sizeLabel":"L","price":9.5,"available":true},
  {"id":"ice-caramel-m","group":"ice-caramel","category":"iced-coffee","name":"Ice Caramel","sizeLabel":"M","price":8,"available":true},
  {"id":"ice-caramel-l","group":"ice-caramel","category":"iced-coffee","name":"Ice Caramel","sizeLabel":"L","price":9.5,"available":true},
  {"id":"ice-toffee-m","group":"ice-toffee","category":"iced-coffee","name":"Ice Toffee","sizeLabel":"M","price":8,"available":true},
  {"id":"ice-toffee-l","group":"ice-toffee","category":"iced-coffee","name":"Ice Toffee","sizeLabel":"L","price":9.5,"available":true},
  {"id":"ice-noisette-m","group":"ice-noisette","category":"iced-coffee","name":"Ice Noisette","sizeLabel":"M","price":8,"available":true},
  {"id":"ice-noisette-l","group":"ice-noisette","category":"iced-coffee","name":"Ice Noisette","sizeLabel":"L","price":9.5,"available":true},
  {"id":"ice-tiramisu-m","group":"ice-tiramisu","category":"iced-coffee","name":"Ice Tiramisù","sizeLabel":"M","price":8,"available":true},
  {"id":"ice-tiramisu-l","group":"ice-tiramisu","category":"iced-coffee","name":"Ice Tiramisù","sizeLabel":"L","price":9.5,"available":true},
  {"id":"ice-peanut-butter-m","group":"ice-peanut-butter","category":"iced-coffee","name":"Ice Peanut Butter","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-peanut-butter-l","group":"ice-peanut-butter","category":"iced-coffee","name":"Ice Peanut Butter","sizeLabel":"L","price":10,"available":true},
  {"id":"ice-nutella-m","group":"ice-nutella","category":"iced-coffee","name":"Ice Nutella","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-nutella-l","group":"ice-nutella","category":"iced-coffee","name":"Ice Nutella","sizeLabel":"L","price":10,"available":true},
  {"id":"ice-speculoos-m","group":"ice-speculoos","category":"iced-coffee","name":"Ice Speculoos","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-speculoos-l","group":"ice-speculoos","category":"iced-coffee","name":"Ice Speculoos","sizeLabel":"L","price":10,"available":true},
  {"id":"ice-mars-m","group":"ice-mars","category":"iced-coffee","name":"Ice Mars","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-mars-l","group":"ice-mars","category":"iced-coffee","name":"Ice Mars","sizeLabel":"L","price":10,"available":true},
  {"id":"ice-snickers-m","group":"ice-snickers","category":"iced-coffee","name":"Ice Snickers","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-snickers-l","group":"ice-snickers","category":"iced-coffee","name":"Ice Snickers","sizeLabel":"L","price":10,"available":true},
  {"id":"ice-oreo-m","group":"ice-oreo","category":"iced-coffee","name":"Ice Oreo","sizeLabel":"M","price":8.5,"available":true},
  {"id":"ice-oreo-l","group":"ice-oreo","category":"iced-coffee","name":"Ice Oreo","sizeLabel":"L","price":10,"available":true},
  {"id":"frap-caramel-m","group":"frap-caramel","category":"frappuccino","name":"Caramel","sizeLabel":"M","price":9,"available":true},
  {"id":"frap-caramel-l","group":"frap-caramel","category":"frappuccino","name":"Caramel","sizeLabel":"L","price":10,"available":true},
  {"id":"frap-toffee-m","group":"frap-toffee","category":"frappuccino","name":"Toffee","sizeLabel":"M","price":9,"available":true},
  {"id":"frap-toffee-l","group":"frap-toffee","category":"frappuccino","name":"Toffee","sizeLabel":"L","price":10,"available":true},
  {"id":"frap-noisette-m","group":"frap-noisette","category":"frappuccino","name":"Noisette","sizeLabel":"M","price":9,"available":true},
  {"id":"frap-noisette-l","group":"frap-noisette","category":"frappuccino","name":"Noisette","sizeLabel":"L","price":10,"available":true},
  {"id":"frap-nutella-m","group":"frap-nutella","category":"frappuccino","name":"Nutella","sizeLabel":"M","price":9.5,"available":true},
  {"id":"frap-nutella-l","group":"frap-nutella","category":"frappuccino","name":"Nutella","sizeLabel":"L","price":10.5,"available":true},
  {"id":"frap-oreo-m","group":"frap-oreo","category":"frappuccino","name":"Oreo","sizeLabel":"M","price":9.5,"available":true},
  {"id":"frap-oreo-l","group":"frap-oreo","category":"frappuccino","name":"Oreo","sizeLabel":"L","price":10.5,"available":true},
  {"id":"frap-speculoos-m","group":"frap-speculoos","category":"frappuccino","name":"Speculoos","sizeLabel":"M","price":9.5,"available":true},
  {"id":"frap-speculoos-l","group":"frap-speculoos","category":"frappuccino","name":"Speculoos","sizeLabel":"L","price":10.5,"available":true},
  {"id":"frap-mars-m","group":"frap-mars","category":"frappuccino","name":"Mars","sizeLabel":"M","price":9.5,"available":true},
  {"id":"frap-mars-l","group":"frap-mars","category":"frappuccino","name":"Mars","sizeLabel":"L","price":10.5,"available":true},
  {"id":"frap-snickers-m","group":"frap-snickers","category":"frappuccino","name":"Snickers","sizeLabel":"M","price":9.5,"available":true},
  {"id":"frap-snickers-l","group":"frap-snickers","category":"frappuccino","name":"Snickers","sizeLabel":"L","price":10.5,"available":true},
  {"id":"smo-banana-m","group":"smo-banana","category":"smoothies","name":"Banana","sizeLabel":"M","price":7.5,"available":true},
  {"id":"smo-banana-l","group":"smo-banana","category":"smoothies","name":"Banana","sizeLabel":"L","price":8.5,"available":true},
  {"id":"smo-strawberry-m","group":"smo-strawberry","category":"smoothies","name":"Strawberry","sizeLabel":"M","price":7.5,"available":true},
  {"id":"smo-strawberry-l","group":"smo-strawberry","category":"smoothies","name":"Strawberry","sizeLabel":"L","price":8.5,"available":true},
  {"id":"smo-framboise-m","group":"smo-framboise","category":"smoothies","name":"Framboise","sizeLabel":"M","price":7.5,"available":true},
  {"id":"smo-framboise-l","group":"smo-framboise","category":"smoothies","name":"Framboise","sizeLabel":"L","price":8.5,"available":true},
  {"id":"smo-choco-banana-m","group":"smo-choco-banana","category":"smoothies","name":"Choco-Banana","sizeLabel":"M","price":7.5,"available":true},
  {"id":"smo-choco-banana-l","group":"smo-choco-banana","category":"smoothies","name":"Choco-Banana","sizeLabel":"L","price":8.5,"available":true},
  {"id":"smo-orange-banana-m","group":"smo-orange-banana","category":"smoothies","name":"Orange-Banana","sizeLabel":"M","price":7.5,"available":true},
  {"id":"smo-orange-banana-l","group":"smo-orange-banana","category":"smoothies","name":"Orange-Banana","sizeLabel":"L","price":8.5,"available":true},
  {"id":"smo-ananas-m","group":"smo-ananas","category":"smoothies","name":"Ananas","sizeLabel":"M","price":8,"available":true},
  {"id":"smo-ananas-l","group":"smo-ananas","category":"smoothies","name":"Ananas","sizeLabel":"L","price":9.5,"available":true},
  {"id":"smo-ananas-banana-m","group":"smo-ananas-banana","category":"smoothies","name":"Ananas-Banana","sizeLabel":"M","price":8.5,"available":true},
  {"id":"smo-ananas-banana-l","group":"smo-ananas-banana","category":"smoothies","name":"Ananas-Banana","sizeLabel":"L","price":9.5,"available":true},
  {"id":"smo-pistache-m","group":"smo-pistache","category":"smoothies","name":"Pistache","sizeLabel":"M","price":8.5,"available":true},
  {"id":"smo-pistache-l","group":"smo-pistache","category":"smoothies","name":"Pistache","sizeLabel":"L","price":10,"available":true},
  {"id":"smo-noisette-m","group":"smo-noisette","category":"smoothies","name":"Noisette","sizeLabel":"M","price":8.5,"available":true},
  {"id":"smo-noisette-l","group":"smo-noisette","category":"smoothies","name":"Noisette","sizeLabel":"L","price":10,"available":true},
  {"id":"fresh-virgin-mojito-m","group":"fresh-virgin-mojito","category":"fresh-drinks","name":"Virgin Mojito","sizeLabel":"M","price":7,"available":true},
  {"id":"fresh-virgin-mojito-l","group":"fresh-virgin-mojito","category":"fresh-drinks","name":"Virgin Mojito","sizeLabel":"L","price":8.5,"available":true},
  {"id":"fresh-red-lagoon-m","group":"fresh-red-lagoon","category":"fresh-drinks","name":"Red Lagoon","sizeLabel":"M","price":8.5,"available":true},
  {"id":"fresh-red-lagoon-l","group":"fresh-red-lagoon","category":"fresh-drinks","name":"Red Lagoon","sizeLabel":"L","price":9.5,"available":true},
  {"id":"fresh-blue-lagoon-m","group":"fresh-blue-lagoon","category":"fresh-drinks","name":"Blue Lagoon","sizeLabel":"M","price":8.5,"available":true},
  {"id":"fresh-blue-lagoon-l","group":"fresh-blue-lagoon","category":"fresh-drinks","name":"Blue Lagoon","sizeLabel":"L","price":9.5,"available":true},
  {"id":"fresh-pink-heaven-m","group":"fresh-pink-heaven","category":"fresh-drinks","name":"Pink Heaven","sizeLabel":"M","price":8.5,"available":true},
  {"id":"fresh-pink-heaven-l","group":"fresh-pink-heaven","category":"fresh-drinks","name":"Pink Heaven","sizeLabel":"L","price":9.5,"available":true},
  {"id":"fresh-energy-mojito-m","group":"fresh-energy-mojito","category":"fresh-drinks","name":"Energy Mojito","sizeLabel":"M","price":9,"available":true},
  {"id":"fresh-energy-mojito-l","group":"fresh-energy-mojito","category":"fresh-drinks","name":"Energy Mojito","sizeLabel":"L","price":10,"available":true},
  {"id":"fresh-citronade-m","group":"fresh-citronade","category":"fresh-drinks","name":"Citronade","sizeLabel":"M","price":6,"available":true},
  {"id":"fresh-citronade-l","group":"fresh-citronade","category":"fresh-drinks","name":"Citronade","sizeLabel":"L","price":7,"available":true},
  {"id":"fresh-citronade-amandes","category":"fresh-drinks","name":"Citronade aux Amandes","price":10,"available":true},
  {"id":"des-viennoiserie","category":"dessert","name":"Viennoiserie","price":2.5,"available":true},
  {"id":"des-cookies","category":"dessert","name":"Cookies","price":3.5,"available":true},
  {"id":"des-cheesecake","category":"dessert","name":"Cheesecake","price":8,"available":true},
  {"id":"des-tiramisu","category":"dessert","name":"Tiramisù","price":8,"available":true},
  {"id":"dr-the-menthe","category":"drinks","name":"Thé à la Menthe","price":4,"available":true},
  {"id":"dr-the-amandes","category":"drinks","name":"Thé aux Amandes","price":6.5,"available":true},
  {"id":"dr-the-pignons","category":"drinks","name":"Thé aux Pignons","price":8,"available":true},
  {"id":"dr-verveine","category":"drinks","name":"Verveine","price":3.5,"available":true},
  {"id":"dr-hot-tea-borbone","category":"drinks","name":"Hot Tea Borbone","price":5,"available":true},
  {"id":"dr-eau-05","category":"drinks","name":"Eau 0.5L","price":1.8,"available":true},
  {"id":"dr-eau-1","category":"drinks","name":"Eau 1L","price":3,"available":true},
  {"id":"dr-soda","category":"drinks","name":"Soda+","price":5.5,"available":true},
  {"id":"dr-shark-redbull","category":"drinks","name":"Shark / Redbull","price":9,"available":true},
  {"id":"extra-shot-coffee","category":"extra-drinks","name":"Shot Coffee","price":2,"available":true},
  {"id":"extra-cup-milk","category":"extra-drinks","name":"Cup of Milk","price":2,"available":true},
  {"id":"extra-sirop","category":"extra-drinks","name":"Sirop","price":2,"available":true},
];

// EDIT ME — replace the placeholders with the real details.
const contactInfo = {
  address: "Av. des Orangers, Khzema, Sousse, Tunisie",
  mapsUrl:
    "https://www.google.com/maps/place/SMELLS+COFFE/@35.854551,10.6114358,17z/data=!3m1!4b1!4m6!3m5!1s0x12fd8b80dbb196f1:0xdf1cb84941b06b2d!8m2!3d35.854551!4d10.6114358!16s%2Fg%2F11p73lnx1x?entry=ttu&g_ep=EgoyMDI2MDgwNS4xIKXMDSoASAFQAw%3D%3D",
  // Same place as mapsUrl above, in the iframe-embeddable format (no API
  // key needed) — pinned to the exact coordinates rather than a text
  // search, so there's no ambiguity about which place it resolves to.
  // Note: this won't render inside the Claude.ai artifact preview, which
  // blocks embedding external sites in an iframe — it works on a real
  // deployment (like your local dev server) instead.
  mapEmbedUrl: "https://maps.google.com/maps?q=35.854551,10.6114358&z=17&output=embed",
  instagram: "https://www.instagram.com/smells.coffee/",
  facebook: "https://www.facebook.com/smellscoffeebyborbone",
  hours: [
    { days: "Tous les jours", time: "07:00 – 00:00" },
  ],
};

// Real reviews, transcribed from screenshots the owner sent of their actual
// Google reviews (kept in each reviewer's original language, as written —
// not translated, so nothing is put in their mouth). To add more later,
// just copy this shape: { author, meta, text, photo }. photo is optional —
// leave it out (or null) to fall back to a plain initial avatar.
const reviews = [
  { author: "LOAÏ", meta: "10 avis", text: "Très bon plan", photo: PHOTO_REVIEW_LOAI },
  {
    author: "Ons Chebbi",
    meta: "14 avis",
    text: "Food: 5 · Service: 5 · Atmosphere: 5",
    photo: PHOTO_REVIEW_ONS,
  },
  {
    author: "Khayreddine Maslhi",
    meta: "2 avis",
    text: "Great coffee and awesome stuff",
    photo: PHOTO_REVIEW_KHAYREDDINE,
  },
  {
    author: "어흥",
    meta: "Local Guide · 2 100 avis",
    text: "Okay. The price is slightly above mid-range?",
    photo: null,
  },
  {
    author: "Patrizia Münch",
    meta: "Local Guide · 47 avis",
    text: "Pleasantly and tastefully decorated. I only had a coffee, but thoroughly enjoyed my visit. Smoking is allowed inside and the café is air-conditioned.",
    photo: PHOTO_REVIEW_PATRIZIA,
  },
  {
    author: "Rochdy Frh",
    meta: "Local Guide · 102 avis",
    text: "Nice little quiet café and the coffee tastes good",
    photo: PHOTO_REVIEW_ROCHDY,
  },
];

// Header + mobile nav. `category` links jump to the menu section and select that filter.
const navLinks = [
  { label: "Menu", sectionId: "menu", category: null },
  { label: "Café Chaud", sectionId: "menu", category: "hot-coffee" },
  { label: "Iced Coffee", sectionId: "menu", category: "iced-coffee" },
  { label: "Smoothies", sectionId: "menu", category: "smoothies" },
  { label: "Desserts", sectionId: "menu", category: "dessert" },
  { label: "Boutique", sectionId: "boutique", category: null },
  { label: "Contact", sectionId: "contact", category: null },
];
const NAV_CATEGORY_IDS = navLinks.filter((l) => l.category).map((l) => l.category);

// In-shop bill configuration. Table numbers are just one way to identify a
// customer at the till — set requireTableNumber to false if the café later
// decides to do this another way (e.g. a staff member matches the payment
// at the counter instead).
const shopConfig = {
  requireTableNumber: false,
  tableNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

// Admin panel — lets the manager add/edit/remove menu items from the site
// itself (footer link, or open the page with #admin in the URL) instead of
// editing this file. EDIT ME: change this before sharing the site.
//
// Admin auth is now handled entirely server-side (see supabase/functions/api):
// the password is verified by the backend against the ADMIN_PASSWORD secret and
// never ships in this bundle, so there is deliberately NO passcode or API key
// here to read out of dev tools. Logging in returns a short-lived token that
// menu edits are sent with; see authenticateAdmin() in the App component.

// Online card payment (Flouci) is live only when the backend has the Flouci
// secrets set — the frontend asks /config for `paymentsEnabled` and shows the
// online option only then. Until then, customers use "Payer au comptoir",
// which is fully functional. There is no simulated/demo payment path anymore.
// Supabase Edge Function base. The calls below add "/api/..." and "api" is the
// function name, so this URL must NOT end in /api.
// Backend base URL. `npm run dev` picks up VITE_API_BASE_URL from .env.development
// (your LOCAL Supabase), while `npm run build` falls back to the LIVE backend —
// so the deployed site is unaffected. See .env.development.
const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://ajpvlyizqzgtjlroeqdf.supabase.co/functions/v1";

function formatPrice(amount) {
  return `${amount.toFixed(3)} DT`;
}

/* --------- Web Push (installed-app notifications, incl. locked iPhone) ------- */

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

let sbSWReg = null;
let sbPushActive = false; // true once this device is subscribed to push for its order
async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (sbSWReg) return sbSWReg;
  try {
    sbSWReg = await navigator.serviceWorker.register("/sw.js");
    return sbSWReg;
  } catch {
    return null;
  }
}

// Whether the browser can do Web Push at all. On iOS this is only true once the
// site is opened from the Home Screen (installed as a standalone app).
function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Subscribe this device to be pushed when `orderId` is ready. Needs notification
// permission already granted. Returns true on success. Safe no-op if unsupported
// (e.g. iPhone still in a plain Safari tab).
async function subscribeOrderPush(orderId) {
  try {
    if (!orderId || !pushSupported() || Notification.permission !== "granted") return false;
    const reg = await ensureServiceWorker();
    if (!reg) return false;
    const keyRes = await fetch(`${PAYMENT_API_BASE_URL}/api/push/public-key`);
    const { key } = await keyRes.json().catch(() => ({}));
    if (!key) return false; // push not configured server-side
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const res = await fetch(`${PAYMENT_API_BASE_URL}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, subscription: sub }),
    });
    if (res.ok) sbPushActive = true; // server will push; page skips its own OS notification
    return res.ok;
  } catch {
    return false;
  }
}

// True when the site is running as an installed app (Home Screen on iOS, or an
// installed PWA elsewhere) — the only context where iOS allows push.
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true
  );
}

function currentTrackedOrderId() {
  try {
    return JSON.parse(localStorage.getItem("sb_tracked_order") || "null")?.orderId || null;
  } catch {
    return null;
  }
}

function getBillTotal(bill, items) {
  return Object.entries(bill).reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id);
    return item ? sum + item.price * qty : sum;
  }, 0);
}

function getBillCount(bill) {
  return Object.values(bill).reduce((sum, qty) => sum + qty, 0);
}

// Turns a new item's name into a unique id (e.g. "Thé à la Menthe" -> "the-a-la-menthe"),
// appending -2, -3, ... if that slug is already taken.
function slugify(name, existingIds) {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "article";
  let candidate = base;
  let n = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

// DEMO ONLY — simulates a payment provider round trip so the UI can be
// reviewed end to end without a live backend. Never treat frontend-only
// "success" as real payment confirmation in production — see
// payment-backend/README.md for the real, server-verified flow.
// Real Flouci payment flow (runs only when the online option is shown, i.e.
// payments are configured on the backend):
//   1. Ask the backend to create a payment from *server-verified* prices
//      (never the total computed in this browser tab).
//   2. Flouci is redirect-based, not an embedded card form — the backend
//      returns a payUrl, and the customer finishes paying on Flouci's own
//      hosted page, not on this site.
//   3. This leaves the page, so there is no "await" for a result here —
//      see the returning-payment check in the App component below for
//      what happens when the customer's browser comes back. Flouci
//      redirects to a URL the backend built itself (?order=...&status=...),
//      so — unlike some providers — exactly what comes back is known and
//      controlled, not something to guess at.
async function processRealPayment({ bill }) {
  const items = Object.entries(bill).map(([id, quantity]) => ({ id, quantity }));
  const res = await fetch(`${PAYMENT_API_BASE_URL}/api/create-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) return { ok: false, error: "backend_error" };
  const { payUrl } = await res.json();
  if (!payUrl) return { ok: false, error: "no_pay_url" };
  window.location.href = payUrl; // leaves the page
  return { ok: true, redirecting: true };
}

// After Flouci sends the customer back, ask the backend (which itself
// re-verifies with Flouci's API, never trusting the redirect's own
// ?status= alone) whether the payment actually succeeded. Exported for use
// in the App component's on-mount check.
async function fetchPaymentStatus(orderId) {
  const res = await fetch(`${PAYMENT_API_BASE_URL}/api/payment-status/${orderId}`);
  if (!res.ok) return null;
  return res.json();
}

// Send the order to the kitchen/counter staff screen. Returns { orderId, ref }
// on success (ref is the short code staff call out), or null if it failed.
async function submitOrder({ bill, tableNumber, paymentMethod, customerName, customerToken }) {
  const items = Object.entries(bill).map(([id, quantity]) => ({ id, quantity }));
  try {
    const headers = { "Content-Type": "application/json" };
    if (customerToken) headers["x-customer-token"] = customerToken; // link to their account
    const res = await fetch(`${PAYMENT_API_BASE_URL}/api/order`, {
      method: "POST",
      headers,
      body: JSON.stringify({ items, tableNumber, paymentMethod, customerName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error || (res.status === 429 ? "rate_limited" : "server_error") };
    return data; // { orderId, ref }
  } catch {
    return { error: "network" };
  }
}

// Friendly French message for an order-submit error code.
function orderErrorMessage(code) {
  switch (code) {
    case "too_many_pending":
      return "Vous avez déjà plusieurs commandes en cours. Patientez qu'elles soient préparées avant d'en passer une autre.";
    case "too_fast":
      return "Trop de commandes en quelques secondes. Réessayez dans un instant.";
    case "rate_limited":
      return "Trop de tentatives. Merci de patienter une minute avant de réessayer.";
    case "network":
      return "Connexion perdue. Vérifiez votre réseau et réessayez.";
    default:
      return "Une erreur est survenue. Merci de réessayer.";
  }
}

// Persist the manager session across refreshes ("save login"). The token
// carries its own 8h expiry ("<expiryMs>.<sig>"), so a stale one is dropped on
// read and the manager is asked for the password again.
const ADMIN_TOKEN_KEY = "sb_admin_token";
function readStoredAdminToken() {
  try {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!t) return null;
    const exp = Number(t.slice(0, t.lastIndexOf(".")));
    if (!Number.isFinite(exp) || Date.now() > exp) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}
function storeAdminToken(t) {
  try {
    if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* storage unavailable — session just won't persist */
  }
}

// Persist the customer session ("save login" for clients).
const CUSTOMER_TOKEN_KEY = "sb_customer_token";
function readStoredCustomerToken() {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}
function storeCustomerToken(t) {
  try {
    if (t) localStorage.setItem(CUSTOMER_TOKEN_KEY, t);
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// "Club SmellS" marketing popup — show it at most once per visitor.
const PROMO_KEY = "sb_promo_done";
function promoAlreadyDone() {
  try {
    return localStorage.getItem(PROMO_KEY) === "1";
  } catch {
    return false;
  }
}
function markPromoDone() {
  try {
    localStorage.setItem(PROMO_KEY, "1");
  } catch {
    /* ignore */
  }
}

// The club offer popup: captures an email for the marketing list. Framed as an
// exclusive club with a first-visit perk — a modern, low-friction lead magnet.

function MarketingModal({ open, onClose, onSubscribe }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | busy | done | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (status === "busy") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Entrez une adresse e-mail valide.");
      return;
    }
    setStatus("busy");
    setError("");
    const res = await onSubscribe(email.trim());
    if (res.ok) setStatus("done");
    else {
      setStatus("error");
      setError("Une erreur est survenue. Réessayez.");
    }
  };

  return (
    <div className="sb-promo-overlay" role="dialog" aria-modal="true" aria-label="Club SmellS" onClick={onClose}>
      <div className="sb-promo" onClick={(e) => e.stopPropagation()}>
        <style>{`
          .sb-promo-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(14,27,59,.72); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: sb-promo-fade .3s ease; }
          @keyframes sb-promo-fade { from { opacity: 0; } to { opacity: 1; } }
          .sb-promo { position: relative; width: 100%; max-width: 400px; background: linear-gradient(160deg, #182b55, #0e1b3b); color: #fdfbf5; border-radius: 20px; padding: 40px 30px 32px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,.5); overflow: hidden; animation: sb-promo-pop .4s cubic-bezier(.16,1,.3,1); }
          @keyframes sb-promo-pop { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: none; } }
          .sb-promo__glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; background: radial-gradient(circle, rgba(200,155,60,.4), transparent 70%); pointer-events: none; }
          .sb-promo__close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: rgba(253,251,245,.6); cursor: pointer; }
          .sb-promo__badge { position: relative; display: inline-block; font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: #e0b968; border: 1px solid rgba(224,185,104,.4); border-radius: 20px; padding: 5px 14px; margin-bottom: 18px; }
          .sb-promo__title { position: relative; font-family: var(--serif, Georgia, serif); font-size: 1.7rem; font-weight: 600; margin: 0 0 10px; }
          .sb-promo__perk { position: relative; font-size: 2.4rem; font-weight: 700; color: #e0b968; margin: 0 0 6px; }
          .sb-promo__sub { position: relative; font-size: .92rem; line-height: 1.5; color: rgba(253,251,245,.8); margin: 0 auto 22px; max-width: 30ch; }
          .sb-promo__form { position: relative; display: flex; flex-direction: column; gap: 10px; }
          .sb-promo__input { width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(253,251,245,.25); background: rgba(253,251,245,.08); color: #fdfbf5; font-size: 1rem; text-align: center; }
          .sb-promo__input::placeholder { color: rgba(253,251,245,.5); }
          .sb-promo__cta { width: 100%; padding: 14px; border-radius: 10px; border: none; background: #e0b968; color: #182b55; font-weight: 700; font-size: .95rem; cursor: pointer; }
          .sb-promo__cta:disabled { opacity: .6; }
          .sb-promo__fine { position: relative; font-size: .72rem; color: rgba(253,251,245,.5); margin: 14px 0 0; }
          .sb-promo__err { color: #ffb4a2; font-size: .82rem; margin: 0; }
          .sb-promo__skip { position: relative; background: none; border: none; color: rgba(253,251,245,.55); cursor: pointer; font-size: .82rem; margin-top: 14px; text-decoration: underline; }
          .sb-promo__done-emoji { font-size: 2.6rem; margin-bottom: 8px; }
        `}</style>
        <div className="sb-promo__glow" aria-hidden="true" />
        <button className="sb-promo__close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        {status === "done" ? (
          <>
            <div className="sb-promo__done-emoji">🎉</div>
            <h2 className="sb-promo__title">Bienvenue au Club !</h2>
            <p className="sb-promo__sub">
              Votre code arrive par e-mail. Présentez-le à votre prochaine visite pour profiter de votre offre.
            </p>
            <button className="sb-promo__cta" onClick={onClose}>
              Parfait, merci !
            </button>
          </>
        ) : (
          <>
            <span className="sb-promo__badge">Club SmellS · Sousse</span>
            <h2 className="sb-promo__title">Rejoignez le Club</h2>
            <div className="sb-promo__perk">−10%</div>
            <p className="sb-promo__sub">
              sur votre prochaine visite. Plus les nouveautés, offres flash et invitations — avant tout le monde.
            </p>
            <form className="sb-promo__form" onSubmit={submit}>
              <input
                className="sb-promo__input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="votre@email.com"
                autoComplete="email"
                autoFocus
              />
              {error && <p className="sb-promo__err">{error}</p>}
              <button className="sb-promo__cta" type="submit" disabled={status === "busy"}>
                {status === "busy" ? "…" : "Je profite de −10%"}
              </button>
            </form>
            <p className="sb-promo__fine">Pas de spam. Désinscription à tout moment.</p>
            <button className="sb-promo__skip" onClick={onClose}>
              Non merci, plus tard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Hooks --------------------------------- */

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > threshold);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);
  return active;
}

function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

function Reveal({ children, className = "", as: Tag = "div", delay = 0, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`sb-reveal ${inView ? "sb-reveal--visible" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------ Decorative -------------------------------- */

function SteamCurves({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <path d="M120 380 C 60 320, 150 280, 110 210 C 70 140, 150 120, 130 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M200 380 C 140 300, 240 260, 190 190 C 150 130, 230 100, 200 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M280 380 C 340 320, 250 280, 290 210 C 330 140, 250 120, 270 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- Header ---------------------------------- */

function Header({
  scrolled,
  activeSection,
  activeCategory,
  onNavClick,
  mobileOpen,
  setMobileOpen,
  billCount,
  billTotal,
  onOpenPanel,
  onAccountClick,
  customer,
}) {
  const highlightGenericMenu = activeSection === "menu" && !NAV_CATEGORY_IDS.includes(activeCategory);

  const isLinkActive = (link) => {
    if (link.sectionId === "contact") return activeSection === "contact";
    if (link.category) return activeSection === "menu" && activeCategory === link.category;
    return activeSection === "menu" && highlightGenericMenu;
  };

  return (
    <header className={`sb-header ${scrolled ? "sb-header--scrolled" : ""}`}>
      <div className="sb-tricolor-thread" aria-hidden="true" />
      <div className="sb-header__inner">
        <a
          href="#hero"
          className="sb-header__mark"
          aria-label="SmellS — retour à l'accueil"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <img src={LOGO_SRC} alt="SmellS" width="44" height="44" />
        </a>

        <nav className="sb-nav" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <button
              key={link.label}
              className={`sb-nav__link ${isLinkActive(link) ? "sb-nav__link--active" : ""}`}
              onClick={() => onNavClick(link)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="sb-header__right">
          <button
            className="sb-conto-btn"
            onClick={onOpenPanel}
            aria-label={`Votre addition : ${billCount} articles, total ${formatPrice(billTotal)}`}
          >
            <Receipt size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Votre Addition</span>
            {billCount > 0 && <span className="sb-conto-btn__badge">{billCount}</span>}
          </button>

          <button
            className="sb-hamburger"
            aria-label={mobileOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
            aria-expanded={mobileOpen}
            aria-controls="sb-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      <div id="sb-mobile-menu" className={`sb-mobile-menu ${mobileOpen ? "sb-mobile-menu--open" : ""}`}>
        <nav aria-label="Navigation mobile">
          {navLinks.map((link) => (
            <button key={link.label} className="sb-mobile-menu__link" onClick={() => onNavClick(link)}>
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* --------------------------------- Hero ------------------------------------ */

function Hero({ onPrimaryCta, onSecondaryCta }) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  // Fade + shrink the logo as the hero scrolls away — but never fully hide it
  // (bottoms out at 25% opacity, 0.85 scale).
  const fade = Math.min(scrollY / 420, 1);
  const logoStyle = {
    opacity: 1 - fade * 0.75,
    transform: `scale(${1 - fade * 0.15})`,
    transition: "opacity .25s ease-out, transform .25s ease-out",
  };

  return (
    <section id="hero" className="sb-hero" aria-label="Bienvenue">
      <div className="sb-hero__texture" aria-hidden="true" />
      <div className="sb-hero__glow" aria-hidden="true" />
      <SteamCurves className="sb-hero__steam sb-hero__steam--left" />
      <SteamCurves className="sb-hero__steam sb-hero__steam--right" />

      <div className="sb-hero__content">
        <img src={LOGO_SRC} alt="SmellS — logo" className="sb-hero__logo" style={logoStyle} width="220" height="220" />
        <h1 className="sb-hero__title">Le vrai plaisir du café italien.</h1>
        <p className="sb-hero__subtitle">Découvrez notre sélection de cafés, petits-déjeuners et spécialités italiennes.</p>
        <div className="sb-hero__actions">
          <button className="sb-btn sb-btn--primary" onClick={onPrimaryCta}>
            Découvrir le Menu <ArrowRight size={16} />
          </button>
          <button className="sb-btn sb-btn--secondary" onClick={onSecondaryCta}>
            Nous Contacter
          </button>
        </div>
      </div>

      <div className="sb-hero__scroll-cue" aria-hidden="true" />
    </section>
  );
}

/* ------------------------------ Menu section ------------------------------- */

function AddToBillControl({ item, quantity, onAdd, onIncrement, onDecrement }) {
  // Include the size in the accessible label so the M and L buttons on a
  // multi-size card don't announce identically to screen readers.
  const label = item.sizeLabel ? `${item.name} (${item.sizeLabel})` : item.name;
  if (!item.available) {
    return <span className="sb-unavailable">Indisponible</span>;
  }
  if (!quantity) {
    return (
      <button className="sb-add-btn" onClick={() => onAdd(item.id)} aria-label={`Ajouter ${label} à l'addition`}>
        + Ajouter
      </button>
    );
  }
  return (
    <div className="sb-qty-stepper" role="group" aria-label={`Quantité de ${label} dans l'addition`}>
      <button onClick={() => onDecrement(item.id)} aria-label={`Retirer une unité de ${label}`}>
        −
      </button>
      <span aria-live="polite">{quantity}</span>
      <button onClick={() => onIncrement(item.id)} aria-label={`Ajouter une autre unité de ${label}`}>
        +
      </button>
    </div>
  );
}

function MenuSection({ items, activeCategory, setActiveCategory, bill, onAdd, onIncrement, onDecrement, onOpenDetail }) {
  const filtered = items.filter((item) => item.category === activeCategory);
  // Group items that share a `group` (the different sizes of one product) so
  // they render on a single card. Items without a group are their own group.
  const groups = [];
  const groupIndex = new Map();
  for (const item of filtered) {
    const key = item.group || item.id;
    let gi = groupIndex.get(key);
    if (gi === undefined) {
      gi = groups.length;
      groupIndex.set(key, gi);
      groups.push({ key, items: [] });
    }
    groups[gi].items.push(item);
  }

  return (
    <section id="menu" className="sb-menu" aria-labelledby="sb-menu-heading">
      <Reveal className="sb-menu__intro">
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> Le Menu
        </span>
        <h2 id="sb-menu-heading" className="sb-section-title">
          Notre Menu
        </h2>
        <p className="sb-section-subtitle">Une sélection pensée pour chaque moment de la journée.</p>
      </Reveal>

      <div className="sb-tabs" role="tablist" aria-label="Catégories du menu">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={active}
              className={`sb-tab ${active ? "sb-tab--active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="sb-menu__grid" key={activeCategory} role="tabpanel">
        {groups.map((g, i) => {
          const first = g.items[0];
          const hasSizes = g.items.length > 1 || Boolean(first.sizeLabel);

          // Single-price product: unchanged card, opens the detail sheet.
          if (!hasSizes) {
            const item = first;
            return (
              <article
                className={`sb-menu-card ${!item.available ? "sb-menu-card--unavailable" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
                key={g.key}
                role="button"
                tabIndex={0}
                aria-label={`Voir le détail de ${item.name}, ${formatPrice(item.price)}`}
                onClick={() => onOpenDetail(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDetail(item.id);
                  }
                }}
              >
                {!item.available && <span className="sb-menu-card__rupture">Rupture</span>}
                <div className="sb-menu-card__row">
                  <h3 className="sb-menu-card__name">
                    {item.name}
                    {item.badge && <span className="sb-badge">{item.badge}</span>}
                  </h3>
                  <span className="sb-menu-card__leader" aria-hidden="true" />
                  <span className="sb-menu-card__price">{formatPrice(item.price)}</span>
                </div>
                {item.description && <p className="sb-menu-card__desc">{item.description}</p>}
                <div className="sb-menu-card__action" onClick={(e) => e.stopPropagation()}>
                  <AddToBillControl
                    item={item}
                    quantity={bill[item.id] || 0}
                    onAdd={onAdd}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                  />
                </div>
              </article>
            );
          }

          // Multi-size product: one card, one row per size (M / L, Grain / …).
          const soldOut = g.items.every((it) => !it.available);
          return (
            <article
              className={`sb-menu-card ${soldOut ? "sb-menu-card--unavailable" : ""}`}
              style={{ animationDelay: `${i * 40}ms` }}
              key={g.key}
            >
              {soldOut && <span className="sb-menu-card__rupture">Rupture</span>}
              <div className="sb-menu-card__row">
                <h3 className="sb-menu-card__name">
                  {first.name}
                  {first.badge && <span className="sb-badge">{first.badge}</span>}
                </h3>
              </div>
              {first.description && <p className="sb-menu-card__desc">{first.description}</p>}
              <div className="sb-menu-card__sizes">
                {g.items.map((s) => (
                  <div className="sb-menu-card__size-row" key={s.id}>
                    <span className="sb-menu-card__size-label">{s.sizeLabel}</span>
                    <span className="sb-menu-card__leader" aria-hidden="true" />
                    <span className="sb-menu-card__price">{formatPrice(s.price)}</span>
                    <div className="sb-menu-card__size-action">
                      <AddToBillControl
                        item={s}
                        quantity={bill[s.id] || 0}
                        onAdd={onAdd}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------- Item detail sheet -------------------------------- */

function ItemDetailSheet({ item, quantity, onClose, onAdd, onIncrement, onDecrement }) {
  if (!item) return null;
  return (
    <div
      className="sb-panel-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-detail-heading"
      onClick={onClose}
    >
      <div className="sb-panel sb-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="sb-panel__close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        <div className="sb-detail-panel__header">
          <h2 id="sb-detail-heading" className="sb-detail-panel__name">
            {item.name}
            {item.badge && <span className="sb-badge">{item.badge}</span>}
          </h2>
          <span className="sb-detail-panel__price">{formatPrice(item.price)}</span>
        </div>

        {item.description && <p className="sb-detail-panel__desc">{item.description}</p>}

        {!item.available ? (
          <p className="sb-unavailable">Non disponible</p>
        ) : (
          <div className="sb-detail-panel__action">
            <AddToBillControl item={item} quantity={quantity} onAdd={onAdd} onIncrement={onIncrement} onDecrement={onDecrement} />
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Gallery ------------------------------------ */

function Gallery() {
  return (
    <section id="gallery" className="sb-gallery" aria-labelledby="sb-gallery-heading">
      <SteamCurves className="sb-gallery__steam" />
      <Reveal className="sb-gallery__intro">
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> En Images
        </span>
        <h2 id="sb-gallery-heading" className="sb-section-title sb-section-title--light">
          Notre Ambiance
        </h2>
        <p className="sb-section-subtitle sb-section-subtitle--light">
          Un aperçu de nos boissons, nos desserts et notre coin de rue à Sousse.
        </p>
      </Reveal>

      <div className="sb-gallery__grid">
        <Reveal as="figure" className="sb-gallery__item sb-gallery__item--tall">
          <img src={PHOTO_LATTE_ART} alt="Latte art signature chez SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={60}>
          <img src={PHOTO_CAT_CHAIR} alt="Coin salon feutré du café, avec son chat maison" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={120}>
          <img src={PHOTO_TIRAMISU} alt="Tiramisù et café servis en terrasse, lumière d'après-midi" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item sb-gallery__item--tall" delay={180}>
          <img src={PHOTO_ICED_DUO} alt="Deux boissons glacées signature de SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={240}>
          <img src={PHOTO_CARAMEL} alt="Boisson glacée au caramel et à la chantilly" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={300}>
          <img src={PHOTO_OREO} alt="Dessert signature Oreo servi avec un café" loading="lazy" />
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------- Reviews ------------------------------------ */

function Reviews() {
  // Doubled so the marquee loop is seamless; the second copy is hidden from
  // assistive tech so screen readers don't announce every review twice.
  const trackItems = [...reviews, ...reviews];

  return (
    <section id="reviews" className="sb-reviews" aria-labelledby="sb-reviews-heading">
      <Reveal className="sb-reviews__intro">
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> Avis
        </span>
        <h2 id="sb-reviews-heading" className="sb-section-title">
          Ce Qu'on En Dit
        </h2>
        <p className="sb-section-subtitle">Retrouvez tous nos avis, à jour, directement sur Google.</p>
      </Reveal>

      <div className="sb-reviews__marquee">
        <div className="sb-reviews__track">
          {trackItems.map((r, i) => (
            <figure className="sb-review-card" key={i} aria-hidden={i >= reviews.length ? "true" : undefined}>
              <div className="sb-review-card__top">
                <span className="sb-review-card__avatar" aria-hidden="true">
                  {r.photo ? <img src={r.photo} alt="" /> : r.author.trim().charAt(0) || "?"}
                </span>
                <div>
                  <figcaption className="sb-review-card__author">{r.author}</figcaption>
                  {r.meta && <div className="sb-review-card__meta">{r.meta}</div>}
                  <div className="sb-review-card__stars" aria-hidden="true">★★★★★</div>
                </div>
              </div>
              <blockquote className="sb-review-card__text">{r.text}</blockquote>
            </figure>
          ))}
        </div>
      </div>

      <Reveal className="sb-reviews__cta" delay={80}>
        <a className="sb-btn sb-btn--outline-navy" href={contactInfo.mapsUrl} target="_blank" rel="noopener noreferrer">
          Voir tous les avis sur Google <ArrowRight size={16} />
        </a>
      </Reveal>
    </section>
  );
}

/* --------------------------------- About ------------------------------------ */

function About() {
  return (
    <section id="about" className="sb-about" aria-labelledby="sb-about-heading">
      <SteamCurves className="sb-about__steam" />
      <Reveal className="sb-about__photo">
        <img src={PHOTO_STOREFRONT} alt="La devanture de SmellS à Sousse" />
      </Reveal>
      <Reveal className="sb-about__text" delay={100}>
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> Qui Sommes-Nous
        </span>
        <h2 id="sb-about-heading" className="sb-section-title sb-section-title--light">
          L'art du véritable café italien
        </h2>
        <p className="sb-about__body">
          SmellS est né de la passion pour le véritable café italien. Un lieu où chaque espresso raconte une
          histoire de tradition, de qualité et de plaisir.
        </p>
      </Reveal>
    </section>
  );
}

/* -------------------------------- Contact ------------------------------------ */

function Contact() {
  return (
    <section id="contact" className="sb-contact" aria-labelledby="sb-contact-heading">
      <Reveal className="sb-contact__intro">
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> Contact
        </span>
        <h2 id="sb-contact-heading" className="sb-section-title sb-section-title--light">
          Venez Nous Rendre Visite
        </h2>
      </Reveal>

      <div className="sb-contact__grid">
        <Reveal as="ul" className="sb-contact__list" delay={80}>
          <li>
            <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{contactInfo.address}</span>
          </li>
        </Reveal>

        <Reveal delay={140}>
          <h3 className="sb-contact__hours-title">
            <Clock size={16} strokeWidth={1.75} aria-hidden="true" /> Horaires
          </h3>
          <dl className="sb-contact__hours">
            {contactInfo.hours.map((h) => (
              <div className="sb-contact__hours-row" key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <Reveal className="sb-contact__map" delay={170}>
        <iframe
          src={contactInfo.mapEmbedUrl}
          title="Localisation de SmellS sur la carte"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </Reveal>

      <Reveal className="sb-contact__actions" delay={200}>
        <a className="sb-btn sb-btn--primary" href={contactInfo.mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={16} aria-hidden="true" /> Localisation
        </a>
      </Reveal>
    </section>
  );
}

/* --------------------------------- Footer ------------------------------------ */

function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-tricolor-thread" aria-hidden="true" />
      <div className="sb-footer__inner">
        <img src={LOGO_SRC} alt="" width="56" height="56" className="sb-footer__logo" />
        <p className="sb-footer__brand">SmellS</p>
        <p className="sb-footer__tagline">Le plaisir du véritable café italien.</p>
        <div className="sb-footer__social">
          <a href={contactInfo.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram size={18} />
          </a>
          <a href={contactInfo.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <Facebook size={18} />
          </a>
        </div>
        <p className="sb-footer__copyright">© 2026 SmellS. Tous droits réservés.</p>
        <p className="sb-footer__credit">
          Conçu par{" "}
          <a
            href="https://www.linkedin.com/in/ahmed-kharroubi-8a883b42a"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ahmed Kharroubi
          </a>
        </p>
        <a href="#admin" className="sb-footer__admin-link">
          Espace gérant
        </a>
      </div>
    </footer>
  );
}

/* ---------------------------- Mobile bill bar -------------------------------- */

function MobileBillBar({ count, total, onOpen }) {
  const visible = count > 0;
  return (
    <div className={`sb-bill-bar ${visible ? "sb-bill-bar--visible" : ""}`} role="status" aria-hidden={!visible}>
      <span className="sb-bill-bar__summary">
        {count} {count === 1 ? "Article" : "Articles"} · {formatPrice(total)}
      </span>
      <button className="sb-bill-bar__cta" onClick={onOpen} tabIndex={visible ? 0 : -1}>
        Payer
      </button>
    </div>
  );
}

// Opt-in control for order-ready notifications. The permission request runs
// from this button's click (a real user gesture) so browsers actually prompt.
function NotifyOptIn() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  // iPhone can only do background/locked alerts once the site is installed to
  // the Home Screen — guide the customer to do that instead of a dead button.
  const iosNeedsInstall = isIOS() && !isStandalone();
  const [perm, setPerm] = useState(() => (supported ? Notification.permission : "unsupported"));

  if (iosNeedsInstall) {
    return (
      <div
        style={{
          fontSize: ".82rem",
          color: "#182b55",
          background: "rgba(24,43,85,.06)",
          borderRadius: 12,
          padding: "12px 14px",
          margin: "0 0 16px",
          lineHeight: 1.5,
        }}
      >
        📲 <strong>Sur iPhone</strong> : pour être prévenu même téléphone verrouillé, ajoutez SmellS à votre écran
        d'accueil — appuyez sur <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>, puis rouvrez
        l'app et repassez commande.
      </div>
    );
  }
  if (!supported) return null;

  if (perm === "granted") {
    return (
      <p style={{ fontSize: ".82rem", color: "#15803d", fontWeight: 500, margin: "0 0 16px" }}>
        🔔 Notifications activées — nous vous prévenons dès que c'est prêt{isStandalone() ? ", même écran verrouillé" : ""}.
      </p>
    );
  }
  if (perm === "denied") {
    return (
      <p style={{ fontSize: ".8rem", color: "rgba(20,33,63,.55)", margin: "0 0 16px" }}>
        🔕 Notifications bloquées dans votre navigateur — activez-les dans les réglages pour être averti.
      </p>
    );
  }
  return (
    <button
      type="button"
      className="sb-btn sb-btn--secondary sb-btn--full"
      style={{ marginBottom: 16 }}
      onClick={async () => {
        primeAudio(); // unlock sound on this tap
        try {
          const r = await Notification.requestPermission();
          setPerm(r);
          if (r === "granted") {
            playChime(); // preview the chime
            try { navigator.vibrate?.(200); } catch { /* ignore */ } // short preview buzz
            subscribeOrderPush(currentTrackedOrderId()); // register for background push
          }
        } catch {
          /* ignore */
        }
      }}
    >
      🔔 Être averti quand c'est prêt
    </button>
  );
}

/* ------------------------------ Payment panel --------------------------------- */

function PaymentPanel({
  open,
  panelRef,
  step,
  bill,
  items,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  total,
  count,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onProceedToMethod,
  onSelectMethod,
  onClose,
  onBackToMethod,
  onBackToBill,
  onFinish,
  paymentResult,
  errorMessage,
  paymentsEnabled,
}) {
  if (!open) return null;

  const tableMissing = shopConfig.requireTableNumber && tableNumber === null;

  return (
    <div className="sb-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="sb-panel-heading">
      <div className="sb-panel" ref={panelRef} tabIndex={-1}>
        {step !== "processing" && (
          <button className="sb-panel__close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        )}

        {step === "bill" && (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Récapitulatif
            </span>
            <h2 id="sb-panel-heading" className="sb-panel__title">
              Votre Addition
            </h2>

            {count === 0 ? (
              <p className="sb-panel__empty">Votre addition est vide. Ajoutez quelque chose depuis le menu.</p>
            ) : (
              <>
                <ul className="sb-conto-list">
                  {Object.entries(bill).map(([id, qty]) => {
                    const item = items.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <li className="sb-conto-list__row" key={id}>
                        <div className="sb-conto-list__info">
                          <span className="sb-conto-list__name">
                            {item.name}
                            {item.sizeLabel ? ` · ${item.sizeLabel}` : ""}
                          </span>
                          <span className="sb-conto-list__unit">{formatPrice(item.price)} l'unité</span>
                        </div>
                        <div className="sb-conto-list__controls">
                          <div className="sb-qty-stepper">
                            <button onClick={() => onDecrement(id)} aria-label={`Diminuer ${item.name}`}>
                              −
                            </button>
                            <span>{qty}</span>
                            <button onClick={() => onIncrement(id)} aria-label={`Augmenter ${item.name}`}>
                              +
                            </button>
                          </div>
                          <span className="sb-conto-list__subtotal">{formatPrice(item.price * qty)}</span>
                          <button
                            className="sb-conto-list__remove"
                            onClick={() => onRemove(id)}
                            aria-label={`Retirer ${item.name} de l'addition`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="sb-conto-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <div className="sb-name-field">
                  <label htmlFor="sb-customer-name">Votre nom (pour la commande)</label>
                  <input
                    id="sb-customer-name"
                    type="text"
                    className="sb-admin-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex : Ahmed"
                    maxLength={40}
                    autoComplete="name"
                  />
                </div>

                {shopConfig.requireTableNumber && (
                  <div className="sb-table-picker">
                    <span className="sb-table-picker__label">Sélectionnez votre table</span>
                    <div className="sb-table-picker__grid">
                      {shopConfig.tableNumbers.map((n) => (
                        <button
                          key={n}
                          className={`sb-table-chip ${tableNumber === n ? "sb-table-chip--active" : ""}`}
                          onClick={() => setTableNumber(n)}
                          aria-pressed={tableNumber === n}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sb-panel__actions">
                  <button className="sb-btn-ghost" onClick={onClear}>
                    Vider l'addition
                  </button>
                  <button
                    className="sb-btn sb-btn--primary sb-btn--full"
                    onClick={onProceedToMethod}
                    disabled={tableMissing}
                  >
                    Payer l'Addition <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === "method" && (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Paiement
            </span>
            <h2 id="sb-panel-heading" className="sb-panel__title">
              Choisissez le Mode de Paiement
            </h2>

            <div className="sb-panel__total-recap">
              <span>Total à payer</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="sb-method-list">
              {paymentsEnabled && (
                <button className="sb-method-btn" onClick={() => onSelectMethod("card")}>
                  <CreditCard size={20} strokeWidth={1.75} aria-hidden="true" /> Payer en ligne (carte)
                </button>
              )}
              <button className="sb-method-btn" onClick={() => onSelectMethod("counter")}>
                <Receipt size={20} strokeWidth={1.75} aria-hidden="true" /> Payer au comptoir
              </button>
            </div>

            <button className="sb-btn-ghost" onClick={onBackToBill}>
              Retour à l'addition
            </button>
          </>
        )}

        {step === "processing" && (
          <div className="sb-processing" aria-live="polite">
            <span className="sb-spinner" aria-hidden="true" />
            <p>Traitement du paiement…</p>
          </div>
        )}

        {step === "success" && paymentResult && (
          <div className="sb-result sb-result--success">
            <span className="sb-result__icon" aria-hidden="true">
              <Check size={28} strokeWidth={2.5} />
            </span>
            <h2 id="sb-panel-heading" className="sb-panel__title">
              {paymentResult.counter ? "Commande Envoyée" : "Paiement Réussi"}
            </h2>
            <p className="sb-result__thanks">
              {paymentResult.counter
                ? "Votre commande est en préparation. Présentez ce numéro au comptoir pour régler."
                : "Merci d'avoir choisi SmellS."}
            </p>
            <NotifyOptIn />
            <div className="sb-result__details">
              <div>
                <span>{paymentResult.counter ? "À régler au comptoir" : "Total payé"}</span>
                <strong>{formatPrice(paymentResult.amount)}</strong>
              </div>
              {paymentResult.table && (
                <div>
                  <span>Table</span>
                  <strong>{paymentResult.table}</strong>
                </div>
              )}
              {paymentResult.confirmationId && (
                <div>
                  <span>{paymentResult.counter ? "N° de commande" : "Paiement"}</span>
                  <strong>#{paymentResult.confirmationId}</strong>
                </div>
              )}
            </div>
            <div className="sb-result__social">
              <span>Suivez-nous pour nos actualités et offres</span>
              <div className="sb-result__social-icons">
                <a href={contactInfo.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
                <a href={contactInfo.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
              </div>
            </div>
            <button className="sb-btn sb-btn--primary sb-btn--full" onClick={onFinish}>
              Retour au Menu
            </button>
          </div>
        )}

        {step === "failure" && (
          <div className="sb-result sb-result--failure">
            <span className="sb-result__icon sb-result__icon--error" aria-hidden="true">
              <AlertCircle size={28} strokeWidth={2.25} />
            </span>
            <h2 id="sb-panel-heading" className="sb-panel__title">
              {errorMessage ? "Commande non envoyée" : "Paiement Échoué"}
            </h2>
            <p className="sb-result__thanks">
              {errorMessage || "Le paiement n'a pas pu être finalisé. Vous pouvez réessayer."}
            </p>
            <div className="sb-panel__actions">
              <button className="sb-btn sb-btn--primary sb-btn--full" onClick={onBackToMethod}>
                Réessayer
              </button>
              <button className="sb-btn-ghost" onClick={onBackToBill}>
                Retour à l'Addition
              </button>
            </div>
          </div>
        )}

        {step === "cancelled" && (
          <div className="sb-result">
            <h2 id="sb-panel-heading" className="sb-panel__title">
              Paiement Annulé
            </h2>
            <p className="sb-result__thanks">Votre addition est toujours disponible.</p>
            <button className="sb-btn sb-btn--primary sb-btn--full" onClick={onBackToMethod}>
              Retour au Paiement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Admin panel ----------------------------------- */

const ORDER_STATUS_FR = { new: "Reçue", preparing: "En préparation", ready: "Prête", done: "Terminée" };
function fmtOrderStatus(s) {
  return ORDER_STATUS_FR[s] || s;
}
function authErrMsg(e) {
  switch (e) {
    case "invalid_credentials":
      return "Téléphone ou mot de passe incorrect.";
    case "phone_taken":
      return "Ce numéro a déjà un compte. Connectez-vous.";
    case "weak_password":
      return "Mot de passe : 6 caractères minimum.";
    case "invalid_phone":
      return "Numéro de téléphone invalide (8 chiffres).";
    case "invalid_name":
      return "Nom requis.";
    default:
      return "Une erreur est survenue. Réessayez.";
  }
}

function CustomerModal({ open, customer, onClose, onLogin, onSignup, onLogout, onFetchOrders, googleClientId, gsiReady, onGoogle }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState(null);
  const googleBtnRef = useRef(null);

  // Render Google's official "Sign in with Google" button when available.
  useEffect(() => {
    if (!open || customer || !googleClientId || !gsiReady || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (resp) => {
        if (resp?.credential) {
          onGoogle(resp.credential).then((r) => {
            if (!r.ok) setError(authErrMsg(r.error));
          });
        }
      },
    });
    if (googleBtnRef.current) {
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "icon", // small round "G" instead of the full-width box
        shape: "circle",
        theme: "outline",
        size: "large",
      });
    }
  }, [open, customer, googleClientId, gsiReady, onGoogle]);

  useEffect(() => {
    if (open) {
      setError("");
      setPassword("");
      setMode("login");
    }
  }, [open]);

  useEffect(() => {
    if (open && customer) {
      setOrders(null);
      onFetchOrders().then(setOrders);
    }
  }, [open, customer, onFetchOrders]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res =
      mode === "signup" ? await onSignup(name.trim(), phone, password) : await onLogin(phone, password);
    setBusy(false);
    if (res.ok) setPassword("");
    else setError(authErrMsg(res.error));
  };

  const styles = `
    .sb-auth-form { display: flex; flex-direction: column; gap: 12px; margin: 8px 0 16px; }
    .sb-auth-switch { background: none; border: none; color: var(--brass); font-weight: 500; cursor: pointer; font-size: .88rem; margin: 0 auto 14px; display: block; }
    .sb-order-history { list-style: none; margin: 6px 0 20px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .sb-order-history__row { border: 1px solid rgba(24,43,85,.12); border-radius: 10px; padding: 12px 14px; }
    .sb-order-history__items { font-size: .85rem; color: rgba(24,43,85,.65); margin: 4px 0; }
    .sb-order-history__total { font-weight: 600; color: var(--navy); font-size: .9rem; }
    .sb-auth-google { margin: 8px 0 4px; display: flex; flex-direction: column; align-items: center; }
    .sb-auth-google__label { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--brass); font-weight: 500; margin-bottom: 10px; }
    .sb-auth-google__btn { display: flex; justify-content: center; min-height: 44px; }
    .sb-auth-divider { display: flex; align-items: center; text-align: center; color: rgba(24,43,85,.4); font-size: .8rem; margin: 16px 0 4px; align-self: stretch; }
    .sb-auth-divider::before, .sb-auth-divider::after { content: ""; flex: 1; height: 1px; background: rgba(24,43,85,.15); }
    .sb-auth-divider span { padding: 0 12px; }
  `;

  return (
    <div className="sb-panel-overlay" role="dialog" aria-modal="true" aria-label="Compte client" onClick={onClose}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <style>{styles}</style>
        <button className="sb-panel__close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        {customer ? (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Mon compte
            </span>
            <h2 className="sb-panel__title">Bonjour, {customer.name}</h2>
            <p className="sb-admin-intro">{customer.phone || customer.email}</p>

            <h3 className="sb-admin-group__title">Mes commandes</h3>
            {orders === null ? (
              <p className="sb-admin-intro">Chargement…</p>
            ) : orders.length === 0 ? (
              <p className="sb-admin-intro">Aucune commande pour le moment.</p>
            ) : (
              <ul className="sb-order-history">
                {orders.map((o) => (
                  <li className="sb-order-history__row" key={o.id}>
                    <div>
                      <strong>#{o.ref}</strong> · {fmtOrderStatus(o.status)}
                    </div>
                    <div className="sb-order-history__items">
                      {(o.items || [])
                        .map((it) => `${it.quantity}× ${it.name}${it.sizeLabel ? ` (${it.sizeLabel})` : ""}`)
                        .join(", ")}
                    </div>
                    <div className="sb-order-history__total">{(o.total_millimes / 1000).toFixed(3)} DT</div>
                  </li>
                ))}
              </ul>
            )}

            <button
              className="sb-btn-ghost sb-btn--full"
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              Se déconnecter
            </button>
          </>
        ) : (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Compte client
            </span>
            <h2 className="sb-panel__title">{mode === "signup" ? "Créer un compte" : "Se connecter"}</h2>

            {googleClientId && (
              <div className="sb-auth-google">
                <span className="sb-auth-google__label">Connexion rapide</span>
                <div ref={googleBtnRef} className="sb-auth-google__btn" />
                <div className="sb-auth-divider"><span>ou avec un mot de passe</span></div>
              </div>
            )}

            <form onSubmit={submit} className="sb-auth-form">
              {mode === "signup" && (
                <input
                  className="sb-admin-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  maxLength={60}
                  autoComplete="name"
                />
              )}
              <input
                className="sb-admin-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Téléphone"
                inputMode="tel"
                autoComplete="tel"
              />
              <input
                className="sb-admin-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {error && <p className="sb-admin-error">{error}</p>}
              <button type="submit" className="sb-btn sb-btn--primary sb-btn--full" disabled={busy}>
                {busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>

            <button
              className="sb-auth-switch"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
              }}
            >
              {mode === "signup" ? "J'ai déjà un compte — Se connecter" : "Nouveau ? Créer un compte"}
            </button>

            <button className="sb-btn-ghost sb-btn--full" onClick={onClose}>
              Continuer en tant qu'invité
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BoutiqueSection({ products, cart, onAdd, onInc, onDec, onOpenCart }) {
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cats = [...new Set(products.map((p) => p.category))];
  return (
    <section id="boutique" className="sb-boutique" aria-labelledby="sb-boutique-heading">
      <style>{`
        .sb-boutique { padding: 80px 20px; background: var(--cream); }
        .sb-boutique__intro { text-align: center; max-width: 640px; margin: 0 auto 40px; }
        .sb-boutique__cat { max-width: 1100px; margin: 0 auto 32px; }
        .sb-boutique__cat-title { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 1.2rem; margin: 0 0 16px; }
        .sb-boutique__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
        .sb-shop-card { background: var(--white-warm); border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(24,43,85,.08); display: flex; flex-direction: column; }
        .sb-shop-card__img { height: 140px; background: #e9e1d1 center/cover no-repeat; display: flex; align-items: center; justify-content: center; color: rgba(24,43,85,.35); }
        .sb-shop-card__body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .sb-shop-card__name { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 1.05rem; margin: 0; }
        .sb-shop-card__desc { font-size: .84rem; color: rgba(24,43,85,.6); margin: 0; flex: 1; line-height: 1.4; }
        .sb-shop-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; }
        .sb-shop-card__price { font-family: var(--serif); font-weight: 600; color: var(--navy); }
        .sb-boutique__cartbar { position: sticky; bottom: 16px; display: flex; justify-content: center; margin-top: 28px; }
        .sb-boutique__cartbar .sb-btn { box-shadow: 0 12px 34px rgba(24,43,85,.28); }
        .sb-boutique__fulfil { display: flex; gap: 8px; }
        .sb-fulfil-btn { flex: 1; padding: 11px; border-radius: 8px; border: 1px solid rgba(24,43,85,.2); background: #fff; color: rgba(24,43,85,.65); font-weight: 600; cursor: pointer; }
        .sb-fulfil-btn.is-on { background: var(--navy); color: #fff; border-color: var(--navy); }
      `}</style>
      <Reveal className="sb-boutique__intro">
        <span className="sb-eyebrow">
          <span className="sb-tricolor-dash" aria-hidden="true" /> La Boutique
        </span>
        <h2 id="sb-boutique-heading" className="sb-section-title">À emporter chez vous</h2>
        <p className="sb-section-subtitle">
          Café Borbone, capsules et accessoires — livraison à Sousse ou retrait en boutique.
        </p>
      </Reveal>

      {products.length === 0 ? (
        <p className="sb-section-subtitle" style={{ textAlign: "center" }}>Boutique bientôt disponible.</p>
      ) : (
        cats.map((cat) => (
          <div className="sb-boutique__cat" key={cat}>
            <h3 className="sb-boutique__cat-title">{cat}</h3>
            <div className="sb-boutique__grid">
              {products
                .filter((p) => p.category === cat)
                .map((p) => {
                  const qty = cart[p.id] || 0;
                  return (
                    <article className="sb-shop-card" key={p.id}>
                      <div
                        className="sb-shop-card__img"
                        style={p.image ? { backgroundImage: `url(${p.image})` } : {}}
                      >
                        {!p.image && <Coffee size={34} />}
                      </div>
                      <div className="sb-shop-card__body">
                        <h4 className="sb-shop-card__name">{p.name}</h4>
                        {p.description && <p className="sb-shop-card__desc">{p.description}</p>}
                        <div className="sb-shop-card__foot">
                          <span className="sb-shop-card__price">{formatPrice(Number(p.price))}</span>
                          {qty === 0 ? (
                            <button className="sb-add-btn" onClick={() => onAdd(p.id)}>
                              + Ajouter
                            </button>
                          ) : (
                            <div className="sb-qty-stepper">
                              <button onClick={() => onDec(p.id)} aria-label={`Retirer ${p.name}`}>
                                −
                              </button>
                              <span>{qty}</span>
                              <button onClick={() => onInc(p.id)} aria-label={`Ajouter ${p.name}`}>
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {cartCount > 0 && (
        <div className="sb-boutique__cartbar">
          <button className="sb-btn sb-btn--primary" onClick={onOpenCart}>
            Voir le panier ({cartCount}) <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

function BoutiqueCheckout({ open, cart, products, onClose, onPlace }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState("delivery");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle"); // idle | busy | done
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      return p ? { ...p, qty } : null;
    })
    .filter(Boolean);
  const total = lines.reduce((s, l) => s + Number(l.price) * l.qty, 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim()) return setError("Nom et téléphone requis.");
    if (fulfillment === "delivery" && !address.trim()) return setError("Adresse requise pour la livraison.");
    setStatus("busy");
    const res = await onPlace({ name: name.trim(), phone: phone.trim(), fulfillment, address: address.trim() });
    if (res.ok) {
      setRef(res.ref);
      setStatus("done");
    } else {
      setStatus("idle");
      setError("Une erreur est survenue. Réessayez.");
    }
  };

  return (
    <div className="sb-panel-overlay" role="dialog" aria-modal="true" aria-label="Panier Boutique" onClick={onClose}>
      <div className="sb-panel" onClick={(e) => e.stopPropagation()}>
        <button className="sb-panel__close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        {status === "done" ? (
          <div className="sb-result sb-result--success">
            <span className="sb-result__icon" aria-hidden="true">
              <Check size={28} strokeWidth={2.5} />
            </span>
            <h2 className="sb-panel__title">Commande reçue</h2>
            <p className="sb-result__thanks">
              Votre commande <strong>#{ref}</strong> est confirmée. Nous vous appelons au {phone} pour
              {fulfillment === "delivery" ? " la livraison" : " le retrait"}. Paiement à
              {fulfillment === "delivery" ? " la livraison" : " l'enlèvement"}.
            </p>
            <button className="sb-btn sb-btn--primary sb-btn--full" onClick={onClose}>
              Terminé
            </button>
          </div>
        ) : (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Panier Boutique
            </span>
            <h2 className="sb-panel__title">Votre commande</h2>

            <ul className="sb-conto-list">
              {lines.map((l) => (
                <li className="sb-conto-list__row" key={l.id}>
                  <div className="sb-conto-list__info">
                    <span className="sb-conto-list__name">{l.name}</span>
                    <span className="sb-conto-list__unit">
                      {formatPrice(Number(l.price))} × {l.qty}
                    </span>
                  </div>
                  <span className="sb-conto-list__subtotal">{formatPrice(Number(l.price) * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="sb-conto-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <form onSubmit={submit} className="sb-auth-form">
              <div className="sb-boutique__fulfil">
                <button
                  type="button"
                  className={`sb-fulfil-btn ${fulfillment === "delivery" ? "is-on" : ""}`}
                  onClick={() => setFulfillment("delivery")}
                >
                  🛵 Livraison
                </button>
                <button
                  type="button"
                  className={`sb-fulfil-btn ${fulfillment === "pickup" ? "is-on" : ""}`}
                  onClick={() => setFulfillment("pickup")}
                >
                  🏪 Retrait
                </button>
              </div>
              <input className="sb-admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" maxLength={60} />
              <input className="sb-admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" inputMode="tel" maxLength={30} />
              {fulfillment === "delivery" && (
                <textarea
                  className="sb-admin-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresse de livraison (Sousse)"
                  rows={2}
                  maxLength={200}
                />
              )}
              {error && <p className="sb-admin-error">{error}</p>}
              <p style={{ fontSize: ".78rem", color: "rgba(20,33,63,.55)", margin: 0 }}>
                Paiement à {fulfillment === "delivery" ? "la livraison" : "l'enlèvement"} — espèces ou carte.
              </p>
              <button type="submit" className="sb-btn sb-btn--primary sb-btn--full" disabled={status === "busy"}>
                {status === "busy" ? "Envoi…" : "Commander"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Owner view: end-of-shift reports, one card per closed till.
function ShiftReportsManager({ onFetch, onDelete, onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setReports(await onFetch());
      setLoading(false);
    })();
  }, [onFetch]);

  const remove = async (r) => {
    if (!window.confirm(`Supprimer le rapport de ${r.staff_name} ?`)) return;
    setReports((prev) => prev.filter((x) => x.id !== r.id));
    await onDelete(r.id);
  };

  // Group the reports by calendar day (they arrive newest-first, so the days
  // stay in that order) — one "Clôture du jour" per day.
  const dayGroups = (() => {
    const map = new Map();
    for (const r of reports) {
      const key = new Date(r.closed_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()];
  })();

  return (
    <>
      <style>{`
        .sb-report-card { border: 1px solid rgba(24,43,85,.12); border-radius: 10px; padding: 14px; margin-bottom: 10px; }
        .sb-report-card__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .sb-report-card__head strong { color: var(--navy); font-size: 1.05rem; }
        .sb-report-card__head span { font-size: .8rem; color: rgba(24,43,85,.55); }
        .sb-report-card__totals { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(24,43,85,.08); margin-bottom: 8px; color: var(--navy); font-weight: 600; }
        .sb-report-card__breakdown { list-style: none; margin: 0; padding: 0; }
        .sb-report-card__breakdown li { display: flex; justify-content: space-between; padding: 2px 0; font-size: .86rem; color: rgba(24,43,85,.75); }
        .sb-report-day { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 0 10px; padding-bottom: 6px; border-bottom: 2px solid rgba(24,43,85,.15); flex-wrap: wrap; }
        .sb-report-day__label strong { color: var(--navy); font-size: 1rem; }
        .sb-report-day__label span { font-size: .85rem; color: rgba(24,43,85,.6); }
        .sb-report-print { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--navy); background: var(--navy); color: #fff; font-size: .78rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .sb-report-print--sm { background: #fff; color: var(--navy); padding: 4px 9px; font-size: .72rem; }
        .sb-report-card__actions { display: inline-flex; align-items: center; gap: 8px; }
      `}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Rapports de service
      </h2>
      <p className="sb-admin-intro">
        {loading
          ? "Chargement…"
          : reports.length === 0
          ? "Aucun rapport pour le moment. Ils apparaissent dès qu'un membre ferme sa caisse."
          : "Chaque fermeture de caisse : total encaissé, nombre de commandes et détail par produit."}
      </p>
      <div className="sb-admin-group">
        {dayGroups.map(([dayLabel, dayReports]) => {
          const dayTotal = dayReports.reduce((s, r) => s + Number(r.total_millimes || 0), 0);
          return (
            <div key={dayLabel} style={{ marginBottom: 8 }}>
              <div className="sb-report-day">
                <div className="sb-report-day__label">
                  <strong>{dayLabel}</strong> <span>· {(dayTotal / 1000).toFixed(3)} DT</span>
                </div>
                <button
                  className="sb-report-print"
                  onClick={() => printDayClose(dayReports, dayLabel)}
                  title="Imprimer la clôture de toute la journée"
                >
                  🖨 Clôture du jour
                </button>
              </div>
              {dayReports.map((r) => (
                <div className="sb-report-card" key={r.id}>
                  <div className="sb-report-card__head">
                    <strong>{r.staff_name}</strong>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {new Date(r.closed_at).toLocaleString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span className="sb-report-card__actions">
                        <button
                          className="sb-report-print sb-report-print--sm"
                          onClick={() => printShiftReport(r)}
                          title={`Imprimer la clôture de ${r.staff_name}`}
                        >
                          🖨
                        </button>
                        <button
                          onClick={() => remove(r)}
                          aria-label={`Supprimer le rapport de ${r.staff_name}`}
                          style={{ background: "none", border: "none", color: "rgba(24,43,85,.4)", cursor: "pointer", padding: 0, display: "inline-flex" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </span>
                  </div>
                  <div className="sb-report-card__totals">
                    <span>{r.orders_count} commande(s)</span>
                    <span>{(Number(r.total_millimes || 0) / 1000).toFixed(3)} DT</span>
                  </div>
                  {r.breakdown && Object.keys(r.breakdown).length > 0 && (
                    <ul className="sb-report-card__breakdown">
                      {Object.entries(r.breakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, qty]) => (
                          <li key={label}>
                            <span>{label}</span>
                            <strong>×{qty}</strong>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Owner view: every returned order — who served it, what, how much, and why.
function ReturnsManager({ onFetch, onBack }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setReturns(await onFetch());
      setLoading(false);
    })();
  }, [onFetch]);
  const total = returns.reduce((s, r) => s + Number(r.total_millimes || 0), 0);

  return (
    <>
      <style>{`
        .sb-return-card { border: 1px solid rgba(220,38,38,.25); border-radius: 10px; padding: 14px; margin-bottom: 10px; box-shadow: inset 3px 0 0 #dc2626; }
        .sb-return-card__head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .sb-return-card__ref { color: var(--navy); font-weight: 700; }
        .sb-return-card__amt { color: #b91c1c; font-weight: 700; white-space: nowrap; }
        .sb-return-card__meta { font-size: .8rem; color: rgba(24,43,85,.55); margin-top: 2px; }
        .sb-return-card__items { font-size: .84rem; color: rgba(24,43,85,.7); margin: 8px 0 0; line-height: 1.4; }
        .sb-return-card__reason { margin-top: 8px; padding: 8px 10px; background: #fef2f2; border-radius: 8px; font-size: .85rem; color: #7f1d1d; }
      `}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Retours
      </h2>
      <p className="sb-admin-intro">
        {loading
          ? "Chargement…"
          : returns.length === 0
          ? "Aucun retour enregistré. Ils apparaissent quand un membre du staff retourne une commande depuis /#staff."
          : `${returns.length} retour(s) · ${(total / 1000).toFixed(3)} DT remboursés`}
      </p>
      <div className="sb-admin-group">
        {returns.map((r) => (
          <div className="sb-return-card" key={r.id}>
            <div className="sb-return-card__head">
              <span className="sb-return-card__ref">
                #{r.ref}
                {r.served_by_name ? ` · ${r.served_by_name}` : ""}
              </span>
              <span className="sb-return-card__amt">−{(Number(r.total_millimes || 0) / 1000).toFixed(3)} DT</span>
            </div>
            <div className="sb-return-card__meta">
              {r.returned_at
                ? new Date(r.returned_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
              {r.customer_name ? ` · ${r.customer_name}` : ""}
              {r.table_number ? ` · Table ${r.table_number}` : ""}
            </div>
            <div className="sb-return-card__items">
              {(r.items || [])
                .map((it) => `${it.quantity}× ${it.name}${it.sizeLabel ? ` (${it.sizeLabel})` : ""}`)
                .join(", ")}
            </div>
            {r.return_reason && (
              <div className="sb-return-card__reason">
                <strong>Motif :</strong> {r.return_reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// Read an image file, resize it down (max 700px) and compress to a small JPEG
// data URL — so an owner can upload a phone photo without bloating the DB.
function readImageAsDataUrl(file, maxSize = 700, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function BoutiqueManager({ onFetchProducts, onAddProduct, onUpdateProduct, onDeleteProduct, onFetchOrders, onUpdateOrder, onBack }) {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => setProducts(await onFetchProducts()), [onFetchProducts]);
  const loadOrders = useCallback(async () => setOrders(await onFetchOrders()), [onFetchOrders]);
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  useEffect(() => {
    if (tab === "orders") loadOrders();
  }, [tab, loadOrders]);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nom requis.");
    const ok = await onAddProduct({
      name: name.trim(),
      category: category.trim() || "Boutique",
      price: Number(price) || 0,
      image: image.trim(),
      description: desc.trim(),
    });
    if (ok) {
      setName("");
      setCategory("");
      setPrice("");
      setImage("");
      setDesc("");
      loadProducts();
    } else setError("Impossible d'ajouter.");
  };
  const toggleAvail = (p) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, available: !p.available } : x)));
    onUpdateProduct(p.id, { available: !p.available });
  };
  const removeP = async (p) => {
    if (!window.confirm(`Supprimer ${p.name} de la boutique ?`)) return;
    await onDeleteProduct(p.id);
    loadProducts();
  };
  const doneOrder = async (o) => {
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
    await onUpdateOrder(o.id, "done");
    loadOrders();
  };

  return (
    <>
      <style>{`
        .sb-photo-field { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .sb-photo-preview { width: 54px; height: 54px; object-fit: cover; border-radius: 8px; }
        .sb-photo-btn { display: inline-flex; align-items: center; padding: 10px 14px; border: 1px dashed rgba(24,43,85,.35); border-radius: 8px; font-size: .85rem; color: var(--navy); cursor: pointer; background: rgba(24,43,85,.02); }
        .sb-photo-remove { background: none; border: none; color: var(--tri-red); font-size: .8rem; cursor: pointer; text-decoration: underline; }
        .sb-row-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex: 0 0 auto; }
        .sb-row-thumb--empty { display: inline-flex; align-items: center; justify-content: center; background: rgba(24,43,85,.06); color: rgba(24,43,85,.35); }
      `}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Boutique
      </h2>
      <div style={{ display: "flex", gap: 8, margin: "6px 0 18px" }}>
        <button className={`sb-fulfil-btn ${tab === "products" ? "is-on" : ""}`} onClick={() => setTab("products")}>
          Produits
        </button>
        <button className={`sb-fulfil-btn ${tab === "orders" ? "is-on" : ""}`} onClick={() => setTab("orders")}>
          Commandes{orders.length ? ` (${orders.length})` : ""}
        </button>
      </div>

      {tab === "products" ? (
        <>
          <form onSubmit={add} className="sb-staff-add-form">
            <input className="sb-admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du produit" maxLength={80} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="sb-admin-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Catégorie (Café…)" />
              <input className="sb-admin-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix (DT)" inputMode="decimal" />
            </div>
            <div className="sb-photo-field">
              {image && <img src={image} alt="" className="sb-photo-preview" />}
              <label className="sb-photo-btn">
                {image ? "Changer la photo" : "📷 Ajouter une photo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(await readImageAsDataUrl(f));
                    e.target.value = "";
                  }}
                />
              </label>
              {image && (
                <button type="button" className="sb-photo-remove" onClick={() => setImage("")}>
                  Retirer
                </button>
              )}
            </div>
            <textarea className="sb-admin-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} />
            {error && <p className="sb-admin-error">{error}</p>}
            <button type="submit" className="sb-btn sb-btn--primary sb-btn--full">
              Ajouter le produit
            </button>
          </form>
          <div className="sb-admin-group">
            {products.map((p) => (
              <div className="sb-admin-item-row" key={p.id}>
                <div className="sb-admin-item-row__info" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {p.image ? (
                    <img src={p.image} alt="" className="sb-row-thumb" />
                  ) : (
                    <span className="sb-row-thumb sb-row-thumb--empty">
                      <Coffee size={16} />
                    </span>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span className="sb-admin-item-row__name">
                      {p.name}
                      {!p.available && <span className="sb-admin-item-row__flag">Masqué</span>}
                    </span>
                    <span className="sb-admin-item-row__price">
                      {formatPrice(Number(p.price))} · {p.category}
                    </span>
                  </div>
                </div>
                <div className="sb-admin-item-row__actions" style={{ alignItems: "center", gap: 6 }}>
                  <label className="sb-inv-adj" style={{ width: "auto", padding: "0 10px", fontSize: ".78rem", cursor: "pointer", display: "inline-flex", alignItems: "center" }} title="Photo">
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await readImageAsDataUrl(f);
                          setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, image: url } : x)));
                          onUpdateProduct(p.id, { image: url });
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="sb-inv-adj"
                    style={{ width: "auto", padding: "0 10px", fontSize: ".78rem" }}
                    onClick={() => toggleAvail(p)}
                  >
                    {p.available ? "Masquer" : "Afficher"}
                  </button>
                  <button onClick={() => removeP(p)} aria-label={`Supprimer ${p.name}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="sb-admin-group">
          {orders.length === 0 ? (
            <p className="sb-admin-intro">Aucune commande boutique en cours.</p>
          ) : (
            orders.map((o) => (
              <div className="sb-admin-item-row" key={o.id} style={{ alignItems: "flex-start" }}>
                <div className="sb-admin-item-row__info">
                  <span className="sb-admin-item-row__name">
                    #{o.ref} · {o.fulfillment === "delivery" ? "🛵 Livraison" : "🏪 Retrait"}
                  </span>
                  <span className="sb-admin-item-row__price">
                    {o.customer_name} · {o.customer_phone}
                    {o.address ? ` · ${o.address}` : ""}
                    <br />
                    {(o.items || []).map((it) => `${it.quantity}× ${it.name}`).join(", ")} —{" "}
                    {formatPrice((o.total_millimes || 0) / 1000)}
                  </span>
                </div>
                <div className="sb-admin-item-row__actions">
                  <button
                    className="sb-inv-adj"
                    style={{ width: "auto", padding: "6px 12px", fontSize: ".78rem" }}
                    onClick={() => doneOrder(o)}
                  >
                    Terminé
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function SuppliesManager({ onFetch, onAdd, onUpdate, onDelete, onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [low, setLow] = useState("");
  const [error, setError] = useState("");
  const [menuGroups, setMenuGroups] = useState([]);
  const [linkingId, setLinkingId] = useState(null); // which supply's product picker is open

  const load = useCallback(async () => {
    setList(await onFetch());
    setLoading(false);
  }, [onFetch]);
  useEffect(() => {
    load();
  }, [load]);

  // Build the list of menu products (one per group) to link supplies to.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/menu`);
        if (!res.ok) return;
        const items = (await res.json()).items || [];
        const seen = new Map();
        for (const it of items) {
          const key = it.group || it.id;
          if (!seen.has(key)) seen.set(key, { key, name: it.name, category: it.category });
        }
        setMenuGroups([...seen.values()]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Links are stored as {group, qty}; tolerate old bare-string entries too.
  const linkList = (s) => (s.menu_links || []).map((e) => (typeof e === "string" ? { group: e, qty: 1 } : e));
  const isLinked = (s, key) => linkList(s).some((l) => l.group === key);
  const qtyOf = (s, key) => {
    const l = linkList(s).find((x) => x.group === key);
    return l ? l.qty : 1;
  };
  const persistLinks = (supply, next) => {
    setList((prev) => prev.map((x) => (x.id === supply.id ? { ...x, menu_links: next } : x)));
    onUpdate(supply.id, { menuLinks: next });
  };
  const toggleLink = (supply, groupKey) => {
    const cur = linkList(supply);
    const next = cur.some((l) => l.group === groupKey)
      ? cur.filter((l) => l.group !== groupKey)
      : [...cur, { group: groupKey, qty: 1 }];
    persistLinks(supply, next);
  };
  const setLinkQty = (supply, groupKey, qty) => {
    persistLinks(
      supply,
      linkList(supply).map((l) => (l.group === groupKey ? { ...l, qty: Number(qty) || 0 } : l))
    );
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Nom requis.");
    const res = await onAdd({
      name: name.trim(),
      unit: unit.trim() || "unité",
      quantity: Number(qty) || 0,
      lowThreshold: Number(low) || 0,
    });
    if (res.ok) {
      setName("");
      setUnit("");
      setQty("");
      setLow("");
      setError("");
      load();
    } else setError("Impossible d'ajouter.");
  };

  const adjust = (s, delta) => {
    setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, quantity: Math.max(0, Number(x.quantity) + delta) } : x)));
    onUpdate(s.id, { deltaQuantity: delta });
  };
  const remove = async (s) => {
    if (!window.confirm(`Supprimer ${s.name} de l'inventaire ?`)) return;
    await onDelete(s.id);
    load();
  };

  const lowCount = list.filter((s) => Number(s.quantity) <= Number(s.low_threshold)).length;

  return (
    <>
      <style>{`.sb-inv-thresh { width: 52px; padding: 3px 5px; border: 1px solid rgba(24,43,85,.2); border-radius: 5px; font-size: .8rem; }
        .sb-inv-adj { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(24,43,85,.2); background: #fff; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
        .sb-inv-qty { min-width: 40px; text-align: center; font-weight: 700; }
        .sb-supply-block { border-bottom: 1px solid rgba(24,43,85,.06); }
        .sb-supply-link-btn { background: none; border: none; color: var(--brass); cursor: pointer; font-size: .78rem; text-decoration: underline; padding: 0; }
        .sb-supply-links { background: rgba(24,43,85,.03); border-radius: 10px; padding: 12px 14px; margin: 0 0 12px; }
        .sb-supply-links__hint { font-size: .78rem; color: rgba(20,33,63,.6); margin: 0 0 10px; line-height: 1.4; }
        .sb-supply-links__cat { margin-bottom: 10px; }
        .sb-supply-links__cat-title { font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(20,33,63,.45); display: block; margin-bottom: 6px; }
        .sb-supply-links__grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .sb-supply-chip { display: inline-flex; align-items: center; gap: 5px; font-size: .78rem; padding: 5px 10px; border: 1px solid rgba(24,43,85,.18); border-radius: 20px; cursor: pointer; background: #fff; }
        .sb-supply-chip.is-on { background: #182b55; color: #fff; border-color: #182b55; }
        .sb-supply-qty { width: 52px; padding: 2px 4px; border-radius: 5px; border: none; font-size: .78rem; text-align: center; }
        .sb-supply-chip input { margin: 0; }`}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Inventaire · Matières premières
      </h2>
      <p className="sb-admin-intro">
        {loading
          ? "Chargement…"
          : lowCount > 0
          ? `${lowCount} article(s) à réapprovisionner. Les baristas comptent depuis /#staff → Inventaire.`
          : "Tous les stocks sont OK. Les baristas comptent depuis /#staff → Inventaire."}
      </p>

      <form onSubmit={add} className="sb-staff-add-form">
        <input className="sb-admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Sirop caramel)" maxLength={40} />
        <div style={{ display: "flex", gap: 8 }}>
          <input className="sb-admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unité (L, pots…)" />
          <input className="sb-admin-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qté" inputMode="decimal" />
          <input className="sb-admin-input" value={low} onChange={(e) => setLow(e.target.value)} placeholder="Seuil bas" inputMode="decimal" />
        </div>
        {error && <p className="sb-admin-error">{error}</p>}
        <button type="submit" className="sb-btn sb-btn--primary sb-btn--full">
          Ajouter au stock
        </button>
      </form>

      <div className="sb-admin-group">
        {list.map((s) => {
          const lowFlag = Number(s.quantity) <= Number(s.low_threshold);
          const linkCount = (s.menu_links || []).length;
          const openLinker = linkingId === s.id;
          return (
            <div className="sb-supply-block" key={s.id}>
              <div className="sb-admin-item-row">
                <div className="sb-admin-item-row__info">
                  <span className="sb-admin-item-row__name">
                    {s.name}
                    {lowFlag && <span className="sb-admin-item-row__flag">Bas</span>}
                  </span>
                  <span className="sb-admin-item-row__price">
                    seuil bas :{" "}
                    <input
                      className="sb-inv-thresh"
                      defaultValue={Number(s.low_threshold)}
                      inputMode="decimal"
                      onBlur={(e) => onUpdate(s.id, { lowThreshold: Number(e.target.value) || 0 })}
                    />{" "}
                    {s.unit} ·{" "}
                    <button type="button" className="sb-supply-link-btn" onClick={() => setLinkingId(openLinker ? null : s.id)}>
                      🔗 {linkCount} produit{linkCount === 1 ? "" : "s"}
                    </button>
                  </span>
                </div>
                <div className="sb-admin-item-row__actions" style={{ alignItems: "center", gap: 6 }}>
                  <button className="sb-inv-adj" onClick={() => adjust(s, -1)} aria-label={`Retirer 1 ${s.name}`}>
                    −
                  </button>
                  <span className="sb-inv-qty">{Number(s.quantity)}</span>
                  <button className="sb-inv-adj" onClick={() => adjust(s, 1)} aria-label={`Ajouter 1 ${s.name}`}>
                    +
                  </button>
                  <button onClick={() => remove(s)} aria-label={`Supprimer ${s.name}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {openLinker && (
                <div className="sb-supply-links">
                  <p className="sb-supply-links__hint">
                    Cochez les produits qui utilisent « {s.name} », et indiquez la quantité par
                    produit (ex : <strong>1</strong> gobelet, <strong>0.2</strong> pour 0,2 L de lait).
                    En rupture → produits « Indisponible » sur la carte ; et chaque commande faite
                    décompte automatiquement le stock.
                  </p>
                  {categories.map((cat) => {
                    const catGroups = menuGroups.filter((g) => g.category === cat.id);
                    if (catGroups.length === 0) return null;
                    return (
                      <div className="sb-supply-links__cat" key={cat.id}>
                        <span className="sb-supply-links__cat-title">{cat.label}</span>
                        <div className="sb-supply-links__grid">
                          {catGroups.map((g) => {
                            const on = isLinked(s, g.key);
                            return (
                              <div key={g.key} className={`sb-supply-chip ${on ? "is-on" : ""}`}>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                                  <input type="checkbox" checked={on} onChange={() => toggleLink(s, g.key)} />
                                  {g.name}
                                </label>
                                {on && (
                                  <input
                                    type="number"
                                    className="sb-supply-qty"
                                    value={qtyOf(s, g.key)}
                                    min="0"
                                    step="0.05"
                                    onChange={(e) => setLinkQty(s, g.key, e.target.value)}
                                    title="Quantité utilisée par produit"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function SubscribersManager({ onFetchSubscribers, onBack }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setSubs(await onFetchSubscribers());
      setLoading(false);
    })();
  }, [onFetchSubscribers]);

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(subs.map((s) => s.email).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const downloadCsv = () => {
    const rows = [
      ["email", "name", "source", "date"],
      ...subs.map((s) => [s.email, s.name || "", s.source || "", new Date(s.created_at).toLocaleDateString("fr-FR")]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "abonnes-club-smells.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Abonnés · Club SmellS
      </h2>
      <p className="sb-admin-intro">
        {loading
          ? "Chargement…"
          : subs.length === 0
          ? "Aucun abonné pour le moment. Le popup les collecte automatiquement."
          : `${subs.length} adresse(s) collectée(s). Exportez-les vers votre outil d'emailing pour lancer une campagne.`}
      </p>

      {!loading && subs.length > 0 && (
        <div className="sb-subs-actions">
          <button className="sb-btn sb-btn--primary" onClick={copyEmails}>
            {copied ? "Copié ✓" : "Copier les e-mails"}
          </button>
          <button className="sb-btn-ghost" onClick={downloadCsv}>
            Télécharger CSV
          </button>
        </div>
      )}

      <style>{`.sb-subs-actions { display: flex; gap: 10px; margin: 12px 0 20px; }
        .sb-subs-actions > button { flex: 1; }`}</style>

      <div className="sb-admin-group">
        {subs.map((s, i) => (
          <div className="sb-admin-item-row" key={i}>
            <div className="sb-admin-item-row__info">
              <span className="sb-admin-item-row__name">{s.email}</span>
              <span className="sb-admin-item-row__price">
                {s.name ? `${s.name} · ` : ""}
                {s.source || "site"} · {new Date(s.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StaffManager({ onFetchStaff, onAddStaff, onDeleteStaff, onBack }) {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStaff(await onFetchStaff());
  }, [onFetchStaff]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nom requis.");
    if (!/^\d{4}$/.test(pin)) return setError("Le PIN doit faire exactement 4 chiffres.");
    setBusy(true);
    const res = await onAddStaff(name.trim(), pin);
    setBusy(false);
    if (res.ok) {
      setName("");
      setPin("");
      load();
    } else if (res.error === "pin_taken") {
      setError("Ce PIN est déjà utilisé par un autre membre.");
    } else {
      setError("Impossible d'ajouter ce membre.");
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Retirer ${s.name} du personnel ?`)) return;
    await onDeleteStaff(s.id);
    load();
  };

  return (
    <>
      <style>{`
        .sb-staff-add-form { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 22px; }
        .sb-admin-staff-link { margin-bottom: 14px; }
      `}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Personnel
      </h2>
      <p className="sb-admin-intro">
        Ajoutez vos membres. Chacun se connecte à l'écran commandes (<code>/#staff</code>) avec son PIN.
      </p>

      <form onSubmit={add} className="sb-staff-add-form">
        <input
          className="sb-admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du membre"
          maxLength={40}
        />
        <input
          className="sb-admin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="PIN (4 chiffres)"
          inputMode="numeric"
        />
        {error && <p className="sb-admin-error">{error}</p>}
        <button type="submit" className="sb-btn sb-btn--primary sb-btn--full" disabled={busy}>
          {busy ? "Ajout…" : "Ajouter au personnel"}
        </button>
      </form>

      <div className="sb-admin-group">
        <h3 className="sb-admin-group__title">Membres</h3>
        {staff.length === 0 ? (
          <p className="sb-admin-intro">Aucun membre pour le moment.</p>
        ) : (
          staff.map((s) => (
            <div className="sb-admin-item-row" key={s.id}>
              <div className="sb-admin-item-row__info">
                <span className="sb-admin-item-row__name">
                  {s.name}
                  {s.on_shift && (
                    <span className="sb-admin-item-row__flag" style={{ background: "#15803d" }}>
                      En service
                    </span>
                  )}
                </span>
                <span className="sb-admin-item-row__price">
                  {s.on_shift
                    ? `${(Number(s.shift_sales_millimes || 0) / 1000).toFixed(3)} DT aujourd'hui · ${s.shift_orders_count || 0} cmd`
                    : "Absent"}
                </span>
              </div>
              <div className="sb-admin-item-row__actions">
                <button onClick={() => remove(s)} aria-label={`Retirer ${s.name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AdminPanel({ open, onClose, items, onAddItem, onUpdateItem, onDeleteItem, onResetMenu, onAuthenticate, onHasSession, onLogout, onFetchStaff, onAddStaff, onDeleteStaff, onFetchSubscribers, onFetchSupplies, onAddSupply, onUpdateSupply, onDeleteSupply, onFetchBoutiqueProducts, onAddBoutiqueProduct, onUpdateBoutiqueProduct, onDeleteBoutiqueProduct, onFetchBoutiqueOrders, onUpdateBoutiqueOrder, onFetchShiftReports, onDeleteShiftReport, onFetchReturns }) {
  const [unlocked, setUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0]?.id || "");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);

  // Re-lock every time the panel is (re)opened — a deliberate, simple
  // security default, not an oversight.
  useEffect(() => {
    if (open) {
      // Stay unlocked if a saved manager session is still valid ("save login").
      setUnlocked(!!(onHasSession && onHasSession()));
      setPasscodeInput("");
      setAuthError(false);
      setAuthBusy(false);
      setView("list");
      setEditingId(null);
    }
  }, [open]);

  if (!open) return null;

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError(false);
    const ok = await onAuthenticate(passcodeInput);
    setAuthBusy(false);
    if (ok) {
      setUnlocked(true);
    } else {
      setAuthError(true);
    }
  };

  const openForm = (item) => {
    if (item) {
      setEditingId(item.id);
      setFormName(item.name);
      setFormCategory(item.category);
      setFormDescription(item.description || "");
      setFormPrice(String(item.price));
      setFormBadge(item.badge || "");
      setFormAvailable(item.available);
    } else {
      setEditingId(null);
      setFormName("");
      setFormCategory(categories[0]?.id || "");
      setFormDescription("");
      setFormPrice("");
      setFormBadge("");
      setFormAvailable(true);
    }
    setView("form");
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const price = parseFloat(formPrice);
    if (!formName.trim() || Number.isNaN(price) || price < 0) return;
    const payload = {
      name: formName.trim(),
      category: formCategory,
      description: formDescription.trim(),
      price,
      badge: formBadge.trim() || undefined,
      available: formAvailable,
    };
    if (editingId) {
      onUpdateItem(editingId, payload);
    } else {
      onAddItem({ ...payload, image: null });
    }
    setView("list");
  };

  const handleDelete = (item) => {
    if (window.confirm(`Supprimer « ${item.name} » du menu ?`)) {
      onDeleteItem(item.id);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Réinitialiser le menu avec les articles par défaut ? Cela remplacera tous vos ajouts et modifications."
      )
    ) {
      onResetMenu();
    }
  };

  return (
    <div className="sb-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="sb-admin-heading">
      <div className="sb-panel sb-panel--wide">
        <button className="sb-panel__close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        {!unlocked ? (
          <form onSubmit={handleUnlock}>
            <span className="sb-eyebrow">
              <Lock size={13} strokeWidth={2} aria-hidden="true" /> Accès Gérant
            </span>
            <h2 id="sb-admin-heading" className="sb-panel__title">
              Espace Gérant
            </h2>
            <p className="sb-admin-intro">Entrez le code d'accès pour gérer le menu.</p>
            <input
              type="password"
              className="sb-admin-input"
              value={passcodeInput}
              onChange={(e) => {
                setPasscodeInput(e.target.value);
                setAuthError(false);
              }}
              placeholder="Code d'accès"
              autoFocus
            />
            {authError && <p className="sb-admin-error">Code incorrect. Réessayez.</p>}
            <div className="sb-panel__actions">
              <button
                type="submit"
                className="sb-btn sb-btn--primary sb-btn--full"
                disabled={authBusy}
              >
                {authBusy ? "Vérification…" : "Déverrouiller"}
              </button>
            </div>
          </form>
        ) : view === "staff" ? (
          <StaffManager
            onFetchStaff={onFetchStaff}
            onAddStaff={onAddStaff}
            onDeleteStaff={onDeleteStaff}
            onBack={() => setView("list")}
          />
        ) : view === "subscribers" ? (
          <SubscribersManager onFetchSubscribers={onFetchSubscribers} onBack={() => setView("list")} />
        ) : view === "inventory" ? (
          <SuppliesManager
            onFetch={onFetchSupplies}
            onAdd={onAddSupply}
            onUpdate={onUpdateSupply}
            onDelete={onDeleteSupply}
            onBack={() => setView("list")}
          />
        ) : view === "reports" ? (
          <ShiftReportsManager onFetch={onFetchShiftReports} onDelete={onDeleteShiftReport} onBack={() => setView("list")} />
        ) : view === "returns" ? (
          <ReturnsManager onFetch={onFetchReturns} onBack={() => setView("list")} />
        ) : view === "boutique" ? (
          <BoutiqueManager
            onFetchProducts={onFetchBoutiqueProducts}
            onAddProduct={onAddBoutiqueProduct}
            onUpdateProduct={onUpdateBoutiqueProduct}
            onDeleteProduct={onDeleteBoutiqueProduct}
            onFetchOrders={onFetchBoutiqueOrders}
            onUpdateOrder={onUpdateBoutiqueOrder}
            onBack={() => setView("list")}
          />
        ) : view === "list" ? (
          <>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> Gestion
            </span>
            <h2 id="sb-admin-heading" className="sb-panel__title">
              Gérer le Menu
            </h2>

            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("staff")}>
              Gérer le personnel →
            </button>
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("subscribers")}>
              Campagne e-mail · Abonnés →
            </button>
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("inventory")}>
              Inventaire · Matières premières →
            </button>
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("boutique")}>
              Boutique · Produits & commandes →
            </button>
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("reports")}>
              Rapports de service (fin de caisse) →
            </button>
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("returns")}>
              Retours →
            </button>
            <button
              className="sb-btn-ghost sb-admin-staff-link"
              onClick={() => {
                if (onLogout) onLogout();
                setUnlocked(false);
              }}
            >
              Se déconnecter
            </button>

            <button className="sb-add-btn sb-admin-add-btn" onClick={() => openForm(null)}>
              <Plus size={14} strokeWidth={2} /> Ajouter un article
            </button>

            {(() => {
              const g = {};
              items.forEach((i) => {
                const k = i.group || i.id;
                (g[k] || (g[k] = [])).push(i);
              });
              const out = Object.values(g)
                .filter((arr) => arr.every((i) => !i.available))
                .map((arr) => arr[0].name);
              if (out.length === 0) return null;
              return (
                <div className="sb-admin-rupture">
                  <strong>⚠️ {out.length} en rupture :</strong> {out.join(", ")}
                  <span className="sb-admin-rupture__hint">Les baristas gèrent le stock depuis /#staff → Stock.</span>
                </div>
              );
            })()}

            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat.id);
              if (catItems.length === 0) return null;
              return (
                <div className="sb-admin-group" key={cat.id}>
                  <h3 className="sb-admin-group__title">{cat.label}</h3>
                  {catItems.map((item) => (
                    <div className="sb-admin-item-row" key={item.id}>
                      <div className="sb-admin-item-row__info">
                        <span className="sb-admin-item-row__name">
                          {item.name}
                          {item.sizeLabel ? ` · ${item.sizeLabel}` : ""}
                          {!item.available && <span className="sb-admin-item-row__flag">Indisponible</span>}
                        </span>
                        <span className="sb-admin-item-row__price">{formatPrice(item.price)}</span>
                      </div>
                      <div className="sb-admin-item-row__actions">
                        <button onClick={() => openForm(item)} aria-label={`Modifier ${item.name}`}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(item)} aria-label={`Supprimer ${item.name}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            <button className="sb-btn-ghost" onClick={handleReset}>
              Réinitialiser le menu par défaut
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmitForm}>
            <span className="sb-eyebrow">
              <span className="sb-tricolor-dash" aria-hidden="true" /> {editingId ? "Modifier" : "Ajouter"}
            </span>
            <h2 id="sb-admin-heading" className="sb-panel__title">
              {editingId ? "Modifier l'Article" : "Ajouter un Article"}
            </h2>

            <label className="sb-admin-field">
              Nom
              <input className="sb-admin-input" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </label>

            <label className="sb-admin-field">
              Catégorie
              <select className="sb-admin-input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sb-admin-field">
              Description
              <textarea
                className="sb-admin-input sb-admin-textarea"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </label>

            <label className="sb-admin-field">
              Prix (DT)
              <input
                className="sb-admin-input"
                type="number"
                step="0.001"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
              />
            </label>

            <label className="sb-admin-field">
              Badge (optionnel)
              <input
                className="sb-admin-input"
                value={formBadge}
                onChange={(e) => setFormBadge(e.target.value)}
                placeholder="ex. Best Seller"
              />
            </label>

            <label className="sb-admin-checkbox">
              <input type="checkbox" checked={formAvailable} onChange={(e) => setFormAvailable(e.target.checked)} />
              Disponible à la vente
            </label>

            <div className="sb-panel__actions">
              <button type="button" className="sb-btn-ghost" onClick={() => setView("list")}>
                Annuler
              </button>
              <button type="submit" className="sb-btn sb-btn--primary sb-btn--full">
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Order toast ---------------------------------- */

function OrderToast({ message, onViewBill, onDismiss }) {
  if (!message) return null;
  return (
    <div className="sb-toast" role="status">
      <span className="sb-toast__text">{message}</span>
      <button className="sb-toast__cta" onClick={onViewBill}>
        Voir mon addition
      </button>
      <button className="sb-toast__close" onClick={onDismiss} aria-label="Fermer">
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------- Intro overlay --------------------------------- */

function IntroOverlay({ onFinish }) {
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;
  const [exiting, setExiting] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      onFinish();
      return;
    }
    rootRef.current?.focus();

    // Stay on the intro until the visitor scrolls down (or swipes up / presses
    // a down key). The page scroll is locked while the intro is up, so we watch
    // gestures rather than a scroll event.
    let startY = null;
    const leave = () => setExiting(true);
    const onWheel = (e) => {
      if (e.deltaY > 0) leave();
    };
    const onTouchStart = (e) => {
      startY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (startY != null && startY - (e.touches[0]?.clientY ?? startY) > 24) leave(); // swipe up = scroll down
    };
    const onKey = (e) => {
      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        leave();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const removeTimer = setTimeout(onFinish, 700);
    return () => clearTimeout(removeTimer);
  }, [exiting, onFinish]);

  if (prefersReducedMotion) return null;

  const skip = () => setExiting(true);

  return (
    <div
      ref={rootRef}
      className={`sb-intro ${exiting ? "sb-intro--exiting" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="SmellS — défilez vers le bas pour continuer vers le site"
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          skip();
        }
      }}
    >
      <SteamCurves className="sb-intro__steam" />
      <div className="sb-intro__content">
        <img src={LOGO_SRC} alt="SmellS" className="sb-intro__logo" width="150" height="150" />
        <span className="sb-intro__thread" aria-hidden="true" />
        <p className="sb-intro__tagline">Le vrai plaisir du café italien.</p>
      </div>
      <span className="sb-intro__skip">Défilez pour continuer ↓</span>
    </div>
  );
}


/* ----------------------------------- App -------------------------------------- */

function SmellsByBorboneMenu() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrolled(40);
  const activeSection = useActiveSection(["hero", "menu", "about", "contact"]);

  const [bill, setBill] = useState({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState("bill");
  const [orderError, setOrderError] = useState(null); // error code when an order is refused
  const [paymentsEnabled, setPaymentsEnabled] = useState(false); // online card option, from backend config

  // Ask the backend whether online card payment (Flouci) is configured. If not,
  // the payment panel shows only "Payer au comptoir".
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/config`);
        if (res.ok) setPaymentsEnabled(!!(await res.json()).paymentsEnabled);
      } catch {
        /* leave online payment off if we can't reach config */
      }
    })();
  }, []);
  const [tableNumber, setTableNumber] = useState(null);
  const [customerName, setCustomerName] = useState("");

  // --- Order-ready notification (native browser notification while page open) ---
  const [trackedOrder, setTrackedOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_tracked_order") || "null");
    } catch {
      return null;
    }
  });
  const [readyBanner, setReadyBanner] = useState(null); // in-page alert, always shows

  const trackOrder = useCallback((orderId, ref) => {
    if (!orderId) return;
    const t = { orderId, ref };
    setTrackedOrder(t);
    try {
      localStorage.setItem("sb_tracked_order", JSON.stringify(t));
    } catch {
      /* ignore */
    }
    ensureServiceWorker();
    // If they've already granted notifications, wire up background push straight
    // away; otherwise ask (this runs inside the checkout tap, a valid gesture).
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        subscribeOrderPush(orderId);
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") subscribeOrderPush(orderId);
        });
      }
    }
  }, []);

  // Poll the tracked order; fire a browser notification when it becomes ready.
  useEffect(() => {
    if (!trackedOrder) return;
    let stopped = false;
    const clear = () => {
      setTrackedOrder(null);
      try {
        localStorage.removeItem("sb_tracked_order");
      } catch {
        /* ignore */
      }
    };
    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/order-status/${trackedOrder.orderId}`);
        if (res.status === 404) return clear();
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === "cancelled") return clear(); // order voided — stop tracking
        if (status === "ready" || status === "done") {
          // In-page banner always fires (independent of OS notification settings).
          setReadyBanner({ ref: trackedOrder.ref });
          // iOS can't vibrate from the web, so it gets a 10-second repeating
          // sound instead; Android/desktop get a single chime + (on Android)
          // a 10-second buzz.
          if (isIOS()) playAlarm(10000);
          else playChime();
          vibrateAlert(); // ~10s buzz on phones that support it (Android)
          // Native OS notification too, if permission is granted AND we're not
          // subscribed to push (the server-sent push would otherwise duplicate it).
          if ("Notification" in window && Notification.permission === "granted" && !sbPushActive) {
            try {
              new Notification("SmellS ☕", {
                body: `Votre commande #${trackedOrder.ref} est prête — à récupérer au comptoir !`,
                icon: "/favicon.png",
                tag: `order-${trackedOrder.orderId}`,
              });
            } catch {
              /* ignore */
            }
          }
          clear();
        }
      } catch {
        /* transient — retry next tick */
      }
    };
    check();
    const iv = setInterval(check, 15000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [trackedOrder]);

  // --- Boutique (e-market) ---
  const [boutiqueProducts, setBoutiqueProducts] = useState([]);
  const [boutiqueCart, setBoutiqueCart] = useState({});
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/boutique/products`);
        if (res.ok) setBoutiqueProducts((await res.json()).products || []);
      } catch {
        /* ignore — boutique just shows empty */
      }
    })();
  }, []);

  const addBoutique = useCallback((id) => setBoutiqueCart((p) => ({ ...p, [id]: (p[id] || 0) + 1 })), []);
  const decBoutique = useCallback((id) => {
    setBoutiqueCart((p) => {
      const n = (p[id] || 0) - 1;
      if (n <= 0) {
        const { [id]: _omit, ...rest } = p;
        return rest;
      }
      return { ...p, [id]: n };
    });
  }, []);

  const placeBoutiqueOrder = useCallback(
    async ({ name, phone, fulfillment, address }) => {
      const items = Object.entries(boutiqueCart).map(([id, quantity]) => ({ id, quantity }));
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/boutique/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, fulfillment, name, phone, address }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setBoutiqueCart({});
          return { ok: true, ref: data.ref };
        }
        return { ok: false, error: data?.error };
      } catch {
        return { ok: false, error: "network" };
      }
    },
    [boutiqueCart]
  );
  const [paymentResult, setPaymentResult] = useState(null);
  const [detailItemId, setDetailItemId] = useState(null);
  const panelRef = useRef(null);

  // The menu itself is editable state now (see Admin panel) instead of a
  // fixed constant, seeded from DEFAULT_MENU_ITEMS and loaded from shared
  // storage if the manager has saved changes before.
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [adminOpen, setAdminOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/menu`);
        if (!res.ok) return;
        const { items } = await res.json();
        // Only adopt the fetched menu if it's actually renderable — every item
        // must have a category, since the menu is grouped by category and an
        // item without one would silently vanish from the page. This keeps the
        // built-in defaults if the backend ever returns an incomplete menu,
        // rather than replacing a good menu with an invisible one.
        if (Array.isArray(items) && items.length > 0 && items.every((it) => it && it.category)) {
          setMenuItems(items);
        }
      } catch (err) {
        // Backend unreachable (not deployed yet, or offline) — the
        // built-in defaults above are used instead.
      }
    })();
  }, []);

  useEffect(() => {
    const checkHash = () => setAdminOpen(window.location.hash === "#admin");
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // If the customer is landing back on the site after paying on Flouci's
  // hosted page, pick the payment back up instead of dropping them at the hero.
  // "order" and "status" are exactly what payment-backend/server.js put in
  // success_link/fail_link when it created the payment — but "status" here
  // is just a hint for a faster UI response; the real answer always comes
  // from asking the backend, which independently re-verifies with Flouci
  // rather than trusting a value anyone could edit in the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (!orderId) return;

    (async () => {
      setPanelOpen(true);
      setPaymentStep("processing");
      const status = await fetchPaymentStatus(orderId);
      if (status?.status === "succeeded") {
        setPaymentResult({
          confirmationId: orderId,
          amount: status.amountMillimes ? status.amountMillimes / 1000 : billTotal,
          table: null,
        });
        setPaymentStep("success");
      } else {
        setPaymentStep("failure");
      }
      // Drop the payment params from the URL so refreshing doesn't replay this.
      params.delete("order");
      params.delete("status");
      const cleanQuery = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ""));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const billTotal = getBillTotal(bill, menuItems);
  const billCount = getBillCount(bill);

  useEffect(() => {
    // Keep the manager app's own tab title (admin.html); only the public site
    // sets this SEO title.
    if (!/admin(\.html)?$/.test(window.location.pathname)) {
      document.title = "SmellS | Carte du Café Italien";
    }
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "La carte digitale de SmellS : espresso, cappuccino, petit-déjeuner, desserts et spécialités italiennes, dans une atmosphère élégante et authentique."
    );
  }, []);

  // Bill line-item handlers
  const showToast = useCallback((message) => {
    setToastMessage(message);
  }, []);

  const addToBill = useCallback(
    (id) => {
      setBill((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      const item = menuItems.find((i) => i.id === id);
      if (item) showToast(`${item.name} ajouté à votre addition`);
    },
    [menuItems, showToast]
  );
  const incrementItem = useCallback((id) => {
    setBill((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }, []);
  const decrementItem = useCallback((id) => {
    setBill((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: current - 1 };
    });
  }, []);
  const removeFromBill = useCallback((id) => {
    setBill((prev) => {
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);
  const clearBill = useCallback(() => setBill({}), []);

  // Admin: menu item CRUD, each persisted to shared storage so every visitor
  // sees the manager's current menu.
  // Admin session token, obtained from the backend after a correct password.
  // Held in a ref (not state) so it never renders and stays out of the DOM.
  // Restored from storage on load so the manager stays logged in ("save login").
  const adminTokenRef = useRef(readStoredAdminToken());

  // Verify the password server-side. Returns true on success (and stashes the
  // returned short-lived token for subsequent menu writes), false otherwise.
  const authenticateAdmin = useCallback(async (password) => {
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return false;
      const { token } = await res.json();
      if (!token) return false;
      adminTokenRef.current = token;
      storeAdminToken(token);
      return true;
    } catch {
      return false;
    }
  }, []);

  const hasAdminSession = useCallback(() => !!readStoredAdminToken(), []);
  const adminLogout = useCallback(() => {
    adminTokenRef.current = null;
    storeAdminToken(null);
  }, []);

  // --- Customer accounts (removed from the UI; kept inert for order linking) ---
  const customerTokenRef = useRef(null);
  const [customer, setCustomer] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const applyCustomerAuth = (data) => {
    customerTokenRef.current = data.token;
    storeCustomerToken(data.token);
    setCustomer(data.customer);
    setCustomerName(data.customer.name);
  };

  const customerLogin = useCallback(async (phone, password) => {
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        applyCustomerAuth(data);
        return { ok: true };
      }
      return { ok: false, error: data?.error };
    } catch {
      return { ok: false, error: "network" };
    }
  }, []);

  const customerSignup = useCallback(async (name, phone, password) => {
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/customer/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        applyCustomerAuth(data);
        return { ok: true };
      }
      return { ok: false, error: data?.error };
    } catch {
      return { ok: false, error: "network" };
    }
  }, []);

  const customerLogout = useCallback(() => {
    customerTokenRef.current = null;
    storeCustomerToken(null);
    setCustomer(null);
  }, []);

  const fetchCustomerOrders = useCallback(async () => {
    const tk = customerTokenRef.current;
    if (!tk) return [];
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/customer/orders`, { headers: { "x-customer-token": tk } });
      if (!res.ok) return [];
      return (await res.json()).orders || [];
    } catch {
      return [];
    }
  }, []);

  // --- Marketing email capture ("Club SmellS") ---
  const [promoOpen, setPromoOpen] = useState(false);
  const promoSourceRef = useRef("intro");

  const openPromo = useCallback((source) => {
    if (promoAlreadyDone()) return;
    promoSourceRef.current = source;
    setPromoOpen(true);
  }, []);

  const dismissPromo = useCallback(() => {
    setPromoOpen(false);
    markPromoDone(); // once seen, don't nag this visitor again
  }, []);

  const subscribeEmail = useCallback(
    async (email) => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: promoSourceRef.current, name: customerName || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          markPromoDone();
          return { ok: true };
        }
        return { ok: false, error: data?.error };
      } catch {
        return { ok: false, error: "network" };
      }
    },
    [customerName]
  );

  // Show the club offer shortly after an order is confirmed (once per visitor).
  useEffect(() => {
    if (paymentStep !== "success") return;
    const t = setTimeout(() => openPromo("order"), 1600);
    return () => clearTimeout(t);
  }, [paymentStep, openPromo]);

  const persistMenuItems = useCallback(async (nextItems) => {
    const token = adminTokenRef.current;
    if (!token) {
      console.error("Session gérant expirée — rouvrez l'Espace gérant et reconnectez-vous.");
      return;
    }
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ items: nextItems }),
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    } catch (err) {
      console.error("Impossible d'enregistrer le menu :", err);
    }
  }, []);

  // --- Staff management (manager) ---
  const fetchStaff = useCallback(async () => {
    const token = adminTokenRef.current;
    if (!token) return [];
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/staff`, { headers: { "x-admin-token": token } });
      if (!res.ok) return [];
      return (await res.json()).staff || [];
    } catch {
      return [];
    }
  }, []);

  const addStaff = useCallback(async (name, pin) => {
    const token = adminTokenRef.current;
    if (!token) return { ok: false, error: "no_token" };
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, error: data?.error };
    } catch {
      return { ok: false, error: "network" };
    }
  }, []);

  const deleteStaff = useCallback(async (id) => {
    const token = adminTokenRef.current;
    if (!token) return;
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/staff/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSubscribers = useCallback(async () => {
    const token = adminTokenRef.current;
    if (!token) return [];
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/subscribers`, { headers: { "x-admin-token": token } });
      if (!res.ok) return [];
      return (await res.json()).subscribers || [];
    } catch {
      return [];
    }
  }, []);

  // --- Supplies / inventory (owner) ---
  const fetchSupplies = useCallback(async () => {
    const token = adminTokenRef.current;
    if (!token) return [];
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/supplies`, { headers: { "x-admin-token": token } });
      if (!res.ok) return [];
      return (await res.json()).supplies || [];
    } catch {
      return [];
    }
  }, []);

  const addSupply = useCallback(async (payload) => {
    const token = adminTokenRef.current;
    if (!token) return { ok: false };
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/supplies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  }, []);

  const updateSupply = useCallback(async (id, patch) => {
    const token = adminTokenRef.current;
    if (!token) return;
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/supplies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(patch),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const deleteSupplyItem = useCallback(async (id) => {
    const token = adminTokenRef.current;
    if (!token) return;
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/supplies/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
    } catch {
      /* ignore */
    }
  }, []);

  // --- Boutique management (owner) ---
  const adminReq = useCallback(async (path, options = {}) => {
    const token = adminTokenRef.current;
    if (!token) return { ok: false };
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", "x-admin-token": token, ...(options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch {
      return { ok: false };
    }
  }, []);

  const fetchBoutiqueProductsAdmin = useCallback(async () => {
    const { ok, data } = await adminReq("/boutique/products/all");
    return ok ? data.products || [] : [];
  }, [adminReq]);
  const addBoutiqueProduct = useCallback(
    async (payload) => (await adminReq("/boutique/products", { method: "POST", body: JSON.stringify(payload) })).ok,
    [adminReq]
  );
  const updateBoutiqueProductAdmin = useCallback(
    (id, patch) => adminReq(`/boutique/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    [adminReq]
  );
  const deleteBoutiqueProductAdmin = useCallback(
    (id) => adminReq(`/boutique/products/${id}`, { method: "DELETE" }),
    [adminReq]
  );
  const fetchBoutiqueOrders = useCallback(async () => {
    const { ok, data } = await adminReq("/boutique/orders");
    return ok ? data.orders || [] : [];
  }, [adminReq]);
  const updateBoutiqueOrderStatus = useCallback(
    (id, status) => adminReq(`/boutique/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    [adminReq]
  );

  const fetchShiftReports = useCallback(async () => {
    const { ok, data } = await adminReq("/shift-reports");
    return ok ? data.reports || [] : [];
  }, [adminReq]);
  const deleteShiftReport = useCallback((id) => adminReq(`/shift-reports/${id}`, { method: "DELETE" }), [adminReq]);

  const fetchReturns = useCallback(async () => {
    const { ok, data } = await adminReq("/returns");
    return ok ? data.returns || [] : [];
  }, [adminReq]);

  const handleAddItem = useCallback(
    (newItemData) => {
      setMenuItems((prev) => {
        const id = slugify(
          newItemData.name,
          prev.map((i) => i.id)
        );
        const next = [...prev, { id, ...newItemData }];
        persistMenuItems(next);
        return next;
      });
    },
    [persistMenuItems]
  );

  const handleUpdateItem = useCallback(
    (id, updates) => {
      setMenuItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...updates } : i));
        persistMenuItems(next);
        return next;
      });
    },
    [persistMenuItems]
  );

  const handleDeleteItem = useCallback(
    (id) => {
      setMenuItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        persistMenuItems(next);
        return next;
      });
      // Also drop it from any bill already in progress so nothing dangles.
      setBill((prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
    },
    [persistMenuItems]
  );

  const handleResetMenu = useCallback(() => {
    setMenuItems(DEFAULT_MENU_ITEMS);
    persistMenuItems(DEFAULT_MENU_ITEMS);
  }, [persistMenuItems]);

  const closeAdmin = useCallback(() => {
    window.location.hash = "";
    setAdminOpen(false);
  }, []);

  const openItemDetail = useCallback((id) => setDetailItemId(id), []);
  const closeItemDetail = useCallback(() => setDetailItemId(null), []);
  const detailItem = menuItems.find((i) => i.id === detailItemId) || null;

  // Panel + payment step handlers
  const openPanel = useCallback(() => {
    setPaymentStep("bill");
    setPanelOpen(true);
    setToastMessage(null);
    setDetailItemId(null);
  }, []);

  const finishAndReset = useCallback(() => {
    setBill({});
    setTableNumber(null);
    setPaymentResult(null);
    setPaymentStep("bill");
    setPanelOpen(false);
  }, []);

  const closePanel = useCallback(() => {
    if (paymentStep === "method") {
      setPaymentStep("cancelled");
      return;
    }
    if (paymentStep === "success") {
      finishAndReset();
      return;
    }
    setPanelOpen(false);
  }, [paymentStep, finishAndReset]);

  const proceedToMethod = useCallback(() => {
    if (shopConfig.requireTableNumber && tableNumber === null) return;
    setPaymentStep("method");
  }, [tableNumber]);

  const backToMethod = useCallback(() => setPaymentStep("method"), []);
  const backToBill = useCallback(() => setPaymentStep("bill"), []);

  const selectPaymentMethod = useCallback(
    async (method) => {
      primeAudio(); // unlock the chime now (user gesture) so it can play when ready
      setOrderError(null);
      setPaymentStep("processing");
      try {
        // Pay at the counter: no online payment — just send the order to staff.
        if (method === "counter") {
          const order = await submitOrder({
            bill,
            tableNumber,
            paymentMethod: "counter",
            customerName,
            customerToken: customerTokenRef.current,
          });
          if (order?.orderId) {
            trackOrder(order.orderId, order.ref);
            setPaymentResult({ confirmationId: order.ref, amount: billTotal, table: tableNumber, counter: true });
            setPaymentStep("success");
          } else {
            setOrderError(order?.error || "server_error");
            setPaymentStep("failure");
          }
          return;
        }

        const result = await processRealPayment({ bill, tableNumber, method });
        if (result.redirecting) return; // real Flouci: leaving the page, order is placed on return
        if (result.ok) {
          const order = await submitOrder({
            bill,
            tableNumber,
            paymentMethod: "online",
            customerName,
            customerToken: customerTokenRef.current,
          });
          if (order?.orderId) trackOrder(order.orderId, order.ref);
          setPaymentResult({
            confirmationId: order?.ref || result.confirmationId,
            amount: billTotal,
            table: tableNumber,
          });
          setPaymentStep("success");
        } else {
          setPaymentStep("failure");
        }
      } catch (err) {
        setPaymentStep("failure");
      }
    },
    [bill, billTotal, tableNumber, customerName]
  );

  // Scroll lock (both html and body — body alone doesn't reliably block
  // scroll on iOS Safari) while the mobile nav, payment panel, admin
  // panel, item detail sheet, or intro is open
  useEffect(() => {
    const shouldLock =
      mobileOpen || panelOpen || adminOpen || promoOpen || boutiqueOpen || showIntro || detailItemId;
    document.documentElement.style.overflow = shouldLock ? "hidden" : "";
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [mobileOpen, panelOpen, adminOpen, promoOpen, boutiqueOpen, showIntro, detailItemId]);

  // Escape closes the payment panel; focus lands inside it on open
  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    const t = setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(t);
    };
  }, [panelOpen, paymentStep, closePanel]);

  // Escape closes the item detail sheet
  useEffect(() => {
    if (!detailItemId) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeItemDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailItemId, closeItemDetail]);

  const handleNavClick = useCallback((link) => {
    if (link.category) setActiveCategory(link.category);
    document.getElementById(link.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  }, []);

  const scrollToMenu = useCallback(() => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToContact = useCallback(() => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="sb-root">
      <GlobalStyles />
      {showIntro && (
        <IntroOverlay
          onFinish={() => {
            setShowIntro(false);
            setTimeout(() => openPromo("intro"), 3000); // offer the club once they're in
          }}
        />
      )}
      {readyBanner && (
        <div
          role="alert"
          onClick={() => {
            setReadyBanner(null);
            stopAlarm(); // silence the ready sound when dismissed
          }}
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5000,
            background: "#182b55",
            color: "#fdfbf5",
            borderRadius: 14,
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            boxShadow: "0 18px 44px rgba(0,0,0,.4)",
            maxWidth: "92vw",
            borderLeft: "5px solid #e0b968",
            animation: "sb-card-in .4s ease",
          }}
        >
          <span style={{ fontSize: "1.8rem" }} aria-hidden="true">☕</span>
          <div>
            <strong style={{ display: "block", fontSize: "1rem" }}>
              Votre commande #{readyBanner.ref} est prête !
            </strong>
            <span style={{ fontSize: ".8rem", opacity: 0.8 }}>À récupérer au comptoir · touchez pour fermer</span>
          </div>
        </div>
      )}
      <a href="#main" className="sb-skip-link">
        Aller au contenu principal
      </a>
      <Header
        scrolled={scrolled}
        activeSection={activeSection}
        activeCategory={activeCategory}
        onNavClick={handleNavClick}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        billCount={billCount}
        billTotal={billTotal}
        onOpenPanel={openPanel}
        onAccountClick={() => setAccountOpen(true)}
        customer={customer}
      />
      <main id="main">
        <Hero onPrimaryCta={scrollToMenu} onSecondaryCta={scrollToContact} />
        <MenuSection
          items={menuItems}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          bill={bill}
          onAdd={addToBill}
          onIncrement={incrementItem}
          onDecrement={decrementItem}
          onOpenDetail={openItemDetail}
        />
        <BoutiqueSection
          products={boutiqueProducts}
          cart={boutiqueCart}
          onAdd={addBoutique}
          onInc={addBoutique}
          onDec={decBoutique}
          onOpenCart={() => setBoutiqueOpen(true)}
        />
        <Gallery />
        <Reviews />
        <About />
        <Contact />
      </main>
      <Footer />

      <BoutiqueCheckout
        open={boutiqueOpen}
        cart={boutiqueCart}
        products={boutiqueProducts}
        onClose={() => setBoutiqueOpen(false)}
        onPlace={placeBoutiqueOrder}
      />

      <MobileBillBar count={billCount} total={billTotal} onOpen={openPanel} />

      <OrderToast message={toastMessage} onViewBill={openPanel} onDismiss={() => setToastMessage(null)} />

      <ItemDetailSheet
        item={detailItem}
        quantity={detailItem ? bill[detailItem.id] || 0 : 0}
        onClose={closeItemDetail}
        onAdd={addToBill}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
      />

      <MarketingModal open={promoOpen} onClose={dismissPromo} onSubscribe={subscribeEmail} />

      <PaymentPanel
        open={panelOpen}
        panelRef={panelRef}
        step={paymentStep}
        bill={bill}
        items={menuItems}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        customerName={customerName}
        setCustomerName={setCustomerName}
        total={billTotal}
        count={billCount}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeFromBill}
        onClear={clearBill}
        onProceedToMethod={proceedToMethod}
        onSelectMethod={selectPaymentMethod}
        onClose={closePanel}
        onBackToMethod={backToMethod}
        onBackToBill={backToBill}
        onFinish={finishAndReset}
        paymentResult={paymentResult}
        errorMessage={orderError ? orderErrorMessage(orderError) : null}
        paymentsEnabled={paymentsEnabled}
      />

      <AdminPanel
        open={adminOpen}
        onClose={closeAdmin}
        items={menuItems}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onResetMenu={handleResetMenu}
        onAuthenticate={authenticateAdmin}
        onHasSession={hasAdminSession}
        onLogout={adminLogout}
        onFetchStaff={fetchStaff}
        onAddStaff={addStaff}
        onDeleteStaff={deleteStaff}
        onFetchSubscribers={fetchSubscribers}
        onFetchSupplies={fetchSupplies}
        onAddSupply={addSupply}
        onUpdateSupply={updateSupply}
        onDeleteSupply={deleteSupplyItem}
        onFetchBoutiqueProducts={fetchBoutiqueProductsAdmin}
        onAddBoutiqueProduct={addBoutiqueProduct}
        onUpdateBoutiqueProduct={updateBoutiqueProductAdmin}
        onDeleteBoutiqueProduct={deleteBoutiqueProductAdmin}
        onFetchBoutiqueOrders={fetchBoutiqueOrders}
        onUpdateBoutiqueOrder={updateBoutiqueOrderStatus}
        onFetchShiftReports={fetchShiftReports}
        onDeleteShiftReport={deleteShiftReport}
        onFetchReturns={fetchReturns}
      />
    </div>
  );
}

/* ============================ Staff order screen ============================
   Lives at  <site>/#staff  — password-protected (the manager password).
   Shows live orders customers placed, so staff know what to make. Polls every
   5s. Each order advances Nouveau → En préparation → Prêt → (cleared).
   ========================================================================== */

const ORDER_FLOW = {
  new: { label: "Nouveau", next: "preparing", action: "Commencer", color: "#c2410c" },
  preparing: { label: "En préparation", next: "ready", action: "Prêt", color: "#1d4ed8" },
  ready: { label: "Prêt", next: "done", action: "Récupéré", color: "#15803d" },
};

function staffTimeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins === 1) return "il y a 1 min";
  return `il y a ${mins} min`;
}

function fmtDT(millimes) {
  return (Number(millimes || 0) / 1000).toFixed(3) + " DT";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
}

// Shared 72mm ticket shell — prints cleanly on a receipt/thermal printer but
// works on any printer the phone or tablet can reach. `inner` is the body HTML.
const SB_TICKET_CSS = `
  @page { margin: 6mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 72mm; margin: 0 auto; font-family: "Courier New", monospace; color: #000; font-size: 12px; line-height: 1.45; }
  .c { text-align: center; }
  .brand { font-size: 16px; font-weight: 700; letter-spacing: .04em; }
  .addr { font-size: 10px; margin: 2px 0 8px; }
  .ttl { font-size: 13px; font-weight: 700; letter-spacing: .06em; }
  hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  .ref { font-size: 15px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  td.r { text-align: right; white-space: nowrap; padding-left: 6px; }
  .tot td { font-weight: 700; font-size: 14px; padding-top: 4px; }
  .sub td { font-weight: 700; padding-top: 3px; }
  .foot { margin-top: 10px; font-size: 11px; }
`;
function openTicket(title, inner) {
  // No inline <script> here on purpose: the popup inherits the page's strict
  // Content-Security-Policy, which blocks inline scripts. We trigger printing
  // from this (opener) window instead.
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${SB_TICKET_CSS}</style></head><body>
    <div class="c brand">SmellS</div>
    <div class="c addr">${escapeHtml(contactInfo.address)}</div>
    ${inner}
  </body></html>`;
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) {
    window.alert("Autorisez les fenêtres pop-up pour imprimer.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  const doPrint = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* user can still print manually from the popup */
    }
  };
  // Print once the popup has rendered; onload covers most browsers, the timeout
  // is a fallback for those where document.write doesn't refire load.
  w.onload = doPrint;
  setTimeout(doPrint, 400);
}

const ticketMoney = (tnd) => Number(tnd || 0).toFixed(3);
// Sorted { label: qty } → receipt rows.
function breakdownRows(bd) {
  return Object.entries(bd || {})
    .sort((a, b) => b[1] - a[1])
    .map(([label, qty]) => `<tr><td>${escapeHtml(label)}</td><td class="r">×${Number(qty)}</td></tr>`)
    .join("");
}

// Per-order customer receipt.
function printReceipt(order) {
  const when = new Date(order.updated_at || order.created_at || Date.now());
  const stamp = when.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const rows = (order.items || [])
    .map((it) => {
      const label = `${it.quantity}× ${it.name}${it.sizeLabel ? ` (${it.sizeLabel})` : ""}`;
      const lineTot = it.price != null ? ticketMoney(Number(it.price) * Number(it.quantity)) : "";
      return `<tr><td>${escapeHtml(label)}</td><td class="r">${lineTot}</td></tr>`;
    })
    .join("");
  const meta = [
    order.table_number ? `Table ${escapeHtml(order.table_number)}` : "",
    order.customer_name ? `Client : ${escapeHtml(order.customer_name)}` : "",
  ]
    .filter(Boolean)
    .map((l) => `<div>${l}</div>`)
    .join("");
  const pay = order.payment_method === "online" ? "Payé en ligne" : "À régler au comptoir";
  const inner = `
    <hr>
    <div class="c ref">Commande #${escapeHtml(order.ref)}</div>
    <div class="c" style="font-size:10px;margin-top:2px">${escapeHtml(stamp)}</div>
    ${meta ? `<div style="margin-top:6px">${meta}</div>` : ""}
    <hr>
    <table>${rows}</table>
    <hr>
    <table><tr class="tot"><td>TOTAL</td><td class="r">${ticketMoney(Number(order.total_millimes || 0) / 1000)} DT</td></tr></table>
    <div class="foot c">${pay}</div>
    <div class="foot c">Merci et à bientôt ☕</div>`;
  openTicket(`Reçu #${order.ref}`, inner);
}

// One staff member's end-of-shift closing ticket.
function printShiftReport(report) {
  const stamp = new Date(report.closed_at).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const inner = `
    <hr>
    <div class="c ttl">CLÔTURE DE CAISSE</div>
    <div class="c ref" style="margin-top:4px">${escapeHtml(report.staff_name || "—")}</div>
    <div class="c" style="font-size:10px;margin-top:2px">${escapeHtml(stamp)}</div>
    <hr>
    <table>
      <tr><td>Commandes servies</td><td class="r">${Number(report.orders_count || 0)}</td></tr>
      <tr class="tot"><td>TOTAL ENCAISSÉ</td><td class="r">${ticketMoney(Number(report.total_millimes || 0) / 1000)} DT</td></tr>
    </table>
    ${
      report.breakdown && Object.keys(report.breakdown).length
        ? `<hr><div class="c" style="font-size:10px;margin-bottom:4px">DÉTAIL PAR PRODUIT</div><table>${breakdownRows(report.breakdown)}</table>`
        : ""
    }
    <div class="foot c">SmellS · Clôture</div>`;
  openTicket(`Clôture ${report.staff_name || ""}`.trim(), inner);
}

// Whole-day closing ticket: all the day's shift reports rolled into one — total
// takings, per-staff subtotals, and a combined product breakdown.
function printDayClose(reports, dateLabel) {
  const totalMillimes = reports.reduce((s, r) => s + Number(r.total_millimes || 0), 0);
  const ordersCount = reports.reduce((s, r) => s + Number(r.orders_count || 0), 0);
  const combined = {};
  for (const r of reports) {
    for (const [label, qty] of Object.entries(r.breakdown || {})) {
      combined[label] = (combined[label] || 0) + Number(qty);
    }
  }
  const staffRows = reports
    .map(
      (r) =>
        `<tr class="sub"><td>${escapeHtml(r.staff_name || "—")}</td><td class="r">${ticketMoney(
          Number(r.total_millimes || 0) / 1000,
        )} DT</td></tr><tr><td style="font-size:10px;color:#000">${Number(
          r.orders_count || 0,
        )} commande(s)</td><td></td></tr>`,
    )
    .join("");
  const inner = `
    <hr>
    <div class="c ttl">CLÔTURE DE LA JOURNÉE</div>
    <div class="c" style="font-size:11px;margin-top:2px">${escapeHtml(dateLabel)}</div>
    <hr>
    <table>${staffRows}</table>
    <hr>
    <table>
      <tr><td>Commandes servies</td><td class="r">${ordersCount}</td></tr>
      <tr class="tot"><td>TOTAL JOURNÉE</td><td class="r">${ticketMoney(totalMillimes / 1000)} DT</td></tr>
    </table>
    ${
      Object.keys(combined).length
        ? `<hr><div class="c" style="font-size:10px;margin-bottom:4px">DÉTAIL PAR PRODUIT</div><table>${breakdownRows(combined)}</table>`
        : ""
    }
    <div class="foot c">SmellS · Clôture journée</div>`;
  openTicket(`Clôture journée ${dateLabel}`, inner);
}

function StaffOrderCard({ order, onAdvance }) {
  const flow = ORDER_FLOW[order.status] || ORDER_FLOW.new;
  return (
    <article className="sb-staff-card" style={{ borderTopColor: flow.color }}>
      <div className="sb-staff-card__top">
        <span className="sb-staff-card__ref">#{order.ref}</span>
        <span className="sb-staff-card__status" style={{ color: flow.color }}>{flow.label}</span>
      </div>
      {order.customer_name && <div className="sb-staff-card__customer">{order.customer_name}</div>}
      <div className="sb-staff-card__meta">
        {order.table_number ? `Table ${order.table_number} · ` : ""}
        {staffTimeAgo(order.created_at)}
      </div>
      <ul className="sb-staff-card__items">
        {(order.items || []).map((it, idx) => (
          <li key={idx}>
            <span className="sb-staff-card__qty">{it.quantity}×</span>
            {it.name}
            {it.sizeLabel ? ` (${it.sizeLabel})` : ""}
          </li>
        ))}
      </ul>
      <div className="sb-staff-card__foot">
        {fmtDT(order.total_millimes)} · {order.payment_method === "online" ? "Payé en ligne" : "À régler au comptoir"}
      </div>
      <div className="sb-staff-card__actions">
        <button className="sb-staff-btn sb-staff-btn--primary" onClick={() => onAdvance(order.id, flow.next)}>
          {flow.action}
        </button>
        <button
          className="sb-staff-btn sb-staff-btn--ghost"
          onClick={() => printReceipt(order)}
          aria-label="Imprimer le reçu"
          title="Imprimer le reçu"
        >
          🖨
        </button>
        {order.status !== "ready" && (
          <button className="sb-staff-btn sb-staff-btn--ghost" onClick={() => onAdvance(order.id, "cancelled")}>
            Annuler
          </button>
        )}
      </div>
    </article>
  );
}

// Persist the staff session so a tablet at the counter stays logged in across
// refreshes (the token still expires server-side after 8h, and closing the
// shift clears it).
const STAFF_TOKEN_KEY = "sb_staff_token";
const readStoredStaffToken = () => {
  try {
    return localStorage.getItem(STAFF_TOKEN_KEY) || null;
  } catch {
    return null;
  }
};
const storeStaffToken = (t) => {
  try {
    if (t) localStorage.setItem(STAFF_TOKEN_KEY, t);
    else localStorage.removeItem(STAFF_TOKEN_KEY);
  } catch {
    /* storage unavailable — session just won't persist */
  }
};

// A staff member's completed-order log ("what I've served").
function StaffHistory({ orders, total, count, onReturn, onPrint }) {
  if (orders.length === 0) return <p className="sb-staff-empty">Aucune commande servie pour le moment.</p>;
  return (
    <div className="sb-inv">
      <div className="sb-stock__summary">
        {count ? `${count} servie(s) ce service · ${fmtDT(total)}` : `${orders.length} commande(s) servie(s)`}
      </div>
      <div className="sb-inv__list">
        {orders.map((o) => (
          <div className="sb-inv__row" key={o.id} style={{ alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span className="sb-inv__name">
                #{o.ref}
                {o.customer_name ? ` · ${o.customer_name}` : ""}
                {o.table_number ? ` · Table ${o.table_number}` : ""}
              </span>
              <span style={{ fontSize: ".82rem", color: "rgba(24,43,85,.6)", lineHeight: 1.3 }}>
                {(o.items || [])
                  .map((it) => `${it.quantity}× ${it.name}${it.sizeLabel ? ` (${it.sizeLabel})` : ""}`)
                  .join(", ")}
              </span>
              <span style={{ fontSize: ".72rem", color: "rgba(24,43,85,.45)" }}>
                {staffTimeAgo(o.updated_at || o.created_at)}
              </span>
            </div>
            <div className="sb-hist__side">
              <span className="sb-inv__qty">{fmtDT(o.total_millimes)}</span>
              <div className="sb-hist__actions">
                <button className="sb-hist-btn" onClick={() => onPrint(o)} title="Imprimer le reçu">
                  🖨 Reçu
                </button>
                <button className="sb-hist-btn sb-hist-btn--return" onClick={() => onReturn(o)} title="Retourner la commande">
                  ↩ Retour
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Supplies inventory: baristas tap − / + to count stock as it's used/received.
function StaffInventoryBoard({ supplies, onAdjust }) {
  if (supplies.length === 0) return <p className="sb-staff-empty">Chargement de l'inventaire…</p>;
  const lowCount = supplies.filter((s) => Number(s.quantity) <= Number(s.low_threshold)).length;
  return (
    <div className="sb-inv">
      <div className="sb-stock__summary">
        {lowCount === 0 ? "Stocks OK ✓" : `${lowCount} article(s) à réapprovisionner`}
      </div>
      <div className="sb-inv__list">
        {supplies.map((s) => {
          const low = Number(s.quantity) <= Number(s.low_threshold);
          return (
            <div className={`sb-inv__row ${low ? "is-low" : ""}`} key={s.id}>
              <div className="sb-inv__info">
                <span className="sb-inv__name">{s.name}</span>
                {low && <span className="sb-inv__flag">Bas</span>}
              </div>
              <div className="sb-inv__ctrl">
                <button className="sb-inv__btn" onClick={() => onAdjust(s.id, -1)} aria-label={`Retirer 1 ${s.name}`}>
                  −
                </button>
                <span className="sb-inv__qty">
                  {Number(s.quantity)} <small>{s.unit}</small>
                </span>
                <button className="sb-inv__btn" onClick={() => onAdjust(s.id, 1)} aria-label={`Ajouter 1 ${s.name}`}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Barista "86 board": tap a product to flip it in/out of stock. A product is
// considered in stock if any of its sizes is; tapping flips them all together.
function StaffStockBoard({ menu, onToggle }) {
  const groups = [];
  const idx = new Map();
  for (const it of menu) {
    const key = it.group || it.id;
    let gi = idx.get(key);
    if (gi === undefined) {
      gi = groups.length;
      idx.set(key, gi);
      groups.push({ key, name: it.name, category: it.category, items: [] });
    }
    groups[gi].items.push(it);
  }
  const outCount = groups.filter((g) => g.items.every((i) => !i.available)).length;

  if (menu.length === 0) return <p className="sb-staff-empty">Chargement du stock…</p>;

  return (
    <div className="sb-stock">
      <div className="sb-stock__summary">
        {outCount === 0 ? "Tout est en stock ✓" : `${outCount} produit(s) en rupture`}
      </div>
      {categories.map((cat) => {
        const catGroups = groups.filter((g) => g.category === cat.id);
        if (catGroups.length === 0) return null;
        return (
          <div className="sb-stock__cat" key={cat.id}>
            <h3 className="sb-stock__cat-title">{cat.label}</h3>
            <div className="sb-stock__grid">
              {catGroups.map((g) => {
                const available = g.items.some((i) => i.available);
                const ids = g.items.map((i) => i.id);
                return (
                  <button
                    key={g.key}
                    className={`sb-stock__item ${available ? "" : "is-out"}`}
                    onClick={() => onToggle(ids, !available)}
                    aria-pressed={!available}
                  >
                    <span className="sb-stock__name">{g.name}</span>
                    <span className="sb-stock__state">{available ? "En stock" : "En rupture"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffView() {
  const [token, setToken] = useState(readStoredStaffToken);
  const [me, setMe] = useState(null);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [roster, setRoster] = useState([]);
  const [closedSummary, setClosedSummary] = useState(null);
  const [tab, setTab] = useState("orders"); // orders | stock | inventory | history
  const [menu, setMenu] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async (tk) => {
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/staff/history`, { headers: { "x-staff-token": tk || token } });
      if (res.ok) setHistory((await res.json()).orders || []);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadMenu = useCallback(async () => {
    try {
      // Raw stored availability so the barista's 86 toggle doesn't fight the
      // automatic supply-driven blocks (those apply to the customer menu).
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/menu?stored=1`);
      if (res.ok) setMenu((await res.json()).items || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSupplies = useCallback(
    async (tk) => {
      try {
        const res = await fetch(`${PAYMENT_API_BASE_URL}/api/supplies`, { headers: { "x-staff-token": tk || token } });
        if (res.ok) setSupplies((await res.json()).supplies || []);
      } catch {
        /* ignore */
      }
    },
    [token]
  );

  // Adjust a supply count by delta (barista used/received stock).
  const adjustSupply = async (id, delta) => {
    setSupplies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, quantity: Math.max(0, Number(s.quantity) + delta) } : s))
    );
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/supplies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-staff-token": token },
        body: JSON.stringify({ deltaQuantity: delta }),
      });
    } catch {
      /* optimistic — reload reconciles */
    }
  };

  // Flip a product (all its sizes) in or out of stock.
  const toggleStock = async (ids, available) => {
    setMenu((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, available } : m)));
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/menu/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-staff-token": token },
        body: JSON.stringify({ ids, available }),
      });
    } catch {
      /* ignore — optimistic; refetch reconciles */
    }
    loadMenu();
  };

  const login = async (e) => {
    e.preventDefault();
    if (busy || pin.length !== 4) return;
    setBusy(true);
    setAuthError(false);
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setAuthError(true);
      } else {
        const data = await res.json();
        storeStaffToken(data.token);
        setToken(data.token);
        setMe(data.staff);
        setPin("");
        setClosedSummary(null);
      }
    } catch {
      setAuthError(true);
    }
    setBusy(false);
  };

  const refresh = useCallback(async (tk) => {
    try {
      const [oRes, mRes, rRes] = await Promise.all([
        fetch(`${PAYMENT_API_BASE_URL}/api/orders`, { headers: { "x-staff-token": tk } }),
        fetch(`${PAYMENT_API_BASE_URL}/api/staff/me`, { headers: { "x-staff-token": tk } }),
        fetch(`${PAYMENT_API_BASE_URL}/api/staff/roster`, { headers: { "x-staff-token": tk } }),
      ]);
      if (oRes.status === 401 || mRes.status === 401) {
        storeStaffToken(null); // token expired — back to PIN entry
        setToken(null);
        setMe(null);
        return;
      }
      if (oRes.ok) setOrders((await oRes.json()).orders || []);
      if (mRes.ok) setMe((await mRes.json()).staff);
      if (rRes.ok) setRoster((await rRes.json()).roster || []);
    } catch {
      /* transient — next tick retries */
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    refresh(token);
    const iv = setInterval(() => refresh(token), 5000);
    return () => clearInterval(iv);
  }, [token, refresh]);

  useEffect(() => {
    if (token && tab === "stock") loadMenu();
  }, [token, tab, loadMenu]);

  useEffect(() => {
    if (token && tab === "inventory") loadSupplies(token);
  }, [token, tab, loadSupplies]);

  useEffect(() => {
    if (token && tab === "history") loadHistory(token);
  }, [token, tab, loadHistory]);

  const advance = async (id, status) => {
    // "done" (served) and "cancelled" (voided) both leave the active queue.
    setOrders((prev) =>
      status === "done" || status === "cancelled"
        ? prev.filter((o) => o.id !== id)
        : prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    try {
      await fetch(`${PAYMENT_API_BASE_URL}/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-staff-token": token },
        body: JSON.stringify({ status }),
      });
    } catch {
      /* ignore — next poll reconciles */
    }
    refresh(token);
  };

  // Return a served order (with a reason). Reverses the shift credit + restocks
  // ingredients server-side, then drops the order from history.
  const returnOrder = async (order) => {
    const reason = window.prompt(`Retour de la commande #${order.ref}\n\nMotif du retour :`);
    if (reason == null) return; // cancelled
    const r = reason.trim();
    if (!r) {
      window.alert("Un motif est requis pour enregistrer le retour.");
      return;
    }
    setHistory((prev) => prev.filter((o) => o.id !== order.id)); // optimistic
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/orders/${order.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-staff-token": token },
        body: JSON.stringify({ reason: r }),
      });
      if (!res.ok) {
        window.alert("Le retour a échoué. Réessayez.");
        loadHistory(token); // reconcile the optimistic removal
      }
    } catch {
      loadHistory(token);
    }
    refresh(token); // pull the corrected shift total into the topbar
  };

  const closeShift = async () => {
    if (!window.confirm("Fermer la caisse et réinitialiser votre total ?")) return;
    try {
      const res = await fetch(`${PAYMENT_API_BASE_URL}/api/staff/close-shift`, {
        method: "POST",
        headers: { "x-staff-token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setClosedSummary({ ...data.summary, breakdown: data.breakdown || {} });
      }
    } catch {
      /* ignore */
    }
    storeStaffToken(null);
    setToken(null);
    setMe(null);
    setOrders([]);
    setHistory([]);
  };

  const staffStyles = `
    .sb-staff { min-height: 100vh; background: #f6f1e7; color: #182b55; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; padding: 16px; }
    .sb-staff-login { max-width: 340px; margin: 12vh auto; background: #fff; padding: 32px 28px; border-radius: 14px; box-shadow: 0 10px 40px rgba(24,43,85,.12); text-align: center; }
    .sb-staff-login h1 { margin: 0 0 6px; font-size: 1.4rem; }
    .sb-staff-login p { margin: 0 0 20px; color: rgba(24,43,85,.6); font-size: .9rem; }
    .sb-staff-login input { width: 100%; box-sizing: border-box; padding: 14px; border: 1px solid rgba(24,43,85,.2); border-radius: 8px; font-size: 1.6rem; letter-spacing: .5em; text-align: center; margin-bottom: 12px; }
    .sb-staff-login button { width: 100%; padding: 13px; background: #182b55; color: #fff; border: none; border-radius: 8px; font-size: .95rem; font-weight: 600; cursor: pointer; }
    .sb-staff-login button:disabled { opacity: .5; }
    .sb-staff-login__err { color: #c0392b; font-size: .85rem; margin: 0 0 12px; }
    .sb-staff-summary { max-width: 340px; margin: 14vh auto; background: #fff; padding: 32px 28px; border-radius: 14px; box-shadow: 0 10px 40px rgba(24,43,85,.12); text-align: center; }
    .sb-staff-summary h1 { margin: 0 0 8px; font-size: 1.3rem; }
    .sb-staff-summary__big { font-size: 2.2rem; font-weight: 700; margin: 14px 0 4px; }
    .sb-staff-summary__sub { color: rgba(24,43,85,.6); font-size: .9rem; margin: 0 0 22px; }
    .sb-staff-summary button { width: 100%; padding: 13px; background: #182b55; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .sb-staff-topbar { max-width: 1200px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: #fff; border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 18px rgba(24,43,85,.08); }
    .sb-staff-me { display: flex; flex-direction: column; }
    .sb-staff-me__name { font-size: 1.15rem; font-weight: 700; }
    .sb-staff-me__label { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(24,43,85,.5); }
    .sb-staff-total { text-align: center; }
    .sb-staff-total__num { font-size: 1.5rem; font-weight: 700; }
    .sb-staff-total__label { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(24,43,85,.5); }
    .sb-staff-close-btn { padding: 10px 16px; border: 1px solid rgba(24,43,85,.25); background: transparent; color: #182b55; border-radius: 8px; font-weight: 600; font-size: .85rem; cursor: pointer; }
    .sb-staff-roster { max-width: 1200px; margin: 0 auto 14px; display: flex; flex-wrap: wrap; gap: 8px; }
    .sb-staff-roster__chip { font-size: .78rem; padding: 5px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; background: #fff; box-shadow: 0 2px 8px rgba(24,43,85,.06); }
    .sb-staff-roster__dot { width: 8px; height: 8px; border-radius: 50%; }
    .sb-staff-empty { text-align: center; color: rgba(24,43,85,.5); margin-top: 14vh; font-size: 1.05rem; }
    .sb-staff-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .sb-staff-card { background: #fff; border-radius: 12px; border-top: 4px solid #182b55; padding: 14px 16px; box-shadow: 0 4px 18px rgba(24,43,85,.08); display: flex; flex-direction: column; gap: 8px; }
    .sb-staff-card__top { display: flex; justify-content: space-between; align-items: center; }
    .sb-staff-card__ref { font-size: 1.4rem; font-weight: 700; }
    .sb-staff-card__status { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .sb-staff-card__customer { font-size: 1rem; font-weight: 600; color: #182b55; }
    .sb-staff-card__meta { font-size: .8rem; color: rgba(24,43,85,.6); }
    .sb-staff-card__items { list-style: none; margin: 4px 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .sb-staff-card__items li { font-size: .95rem; line-height: 1.3; }
    .sb-staff-card__qty { font-weight: 700; margin-right: 6px; }
    .sb-staff-card__foot { font-size: .8rem; color: rgba(24,43,85,.6); border-top: 1px solid rgba(24,43,85,.08); padding-top: 8px; }
    .sb-staff-card__actions { display: flex; gap: 8px; margin-top: 2px; }
    .sb-staff-btn { flex: 1; padding: 11px; border-radius: 8px; border: none; font-size: .85rem; font-weight: 600; cursor: pointer; }
    .sb-staff-btn--primary { background: #182b55; color: #fff; }
    .sb-staff-btn--ghost { background: transparent; color: rgba(24,43,85,.55); border: 1px solid rgba(24,43,85,.2); flex: 0 0 auto; padding: 11px 14px; }
    .sb-staff-tabs { max-width: 1200px; margin: 0 auto 14px; display: flex; gap: 8px; }
    .sb-staff-tab { flex: 1; padding: 11px; border-radius: 10px; border: 1px solid rgba(24,43,85,.15); background: #fff; color: rgba(24,43,85,.6); font-weight: 600; font-size: .9rem; cursor: pointer; }
    .sb-staff-tab.is-active { background: #182b55; color: #fff; border-color: #182b55; }
    .sb-stock { max-width: 1200px; margin: 0 auto; }
    .sb-stock__summary { text-align: center; font-weight: 600; margin: 0 0 16px; color: #182b55; }
    .sb-stock__cat { margin-bottom: 18px; }
    .sb-stock__cat-title { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(24,43,85,.5); margin: 0 0 8px; }
    .sb-stock__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .sb-stock__item { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(24,43,85,.12); background: #fff; cursor: pointer; transition: background .15s, border-color .15s; }
    .sb-stock__name { font-weight: 600; font-size: .92rem; color: #182b55; }
    .sb-stock__state { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #15803d; }
    .sb-stock__item.is-out { background: #fef2f2; border-color: #fecaca; }
    .sb-stock__item.is-out .sb-stock__name { text-decoration: line-through; color: rgba(24,43,85,.5); }
    .sb-stock__item.is-out .sb-stock__state { color: #dc2626; }
    .sb-inv { max-width: 700px; margin: 0 auto; }
    .sb-inv__list { display: flex; flex-direction: column; gap: 8px; }
    .sb-inv__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid rgba(24,43,85,.12); border-radius: 10px; padding: 12px 14px; }
    .sb-inv__row.is-low { background: #fff7ed; border-color: #fdba74; }
    .sb-inv__info { display: flex; align-items: center; gap: 8px; }
    .sb-inv__name { font-weight: 600; color: #182b55; }
    .sb-inv__flag { font-size: .66rem; font-weight: 700; text-transform: uppercase; color: #c2410c; background: #ffedd5; padding: 2px 7px; border-radius: 10px; }
    .sb-inv__ctrl { display: flex; align-items: center; gap: 8px; }
    .sb-inv__btn { width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(24,43,85,.2); background: #fff; font-size: 1.3rem; font-weight: 600; color: #182b55; cursor: pointer; line-height: 1; }
    .sb-inv__qty { min-width: 74px; text-align: center; font-weight: 700; color: #182b55; }
    .sb-inv__qty small { font-weight: 400; color: rgba(24,43,85,.5); font-size: .72rem; }
    .sb-staff-breakdown { list-style: none; margin: 6px 0 16px; padding: 14px 0; border-top: 1px solid rgba(24,43,85,.1); border-bottom: 1px solid rgba(24,43,85,.1); text-align: left; max-height: 240px; overflow-y: auto; }
    .sb-staff-breakdown li { display: flex; justify-content: space-between; padding: 3px 0; font-size: .9rem; }
    .sb-hist__side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }
    .sb-hist__actions { display: flex; gap: 6px; }
    .sb-hist-btn { padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(24,43,85,.2); background: #fff; color: #182b55; font-size: .78rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .sb-hist-btn:hover { background: rgba(24,43,85,.05); }
    .sb-hist-btn--return { color: #b91c1c; border-color: #fca5a5; }
    .sb-hist-btn--return:hover { background: #fef2f2; }

    /* ---------- Phone layout ---------- */
    @media (max-width: 560px) {
      .sb-staff { padding: 10px 10px calc(16px + env(safe-area-inset-bottom)); }
      /* Topbar: name + total share the first row, close button spans a full row below */
      .sb-staff-topbar { padding: 12px 14px; row-gap: 12px; }
      .sb-staff-me { flex: 1 1 auto; }
      .sb-staff-me__name { font-size: 1rem; }
      .sb-staff-total { text-align: right; }
      .sb-staff-total__num { font-size: 1.2rem; }
      .sb-staff-close-btn { flex: 1 1 100%; text-align: center; padding: 12px; }
      /* Tabs: readable 2×2 grid instead of four squished columns */
      .sb-staff-tabs { flex-wrap: wrap; }
      .sb-staff-tab { flex: 1 1 calc(50% - 4px); padding: 12px 6px; font-size: .82rem; }
      /* One order card per row, two stock tiles per row */
      .sb-staff-grid { grid-template-columns: 1fr; }
      .sb-staff-card__ref { font-size: 1.25rem; }
      .sb-stock__grid { grid-template-columns: 1fr 1fr; gap: 8px; }
      .sb-inv__qty { min-width: 62px; }
      .sb-staff-login, .sb-staff-summary { margin-top: 8vh; margin-bottom: 8vh; padding: 28px 22px; }
    }
    /* Very small phones: single-column stock tiles so long names don't clip */
    @media (max-width: 360px) {
      .sb-stock__grid { grid-template-columns: 1fr; }
      .sb-staff-total__num { font-size: 1.05rem; }
    }
  `;

  return (
    <div className="sb-staff">
      <style>{staffStyles}</style>

      {closedSummary ? (
        <div className="sb-staff-summary">
          <h1>Caisse fermée</h1>
          <div className="sb-staff-summary__big">{fmtDT(closedSummary.salesMillimes)}</div>
          <p className="sb-staff-summary__sub">{closedSummary.ordersCount} commande(s) servie(s) durant votre service.</p>
          {closedSummary.breakdown && Object.keys(closedSummary.breakdown).length > 0 && (
            <ul className="sb-staff-breakdown">
              {Object.entries(closedSummary.breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([label, qty]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong>×{qty}</strong>
                  </li>
                ))}
            </ul>
          )}
          <p className="sb-staff-summary__sub" style={{ fontSize: ".78rem" }}>Le rapport a été envoyé au gérant.</p>
          <button onClick={() => setClosedSummary(null)}>Terminé</button>
        </div>
      ) : !token ? (
        <form className="sb-staff-login" onSubmit={login}>
          <h1>Espace Staff</h1>
          <p>Entrez votre code PIN pour pointer.</p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
              setAuthError(false);
            }}
            placeholder="••••"
            autoFocus
          />
          {authError && <p className="sb-staff-login__err">Code PIN incorrect.</p>}
          <button type="submit" disabled={busy || pin.length !== 4}>
            {busy ? "Connexion…" : "Pointer"}
          </button>
        </form>
      ) : (
        <>
          <div className="sb-staff-topbar">
            <div className="sb-staff-me">
              <span className="sb-staff-me__name">{me?.name || "Staff"}</span>
              <span className="sb-staff-me__label">En service</span>
            </div>
            <div className="sb-staff-total">
              <div className="sb-staff-total__num">{fmtDT(me?.shift_sales_millimes)}</div>
              <div className="sb-staff-total__label">Aujourd'hui · {me?.shift_orders_count || 0} cmd</div>
            </div>
            <button className="sb-staff-close-btn" onClick={closeShift}>
              Fermer la caisse
            </button>
          </div>

          <div className="sb-staff-tabs">
            <button
              className={`sb-staff-tab ${tab === "orders" ? "is-active" : ""}`}
              onClick={() => setTab("orders")}
            >
              Commandes{orders.length ? ` · ${orders.length}` : ""}
            </button>
            <button
              className={`sb-staff-tab ${tab === "stock" ? "is-active" : ""}`}
              onClick={() => setTab("stock")}
            >
              Stock
            </button>
            <button
              className={`sb-staff-tab ${tab === "inventory" ? "is-active" : ""}`}
              onClick={() => setTab("inventory")}
            >
              Inventaire
            </button>
            <button
              className={`sb-staff-tab ${tab === "history" ? "is-active" : ""}`}
              onClick={() => setTab("history")}
            >
              Mon historique
            </button>
          </div>

          {tab === "stock" ? (
            <StaffStockBoard menu={menu} onToggle={toggleStock} />
          ) : tab === "inventory" ? (
            <StaffInventoryBoard supplies={supplies} onAdjust={adjustSupply} />
          ) : tab === "history" ? (
            <StaffHistory
              orders={history}
              total={me?.shift_sales_millimes}
              count={me?.shift_orders_count}
              onReturn={returnOrder}
              onPrint={printReceipt}
            />
          ) : (
            <>
              {roster.length > 0 && (
                <div className="sb-staff-roster">
                  {roster.map((r) => (
                    <span className="sb-staff-roster__chip" key={r.id}>
                      <span
                        className="sb-staff-roster__dot"
                        style={{ background: r.on_shift ? "#15803d" : "rgba(24,43,85,.25)" }}
                      />
                      {r.name} {r.on_shift ? "" : "· absent"}
                    </span>
                  ))}
                </div>
              )}

              {orders.length === 0 ? (
                <p className="sb-staff-empty">Aucune commande pour le moment.</p>
              ) : (
                <div className="sb-staff-grid">
                  {orders.map((o) => (
                    <StaffOrderCard key={o.id} order={o} onAdvance={advance} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Route between the three installable apps:
//   /staff.html (or #staff)  → barista order screen
//   /admin.html              → manager console (opens Espace Gérant on load)
//   everything else          → customer site
export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isStaffEntry = /(^|\/)staff(\.html)?$/.test(path);
  const isAdminEntry = /(^|\/)admin(\.html)?$/.test(path);

  const [isStaff, setIsStaff] = useState(
    () => typeof window !== "undefined" && (isStaffEntry || window.location.hash === "#staff")
  );
  useEffect(() => {
    const onHash = () => setIsStaff(isStaffEntry || window.location.hash === "#staff");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [isStaffEntry]);

  // Register the service worker up front so push is ready when an order is placed.
  useEffect(() => {
    ensureServiceWorker();
  }, []);

  // The manager app opens the Espace Gérant straight away.
  useEffect(() => {
    if (isAdminEntry && window.location.hash !== "#admin") {
      window.location.hash = "#admin";
    }
  }, [isAdminEntry]);

  return isStaff ? <StaffView /> : <SmellsByBorboneMenu />;
}
