// Admin Toggle, Opportunity Admin Page, Labeled Classroom Mockup (see CLAUDE.md), Task 3 — a
// small, fixed, realistic-looking template for the "Connect Google Classroom" demo mockup. Plain
// data, no logic, matching this codebase's own "data files stay free of logic, screens own the
// resolution logic" convention (courses.js, opportunities.js, ...). `offsetDays` is resolved into
// a real date at click time (AdminScreen.jsx), relative to whatever day the demo is actually
// connected — never a stored, fixed calendar date, since this is meant to always look like a
// freshly-synced set of upcoming assignments whenever a tester connects it.
export const CLASSROOM_DEMO_TEMPLATE = [
  { id: 'classroom-demo-1', course: 'AP Biology', title: 'Lab Report: Cellular Respiration', type: 'Assignment', offsetDays: 3 },
  { id: 'classroom-demo-2', course: 'AP US History', title: 'Reading Quiz: Ch. 12 — The Gilded Age', type: 'Quiz', offsetDays: 5 },
  { id: 'classroom-demo-3', course: 'Precalculus Honors', title: 'Problem Set 7: Trigonometric Identities', type: 'Assignment', offsetDays: 8 },
  { id: 'classroom-demo-4', course: 'English 11', title: 'Essay Draft: The Great Gatsby Symbolism', type: 'Assignment', offsetDays: 12 },
  { id: 'classroom-demo-5', course: 'AP Biology', title: 'Unit 4 Exam Review', type: 'Exam', offsetDays: 16 },
  { id: 'classroom-demo-6', course: 'Spanish III', title: 'Oral Presentation: Cultural Traditions', type: 'Assignment', offsetDays: 21 },
];
