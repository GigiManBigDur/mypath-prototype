import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'mypath-prototype-state';

const DEFAULT_STATE = {
  screen: 'welcome', // welcome | survey | admissions | discovery | opportunities | projectBuilder | plan
  interestTags: [],
  educationLevel: null, // highschool | undergraduate | transfer
  schoolYear: null, // 9-12 for highschool, 1-4 for undergraduate, 1-3 for transfer
  gpa: '',
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
