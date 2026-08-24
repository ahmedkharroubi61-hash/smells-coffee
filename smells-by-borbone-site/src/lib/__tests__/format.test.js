import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatPrice,
  getBillTotal,
  getBillCount,
  slugify,
  orderErrorMessage,
  staffTimeAgo,
  fmtDT,
  escapeHtml,
} from "../format.js";

describe("formatPrice", () => {
  it("formats to 3 decimals with DT", () => {
    expect(formatPrice(3.8)).toBe("3.800 DT");
    expect(formatPrice(0)).toBe("0.000 DT");
    expect(formatPrice(12.5)).toBe("12.500 DT");
  });
});

describe("getBillTotal", () => {
  const items = [
    { id: "a", price: 3.8 },
    { id: "b", price: 7 },
  ];
  it("sums price × quantity", () => {
    expect(getBillTotal({ a: 2, b: 1 }, items)).toBeCloseTo(14.6, 5);
  });
  it("is 0 for an empty bill", () => {
    expect(getBillTotal({}, items)).toBe(0);
  });
  it("ignores ids not in the menu (e.g. a deleted item still in the bill)", () => {
    expect(getBillTotal({ a: 1, ghost: 5 }, items)).toBeCloseTo(3.8, 5);
  });
});

describe("getBillCount", () => {
  it("sums quantities", () => {
    expect(getBillCount({ a: 2, b: 3 })).toBe(5);
    expect(getBillCount({})).toBe(0);
  });
});

describe("slugify", () => {
  it("lowercases and strips accents/spaces", () => {
    expect(slugify("Thé à la Menthe", [])).toBe("the-a-la-menthe");
    expect(slugify("Café Crème!", [])).toBe("cafe-creme");
  });
  it("appends -2, -3 … when the slug is taken", () => {
    expect(slugify("Espresso", ["espresso"])).toBe("espresso-2");
    expect(slugify("Espresso", ["espresso", "espresso-2"])).toBe("espresso-3");
  });
  it("falls back to 'article' for a name with no usable characters", () => {
    expect(slugify("!!!", [])).toBe("article");
  });
});

describe("orderErrorMessage", () => {
  it("maps known codes to French messages", () => {
    expect(orderErrorMessage("too_many_pending")).toMatch(/plusieurs commandes/);
    expect(orderErrorMessage("too_fast")).toMatch(/quelques secondes/);
    expect(orderErrorMessage("rate_limited")).toMatch(/patienter une minute/);
    expect(orderErrorMessage("network")).toMatch(/Connexion perdue/);
  });
  it("has a sensible default for unknown codes", () => {
    expect(orderErrorMessage("server_error")).toMatch(/Une erreur est survenue/);
    expect(orderErrorMessage(undefined)).toMatch(/Une erreur est survenue/);
  });
});

describe("staffTimeAgo", () => {
  afterEach(() => vi.useRealTimers());
  it("renders relative minutes in French", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    expect(staffTimeAgo("2026-08-24T12:00:00Z")).toBe("à l'instant");
    expect(staffTimeAgo("2026-08-24T11:59:00Z")).toBe("il y a 1 min");
    expect(staffTimeAgo("2026-08-24T11:45:00Z")).toBe("il y a 15 min");
  });
  it("never shows negative time for a slightly future timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    expect(staffTimeAgo("2026-08-24T12:00:30Z")).toBe("à l'instant");
  });
});

describe("fmtDT", () => {
  it("converts millimes to DT string", () => {
    expect(fmtDT(21500)).toBe("21.500 DT");
    expect(fmtDT(0)).toBe("0.000 DT");
    expect(fmtDT(null)).toBe("0.000 DT");
    expect(fmtDT(undefined)).toBe("0.000 DT");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML-significant characters (XSS protection on printed tickets)", () => {
    expect(escapeHtml('<b>x</b>')).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(escapeHtml(`a & "b" 'c'`)).toBe("a &amp; &quot;b&quot; &#39;c&#39;");
  });
  it("leaves plain text untouched and tolerates null/undefined", () => {
    expect(escapeHtml("Cappuccino")).toBe("Cappuccino");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});
