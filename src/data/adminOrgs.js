// Restructure Admin Panel: Org Selection + Per-Org Dashboard (see CLAUDE.md) — the fixed roster of
// organizations reachable through the admin "login" (no password yet — see AdminScreen.jsx).
// Plain data, no logic, matching this codebase's own "data files stay free of logic, screens own
// the resolution logic" convention (courses.js, opportunities.js, mascotDialogue.js, ...).
// Structured so a new organization (another club, a school, a general opportunity host) is just
// one more entry here — AdminScreen.jsx renders the whole roster generically off this array, and
// AdminDashboardScreen.jsx resolves whichever `id` got selected the same generic way, so neither
// screen needs a single line changed to add a second, third, or fiftieth organization later.
//
// `track` is one of `OPPORTUNITY_TRACKS` (interests.js) — purely a sensible default for the
// dashboard's own "add an opportunity" form (pre-fills that field so every opportunity this org
// adds doesn't start from a blank track picker), never a hard constraint; the form still lets an
// admin override it per-opportunity.
export const ADMIN_ORGS = [
  {
    id: 'roslyn-deca',
    name: 'Roslyn DECA',
    kind: 'School Club · Competitive Business & Marketing',
    school: 'Roslyn High School',
    track: 'business',
    description:
      "Roslyn High School's DECA chapter — competitive business and marketing events, chapter "
      + 'meetings, and district/regional/state competition deadlines.',
  },
];

export function getAdminOrg(id) {
  return ADMIN_ORGS.find((org) => org.id === id) || null;
}
