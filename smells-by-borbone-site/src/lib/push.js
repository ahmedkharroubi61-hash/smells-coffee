// Web Push + service-worker helpers (installed-app notifications).
import { PAYMENT_API_BASE_URL } from "../config.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

let sbSWReg = null;
export let sbPushActive = false; // true once this device is subscribed to push for its order
export async function ensureServiceWorker() {
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
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Subscribe this device to be pushed when `orderId` is ready. Needs notification
// permission already granted. Returns true on success. Safe no-op if unsupported
// (e.g. iPhone still in a plain Safari tab).
export async function subscribeOrderPush(orderId) {
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
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true
  );
}

export function currentTrackedOrderId() {
  try {
    return JSON.parse(localStorage.getItem("sb_tracked_order") || "null")?.orderId || null;
  } catch {
    return null;
  }
}
