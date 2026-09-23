import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getOrgInitials } from '../utils/adminOrgProfile';
import { formatDate } from '../utils/dates';
import AdminMilestoneTimeline from './AdminMilestoneTimeline';

const TYPES = [
  { key: 'Competition', desc: 'Scored event with rounds or judging' },
  { key: 'Workshop', desc: 'Practice, training, or a meeting' },
  { key: 'Program', desc: 'Ongoing series or season' },
  { key: 'Deadline', desc: 'A single due date for members' },
];
const VISIBILITY_OPTIONS = ['All members', 'Invite only', 'Public'];
const PRESET_MILESTONES = ['Registration opens', 'Registration closes', 'Payment due', 'Event day', 'Results posted'];
const STEP_META = [
  { label: 'Basics', sub: 'Name, type, place', title: 'Start with the basics', hint: "This is what members see first in their feed." },
  { label: 'Milestones', sub: 'Key dates', title: 'Set the dates that matter', hint: "Each milestone appears on members' timelines." },
  { label: 'Details', sub: 'Description & access', title: 'Add the details', hint: 'Explain the event and choose who can see it.' },
  { label: 'Review', sub: 'Check & publish', title: 'Review and publish', hint: 'Make sure everything looks right.' },
];

function initialDraft(opp, org, makeId, makeMilestoneId) {
  if (opp && opp.id) {
    return {
      id: opp.id,
      name: opp.name || '',
      type: opp.type || 'Competition',
      location: opp.location || '',
      howToApply: opp.howToApply || '',
      track: opp.track || '',
      description: opp.description || '',
      visibility: opp.visibility || 'All members',
      milestones: (opp.milestones && opp.milestones.length ? opp.milestones : []).map((m) => ({ ...m })),
    };
  }
  return {
    id: makeId(),
    name: '',
    type: 'Competition',
    location: '',
    howToApply: '',
    track: org.track || '',
    description: '',
    visibility: 'All members',
    milestones: [
      { id: makeMilestoneId(), label: 'Registration opens', date: '' },
      { id: makeMilestoneId(), label: 'Event day', date: '' },
    ],
  };
}

