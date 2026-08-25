import { useState, useEffect, useCallback } from "react";
import { PAYMENT_API_BASE_URL } from "../config.js";
import { categories } from "../data.js";
import { fmtDT, staffTimeAgo } from "../lib/format.js";
import { printReceipt } from "../lib/receipts.js";

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


// Shared 72mm ticket shell — prints cleanly on a receipt/thermal printer but
// works on any printer the phone or tablet can reach. `inner` is the body HTML.

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

export function StaffView() {
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
