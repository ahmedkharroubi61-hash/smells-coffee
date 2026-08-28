import { useState, useEffect, useCallback } from "react";
import { Coffee, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { PAYMENT_API_BASE_URL } from "../config.js";
import { categories } from "../data.js";
import { formatPrice, fmtDT } from "../lib/format.js";
import {
  monthlyBreakdown, monthStats, overallMonthlyAverage,
  yearlyBreakdown, yearStats, overallYearlyAverage,
} from "../lib/analytics.js";
import { printShiftReport, printDayClose } from "../lib/receipts.js";

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

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return `${MONTHS_FR[Number(m) - 1]} ${y}`;
};
const dayLabel = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });

// Owner income analytics. Month view: best/worst day of a month + that month
// vs the other months. Year view: best/worst month of a year + that year vs
// the other years.
function AnalyticsManager({ onFetch, onBack }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("month"); // "month" | "year"
  const [selMonth, setSelMonth] = useState(null);
  const [selYear, setSelYear] = useState(null);

  useEffect(() => {
    (async () => {
      const d = (await onFetch()) || [];
      setDays(d);
      const months = [...new Set(d.map((x) => x.date.slice(0, 7)))].sort();
      const years = [...new Set(d.map((x) => x.date.slice(0, 4)))].sort();
      if (months.length) setSelMonth(months[months.length - 1]);
      if (years.length) setSelYear(years[years.length - 1]);
      setLoading(false);
    })();
  }, [onFetch]);

  const byMonth = monthlyBreakdown(days);
  const byYear = yearlyBreakdown(byMonth);
  const isYear = mode === "year";

  const buckets = isYear ? byYear : byMonth;
  const keys = Object.keys(buckets).sort();
  const sel = isYear ? selYear : selMonth;
  const setSel = isYear ? setSelYear : setSelMonth;
  const cur = sel ? buckets[sel] : null;
  const maxTotal = Math.max(1, ...keys.map((k) => buckets[k].total));
  const overallAvg = isYear ? overallYearlyAverage(byYear) : overallMonthlyAverage(byMonth);
  const delta = cur ? cur.total - overallAvg : 0;

  const stats = isYear ? yearStats(cur) : monthStats(cur);
  const { best, worst } = stats;
  const periodAvg = isYear ? stats.avgMonth : stats.avgDay;

  // period-aware labels
  const T = {
    selector: isYear ? "Année" : "Mois",
    total: isYear ? "Total de l'année" : "Total du mois",
    avgUnit: isYear ? "/ mois" : "/ jour",
    best: isYear ? "Meilleur mois" : "Meilleur jour",
    worst: isYear ? "Mois le plus faible" : "Jour le plus faible",
    vs: isYear ? "vs moyenne annuelle" : "vs moyenne mensuelle",
    compare: isYear ? "Comparaison annuelle" : "Comparaison mensuelle",
    avgLine: isYear
      ? `Moyenne sur ${keys.length} année(s)`
      : `Moyenne sur ${keys.length} mois`,
    avgPer: isYear ? "par an" : "par mois",
  };
  const optLabel = (k) => (isYear ? k : monthLabel(k));
  const barLabel = (k) => (isYear ? k : MONTHS_FR[Number(k.split("-")[1]) - 1].slice(0, 3));
  const bucketVal = (b) => (isYear ? fmtDT(b.total) : fmtDT(b.totalMillimes));
  const bucketSub = (b) =>
    isYear ? `${monthLabel(b.key)} · ${b.orders} cmd` : `${dayLabel(b.date)} · ${b.ordersCount} cmd`;

  return (
    <>
      <style>{`
        .sb-an-toggle { display: flex; gap: 8px; margin: 6px 0 16px; }
        .sb-an-toggle button { flex: 1; padding: 9px; border-radius: 10px; border: 1px solid rgba(24,43,85,.18); background: #fff; color: rgba(24,43,85,.6); font-weight: 600; font-size: .9rem; cursor: pointer; }
        .sb-an-toggle button.is-on { background: var(--navy); color: #fff; border-color: var(--navy); }
        .sb-an-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(24,43,85,.22); background: var(--white-warm); color: var(--ink); font-family: var(--sans); font-size: .95rem; margin: 4px 0 20px; }
        .sb-an-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
        .sb-an-card { border: 1px solid rgba(24,43,85,.12); border-radius: 12px; padding: 12px 14px; background: #fff; }
        .sb-an-card--wide { grid-column: 1 / -1; }
        .sb-an-card__label { font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; color: rgba(24,43,85,.5); margin: 0 0 4px; }
        .sb-an-card__val { font-family: var(--serif); font-weight: 700; font-size: 1.25rem; color: var(--navy); }
        .sb-an-card__sub { font-size: .78rem; color: rgba(24,43,85,.55); }
        .sb-an-best { color: #15803d; } .sb-an-worst { color: #c2410c; }
        .sb-an-delta--up { color: #15803d; font-weight: 600; } .sb-an-delta--down { color: #c2410c; font-weight: 600; }
        .sb-an-chart { margin-top: 8px; display: flex; align-items: flex-end; gap: 8px; height: 150px; padding: 10px 4px 0; border-bottom: 1px solid rgba(24,43,85,.12); overflow-x: auto; }
        .sb-an-bar { flex: 1 0 34px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; }
        .sb-an-bar__fill { width: 100%; max-width: 40px; background: rgba(24,43,85,.25); border-radius: 6px 6px 0 0; transition: background .2s; min-height: 3px; }
        .sb-an-bar.is-sel .sb-an-bar__fill { background: var(--brass); }
        .sb-an-bar__lbl { font-size: .62rem; color: rgba(24,43,85,.55); margin-top: 5px; white-space: nowrap; }
        .sb-an-avgline { font-size: .78rem; color: rgba(24,43,85,.6); margin: 8px 0 0; }
      `}</style>
      <button className="sb-btn-ghost sb-admin-staff-link" onClick={onBack}>
        ← Retour au menu
      </button>
      <h2 id="sb-admin-heading" className="sb-panel__title">
        Statistiques
      </h2>

      {loading ? (
        <p className="sb-admin-intro">Chargement…</p>
      ) : keys.length === 0 ? (
        <p className="sb-admin-intro">Aucune donnée encore. Les statistiques apparaissent dès les premières commandes servies.</p>
      ) : (
        <>
          <div className="sb-an-toggle">
            <button className={mode === "month" ? "is-on" : ""} onClick={() => setMode("month")}>Par mois</button>
            <button className={mode === "year" ? "is-on" : ""} onClick={() => setMode("year")}>Par année</button>
          </div>

          <label className="sb-admin-field" style={{ marginBottom: 0 }}>
            {T.selector}
            <select className="sb-an-select" value={sel || ""} onChange={(e) => setSel(e.target.value)}>
              {[...keys].reverse().map((k) => (
                <option key={k} value={k}>{optLabel(k)}</option>
              ))}
            </select>
          </label>

          {cur && (
            <div className="sb-an-grid">
              <div className="sb-an-card sb-an-card--wide">
                <p className="sb-an-card__label">{T.total} · {cur.orders} commande(s)</p>
                <div className="sb-an-card__val">{fmtDT(cur.total)}</div>
                <span className="sb-an-card__sub">
                  Moyenne : {fmtDT(periodAvg)} {T.avgUnit} ·{" "}
                  <span className={delta >= 0 ? "sb-an-delta--up" : "sb-an-delta--down"}>
                    {delta >= 0 ? "▲" : "▼"} {fmtDT(Math.abs(delta))} {T.vs}
                  </span>
                </span>
              </div>
              <div className="sb-an-card">
                <p className="sb-an-card__label sb-an-best">{T.best}</p>
                <div className="sb-an-card__val">{best ? bucketVal(best) : "—"}</div>
                <span className="sb-an-card__sub">{best ? bucketSub(best) : ""}</span>
              </div>
              <div className="sb-an-card">
                <p className="sb-an-card__label sb-an-worst">{T.worst}</p>
                <div className="sb-an-card__val">{worst ? bucketVal(worst) : "—"}</div>
                <span className="sb-an-card__sub">{worst ? bucketSub(worst) : ""}</span>
              </div>
            </div>
          )}

          <h3 className="sb-admin-group__title" style={{ marginTop: 20 }}>{T.compare}</h3>
          <div className="sb-an-chart">
            {keys.map((k) => (
              <button
                key={k}
                className={`sb-an-bar ${k === sel ? "is-sel" : ""}`}
                onClick={() => setSel(k)}
                title={`${optLabel(k)} — ${fmtDT(buckets[k].total)}`}
              >
                <span className="sb-an-bar__fill" style={{ height: `${(buckets[k].total / maxTotal) * 100}%` }} />
                <span className="sb-an-bar__lbl">{barLabel(k)}</span>
              </button>
            ))}
          </div>
          <p className="sb-an-avgline">
            {T.avgLine} : <strong>{fmtDT(overallAvg)}</strong> {T.avgPer}.
          </p>
        </>
      )}
    </>
  );
}

export function AdminPanel({ open, onClose, items, onAddItem, onUpdateItem, onDeleteItem, onResetMenu, onAuthenticate, onHasSession, onLogout, onFetchStaff, onAddStaff, onDeleteStaff, onFetchSubscribers, onFetchSupplies, onAddSupply, onUpdateSupply, onDeleteSupply, onFetchBoutiqueProducts, onAddBoutiqueProduct, onUpdateBoutiqueProduct, onDeleteBoutiqueProduct, onFetchBoutiqueOrders, onUpdateBoutiqueOrder, onFetchShiftReports, onDeleteShiftReport, onFetchReturns, onFetchAnalytics }) {
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
        ) : view === "analytics" ? (
          <AnalyticsManager onFetch={onFetchAnalytics} onBack={() => setView("list")} />
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
            <button className="sb-btn-ghost sb-admin-staff-link" onClick={() => setView("analytics")}>
              Statistiques (revenus par mois) →
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
