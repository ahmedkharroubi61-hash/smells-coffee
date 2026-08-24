// SmellS — backend, as a single Supabase Edge Function (Deno).
//
// This replaces the old Express server. Two jobs live here:
//
// 1) MENU PERSISTENCE — the admin panel edits the menu; the static frontend
//    has nowhere durable to save it. This stores the menu in Postgres so edits
//    survive for every visitor.
//
// 2) PAYMENTS (Flouci) — Tunisian gateway, since Stripe doesn't support
//    Tunisian merchants. Never trusts a browser-sent price: re-prices every
//    line from the database, and independently re-verifies each payment with
//    Flouci's verify_payment endpoint before ever reporting success. Card data
//    is entered on Flouci's own hosted page, never here.
//
// Deployed at:  https://<project-ref>.supabase.co/functions/v1/api/...
// Routes are prefixed with the function name ("api") via Hono's basePath —
// that's how Supabase Edge Function routing works.
//
// Required secrets (supabase secrets set ...):
//   ADMIN_PASSWORD       the manager's login password (checked server-side)
//   ADMIN_API_KEY        server-only HMAC key that signs admin session tokens
//   FLOUCI_PUBLIC_KEY    \
//   FLOUCI_PRIVATE_KEY    } payments activate only once all three are set
//   FRONTEND_PUBLIC_URL  /  where Flouci sends the customer back
//   BACKEND_PUBLIC_URL   this function's own base URL, for the webhook
//                        (e.g. https://<ref>.supabase.co/functions/v1/api)
//   FRONTEND_ORIGIN      optional; allowed CORS origin(s), comma-separated
//                        (defaults to * if unset)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { Hono } from "jsr:@hono/hono@^4";
import { cors } from "jsr:@hono/hono@^4/cors";
import { createClient } from "jsr:@supabase/supabase-js@^2";
import * as jose from "npm:jose@^5";
import webpush from "npm:web-push@^3.6.7";
import { defaultMenuItems, type MenuItem } from "./menuData.ts";

const FLOUCI_BASE_URL = "https://developers.flouci.com/api/v2";

const env = (k: string) => Deno.env.get(k);

const flouciConfigured = Boolean(
  env("FLOUCI_PUBLIC_KEY") && env("FLOUCI_PRIVATE_KEY") && env("FRONTEND_PUBLIC_URL"),
);

// Web Push (VAPID). Optional — activates only once the two keys are set. The
// public key is handed to the browser; the private key signs the push.
const VAPID_PUBLIC = env("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = env("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = env("VAPID_SUBJECT") || "mailto:contact@smells-coffee.tn";
const pushConfigured = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushConfigured) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!);
  } catch (e) {
    console.error("vapid-setup error:", e);
  }
}

// Service-role client: bypasses RLS, so it's the ONLY thing that can touch the
// locked-down tables. This key is server-side only and never sent to a browser.
const supabase = createClient(
  env("SUPABASE_URL")!,
  env("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/* ---------------------------------------------------------------- data access */

// The raw stored menu (or defaults). This is what the 86-board reads/writes —
// it must NOT bake in supply-driven blocks.
async function getStoredMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("app_state")
    .select("value")
    .eq("key", "menu")
    .maybeSingle();
  if (error) throw error;
  const value = data?.value;
  if (Array.isArray(value) && value.length > 0) return value as MenuItem[];
  return defaultMenuItems; // nothing saved yet — use the built-in starting menu
}

// The effective menu shown to customers / used for orders: an item is available
// only if its stored flag is on AND no out-of-stock supply is linked to it.
async function getMenuItems(): Promise<MenuItem[]> {
  const base = await getStoredMenuItems();
  const { data: out } = await supabase.from("supplies").select("menu_links").lte("quantity", 0);
  const blocked = new Set<string>();
  for (const s of out ?? []) {
    for (const e of ((s.menu_links as any[]) ?? [])) {
      blocked.add(typeof e === "string" ? e : e.group); // links may be "group" or {group,qty}
    }
  }
  if (blocked.size === 0) return base;
  return base.map((it) => (blocked.has(it.group ?? it.id) ? { ...it, available: false } : it));
}

async function saveMenuItems(items: MenuItem[]): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .upsert(
      { key: "menu", value: items, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}

type PaymentRow = {
  order_id: string;
  payment_id: string;
  status: "pending" | "succeeded" | "failed";
  amount_millimes: number;
  items: unknown;
};

async function createPayment(row: {
  orderId: string;
  paymentId: string;
  amountMillimes: number;
  items: unknown;
}): Promise<void> {
  const { error } = await supabase.from("payments").insert({
    order_id: row.orderId,
    payment_id: row.paymentId,
    status: "pending",
    amount_millimes: row.amountMillimes,
    items: row.items,
  });
  if (error) throw error;
}

async function getPaymentByOrderId(orderId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentRow) ?? null;
}

// Accepts either our order id or Flouci's payment_id, returns our order id.
// Two exact-match lookups instead of a single OR — avoids any string-building
// against externally supplied values.
async function resolveOrderId(candidate: string): Promise<string | null> {
  const byOrder = await supabase
    .from("payments")
    .select("order_id")
    .eq("order_id", candidate)
    .maybeSingle();
  if (byOrder.data?.order_id) return byOrder.data.order_id;
  const byPayment = await supabase
    .from("payments")
    .select("order_id")
    .eq("payment_id", candidate)
    .maybeSingle();
  return byPayment.data?.order_id ?? null;
}

async function setPaymentStatus(orderId: string, status: PaymentRow["status"]): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("order_id", orderId);
  if (error) throw error;
}

/* ------------------------------------------------------------ orders (staff) */

async function createOrder(o: {
  ref: string;
  items: unknown;
  tableNumber: string | null;
  totalMillimes: number;
  paymentMethod: string;
  customerName: string | null;
  customerId: string | null;
  clientKey?: string | null;
}): Promise<{ id: string; ref: string }> {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      ref: o.ref,
      status: "new",
      items: o.items,
      table_number: o.tableNumber,
      total_millimes: o.totalMillimes,
      payment_method: o.paymentMethod,
      customer_name: o.customerName,
      customer_id: o.customerId,
      client_key: o.clientKey ?? null,
    })
    .select("id, ref")
    .single();
  if (error) throw error;
  return data as { id: string; ref: string };
}

