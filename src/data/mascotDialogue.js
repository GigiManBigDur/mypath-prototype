// Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — every mascot in-flow dialogue line, keyed by
// a stable string each screen references directly. Content only; the resolution logic (which key
// is currently relevant, intro vs. revisit vs. nothing) lives in each screen itself, mirroring how
// this app's other data files (courses.js, opportunities.js, ...) stay pure content while their
// consuming screens own the "what do I show right now" logic.
//
// Voice: warm, encouraging, concise — never childish, never over-explaining, never nagging. Talks
// TO the student like a knowledgeable friend, not AT them like a tutorial. 1-2 sentences, not
// paragraphs. Every "-intro" key is shown at most once per user, ever (see useMascotSeen.js); a
// matching "-revisit" key (where one exists) is short/generic by design and freely repeats on
// every later visit instead — a screen with no "-revisit" key defined simply shows nothing on
// return visits rather than forcing a generic line that wouldn't add anything real.
export const MASCOT_LINES = {
  // Survey — SurveyScreen.jsx has no internal sub-screens (it's one continuous page), so its own
  // "sub-step" progression is field-completion-driven: each key's real trigger condition lives in
  // SurveyScreen's own SURVEY_MASCOT_SEQUENCE, not here — this file only holds the text.
  'survey-intro': "Let's get to know you! Just a few quick questions before we build your plan.",
  'survey-interests': 'What gets you excited? Pick whatever genuinely interests you — choose as many as you like.',
  'survey-educationLevel': 'Now, where are you in your journey right now?',
  'survey-schoolYear': 'And which year are you entering? This helps me build the right timeline for you.',
  'survey-school': 'Do you go to Roslyn High School or UC Davis? If so, I can pull in your real courses and requirements!',
  'survey-revisit': 'Want to update anything here? Your plan will adjust automatically.',

  'discovery-careers-intro': 'Based on what excites you, here are a few careers worth exploring. Pick any that resonate — you can always come back and adjust later.',
  'discovery-careers-revisit': 'Still exploring? Pick as many careers as genuinely interest you.',

  'discovery-majors-intro': "Great pick! Here's what studying that could actually look like — these majors line up with the career(s) you chose.",
  'discovery-majors-revisit': "More majors worth a look, based on what you've picked so far.",

  'discovery-programs-intro': "Now let's find real schools known for this. I'll also show you how each one lines up with your GPA — some might be a stretch, some a safe bet, and that's exactly the point of having both.",
  'discovery-programs-revisit': 'Your GPA is compared against each one here — Reach, Match, or Safety.',

  'transcript-intro': 'Time to get precise — search for your real courses and enter your actual grades. This gives us your real GPA instead of a guess, so everything downstream is accurate.',
  // Extension (not in the original list) — the explicit "no transcript yet" skip state.
  'transcript-empty': "Haven't taken any courses yet? Totally fine — skip ahead for now, you can always come back and add them.",
  'transcript-revisit': 'Your transcript, whenever you need to update it.',

  'courseSelection-intro': "Here's what your school actually requires, plus real courses worth considering for where you're headed. You're always free to explore anything — these are just a starting point.",
  'courseSelection-revisit': 'Come back here anytime to browse or adjust your picks.',
  // Extension — Course Selection Stage 4's own two-part "revisit" checkpoint mode, distinct
  // enough (locked Part 2, a different real purpose) to earn its own short line rather than
  // reusing the plain onboarding intro above.
  'courseSelection-checkpoint': 'Time for a check-in — update your grades first, then pick your next courses.',

  // Extension — the Reach/Match/Safety Summary (ProgramSummaryScreen.jsx) wasn't in the
  // original list by name but is explicitly called out as needing coverage.
  'programSummary-intro': "Here's your list, sorted by how realistic each pick is for your GPA — Reach, Match, and Safety.",
  'programSummary-empty': 'No programs picked yet — head back to Recommended Programs whenever you’re ready.',

  'opportunities-intro': "Competitions, internships, clubs — here's what's out there. I've pulled some based on your interests, but there's a lot more if you want to look around.",
  'opportunities-revisit': 'More to discover here whenever you’re in the mood to look.',

  'projectBuilder-intro': "Want to build something of your own? Totally optional, but a real project is one of the strongest things you can add to your story. No pressure though — skip it if now's not the time.",
  // Extension — shown once a project has actually been started, distinct from the plain
  // "haven't started anything yet" intro above.
  'projectBuilder-revisit': 'Ready to add another step to your project?',

  'plan-intro': 'And... here it is — your actual plan, built from everything you just told me. Click around, mark things off as you go, and come back anytime things change.',
  'plan-revisit': 'Your plan, always up to date. Anything new to add?',

  // Prior Experience Collection + New Profile Page (see CLAUDE.md) — a one-time step inside
  // Opportunity Finder, shown before the real opportunity list until the student either adds
  // something or explicitly skips. No revisit line — once past this gate, editing happens on the
  // new Profile screen instead, so there's nothing new to say here on a later visit.
  'priorExperience-intro': "Before we dive in — have you already done any clubs, jobs, or activities? Totally optional, but it helps me (and every AI feature here) understand you better.",

  'profile-intro': "This is the start of your profile — for now, it's where your past experiences and activities live. Add anything you've already done, or come back and skip it for now.",
  'profile-revisit': 'Add, edit, or remove anything here whenever you like.',

  // Bug fix (see CLAUDE.md) — the hub's own guided-sequence pointing dialogue (HubScreen.jsx's
  // GUIDED_SEQUENCE) used to replay each step's real intro line in full on every hub visit, since
  // it was never wired into the mascotSeenKeys "seen once" system every OTHER screen's dialogue
  // already respects. One shared, generic, freely-repeatable line — reused for any already-seen
  // guided step, regardless of which one — matching the same "-revisit" convention above, without
  // needing 9 near-duplicate step-specific revisit lines for content that's meant to be a light
  // acknowledgment, not a restatement.
  'hub-guided-revisit': "Ready to keep going? Pick up where you left off.",
};

export function getMascotLine(key) {
  return key ? (MASCOT_LINES[key] ?? null) : null;
}

// "Return to Hub" routing restructure (see CLAUDE.md) — Admissions Overview no longer exists as
// its own standalone screen; this condensed, education-level-varying blurb replaces it, folded
// into the hub's own "pointing at Careers of Interest" dialogue (HubScreen.jsx's
// GUIDED_SEQUENCE) right after the survey is completed, instead of a full page of its own. Each
// line is a condensed 1-2 sentence version of what the old ADMISSIONS_TEXT page said for that
// education level — not a lookup by a `-intro`/`-revisit` key pair like MASCOT_LINES above,
// since this is always shown exactly once (the survey-complete -> careers-unlocked transition
// only ever happens once) as part of a LARGER composed line, not stood alone.
export const ADMISSIONS_CONTEXT_LINES = {
  highschool: "first-year college admissions weighs your grades and course rigor alongside essays, activities, and recommendations — not just one number — and most students apply to a mix of Reach, Match, and Safety schools.",
  undergraduate: "grad and professional admissions is more specialized — you're applying straight into one program, usually with a Statement of Purpose, letters of recommendation, and sometimes test scores, so fit matters more than a broad list.",
  transfer: "transfer admissions leans heavily on your college coursework and GPA so far, plus which of your credits will actually transfer toward your intended major.",
};
