import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'mypath-prototype-state';

const DEFAULT_STATE = {
  screen: 'survey', // survey | admissions | discovery | opportunities | plan
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
