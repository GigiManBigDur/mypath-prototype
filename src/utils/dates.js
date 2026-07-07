// Illustrative academic-year dates, represented as { month, day } (month 1-indexed) with no
// explicit year — the year is inferred from the academic calendar: Aug–Dec falls in the first
// year of the plan, Jan–Jun falls in the second. This lets every part of the app describe dates
// without committing to a real calendar year, while still supporting real date arithmetic.

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BASE_YEAR = 2024; // Aug–Dec uses this year, Jan–Jun uses BASE_YEAR + 1

export function formatShortDate({ month, day }) {
  return `${MONTH_ABBR[month - 1]} ${day}`;
}

export function toJsDate({ month, day }) {
  const year = month >= 8 ? BASE_YEAR : BASE_YEAR + 1;
  return new Date(year, month - 1, day);
}

export function addDays({ month, day }, n) {
  const d = toJsDate({ month, day });
  d.setDate(d.getDate() + n);
  return { month: d.getMonth() + 1, day: d.getDate() };
}

export function daysBetween(a, b) {
  return Math.round((toJsDate(a).getTime() - toJsDate(b).getTime()) / 86_400_000);
}

// The plan's visible timeline: bottom of the roadmap canvas to the top.
export const TIMELINE_START = { month: 8, day: 15 };
export const TIMELINE_END = { month: 6, day: 1 };

// Where a date falls between TIMELINE_START and TIMELINE_END, as a 0–1 fraction. Clamped so an
// out-of-range date still renders at an edge instead of off-canvas.
export function dateFraction(date) {
  const start = toJsDate(TIMELINE_START).getTime();
  const end = toJsDate(TIMELINE_END).getTime();
  const t = toJsDate(date).getTime();
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}