// Active orders (everything the kitchen still needs to act on), oldest first.
// Excludes finished ("done") and voided ("cancelled") orders.
async function getActiveOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Orders a staff member completed since `since` (their current-shift log).
async function getStaffShiftOrders(staffId: string, since: string | null) {
  let q = supabase
    .from("orders")
    .select("id, ref, items, total_millimes, table_number, customer_name, payment_method, created_at, updated_at")
    .eq("served_by", staffId)
    .eq("status", "done")
    .eq("returned", false)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (since) q = q.gte("updated_at", since);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Aggregate a shift's orders into a per-product breakdown { label: qty }.
function breakdownOfOrders(orders: any[]): Record<string, number> {
  const b: Record<string, number> = {};
  for (const o of orders) {
    for (const it of o.items ?? []) {
      const label = `${it.name}${it.sizeLabel ? ` (${it.sizeLabel})` : ""}`;
      b[label] = (b[label] ?? 0) + Number(it.quantity ?? 0);
    }
  }
  return b;
}

async function createShiftReport(r: {
  staffId: string;
  staffName: string;
  openedAt: string | null;
  totalMillimes: number;
  ordersCount: number;
  breakdown: Record<string, number>;
}) {
  const { error } = await supabase.from("shift_reports").insert({
    staff_id: r.staffId,
    staff_name: r.staffName,
    opened_at: r.openedAt,
    total_millimes: r.totalMillimes,
    orders_count: r.ordersCount,
    breakdown: r.breakdown,
  });
  if (error) throw error;
}

async function listShiftReports() {
  const { data, error } = await supabase
    .from("shift_reports")
    .select("*")
    .order("closed_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

async function deleteShiftReport(id: string) {
  const { error } = await supabase.from("shift_reports").delete().eq("id", id);
  if (error) throw error;
}

// Manager view: every returned order, most recent first (who returned it, what,
// and why).
async function listReturnedOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, ref, items, total_millimes, table_number, customer_name, served_by_name, return_reason, returned_at, payment_method",
    )
    .eq("returned", true)
    .order("returned_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function getOrderById(id: string) {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateOrderStatus(
  id: string,
  status: string,
  servedBy?: { id: string; name: string },
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (servedBy) {
    patch.served_by = servedBy.id;
    patch.served_by_name = servedBy.name;
  }
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------------- staff */

const STAFF_PUBLIC = "id, name, on_shift, shift_opened_at, shift_sales_millimes, shift_orders_count";

async function listStaff() {
  const { data, error } = await supabase.from("staff").select(STAFF_PUBLIC).order("name");
  if (error) throw error;
  return data ?? [];
}

async function createStaff(name: string, pin: string) {
  const { data, error } = await supabase
    .from("staff")
    .insert({ name, pin_hash: await pinHash(pin) })
    .select(STAFF_PUBLIC)
    .single();
  if (error) throw error;
  return data;
}

async function deleteStaff(id: string) {
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) throw error;
}

async function getStaffById(id: string) {
  const { data, error } = await supabase.from("staff").select(STAFF_PUBLIC).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findStaffByPin(pin: string) {
  const { data, error } = await supabase
    .from("staff")
    .select(STAFF_PUBLIC)
    .eq("pin_hash", await pinHash(pin))
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Start a shift only if none is open (re-entering a PIN mid-shift must not
// reset it). A freshly started shift always begins from zero takings.
async function ensureShiftOpen(id: string) {
  const { error } = await supabase
    .from("staff")
    .update({
      on_shift: true,
      shift_opened_at: new Date().toISOString(),
      shift_sales_millimes: 0,
      shift_orders_count: 0,
    })
    .eq("id", id)
    .eq("on_shift", false);
  if (error) throw error;
}

// Close the shift: caller reads the totals first, then this zeroes them.
async function closeStaffShift(id: string) {
  const { error } = await supabase
    .from("staff")
    .update({ on_shift: false, shift_opened_at: null, shift_sales_millimes: 0, shift_orders_count: 0 })
    .eq("id", id);
  if (error) throw error;
}

// Add an order's total to a staff member's running shift takings.
async function creditStaffShift(id: string, millimes: number) {
  const staff = await getStaffById(id);
  if (!staff) return;
  const { error } = await supabase
    .from("staff")
    .update({
      shift_sales_millimes: (staff.shift_sales_millimes ?? 0) + millimes,
      shift_orders_count: (staff.shift_orders_count ?? 0) + 1,
    })
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------ customer accounts */

const CUSTOMER_PUBLIC = "id, name, phone, email";
const normalizePhone = (raw: string) => (raw || "").replace(/\D/g, "");

// Verify a Google Sign-In identity token (RS256, against Google's public keys).
const googleJWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
async function verifyGoogleIdToken(idToken: string) {
  const clientId = env("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("google_not_configured");
  const { payload } = await jose.jwtVerify(idToken, googleJWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  return payload as { sub: string; email?: string; name?: string };
}

async function findCustomerByGoogleSub(sub: string) {
  const { data, error } = await supabase.from("customers").select(CUSTOMER_PUBLIC).eq("google_sub", sub).maybeSingle();
  if (error) throw error;
  return data;
}

async function findCustomerIdByEmail(email: string) {
  const { data, error } = await supabase.from("customers").select("id").eq("email", email).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function linkGoogleSub(id: string, sub: string) {
  const { error } = await supabase.from("customers").update({ google_sub: sub }).eq("id", id);
  if (error) throw error;
}

async function createGoogleCustomer(sub: string, email: string | null, name: string) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ google_sub: sub, email, name })
    .select(CUSTOMER_PUBLIC)
    .single();
  if (error) throw error;
  return data;
}

async function findCustomerByPhone(phone: string) {
  const { data, error } = await supabase.from("customers").select("*").eq("phone", phone).maybeSingle();
  if (error) throw error;
  return data;
}

async function getCustomerById(id: string) {
  const { data, error } = await supabase.from("customers").select(CUSTOMER_PUBLIC).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createCustomer(name: string, phone: string, password: string) {
  const { saltHex, hashHex } = await hashPassword(password);
  const { data, error } = await supabase
    .from("customers")
    .insert({ name, phone, pass_salt: saltHex, pass_hash: hashHex })
    .select(CUSTOMER_PUBLIC)
    .single();
  if (error) throw error;
  return data;
}

async function getCustomerOrders(customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------ marketing subscribers */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addSubscriber(email: string, name: string | null, source: string | null) {
  // Idempotent: a repeat signup with the same email is a no-op.
  const { error } = await supabase
    .from("subscribers")
    .upsert({ email, name, source }, { onConflict: "email", ignoreDuplicates: true });
  if (error) throw error;
}

async function listSubscribers() {
  const { data, error } = await supabase
    .from("subscribers")
    .select("email, name, source, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------ supplies / inventory */

async function listSupplies() {
  const { data, error } = await supabase
    .from("supplies")
    .select("id, name, unit, quantity, low_threshold, sort_order, menu_links")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function createSupply(s: { name: string; unit: string; quantity: number; lowThreshold: number }) {
  const { data, error } = await supabase
    .from("supplies")
    .insert({ name: s.name, unit: s.unit, quantity: s.quantity, low_threshold: s.lowThreshold })
    .select("id, name, unit, quantity, low_threshold, sort_order, menu_links")
    .single();
  if (error) throw error;
  return data;
}

async function updateSupply(id: string, patch: Record<string, unknown>, deltaQuantity?: number) {
  // Delta adjustments go through an atomic DB function so concurrent barista
  // taps (or orders drawing the item down) can't clobber each other.
  if (typeof deltaQuantity === "number" && deltaQuantity !== 0) {
    const { error } = await supabase.rpc("adjust_supply_quantity", { p_id: id, p_delta: deltaQuantity });
    if (error) throw error;
  }
  if (Object.keys(patch).length === 0) return; // nothing else to change
  const { error } = await supabase.from("supplies").update(patch).eq("id", id);
  if (error) throw error;
}

async function deleteSupply(id: string) {
  const { error } = await supabase.from("supplies").delete().eq("id", id);
  if (error) throw error;
}

// When an order is made, draw its ingredients down from the inventory. Each
// supply→product link carries an amount (qty of the supply per one product);
// a bare "group" string means 1. Runs at most once per order (see `consumed`).
async function consumeSuppliesForOrder(order: any) {
  if (!order || order.consumed) return;
  const menu = await getStoredMenuItems();
  const groupOf = new Map<string, string>();
  for (const m of menu) groupOf.set(m.id, m.group ?? m.id);

  const groupQty: Record<string, number> = {};
  for (const it of order.items ?? []) {
    const g = groupOf.get(it.id) ?? it.id;
    groupQty[g] = (groupQty[g] ?? 0) + Number(it.quantity ?? 0);
  }

  const { data: supplies } = await supabase.from("supplies").select("id, menu_links");
  for (const s of supplies ?? []) {
    let dec = 0;
    for (const e of (s.menu_links as any[]) ?? []) {
      const grp = typeof e === "string" ? e : e.group;
      const amt = typeof e === "string" ? 1 : Number(e.qty) || 1;
      if (groupQty[grp]) dec += amt * groupQty[grp];
    }
    if (dec > 0) {
      await supabase.rpc("adjust_supply_quantity", { p_id: s.id, p_delta: -dec }); // atomic
    }
  }
  await supabase.from("orders").update({ consumed: true }).eq("id", order.id);
}

// Reverse of consumeSuppliesForOrder: put the ingredients an order drew down
// back into stock (used when a completed order is returned).
async function restockSuppliesForOrder(order: any) {
  if (!order) return;
  const menu = await getStoredMenuItems();
  const groupOf = new Map<string, string>();
  for (const m of menu) groupOf.set(m.id, m.group ?? m.id);

  const groupQty: Record<string, number> = {};
  for (const it of order.items ?? []) {
    const g = groupOf.get(it.id) ?? it.id;
    groupQty[g] = (groupQty[g] ?? 0) + Number(it.quantity ?? 0);
  }

  const { data: supplies } = await supabase.from("supplies").select("id, menu_links");
  for (const s of supplies ?? []) {
    let inc = 0;
    for (const e of (s.menu_links as any[]) ?? []) {
      const grp = typeof e === "string" ? e : e.group;
      const amt = typeof e === "string" ? 1 : Number(e.qty) || 1;
      if (groupQty[grp]) inc += amt * groupQty[grp];
    }
    if (inc > 0) {
      await supabase.rpc("adjust_supply_quantity", { p_id: s.id, p_delta: inc }); // atomic
    }
  }
}

// Take a returned order's total back off the staff member's shift tally.
async function reverseStaffShift(id: string, millimes: number) {
  const staff = await getStaffById(id);
  if (!staff) return;
  const { error } = await supabase
    .from("staff")
    .update({
      shift_sales_millimes: Math.max(0, (staff.shift_sales_millimes ?? 0) - millimes),
      shift_orders_count: Math.max(0, (staff.shift_orders_count ?? 0) - 1),
    })
    .eq("id", id);
  if (error) throw error;
}

// Flag an order returned (it keeps status "done", so it stays out of the active
// queue, but leaves the staff member's history and shift report).
async function markOrderReturned(id: string, reason: string) {
  const { error } = await supabase
    .from("orders")
    .update({ returned: true, return_reason: reason, returned_at: new Date().toISOString(), consumed: false })
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------- web push */

// Store (or refresh) a device's push subscription for one order.
async function savePushSubscription(orderId: string, subscription: any) {
  const endpoint = subscription?.endpoint;
  if (!endpoint) return;
  await supabase
    .from("push_subscriptions")
    .upsert({ order_id: orderId, endpoint, subscription }, { onConflict: "order_id,endpoint" });
}

// Push "order ready" to every device subscribed to this order, then clear them
// (a one-shot alert). No-ops silently if push isn't configured.
async function sendOrderReadyPush(order: any) {
  if (!pushConfigured || !order) return;
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("order_id", order.id);
  if (!subs?.length) return;
  const payload = JSON.stringify({
    title: "SmellS ☕",
    body: `Votre commande #${order.ref} est prête ! À récupérer au comptoir.`,
    ref: order.ref,
  });
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload);
    } catch (e: any) {
      console.error("push-send error:", e?.statusCode ?? e); // 404/410 = expired sub
    }
  }
  await supabase.from("push_subscriptions").delete().eq("order_id", order.id);
}

/* ---------------------------------------------- boutique (e-market) */

const BOUTIQUE_COLS = "id, name, description, price, image, category, available, sort_order";

async function listBoutiqueProducts(onlyAvailable: boolean) {
  let q = supabase.from("boutique_products").select(BOUTIQUE_COLS).order("sort_order").order("name");
  if (onlyAvailable) q = q.eq("available", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function createBoutiqueProduct(p: Record<string, unknown>) {
  const { data, error } = await supabase.from("boutique_products").insert(p).select(BOUTIQUE_COLS).single();
  if (error) throw error;
  return data;
}

async function updateBoutiqueProduct(id: string, patch: Record<string, unknown>) {
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("boutique_products").update(patch).eq("id", id);
  if (error) throw error;
}

async function deleteBoutiqueProduct(id: string) {
  const { error } = await supabase.from("boutique_products").delete().eq("id", id);
  if (error) throw error;
}

async function createBoutiqueOrder(o: Record<string, unknown>) {
  const { data, error } = await supabase.from("boutique_orders").insert(o).select("id, ref").single();
  if (error) throw error;
  return data as { id: string; ref: string };
}

async function listBoutiqueOrders() {
  const { data, error } = await supabase
    .from("boutique_orders")
    .select("*")
    .neq("status", "done")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function setBoutiqueOrderStatus(id: string, status: string) {
  const { error } = await supabase
    .from("boutique_orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/* -------------------------------------------------------------------- flouci */

async function flouciFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${FLOUCI_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("FLOUCI_PUBLIC_KEY")}:${env("FLOUCI_PRIVATE_KEY")}`,
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.result?.success === false) {
    throw new Error(`Flouci API error ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

// Re-verify a pending order against Flouci and persist any status change. The
// webhook and the browser redirect are only signals to check — this is the
// single source of truth.
async function reverifyOrder(orderId: string): Promise<PaymentRow | null> {
  const record = await getPaymentByOrderId(orderId);
  if (!record) return null;
  if (record.status === "pending") {
    try {
      const { result } = await flouciFetch(`/verify_payment/${record.payment_id}`);
      let next: PaymentRow["status"] = record.status;
      if (result.status === "SUCCESS") next = "succeeded";
      else if (result.status === "FAILURE" || result.status === "EXPIRED") next = "failed";
      if (next !== record.status) {
        await setPaymentStatus(orderId, next);
        record.status = next;
      }
    } catch (err) {
      console.error("verify_payment error:", err);
    }
  }
  return record;
}

/* -------------------------------------------------------------- rate limiting */

// Best-effort, per-isolate limiter. On Edge Functions each isolate keeps its
// own counters and Supabase may run several, so this deters bursts rather than
// enforcing a hard global cap — good enough to protect our Flouci account and
// menu from casual abuse. A hard global limit would need a shared store.
function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return async (c: any, next: any) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "unknown";
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.reset) {
      hits.set(ip, { count: 1, reset: now + opts.windowMs });
      return await next();
    }
    if (entry.count >= opts.max) return c.json({ error: "rate_limited" }, 429);
    entry.count += 1;
    return await next();
  };
}

function clientIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("cf-connecting-ip") ||
    "unknown"
  );
}

// Smart, DB-backed order anti-spam (reliable across Edge isolates, unlike the
// in-memory limiter). Keyed by a hash of the client IP so no raw IP is stored.
const MAX_ACTIVE_ORDERS_PER_CLIENT = 6; // unfinished orders one device may hold
const MAX_ORDERS_PER_20S = 3; // burst cap
// Returns an error code to block the order, or null to allow it.
async function orderSpamCheck(clientKey: string | null): Promise<string | null> {
  if (!clientKey) return null; // couldn't identify the device — let it through
  const active = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("client_key", clientKey)
    .not("status", "in", "(done,cancelled)");
  if ((active.count ?? 0) >= MAX_ACTIVE_ORDERS_PER_CLIENT) return "too_many_pending";
  const since = new Date(Date.now() - 20_000).toISOString();
  const recent = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("client_key", clientKey)
    .gte("created_at", since);
  if ((recent.count ?? 0) >= MAX_ORDERS_PER_20S) return "too_fast";
  return null;
}

// --- Admin auth (server-side) ---------------------------------------------
// The admin logs in with a password that is checked HERE, against the
// ADMIN_PASSWORD secret — never shipped to the browser. On success we mint a
// short-lived token (HMAC-signed with ADMIN_API_KEY, which stays server-only)
// that the frontend sends on menu writes. Nothing sensitive lives in the JS
// bundle anymore, so opening dev tools reveals nothing useful.
const te = new TextEncoder();
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(env("ADMIN_API_KEY")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, te.encode(payload));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A staff PIN is stored only as this hash, never in the clear.
const pinHash = (pin: string) => hmacHex(`pin:${pin}`);

const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
function fromHex(hex: string): Uint8Array {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return a;
}

// Customer passwords: PBKDF2-SHA256 with a per-user random salt (proper, and
// available in the Edge runtime via Web Crypto). Returns {salt, hash} as hex.
async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", te.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    km,
    256,
  );
  return { saltHex: toHex(salt), hashHex: toHex(new Uint8Array(bits)) };
}

// --- Manager token: "<expiryMillis>.<hmac>" ---
async function signToken(expMs: number): Promise<string> {
  const payload = String(expMs);
  return `${payload}.${await hmacHex(payload)}`;
}

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || Date.now() > exp) return false; // expired or malformed
  const expected = await signToken(exp);
  return timingSafeEqual(token, expected);
}

async function requireAdminToken(c: any, next: any) {
  if (!(await verifyToken(c.req.header("x-admin-token")))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return await next();
}

// --- Staff token: "<staffId>.<expiryMillis>.<hmac>" (uuid has no dots) ---
async function signStaffToken(staffId: string, expMs: number): Promise<string> {
  const payload = `${staffId}.${expMs}`;
  return `${payload}.${await hmacHex(payload)}`;
}

async function verifyStaffToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [staffId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = await hmacHex(`${staffId}.${expStr}`);
  return timingSafeEqual(sig, expected) ? staffId : null;
}

// Accepts either a manager token or a staff token. On a staff token, stashes
// the staff id on the context so handlers can credit that staff.
async function requireStaffOrAdmin(c: any, next: any) {
  const staffId = await verifyStaffToken(c.req.header("x-staff-token"));
  if (staffId) {
    c.set("staffId", staffId);
    return await next();
  }
  if (await verifyToken(c.req.header("x-admin-token"))) return await next();
  return c.json({ error: "unauthorized" }, 401);
}

async function requireStaff(c: any, next: any) {
  const staffId = await verifyStaffToken(c.req.header("x-staff-token"));
  if (!staffId) return c.json({ error: "unauthorized" }, 401);
  c.set("staffId", staffId);
  return await next();
}

// --- Customer token: "<customerId>.<expiryMillis>.<hmac>" ---
async function signCustomerToken(customerId: string, expMs: number): Promise<string> {
  const payload = `${customerId}.${expMs}`;
  return `${payload}.${await hmacHex(payload)}`;
}

async function verifyCustomerToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = await hmacHex(`${customerId}.${expStr}`);
  return timingSafeEqual(sig, expected) ? customerId : null;
}

async function requireCustomer(c: any, next: any) {
  const customerId = await verifyCustomerToken(c.req.header("x-customer-token"));
  if (!customerId) return c.json({ error: "unauthorized" }, 401);
  c.set("customerId", customerId);
  return await next();
}

/* ----------------------------------------------------------------------- app */

// basePath must equal the function name — Supabase routes /functions/v1/api/*
// to this function with the "/api" prefix intact.
const app = new Hono<{ Variables: { staffId: string; customerId: string } }>().basePath("/api");

// Allowed browser origins. FRONTEND_ORIGIN may be a single origin or a
// comma-separated list (e.g. the live site + localhost for dev). Unset → "*"
// (open), which is fine for early testing but should be set in production.
const corsOrigin = (() => {
  const raw = env("FRONTEND_ORIGIN");
  if (!raw) return "*";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length <= 1 ? (list[0] ?? "*") : list;
})();

app.use(
  "*",
  cors({
    origin: corsOrigin,
    allowHeaders: ["content-type", "x-admin-token", "x-staff-token", "x-customer-token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Security headers on every API response. The API only ever returns JSON, so
// these are safe: block MIME sniffing, forbid framing the API, never cache
// (responses can contain order/staff data), and don't leak the referrer.
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "no-referrer");
  c.res.headers.set("Cache-Control", "no-store");
});

// --- Admin login: password in, short-lived token out ---
app.post("/admin-login", rateLimit({ windowMs: 60_000, max: 5 }), async (c) => {
  const expected = env("ADMIN_PASSWORD");
  if (!expected) return c.json({ error: "admin_login_not_configured" }, 503);
  const body = await c.req.json().catch(() => ({}));
  const password = body?.password;
  if (typeof password !== "string" || !timingSafeEqual(password, expected)) {
    return c.json({ error: "invalid_password" }, 401);
  }
  const token = await signToken(Date.now() + TOKEN_TTL_MS);
  return c.json({ token, expiresInMs: TOKEN_TTL_MS });
});

// --- Menu persistence ---
// ?stored=1 returns raw stored availability (the barista 86-board uses this, so
// supply-driven blocks don't fight the manual toggle). Default is the effective
// menu customers see (stored availability minus out-of-stock ingredients).
app.get("/menu", async (c) => {
  try {
    const items = c.req.query("stored") === "1" ? await getStoredMenuItems() : await getMenuItems();
    return c.json({ items });
  } catch (err) {
    console.error("get-menu error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.put("/menu", rateLimit({ windowMs: 60_000, max: 20 }), requireAdminToken, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const items = body?.items;
    if (!Array.isArray(items)) return c.json({ error: "invalid_items" }, 400);
    for (const item of items) {
      if (!item.id || !item.name || !item.category || typeof item.price !== "number" || item.price < 0) {
        return c.json({ error: "invalid_item", item }, 400);
      }
    }
    await saveMenuItems(items);
    return c.json({ ok: true });
  } catch (err) {
    console.error("save-menu error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Stock toggle: staff (or manager) flip menu items in/out of stock during
// service. Scoped to `available` only — no price/name changes. Accepts one id
// or a batch of ids (e.g. all sizes of a product) so a whole product flips at
// once with a single save.
app.patch("/menu/availability", requireStaffOrAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((x: unknown) => typeof x === "string")
      : typeof body?.id === "string"
      ? [body.id]
      : [];
    const available = body?.available;
    if (ids.length === 0 || typeof available !== "boolean") return c.json({ error: "invalid" }, 400);

    const menu = await getStoredMenuItems();
    const idset = new Set(ids);
    let changed = 0;
    const next = menu.map((m) => {
      if (idset.has(m.id) && m.available !== available) {
        changed++;
        return { ...m, available };
      }
      return m;
    });
    if (changed > 0) await saveMenuItems(next);
    return c.json({ ok: true, changed });
  } catch (err) {
    console.error("availability error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// --- Payments (Flouci) ---
app.post("/create-payment", rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
  if (!flouciConfigured) return c.json({ error: "payments_not_configured" }, 503);
  try {
    const body = await c.req.json().catch(() => ({}));
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) return c.json({ error: "no_items" }, 400);

    const currentMenu = await getMenuItems();
    let amountTnd = 0;
    for (const line of items) {
      const product = currentMenu.find((p) => p.id === line.id);
      if (!product || !product.available) {
        return c.json({ error: "invalid_product", productId: line.id }, 400);
      }
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 50) {
        return c.json({ error: "invalid_quantity", productId: line.id }, 400);
      }
      amountTnd += product.price * quantity;
    }

    // Flouci wants millimes (1 TND = 1000 millimes).
    const amountMillimes = Math.round(amountTnd * 1000);
    if (amountMillimes <= 0) return c.json({ error: "invalid_amount" }, 400);

    const orderId = `sb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base = env("FRONTEND_PUBLIC_URL")!.replace(/\/$/, "");
    const backend = env("BACKEND_PUBLIC_URL")?.replace(/\/$/, "");

    const flouciResponse = await flouciFetch("/generate_payment", {
      method: "POST",
      body: JSON.stringify({
        amount: String(amountMillimes),
        developer_tracking_id: orderId,
        accept_card: true,
        success_link: `${base}/?order=${orderId}&status=success`,
        fail_link: `${base}/?order=${orderId}&status=fail`,
        webhook: backend ? `${backend}/flouci-webhook` : undefined,
      }),
    });

    const paymentId = flouciResponse.result.payment_id;
    await createPayment({ orderId, paymentId, amountMillimes, items });

    return c.json({ payUrl: flouciResponse.result.link, orderId });
  } catch (err) {
    console.error("create-payment error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Flouci calls this server-to-server as a backstop. Accept the identifier from
// wherever it appears, then re-verify with Flouci — never trust it directly.
app.all("/flouci-webhook", async (c) => {
  let jsonBody: any = {};
  try {
    jsonBody = await c.req.json();
  } catch {
    // not JSON (query-only or form) — fine
  }
  const candidate =
    c.req.query("payment_id") ||
    jsonBody?.payment_id ||
    c.req.query("order") ||
    jsonBody?.developer_tracking_id;
  if (candidate) {
    const orderId = await resolveOrderId(String(candidate));
    if (orderId) await reverifyOrder(orderId);
  }
  return c.text("ok");
});

// Public: a customer checks their own order's status (by its uuid) so their
// browser can notify them when it's "ready". The uuid is unguessable.
app.get("/order-status/:id", async (c) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("status, ref")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "not_found" }, 404);
    return c.json({ status: data.status, ref: data.ref });
  } catch (err) {
    console.error("order-status error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Public: the VAPID public key a browser needs to subscribe (null if push off).
app.get("/push/public-key", (c) => c.json({ key: pushConfigured ? VAPID_PUBLIC : null }));

// Public: subscribe a device to be pushed when its order is ready. Tied to the
// order uuid (unguessable), so only that customer's device gets the alert.
app.post("/push/subscribe", rateLimit({ windowMs: 60_000, max: 30 }), async (c) => {
  try {
    if (!pushConfigured) return c.json({ error: "push_not_configured" }, 503);
    const body = await c.req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    const subscription = body?.subscription;
    if (!orderId || !subscription?.endpoint) return c.json({ error: "invalid" }, 400);
    const order = await getOrderById(orderId);
    if (!order) return c.json({ error: "not_found" }, 404);
    await savePushSubscription(orderId, subscription);
    return c.json({ ok: true });
  } catch (err) {
    console.error("push-subscribe error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/payment-status/:orderId", async (c) => {
  try {
    const record = await reverifyOrder(c.req.param("orderId"));
    if (!record) return c.json({ error: "not_found" }, 404);
    return c.json({ status: record.status, amountMillimes: record.amount_millimes });
  } catch (err) {
    console.error("payment-status error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/* --------------------------------------------------- orders (staff screen) */

// Customer places an order (public). Reprices from the DB and stores readable
// line items so the staff screen doesn't need the menu to render.
app.post("/order", rateLimit({ windowMs: 60_000, max: 20 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const items = body?.items;
    const tableNumber = body?.tableNumber != null ? String(body.tableNumber) : null;
    const paymentMethod = body?.paymentMethod === "online" ? "online" : "counter";
    let customerName =
      typeof body?.customerName === "string" && body.customerName.trim()
        ? body.customerName.trim().slice(0, 60)
        : null;
    // If a logged-in customer placed this, link it to their account.
    const customerId = await verifyCustomerToken(c.req.header("x-customer-token"));
    if (customerId && !customerName) {
      const cust = await getCustomerById(customerId);
      if (cust) customerName = cust.name;
    }
    if (!Array.isArray(items) || items.length === 0) return c.json({ error: "no_items" }, 400);
    if (items.length > 40) return c.json({ error: "too_many_items" }, 400); // sanity cap

    // Smart anti-spam: block a device that's flooding orders. A logged-in
    // customer is trusted (has an account), so only guests are checked.
    const clientKey = customerId ? null : clientIp(c) === "unknown" ? null : await hmacHex(`ip:${clientIp(c)}`);
    const spam = await orderSpamCheck(clientKey);
    if (spam) return c.json({ error: spam }, 429);

    const menu = await getMenuItems();
    let totalMillimes = 0;
    let totalQty = 0;
    const enriched: unknown[] = [];
    for (const line of items) {
      const p = menu.find((m) => m.id === line.id);
      if (!p || !p.available) return c.json({ error: "invalid_product", productId: line.id }, 400);
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty <= 0 || qty > 50) {
        return c.json({ error: "invalid_quantity", productId: line.id }, 400);
      }
      totalQty += qty;
      totalMillimes += Math.round(p.price * 1000) * qty;
      enriched.push({ id: p.id, name: p.name, sizeLabel: p.sizeLabel ?? null, quantity: qty, price: p.price });
    }
    if (totalQty > 200) return c.json({ error: "order_too_large" }, 400); // sanity cap
    if (totalMillimes <= 0) return c.json({ error: "invalid_amount" }, 400);

    const ref = String(Math.floor(Math.random() * 9000) + 1000); // 4-digit call-out code
    const order = await createOrder({
      ref,
      items: enriched,
      tableNumber,
      totalMillimes,
      paymentMethod,
      customerName,
      customerId,
      clientKey,
    });
    return c.json({ orderId: order.id, ref });
  } catch (err) {
    console.error("create-order error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff or manager: list active orders.
app.get("/orders", requireStaffOrAdmin, async (c) => {
  try {
    return c.json({ orders: await getActiveOrders() });
  } catch (err) {
    console.error("get-orders error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff or manager: advance an order (new → preparing → ready → done). When a
// staff member marks it done, the order's total is credited to their shift.
app.patch("/orders/:id", requireStaffOrAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const status = body?.status;
    if (!["new", "preparing", "ready", "done", "cancelled"].includes(status)) {
      return c.json({ error: "invalid_status" }, 400);
    }
    const orderId = c.req.param("id");
    const staffId = c.get("staffId") as string | undefined;
    const order = await getOrderById(orderId);

    // Cancelling voids the order: NO sale credit, NO ready-push. If it had
    // already been made (consumed), the ingredients go back to inventory.
    // Idempotent — a second cancel won't restock twice.
    if (status === "cancelled") {
      if (order && order.status !== "cancelled") {
        if (order.consumed) await restockSuppliesForOrder(order);
        await updateOrderStatus(orderId, "cancelled");
      }
      return c.json({ ok: true });
    }

    // Draw ingredients down from inventory the first time the drink is made
    // (reaches "ready" or "done"). consumeSuppliesForOrder is a no-op if already done.
    if (order && (status === "ready" || status === "done")) {
      await consumeSuppliesForOrder(order);
    }

    // Push "order ready" to the customer's device(s) the first time it lands on
    // ready/done — this is what reaches a locked iPhone (installed PWA).
    if (order && (status === "ready" || status === "done") && order.status !== "ready" && order.status !== "done") {
      await sendOrderReadyPush(order);
    }

    // Credit the staff on the first transition into "done", never twice.
    if (status === "done" && staffId && order && order.status !== "done") {
      const staff = await getStaffById(staffId);
      await updateOrderStatus(orderId, status, staff ? { id: staff.id, name: staff.name } : undefined);
      await creditStaffShift(staffId, order.total_millimes ?? 0);
      return c.json({ ok: true });
    }
    await updateOrderStatus(orderId, status);
    return c.json({ ok: true });
  } catch (err) {
    console.error("update-order error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: return one of their own completed orders, with a reason. Reverses the
// shift credit, restocks the ingredients, and drops it from their history.
app.post("/orders/:id/return", requireStaff, async (c) => {
  try {
    const staffId = c.get("staffId") as string;
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 200) : "";
    if (!reason) return c.json({ error: "reason_required" }, 400);
    const order = await getOrderById(c.req.param("id"));
    if (!order) return c.json({ error: "not_found" }, 404);
    if (order.served_by !== staffId) return c.json({ error: "forbidden" }, 403);
    if (order.status !== "done" || order.returned) return c.json({ error: "not_returnable" }, 409);
    if (order.consumed) await restockSuppliesForOrder(order);
    await reverseStaffShift(staffId, order.total_millimes ?? 0);
    await markOrderReturned(order.id, reason);
    return c.json({ ok: true });
  } catch (err) {
    console.error("return-order error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/* -------------------------------------------------------- staff & shifts */

// Manager: list staff with their live shift state + takings.
app.get("/staff", requireAdminToken, async (c) => {
  try {
    return c.json({ staff: await listStaff() });
  } catch (err) {
    console.error("list-staff error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager: add a staff member (name + 4-digit PIN).
app.post("/staff", requireAdminToken, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!name) return c.json({ error: "invalid_name" }, 400);
    if (!/^\d{4}$/.test(pin)) return c.json({ error: "invalid_pin" }, 400); // exactly 4 digits
    const existing = await findStaffByPin(pin);
    if (existing) return c.json({ error: "pin_taken" }, 409);
    return c.json({ staff: await createStaff(name, pin) });
  } catch (err) {
    console.error("create-staff error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager: remove a staff member.
app.delete("/staff/:id", requireAdminToken, async (c) => {
  try {
    await deleteStaff(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    console.error("delete-staff error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: log in with a PIN. Clocks them in (starts a shift if none is open),
// and returns a staff token + their current state.
app.post("/staff/login", rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!/^\d{4}$/.test(pin)) return c.json({ error: "invalid_pin" }, 400);
    const staff = await findStaffByPin(pin);
    if (!staff) return c.json({ error: "invalid_pin" }, 401);
    await ensureShiftOpen(staff.id);
    const token = await signStaffToken(staff.id, Date.now() + TOKEN_TTL_MS);
    const fresh = await getStaffById(staff.id);
    return c.json({ token, staff: fresh });
  } catch (err) {
    console.error("staff-login error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: refresh own state (live shift total).
app.get("/staff/me", requireStaff, async (c) => {
  try {
    const staff = await getStaffById(c.get("staffId") as string);
    if (!staff) return c.json({ error: "not_found" }, 404);
    return c.json({ staff });
  } catch (err) {
    console.error("staff-me error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: who else is on shift (names + on/off only — no PINs, no takings).
app.get("/staff/roster", requireStaff, async (c) => {
  try {
    const roster = (await listStaff()).map((s: any) => ({ id: s.id, name: s.name, on_shift: s.on_shift }));
    return c.json({ roster });
  } catch (err) {
    console.error("roster error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: their completed-order history for the CURRENT shift (resets on close).
app.get("/staff/history", requireStaff, async (c) => {
  try {
    const staff = await getStaffById(c.get("staffId") as string);
    const orders = staff?.on_shift ? await getStaffShiftOrders(staff.id, staff.shift_opened_at) : [];
    return c.json({ orders });
  } catch (err) {
    console.error("staff-history error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Staff: close the shift — returns the shift's totals, then resets them to zero.
app.post("/staff/close-shift", requireStaff, async (c) => {
  try {
    const id = c.get("staffId") as string;
    const staff = await getStaffById(id);
    if (!staff) return c.json({ error: "not_found" }, 404);
    const orders = await getStaffShiftOrders(id, staff.shift_opened_at);
    const breakdown = breakdownOfOrders(orders);
    const summary = {
      salesMillimes: staff.shift_sales_millimes ?? 0,
      ordersCount: staff.shift_orders_count ?? 0,
    };
    await createShiftReport({
      staffId: id,
      staffName: staff.name,
      openedAt: staff.shift_opened_at,
      totalMillimes: summary.salesMillimes,
      ordersCount: summary.ordersCount,
      breakdown,
    });
    await closeStaffShift(id);
    return c.json({ ok: true, summary, breakdown });
  } catch (err) {
    console.error("close-shift error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager: end-of-shift reports (per staff — total, count, product breakdown).
app.get("/shift-reports", requireAdminToken, async (c) => {
  try {
    return c.json({ reports: await listShiftReports() });
  } catch (err) {
    console.error("shift-reports error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.delete("/shift-reports/:id", requireAdminToken, async (c) => {
  try {
    await deleteShiftReport(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    console.error("delete-shift-report error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager: list all returned orders (with reason + who served them).
app.get("/returns", requireAdminToken, async (c) => {
  try {
    return c.json({ returns: await listReturnedOrders() });
  } catch (err) {
    console.error("returns error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/* ----------------------------------------------------- customer accounts */

app.post("/customer/signup", rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    const phone = normalizePhone(body?.phone);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!name) return c.json({ error: "invalid_name" }, 400);
    if (phone.length < 8 || phone.length > 15) return c.json({ error: "invalid_phone" }, 400);
    if (password.length < 6) return c.json({ error: "weak_password" }, 400);
    if (await findCustomerByPhone(phone)) return c.json({ error: "phone_taken" }, 409);
    const customer = await createCustomer(name, phone, password);
    const token = await signCustomerToken(customer.id, Date.now() + TOKEN_TTL_MS);
    return c.json({ token, customer });
  } catch (err) {
    console.error("customer-signup error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.post("/customer/login", rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone);
    const password = typeof body?.password === "string" ? body.password : "";
    const row = await findCustomerByPhone(phone);
    if (!row) return c.json({ error: "invalid_credentials" }, 401);
    const { hashHex } = await hashPassword(password, row.pass_salt);
    if (!timingSafeEqual(hashHex, row.pass_hash)) return c.json({ error: "invalid_credentials" }, 401);
    const token = await signCustomerToken(row.id, Date.now() + TOKEN_TTL_MS);
    return c.json({ token, customer: { id: row.id, name: row.name, phone: row.phone } });
  } catch (err) {
    console.error("customer-login error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Sign in with Google: verify the identity token, then link or create the
// customer and issue our own session token.
app.post("/customer/google", rateLimit({ windowMs: 60_000, max: 20 }), async (c) => {
  try {
    if (!env("GOOGLE_CLIENT_ID")) return c.json({ error: "google_not_configured" }, 503);
    const body = await c.req.json().catch(() => ({}));
    const idToken = body?.idToken;
    if (typeof idToken !== "string" || !idToken) return c.json({ error: "invalid_token" }, 400);

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch {
      return c.json({ error: "invalid_token" }, 401);
    }

    const sub = String(payload.sub);
    const email = payload.email ? String(payload.email) : null;
    const name = payload.name ? String(payload.name) : email || "Client";

    let customer = await findCustomerByGoogleSub(sub);
    if (!customer && email) {
      const existingId = await findCustomerIdByEmail(email);
      if (existingId) {
        await linkGoogleSub(existingId, sub);
        customer = await getCustomerById(existingId);
      }
    }
    if (!customer) customer = await createGoogleCustomer(sub, email, name);

    const token = await signCustomerToken(customer.id, Date.now() + TOKEN_TTL_MS);
    return c.json({ token, customer });
  } catch (err) {
    console.error("customer-google error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/customer/me", requireCustomer, async (c) => {
  try {
    const customer = await getCustomerById(c.get("customerId") as string);
    if (!customer) return c.json({ error: "not_found" }, 404);
    return c.json({ customer });
  } catch (err) {
    console.error("customer-me error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/customer/orders", requireCustomer, async (c) => {
  try {
    return c.json({ orders: await getCustomerOrders(c.get("customerId") as string) });
  } catch (err) {
    console.error("customer-orders error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Public front-end config (the Google client id is public by design).
app.get("/config", (c) =>
  c.json({ googleClientId: env("GOOGLE_CLIENT_ID") ?? null, paymentsEnabled: flouciConfigured }));

// Marketing: join the email list (public). Manager: list them.
app.post("/subscribe", rateLimit({ windowMs: 60_000, max: 15 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : null;
    const source = typeof body?.source === "string" ? body.source.slice(0, 20) : null;
    if (!EMAIL_RE.test(email) || email.length > 120) return c.json({ error: "invalid_email" }, 400);
    await addSubscriber(email, name, source);
    return c.json({ ok: true });
  } catch (err) {
    console.error("subscribe error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/subscribers", requireAdminToken, async (c) => {
  try {
    return c.json({ subscribers: await listSubscribers() });
  } catch (err) {
    console.error("list-subscribers error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/* ------------------------------------------------ supplies / inventory */

// Baristas and the owner both read the inventory.
app.get("/supplies", requireStaffOrAdmin, async (c) => {
  try {
    return c.json({ supplies: await listSupplies() });
  } catch (err) {
    console.error("list-supplies error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Owner adds a supply line.
app.post("/supplies", requireAdminToken, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
    const unit = typeof body?.unit === "string" && body.unit.trim() ? body.unit.trim().slice(0, 20) : "unité";
    const quantity = Number(body?.quantity);
    const lowThreshold = Number(body?.lowThreshold);
    if (!name) return c.json({ error: "invalid_name" }, 400);
    return c.json({
      supply: await createSupply({
        name,
        unit,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        lowThreshold: Number.isFinite(lowThreshold) ? lowThreshold : 0,
      }),
    });
  } catch (err) {
    console.error("create-supply error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Baristas adjust counts (deltaQuantity); owner can also edit name/unit/threshold.
app.patch("/supplies/:id", requireStaffOrAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 40);
    if (typeof body?.unit === "string") patch.unit = body.unit.trim().slice(0, 20);
    if (Array.isArray(body?.menuLinks)) {
      // Links are {group, qty} objects; tolerate legacy bare-string entries.
      patch.menu_links = body.menuLinks
        .map((x: any) => {
          if (typeof x === "string") return { group: x, qty: 1 };
          if (x && typeof x.group === "string") return { group: x.group, qty: Number(x.qty) || 1 };
          return null;
        })
        .filter(Boolean);
    }
    if (Number.isFinite(Number(body?.lowThreshold))) patch.low_threshold = Number(body.lowThreshold);
    if (body?.quantity != null && Number.isFinite(Number(body.quantity))) {
      patch.quantity = Math.max(0, Number(body.quantity));
    }
    const delta = body?.deltaQuantity != null ? Number(body.deltaQuantity) : undefined;
    await updateSupply(c.req.param("id"), patch, Number.isFinite(delta as number) ? delta : undefined);
    return c.json({ ok: true });
  } catch (err) {
    console.error("update-supply error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.delete("/supplies/:id", requireAdminToken, async (c) => {
  try {
    await deleteSupply(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    console.error("delete-supply error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

/* ---------------------------------------------- boutique (e-market) */

// Storefront: available products (public).
app.get("/boutique/products", async (c) => {
  try {
    return c.json({ products: await listBoutiqueProducts(true) });
  } catch (err) {
    console.error("boutique-products error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Place a boutique order (public). Reprices from the DB; pay on delivery/pickup.
app.post("/boutique/order", rateLimit({ windowMs: 60_000, max: 15 }), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const items = body?.items;
    const fulfillment = body?.fulfillment === "delivery" ? "delivery" : "pickup";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 30) : "";
    const address =
      fulfillment === "delivery" && typeof body?.address === "string" ? body.address.trim().slice(0, 200) : null;
    if (!Array.isArray(items) || items.length === 0) return c.json({ error: "no_items" }, 400);
    if (!name || !phone) return c.json({ error: "missing_contact" }, 400);
    if (fulfillment === "delivery" && !address) return c.json({ error: "missing_address" }, 400);

    const catalog = await listBoutiqueProducts(true);
    let totalMillimes = 0;
    const enriched: unknown[] = [];
    for (const line of items) {
      const p = catalog.find((x: any) => x.id === line.id);
      if (!p) return c.json({ error: "invalid_product", productId: line.id }, 400);
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
        return c.json({ error: "invalid_quantity", productId: line.id }, 400);
      }
      totalMillimes += Math.round(Number(p.price) * 1000) * qty;
      enriched.push({ id: p.id, name: p.name, price: Number(p.price), quantity: qty });
    }
    if (totalMillimes <= 0) return c.json({ error: "invalid_amount" }, 400);

    const ref = `B${Math.floor(Math.random() * 9000) + 1000}`;
    const order = await createBoutiqueOrder({
      ref,
      items: enriched,
      total_millimes: totalMillimes,
      fulfillment,
      customer_name: name,
      customer_phone: phone,
      address,
    });
    return c.json({ orderId: order.id, ref });
  } catch (err) {
    console.error("boutique-order error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager: manage the catalogue.
app.get("/boutique/products/all", requireAdminToken, async (c) => {
  try {
    return c.json({ products: await listBoutiqueProducts(false) });
  } catch (err) {
    console.error("boutique-all error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.post("/boutique/products", requireAdminToken, async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const name = typeof b?.name === "string" ? b.name.trim().slice(0, 80) : "";
    if (!name) return c.json({ error: "invalid_name" }, 400);
    const product = await createBoutiqueProduct({
      name,
      description: typeof b?.description === "string" ? b.description.slice(0, 300) : null,
      price: Number.isFinite(Number(b?.price)) ? Number(b.price) : 0,
      image: typeof b?.image === "string" && b.image.trim() ? b.image.trim() : null,
      category: typeof b?.category === "string" && b.category.trim() ? b.category.trim().slice(0, 40) : "Boutique",
      available: b?.available !== false,
    });
    return c.json({ product });
  } catch (err) {
    console.error("boutique-create error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.patch("/boutique/products/:id", requireAdminToken, async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof b?.name === "string") patch.name = b.name.trim().slice(0, 80);
    if (typeof b?.description === "string") patch.description = b.description.slice(0, 300);
    if (Number.isFinite(Number(b?.price))) patch.price = Number(b.price);
    if (typeof b?.image === "string") patch.image = b.image.trim() || null;
    if (typeof b?.category === "string") patch.category = b.category.trim().slice(0, 40);
    if (typeof b?.available === "boolean") patch.available = b.available;
    await updateBoutiqueProduct(c.req.param("id"), patch);
    return c.json({ ok: true });
  } catch (err) {
    console.error("boutique-update error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.delete("/boutique/products/:id", requireAdminToken, async (c) => {
  try {
    await deleteBoutiqueProduct(c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    console.error("boutique-delete error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

// Manager / staff: boutique orders to fulfil.
app.get("/boutique/orders", requireStaffOrAdmin, async (c) => {
  try {
    return c.json({ orders: await listBoutiqueOrders() });
  } catch (err) {
    console.error("boutique-orders error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.patch("/boutique/orders/:id", requireStaffOrAdmin, async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const status = b?.status;
    if (!["new", "preparing", "ready", "done"].includes(status)) return c.json({ error: "invalid_status" }, 400);
    await setBoutiqueOrderStatus(c.req.param("id"), status);
    return c.json({ ok: true });
  } catch (err) {
    console.error("boutique-order-update error:", err);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/health", (c) => c.json({ ok: true, flouciConfigured }));

Deno.serve(app.fetch);
