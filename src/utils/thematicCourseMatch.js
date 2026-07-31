// AI-First Onboarding, Stage 3 (see CLAUDE.md), Task 3 — the one deterministic, JS-side piece that
// turns the Stage 2/3 conversation's own thematic keywords (e.g. "Sociology", "Economics",
// "Statistics" — plain real subject-area labels the model proposes, NOT specific course ids, since
// the model has no reliable knowledge of this app's exact course catalog) into REAL matching course
// objects, by cross-referencing them against the ACTUAL, already-existing catalog (Roslyn's
// courses.js or UC Davis's ucdavisCourses.js) rather than trusting the model to name real courses
// directly — the same "don't let an AI-generated value stand in for real data when real data is
// available" posture this app already holds elsewhere (the chain-attachment suggestion's own
// "student picks the date, not the AI," the honesty guardrails throughout every AI feature).
//
// Matches a theme keyword as a case-insensitive substring against a course's own real `name` OR
// `department` field. Checking both (rather than just one) is what makes this work correctly
// against BOTH real catalogs despite their genuinely different granularity: Roslyn's departments
// are broad (e.g. "Social Studies" covers Economics/Psychology/Government all at once), so a real
// match there has to come from the course's own specific NAME instead (e.g. "Economics",
// "AP Psychology"); UC Davis's departments are already subject-precise (e.g. "Economics",
// "Psychology" are each their own department), so a real match there often comes from the
// DEPARTMENT field directly. A theme with no honest match in a given catalog (confirmed directly:
// neither catalog has a course literally named/departmented "Sociology") correctly returns nothing
// for that catalog — the same "don't force a fit, an empty result is the honest one" precedent this
// app's own courseRecommendations.js (Culinary Arts' own deliberately-empty TRACK_RECOMMENDED_
// COURSES.culinary) and ucdavisCourseRecommendations.js already established, never fabricated.
export function getThematicCourseMatches(themes, courses) {
  if (!Array.isArray(themes) || themes.length === 0 || !Array.isArray(courses)) return [];
  const lowerThemes = themes
    .filter((t) => typeof t === 'string' && t.trim())
    .map((t) => t.trim().toLowerCase());
  if (lowerThemes.length === 0) return [];
  return courses.filter((c) => lowerThemes.some((theme) => (
    (c.name && c.name.toLowerCase().includes(theme))
    || (c.department && c.department.toLowerCase().includes(theme))
  )));
}
