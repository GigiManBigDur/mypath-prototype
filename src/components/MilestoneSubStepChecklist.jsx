import { useState } from 'react';
import {
  CheckCircle2, Circle, Pencil, Trash2, Plus, Sparkles, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import MilestonePlanningPanel from './MilestonePlanningPanel';
import { parseDateInputValue, formatDateWithYear, toDateInputValue, realAddDays, realDaysBetween } from '../utils/dates';
import { makeTaskId } from '../utils/ids';

// "Steps in this phase" gained real editing — a student can edit/remove any existing step, add
// one of their own manually, or ask the AI to add more (a genuine continuation of the SAME scoped
// planning conversation that may have created the list in the first place, not a fresh one) — none
// of which existed when this checklist was first built (it only ever supported checking items off).
// Extracted out of Roadmap.jsx into its own component specifically so this extra local state
// (which subStep is mid-edit, the add-step form, the ask-AI panel) gets a clean slate every time a
// DIFFERENT node is selected, via the parent's own `key={modalNode.id}` — Roadmap.jsx itself is
// already a very large single-file component, and threading 5+ more useState calls directly into
// it (reset by hand on every selection change) would be far more error-prone than just letting
// React's own mount/unmount lifecycle handle it.
export default function MilestoneSubStepChecklist({
  project, milestone, anchorDate, isDone, toggleDone,
}) {
  const { state, patch } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [askingAi, setAskingAi] = useState(false);
  // Real, confirmed bug fix (see MilestonePlanningPanel.jsx's own comment on `readyFloorIndex`) —
  // snapshotted ONCE, the moment the AI panel is opened, never recomputed on every render (which
  // would keep pace with the growing conversation and incorrectly exclude the very reply the
  // student just received).
  const [aiFloorIndex, setAiFloorIndex] = useState(0);

  const subSteps = milestone.subSteps || [];

  const patchSubSteps = (updater) => {
    patch({
      startedProjects: state.startedProjects.map((p) => (p.id !== project.id ? p : {
        ...p,
        overviewMilestones: p.overviewMilestones.map((m) => (m.id !== milestone.id ? m : {
          ...m, subSteps: updater(m.subSteps || []),
        })),
      })),
    });
  };

  const startEdit = (s) => { setEditingId(s.id); setEditTitle(s.title); setEditDate(s.date); };
  const cancelEdit = () => { setEditingId(null); setEditTitle(''); setEditDate(''); };
  const saveEdit = () => {
    if (!editTitle.trim() || !editDate) return;
    patchSubSteps((steps) => steps.map((s) => (s.id !== editingId ? s : { ...s, title: editTitle.trim(), date: editDate })));
    cancelEdit();
  };

  const removeSubStep = (id) => {
    patchSubSteps((steps) => steps.filter((s) => s.id !== id));
    // A removed step's own completedNodes entry is dead data once it's gone — cleaned up here
    // rather than left as a harmless-but-stale key, matching this app's own general hygiene
    // elsewhere (e.g. taskOutcomes deleting a key outright on a blank note).
    const nextCompleted = { ...state.completedNodes };
    delete nextCompleted[id];
    patch({ completedNodes: nextCompleted });
  };

  const startAdd = () => { setAdding(true); setNewTitle(''); setNewDate(toDateInputValue(anchorDate)); };
  const confirmAdd = () => {
    if (!newTitle.trim() || !newDate) return;
    patchSubSteps((steps) => [...steps, { id: makeTaskId('milestone-step'), title: newTitle.trim(), date: newDate, desc: '' }]);
    setAdding(false); setNewTitle(''); setNewDate('');
  };

  // "Ask AI to add more steps" reuses the EXACT SAME scoped planning chat/component that may have
  // generated the list in the first place — same conversation (`milestone.chatHistory`), same
  // endpoint, same UI — just APPENDING whatever it proposes instead of replacing the list. Anchored
  // at the LAST existing step's own date (not the milestone's own overall anchor date), so the
  // panel's own "must be after X" validation correctly requires new steps to land chronologically
  // after everything already here.
  const lastExistingDate = subSteps.length
    ? subSteps.reduce((latest, s) => {
      const d = parseDateInputValue(s.date);
      return d > latest ? d : latest;
    }, parseDateInputValue(subSteps[0].date))
    : anchorDate;

  const appendAiSubSteps = (subStepTitles, targetDateStr) => {
    const targetDate = parseDateInputValue(targetDateStr);
    const windowStart = realAddDays(lastExistingDate, 1);
    const totalDays = Math.max(0, realDaysBetween(targetDate, windowStart));
    const count = subStepTitles.length;
    const newSteps = subStepTitles.map((title, i) => {
      const offsetDays = count > 1 ? Math.round((totalDays * i) / (count - 1)) : totalDays;
      return { id: makeTaskId('milestone-step'), title, date: toDateInputValue(realAddDays(windowStart, offsetDays)), desc: '' };
    });
    patchSubSteps((steps) => [...steps, ...newSteps]);
    setAskingAi(false);
  };

  return (
    <div className="modal-substep-checklist">
      <div className="modal-substep-checklist-heading">Steps in this phase:</div>
      <ul>
        {subSteps.map((s) => {
          if (editingId === s.id) {
            return (
              <li key={s.id} className="modal-substep-editing">
                <input
                  type="text"
                  className="modal-substep-edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
                <input
                  type="date"
                  className="modal-substep-edit-date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <button type="button" className="modal-substep-icon-btn" onClick={saveEdit} aria-label="Save step">
                  <CheckCircle2 size={14} />
                </button>
                <button type="button" className="modal-substep-icon-btn" onClick={cancelEdit} aria-label="Cancel edit">
                  <X size={14} />
                </button>
              </li>
            );
          }
          const stepDone = isDone(s.id);
          return (
            <li key={s.id} className={stepDone ? 'done' : undefined}>
              <button
                type="button"
                className="modal-substep-checkbox"
                onClick={() => toggleDone(s.id)}
                aria-label={stepDone ? `Mark "${s.title}" incomplete` : `Mark "${s.title}" complete`}
              >
                {stepDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
              </button>
              <span className="modal-substep-title">{s.title}</span>
              <span className="modal-substep-due">{formatDateWithYear(parseDateInputValue(s.date))}</span>
              <button type="button" className="modal-substep-icon-btn" onClick={() => startEdit(s)} aria-label={`Edit "${s.title}"`}>
                <Pencil size={12} />
              </button>
              <button type="button" className="modal-substep-icon-btn" onClick={() => removeSubStep(s.id)} aria-label={`Remove "${s.title}"`}>
                <Trash2 size={12} />
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="modal-substep-add-form">
          <input
            type="text"
            placeholder="What's this step?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={confirmAdd}>Add</button>
          <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <div className="modal-substep-checklist-actions">
          <button type="button" className="btn btn-ghost" onClick={startAdd}>
            <Plus size={13} /> Add a step
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (askingAi) { setAskingAi(false); return; }
              setAiFloorIndex(milestone.chatHistory?.length || 0);
              setAskingAi(true);
            }}
          >
            <Sparkles size={13} /> {askingAi ? 'Hide AI planner' : 'Ask AI to add steps'}
          </button>
        </div>
      )}

      {askingAi && (
        <MilestonePlanningPanel
          project={project}
          milestone={milestone}
          anchorDate={lastExistingDate}
          onAttach={appendAiSubSteps}
          readyFloorIndex={aiFloorIndex}
        />
      )}
    </div>
  );
}
