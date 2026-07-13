// Real UC Davis degree-requirement content, parsed directly from the official undergraduate
// catalog pages (catalog.ucdavis.edu/undergraduate-education/...) — not summarized from general
// knowledge, per the build spec's own explicit instruction. Every bullet below is a close
// paraphrase/quote of what each page actually states; nothing here is invented or estimated the
// way, say, ESTIMATED_COURSE_REQUEST_WINDOW in courses.js explicitly is for Roslyn.

export const GENERAL_EDUCATION_REQUIREMENTS = {
  label: 'University-wide General Education (GE) Requirements',
  source: 'catalog.ucdavis.edu/undergraduate-education/university-degree-requirements/general-education-ge-requirements/',
  sections: [
    {
      title: 'Topical Breadth — 52 units',
      items: [
        'Arts & Humanities — 12-20 units: knowledge of significant intellectual traditions, cultural achievements, and historical processes',
        'Science & Engineering — 12-20 units: knowledge of major ideas and concepts of science and engineering and their applications',
        'Social Sciences — 12-20 units: knowledge of the individual, social, political, and economic activities of people',
      ],
    },
    {
      title: 'Core Literacies — 35 units',
      items: [
        'Literacy with Words & Images — 20 units (English Composition 8, Writing Experience 6, Oral Skills/additional Writing 3, Visual Literacy 3)',
        'Civic & Cultural Literacy — 9 units (American Cultures/Governance/History 3, Domestic Diversity 3, World Cultures 3)',
        'Quantitative Literacy — at least 3 units',
        'Scientific Literacy — at least 3 units',
      ],
    },
  ],
  totalNote: 'Total: 87+ units, combining Topical Breadth (52) and Core Literacies (35). Applies to every UC Davis undergraduate regardless of major.',
};

// Keyed by the same `college` id used in ucdavisCourses.js's UCDAVIS_AREAS, so a student's
// selected major(s) resolve straight to the right card(s) with no separate lookup table.
export const COLLEGE_REQUIREMENTS = {
  'letters-science': {
    label: 'College of Letters & Science',
    source: 'catalog.ucdavis.edu/undergraduate-education/college-degree-requirements/letters-science/',
    items: [
      "Minimum 180 units for the bachelor's degree; at least 64 units must be upper division (max 225 units without special permission)",
      'Minimum 2.000 GPA for all courses counted toward the major and for all upper division courses',
      'At least 27 upper division units, including 18 upper division units in the major, completed on the Davis campus',
      'Two-course English Composition requirement (min. 6,000 words per course) — one introductory course, one upper-division course after 84 units',
      'B.S. degree: 90 units in natural sciences/mathematics; A.B. degree: fulfillment of the campus GE requirement',
      'A.B./B.A.S. only: three sequenced quarters (15 units) of one foreign language, or equivalent',
      'Maximum 6 internship units (092/192) count toward major requirements',
    ],
  },
  engineering: {
    label: 'College of Engineering',
    source: 'catalog.ucdavis.edu/undergraduate-education/college-degree-requirements/engineering/',
    items: [
      'At least 180 units under an approved Engineering curriculum',
      'Minimum 2.000 GPA for all undergraduate coursework within the College of Engineering',
      'No college-specific residence requirement beyond the university-wide one',
      'Lower-division English Composition satisfied via AP English (score 4-5), IB English (3 credits), or approved coursework with a C- or better; upper-division composition requirement varies by major (C- or better)',
      'Maximum 16 units of credit from Open Campus Program (UCDCPE) courses toward the major',
      'Catalog rights: major requirements must be completed per the catalog year of graduation or the immediately preceding academic year',
    ],
  },
  'biological-sciences': {
    label: 'College of Biological Sciences',
    source: 'catalog.ucdavis.edu/undergraduate-education/college-degree-requirements/biological-sciences/',
    items: [
      'Complete no less than 180 units (no more than 225 without Dean approval), including 64 upper division units',
      'Minimum 2.000 GPA in all courses required in the major, and a separate minimum 2.000 GPA in all Depth Subject Matter courses',
      'Minimum 3.400 GPA in the major required to enroll in 200-level (graduate) courses',
      'No college-specific residence requirement beyond the university-wide one',
      'English Composition: 8 units (4 upper division) in approved composition courses with C- or better, OR pass the English Composition Exam after 70 units',
      'B.A. only: 15 quarter units in one foreign language (or equivalent proficiency); GE requirement satisfies the breadth requirement',
      'Limits: max 1/3 of units Pass/Not Passed, max 6 units Physical Education, max 105 units from community college, max 9 units in 300-499-level courses, max 20 units of nonstandard courses (research/internship/tutoring)',
    ],
  },
  'agricultural-environmental-sciences': {
    label: 'College of Agricultural & Environmental Sciences',
    source: 'catalog.ucdavis.edu/undergraduate-education/college-degree-requirements/agricultural-environmental-sciences/',
    items: [
      'Minimum 180 quarter units for the degree (max 225 without a dean petition), with at least 54 units upper division or graduate',
      'Maximum 9 units of 200/300/400-series courses may count toward the upper-division requirement',
      'Minimum 2.000 cumulative GPA and a separate minimum 2.000 major GPA, both required for graduation eligibility',
      '35 of the final 45 units must be completed while enrolled in the college',
      'Maximum 6 units Physical Education 001/006; max 20 units combined from Internship 092/192 and similar variable-content courses (090X, 097T, 099, 190C, 190X, 197T, 199); max 12 units of Internship 092/192 combined',
      'English Composition: two courses emphasizing written/oral expression with a C- or better, OR AP/IB scores plus one course, OR passing the English Composition Exam after 70 units',
      'Catalog rights: requirements may be fulfilled using any catalog year during enrollment',
    ],
  },
  gsm: {
    label: 'Graduate School of Management (Undergraduate Business Major)',
    source: 'catalog.ucdavis.edu/undergraduate-education/college-degree-requirements/graduate-school-of-management/',
    items: [
      "Complete no less than 180 units (max 225 units in an academic career), with at least 54 upper division units",
      'Pass/Not Passed courses limited to one-third of units completed on campus',
      'Maximum 9 units of 200-series (graduate) and 300/400-series (professional) courses count toward the upper-division requirement',
      'Maximum 12 units of Internship 092/192 count toward the 180-unit total',
      'Minimum 2.000 GPA in all Depth Subject Matter courses required in the major',
      'English Composition: at least 8 units, including at least 4 upper division units',
      'A residence requirement and completion of upper-division coursework before enrolling in certain courses',
    ],
  },
};

