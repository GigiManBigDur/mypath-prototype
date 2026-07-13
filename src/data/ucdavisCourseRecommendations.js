// UC Davis Course Selection Stage 3 — the same "field-level recommendation logic" pattern
// courseRecommendations.js already established for Roslyn (a hand-picked `{ [key]: courseId[] }`
// map plus a merge/dedupe getter), reused here keyed by this app's own MAJORS ids instead of
// interest tracks — Course Selection (Stage 3) sits after Discovery for a UC Davis student, so
// the major they already picked there is the natural recommendation driver, matching Task 1/
// Task 3's own framing ("whichever major the student selected earlier in Discovery"). Only the 7
// majors UC Davis is a real program option for (see programs.js's `levels` field / careers.js's
// CAREERS.outdoors override) have an entry — every id below is a real UCDAVIS_COURSES id from
// Stage 2's own scoped catalog, hand-picked for relevance the same judgment-call way Roslyn's
// TRACK_RECOMMENDED_COURSES was built.
export const MAJOR_RECOMMENDED_COURSES = {
  economics: [
    'ucd-ecn-001a',
    'ucd-ecn-001b',
    'ucd-ecn-100a',
    'ucd-ecn-140',
    'ucd-mgt-011a',
    'ucd-mgt-150',
    'ucd-mgt-160',
    'ucd-mgt-140',
  ],
  psychology: [
    'ucd-psc-001',
    'ucd-psc-041',
    'ucd-cgs-001',
    'ucd-psc-100',
    'ucd-psc-151',
    'ucd-psc-162',
    'ucd-psc-103a',
  ],
  'political-science-prelaw': [
    'ucd-pol-001',
    'ucd-pol-004',
    'ucd-pol-007',
    'ucd-pol-003',
    'ucd-pol-051',
    'ucd-pol-113',
    'ucd-ire-104',
  ],
  'computer-science': [
    'ucd-ecs-020',
    'ucd-ecs-032a',
    'ucd-ecs-032b',
    'ucd-ecs-036c',
    'ucd-ecs-122a',
    'ucd-ecs-150',
    'ucd-eec-018',
  ],
  'biology-premed': [
    'ucd-bis-002a',
    'ucd-bis-002b',
    'ucd-bis-002d',
    'ucd-che-002a',
    'ucd-phy-007a',
    'ucd-bis-101',
    'ucd-apc-100',
  ],
  horticulture: [
    'ucd-plb-010',
    'ucd-plb-111',
    'ucd-plb-117',
    'ucd-esm-100',
    'ucd-esm-110',
  ],
  'sustainable-agriculture-food-systems': [
    'ucd-saf-090',
    'ucd-plb-143',
    'ucd-esp-110',
    'ucd-esp-162',
    'ucd-saf-191a',
  ],
};

// Same merge/dedupe contract as courseRecommendations.js's getRecommendedCourses — a student with
// majors spanning two areas (e.g. Computer Science + Psychology) sees the union, deduped, not two
// separate lists to reconcile themselves.
export function getRecommendedUCDavisCourses(selectedMajorIds, getCourseById) {
  const ids = [...new Set(selectedMajorIds.flatMap((m) => MAJOR_RECOMMENDED_COURSES[m] || []))];
  return ids.map((id) => getCourseById(id)).filter(Boolean);
}
