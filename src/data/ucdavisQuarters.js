// Real UC Davis quarter instruction-start dates for the 2026-27 academic year, confirmed via
// UC Davis's own Office of the University Registrar calendar: Fall instruction begins Sept 21,
// Winter Jan 4, Spring Mar 29. Summer Session's start date was NOT independently confirmed — UC
// Davis publishes several overlapping Summer Sessions rather than one fixed date, so it's a
// clearly-labeled reasonable estimate instead, same "don't guess a specific unconfirmed date"
// posture ESTIMATED_COURSE_REQUEST_WINDOW in courses.js already takes for its own not-otherwise-
// published deadline.
//
// Unlike the rest of this app's dates (see utils/dates.js's own header comment — template dates
// are relative offsets from whenever the user happens to open the app, not real calendar dates),
// quarter timing here deliberately uses REAL calendar month/day math instead. Roslyn's yearly
// trunk can treat "this year" as an abstract ~365-day window starting today, because a school
// year is long and the exact real month barely matters. A UC Davis quarter is only ~10 weeks —
// treating every quarter as "starting today" regardless of what month it actually is would be
// wrong in a way that's immediately obvious to a real student (e.g. being told to enroll in a
// "Fall" quarter that, in real life, already happened months ago). So "which quarter is next" is
// computed against the actual current calendar date below, not the app's usual relative-offset
// convention.
export const QUARTER_MONTH_DAY = {
  fall: { month: 9, day: 21 },
  winter: { month: 1, day: 4 },
  spring: { month: 3, day: 29 },
  summer: { month: 6, day: 22 }, // estimate — real UC Davis Summer Sessions vary and overlap
};

export const QUARTER_ORDER = ['fall', 'winter', 'spring', 'summer'];
export const QUARTER_LABELS = { fall: 'Fall', winter: 'Winter', spring: 'Spring', summer: 'Summer' };

// UC Davis's real registration passes (Schedule Builder / Pass 1 & 2) open several weeks before
// a quarter begins, on a schedule that varies by student class level and unit count — not a
// single fixed date this app can honestly parse into one template. This fixed lead time is a
// clearly-labeled ESTIMATE, the same posture Roslyn's own ESTIMATED_COURSE_REQUEST_WINDOW takes.
export const ESTIMATED_REGISTRATION_LEAD_DAYS = 21;

function quarterRealDate(quarter, calendarYear) {
  const { month, day } = QUARTER_MONTH_DAY[quarter];
  return new Date(calendarYear, month - 1, day);
}

// The real, chronologically-next quarter relative to `today` (a real Date, not a template) —
// checks every quarter across a 3-calendar-year window and returns the earliest one that hasn't
// started yet. A student opening this app mid-February is genuinely in the middle of Winter
// quarter, so "next quarter" honestly means Spring, not "whatever's first in the yearly cycle."
export function getNextQuarter(today) {
  const year = today.getFullYear();
  const candidates = [];
  for (const cy of [year - 1, year, year + 1]) {
    for (const q of QUARTER_ORDER) candidates.push({ quarter: q, calendarYear: cy, startDate: quarterRealDate(q, cy) });
  }
  candidates.sort((a, b) => a.startDate - b.startDate);
  return candidates.find((c) => c.startDate >= today) || candidates[candidates.length - 1];
}

// Groups a continuous real-quarter walk into one array per academic-plan "stage" (year), matching
// however many stages the student's STAGE_PLAN entry has (yearSpan). Stage 0 starts at whichever
// quarter is actually next (see getNextQuarter) and runs through that same academic year's
// Summer — a partial year if the student opens the app mid-cycle (e.g. next=Winter means stage 0
// is just [Winter, Spring, Summer], since Fall of that year is already in the past). Every
// subsequent stage gets a full [Fall, Winter, Spring, Summer] for the following calendar year(s).
export function buildStageQuarterLists(nextQuarter, nextCalendarYear, yearSpan) {
  const startIdx = QUARTER_ORDER.indexOf(nextQuarter);
  // Within one academic year, Fall (index 0) anchors the "academic year" — Winter/Spring/Summer
  // (indices 1-3) always fall in the REAL calendar year immediately after Fall's own. This
  // derives that Fall-anchor year from whichever quarter is actually next: if next IS Fall, its
  // own real year already is the anchor; otherwise (Winter/Spring/Summer is next), the anchor is
  // one real year earlier than that quarter's own year. Getting this wrong (previously: every
  // quarter in the first stage reused the SAME calendar year) silently duplicated Winter/Spring/
  // Summer — one instance from this stage with the wrong, already-past year, and a second correct
  // instance from the following stage's own full-year block — confirmed via a real duplicate-node
  // bug on the roadmap before this fix.
  const fallAnchorYear = startIdx === 0 ? nextCalendarYear : nextCalendarYear - 1;
  const yearForIndex = (i, anchorYear) => (i === 0 ? anchorYear : anchorYear + 1);

  const stageQuarterLists = [];

  const firstStage = [];
  for (let i = startIdx; i < QUARTER_ORDER.length; i += 1) {
    const quarter = QUARTER_ORDER[i];
    const calendarYear = yearForIndex(i, fallAnchorYear);
    firstStage.push({ quarter, calendarYear, startDate: quarterRealDate(quarter, calendarYear) });
  }
  stageQuarterLists.push(firstStage);

  let anchorYear = fallAnchorYear + 1;
  for (let s = 1; s < yearSpan; s += 1) {
    stageQuarterLists.push(
      QUARTER_ORDER.map((quarter, i) => {
        const calendarYear = yearForIndex(i, anchorYear);
        return { quarter, calendarYear, startDate: quarterRealDate(quarter, calendarYear) };
      }),
    );
    anchorYear += 1;
  }

  return stageQuarterLists;
}
