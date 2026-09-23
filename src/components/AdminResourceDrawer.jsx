import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { RESOURCE_KINDS } from './AdminResourcesSection';

const KIND_DESC = {
  Guide: 'A short written guide',
  Link: 'A web page or doc',
  Video: 'A video link',
  File: 'A file, referenced by name',
};

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — the slide-in "Add resource" drawer,
// matching the attached design's own structure: pick a kind, a title, a URL (or a plain filename
// note for "File," since this prototype has no real file storage to actually upload to — an honest
// text field standing in for one, never a fake upload control that looks functional and isn't),
// and optionally link it to one of this org's own real events. Portaled to `document.body`, same
// containing-block reasoning as AdminEventEditor.jsx.
export default function AdminResourceDrawer({ accent, orgOpportunities, onClose, onSave, makeId }) {
  const [kind, setKind] = useState('Link');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [eventId, setEventId] = useState('');

  const canSave = title.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    onSave({ id: makeId(), title: title.trim(), description: '', link: link.trim(), kind, eventId: eventId || null });
  };

  return createPortal(
    <div className="admin-drawer-overlay">
      <div className="admin-drawer-backdrop" onClick={onClose} />
      <div className="admin-drawer-panel">
        <div className="admin-drawer-head">
          <div className="admin-drawer-title">Add resource</div>
          <button type="button" className="admin-editor-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-drawer-body">
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Type</div>
            <div className="admin-type-grid">
              {RESOURCE_KINDS.map((k) => {
                const active = kind === k;
                return (
                  <button
                    type="button"
                    key={k}
                    className={`admin-type-card${active ? ' active' : ''}`}
                    style={active ? { '--org-accent': accent } : undefined}
                    onClick={() => setKind(k)}
                  >
                    <div className="admin-type-card-label">{k}</div>
                    <div className="admin-type-card-desc">{KIND_DESC[k]}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="task-form-field">
            <span className="label">Title</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finance Cluster Sample Exam" />
          </label>
          <label className="task-form-field">
            <span className="label">
              {kind === 'File' ? 'File name' : 'URL'} <span className="optional-badge">Optional</span>
            </span>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={kind === 'File' ? 'e.g. study-guide.pdf (no real upload in this prototype)' : 'https://'}
            />
          </label>
          <label className="task-form-field">
            <span className="label">Link to event <span className="optional-badge">Optional</span></span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Not linked — show in Resources only</option>
              {orgOpportunities.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-drawer-foot">
          <button type="button" className="btn-admin-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} disabled={!canSave} onClick={save}>Add resource</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
