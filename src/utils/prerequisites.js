import { COURSES } from '../data/courses';

// Roslyn's real stated passing threshold on its 100-point scale — the same floor gpa.js's
// convertTo4Scale table treats as the bottom of the 1.0 band (65-66.999) vs. a 0.0 below that.
// Used here so "completed a prerequisite" means a real passing grade, not just an entry existing
// in the transcript (Course Selection Stage 4's own requirement: check actual completed grades,
// not just did-they-take-it yes/no).
const PASSING_GRADE = 65;

// Course `prerequisite` fields are free catalog text (e.g. "Completion of Algebra 2 B or Algebra
// 2", "Portfolio in Two-Dimensional (2-D) Design or Portfolio in Three-Dimensional (3-D)
// Design"), not structured data — there was never a machine-readable prerequisite graph to parse.
// This is a deliberately conservative, best-effort matcher: split the text on "or" (Roslyn's own
// convention for "either of these satisfies it"), then check whether each alternative's text
// contains another real course's exact name. A prerequisite string that doesn't obviously
// reference another course by name (e.g. AP Physics 1 & 2's "Recommended grade of 90+ in three
// sciences, Precalculus" — a threshold across a subject area, not one specific course) is left
// unparsed on purpose: inventing a rule for it would be a guess, not a real check, and this
// codebase's standing rule is "don't guess" (see programs.js's own selectProgramsForGpa/
// reachMatchSafetyTag for the same principle applied to GPA). The course's own `prerequisite`
// text is always shown verbatim on its card/modal regardless (see CourseCard), so a student can
// still self-check anything this can't parse.
function referencedCourseIds(prerequisiteText) {
  if (!prerequisiteText) return [];
  return prerequisiteText
    .split(/\bor\b/i)
    .map((alt) => alt.trim().toLowerCase())
    .map((alt) => {
      // Longest matching course name wins, not first-in-array-order — a naive first-match would
      // let a shorter name that happens to be a substring of a longer, more specific one shadow
      // the real match (e.g. "Calculus" is literally a substring of "Precalculus", and "Algebra
      // 2" is a substring of "Algebra 2 B" — both real course names in this catalog, both
      // confirmed to misfire with first-match before this fix).
      let best = null;
      for (const c of COURSES) {
        const name = c.name.toLowerCase();
        if ((alt === name || alt.includes(name)) && (!best || name.length > best.name.length)) {
          best = c;
        }
      }
      return best;
    })
    .filter(Boolean)
    .map((c) => c.id);
}

// Returns { satisfied, checked, reason }:
//   - checked: false when the prerequisite text couldn't be parsed into real course references —
//     callers should treat this as "unknown, don't block" rather than "satisfied".
//   - satisfied: only meaningful when checked is true.
//   - reason: a short, human-readable explanation for the unsatisfied case.
export function checkPrerequisite(course, transcript) {
  if (!course.prerequisite) return { satisfied: true, checked: true, reason: null };

  const refIds = referencedCourseIds(course.prerequisite);
  if (refIds.length === 0) return { satisfied: true, checked: false, reason: null };

  const passedRefs = refIds.filter((id) => (transcript || []).some(
    (e) => e.courseId === id && typeof e.gradeEarned === 'number' && e.gradeEarned >= PASSING_GRADE,
  ));

  if (passedRefs.length > 0) return { satisfied: true, checked: true, reason: null };
  return {
    satisfied: false,
    checked: true,
    reason: `Prerequisite not yet met: ${course.prerequisite}`,
  };
}