// Implement New Admin Dashboard (see CLAUDE.md), Task 1 — the full-page "add new event" editor, a
// real 4-step wizard (Basics -> Milestones -> Details -> Review) matching the attached Claude
// Design's own structure closely: a left step rail, the current step's form in the center, and a
// live "student view" preview on the right. Portaled to `document.body` (this screen — like every
// other `.screen-transition`-wrapped screen in this app — makes an ancestor a containing block for
// `position: fixed` descendants; see SelectedItemsPanel.jsx's own header comment for the full
// landmine this works around).
//
// The draft's own field NAMES intentionally match the real, already-working pipeline exactly
// (`name`/`type`/`description`/`track`/`howToApply`/`milestones`, plus `location`/`visibility`,
// both purely descriptive/additive) — never a differently-named "title" field translated at save
// time, which would risk a silent mismatch against roadmapGenerator.js's `buildAdminOpportunityItems`/
// OpportunityFinderScreen.jsx's `mapAdminOpportunity` (Task 3's own hard requirement).
export default function AdminEventEditor({
  org, profile, accent, initialOpportunity, onClose, onSave, makeId, makeMilestoneId,
}) {
  const [draft, setDraft] = useState(() => initialDraft(initialOpportunity, org, makeId, makeMilestoneId));
  const [step, setStep] = useState(0);
  const isNew = !initialOpportunity || !initialOpportunity.id;
  const wasPublished = initialOpportunity && initialOpportunity.status === 'Published';

  const upd = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updMilestone = (id, patch) => setDraft((d) => ({ ...d, milestones: d.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const removeMilestone = (id) => setDraft((d) => ({ ...d, milestones: d.milestones.filter((m) => m.id !== id) }));
  const addMilestone = (label = '') => {
    const sorted = [...draft.milestones].filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
    const lastDate = sorted.length ? sorted[sorted.length - 1].date : null;
    let date = '';
    if (lastDate) {
      const d = new Date(`${lastDate}T00:00:00`);
      d.setDate(d.getDate() + 14);
      date = d.toISOString().slice(0, 10);
    }
    setDraft((d) => ({ ...d, milestones: [...d.milestones, { id: makeMilestoneId(), label, date }] }));
  };

  const titleValid = draft.name.trim().length > 0;

  const attemptSave = (status) => {
    if (!titleValid) { setStep(0); return; }
    const validMilestones = draft.milestones.filter((m) => m.label.trim() && m.date);
    onSave({
      ...draft,
      name: draft.name.trim(),
      howToApply: draft.howToApply.trim() || `Contact ${profile.name} for details.`,
      milestones: [...validMilestones].sort((a, b) => a.date.localeCompare(b.date)),
    }, status);
  };

  const today = new Date();
  const sortedMilestones = [...draft.milestones].filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const nextMilestone = sortedMilestones.find((m) => new Date(`${m.date}T00:00:00`) >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) || null;

  const availablePresets = PRESET_MILESTONES.filter((p) => !draft.milestones.some((m) => m.label === p));

  const rangeText = sortedMilestones.length
    ? (sortedMilestones.length > 1
      ? `${sortedMilestones.length} · ${formatDate(new Date(`${sortedMilestones[0].date}T00:00:00`))} → ${formatDate(new Date(`${sortedMilestones[sortedMilestones.length - 1].date}T00:00:00`))}`
      : `1 · ${formatDate(new Date(`${sortedMilestones[0].date}T00:00:00`))}`)
    : 'No dates yet';

  const summaryRows = [
    { k: 'Title', v: draft.name || 'Missing — required', bad: !titleValid, step: 0 },
    { k: 'Type', v: draft.type, step: 0 },
    { k: 'Location', v: draft.location || 'Not set', step: 0 },
    { k: 'How to apply', v: draft.howToApply || `Contact ${profile.name} for details.`, step: 0 },
    { k: 'Milestones', v: rangeText, step: 1 },
    { k: 'Visibility', v: draft.visibility, step: 2 },
  ];

  return createPortal(
    <div className="admin-editor-overlay">
      <header className="admin-editor-header">
        <button type="button" className="admin-editor-close" onClick={onClose}><X size={16} /></button>
        <div className="admin-editor-heading">{isNew ? 'New event' : 'Edit event'}</div>
        <div className="admin-editor-org-tag">
          <span className="admin-editor-org-dot" style={{ background: accent }} /> {profile.name}
        </div>
        <div className="admin-editor-header-actions">
          <button type="button" className="btn-admin-outline" onClick={() => attemptSave('Draft')}>Save as draft</button>
          <button type="button" className="btn-admin-primary" style={{ '--org-accent': accent }} onClick={() => attemptSave('Published')}>
            {wasPublished ? 'Update' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="admin-editor-body">
        <div className="admin-editor-rail">
          {STEP_META.map((s, i) => (
            <button
              type="button"
              key={s.label}
              className={`admin-editor-step${i === step ? ' active' : ''}`}
              onClick={() => setStep(i)}
            >
              <span className={`admin-editor-step-num${i < step ? ' done' : i === step ? ' current' : ''}`} style={i < step ? { background: accent } : undefined}>
                {i < step ? <Check size={13} /> : i + 1}
              </span>
              <span>
                <span className="admin-editor-step-label">{s.label}</span>
                <span className="admin-editor-step-sub">{s.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="admin-editor-content">
          <div className="admin-editor-content-inner">
            <div className="admin-editor-step-of">Step {step + 1} of 4</div>
            <h2 className="admin-editor-step-title">{STEP_META[step].title}</h2>
            <p className="admin-editor-step-hint">{STEP_META[step].hint}</p>

            {step === 0 && (
              <div className="admin-editor-fields">
                <label className="task-form-field">
                  <span className="label">Title</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => upd({ name: e.target.value })}
                    placeholder="e.g. Regional Marketing Invitational"
                    className="admin-input-lg"
                  />
                </label>
                <div>
                  <div className="field-label" style={{ marginBottom: 8 }}>Type</div>
                  <div className="admin-type-grid">
                    {TYPES.map((t) => {
                      const active = draft.type === t.key;
                      return (
                        <button
                          type="button"
                          key={t.key}
                          className={`admin-type-card${active ? ' active' : ''}`}
                          style={active ? { '--org-accent': accent } : undefined}
                          onClick={() => upd({ type: t.key })}
                        >
                          <div className="admin-type-card-label">{t.key}</div>
                          <div className="admin-type-card-desc">{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="task-form-field">
                  <span className="label">Location</span>
                  <input type="text" value={draft.location} onChange={(e) => upd({ location: e.target.value })} placeholder="Venue, room, or Online" />
                </label>
                <label className="task-form-field">
                  <span className="label">How to apply <span className="optional-badge">Optional</span></span>
                  <input type="text" value={draft.howToApply} onChange={(e) => upd({ howToApply: e.target.value })} placeholder={`e.g. Sign up through ${profile.name}`} />
                </label>
                <label className="task-form-field">
                  <span className="label">Interest track <span className="optional-badge">Optional</span></span>
                  <select value={draft.track} onChange={(e) => upd({ track: e.target.value })}>
                    <option value="">General (no track)</option>
                    {OPPORTUNITY_TRACKS.map((t) => (
                      <option key={t} value={t}>{TRACK_LABELS[t]}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="admin-editor-fields">
                <AdminMilestoneTimeline milestones={draft.milestones} accent={accent} today={today} />
                <div className="admin-card admin-milestone-editor">
                  {draft.milestones.map((m, i) => (
                    <div key={m.id} className="admin-milestone-editor-row">
                      <span className="admin-milestone-editor-idx">{String(i + 1).padStart(2, '0')}</span>
                      <input type="text" value={m.label} onChange={(e) => updMilestone(m.id, { label: e.target.value })} placeholder="Milestone name" />
                      <input type="date" value={m.date} onChange={(e) => updMilestone(m.id, { date: e.target.value })} />
                      <button type="button" className="admin-milestone-editor-remove" onClick={() => removeMilestone(m.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" className="admin-milestone-editor-add" style={{ color: accent }} onClick={() => addMilestone('')}>
                    <Plus size={14} /> Add milestone
                  </button>
                </div>
                {availablePresets.length > 0 && (
                  <div>
                    <div className="field-hint" style={{ marginBottom: 8 }}>Quick add</div>
                    <div className="admin-preset-row">
                      {availablePresets.map((p) => (
                        <button type="button" key={p} className="admin-preset-pill" onClick={() => addMilestone(p)}>+ {p}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="admin-editor-fields">
                <label className="task-form-field">
                  <span className="label">Description</span>
                  <textarea rows={5} value={draft.description} onChange={(e) => upd({ description: e.target.value })} placeholder="What should members know before signing up?" />
                </label>
                <div>
                  <div className="field-label" style={{ marginBottom: 8 }}>Who can see this</div>
                  <div className="admin-segmented">
                    {VISIBILITY_OPTIONS.map((v) => (
                      <button
                        type="button"
                        key={v}
                        className={`admin-segmented-btn${draft.visibility === v ? ' active' : ''}`}
                        onClick={() => upd({ visibility: v })}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="field-hint" style={{ marginTop: 8 }}>
                    Descriptive only in this prototype — there's no real member-account system yet
                    to actually restrict who sees what.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="admin-editor-fields">
                <div className="admin-card admin-summary-card">
                  {summaryRows.map((r) => (
                    <div className="admin-summary-row" key={r.k}>
                      <div className="admin-summary-key">{r.k}</div>
                      <div className="admin-summary-val" style={r.bad ? { color: 'var(--rust)' } : undefined}>{r.v}</div>
                      <button type="button" className="admin-link-btn" onClick={() => setStep(r.step)}>Edit</button>
                    </div>
                  ))}
                </div>
                <div className="admin-publish-note" style={{ background: `color-mix(in srgb, ${accent} 10%, var(--bloom-card))`, borderColor: `color-mix(in srgb, ${accent} 30%, var(--bloom-card-border))` }}>
                  Publishing adds this to the path of every member who can see it. Each milestone
                  becomes a real, dated step on their Academic Plan.
                </div>
              </div>
            )}

            <div className="admin-editor-footer">
              <button type="button" className="btn-admin-outline" style={{ visibility: step === 0 ? 'hidden' : 'visible' }} onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
              <button
                type="button"
                className="btn-admin-dark"
                onClick={() => (step < 3 ? setStep(step + 1) : attemptSave('Published'))}
              >
                {step < 3 ? 'Continue' : (wasPublished ? 'Update event' : 'Publish event')}
              </button>
            </div>
          </div>
        </div>

        <div className="admin-editor-preview">
          <div className="admin-preview-eyebrow">Live preview · student app</div>
          <div className="admin-student-card admin-student-card-sm">
            <div className="admin-student-card-cover" />
            <div className="admin-student-card-body">
              <div className="admin-student-card-header-row">
                <span className="admin-student-card-mini-avatar" style={{ background: accent }}>{getOrgInitials(profile.name)}</span>
                <span className="admin-student-card-org-name">{profile.name}</span>
                <span className="admin-student-pill admin-student-pill-type" style={{ background: `color-mix(in srgb, ${accent} 16%, var(--bloom-card))`, color: accent }}>
                  {draft.type}
                </span>
              </div>
              <div className="admin-student-card-title">{draft.name || 'Untitled event'}</div>
              <div className="admin-student-card-loc">{draft.location || 'Location TBA'}</div>
              <p className="admin-student-card-desc">{draft.description || 'Add a description to tell members what to expect.'}</p>
              <div className="admin-student-card-ms-list">
                {sortedMilestones.map((m) => (
                  <div className="admin-student-card-ms-row" key={m.id}>
                    <span
                      className="admin-student-card-ms-dot"
                      style={{
                        borderColor: accent,
                        background: nextMilestone && m.id === nextMilestone.id ? accent : '#fff',
                      }}
                    />
                    <span style={{ fontWeight: nextMilestone && m.id === nextMilestone.id ? 600 : 400 }}>{m.label || 'Untitled'}</span>
                    <span className="admin-student-card-ms-date">{formatDate(new Date(`${m.date}T00:00:00`))}</span>
                  </div>
                ))}
              </div>
              <div className="admin-student-card-follow">Add to my path</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
