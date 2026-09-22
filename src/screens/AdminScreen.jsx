import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ADMIN_ORGS } from '../data/adminOrgs';
import { getTrackColor } from '../components/TrackVisuals';

// Restructure Admin Panel: Org Selection + Per-Org Dashboard (see CLAUDE.md), Task 1 — this
// screen used to BE the whole admin flow, a single flat form. It's now just the entry "login"
// step: pick an organization, land on that org's own dashboard (AdminDashboardScreen.jsx). No
// password required yet — this is a stand-in for real per-org accounts, not a real login; clicking
// an organization simply sets `state.adminOrgId` and navigates forward.
//
// Reached ONLY via Survey's own small "Testing as admin?" link (no hub tile, nothing else
// navigates here) — same dev-only, not-part-of-the-real-student-experience framing the original
// single-screen panel already had, carried over unchanged.
export default function AdminScreen() {
  const { patch } = useApp();

  const selectOrg = (orgId) => {
    patch({ adminOrgId: orgId, screen: 'adminDashboard' });
  };

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back to Survey
      </button>

      <h1 className="page-title">Admin Portal</h1>
      <p className="page-sub">
        A dev-only testing convenience — not part of the real student experience. Select an
        organization below to manage its events, resources, and opportunities. No password
        required yet; this stands in for real per-org accounts, not a real login.
      </p>

      <div className="field-block">
        <div className="field-label">Organizations</div>
        <p className="field-hint">
          Starting with one real seeded example. Structured so schools, clubs, and other
          opportunity hosts can be added here later with no other changes needed.
        </p>
        <div className="admin-org-grid">
          {ADMIN_ORGS.map((org) => (
            <button
              type="button"
              key={org.id}
              className="admin-org-card"
              onClick={() => selectOrg(org.id)}
              style={org.track ? { '--track-accent': getTrackColor(org.track) } : undefined}
            >
              <div className="admin-org-card-icon"><Building2 size={22} /></div>
              <div className="admin-org-card-name">{org.name}</div>
              <div className="admin-org-card-kind">
                {org.kind}
                {org.school && ` · ${org.school}`}
              </div>
              <p className="admin-org-card-desc">{org.description}</p>
              <div className="admin-org-card-enter">
                Enter dashboard <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="admin-toggle-link" onClick={() => patch({ screen: 'hub' })}>
        Skip — continue to Hub
      </button>
    </div>
  );
}
