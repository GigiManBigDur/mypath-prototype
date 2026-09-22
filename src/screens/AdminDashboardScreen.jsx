import { useEffect, useState } from 'react';
import {
  ArrowLeft, Building2, ClipboardList, MonitorPlay, Trash2, Plus, LibraryBig, Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import { OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getAdminOrg } from '../data/adminOrgs';
import { getTrackColor } from '../components/TrackVisuals';
import { CLASSROOM_DEMO_TEMPLATE } from '../data/classroomDemoData';
import { getEffectiveToday, realAddDays, toDateInputValue, formatDateWithYear, parseDateInputValue } from '../utils/dates';

// Restructure Admin Panel: Org Selection + Per-Org Dashboard (see CLAUDE.md), Task 2 — the real
// dashboard an admin lands on once they've "logged in" as an organization from AdminScreen.jsx.
// This screen is the direct successor to the old single flat "Admin Testing Panel" form — same
// underlying data/pipeline, reorganized into a scoped, sectioned dashboard:
//   1. Current events/opportunities already entered for this org (with real dates).
//   2. Resources members can use (simple linked/described entries).
//   3. Add-new, scoped to this org (writes `orgId` on every new opportunity).
//   4. The unchanged Google Classroom demo preview (Task 4 — content/labeling untouched).
//
// Task 3's own hard requirement — everything entered here flows into the EXACT SAME pipeline
// already built and tested: roadmapGenerator.js's `buildAdminOpportunityItems` and
// OpportunityFinderScreen.jsx's `mapAdminOpportunity` both read only `id`/`name`/`type`/
// `description`/`track`/`howToApply`/`milestones` off an `adminOpportunities` entry — neither one
// was touched, and neither one even looks at the new `orgId` field this screen adds. Scoping is
// therefore purely a DISPLAY/ENTRY concern layered on top of the unmodified data shape, not a
// change to the shape or the systems that consume it.

// --- Task 1: "Current events/opportunities" ----------------------------------------------------
function EventsSection({ org, opportunities, onRemove }) {
  return (
    <div className="field-block">
      <div className="field-label">
        <ClipboardList size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Current events & opportunities ({opportunities.length})
      </div>
      {opportunities.length === 0 ? (
        <p className="field-hint">
          Nothing entered yet for {org.name} — add your first event/opportunity below.
        </p>
      ) : (
        <div className="admin-dash-event-list">
          {opportunities.map((opp) => {
            const sorted = [...(opp.milestones || [])].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div
                className="admin-dash-event-card"
                key={opp.id}
                style={{ '--track-accent': getTrackColor(opp.track || org.track) }}
              >
                <div className="admin-dash-event-header">
                  <div>
                    <div className="admin-dash-event-name">{opp.name}</div>
                    <div className="admin-dash-event-type">{opp.type}</div>
                  </div>
                  <button type="button" className="remove-btn" onClick={() => onRemove(opp.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {opp.description && <p className="prior-exp-desc">{opp.description}</p>}
                <ul className="admin-dash-milestone-list">
                  {sorted.map((m) => (
                    <li key={m.id}>
                      <span>{m.label}</span>
                      <strong>{formatDateWithYear(parseDateInputValue(m.date))}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Task 1: "Add new capability, scoped to this org" ------------------------------------------
function AddOpportunityForm({ org, onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Competition');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState(org.track || '');
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

  const submit = () => {
    if (!canSubmit) return;
    const sorted = [...validMilestones].sort((a, b) => a.date.localeCompare(b.date));
    onSubmit({
      id: makeTaskId('admin-opportunity'),
      orgId: org.id,
      name: name.trim(),
      type: type.trim() || 'Competition',
      description: description.trim(),
      track: track || null,
      howToApply: howToApply.trim() || `Contact ${org.name} for details.`,
      milestones: sorted.map((m) => ({ id: m.id, label: m.label.trim(), date: m.date })),
    });
    setName('');
    setType('Competition');
    setDescription('');
    setTrack(org.track || '');
    setHowToApply('');
    setMilestones([{ id: makeTaskId('admin-milestone'), label: '', date: '' }]);
  };

  return (
    <div className="field-block">
      <div className="field-label">
        <Plus size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Add a new event or opportunity
      </div>
      <p className="field-hint">
        Enter a real event schedule (e.g. registration date, first round, regional, finals). Once
        submitted, it's associated with {org.name} and becomes selectable in Opportunity Finder
        exactly like a real opportunity — the roadmap will generate a real, dated chain leading up
        to each milestone, carrying its own "Admin-entered" badge the whole way.
      </p>

      <label className="task-form-field">
        <span className="label">Name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. District Competitive Events" />
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
        <input type="text" value={howToApply} onChange={(e) => setHowToApply(e.target.value)} placeholder={`e.g. Sign up through ${org.name}`} />
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
        <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
          + Add to {org.name}
        </button>
      </div>
    </div>
  );
}

// --- Task 1: "Resources members can use" --------------------------------------------------------
// Deliberately simple — a plain linked/described list, reusing PriorExperiencesEditor's own
// `.prior-exp-list`/`.prior-exp-card` visual language wholesale (same reasoning: a real name +
// description reads better full-width than squeezed into a fixed-column card) rather than a
// second, near-identical card component. Not wired into the roadmap pipeline at all — this is
// member-facing reference material (a national website, a rubric, a roster template), not a task.
function ResourcesSection({ org, resources, onAdd, onRemove }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const canAdd = title.trim().length > 0;
  const submit = () => {
    if (!canAdd) return;
    onAdd({ id: makeTaskId('admin-resource'), title: title.trim(), description: description.trim(), link: link.trim() });
    setTitle('');
    setDescription('');
    setLink('');
  };

  return (
    <div className="field-block">
      <div className="field-label">
        <LibraryBig size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Resources ({resources.length})
      </div>
      <p className="field-hint">
        Reference material members of {org.name} can use — a national website, a rubric, a roster
        template. Not scheduled onto anyone's plan; just linked/described for reference.
      </p>

      {resources.length === 0 ? (
        <p className="field-hint">No resources added yet.</p>
      ) : (
        <div className="prior-exp-list">
          {resources.map((r) => (
            <div className="prior-exp-card" key={r.id}>
              <div className="prior-exp-name">{r.title}</div>
              {r.description && <p className="prior-exp-desc">{r.description}</p>}
              {r.link && (
                <p className="prior-exp-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={12} /> {r.link}
                </p>
              )}
              <div className="prior-exp-actions">
                <button type="button" className="remove-btn" onClick={() => onRemove(r.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-milestone-row" style={{ gridTemplateColumns: '1fr 1fr auto', marginTop: 14 }}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
        <button type="button" className="btn btn-ghost" disabled={!canAdd} onClick={submit}>
          <Plus size={14} /> Add
        </button>
      </div>
      <label className="task-form-field" style={{ marginTop: 8 }}>
        <span className="label">
          Link <span className="optional-badge">Optional</span>
        </span>
        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="e.g. deca.org, or a doc name" />
      </label>
    </div>
  );
}

// --- Task 4: Google Classroom demo preview (content/labeling unchanged) ------------------------
function ClassroomDemoSection({ assignments, onConnect, onDisconnect }) {
  return (
    <div className="field-block">
      <div className="field-label"><MonitorPlay size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> Connect Google Classroom (Demo Preview)</div>
      <p className="field-hint">
        Populates the plan with realistic-looking mock assignments and due dates — a UI mockup
        only, never a real Classroom connection. Every resulting task is permanently labeled
        "(Demo Preview)" in its own title, carries a distinct demo badge on the roadmap, and shows
        a clear disclaimer in its own detail view — there is no way to mistake it for real data.
      </p>
      <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="btn btn-primary" onClick={onConnect}>
          <MonitorPlay size={16} /> Connect Google Classroom
        </button>
        {assignments.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={onDisconnect}>
            Disconnect / clear demo data
          </button>
        )}
      </div>
      {assignments.length > 0 && (
        <p className="field-hint" style={{ marginTop: 10 }}>
          {assignments.length} demo assignment{assignments.length === 1 ? '' : 's'} currently on the plan.
        </p>
      )}
    </div>
  );
}

export default function AdminDashboardScreen() {
  const { state, patch } = useApp();
  const org = getAdminOrg(state.adminOrgId);
  const today = getEffectiveToday(state.dateOverride);

  // Defensive: reached with no (or a no-longer-real) org selected — e.g. state restored mid-
  // session — bounce back to the selector, the same "defensive bounce to a consistent return
  // point" pattern several other screens in this app already use (TranscriptScreen, DiscoveryScreen).
  useEffect(() => {
    if (!org) patch({ screen: 'admin' });
  }, [org]);

  if (!org) return null;

  const allOpportunities = state.adminOpportunities || [];
  const orgOpportunities = allOpportunities.filter((o) => o.orgId === org.id);
  const orgResourcesMap = state.adminOrgResources || {};
  const orgResources = orgResourcesMap[org.id] || [];
  const classroomDemoAssignments = state.classroomDemoAssignments || [];

  const addOpportunity = (opp) => {
    patch({ adminOpportunities: [...allOpportunities, opp] });
  };
  const removeOpportunity = (id) => {
    patch({ adminOpportunities: allOpportunities.filter((o) => o.id !== id) });
  };

  const addResource = (resource) => {
    patch({ adminOrgResources: { ...orgResourcesMap, [org.id]: [...orgResources, resource] } });
  };
  const removeResource = (id) => {
    patch({
      adminOrgResources: { ...orgResourcesMap, [org.id]: orgResources.filter((r) => r.id !== id) },
    });
  };

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
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'admin' })}>
        <ArrowLeft size={14} /> Switch organization
      </button>

      <div className="admin-dash-header" style={{ '--track-accent': getTrackColor(org.track) }}>
        <div className="admin-dash-header-icon"><Building2 size={26} /></div>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{org.name}</h1>
          <div className="admin-dash-header-kind">
            {org.kind}
            {org.school && ` · ${org.school}`}
          </div>
        </div>
      </div>
      <p className="page-sub">
        A dev-only testing convenience — not part of the real student experience. Anything entered
        here is clearly, permanently marked as admin-entered or a demo wherever it appears on the
        real plan, so it can never be mistaken for real, verified data.
      </p>

      <EventsSection org={org} opportunities={orgOpportunities} onRemove={removeOpportunity} />

      <ResourcesSection org={org} resources={orgResources} onAdd={addResource} onRemove={removeResource} />

      <AddOpportunityForm org={org} onSubmit={addOpportunity} />

      <ClassroomDemoSection
        assignments={classroomDemoAssignments}
        onConnect={connectClassroom}
        onDisconnect={disconnectClassroom}
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue to Hub
        </button>
      </div>
    </div>
  );
}
