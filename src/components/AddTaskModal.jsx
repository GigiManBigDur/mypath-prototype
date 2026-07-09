import { useState } from 'react';
import { X } from 'lucide-react';

// Shared name/due-date/optional-description task creation form — originally lived inline in
// Roadmap.jsx's "+ Add Task" flow, extracted so ProjectBuilderScreen's "Add a milestone" flow can
// reuse the exact same mechanism (per its spec: "no new mechanism needed") rather than
// duplicating the form. The caller owns what happens to the result — Roadmap.jsx patches a plain
// custom task; ProjectBuilderScreen patches one tagged with `parentProjectId` so it's grouped
// under a started project.
export default function AddTaskModal({
  title = 'Add a task',
  eyebrow = 'Custom task',
  eyebrowColor = 'var(--ink-soft)',
  submitLabel = 'Add task',
  onSubmit,
  onCancel,
}) {
  const [taskName, setTaskName] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskName.trim() || !taskDate) return;
    onSubmit({ title: taskName.trim(), date: taskDate, desc: taskDesc.trim() });
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        <div className="modal-eyebrow" style={{ color: eyebrowColor }}>{eyebrow}</div>
        <h2 className="modal-title">{title}</h2>
        <form onSubmit={handleSubmit}>
          <label className="task-form-field">
            <span className="label">Task name</span>
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
            <button type="submit" className="btn btn-primary" disabled={!taskName.trim() || !taskDate}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
