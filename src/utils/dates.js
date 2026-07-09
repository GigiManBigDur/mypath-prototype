// Two layers of dates:
//
// 1. Stored/template dates — { month, day, yearOffset? } (1-indexed month), used in data
//    files. No explicit real year; interpreted as "N days after Aug 15" on an implied
//    academic-year template, wrapping Jan–Jun into the following year. This keeps data files
//    human-readable ("Sep 8") without committing to a real calendar year. `yearOffset` (default
//    0) shifts that whole template year forward by N years — used for multi-year plans, where
//    e.g. a Freshman-year task might be yearOffset 0 (this year) and a Senior-year task
//    yearOffset 3 (three years from now), both expressed with ordinary month/day.
//
// 2. Real, "today"-anchored dates — actual JS Date objects used everywhere else in the app
//    (layout, display, comparisons). anchorDate() converts a stored template date into a real
//    date by adding its "days after Aug 15" offset (plus yearOffset years) to PLAN_START_DATE
//    (today), so the plan's internal timeline always makes sense relative to whatever day the
//    user actually opens the app. A stored date can also be { offsetDays: N } — an explicit,
//    possibly-negative offset from today, used to deliberately place an item in the past (e.g.
//    a passed deadline).

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BASE_YEAR = 2024;

function templateJsDate({ month, day, yearOffset = 0 }) {
  const year = (month >= 8 ? BASE_YEAR : BASE_YEAR + 1) + yearOffset;
  return new Date(year, month - 1, day);
}

const TIMELINE_START = { month: 8, day: 15 };

function templateOffsetDays(date) {
  return Math.round((templateJsDate(date).getTime() - templateJsDate(TIMELINE_START).getTime()) / 86_400_000);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function realAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function realDaysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function formatDate(date) {
  return `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;
}

// Parses a plain 'YYYY-MM-DD' string (e.g. from <input type="date">) as LOCAL midnight — plain
// `new Date('YYYY-MM-DD')` parses date-only ISO strings as UTC midnight, which silently shows as
// the previous day in any timezone behind UTC. Used whenever a user-edited due date needs to
// become a real Date object.
export function parseDateInputValue(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The one place a stored template date turns into a real date the rest of the app uses.
export function anchorDate(date, planStartDate) {
  const offset = 'offsetDays' in date ? date.offsetDays : templateOffsetDays(date);
  return realAddDays(planStartDate, offset);
}
