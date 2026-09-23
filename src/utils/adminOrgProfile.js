// Implement New Admin Dashboard, Align Colors With the Menu Screen (see CLAUDE.md) — the small
// shared resolution layer for the org-branding fields the new "Organization Profile & Branding"
// section makes editable at runtime (display name, tagline, brand color). Every screen/component
// that needs "this org's CURRENT profile" (the sidebar header, the switcher, the event editor's
// header dot, the live student-card preview, ...) calls `resolveOrgProfile` rather than reading
// `state.adminOrgProfiles` directly, so the override-merge logic lives in exactly one place.

// `state.adminOrgProfiles[org.id]` is a live-edit OVERLAY on top of the static `ADMIN_ORGS`
// defaults (adminOrgs.js) — the same "template default + a live override map keyed by id" shape
// `state.nodeDateOverrides` already establishes elsewhere in this app for a user-edited value that
// overrides a template-computed one. Only 3 fields are ever overridden (`name`/`tagline`/
// `brandColorKey`) — everything else (`parent`/`kind`/`track`) is static, structural metadata this
// prototype doesn't offer an editor for.
export function resolveOrgProfile(org, state) {
  const override = (state.adminOrgProfiles || {})[org.id] || {};
  return {
    ...org,
    name: override.name ?? org.name,
    tagline: override.tagline ?? org.tagline,
    brandColorKey: override.brandColorKey ?? org.brandColorKey,
  };
}

// Derives a 2-letter monogram directly from the CURRENT (possibly renamed) name every time,
// rather than storing it as its own separate field that could silently go stale after a rename —
// the same live-derivation the attached design's own `onOrgName` handler computes inline, just
// pulled out so both the sidebar/switcher and the Organization section's own live preview compute
// the identical value.
export function getOrgInitials(name) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return initials || '—';
}

// Status pill styling — Draft vs Published, the one real status this prototype tracks (see
// AdminEventEditor.jsx's own header comment for why a third "Closed" state was deliberately left
// out: the app's own existing real-date "deadline passed" mechanic in Opportunity Finder already
// covers that ground honestly, without inventing a second, overlapping concept). Reads the exact
// same green/yellow bloom tokens the rest of this app's own status-flavored pills already use
// (Reach/Match/Safety, "Verified"/"Admin-entered" badges) rather than a third color language.
export function getStatusPillColors(status) {
  if (status === 'Draft') {
    return { bg: 'color-mix(in srgb, var(--bloom-yellow) 22%, var(--bloom-card))', fg: 'var(--bloom-ink)' };
  }
  return { bg: 'color-mix(in srgb, var(--bloom-green) 20%, var(--bloom-card))', fg: 'var(--bloom-ink)' };
}
