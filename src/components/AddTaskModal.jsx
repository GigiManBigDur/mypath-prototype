import { useState } from 'react';
import { X } from 'lucide-react';

// Shared name/due-date/optional-description task creation form — originally lived inline in
// Roadmap.jsx's "+ Add Task" flow, extracted so it can be reused wherever the app needs the same
// "name + date + optional notes" shape: Roadmap.jsx's own "+ Add Task", and Roadmap.jsx's
// reveal-next-step flow for a started Project Builder project (both the guide-suggested step,
// pre-filled via `initialTitle` but still fully editable, and the open-ended "add your own step"
// once a project's guide is exhausted). The caller owns what happens to the submitted
// `{ title, date, desc }` — this component has no opinion on projects/milestones/plain tasks.
export default function AddTaskModal({
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
            <span className="label">{nameLabel}</span>
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
