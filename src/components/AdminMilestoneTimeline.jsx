import { realDaysBetween, formatDate } from '../utils/dates';

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — the real timeline visualization for an
// event's milestones, shown at the top of the editor's own Milestones step. Every dot's horizontal
// position is computed from REAL day-gaps between milestone dates (via `realDaysBetween`), never
// eyeballed or hand-tuned per-position the way the attached design's own `first ? -8px : last ?
// -112px : -60px` label-offset heuristic was — matching this app's own established "compute
// positions from real data, don't fake them" discipline (WelcomeScreen's trail markers,
// Roadmap.jsx's own node placement). Labels alternate between a row above and below the dot line
// (by index parity) rather than trying to dodge overlap with hand-picked left/right/center text
// alignment per position — simpler and robust regardless of how many milestones exist or how close
// together their real dates land.
export default function AdminMilestoneTimeline({ milestones, accent, today }) {
  const sorted = [...milestones].filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  const firstDate = new Date(`${sorted[0].date}T00:00:00`);
  const lastDate = new Date(`${sorted[sorted.length - 1].date}T00:00:00`);
  const span = Math.max(1, realDaysBetween(lastDate, firstDate));

  const posFor = (dateStr) => {
    if (sorted.length === 1) return 50;
    const d = new Date(`${dateStr}T00:00:00`);
    const days = realDaysBetween(d, firstDate);
    return 4 + (92 * days) / span;
  };

  const todayWithinRange = today >= firstDate && today <= lastDate && sorted.length > 1;
  const todayPos = todayWithinRange ? posFor(today.toISOString().slice(0, 10)) : null;

  const rangeLabel = sorted.length > 1
    ? `Spans ${span} day${span === 1 ? '' : 's'} · ${formatDate(firstDate)} → ${formatDate(lastDate)}`
    : formatDate(firstDate);

  return (
    <div className="admin-card admin-timeline-card">
      <div className="admin-timeline-track-wrap">
        <div className="admin-timeline-line" />
        {todayWithinRange && (
          <div className="admin-timeline-today" style={{ left: `${todayPos}%` }} />
        )}
        {sorted.map((m, i) => (
          <div className="admin-timeline-point" key={m.id} style={{ left: `${posFor(m.date)}%` }}>
            <span className="admin-timeline-dot" style={{ borderColor: accent }} />
            <span className={`admin-timeline-label${i % 2 ? ' below' : ''}`}>
              <span className="admin-timeline-label-name">{m.label || 'Untitled'}</span>
              <span className="admin-timeline-label-date">{formatDate(new Date(`${m.date}T00:00:00`))}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="admin-timeline-foot">
        <span>{rangeLabel}</span>
        <span>{sorted.length} dated</span>
      </div>
    </div>
  );
}
