import { Circle, PartyPopper } from 'lucide-react';
import { formatDateWithYear } from '../utils/dates';

// Digest/Checklist feature (see CLAUDE.md) — a purely presentational component. All the real
// data work (flattening the roadmap's own spine + branch steps, filtering to incomplete items,
// grouping by day-gap from the shared "today" value) happens in Roadmap.jsx, which already owns
// `configFor`/`isDone`/`toggleDone`; this component just renders whatever groups it's handed and
// forwards clicks back up via `onToggle`/`onOpen`. Task 2's own relative-label requirement
// ("Tomorrow," "In 3 days") is the one piece of real logic that lives here, since it's purely
// about display, not data.
function relativeLabel(daysUntil) {
  if (daysUntil < 0) {
    const n = Math.abs(daysUntil);
    return `${n} day${n === 1 ? '' : 's'} overdue`;
  }
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

function DigestGroup({ heading, tone, entries, onToggle, onOpen }) {
  return (
    <div className={`digest-group digest-group-${tone}`}>
      <div className="digest-group-heading">{heading}</div>
      <ul className="digest-group-items">
        {entries.map((entry) => (
          <li key={entry.item.id} className="digest-item">
            <button
              type="button"
              className="digest-item-checkbox"
              onClick={() => onToggle(entry)}
              aria-label={entry.isCheckpoint ? `Open ${entry.item.title}` : `Mark "${entry.item.title}" complete`}
              title={entry.isCheckpoint ? 'Open to complete this checkpoint' : 'Mark complete'}
            >
              <Circle size={18} />
            </button>
            <button type="button" className="digest-item-body" onClick={() => onOpen(entry)}>
              <span className="digest-item-title">{entry.item.title}</span>
              <span className="digest-item-meta">
                <span className="digest-item-tag" style={{ color: entry.cfg.color }}>{entry.cfg.label}</span>
                {' · '}
                <span className={`digest-item-relative${tone === 'overdue' ? ' overdue' : ''}`}>{relativeLabel(entry.daysUntil)}</span>
                {' · '}
                {formatDateWithYear(entry.item.date)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DigestList({ groups, onToggle, onOpen }) {
  const { overdue, today, week } = groups;
  const isEmpty = overdue.length === 0 && today.length === 0 && week.length === 0;

  if (isEmpty) {
    return (
      <div className="digest-empty">
        <PartyPopper size={30} />
        <p>Nothing due this week — good time to get ahead on something, or take a breather.</p>
      </div>
    );
  }

  return (
    <div className="digest-list">
      {overdue.length > 0 && (
        <DigestGroup heading="Overdue" tone="overdue" entries={overdue} onToggle={onToggle} onOpen={onOpen} />
      )}
      {today.length > 0 && (
        <DigestGroup heading="Today" tone="today" entries={today} onToggle={onToggle} onOpen={onOpen} />
      )}
      {week.length > 0 && (
        <DigestGroup heading="This Week" tone="week" entries={week} onToggle={onToggle} onOpen={onOpen} />
      )}
    </div>
  );
}
