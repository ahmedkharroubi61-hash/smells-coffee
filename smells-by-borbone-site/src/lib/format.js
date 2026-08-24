// Pure formatting / helper utilities — no DOM or React dependencies, so they're
// straightforward to unit-test (see lib/__tests__/format.test.js).

export function formatPrice(amount) {
  return `${amount.toFixed(3)} DT`;
}

// Total of a bill { itemId: qty } given the menu items list (price × qty).
export function getBillTotal(bill, items) {
  return Object.entries(bill).reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id);
    return item ? sum + item.price * qty : sum;
  }, 0);
}

export function getBillCount(bill) {
  return Object.values(bill).reduce((sum, qty) => sum + qty, 0);
}

// Turns a new item's name into a unique id (e.g. "Thé à la Menthe" ->
// "the-a-la-menthe"), appending -2, -3, ... if that slug is already taken.
export function slugify(name, existingIds) {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
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

// Friendly French message for an order-submit error code.
export function orderErrorMessage(code) {
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

// "il y a N min" relative time for the staff screens.
export function staffTimeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins === 1) return "il y a 1 min";
  return `il y a ${mins} min`;
}

// Millimes -> "X.XXX DT".
export function fmtDT(millimes) {
  return (Number(millimes || 0) / 1000).toFixed(3) + " DT";
}

// HTML-escape untrusted text before putting it in printed-ticket markup.
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
}
