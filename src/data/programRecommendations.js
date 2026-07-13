// Course Selection Stage 3 extension — program-specific course recommendations, distinct from
// (and additive to) courseRecommendations.js's interest/track-based recommendations. Driven by
// the actual major(s) the student selected in Discovery (state.selectedMajorIds), not their
// broader interest tags — this is a second, more specific signal.
//
// Framing, deliberately: real admissions-research recommendations converge heavily by FIELD
// (e.g. Cornell Engineering and most other engineering programs want largely the same math/
// science foundation) rather than varying dramatically between individual schools in the same
// field. So this maps majors to a small set of admissions-research-backed PROGRAM TYPES
// ('engineering-stem' | 'business' | 'premed-healthcare' | 'creative-arts' | 'humanities-prelaw')
// and recommends courses "commonly recommended for [type] programs" — honest about the level of
// precision this actually has, never claiming to know one specific school's individual
// preference. Engineering/STEM, Business, and Pre-Med/Healthcare are grounded in real, specific
// research (Cornell's stated engineering requirements; Wharton/Haas-oriented business guidance;
// standard pre-med admissions guidance) cited in the build spec that created this file. Creative/
// Arts and Academic/Humanities/Pre-Law are the build spec's own explicitly-approved extension by
// judgment ("Arts-focused programs generally emphasize a strong portfolio... Humanities/Pre-Law-
// oriented programs generally value strong writing, history, and government coursework").
//
// A handful of majors from the tracks with no dedicated research (Sports, Culinary Arts,
// Community & Leadership, Media & Entertainment, Personal Development, Outdoors) are folded into
// the closest honestly-fitting type below by the same judgment call (e.g. Sports Management is,
// by its own description, "the business side of athletics" — a Business-type program, not a
// Healthcare/Kinesiology one). `culinary-arts` itself is deliberately left OUT of this map
// entirely — a hands-on skills-based program with no real academic-prerequisite research to
// honestly report, same "don't force a weak match" precedent as Culinary Arts' empty entry in
// courseRecommendations.js's TRACK_RECOMMENDED_COURSES.
export const PROGRAM_TYPE_LABELS = {
  'engineering-stem': 'Engineering/STEM',
  business: 'Business',
  'premed-healthcare': 'Pre-Med/Healthcare',
  'creative-arts': 'Creative/Arts',
  'humanities-prelaw': 'Academic/Humanities/Pre-Law',
};

// Optional per-type caveat, surfaced under that type's course grid — for a generic requirement
// real research names but that has no single "correct" course to recommend (e.g. "a foreign
// language" — any of Roslyn's several World Language offerings satisfies this, picking just one
// would be arbitrary, not researched).
export const PROGRAM_TYPE_NOTES = {
  'engineering-stem': "Many Engineering programs also recommend a foreign language — any of Roslyn's World Language courses satisfies this.",
  business: null,
  'premed-healthcare': 'Strong English/writing preparation is also valued by most Pre-Med programs.',
  'creative-arts': 'Arts-focused programs generally weigh a strong portfolio built through coursework like this more heavily than a specific prerequisite list.',
  'humanities-prelaw': null,
};

