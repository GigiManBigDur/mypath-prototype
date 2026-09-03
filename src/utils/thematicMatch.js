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
// Renamed from `thematicCourseMatch.js` once Opportunity Finder's own Auto-Pick (see "Bring
// Selection List, Auto-Pick, Delete-All, and Descriptions to Opportunity Finder," CLAUDE.md) needed
// the identical technique applied to a completely different content type
// (`getThematicOpportunityMatches`, below) — this file now holds both real-data-matching functions
// side by side rather than duplicating the shared technique into a second file, matching this
// codebase's own "extract once, reuse everywhere" precedent (and the same reasoning
// `SelectedItemsPanel.jsx`'s own rename from `SelectedCoursesPanel.jsx` already documents: a
// genuinely shared file/component gets a genuinely neutral name, not one inherited from its first
// caller).
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

// Bring Selection List, Auto-Pick, Delete-All, and Descriptions to Opportunity Finder (see
// CLAUDE.md), Task 2 — the identical technique applied to `opportunities.js`'s own data shape
// instead of a course catalog: matches a real, AI-confirmed narrative theme keyword
// (`state.narrativeThemes`) as a case-insensitive substring against an opportunity's own `name`,
// `type`, or `description` (an opportunity has no `department` field the way a course does, so
// `type` — e.g. "Business Competition," "Volunteer Program" — is the closest real analog, checked
// alongside `name`/`description` for the same reason `getThematicCourseMatches` checks two fields:
// different real content reads more naturally from different fields). This is the DEEPEST, most
// direct "narrative alignment" signal Opportunity Finder's own Auto-Pick reaches for FIRST, before
// ever falling back to the broader interest-tag/track-based "Recommended for you" pool — a theme
// with no honest match anywhere in a given opportunity pool correctly returns nothing, the same
// "don't force a fit" posture `getThematicCourseMatches` already established, never fabricated.
export function getThematicOpportunityMatches(themes, opportunities) {
  if (!Array.isArray(themes) || themes.length === 0 || !Array.isArray(opportunities)) return [];
  const lowerThemes = themes
    .filter((t) => typeof t === 'string' && t.trim())
    .map((t) => t.trim().toLowerCase());
  if (lowerThemes.length === 0) return [];
  return opportunities.filter((o) => lowerThemes.some((theme) => (
    (o.name && o.name.toLowerCase().includes(theme))
    || (o.type && o.type.toLowerCase().includes(theme))
    || (o.description && o.description.toLowerCase().includes(theme))
  )));
}
