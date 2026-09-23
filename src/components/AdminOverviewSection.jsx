import { CalendarPlus, FileUp, MonitorPlay } from 'lucide-react';
import { formatDateWithYear, realDaysBetween } from '../utils/dates';
import { relativeLabel } from './DigestList';

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — the console's real landing section:
// a greeting, 3 real stat cards, a "Coming up" list of real upcoming milestones across this org's
// own events, a "Needs attention" panel (real drafts + real published-but-undescribed events), a
// "How students see you" branding teaser, and the unchanged Google Classroom demo preview (Task 4
// — content/labeling untouched, just relocated here since this section named no dedicated nav item
// for it, matching the task's own "wherever makes sense... e.g. accessible from the org
// dashboard").
//
// Deliberately does NOT fabricate a "member signups" stat the way the attached design's own mockup
// does — that number would require real, cross-student, backend-aggregated data this app's own
// single-user, no-backend architecture (see CLAUDE.md's own hard constraint) simply doesn't have.
// The 3rd stat here — "Selected on your plan" — is the honest, real substitute: since this
// prototype's "admin" and "student" share the exact same local browser state, it's a genuine,
// accurate count of how many of THIS org's own opportunities are currently selected in the local
// Opportunity Finder flow, not an invented number standing in for data nobody actually tracked.
export default function AdminOverviewSection({
  profile, accent, opportunities, resources, selectedOpportunityIds,
  onNewEvent, onAddResource, onOpenEvent, onGoSection,
  classroomAssignments, onConnectClassroom, onDisconnectClassroom,
}) {
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const published = opportunities.filter((o) => (o.status || 'Published') === 'Published');
  const selectedCount = opportunities.filter((o) => selectedOpportunityIds.includes(o.id)).length;

  const stats = [
    { label: 'Live events', value: published.length },
    { label: 'Resources', value: resources.length },
    { label: 'Selected on your plan', value: selectedCount },
  ];

  const upcoming = opportunities
    .flatMap((opp) => (opp.milestones || []).map((m) => ({ ...m, opp })))
    .filter((m) => m.date && new Date(`${m.date}T00:00:00`) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const attention = [
    ...opportunities.filter((o) => (o.status || 'Published') === 'Draft')
      .map((o) => ({ opp: o, note: "Still a draft — students can't see it as published yet." })),
    ...opportunities.filter((o) => (o.status || 'Published') === 'Published' && !o.description)
      .map((o) => ({ opp: o, note: 'Missing a description.' })),
  ].slice(0, 4);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <div className="admin-today">{formatDateWithYear(today)}</div>
          <h1 className="page-title">{greeting}</h1>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn-admin-outline" onClick={onAddResource}>
            <FileUp size={14} /> Add resource
          </button>
          <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} onClick={onNewEvent}>
            <CalendarPlus size={14} /> New event
          </button>
        </div>
      </div>

      <div className="admin-stat-row">
        {stats.map((st) => (
          <div className="admin-stat-cell" key={st.label}>
            <div className="admin-stat-label">{st.label}</div>
            <div className="admin-stat-value">{st.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-overview-grid">
        <div className="admin-card admin-upcoming-card">
          <div className="admin-card-head">
            <div className="admin-card-title">Coming up</div>
            <button type="button" className="admin-link-btn" onClick={() => onGoSection('events')}>All events →</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="admin-empty-note">Nothing scheduled yet.</p>
          ) : (
            <div className="admin-upcoming-list">
              {upcoming.map((m) => {
                const days = realDaysBetween(new Date(`${m.date}T00:00:00`), new Date(today.getFullYear(), today.getMonth(), today.getDate()));
                const d = new Date(`${m.date}T00:00:00`);
                return (
                  <button type="button" key={`${m.opp.id}-${m.id}`} className="admin-upcoming-row" onClick={() => onOpenEvent(m.opp)}>
                    <div className="admin-upcoming-date" style={{ '--org-accent': accent }}>
                      <span className="admin-upcoming-mon">{d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                      <span className="admin-upcoming-day">{d.getDate()}</span>
                    </div>
                    <div className="admin-upcoming-body">
                      <div className="admin-upcoming-label">{m.label || 'Untitled milestone'}</div>
                      <div className="admin-upcoming-event">{m.opp.name}</div>
                    </div>
                    <div className="admin-upcoming-rel">{relativeLabel(days)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-overview-side">
          <div className="admin-card">
            <div className="admin-card-title">Needs attention</div>
            {attention.length === 0 ? (
              <p className="admin-empty-note" style={{ marginTop: 10 }}>You're all caught up.</p>
            ) : (
              <div className="admin-attention-list">
                {attention.map(({ opp, note }, i) => (
                  <button type="button" key={`${opp.id}-${i}`} className="admin-attention-row" onClick={() => onOpenEvent(opp)}>
                    <span className="admin-attention-dot" />
                    <span>
                      <span className="admin-attention-title">{opp.name}</span>
                      <span className="admin-attention-note">{note}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="admin-branding-teaser"
            style={{ '--org-accent': accent }}
            onClick={() => onGoSection('profile')}
          >
            <div className="admin-branding-teaser-eyebrow">How students see you</div>
            <div className="admin-branding-teaser-name">{profile.name}</div>
            <p className="admin-branding-teaser-tagline">{profile.tagline}</p>
            <div className="admin-branding-teaser-cta">Edit profile →</div>
          </button>
        </div>
      </div>

      {/* Admin Toggle, Opportunity Admin Page, Labeled Classroom Mockup (see CLAUDE.md), Task 4 —
          content/labeling completely unchanged, just relocated into a real console section. */}
      <div className="admin-card admin-classroom-card">
        <div className="admin-card-title">
          <MonitorPlay size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> Connect Google Classroom (Demo Preview)
        </div>
        <p className="field-hint">
          Populates the plan with realistic-looking mock assignments and due dates — a UI mockup
          only, never a real Classroom connection. Every resulting task is permanently labeled
          "(Demo Preview)" in its own title, carries a distinct demo badge on the roadmap, and shows
          a clear disclaimer in its own detail view — there is no way to mistake it for real data.
        </p>
        <div className="admin-head-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} onClick={onConnectClassroom}>
            <MonitorPlay size={16} /> Connect Google Classroom
          </button>
          {classroomAssignments.length > 0 && (
            <button type="button" className="btn-admin-outline" onClick={onDisconnectClassroom}>
              Disconnect / clear demo data
            </button>
          )}
        </div>
        {classroomAssignments.length > 0 && (
          <p className="field-hint" style={{ marginTop: 10 }}>
            {classroomAssignments.length} demo assignment{classroomAssignments.length === 1 ? '' : 's'} currently on the plan.
          </p>
        )}
      </div>
    </div>
  );
}