// major.id (src/data/majors.js) -> program type key. Every major in MAJORS is covered except
// 'culinary-arts' (see file header comment above).
export const MAJOR_TO_PROGRAM_TYPE = {
  // Business (+ Sports/Culinary/Community/Personal/Outdoors majors that are themselves
  // fundamentally management/business-operations programs)
  'business-administration': 'business',
  finance: 'business',
  economics: 'business',
  entrepreneurship: 'business',
  marketing: 'business',
  communications: 'business',
  mba: 'business',
  'ms-finance': 'business',
  'ms-marketing-analytics': 'business',
  'sports-management': 'business',
  'hospitality-management': 'business',
  'nonprofit-management': 'business',
  'human-resources': 'business',
  'tourism-management': 'business',

  // Engineering/STEM (+ Culinary/Outdoors majors that are themselves science disciplines)
  'computer-science': 'engineering-stem',
  'software-engineering': 'engineering-stem',
  'computer-engineering': 'engineering-stem',
  'mechanical-engineering': 'engineering-stem',
  'aerospace-engineering': 'engineering-stem',
  'data-science': 'engineering-stem',
  statistics: 'engineering-stem',
  'ms-ai-ml': 'engineering-stem',
  'ms-robotics': 'engineering-stem',
  'ms-data-science': 'engineering-stem',
  'food-science': 'engineering-stem',
  horticulture: 'engineering-stem',

  // Pre-Med/Healthcare
  nursing: 'premed-healthcare',
  'biology-premed': 'premed-healthcare',
  kinesiology: 'premed-healthcare',
  'md-do': 'premed-healthcare',
  'ms-physician-assistant': 'premed-healthcare',
  'msn-np': 'premed-healthcare',

  // Creative/Arts (+ Media & Entertainment's Journalism, a media-production-oriented major)
  'graphic-design': 'creative-arts',
  'film-production': 'creative-arts',
  music: 'creative-arts',
  'mfa-design': 'creative-arts',
  'mfa-film': 'creative-arts',
  'mm-composition': 'creative-arts',
  journalism: 'creative-arts',

  // Academic/Humanities/Pre-Law (+ Community & Leadership's Social Work, a
  // psychology/writing/advocacy-adjacent major)
  'political-science-prelaw': 'humanities-prelaw',
  history: 'humanities-prelaw',
  psychology: 'humanities-prelaw',
  'jd-law': 'humanities-prelaw',
  'phd-history': 'humanities-prelaw',
  'psyd-clinical-psych': 'humanities-prelaw',
  'social-work': 'humanities-prelaw',
};

// Real Roslyn course ids, grounded in the research cited above — not invented. A course id can
// appear under more than one type (e.g. AP Calculus under both Engineering/STEM and Business);
// each type's list is deduped independently, and a student with majors spanning multiple types
// sees each type's own section.
export const PROGRAM_TYPE_RECOMMENDED_COURSES = {
  'engineering-stem': [
    'math-ap-calculus-ab',
    'math-ap-calculus-bc',
    'science-ap-physics-1',
    'science-ap-physics-1-2',
    'science-ap-physics-c-mechanics-and-electricity-and-magnetism',
    'science-ap-chemistry',
    '21st-century-learning-introduction-to-java-programming-language',
    '21st-century-learning-ap-computer-science-a',
    '21st-century-learning-ap-computer-science-principles',
  ],
  business: [
    'math-ap-calculus-ab',
    'math-ap-calculus-bc',
    'math-ap-statistics',
    'business-introduction-to-business',
    'business-accounting',
    'business-business-law',
    'business-investments',
    '21st-century-learning-introduction-to-java-programming-language',
  ],
  'premed-healthcare': [
    'science-ap-biology',
    'science-ap-chemistry',
    'science-pre-med',
    'science-advanced-pre-med',
    'social-studies-ap-psychology',
    'math-ap-statistics',
    'science-ap-physics-1',
    'math-ap-calculus-ab',
  ],
  'creative-arts': [
    'art-studio-art',
    'art-intermediate-studio-art',
    'art-advanced-studio-art-pending-board-approval',
    'art-portfolio-in-two-dimensional-2-d-design',
    'art-portfolio-in-three-dimensional-3-d-design',
    'art-ap-2-d-art-design',
    'art-ap-3-d-art-design',
    'art-photography-1',
    'art-photography-2',
    'art-digital-photography-1',
    'art-digital-photography-2',
  ],
  'humanities-prelaw': [
    'english-ap-english-language-and-composition',
    'english-ap-english-literature-and-composition',
    'social-studies-ap-us-history',
    'social-studies-ap-european-history',
    'social-studies-ap-united-states-government-and-politics-fall',
    'social-studies-participation-in-government',
    'social-studies-participation-in-government-honors',
    'social-studies-csi-roslyn-investigative-law',
  ],
};

// Resolves the distinct program types reachable from the student's selected majors, in the order
// their majors were selected (same "first-introduced-first" ordering precedent
// getCareerGroups/getMajorGroups already use elsewhere in this app).
export function getSelectedProgramTypes(selectedMajorIds) {
  const types = [];
  for (const majorId of selectedMajorIds) {
    const type = MAJOR_TO_PROGRAM_TYPE[majorId];
    if (type && !types.includes(type)) types.push(type);
  }
  return types;
}

export function getProgramTypeCourses(type, getCourseById) {
  return (PROGRAM_TYPE_RECOMMENDED_COURSES[type] || []).map((id) => getCourseById(id)).filter(Boolean);
}
