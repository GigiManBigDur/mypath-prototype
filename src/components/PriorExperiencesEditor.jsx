import { useState } from 'react';

// Prior Experience Collection + New Profile Page (see CLAUDE.md) — the one shared add/edit/remove
// UI for `state.priorExperiences`, used by BOTH Opportunity Finder's own one-time entry prompt and
// the new Profile screen, rather than two independently-built copies of the same form/list. This
// component has no opinion on WHERE the list lives or what happens after a change — the caller
// owns `experiences` and supplies `onAdd`/`onEdit`/`onRemove`, matching the same "shared
// presentational piece, caller owns the data" shape `AddTaskModal`/`ChatConversation` already
// established elsewhere in this app.
export default function PriorExperiencesEditor({ experiences, onAdd, onEdit, onRemove }) {
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const submitNew = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, description: draftDesc.trim() });
    setDraftName('');
    setDraftDesc('');
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditName(exp.name);
    setEditDesc(exp.description || '');
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onEdit(editingId, { name: trimmed, description: editDesc.trim() });
    setEditingId(null);
  };

  return (
    <>
      {experiences.length > 0 && (
        <div className="field-block">
          <div className="field-label">Your experiences ({experiences.length})</div>
          <div className="prior-exp-list">
            {experiences.map((exp) => (
              <div className="prior-exp-card" key={exp.id}>
                {editingId === exp.id ? (
                  <>
                    <label className="task-form-field">
                      <span className="label">Name</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="task-form-field">
                      <span className="label">
                        Brief description <span className="optional-badge">Optional</span>
                      </span>
                      <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    </label>
                    <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
                      <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                      <button type="button" className="btn btn-primary" disabled={!editName.trim()} onClick={saveEdit}>Save</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="prior-exp-name">{exp.name}</div>
                    {exp.description && <p className="prior-exp-desc">{exp.description}</p>}
                    <div className="prior-exp-actions">
                      <button type="button" className="prior-exp-edit-btn" onClick={() => startEdit(exp)}>Edit</button>
                      <button type="button" className="remove-btn" onClick={() => onRemove(exp.id)}>Remove</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="field-block">
        <div className="field-label">Add an experience</div>
        <label className="task-form-field">
          <span className="label">Name</span>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g. Varsity Soccer, Local Food Bank Volunteer"
          />
        </label>
        <label className="task-form-field">
          <span className="label">
            Brief description <span className="optional-badge">Optional</span>
          </span>
          <textarea
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="A sentence or two about what you did."
          />
        </label>
        <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn btn-primary" disabled={!draftName.trim()} onClick={submitNew}>
            + Add
          </button>
        </div>
      </div>
    </>
  );
}
