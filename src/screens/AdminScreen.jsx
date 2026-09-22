import { useState } from 'react';
import { ArrowLeft, ClipboardList, MonitorPlay, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import { OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { CLASSROOM_DEMO_TEMPLATE } from '../data/classroomDemoData';
import { getEffectiveToday, realAddDays, toDateInputValue, formatDateWithYear } from '../utils/dates';

// Admin Toggle, Opportunity Admin Page, Labeled Classroom Mockup (see CLAUDE.md) — a dev-only
// testing panel, reached via Survey's own small "Testing as admin?" link, deliberately NOT part of
// the real student flow (no hub tile, nothing else navigates here). Two independent sub-features:
//
// Task 2 — a form for entering a mock partner opportunity/competition with a real, multi-
// milestone event schedule. Submitting appends to `state.adminOpportunities`, which flows into the
// EXACT SAME systems real Roslyn/UC Davis opportunities do once selected in Opportunity Finder —
// see roadmapGenerator.js's own `buildAdminOpportunityItems` for how the chain/lock/rendering
// machinery is reused, and OpportunityFinderScreen.jsx for how it's merged into the real Browse/
// Recommended pools with its own honest "Admin-entered — Unverified" badge.
//
// Task 3 — a "Connect Google Classroom" button populating `state.classroomDemoAssignments` from
// classroomDemoData.js's own fixed template, resolved to real upcoming dates at click time. Every
// resulting task is unmistakably, persistently labeled as a demo (see roadmapGenerator.js's own
// `buildClassroomDemoItems`) — this section's own copy repeats that framing too.
export default function AdminScreen() {
  const { state, patch } = useApp();
  const today = getEffectiveToday(state.dateOverride);
  const adminOpportunities = state.adminOpportunities || [];
  const classroomDemoAssignments = state.classroomDemoAssignments || [];

  // --- Task 2: mock partner opportunity form -------------------------------------------------
  const [name, setName] = useState('');
  const [type, setType] = useState('Competition');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState('');
  const [howToApply, setHowToApply] = useState('');
  const [milestones, setMilestones] = useState([{ id: makeTaskId('admin-milestone'), label: '', date: '' }]);

  const addMilestoneRow = () => {
    setMilestones((prev) => [...prev, { id: makeTaskId('admin-milestone'), label: '', date: '' }]);
  };
  const removeMilestoneRow = (id) => {
    setMilestones((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));
  };
  const updateMilestoneRow = (id, field, value) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const validMilestones = milestones.filter((m) => m.label.trim() && m.date);
  const canSubmit = name.trim() && validMilestones.length > 0;

  const submitOpportunity = () => {
    if (!canSubmit) return;
    const sorted = [...validMilestones].sort((a, b) => a.date.localeCompare(b.date));
    patch({
      adminOpportunities: [
        ...adminOpportunities,
        {
          id: makeTaskId('admin-opportunity'),
          name: name.trim(),
          type: type.trim() || 'Competition',
          description: description.trim(),
          track: track || null,
          howToApply: howToApply.trim() || 'Contact your admin/testing coordinator for details.',
          milestones: sorted.map((m) => ({ id: m.id, label: m.label.trim(), date: m.date })),
        },
      ],
    });
    setName('');
    setType('Competition');
    setDescription('');
    setTrack('');
    setHowToApply('');
    setMilestones([{ id: makeTaskId('admin-milestone'), label: '', date: '' }]);
  };

  const removeOpportunity = (id) => {
    patch({ adminOpportunities: adminOpportunities.filter((o) => o.id !== id) });
  };

  // --- Task 3: Google Classroom demo mockup ---------------------------------------------------
  const connectClassroom = () => {
    patch({
      classroomDemoAssignments: CLASSROOM_DEMO_TEMPLATE.map((entry) => {
        const date = realAddDays(today, entry.offsetDays);
        return {
          id: entry.id,
          title: `${entry.course} — ${entry.title}`,
          date: toDateInputValue(date),
          desc: `${entry.type} for ${entry.course}, due ${formatDateWithYear(date)}. This is mock data from the Google Classroom demo — not a real assignment.`,
        };
      }),
    });
  };
  const disconnectClassroom = () => patch({ classroomDemoAssignments: [] });

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back to Survey
      </button>

      <h1 className="page-title">Admin Testing Panel</h1>
      <p className="page-sub">
        A dev-only testing convenience — not part of the real student experience. Anything entered
        here is clearly, permanently marked as admin-entered or a demo wherever it appears on the
        real plan, so it can never be mistaken for real, verified data.
      </p>

      <div className="field-block">
        <div className="field-label"><ClipboardList size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> Add a partner opportunity</div>
        <p className="field-hint">
          Enter a mock competition or opportunity with a real event schedule (e.g. registration
          date, first round, regional, finals). Once submitted, it becomes selectable in Opportunity
          Finder exactly like a real opportunity, and the roadmap will generate a real, dated chain
          leading up to each milestone — carrying its own "Admin-entered" badge the whole way.
        </p>

        <label className="task-form-field">
          <span className="label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regional Robotics Invitational" />
        </label>
        <label className="task-form-field">
          <span className="label">Type</span>
          <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Competition" />
        </label>
        <label className="task-form-field">
          <span className="label">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A sentence or two about what this is." />
        </label>
        <label className="task-form-field">
          <span className="label">
            Interest track <span className="optional-badge">Optional</span>
          </span>
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="">General (no track)</option>
            {OPPORTUNITY_TRACKS.map((t) => (
              <option key={t} value={t}>{TRACK_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="task-form-field">
          <span className="label">
            How to apply <span className="optional-badge">Optional</span>
          </span>
          <input type="text" value={howToApply} onChange={(e) => setHowToApply(e.target.value)} placeholder="e.g. Sign up through your school's club" />
        </label>

        <div className="field-label" style={{ marginTop: 14 }}>Event schedule</div>
        <p className="field-hint">
          Add each real milestone (registration, first round, regional, finals, ...) with its own
          real date — these become the chain's own dated prep steps, in order.
        </p>
        {milestones.map((m, i) => (
          <div key={m.id} className="admin-milestone-row">
            <input
              type="text"
              value={m.label}
              onChange={(e) => updateMilestoneRow(m.id, 'label', e.target.value)}
              placeholder={i === 0 ? 'e.g. Registration Opens' : 'e.g. Finals'}
            />
            <input
              type="date"
              value={m.date}
              onChange={(e) => updateMilestoneRow(m.id, 'date', e.target.value)}
            />
            <button type="button" className="remove-btn" onClick={() => removeMilestoneRow(m.id)} disabled={milestones.length === 1}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={addMilestoneRow} style={{ marginTop: 4 }}>
          <Plus size={14} /> Add milestone
        </button>

        <div className="task-form-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submitOpportunity}>
            + Add opportunity
          </button>
        </div>
      </div>

      {adminOpportunities.length > 0 && (
        <div className="field-block">
          <div className="field-label">Admin-entered opportunities ({adminOpportunities.length})</div>
          <div className="prior-exp-list">
            {adminOpportunities.map((opp) => (
              <div className="prior-exp-card" key={opp.id}>
                <div className="prior-exp-name">
                  {opp.name} {opp.track && <span className="optional-badge">{TRACK_LABELS[opp.track]}</span>}
                </div>
                <p className="prior-exp-desc">
                  {opp.milestones.length} milestone{opp.milestones.length === 1 ? '' : 's'}:{' '}
                  {opp.milestones.map((m) => `${m.label} (${m.date})`).join(', ')}
                </p>
                <div className="prior-exp-actions">
                  <button type="button" className="remove-btn" onClick={() => removeOpportunity(opp.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="field-block">
        <div className="field-label"><MonitorPlay size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> Connect Google Classroom (Demo Preview)</div>
        <p className="field-hint">
          Populates the plan with realistic-looking mock assignments and due dates — a UI mockup
          only, never a real Classroom connection. Every resulting task is permanently labeled
          "(Demo Preview)" in its own title, carries a distinct demo badge on the roadmap, and shows
          a clear disclaimer in its own detail view — there is no way to mistake it for real data.
        </p>
        <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn btn-primary" onClick={connectClassroom}>
            <MonitorPlay size={16} /> Connect Google Classroom
          </button>
          {classroomDemoAssignments.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={disconnectClassroom}>
              Disconnect / clear demo data
            </button>
          )}
        </div>
        {classroomDemoAssignments.length > 0 && (
          <p className="field-hint" style={{ marginTop: 10 }}>
            {classroomDemoAssignments.length} demo assignment{classroomDemoAssignments.length === 1 ? '' : 's'} currently on the plan.
          </p>
        )}
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue to Hub
        </button>
      </div>
    </div>
  );
}
