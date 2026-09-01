// Implement the Corrected Flow Order: Transcript & GPA Moves Into Session 1 (see CLAUDE.md) —
// extracted out of TranscriptScreen.jsx, the one place this eligibility check originally lived
// inline, so useNarrativeSession.js's new mid-conversation transcript pause can check the exact
// identical condition before ever proposing the hand-off, rather than a second, possibly-drifting
// copy. This app only has a REAL transcript-entry screen for a High School student, a Transfer
// student (even without a partner school, via the shared high-school-only fallback), or a student
// at UC Davis specifically (any level) — a plain Undergraduate NOT at UC Davis has no real
// transcript UI in this prototype at all (no course catalog, no real school data), so the
// conversation must never pause for a hand-off that has nothing real to hand off to.
export function hasRealTranscriptFlow(state) {
  const isHighSchool = state.educationLevel === 'highschool';
  const isCollegeAtUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';
  const isTransfer = state.educationLevel === 'transfer';
  return isHighSchool || isCollegeAtUCDavis || isTransfer;
}
