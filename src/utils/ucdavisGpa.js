// Standard UC letter-grade-to-4.0 conversion, per the build spec's own explicit table — this is
// the real, standard UC scale, not something derived/estimated the way Roslyn's own 100-point
// GPA needed a conversion table built for it (see utils/gpa.js's own header comment). Because
// it's already on a 4.0 scale, no further conversion step is needed before writing to
// state.gpa — unlike Roslyn's calculate4ScaleGpa, this IS the final number.
export const UC_GRADE_POINTS = {
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0.0,
};

// P (Pass) and NP (No Pass) are real UC Davis grading options but are excluded from GPA
// calculation entirely, per the build spec — same "don't count what the institution itself
// doesn't count" rule Roslyn's isPassFail exclusion already established in utils/gpa.js.
export const PASS_NO_PASS_GRADES = ['P', 'NP'];

export const LETTER_GRADE_OPTIONS = [...Object.keys(UC_GRADE_POINTS), ...PASS_NO_PASS_GRADES];

// transcript: array of { letterGrade, ... } entries (ucdavisTranscript shape in AppContext).
// Returns null (not 0) for an empty or all-P/NP transcript — the same "don't guess a GPA that
// isn't there" contract every other blank-GPA fallback in this app already follows.
export function calculateUCDavisGpa(transcript) {
  const graded = transcript.filter((entry) => !PASS_NO_PASS_GRADES.includes(entry.letterGrade));
  if (graded.length === 0) return null;
  const total = graded.reduce((sum, entry) => sum + (UC_GRADE_POINTS[entry.letterGrade] ?? 0), 0);
  return total / graded.length;
}
