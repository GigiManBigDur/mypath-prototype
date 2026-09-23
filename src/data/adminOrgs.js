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
//
// Implement New Admin Dashboard (see CLAUDE.md) — grown from one seeded org to three (mirroring
// the Claude Design export's own mock roster, real enough to make the new sidebar's organization
// switcher genuinely demonstrable, not a one-item dead end). `parent`/`kind`/`tagline` are the
// static defaults the new Organization Profile & Branding section's own "reset to default" reads
// from; `brandColorKey` is a starting pick from the shared 7-color "bloom" accent set (Task 2 —
// see TrackVisuals.jsx's `BLOOM_ACCENT_SWATCHES`), deliberately picked distinct per org (not
// derived from `track`, which would collide two of these three on the same color) purely for
// visual variety in the switcher. Every one of these 4 fields (name/tagline/brandColorKey, plus a
// derived monogram) is admin-editable at runtime via `state.adminOrgProfiles` — see
// `utils/adminOrgProfile.js`'s `resolveOrgProfile`, which overlays any real edit on top of these
// static defaults, the same "template default + a live override map keyed by id" shape
// `nodeDateOverrides` already establishes elsewhere in this app.
export const ADMIN_ORGS = [
  {
    id: 'roslyn-deca',
    name: 'Roslyn DECA',
    parent: 'Roslyn High School',
    kind: 'Business & marketing club',
    track: 'business',
    brandColorKey: 'purple',
    tagline:
      'Preparing emerging leaders in marketing, finance, hospitality, and management.',
  },
  {
    id: 'roslyn-robotics',
    name: 'Roslyn Robotics',
    parent: 'Roslyn High School',
    kind: 'Engineering club',
    track: 'stem',
    brandColorKey: 'orange',
    tagline: 'FRC Team 5892 — we design, build, and compete, and teach anyone who wants to learn.',
  },
  {
    id: 'li-math-circuit',
    name: 'Long Island Math Circuit',
    parent: 'Independent',
    kind: 'Competition host',
    track: 'stem',
    brandColorKey: 'teal',
    tagline: 'Four rounds a year of team math competition across Long Island high schools.',
  },
];

export function getAdminOrg(id) {
  return ADMIN_ORGS.find((org) => org.id === id) || null;
}
