import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalExit } from '../hooks/useModalExit';

// Shared name/due-date/optional-description task creation form — originally lived inline in
// Roadmap.jsx's "+ Add Task" flow, extracted so it can be reused wherever the app needs the same
// "name + date + optional notes" shape: Roadmap.jsx's own "+ Add Task", and Roadmap.jsx's
// reveal-next-step flow for a started Project Builder project (both the guide-suggested step,
// pre-filled via `initialTitle` but still fully editable, and the open-ended "add your own step"
// once a project's guide is exhausted). The caller owns what happens to the submitted
// `{ title, date, desc }` — this component has no opinion on projects/milestones/plain tasks.
//
// `isOpen` replaces the old pattern of the parent conditionally mounting/unmounting this
// component outright — an instant unmount can't play a CSS exit animation, so this component now
// stays mounted (rendering null once its own exit animation finishes, via useModalExit) and reads
// `isOpen` itself. Text props (title/eyebrow/...) are snapshotted into a ref while open so the
// closing animation still has real content to show even after the caller has already cleared
// whatever selection those props were derived from (e.g. Roadmap.jsx nulling out `projectPrompt`).
export default function AddTaskModal({
  isOpen,
  title = 'Add a task',
  eyebrow = 'Custom task',
  eyebrowColor = 'var(--ink-soft)',
  nameLabel = 'Task name',
  submitLabel = 'Add task',
  initialTitle = '',
  initialDate = '',
  initialDesc = '',
  onSubmit,
  onCancel,
}) {
  const [taskName, setTaskName] = useState(initialTitle);
  const [taskDate, setTaskDate] = useState(initialDate);
  const [taskDesc, setTaskDesc] = useState(initialDesc);
  const { rendered, closing } = useModalExit(isOpen);

  // Re-seed the form fresh every time this reopens — it stays mounted now instead of remounting,
  // so without this a second open would show whatever was left over from the previous one.
  useEffect(() => {
    if (isOpen) {
      setTaskName(initialTitle);
      setTaskDate(initialDate);
      setTaskDesc(initialDesc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const contentRef = useRef({ title, eyebrow, eyebrowColor, nameLabel, submitLabel });
  if (isOpen) contentRef.current = { title, eyebrow, eyebrowColor, nameLabel, submitLabel };
  const content = isOpen ? { title, eyebrow, eyebrowColor, nameLabel, submitLabel } : contentRef.current;

  if (!rendered) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskName.trim() || !taskDate) return;
    onSubmit({ title: taskName.trim(), date: taskDate, desc: taskDesc.trim() });
  };

  // Bug fix, found while verifying the Glassmorphism redesign, Stage 1 (see CLAUDE.md) — real,
  // confirmed to already exist on the unmodified app (via `git stash`), not something that pass
  // introduced: this component was rendered INLINE (no portal) as a direct child of whichever
  // screen calls it — fine for every Roadmap.jsx caller (Map 2 is never wrapped in
  // `.screen-transition`), but HubScreen.jsx's own "Add a Task" Quick Action also renders it, and
  // the Hub IS one of `App.jsx`'s `TRANSITION_SCREENS` — the exact same containing-block landmine
  // already documented and fixed for MascotWidget/the course detail modal elsewhere in this
  // codebase (`.screen-transition`'s own fill-mode entrance transform makes it a containing block
  // for `position: fixed` descendants), confirmed directly here too via `getBoundingClientRect()`:
  // the overlay's own `top`/`height` matched the Hub's own scrolled content box instead of the
  // real viewport. `createPortal(..., document.body)` is the same established fix every other
  // instance of this landmine in this app already uses — safe for the Roadmap.jsx callers too,
  // since portaling an already-correctly-positioned fixed overlay changes nothing about it.
  return createPortal(
    <div className={`overlay${closing ? ' overlay-exit' : ''}`} onClick={onCancel}>
      <div className={`modal${closing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        <div className="modal-eyebrow" style={{ color: content.eyebrowColor }}>{content.eyebrow}</div>
        <h2 className="modal-title">{content.title}</h2>
        <form onSubmit={handleSubmit}>
          <label className="task-form-field">
            <span className="label">{content.nameLabel}</span>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Study for biology midterm"
              required
            />
          </label>
          <label className="task-form-field">
            <span className="label">Due date</span>
            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} required />
          </label>
          <label className="task-form-field">
            <span className="label">Description (optional)</span>
            <textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Any extra notes..."
            />
          </label>
          <div className="task-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!taskName.trim() || !taskDate}>{content.submitLabel}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