// Maps this app's own MAJORS ids (majors.js) — specifically the ones UC Davis is a real program
// option for (see programs.js's `levels` field) — to which college's requirements above govern
// them. `economics` maps to `gsm`, not `letters-science`: this app's `economics` major displays
// as UC Davis's real "Managerial Economics" program (see programs.js), which the Graduate School
// of Management's own requirements page governs directly (confirmed by fetch — real "Business
// major" terminology and distinct unit/GPA requirements), not a general L&S Economics major.
export const MAJOR_TO_UCDAVIS_COLLEGE = {
  economics: 'gsm',
  psychology: 'letters-science',
  'political-science-prelaw': 'letters-science',
  'computer-science': 'engineering',
  'biology-premed': 'biological-sciences',
  horticulture: 'agricultural-environmental-sciences',
  'sustainable-agriculture-food-systems': 'agricultural-environmental-sciences',
};

// Every distinct college reached by the student's selected majors, in first-selected-first order
// (same convention getSelectedProgramTypes/getCareerGroups already use elsewhere in this app) —
// a student with majors spanning two of these areas (e.g. Computer Science + Psychology) sees two
// separate requirement cards, not a merged one. Majors outside the 6 UC-Davis-touched ones (or no
// majors selected yet) resolve to an empty array — the caller shows its own honest empty state,
// same "don't guess" pattern schoolRequirements.js's own empty state already uses.
export function getSelectedUCDavisColleges(selectedMajorIds) {
  const collegeIds = [];
  for (const majorId of selectedMajorIds) {
    const collegeId = MAJOR_TO_UCDAVIS_COLLEGE[majorId];
    if (collegeId && !collegeIds.includes(collegeId)) collegeIds.push(collegeId);
  }
  return collegeIds.map((id) => ({ id, ...COLLEGE_REQUIREMENTS[id] }));
}
