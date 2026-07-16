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

  'admissions-intro': "Here's a quick rundown of how admissions actually works for where you're headed — no fluff, just what you need to know.",

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
};

export function getMascotLine(key) {
  return key ? (MASCOT_LINES[key] ?? null) : null;
}
