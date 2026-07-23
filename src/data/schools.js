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

// High School Selection + Transcript for Transfer Students (see CLAUDE.md) — the options for
// Transfer's own "Which high school did you attend?" survey question. A fresh, dedicated list
// rather than reusing SCHOOLS directly, so 'Other' (an honest, non-Roslyn placeholder — same
// pattern SchoolSearchField's own "No matching schools yet — more coming soon" empty state
// already establishes for schools without real data behind them) never leaks into the actual
// High-School-student "current school" field, which only ever offers real schools.
export const TRANSFER_HS_SCHOOLS = [...SCHOOLS, 'Other'];
