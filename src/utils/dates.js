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

// input[type=date] wants a plain YYYY-MM-DD string in LOCAL time — toISOString() would shift by
// the timezone offset and silently show the wrong day, so build the string from local getters.
// Promoted here from a local copy Roadmap.jsx used to keep (see CLAUDE.md's "Real-Time Tracking"
// section) once the "Change Date (Testing)" control became a second real consumer — extract once,
// every caller reads the identical value, matching this codebase's own established convention.
export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The one place the whole app resolves "what day is it right now" — real device date by default,
// or a tester-set override (`state.dateOverride`, a plain 'YYYY-MM-DD' string, see the Academic
// Plan's "Change Date (Testing)" control) when one is active. Every "what day is it" computation
// in the app (roadmap positioning/"You are here", deadline-passed opportunity checks, the UC
// Davis quarter banner) reads through this single function rather than calling `startOfToday()`
// directly, so an active override consistently affects all of them at once — never a disconnected
// value some consumers see and others don't. `state.accountCreatedAt`'s own "Days active" hub
// stat is the one deliberate exception (see HubScreen.jsx) — it's a real elapsed-calendar-time
// metric about the actual account, not a planning concept, so it stays on real `startOfToday()`.
export function getEffectiveToday(dateOverride) {
  if (!dateOverride) return startOfToday();
  const overridden = parseDateInputValue(dateOverride);
  overridden.setHours(0, 0, 0, 0);
  return overridden;
}

export function realAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function realDaysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// AI-Generated Weekly Task Suggestions in the Digest View (see CLAUDE.md) — the one place this
// app defines "which week" a given day belongs to, so Task 1's own "once per week, not every
// visit" trigger has a single, stable value to compare against across visits.
//
// Anchor Weekly Task Generation to Sunday (see CLAUDE.md) — renamed from the original
// Monday-based `startOfWeek()` (which this feature's own trigger was the only real caller of,
// confirmed via a repo-wide search before renaming rather than assumed) to make the shift to a
// Sunday-Saturday week explicit rather than silently changing an existing function's meaning.
// Returns a real midnight `Date` for the SUNDAY of `date`'s own week (Sunday itself if `date` IS
// a Sunday), so two dates in the same real Sunday-Saturday week always resolve to the identical
// value regardless of which day within that week they fall on — this is what lets the weekly
// trigger fire exactly once per week starting from Sunday (or, if Sunday is missed, whichever day
// the student next logs in), never again until the following Sunday's own week begins.
export function startOfWeekSunday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date) {
  return `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;
}

// Same month/day as formatDate, plus the real year — used only where a date is actually
// displayed to the student (Map 2's spine/branch labels, detail modal). Deliberately a separate
// function rather than changing formatDate itself: roadmapLayout.js's label-width/collision math
// (blockWidth) is fed the plain formatDate() string stored in a node's `due` field, and growing
// that string would grow the estimated label box, which can shift the branch-step nudge loop's
// collision decisions and therefore a node's y position (see roadmapLayout.js's own BRANCH_SLOPES
// comment for the same class of issue) — exactly what "positioning must stay unchanged" rules out.
// Callers that need the year re-derive it fresh from the node's real `date` object at render time
// instead of touching `due`.
export function formatDateWithYear(date) {
  return `${formatDate(date)}, ${date.getFullYear()}`;
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
