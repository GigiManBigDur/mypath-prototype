import { CalendarPlus, Check } from 'lucide-react';
import { formatDateWithYear } from '../utils/dates';
import { getStatusPillColors } from '../utils/adminOrgProfile';

function nextMilestone(opp) {
  const sorted = [...(opp.milestones || [])].filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const todayIso = new Date().toISOString().slice(0, 10);
  return sorted.find((m) => m.date >= todayIso) || null;
}

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — "Events & opportunities," a real filtered
// list/table of this org's own real `adminOpportunities` entries. `status` (Draft/Published) is
// purely organizational here — filtering by it never touches whether an event is selectable in
// Opportunity Finder, which stays completely unaffected regardless of status (Task 3's own explicit
// "not the underlying data or logic"). The design's own fabricated "Signups" column is replaced
// with an honest "On your plan" checkmark — see AdminOverviewSection.jsx's own header comment for
// why a real cross-student signup count isn't something this single-user, no-backend prototype can
// honestly show.
export default function AdminEventsSection({
  accent, opportunities, filter, onFilterChange, onOpenEvent, onNewEvent, onRemoveEvent, selectedOpportunityIds,
}) {
  const filters = ['All', 'Published', 'Draft'].map((f) => ({
    key: f,
    label: f === 'Draft' ? 'Drafts' : f,
    count: f === 'All' ? opportunities.length : opportunities.filter((o) => (o.status || 'Published') === f).length,
  }));
  const rows = opportunities.filter((o) => filter === 'All' || (o.status || 'Published') === filter);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 className="page-title">Events &amp; opportunities</h1>
          <p className="page-sub">Competitions, workshops, and deadlines that appear on members' paths.</p>
        </div>
        <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} onClick={onNewEvent}>
          <CalendarPlus size={14} /> New event
        </button>
      </div>

      <div className="admin-filter-tabs">
        {filters.map((f) => (
          <button
            type="button"
            key={f.key}
            className={`admin-filter-tab${filter === f.key ? ' active' : ''}`}
            style={filter === f.key ? { '--org-accent': accent } : undefined}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label} <span>{f.count}</span>
          </button>
        ))}
      </div>

      <div className="admin-card admin-events-table">
        <div className="admin-events-table-head">
          <div>Event</div><div>Next milestone</div><div>Status</div><div style={{ textAlign: 'right' }}>On your plan</div>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty-note" style={{ padding: '40px 20px', textAlign: 'center' }}>Nothing here yet.</p>
        ) : (
          rows.map((opp) => {
            const next = nextMilestone(opp);
            const status = opp.status || 'Published';
            const { bg, fg } = getStatusPillColors(status);
            const onPlan = selectedOpportunityIds.includes(opp.id);
            return (
              <div key={opp.id} className="admin-events-row-wrap">
                <button type="button" className="admin-events-row" onClick={() => onOpenEvent(opp)}>
                  <div className="admin-events-row-title">
                    <div className="admin-events-row-name">{opp.name || 'Untitled event'}</div>
                    <div className="admin-events-row-meta">{opp.type}{opp.location ? ` · ${opp.location}` : ''}</div>
                  </div>
                  <div>
                    <div>{next ? (next.label || 'Untitled milestone') : 'No upcoming dates'}</div>
                    <div className="admin-events-row-meta">
                      {next ? formatDateWithYear(new Date(`${next.date}T00:00:00`)) : '—'} · {(opp.milestones || []).length} milestone{(opp.milestones || []).length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div><span className="admin-status-pill" style={{ background: bg, color: fg }}>{status}</span></div>
                  <div className="admin-events-row-plan">{onPlan && <Check size={16} style={{ color: accent }} />}</div>
                </button>
                <button type="button" className="remove-btn admin-events-row-remove" onClick={() => onRemoveEvent(opp.id)}>Remove</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
