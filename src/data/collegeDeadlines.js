// Per-School Application Deadlines & Supplemental Essays (see CLAUDE.md) — real, individually
// verified deadlines for 5 flagship programs already curated in programs.js, plus an honest
// PATTERN (never a fabricated exact date) for every other selected school, derived from its own
// real type (UC-system / private / public-non-UC) and, for the supplement/PIQ decision, its own
// `selectivity` tier already present on every program entry.
//
// Real-calendar deadline math, not this app's usual today-relative template convention — mirrors
// ucdavisQuarters.js's own established precedent (see that file's own header comment and
// CLAUDE.md). A real, specific admissions deadline (verified OR pattern-estimated) is a genuinely
// fixed calendar date that doesn't shift based on when a student happens to open the app —
// running it through `anchorDate()`'s usual "N days after Aug 15, added to today" math would
// silently produce a date that has nothing to do with the real deadline it's supposed to
// represent (confirmed directly: it produced "Dec 9" for a school whose real deadline is Jan 6,
// before this fix). The same class of problem UC Davis's own ~10-week quarters already needed
// fixing once, just more severe here since a full admissions cycle spans months, not weeks.
//
// `seniorFallAnchorYear(today)` finds the real calendar year of the CURRENT (if today falls
// within one) or NEXT application cycle's own fall term:
//   - Aug-Dec: this cycle already started this calendar year — anchor is THIS year.
//   - Jan-Feb: still finishing the cycle that started LAST August (every real RD deadline in this
//     file falls in this window) — anchor is LAST year.
//   - Mar-Jul: the "dead zone" between one cycle wrapping up and the next starting — anchor is
//     THIS year, treated as prep for the upcoming fall (matches this app's own "yearOffset 0
//     means starts now/soon" convention every other stage-0 item already uses).
export function seniorFallAnchorYear(today) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  if (m >= 8) return y;
  if (m <= 2) return y - 1;
  return y;
}

// A deadline template ({month, day}) becomes a real calendar Date for the student's OWN senior
// year, `seniorStageIndex` real years from now (0 = the current/upcoming cycle, matching every
// other stage's own yearOffset convention). Aug-Dec template months (every ED/EA date in this
// file) land in the anchor year itself; Jan-Jul template months (every real RD deadline in this
// file) land in the year immediately after — a plain, real calendar-year rollover, not a day
// offset.
export function realDeadlineDate(templateDate, today, seniorStageIndex) {
  const anchor = seniorFallAnchorYear(today) + seniorStageIndex;
  const year = templateDate.month >= 8 ? anchor : anchor + 1;
  return new Date(year, templateDate.month - 1, templateDate.day);
}

// Task 1's own explicit 5 real, individually verified deadlines — keyed by the EXACT `institution`
// string programs.js already uses for that school. `early` is the ED/EA date, `regular` is the
// RD (Regular Decision) date this app's own generated task is actually DATED to (the one deadline
// that applies to every applicant regardless of which round they choose) — the early option is
// still surfaced in the task's own description text, not silently dropped. UC schools use
// `single` instead — a real, well-known UC-system-wide policy: one deadline, no ED/EA at all.
export const VERIFIED_DEADLINES = {
  MIT: { early: { month: 11, day: 1 }, regular: { month: 1, day: 6 } },
  'Cornell University': { early: { month: 11, day: 1 }, regular: { month: 1, day: 2 } },
  'Georgetown University': { early: { month: 11, day: 1 }, regular: { month: 1, day: 10 } },
  'University of Michigan': { early: { month: 11, day: 1 }, regular: { month: 2, day: 1 } },
  'UC Berkeley': { single: { month: 11, day: 30 } },
  UCLA: { single: { month: 11, day: 30 } },
  'UC Davis': { single: { month: 11, day: 30 } },
};

// UC-system schools ALWAYS use the single-Nov-30, no-ED/EA pattern (Task 1's own explicit general
// rule, not just for the 3 UC campuses currently curated in programs.js — every one of those 3 is
// ALSO individually verified above; this check exists so the same correct pattern still applies
// automatically if another UC campus is ever added to programs.js without its own dedicated
// verified entry here).
function isUCSystem(institution) {
  return institution === 'UCLA' || institution.startsWith('UC ');
}

