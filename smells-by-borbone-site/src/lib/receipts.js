// Printable 72mm receipt/ticket generation (customer receipts + shift/day
// closing tickets). Opens a popup and triggers the browser print dialog.
import { escapeHtml } from "./format.js";
import { contactInfo } from "../data.js";

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
export function printReceipt(order) {
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
export function printShiftReport(report) {
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
export function printDayClose(reports, dateLabel) {
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
