import { describe, it, expect } from "vitest";
import {
  monthlyBreakdown, monthStats, overallMonthlyAverage,
  yearlyBreakdown, yearStats, overallYearlyAverage,
} from "../analytics.js";

const days = [
  { date: "2026-07-10", totalMillimes: 100000, ordersCount: 10 },
  { date: "2026-07-20", totalMillimes: 300000, ordersCount: 25 },
  { date: "2026-08-01", totalMillimes: 50000, ordersCount: 5 },
  { date: "2026-08-15", totalMillimes: 250000, ordersCount: 20 },
  { date: "2026-08-28", totalMillimes: 150000, ordersCount: 12 },
];

// Spans two years for the yearly rollups.
const multiYear = [
  { date: "2025-11-05", totalMillimes: 100000, ordersCount: 8 },
  { date: "2025-12-20", totalMillimes: 300000, ordersCount: 22 }, // 2025 total 400000
  { date: "2026-07-20", totalMillimes: 300000, ordersCount: 25 },
  { date: "2026-08-15", totalMillimes: 250000, ordersCount: 20 },
  { date: "2026-08-28", totalMillimes: 150000, ordersCount: 12 }, // 2026 total 700000
];

describe("monthlyBreakdown", () => {
  const bm = monthlyBreakdown(days);
  it("groups days into YYYY-MM buckets", () => {
    expect(Object.keys(bm).sort()).toEqual(["2026-07", "2026-08"]);
  });
  it("sums totals and orders per month", () => {
    expect(bm["2026-07"].total).toBe(400000);
    expect(bm["2026-07"].orders).toBe(35);
    expect(bm["2026-08"].total).toBe(450000);
    expect(bm["2026-08"].days).toHaveLength(3);
  });
  it("handles empty/undefined input", () => {
    expect(monthlyBreakdown([])).toEqual({});
    expect(monthlyBreakdown(undefined)).toEqual({});
  });
});

describe("monthStats", () => {
  const bm = monthlyBreakdown(days);
  it("finds best day, worst day, and daily average", () => {
    const s = monthStats(bm["2026-08"]);
    expect(s.best.date).toBe("2026-08-15"); // 250000 is the highest
    expect(s.worst.date).toBe("2026-08-01"); // 50000 is the lowest
    expect(s.avgDay).toBe(150000); // 450000 / 3 days
  });
  it("returns nulls for an empty month", () => {
    expect(monthStats(null)).toEqual({ best: null, worst: null, avgDay: 0 });
    expect(monthStats({ days: [], total: 0 })).toEqual({ best: null, worst: null, avgDay: 0 });
  });
});

describe("overallMonthlyAverage", () => {
  it("averages the monthly totals", () => {
    const bm = monthlyBreakdown(days);
    expect(overallMonthlyAverage(bm)).toBe(425000); // (400000 + 450000) / 2
  });
  it("is 0 with no data", () => {
    expect(overallMonthlyAverage({})).toBe(0);
  });
});

describe("yearlyBreakdown", () => {
  const by = yearlyBreakdown(monthlyBreakdown(multiYear));
  it("groups months into YYYY buckets with totals", () => {
    expect(Object.keys(by).sort()).toEqual(["2025", "2026"]);
    expect(by["2025"].total).toBe(400000);
    expect(by["2026"].total).toBe(700000);
    expect(by["2026"].months).toHaveLength(2); // 2026-07 and 2026-08
  });
});

describe("yearStats", () => {
  const by = yearlyBreakdown(monthlyBreakdown(multiYear));
  it("finds best month, worst month, and monthly average for a year", () => {
    const s = yearStats(by["2026"]);
    expect(s.best.key).toBe("2026-08"); // 400000 (250k+150k) > 2026-07 300000
    expect(s.worst.key).toBe("2026-07");
    expect(s.avgMonth).toBe(350000); // 700000 / 2 months
  });
  it("returns nulls for an empty year", () => {
    expect(yearStats(null)).toEqual({ best: null, worst: null, avgMonth: 0 });
  });
});

describe("overallYearlyAverage", () => {
  it("averages the yearly totals", () => {
    const by = yearlyBreakdown(monthlyBreakdown(multiYear));
    expect(overallYearlyAverage(by)).toBe(550000); // (400000 + 700000) / 2
  });
  it("is 0 with no data", () => {
    expect(overallYearlyAverage({})).toBe(0);
  });
});
