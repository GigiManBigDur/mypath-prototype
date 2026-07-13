// School-Specific Requirements — a third, distinct recommendation layer on Course Selection,
// alongside (not replacing) the interest-based recommendations (courseRecommendations.js) and the
// field-level "Program-Specific Course Recommendations" (programRecommendations.js). Those two
// operate at the level of an interest track or a major's whole FIELD (e.g. "Engineering programs
// broadly want calculus and physics"); this one exists specifically for the non-obvious,
// STRUCTURAL requirements tied to one individual school + program combination that a field-level
// rule can never catch — e.g. a major housed in an unexpected college with its own blanket
// distribution requirements.
//
// Keyed by the exact same `${institution}::${program}` string `getMergedPrograms()` (programs.js)
// already produces as each program card's `key`, and that `state.selectedProgramKeys` (Discovery
// Screen 3c) already stores — so lookup is a direct object read, no fuzzy matching needed.
//
// CRITICAL RULE: every entry here must be real, independently verified research — never a guess
// or inference from a program's name/subject. A program with no entry here is NOT assumed to have
// no special requirements; it just means nobody has verified it yet (see
// CourseSelectionScreen.jsx's honest fallback for the unverified case). This file is meant to grow
// one verified program at a time, not all at once — each entry is self-contained ({ requirement,
// why, transferNote?, source }), so adding the next one never requires touching the lookup/render
// code, only adding a new key here.
export const SCHOOL_SPECIFIC_REQUIREMENTS = {
  'Cornell University::Communication (CALS)': {
    requirement:
      'A full year of Introductory Biology (with lab), 3 credits of Chemistry or Physics, and a ' +
      'Statistics/Quantitative Literacy course.',
    why:
      "Cornell's Communication major is housed within the College of Agriculture and Life " +
      "Sciences (CALS), not a standalone communications department. CALS applies broad " +
      "science-distribution requirements across every major in the college, regardless of " +
      'subject — which is exactly why a science-heavy requirement attached to a "Communication" ' +
      'major is easy to miss.',
    transferNote:
      'Transfer applicants specifically need this coursework completed, or in progress, at the ' +
      'time of application.',
    source: "Cornell CALS undergraduate admissions requirements (verified directly, not inferred).",
  },
};

export function getSchoolRequirement(programKey) {
  return SCHOOL_SPECIFIC_REQUIREMENTS[programKey] || null;
}