// programs.js has no dedicated public/private field, but most of its own `overview` text
// describes an institution as "public" or "private" somewhere across that institution's own
// program entries — cross-referenced directly (zero conflicts found across all 69 distinct
// institutions currently in programs.js). The ~25 institutions whose entries never happen to use
// either literal word (mostly elite private research universities, private conservatories/art
// schools, and a handful of public flagships) are classified from real-world public knowledge
// instead — every one below is an unambiguous, well-known case, not a guess. This is a real,
// per-institution property (not per-program), so it's keyed by institution once, covering every
// program entry for that school regardless of which major/program row it came from.
const INSTITUTION_TYPE = {
  // Derived directly from this app's own program overview text.
  'Arizona State University': 'public',
  'Babson College': 'private',
  'Belmont University': 'private',
  'Chapman University': 'private',
  'Emory University': 'private',
  'Georgia Tech': 'public',
  'Indiana University': 'public',
  'Johns Hopkins University': 'private',
  'Kansas City Art Institute': 'private',
  MIT: 'private',
  'Michigan State University': 'public',
  NYU: 'private',
  'Northern Arizona University': 'public',
  'Northwestern University': 'private',
  'Ohio State University': 'public',
  'Ohio University': 'public',
  'Penn State University': 'public',
  'Purdue University': 'public',
  'Stanford University': 'private',
  'UC Berkeley': 'public',
  'UC Davis': 'public',
  UCLA: 'public',
  'UNC Chapel Hill': 'public',
  'University of Alabama': 'public',
  'University of Alabama at Birmingham': 'public',
  'University of Arizona': 'public',
  'University of Chicago': 'private',
  'University of Florida': 'public',
  'University of Georgia': 'public',
  'University of Indianapolis': 'private',
  'University of Iowa': 'public',
  'University of Michigan': 'public',
  'University of Nevada, Las Vegas (UNLV)': 'public',
  'University of North Dakota': 'public',
  'University of North Texas': 'public',
  'University of Pennsylvania': 'private',
  'University of Southern California': 'private',
  'University of Texas at Austin': 'public',
  'University of Utah': 'public',
  'University of Virginia': 'public',
  'University of Washington': 'public',
  'Wright State University': 'public',
  'Yale University': 'private',
  // Not stated as "public"/"private" anywhere in this app's own overview text for this
  // institution — real-world public knowledge instead (all unambiguous cases).
  'American Film Institute (AFI) Conservatory': 'private',
  'ArtCenter College of Design': 'private',
  'Auguste Escoffier School of Culinary Arts': 'private',
  'Berklee College of Music': 'private',
  'Carnegie Mellon University': 'private',
  'Cornell University': 'private',
  'Culinary Institute of America': 'private',
  'Duke University': 'private',
  'Eastman School of Music': 'private',
  'Frontier Nursing University': 'private',
  'George Washington University': 'private',
  'Georgetown University': 'private',
  'Harvard University': 'private',
  'Johnson & Wales University': 'private',
  'New England Conservatory': 'private',
  'New York University': 'private',
  'Parsons School of Design (The New School)': 'private',
  'Princeton University': 'private',
  'Rhode Island School of Design (RISD)': 'private',
  'Rochester Institute of Technology': 'private',
  'Rutgers University': 'public',
  'School of the Art Institute of Chicago (SAIC)': 'private',
  'The Juilliard School': 'private',
  'University of Central Florida': 'public',
  'University of Missouri': 'public',
  'University of Waterloo': 'public',
};

// Task 1's own honest fallback PATTERNS for every school not individually verified above —
// deliberately a single representative date within the stated real-world range, never a
// fabricated school-specific one:
//   - UC-system: single Nov 30 (a real, well-known UC-wide policy, not a range).
//   - Private (any selectivity tier): ED/EA clusters around Nov 1; RD "Jan 1-10" — Jan 5 picked
//     as the representative middle value (also matches this app's own prior, now-replaced generic
//     "Submit all college applications" task's date, kept for continuity rather than arbitrary).
//   - Public, non-UC: EA around Nov 1; RD "sometime in December-February" — Jan 15 picked as a
//     representative middle value of that 3-month range.
const PATTERN_DATES = {
  uc: { single: { month: 11, day: 30 } },
  private: { early: { month: 11, day: 1 }, regular: { month: 1, day: 5 } },
  public: { early: { month: 11, day: 1 }, regular: { month: 1, day: 15 } },
};

// The one place a selected school's deadline info is resolved — real verified data first, the UC
// system-wide pattern next, then the general private/public pattern. `isVerified` drives Task 4's
// own "(Est.)" labeling; `isUC` drives Task 3's PIQ-vs-supplement wording. An institution missing
// from INSTITUTION_TYPE (a genuinely new one added to programs.js later without updating this
// file) defaults to the public pattern — a safe, honest middle ground rather than guessing private
// and inventing an ED/EA date that may not exist for that school.
export function getSchoolDeadlineInfo(institution) {
  const verified = VERIFIED_DEADLINES[institution];
  if (verified) return { ...verified, isVerified: true, isUC: !!verified.single };
  if (isUCSystem(institution)) return { ...PATTERN_DATES.uc, isVerified: false, isUC: true };
  const type = INSTITUTION_TYPE[institution] || 'public';
  return { ...PATTERN_DATES[type], isVerified: false, isUC: false };
}

// Task 3's own "most selective private schools do" judgment call, applied consistently: every UC
// school (real, well-known — the whole system requires Personal Insight Questions), the 4
// verified non-UC schools (MIT/Cornell/Georgetown/Michigan all genuinely require supplements in
// real life), and any other PRIVATE school at the Extremely/Highly Selective tier (the realistic
// band where real-world supplements are the norm). Left OUT on purpose: less-selective private
// schools (many genuinely have no supplement beyond the Common App essay) and non-UC public
// schools at any tier (the general real-world pattern skews toward no supplement) — the same
// "don't force a fit, don't guess" posture this app's data layer already holds everywhere else
// (see e.g. programRecommendations.js's own culinary-arts exclusion).
const ALWAYS_SUPPLEMENT = new Set(['MIT', 'Cornell University', 'Georgetown University', 'University of Michigan']);
export function schoolRequiresSupplement(institution, selectivity) {
  if (isUCSystem(institution) || ALWAYS_SUPPLEMENT.has(institution)) return true;
  const type = INSTITUTION_TYPE[institution] || 'public';
  if (type !== 'private') return false;
  return selectivity === 'Extremely Selective' || selectivity === 'Highly Selective';
}
