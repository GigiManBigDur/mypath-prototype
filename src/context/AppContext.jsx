import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'mypath-prototype-state';

const DEFAULT_STATE = {
  // welcome | survey | admissions | discovery | transcript | courseSelection | opportunities |
  // projectBuilder | plan
  screen: 'welcome',
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

  useEffect(() => {
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
