import { ArrowRight, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ADMIN_ORGS } from '../data/adminOrgs';
import { getBloomAccentColor } from '../components/TrackVisuals';
import { resolveOrgProfile, getOrgInitials } from '../utils/adminOrgProfile';

// Implement New Admin Dashboard, Align Colors With the Menu Screen (see CLAUDE.md), Task 1 — the
// org-selection "login" step, restructured to match the attached Claude Design's own split-panel
// layout (a branding panel + an org list) rather than the single-column page this screen used to
// be. Still exactly what it always was underneath: no password required, a stand-in for real
// per-org accounts, reached ONLY via Survey's own small "Testing as admin?" link.
//
// Task 2 — the design's own near-black `#18181B` branding panel is recolored to this app's own
// real dark ink token (`--bloom-ink`) instead, and every accent throughout (the "Admin" pill, the
// org monogram/kind label, the hover ring) reads each org's own real `brandColorKey` — one of the
// same 7 "bloom" tokens the Menu/Hub's own tile icons, interest-track badges, and every other
// repainted screen already draw from — rather than the design's own independently-invented oklch()
// hue set.
export default function AdminScreen() {
  const { state, patch } = useApp();

  const selectOrg = (orgId) => {
    patch({ adminOrgId: orgId, screen: 'adminDashboard' });
  };

  return (
    <div className="admin-login-shell">
      <div className="admin-login-brand">
        <div className="admin-login-brand-top">
          <div className="admin-login-brand-mark">
            <Compass size={18} />
            MyPath
          </div>
          <div className="admin-login-brand-tag">Admin</div>
        </div>
        <div className="admin-login-brand-copy">
          <div className="admin-login-headline">Everything your students see, managed in one place.</div>
          <p className="admin-login-sub">
            Publish events, set the dates that matter, and share the resources members need —
            straight into their MyPath.
          </p>
        </div>
        <div className="admin-login-brand-foot">Organization console · dev-only preview</div>
      </div>

      <div className="admin-login-panel">
        <div className="admin-login-panel-inner">
          <p className="admin-login-eyebrow">
            A dev-only testing convenience — no password required yet. This stands in for real
            per-org accounts, not a real login.
          </p>
          <h1 className="admin-login-title">Choose an organization</h1>

          <div className="admin-org-list">
            {ADMIN_ORGS.map((org) => {
              const profile = resolveOrgProfile(org, state);
              const accent = getBloomAccentColor(profile.brandColorKey);
              return (
                <button
                  type="button"
                  key={org.id}
                  className="admin-org-row"
                  onClick={() => selectOrg(org.id)}
                  style={{ '--org-accent': accent }}
                >
                  <div className="admin-org-row-icon">{getOrgInitials(profile.name)}</div>
                  <div className="admin-org-row-body">
                    <div className="admin-org-row-name">{profile.name}</div>
                    <div className="admin-org-row-meta">{org.parent} · {org.kind}</div>
                  </div>
                  <ArrowRight size={16} className="admin-org-row-arrow" />
                </button>
              );
            })}
          </div>

          <button type="button" className="admin-toggle-link" onClick={() => patch({ screen: 'hub' })}>
            Skip — continue to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
