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
  // null means skipped. `citizenship` (see CLAUDE.md's own "Real International Student Logic"
  // note) replaced the original "Sign-Up: Country field" — that field was originally plain data
  // collection ahead of a not-yet-built Global Admission Intelligence feature ('country', "What
  // country are you from?"), no logic read it. It's now reworded/renamed to genuinely ask about
  // citizenship (not current residence — a student can live in the US while holding citizenship
  // elsewhere) since real logic now derives international-student status from it
  // (isInternationalStudent(), utils/internationalStudent.js). '' means not answered — this
  // stays optional, and a blank answer never triggers international-specific logic (don't guess).
  username: '',
  avatarIcon: null,
  citizenship: '',
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
  // Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md), Task 1 — a free-text
  // complement to `interestTags` above, entered on the Survey. '' means not written (optional,
  // same "blank means unset" convention every other optional text field in this app already uses).
  // Included verbatim in `compileStudentProfile`'s `basicProfile` so both the Stage 2 suggestion
  // feature and Build Your Own's conversation can read it.
  passionText: '',
  educationLevel: null, // highschool | undergraduate | transfer
  schoolYear: null, // 9-12 for highschool, 1-4 for undergraduate, 1-3 for transfer
  currentSchool: '', // survey's school search/select field — only 'Roslyn High School' is real
  // for now (src/data/schools.js); '' means unselected.
  // "Current Major" field for College Students (see CLAUDE.md) — an Undergraduate/Transfer
  // student's real, currently-declared major at their current partner school (currentSchool
  // above), NOT a Discovery selection (selectedCareerIds/selectedMajorIds/selectedProgramKeys
  // below, which represent FUTURE goals). Free-text, optional, '' means not entered — same
  // "blank means unset" convention passionText already uses. Included verbatim in
  // compileStudentProfile's basicProfile so Stage 2 suggestions/chat/Build Your Own can read it.
  currentMajor: '',
  // High School Selection + Transcript for Transfer Students (see CLAUDE.md) — Transfer-track-only
  // (never shown/read for High School or general Undergraduate). `transferHighSchool` is the
  // Survey's own "Which high school did you attend?" answer: '' unselected, 'Roslyn High School'
  // (real course-catalog data behind it), or 'Other' (an honest placeholder for a school we don't
  // have real data for yet — src/data/schools.js's TRANSFER_HS_SCHOOLS). `transferHsTranscript`
  // (Roslyn path only) is the SAME `{ id, courseId, gradeEarned, yearTaken }` shape `transcript`
  // below uses, against the identical real Roslyn course catalog/weighted-GPA math — a deliberately
  // SEPARATE field rather than reusing `transcript` itself, matching this app's own established
  // "separate field per concept" convention (see `ucdavisTranscript`'s own comment) even though the
  // entry shape happens to coincide here; `transcript` stays reserved for an actual current High
  // School student's own transcript. `transferHsOtherCourses` (Other path only) is a plain
  // `{ id, name }` array — free-text course names, no grades, since there's no real per-course
  // grading data for an unmapped school to enter against. `transferHsOtherGpa` (Other path only) is
  // a plain self-reported GPA string, the same "simple text box" shape the Survey's own GPA field
  // used before the real Transcript & GPA feature replaced it for Roslyn/UC Davis — kept here only
  // as the honest fallback for a school with no real data behind it. None of these three ever feed
  // `state.gpa` (which stays scoped to the student's CURRENT school/program, per the existing
  // Reach/Match/Safety contract) — they're a secondary, display/AI-context-only data set, included
  // verbatim in compileStudentProfile's `academic.transferHighSchool` (Task 3) so the AI features
  // have richer context on a transfer student's full academic history, not just their current one.
  transferHighSchool: '',
  transferHsTranscript: [],
  transferHsOtherCourses: [],
  transferHsOtherGpa: '',
  // Ask Transfer Students Directly When They Plan to Transfer (see CLAUDE.md) — replaces the old
  // assumption-based Transfer plan-length logic (1st year always got 2 years, 2nd/3rd year always
  // got 1) with a direct question, Survey's own "When do you plan to transfer?": the number of
  // FULL YEARS between the student's current year (schoolYear above) and their stated transfer
  // target — 0 ("after this year"), 1 ("after my Nth+1 year"), or 2 ("after my Nth+2 year"). `null`
  // means not yet answered — deliberately checked via `!== null`, not a truthy check, everywhere
  // this is read, since 0 is itself a real, valid answer (this app's usual "0 is falsy" trap would
  // silently misread "transferring after this year" as "unanswered"). Drives
  // `resolveStageNames()`'s own gap-keyed lookup (trunkSteps.js's `TRANSFER_STAGE_PLAN_BY_GAP`) —
  // plan length is now always a function of this real answer, never inferred from schoolYear
  // alone. Resets to `null` whenever `educationLevel` or `schoolYear` changes (SurveyScreen.jsx),
  // since the available options (and their real meaning) depend on the current schoolYear.
  transferTargetGap: null,
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
  // Prior Experience Collection + New Profile Page (see CLAUDE.md) — `[{ id, name, description }]`,
  // real extracurriculars/experiences the student had ALREADY done before this app, entered via a
  // one-time optional step in Opportunity Finder (`priorExperiencePromptDone` below) and
  // afterward viewable/editable anytime on the new Profile screen. Deliberately a separate array
  // from anything else this app tracks (opportunities/projects are things planned/started THROUGH
  // this app; these are real prior history) — included verbatim in the Stage 1 compiled profile so
  // the already-built AI features (Stage 2 suggestions, the chat assistant, Build Your Own) can
  // reference them, but explicitly NOT wired into the rule-based Careers/Majors/Programs
  // recommendation logic, per this feature's own deliberate scope.
  priorExperiences: [],
  // Set once, permanently, the moment the student either adds at least one experience or
  // explicitly clicks "Skip" on Opportunity Finder's own one-time prompt — mirrors the same
  // "done OR explicitly skipped" shape `transcriptCompleted`/`projectBuilderSkipped` already
  // established elsewhere in this file. Once true, Opportunity Finder goes straight to its real
  // opportunity list on every future visit; editing the list afterward happens on the Profile
  // screen instead, not by re-showing this same gate.
  priorExperiencePromptDone: false,
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
  // AI Personalization, Stage 2 (see CLAUDE.md) — { [nodeId]: true }, same flat-map shape as
  // completedNodes. Marks every task that has EVER triggered a real suggestion request (whether
  // the request succeeded, failed, was accepted, or dismissed) — set synchronously the moment the
  // trigger condition (complete AND has a written outcome) is first detected, so the same task can
  // never trigger a second request, and dismissing a suggestion never causes an immediate re-ask.
  suggestionSourceTaskIds: {},
  // The one suggestion currently awaiting a student's Accept/Not now decision (Task 5's own "one
  // suggestion at a time" guardrail) — `{ sourceTaskId, title, date, rationale } | null`. Shown via
  // MascotWidget, which reads this directly rather than needing every screen threaded with a prop.
  pendingSuggestion: null,
  // Accepted suggestions become real, permanent roadmap tasks here — `[{ id, title, date, desc,
  // sourceTaskId }]` — a dedicated array (not folded into `customTasks`, which specifically means
  // "the student typed this in themselves") so `roadmapGenerator.js` can give them their own
  // distinct required:false, category:'ai-suggested' spine items and their own visual marker.
  aiSuggestedTasks: [],
  // Fix: AI Suggestions Related to Existing Chains (see CLAUDE.md) — `{ [opportunityId]:
  // [{ id, title, date, desc }] }`. An accepted suggestion the AI tagged as belonging to an
  // existing opportunity chain (e.g. a follow-up step for FBLA) lands here instead of
  // `aiSuggestedTasks` — roadmapGenerator.js splices these into that opportunity's own year-1
  // chain (as one more dated step, sorted into place alongside the chain's own template steps)
  // rather than creating a second, disconnected standalone spine item for it. Each entry's own
  // `date` is a fixed, one-time value computed at accept time (see suggestionResolver.js) — not
  // recomputed on every render — so the chain's existing steps never shift underneath it.
  aiChainInsertions: {},
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
  // Make the Overview-Task Chat More Obviously Interactive (see CLAUDE.md) — the same "one-time,
  // persisted, dismiss-once-ever" shape `roadmapTooltipsSeen` above already established, applied
  // to MilestonePlanningPanel's own first-visit hint + input glow (Two-Phase Generation's
  // per-milestone scoped chat) instead of the Academic Plan's own callouts. A single app-wide flag
  // (not per-milestone) — once a student has seen this hint for ANY overview task's chat, they
  // understand the pattern and don't need it repeated for every later one either.
  milestoneChatHintSeen: false,
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
  // Polished Hub-to-Chat Transition + Persistent Chat History (see CLAUDE.md) — the real,
  // multi-turn "Ask MyPath AI anything" conversation, `[{ role: 'user'|'assistant', content,
  // intent? }]`. Originally local, ephemeral state inside a modal component (reset on every
  // open); moved here so closing/reopening the app restores the same conversation instead of
  // starting fresh — persisted to localStorage exactly like every other field, and cleared only
  // by `reset()` wiping the whole state back to DEFAULT_STATE, same as everything else.
  chatHistory: [],
  // Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md), Tasks 4/5 — the
  // real, ongoing project-brainstorming conversation behind Project Builder's single top-level
  // "Build Your Own" entry. Same shape/persistence contract as `chatHistory` above (`[{ role,
  // content, ...extra fields the caller cares about }]`, persisted, cleared only by Reset) but a
  // deliberately SEPARATE field — this is a genuinely different conversation topic (developing one
  // project idea) from the hub's own general-assistant thread, and mixing the two into one thread
  // would be both confusing to read back and semantically wrong (different system prompts/
  // endpoints, different per-message fields — `planReady`/`projectName`/`milestones` here instead
  // of `intent`/`taskTitle`). The "reuse, don't rebuild" requirement is satisfied by sharing the
  // same underlying chat UI/mascot-speech mechanism (`ChatConversation.jsx`,
  // `useMascotSpeech`), not by forcing two unrelated conversations into one array.
  buildYourOwnChatHistory: [],
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
