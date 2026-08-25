// Editable content: menu, categories, contact details, reviews, nav, and shop
// config. This is the file to change to update the café\'s data.
import { CakeSlice, Citrus, Coffee, CupSoda, GlassWater, Milk, Snowflake, Sparkles } from "lucide-react";
import {
  PHOTO_REVIEW_LOAI, PHOTO_REVIEW_ONS, PHOTO_REVIEW_KHAYREDDINE,
  PHOTO_REVIEW_PATRIZIA, PHOTO_REVIEW_ROCHDY,
} from "./assets/images.js";

export const categories = [
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
export const DEFAULT_MENU_ITEMS = [
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
export const contactInfo = {
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
export const reviews = [
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
export const navLinks = [
  { label: "Menu", sectionId: "menu", category: null },
  { label: "Café Chaud", sectionId: "menu", category: "hot-coffee" },
  { label: "Iced Coffee", sectionId: "menu", category: "iced-coffee" },
  { label: "Smoothies", sectionId: "menu", category: "smoothies" },
  { label: "Desserts", sectionId: "menu", category: "dessert" },
  { label: "Boutique", sectionId: "boutique", category: null },
  { label: "Contact", sectionId: "contact", category: null },
];
export const NAV_CATEGORY_IDS = navLinks.filter((l) => l.category).map((l) => l.category);

// In-shop bill configuration. Table numbers are just one way to identify a
// customer at the till — set requireTableNumber to false if the café later
// decides to do this another way (e.g. a staff member matches the payment
// at the counter instead).
export const shopConfig = {
  requireTableNumber: false,
  tableNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};
