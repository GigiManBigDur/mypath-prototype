import { createContext, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mypath-prototype-state';

const DEFAULT_STATE = {
  // welcome | signup | hub | survey | discovery | transcript | courseSelection |
  // programSummary | opportunities | projectBuilder | plan
  screen: 'welcome',
  // Dashboard/Guide feature, Stage 1 (see CLAUDE.md) — entered on SignUpScreen, which sits
  // between welcome and hub. `username` is the only required field there and the only one
  // SignUpScreen's own canContinue gate depends on; '' means not yet entered. `displayName` is
  // optional ("preferred name if different from username") — '' means unset, in which case the
  // hub mascot's greeting (Stage 2, HubScreen.jsx) falls back to `username` instead of showing a
  // blank name. `avatarIcon` is optional too, stored as a plain id string (one of
  // SignUpScreen's own AVATAR_OPTIONS ids) rather than a component reference, matching this
  // codebase's existing "data holds icon NAMES, the screen owns the name→component map"
  // convention (see ProjectBuilderScreen's CATEGORY_ICONS) — null means skipped.
  username: '',
  displayName: '',
  avatarIcon: null,
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
  customTasks: [], // [{ id, title, date: 'YYYY-MM-DD', desc }] — tasks the user created themselves
  startedProjects: [], // [{ id, categoryId, projectTypeId, projectName, status: 'active' | 'completed',
  // guideStepsUsed, steps: [{ id, title, date: 'YYYY-MM-DD', desc }] }] — a Project Builder
  // project the user started. `steps` grows one at a time (see Roadmap.jsx's reveal-next-step
  // flow) rather than being generated up front; `guideStepsUsed` tracks how many of the project
  // type's own curated guide steps have been consumed so the next suggestion (and "guide
  // exhausted" detection) can be derived without re-deriving it from `steps.length`, which also
  // grows from user-authored steps added after the guide runs out.
  roadmapTooltipsSeen: false, // the Academic Plan's paired first-visit callouts (full-bleed
  // canvas + pan/zoom controls) — dismissing either one sets this true and hides both, since
  // they're shown/dismissed as one onboarding moment. Persisted (not just session-scoped) so a
  // dismissal survives a reload; "Start over" resets it like everything else, which is fine —
  // that's a fresh run of the app.
  planYearIndex: null, // null = viewing Map 1 (the Year Overview); a stage index (0 = the
  // current year, matching STAGE_PLAN's ordering) = viewing Map 2 (Roadmap.jsx) scoped to that
  // one year. Persisted like every other navigation field so a returning user resumes on
  // whichever year they were looking at, not bounced back to the overview.
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
