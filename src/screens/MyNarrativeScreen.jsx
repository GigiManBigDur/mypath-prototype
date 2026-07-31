import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Lock, CheckCircle2, Circle, X, Pencil, Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getNarrativeProject } from '../data/projects';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { getEffectiveToday, formatDateWithYear, toDateInputValue } from '../utils/dates';
import { isMilestoneDone, attachMilestoneSubSteps, getMilestoneStatus } from '../utils/milestones';
import { useModalExit } from '../hooks/useModalExit';
import MilestonePlanningPanel from '../components/MilestonePlanningPanel';
import MilestoneSubStepChecklist from '../components/MilestoneSubStepChecklist';

// AI-First Onboarding, Stage 4 (see CLAUDE.md) — "My Narrative" is the dedicated destination for
// Stage 3's confirmed multi-year overview: its own hub tile (Task 1), the SAME Overview-card visual
///interaction pattern (locked/unlocked/click-to-preview/full-detail) already generalized across
// this app (Task 2), edit + reopen-scoped-AI-conversation per phase (Task 3, reusing the exact same
// components/mechanisms Roadmap.jsx already uses for a milestone — MilestonePlanningPanel/
// MilestoneSubStepChecklist/attachMilestoneSubSteps — with zero new interaction model), a real
// "on track" status per phase computed from the SAME shared completedNodes/subSteps data every
// other view already reads (Task 4), and the confirmed narrative summary itself (Task 5).
//
// Deliberately reads the ALREADY-RESOLVED spine (`generateRoadmap(state)`, the exact same function
// every other screen already calls) rather than re-deriving lock state/dates itself — this is what
// guarantees this screen can never drift from what the real Academic Plan roadmap shows for the
// identical phases (Task 4's own "must never be a separate, disconnected tracking system"). The
// RAW `overviewMilestones` entries (from `state.startedProjects`) are still read separately for the
// mutable fields (title, subSteps, chatHistory) that MilestonePlanningPanel/MilestoneSubStepChecklist
// write to directly — the same "resolved node for display, raw object for interactive editing"
// split Roadmap.jsx's own modal already establishes.
export default function MyNarrativeScreen() {
  const { state, patch } = useApp();
  const narrativeProject = getNarrativeProject(state);

  // Defensive only, matching this app's own established "bounce to hub if reached with mismatched
  // state" convention (TranscriptScreen.jsx/CourseSelectionScreen.jsx already do this) — the hub
  // tile itself is locked/disabled until a narrative genuinely exists, so this path is never
  // reachable in normal use, only via a restored/unusual state.
  useEffect(() => {
    if (!narrativeProject) patch({ screen: 'hub' });
  }, [narrativeProject, patch]);

  // AI-First Onboarding, Stage 5 (see CLAUDE.md), Task 2 — marks the guided sequence's own new
  // "point at My Narrative first" step as done the moment the student genuinely visits this
  // screen (the real payoff moment that step exists to lead them to), mirroring
  // TranscriptScreen.jsx's own `transcriptCompleted` write — a destination screen setting its own
  // completion flag, not a separate, guessed-at signal. Guarded so it's a one-time write, not a
  // redundant patch/localStorage write on every render.
  useEffect(() => {
    if (narrativeProject && !state.narrativeViewed) patch({ narrativeViewed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrativeProject]);

  const roadmap = useMemo(() => generateRoadmap(state), [state]);
  const today = useMemo(() => getEffectiveToday(state.dateOverride), [state.dateOverride]);

  // The resolved chain: the promoted anchor (phase 1) plus its own real branch (phases 2+), in the
  // SAME array shape every other Overview chain in this app already uses — see
  // roadmapGenerator.js's buildOverviewMilestoneChains.
  const resolvedPhases = useMemo(() => {
    if (!narrativeProject) return [];
    const anchor = roadmap.spine.find((n) => n.milestoneMeta?.projectId === narrativeProject.id);
    if (!anchor) return [];
    return [anchor, ...(anchor.steps || [])];
  }, [roadmap, narrativeProject]);

  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const selectedResolved = resolvedPhases.find((p) => p.milestoneMeta?.milestoneId === selectedPhaseId) || null;
  const selectedRaw = narrativeProject && selectedPhaseId
    ? narrativeProject.overviewMilestones.find((m) => m.id === selectedPhaseId)
    : null;
  const { rendered: modalRendered, closing: modalClosing } = useModalExit(!!selectedResolved);

  if (!narrativeProject) return null;

  const closeModal = () => setSelectedPhaseId(null);

  const updatePhaseTitle = (milestoneId, newTitle) => {
    patch({
      startedProjects: state.startedProjects.map((p) => (p.id !== narrativeProject.id ? p : {
        ...p,
        overviewMilestones: p.overviewMilestones.map((m) => (m.id !== milestoneId ? m : { ...m, title: newTitle })),
      })),
    });
  };
  const updatePhaseDate = (id, value) => {
    if (!value) return;
    patch({ nodeDateOverrides: { ...state.nodeDateOverrides, [id]: value } });
  };
  // A plain, direct complete-toggle — the same real `completedNodes` map every other view already
  // reads/writes, just without Roadmap.jsx's own extra AI-suggestion-triggering side effect
  // (`maybeTriggerSuggestion`), which is specifically scoped to that component's own closure state
  // and not something this screen's own narrower "edit + review" scope needs to replicate.
  const togglePhaseDone = (id) => {
    patch({ completedNodes: { ...state.completedNodes, [id]: !state.completedNodes[id] } });
  };

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'hub' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">My Narrative</h1>
      <p className="page-sub">
        The direction your first conversation with MyPath AI settled on, and the multi-year path
        built around it.
      </p>

      {/* Task 5 — the confirmed narrative summary itself, the connecting thread behind the phases
          below, not just a bare list with no story attached. */}
      <div className="narrative-summary-card">
        <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)' }}>Your Direction</div>
        <h2 className="narrative-summary-title">{narrativeProject.projectName}</h2>
        <p className="narrative-summary-text">{state.narrativeSummary}</p>
      </div>

      {/* Expand the Multi-Year Overview (see CLAUDE.md), Task 1 — the one distinctive capstone
          project candidate the overview identified, shown as its own real, dedicated piece of
          content (not buried inside a phase's own prose). Absent for a plan confirmed before this
          feature shipped, or the rare case the model's own response never produced one. */}
      {state.narrativeCapstoneIdea && (
        <div className="narrative-capstone-card">
          <div className="modal-eyebrow" style={{ color: 'var(--bloom-purple)' }}>Your Capstone Idea</div>
          <p className="narrative-capstone-text">{state.narrativeCapstoneIdea}</p>
        </div>
      )}

      <div className="field-block">
        <div className="field-label">Your Phases</div>
        <p className="field-hint">
          Click any phase to see its details, plan its concrete steps with the AI, or edit it
          directly. Completing a phase unlocks the next one.
        </p>

        <div className="narrative-phase-list">
          {resolvedPhases.map((node) => {
            const rawMilestone = narrativeProject.overviewMilestones.find((m) => m.id === node.milestoneMeta.milestoneId);
            const status = getMilestoneStatus(rawMilestone, state.completedNodes, today);
            return (
              <div
                key={node.id}
                className={`narrative-phase-card${node.locked ? ' locked' : ''}${status.kind === 'complete' ? ' complete' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPhaseId(node.milestoneMeta.milestoneId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPhaseId(node.milestoneMeta.milestoneId); }}
              >
                <div className="narrative-phase-icon">
                  {node.locked ? <Lock size={16} /> : status.kind === 'complete' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <div className="narrative-phase-body">
                  <div className="narrative-phase-title">
                    {/* Task 1's own "summer plans, as their own distinct category" — a real,
                        structured tag (rawMilestone.phaseType, never guessed from the title text)
                        so a summer phase reads as visually distinct from a regular academic-year
                        one at a glance. */}
                    {rawMilestone.phaseType === 'summer' && <span className="onboarding-phase-summer-tag">Summer</span>}
                    {node.title}
                  </div>
                  <div className="narrative-phase-due">Due {formatDateWithYear(node.date)}</div>
                  {!node.locked && (
                    <div className={`narrative-phase-status narrative-phase-status-${status.kind}`}>{status.label}</div>
                  )}
                  {node.locked && <div className="narrative-phase-status narrative-phase-status-locked">{node.lockedReason}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalRendered && selectedResolved && createPortal(
        <div className={`overlay${modalClosing ? ' overlay-exit' : ''}`} onClick={closeModal}>
          <div className={`modal${modalClosing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            <PhaseDetailBody
              resolved={selectedResolved}
              raw={selectedRaw}
              project={narrativeProject}
              completedNodes={state.completedNodes}
              onEditTitle={(title) => updatePhaseTitle(selectedResolved.milestoneMeta.milestoneId, title)}
              onEditDate={(value) => updatePhaseDate(selectedResolved.id, value)}
              onToggleDone={togglePhaseDone}
              onAttachSubSteps={(subStepTitles, targetDateStr) => {
                attachMilestoneSubSteps(state, patch, {
                  projectId: narrativeProject.id,
                  milestoneId: selectedResolved.milestoneMeta.milestoneId,
                  subStepTitles,
                  anchorDate: selectedResolved.date,
                  targetDateStr,
                });
                closeModal();
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Task 3 — a locked phase gets the same plain, honest "why" preview Roadmap.jsx's own
// `.locked-node-notice` treatment already establishes (title/due/desc still shown — "a locked
// thing is visible, but not interactive," per that file's own comment); an unlocked phase with no
// real subSteps yet gets the scoped AI planning conversation (MilestonePlanningPanel, reused
// directly, unmodified); an unlocked phase WITH real subSteps gets the full checklist
// (MilestoneSubStepChecklist, reused directly, unmodified) plus an editable title/date and a plain
// complete-toggle — the same three-way branch Roadmap.jsx's own modal already uses for a milestone,
// just composed here without needing any of that file's OTHER, unrelated node types.
function PhaseDetailBody({
  resolved, raw, project, completedNodes, onEditTitle, onEditDate, onToggleDone, onAttachSubSteps,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(resolved.title);

  const hasSubSteps = (raw.subSteps || []).length > 0;
  const done = isMilestoneDone(raw, completedNodes);

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed) onEditTitle(trimmed);
    setEditingTitle(false);
  };

  return (
    <>
      <div className="modal-eyebrow" style={{ color: 'var(--bloom-purple)' }}>Phase · {project.projectName}</div>

      {editingTitle ? (
        <div className="narrative-phase-title-edit">
          <input
            type="text"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
          />
          <button type="button" className="modal-substep-icon-btn" onClick={saveTitle} aria-label="Save title"><Check size={14} /></button>
          <button type="button" className="modal-substep-icon-btn" onClick={() => setEditingTitle(false)} aria-label="Cancel"><X size={14} /></button>
        </div>
      ) : (
        <h2 className="modal-title">
          {resolved.title}
          {!resolved.locked && (
            <button type="button" className="modal-substep-icon-btn narrative-phase-title-edit-btn" onClick={() => { setTitleDraft(resolved.title); setEditingTitle(true); }} aria-label="Edit phase title">
              <Pencil size={13} />
            </button>
          )}
        </h2>
      )}

      {resolved.locked ? (
        <>
          <div className="modal-due">Due {formatDateWithYear(resolved.date)}</div>
          <p className="modal-desc">{resolved.desc}</p>
          <div className="locked-node-notice">
            <Lock size={16} /> {resolved.lockedReason}
          </div>
        </>
      ) : (
        <>
          <div className="modal-edit-row">
            <label className="modal-edit-date">
              <span className="label">Due date</span>
              <input
                type="date"
                value={toDateInputValue(resolved.date)}
                onChange={(e) => onEditDate(e.target.value)}
              />
            </label>
          </div>
          {!hasSubSteps && <p className="modal-desc">{resolved.desc}</p>}

          {hasSubSteps ? (
            <MilestoneSubStepChecklist
              key={raw.id}
              project={project}
              milestone={raw}
              anchorDate={resolved.date}
              isDone={(id) => !!completedNodes[id]}
              toggleDone={onToggleDone}
            />
          ) : (
            <MilestonePlanningPanel
              project={project}
              milestone={raw}
              anchorDate={resolved.date}
              onAttach={onAttachSubSteps}
            />
          )}

          <button type="button" className={`complete-btn ${done ? 'done' : 'todo'}`} onClick={() => onToggleDone(resolved.id)}>
            <CheckCircle2 size={16} />
            {done ? 'Marked complete — undo' : 'Mark complete'}
          </button>
        </>
      )}
    </>
  );
}
