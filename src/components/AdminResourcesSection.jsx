import { FileUp } from 'lucide-react';

export const RESOURCE_KINDS = ['Guide', 'Link', 'Video', 'File'];

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — "Resources," now a real kind-filterable
// card grid (Guide/Link/Video/File — matching the attached design's own categorization) instead of
// the earlier flat list, plus real "linked to [event]" context per card. Unchanged in substance
// from the prior restructure's own Resources section: still member-facing reference material, no
// roadmap wiring, `state.adminOrgResources[org.id]` unchanged in shape besides the new `kind` field.
export default function AdminResourcesSection({
  accent, resources, opportunities, kindFilter, onKindFilterChange, onAddResource, onRemoveResource,
}) {
  const filters = ['All', ...RESOURCE_KINDS].map((k) => ({
    key: k,
    label: k === 'All' ? 'All' : `${k}s`,
    count: k === 'All' ? resources.length : resources.filter((r) => (r.kind || 'Guide') === k).length,
  }));
  const shown = resources.filter((r) => kindFilter === 'All' || (r.kind || 'Guide') === kindFilter);

  const eventName = (id) => opportunities.find((o) => o.id === id)?.name;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-sub">Guides, links, and files members can open from any event.</p>
        </div>
        <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} onClick={onAddResource}>
          <FileUp size={14} /> Add resource
        </button>
      </div>

      <div className="admin-kind-filters">
        {filters.map((f) => (
          <button
            type="button"
            key={f.key}
            className={`admin-kind-pill${kindFilter === f.key ? ' active' : ''}`}
            onClick={() => onKindFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-empty-note" style={{ marginTop: 20 }}>No resources yet.</p>
      ) : (
        <div className="admin-resource-grid">
          {shown.map((r) => (
            <div className="admin-card admin-resource-card" key={r.id}>
              <div className="admin-resource-card-top">
                <span className="admin-resource-kind-tag" style={{ background: 'color-mix(in srgb, var(--org-accent, var(--bloom-accent)) 16%, var(--bloom-card))', color: 'var(--org-accent, var(--bloom-accent))', '--org-accent': accent }}>
                  {r.kind || 'Guide'}
                </span>
              </div>
              <div className="admin-resource-card-title">{r.title}</div>
              {r.description && <p className="admin-resource-card-desc">{r.description}</p>}
              {r.link && <p className="admin-resource-card-link">{r.link}</p>}
              <div className="admin-resource-card-foot">
                <span>{r.eventId ? `Linked to ${eventName(r.eventId) || 'an event'}` : 'Not linked to an event'}</span>
                <button type="button" className="admin-link-btn" onClick={() => onRemoveResource(r.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
