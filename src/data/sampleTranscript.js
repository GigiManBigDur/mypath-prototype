// Add Testing-Only Prefill Buttons for Transcript & Experiences (see CLAUDE.md) — real course ids
// from the actual parsed Roslyn catalog (courses.js), not invented ones, spanning a mix of
// standard/honors/AP weight categories so "Fill Sample Transcript" genuinely exercises the real
// weighted/unweighted/4.0-scale GPA math (WEIGHT_MULTIPLIERS, convertTo4Scale) rather than
// producing disconnected placeholder numbers. Grades are plausible (87-93, all real passing
// grades), and `yearTaken` matches each course's own real `gradeLevels` entry. Extracted into its
// own data module (rather than living inline in TranscriptScreen.jsx, where it was first added) so
// TransferHighSchoolTranscript.jsx's own Roslyn path — a Transfer student's real past high school
// record, which happens to share the identical `{ id, courseId, gradeEarned, yearTaken }` entry
// shape — can reuse the exact same sample list instead of a second, possibly-drifting copy;
// TranscriptScreen.jsx importing FROM TransferHighSchoolTranscript.jsx (for the multi-year trunk's
// own rendering) made a direct import the other way circular, so this lives in `src/data/` instead,
// matching this codebase's own "data holds the values, screens own the UI" convention.
export const SAMPLE_TRANSCRIPT = [
  { courseId: 'english-english-1', gradeEarned: 89, yearTaken: 9 },
  { courseId: 'math-algebra-1', gradeEarned: 91, yearTaken: 9 },
  { courseId: 'science-biology-honors-previously-living-environment-honors', gradeEarned: 88, yearTaken: 10 },
  { courseId: 'math-algebra-2-honors', gradeEarned: 90, yearTaken: 10 },
  { courseId: 'math-ap-calculus-ab', gradeEarned: 93, yearTaken: 11 },
  { courseId: 'science-ap-biology', gradeEarned: 87, yearTaken: 11 },
];
