// Roll daily income rows ({ date: "YYYY-MM-DD", totalMillimes, ordersCount })
// into per-month buckets and stats for the owner's analytics screen.

export function monthlyBreakdown(days) {
  const byMonth = {};
  for (const d of days || []) {
    const k = d.date.slice(0, 7); // "YYYY-MM"
    if (!byMonth[k]) byMonth[k] = { key: k, total: 0, orders: 0, days: [] };
    byMonth[k].days.push(d);
    byMonth[k].total += d.totalMillimes;
    byMonth[k].orders += d.ordersCount;
  }
  return byMonth;
}

// Best day, worst (lowest active) day, and average per active day for a month.
export function monthStats(month) {
  if (!month || !month.days.length) return { best: null, worst: null, avgDay: 0 };
  const best = month.days.reduce((a, b) => (b.totalMillimes > a.totalMillimes ? b : a));
  const worst = month.days.reduce((a, b) => (b.totalMillimes < a.totalMillimes ? b : a));
  return { best, worst, avgDay: month.total / month.days.length };
}

// Average monthly total across all months.
export function overallMonthlyAverage(byMonth) {
  const totals = Object.values(byMonth).map((m) => m.total);
  return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
}
