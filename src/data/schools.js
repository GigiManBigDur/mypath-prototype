// Schools a student can select as their "current school" on the Survey. Only Roslyn High School
// is real for now — the UI (SchoolSearchField) is built as a search/select so more schools can be
// added here later without any component changes.
export const SCHOOLS = ['Roslyn High School'];

// The Undergraduate/Transfer analog of SCHOOLS above - only UC Davis is real for now (see
// CLAUDE.md's "UC Davis Partner School" sections). Kept as a separate list (not merged into
// SCHOOLS) since the two are scoped to different education levels and should never appear as
// options for the wrong one - SurveyScreen picks which list to pass into SchoolSearchField based
// on state.educationLevel.
export const COLLEGE_SCHOOLS = ['UC Davis'];
