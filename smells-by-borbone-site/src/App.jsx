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
  PHOTO_REVIEW_KHAYREDDINE, PHOTO_REVIEW_PATRIZIA, PHOTO_REVIEW_ROCHDY, HERO_BG,
} from "./assets/images.js";
import GlobalStyles from "./GlobalStyles.jsx";
import { primeAudio, playChime, playAlarm, stopAlarm, isIOS, vibrateAlert } from "./lib/audio.js";
import {
  formatPrice, getBillTotal, getBillCount, slugify, orderErrorMessage,
  staffTimeAgo, fmtDT, escapeHtml,
} from "./lib/format.js";
import { PAYMENT_API_BASE_URL } from "./config.js";
import {
  categories, DEFAULT_MENU_ITEMS, contactInfo, reviews, navLinks, NAV_CATEGORY_IDS, shopConfig,
} from "./data.js";
import { StaffView } from "./staff/StaffView.jsx";
import { AdminPanel } from "./admin/AdminPanel.jsx";
import {
  ensureServiceWorker, pushSupported, subscribeOrderPush, isStandalone,
  currentTrackedOrderId, sbPushActive,
} from "./lib/push.js";

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


/* --------- Web Push (installed-app notifications, incl. locked iPhone) ------- */


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
      <div className="sb-hero__photo" style={{ backgroundImage: `url(${HERO_BG})` }} aria-hidden="true" />
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
          <img src={PHOTO_LATTE_ART} alt="Cappuccino latte art chez SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={60}>
          <img src={PHOTO_CAT_CHAIR} alt="Salle intérieure de SmellS — sièges bleus et lumière chaleureuse" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={120}>
          <img src={PHOTO_TIRAMISU} alt="Dessert et café servis chez SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item sb-gallery__item--tall" delay={180}>
          <img src={PHOTO_ICED_DUO} alt="Boissons glacées signature bleues de SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={240}>
          <img src={PHOTO_CARAMEL} alt="Café glacé signature de SmellS" loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="sb-gallery__item" delay={300}>
          <img src={PHOTO_OREO} alt="Vitrine de pâtisseries maison chez SmellS" loading="lazy" />
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
        <img src={PHOTO_STOREFRONT} alt="La terrasse extérieure de SmellS à Sousse" />
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
