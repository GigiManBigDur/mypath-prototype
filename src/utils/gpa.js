import { getCourseById, WEIGHT_MULTIPLIERS } from '../data/courses';

// Standard numeric-to-4.0 GPA conversion scale (the same widely-used table most US high schools
// and college-admissions tools reference — not specific to Roslyn, since the catalog itself only
// states the 100-point grading scale and the weighting multipliers, not a 4.0 conversion table).
// Checked highest-threshold-first; the first matching (i.e. highest) band wins.
const SCALE_4_TABLE = [
  { min: 93, value: 4.0 },
  { min: 90, value: 3.7 },
  { min: 87, value: 3.3 },
  { min: 83, value: 3.0 },
  { min: 80, value: 2.7 },
  { min: 77, value: 2.3 },
  { min: 73, value: 2.0 },
  { min: 70, value: 1.7 },
  { min: 67, value: 1.3 },
  { min: 65, value: 1.0 },
  { min: 0, value: 0.0 },
];

export function convertTo4Scale(numericalAverage) {
  if (numericalAverage == null || Number.isNaN(numericalAverage)) return null;
  const band = SCALE_4_TABLE.find((b) => numericalAverage >= b.min);
  return band ? band.value : 0.0;
}

// Entries with a numeric gradeEarned, resolved against the real course catalog, excluding
// anything explicitly marked pass/fail — per the catalog's own stated rule ("High pass, pass and
// no credit courses are not included"), which applies to BOTH the unweighted and weighted GPA
// below, not just one. An entry whose courseId no longer resolves (shouldn't happen in practice,
// since entries are only ever created via CourseSearchField's real-catalog search) is silently
// skipped rather than crashing — same defensive posture as the rest of this app's data lookups.
function gradedEntries(transcript) {
  return (transcript || [])
    .map((e) => ({ entry: e, course: getCourseById(e.courseId) }))
    .filter(({ entry, course }) => course && !course.isPassFail && typeof entry.gradeEarned === 'number' && !Number.isNaN(entry.gradeEarned));
}

// The average of raw numerical grades — a 0-100 number, not a 4.0-scale one (Roslyn reports GPA
// on the same 100-point scale the courses themselves are graded on; see convertTo4Scale for the
// separate 4.0-scale conversion). Returns null (not 0) when there's nothing to average, so callers
// can tell "no transcript yet" apart from "a real 0 average" — the same "don't guess" contract
// blank/unparseable state.gpa already has everywhere else in this app.
export function calculateUnweightedGpa(transcript) {
  const entries = gradedEntries(transcript);
  if (entries.length === 0) return null;
  const sum = entries.reduce((s, { entry }) => s + entry.gradeEarned, 0);
  return sum / entries.length;
}

// Same average, but each grade is multiplied by its course's real weight multiplier
// (WEIGHT_MULTIPLIERS, from courses.js — AP 1.1 / Research Honors 1.09 / Honors 1.08 / standard
// 1.0) before averaging, per the catalog's own stated weighting policy. Also a 0-100ish number
// (an AP course's contribution can exceed 100, same as Roslyn's own real transcripts), not a
// 4.0-scale one.
export function calculateWeightedGpa(transcript) {
  const entries = gradedEntries(transcript);
  if (entries.length === 0) return null;
  const sum = entries.reduce((s, { entry, course }) => {
    const multiplier = WEIGHT_MULTIPLIERS[course.weightCategory] ?? 1.0;
    return s + entry.gradeEarned * multiplier;
  }, 0);
  return sum / entries.length;
}

// The one value that actually feeds the rest of the app (ProgramsStep's GPA-curated program
// selection, reachMatchSafetyTag's Reach/Match/Safety badges, roadmapGenerator) — the UNWEIGHTED
// average converted to the standard 4.0 scale, exactly like the old self-reported GPA input did.
// Weighted GPA is display-only (Task 3): it's real, correctly calculated, and shown to the
// student, but this app's downstream GPA-aware features were built around a single 4.0-scale
// number and stay that way rather than being redesigned around a weighted one.
export function calculate4ScaleGpa(transcript) {
  return convertTo4Scale(calculateUnweightedGpa(transcript));
}
