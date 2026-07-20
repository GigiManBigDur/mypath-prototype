import { createContext, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mypath-prototype-state';

const DEFAULT_STATE = {
  // welcome | signup | hub | survey | discovery | transcript | courseSelection |
  // programSummary | opportunities | projectBuilder | plan
  screen: 'welcome',
  // Real-Time Tracking feature (see CLAUDE.md) — a plain 'YYYY-MM-DD' string, or `null` meaning
  // "use the real device date." Set only by the Academic Plan's own "Change Date (Testing)"
  // control (DateOverrideControl.jsx) — every "what day is it" computation in the app resolves
  // through `getEffectiveToday(state.dateOverride)` (utils/dates.js) rather than calling
  // `startOfToday()` directly, so this one field consistently drives the roadmap's own "You are
  // here" position, deadline-passed opportunity checks, and the UC Davis quarter banner alike.
  // Persists like every other field (so a tester can navigate around with it still applied), and
  // is naturally cleared back to `null` by the hub's own Reset button along with everything else.
  dateOverride: null,
  // Dashboard/Guide feature, Stage 1 (see CLAUDE.md) — entered on SignUpScreen, which sits
  // between welcome and hub. `username` is the only required field there and the only one
  // SignUpScreen's own canContinue gate depends on; '' means not yet entered. `avatarIcon` is
  // optional, stored as a plain id string (one of SignUpScreen's own AVATAR_OPTIONS ids) rather
  // than a component reference, matching this codebase's existing "data holds icon NAMES, the
  // screen owns the name→component map" convention (see ProjectBuilderScreen's CATEGORY_ICONS) —
  // null means skipped. `country` (see CLAUDE.md's own "Sign-Up: Country field" note) replaced
  // the original optional "preferred display name" field — plain data collection ahead of a
  // future Global Admission Intelligence feature, no logic reads this yet; '' means unset.
  username: '',
  avatarIcon: null,
  country: '',
  // Dashboard/Guide feature, Stage 2 — a one-shot navigation signal, not a durable field. Set by
  // HubScreen.jsx's Careers/Majors/Programs tiles right before navigating to `discovery`, so that
  // screen knows which of its 3 sub-steps to open on instead of always restarting at 'careers'.
  // DiscoveryScreen reads it once (as its initial subStep) and immediately clears it back to null
  // on mount — the same read-once-then-clear shape `activeCourseCheckpoint`/
  // `activeUCDavisCheckpoint` already use elsewhere in this file — so a LATER hub click into
  // Discovery is never left starting on a stale sub-step from an earlier visit. null means "start
  // at careers," the screen's own original default.
  discoveryEntryStep: null,
  // Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — every mascot dialogue "intro" key
  // (src/data/mascotDialogue.js) that has ever been shown to this user, permanently. Each screen
  // computes its OWN currently-relevant dialogue key from real progress state (mirroring Stage
  // 4's GUIDED_SEQUENCE pattern) and checks this array before deciding whether to show that key's
  // intro line or fall through to a shorter, freely-repeatable "revisit" line (or nothing) —
  // `useMarkMascotSeen` (src/hooks/useMascotSeen.js) is the one place a key ever gets appended
  // here, and it never removes one, so an intro line is shown at most once per user, ever. Revisit
  // lines are deliberately NOT tracked here — they're short/generic by design and safe to repeat
  // on every subsequent visit, so tracking them would only add bookkeeping with no real benefit.
  mascotSeenKeys: [],
  interestTags: [],
  educationLevel: null, // highschool | undergraduate | transfer
  schoolYear: null, // 9-12 for highschool, 1-4 for undergraduate, 1-3 for transfer
  currentSchool: '', // survey's school search/select field — only 'Roslyn High School' is real
  // for now (src/data/schools.js); '' means unselected.
  gpa: '', // Stage 1 self-reported this directly; Stage 2 (Transcript & GPA) now calculates it
  // instead — TranscriptScreen writes the converted 4.0-scale equivalent here as a string (e.g.
  // '3.7'), the exact same format/field the old input produced, so ProgramsStep/roadmapGenerator
  // need zero changes. Blank ('') means no transcript entered yet, same "don't guess" fallback
  // those consumers already handle.
  // Real, confirmed bug fix (Dashboard/Guide hub) — `state.gpa !== ''` used to double as the
  // hub's own "Transcript & GPA is done or was explicitly skipped" unlock signal for Course
  // Selection/Opportunity Finder/the mascot's pointing sequence. That broke for a genuine
  // incoming freshman with zero prior courses: TranscriptScreen's "Skip — I haven't taken any
  // courses yet" button calls the exact same `advance()` Continue does, which derives `gpa` from
  // `calculate4ScaleGpa(transcript)` — an empty transcript averages to `null`, so `advance()`
  // wrote `gpa: ''` right back out, indistinguishable from "never visited this screen at all," so
  // the hub stayed locked even after a real, deliberate skip. `transcriptCompleted` is a
  // dedicated boolean tracking ONLY "has the onboarding Transcript & GPA screen been submitted
  // (Continue or Skip, either one)" — completely decoupled from the actual numeric GPA value, so
  // `gpa` itself stays honestly blank for a true zero-course transcript, preserving the "don't
  // guess" contract every other GPA-aware consumer (ProgramsStep's curated list,
  // `reachMatchSafetyTag`'s Reach/Match/Safety badges) already depends on — this flag is never
  // read by anything GPA-value-related, only by the hub's own "is this step done" checks.
  // Written by TranscriptScreen's own `advance()` (both the Roslyn and UC Davis variants,
  // non-checkpoint branch only — Course Selection Stage 4's per-year/per-quarter checkpoints are
  // a separate, later mechanism with their own `part1Done` tracking and don't touch this field).
  transcriptCompleted: false,
  transcript: [], // [{ id, courseId, gradeEarned (0-100 number), yearTaken (8-12) }] — entered on
  // TranscriptScreen via a search-select over the real course catalog (src/data/courses.js), never
  // free text. courseId references COURSES; gpa.js derives all 3 GPA numbers from this array.
  ucdavisTranscript: [], // [{ id, courseId, letterGrade, classYear, quarter }] — the UC Davis
  // partner-school analog of `transcript` above (see CLAUDE.md's "UC Davis Partner School, Stage
  // 2" section), entered on TranscriptScreen for an Undergraduate/Transfer student who selected
  // UC Davis as their current school. Deliberately a SEPARATE field, not reused `transcript` —
  // the entry shapes are genuinely different (a real letter grade + UC Davis quarter/class-year,
  // vs. Roslyn's 0-100 numeric grade + 8-12 grade level), and the two are mutually exclusive by
  // construction (a student is on exactly one educationLevel/currentSchool combination at a
  // time), so there's no risk of the two ever needing to merge. courseId references
  // UCDAVIS_COURSES (src/data/ucdavisCourses.js); utils/ucdavisGpa.js derives the single 4.0-scale
  // GPA number from this array directly (no separate weighted/unweighted distinction — UC Davis's
  // letter scale is already a straight 4.0 scale, unlike Roslyn's 100-point one).
  selectedCourseIds: [], // course.id values picked on CourseSelectionScreen (Course Selection
  // Stage 3), from either its Recommended or Browse view — the same array either way, since
  // selection behaves identically regardless of which view a course was found through. This is
  // specifically the UPCOMING registration cycle's selections (stage index 0's "next year") —
  // every later year's selections live in courseCheckpoints below instead, never here.
  // High-School-only (roadmapGenerator.js's buildCourseItems() only ever reads this when
  // state.educationLevel === 'highschool') — see selectedUCDavisCourseIds below for the UC Davis
  // partner-school analog.
  selectedUCDavisCourseIds: [], // the UC Davis partner-school analog of selectedCourseIds above
  // (see CLAUDE.md's "UC Davis Partner School, Stage 3" section) — a deliberately SEPARATE field,
  // not a reuse of selectedCourseIds, even though both are just plain string-id arrays: keeping
  // them separate means a future Stage 4 (wiring UC Davis selections into the Academic Plan, not
  // yet built) has one unambiguous field to read, with zero risk of ever needing to distinguish
  // by id prefix or accidentally feeding a UC Davis course id into Roslyn-scoped roadmap code.
  // Populated on CourseSelectionScreen's own UC Davis branch, resolved via getCourseById in
  // ucdavisCourses.js, never courses.js's Roslyn-scoped one.
  courseCheckpoints: {}, // { [stageName]: { part1Done: boolean, selectedCourseIds: string[] } } —
  // Course Selection Stage 4's "revisit" checkpoint for every future high-school year except the
  // last (see roadmapGenerator.js's course-checkpoint items). part1Done flips true once the
  // student has been through TranscriptScreen in checkpoint mode for that stage (see
  // activeCourseCheckpoint below); selectedCourseIds is that stage's own equivalent of the
  // top-level selectedCourseIds above, populated once Part 2 (CourseSelectionScreen in checkpoint
  // mode) completes. Keyed by stage NAME (e.g. 'sophomore'), not index, since names are stable
  // identifiers already used elsewhere (trunkSteps.js's own stage.label).
  activeCourseCheckpoint: null, // { stageName, part: 'transcript' | 'courses' } | null — set by
  // Roadmap.jsx right before navigating to 'transcript'/'courseSelection' from a course-checkpoint
  // node's modal, so those two screens know they're in checkpoint mode (different copy, writes to
  // courseCheckpoints[stageName] instead of the top-level transcript/selectedCourseIds fields
  // where relevant, and returns to 'plan' instead of continuing the normal onboarding flow).
  // Cleared the moment either screen's checkpoint flow finishes or is backed out of.
  ucdavisQuarterCheckpoints: {}, // { [stageName]: { fall: { part1Done, selectedCourseIds },
  // winter: { part1Done, selectedCourseIds }, spring: { part1Done, selectedCourseIds },
  // summer: { part1Done, selectedCourseIds } } } — the UC Davis partner-school analog of
  // courseCheckpoints above (see CLAUDE.md's "UC Davis Partner School, Stage 4" section), but
  // keyed by QUARTER within each stage year too, not just stage name — UC Davis's real quarter
  // system means registration (and real final grades) happen every quarter, not once a year, so
  // EVERY quarter is a full two-part checkpoint (transcript update + course selection, part1Done
  // tracks the transcript half exactly like courseCheckpoints does) — Fall, Winter, and Spring all
  // identically, plus an explicitly optional Summer one (same two-part shape, just `required:
  // false` on its spine node). Every quarter's own `selectedCourseIds` feeds roadmapGenerator.js's
  // UC Davis enrollment items once populated, same "checkpoint produces real dated tasks" contract
  // courseCheckpoints already established.
  activeUCDavisCheckpoint: null, // { stageName, quarter: 'fall'|'winter'|'spring'|'summer',
  // part: 'transcript' | 'courses' } | null — the UC Davis analog of activeCourseCheckpoint
  // above, extended with `quarter` since a stage year now has up to 4 checkpoint slots instead of
  // 1. Set to part: 'transcript' or part: 'courses' for ANY quarter — every quarter is two-part
  // now, so there's no quarter-specific restriction on which `part` value applies here.
  selectedCareerIds: [],
  selectedMajorIds: [],
  selectedProgramKeys: [], // `${institution}::${program}`
  selectedOpportunityIds: [],
  completedNodes: {},
  nodeDateOverrides: {}, // { [nodeId]: 'YYYY-MM-DD' } — user-edited due date, keyed like completedNodes
  removedNodeIds: {}, // { [nodeId]: true } — user-deleted tasks, same flat-map shape as completedNodes
  // AI Personalization, Stage 1 (see CLAUDE.md) — { [nodeId]: string }, same flat-map shape as
  // completedNodes/nodeDateOverrides. An optional, free-text "how did it go" note a student can
  // attach to ANY real task (e.g. "I won 2nd place at Regionals" or "I missed this because I was
  // sick") — the richest personalization signal this app collects, and the whole reason this field
  // exists: Stage 2's future AI layer depends on it. A blank/whitespace-only note is never stored
  // (the key is deleted, not set to ''), so this map only ever holds genuinely-written notes.
  taskOutcomes: {},
  customTasks: [], // [{ id, title, date: 'YYYY-MM-DD', desc }] — tasks the user created themselves
  startedProjects: [], // [{ id, categoryId, projectTypeId, projectName, status: 'active' | 'completed',
  // guideStepsUsed, steps: [{ id, title, date: 'YYYY-MM-DD', desc }] }] — a Project Builder
  // project the user started. `steps` grows one at a time (see Roadmap.jsx's reveal-next-step
  // flow) rather than being generated up front; `guideStepsUsed` tracks how many of the project
  // type's own curated guide steps have been consumed so the next suggestion (and "guide
  // exhausted" detection) can be derived without re-deriving it from `steps.length`, which also
  // grows from user-authored steps added after the guide runs out.
  // Bug fix (see CLAUDE.md) — HubScreen.jsx's own GUIDED_SEQUENCE used to have no way to tell
  // "explicitly skipped Project Builder" apart from "hasn't gotten there yet," since this was the
  // one step in that sequence with no dedicated completion flag of its own (every other step's
  // isDone reads a real selection/action already recorded elsewhere). Set once, permanently, the
  // moment ProjectBuilderScreen's "Skip for now" button is clicked — mirrors the same shape
  // `transcriptCompleted` already established for a different "done OR explicitly skipped" step.
  projectBuilderSkipped: false,
  roadmapTooltipsSeen: false, // the Academic Plan's paired first-visit callouts (full-bleed
  // canvas + pan/zoom controls) — dismissing either one sets this true and hides both, since
  // they're shown/dismissed as one onboarding moment. Persisted (not just session-scoped) so a
  // dismissal survives a reload; "Start over" resets it like everything else, which is fine —
  // that's a fresh run of the app.
  planYearIndex: null, // null = viewing Map 1 (the Year Overview); a stage index (0 = the
  // current year, matching STAGE_PLAN's ordering) = viewing Map 2 (Roadmap.jsx) scoped to that
  // one year. Persisted like every other navigation field so a returning user resumes on
  // whichever year they were looking at, not bounced back to the overview.
  voiceMuted: false, // Dashboard/Guide feature, Stage 6 (see CLAUDE.md), now ElevenLabs Voice —
  // the mascot's spoken voiceover defaults ON. A single toggle in App.jsx's persistent header
  // controls this for the whole app, not a per-screen setting — stored here (rather than a
  // module-level "session only" flag, the pattern this app already uses for pure entrance-
  // animation flags like `hasPlayedRoadmapEntrance`) so it survives across screen navigation the
  // same simple way every other real user preference in this app already does; it also happens to
  // survive a reload, which is a reasonable bonus for a deliberate mute choice, not something
  // worth engineering around. "Start Over" resetting it back to on along with everything else is
  // fine — that's a fresh run of the app, same as every other DEFAULT_STATE field.
  // `voiceURI` (the old "Show Available Voice Options" browser-voice picker's own pick) was
  // removed entirely once ElevenLabs Voice replaced the old SpeechSynthesis system — there's now
  // exactly one fixed voice for every mascot line, so there's nothing left to persist a pick for.
  accountCreatedAt: null, // Hub redesign, radial-layout pass (see CLAUDE.md) — set once, by
  // SignUpScreen's own submit handler, to a plain 'YYYY-MM-DD' string the first time a student
  // ever completes sign-up (never overwritten afterward, so a defensive re-submit can't reset
  // it). This is what the hub's "Your Progress" card's real "Days active" stat is computed from
  // (today minus this date, inclusive) — a genuine, if simple, real metric rather than an
  // invented placeholder number, matching this codebase's standing "don't fabricate data" rule.
  // `null` means never signed up yet, which can't actually happen by the time the hub is ever
  // reached (SignUpScreen's own canContinue gate is the only door into the hub).
};

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_STATE;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  // Skips the redundant write on mount: `state` at that point was just READ from this same key
  // (via `loadInitialState` above), so writing it straight back out is a pure no-op in terms of
  // data — it only ever matters if something else touches localStorage in the brief window before
  // this effect flushes (found while chasing an unrelated flaky-test investigation: a Playwright
  // test that seeds fresh state and reloads immediately after a plain `page.goto()` could lose a
  // race against this exact no-op write). Comparing `state` by reference against a ref snapshotted
  // at mount — rather than a simple boolean "have we run yet" flag — is what makes this safe under
  // React StrictMode (main.jsx): StrictMode double-invokes every effect on mount via its own
  // `reconnectPassiveEffects` replay, with no new render in between, so a boolean flag gets
  // flipped to "allow" by the first invocation and still lets the second one write; comparing
  // against the same snapshotted object correctly skips BOTH invocations, while any REAL
  // subsequent `patch()` call (which always produces a new object via spread) still writes
  // normally. That said, the actual flaky-test race turned out to live in the test harness itself,
  // not here — see test-hub.js's `seedAndGoto` fix for the real cause and fix.
  const lastPersisted = useRef(state);
  useEffect(() => {
    if (state === lastPersisted.current) return;
    lastPersisted.current = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — non-critical for this prototype
    }
  }, [state]);

  const patch = (updates) => setState((prev) => ({ ...prev, ...updates }));

  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setState(DEFAULT_STATE);
  };

  return (
    <AppContext.Provider value={{ state, patch, reset }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
