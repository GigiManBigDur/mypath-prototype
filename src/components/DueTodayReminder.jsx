import { Bell } from 'lucide-react';

// Delete Overlapping Node Labels + Persistent "Due Today" Reminder (see CLAUDE.md) — replaces the
// removed on-canvas "X is due today"/"N tasks due today" label text (which used to render right
// next to the "You are here" marker in Roadmap.jsx) with a genuine, persistent side reminder that
// stays visible for as long as ANY task due today remains incomplete. Deliberately has NO dismiss/
// close control anywhere on this component — the only way to make it go away is to actually mark
// the underlying task(s) complete (via the exact same real detail modal a normal node click
// already opens), matching this feature's own explicit "cannot be made to go away" requirement.
//
// `items` is derived in Roadmap.jsx from the SAME `todayCollision`/`dateClusters` data the
// on-canvas "today" marker already reads (see that file's own `todayCollision`/`todayCluster`),
// filtered to only the ones NOT YET done — a task already completed today has nothing left to
// remind about, and the component returns null the moment nothing due today remains incomplete,
// so it disappears automatically as a direct, structural consequence of completing the real
// task(s) — not from any dismiss action of its own.
export default function DueTodayReminder({ items, onOpenItem }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="due-today-reminder" role="status">
      <div className="due-today-reminder-header">
        <Bell size={15} />
        <span>{items.length === 1 ? 'Due today' : `${items.length} tasks due today`}</span>
      </div>
      <ul className="due-today-reminder-list">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onOpenItem(item)}>{item.title}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
