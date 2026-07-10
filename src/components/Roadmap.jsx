import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Circle, Flag, Star, MapPin, Compass, ListChecks, X, ZoomIn, ZoomOut, Crosshair,
  Maximize2, Minimize2, Trash2, Plus, Pencil, Rocket, ArrowLeft, RotateCcw, ChevronDown, Move,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { findProjectType } from '../data/projects';
import { PIXELS_PER_DAY } from '../utils/roadmapLayout';
import AddTaskModal from './AddTaskModal';
import { makeTaskId } from '../utils/ids';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useModalExit } from '../hooks/useModalExit';

// input[type=date] wants a plain YYYY-MM-DD string in LOCAL time — toISOString() would shift by
// the timezone offset and silently show the wrong day, so build the string from local getters.
function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const CORE_TYPE_CONFIG = {
  today: { label: 'You are here', color: '#C98A2B', Icon: Compass },
  procedure: { label: 'Step', color: '#6E7F87', Icon: Circle },
  milestone: { label: 'Milestone', color: '#2E6E5E', Icon: MapPin },
  major: { label: 'Major Goal', color: '#C98A2B', Icon: Star },
  final: { label: 'Final Goal', color: '#A6491F', Icon: Flag },
};
const OPPORTUNITY_CONFIG = { label: 'Opportunity', color: '#6E7F87', Icon: ListChecks };
const BRANCH_STEP_CONFIG = { label: 'Step', color: '#6E7F87', Icon: Circle };
const BRANCH_DEADLINE_CONFIG = { label: 'Deadline / start', color: '#A6491F', Icon: Flag };
// A student-added task, not part of the built-in plan — reuses --ink-soft (already in the design
// tokens) rather than introducing a new color, but gets its own icon and a dotted ring (in the
// JSX below) so it's visually distinct from both the solid required ring and the dashed
// opportunity ring at a glance.
const CUSTOM_CONFIG = { label: 'Custom task', color: '#4B5D54', Icon: Pencil };
// A started Project Builder project. Deliberately reuses the same ring styling as an opportunity
// chain (see the ring-drawing JSX below — 'project' isn't special-cased there, so it falls into
// the same hollow-dashed branch) per the growing-chain spec's explicit instruction to reuse
// opportunity chain/sub-branch rendering; only the icon/label/color and the projectLabel subtitle
// (below) differentiate it.
const PROJECT_CONFIG = { label: 'Project', color: '#6E7F87', Icon: Rocket };

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const VIEWPORT_HEIGHT = 620;
// Default/reset view caps how much of the timeline shows at once to at most a 2-year window
// anchored at "today", extending toward the future — auto-fitting an entire multi-year plan
// (e.g. a 9th-grade 4-year plan) zoomed out so far everything read as tiny and cramped. A plan
// that already spans 2 years or less is unaffected (see fitView).
const DEFAULT_WINDOW_DAYS = 365 * 2;

// --- Visual-polish-only entrance sequencing (from an earlier animation pass) ------------------
// This never changes what x/y a node sits at (layoutRoadmap in roadmapLayout.js is untouched) —
// it only decides, on top of those already-correct coordinates, how long to delay each node's/
// segment's reveal animation. Plays once per session (module-level flag, same pattern as
// WelcomeScreen's `hasPlayedIntro`) — returning to the Plan screen later just shows it settled,
// same as WelcomeScreen's own return-visit behavior.
let hasPlayedRoadmapEntrance = false;
const ENTRANCE_STEP_MS = 70;
const ENTRANCE_MAX_INDEX = 22; // caps stagger length on long multi-year plans
const ENTRANCE_TOTAL_MS = ENTRANCE_MAX_INDEX * ENTRANCE_STEP_MS + 800;

function entranceDelay(index, enabled) {
  return enabled ? Math.min(index, ENTRANCE_MAX_INDEX) * ENTRANCE_STEP_MS : 0;
}

// Straight-line segment length — used only to size the stroke-dash draw-in animation. The
// endpoints themselves (x1,y1,x2,y2) always come straight from roadmap.spine/branchSteps/today,
// never recomputed here.
function segLength(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function configFor(node) {
  if (node.category === 'core' || node.type === 'today') return CORE_TYPE_CONFIG[node.coreType || node.type];
  if (node.category === 'custom') return CUSTOM_CONFIG;
  if (node.category === 'project') return PROJECT_CONFIG;
  if (node.isLast) return BRANCH_DEADLINE_CONFIG;
  if (node.category === 'opportunity') return OPPORTUNITY_CONFIG;
  return BRANCH_STEP_CONFIG;
}

function line(x1, y1, x2, y2) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

// Bottom-right floating zoom-control stack needs to clear the bottom panel, which floats as an
// overlay above the canvas rather than pushing it — these are just the two resting positions for
// that stack (collapsed strip vs. expanded panel), not anything derived from real layout
// measurement, so they're kept in sync by hand with the panel's own CSS sizing.
const ZOOM_CONTROLS_BOTTOM_COLLAPSED = 84;
const ZOOM_CONTROLS_BOTTOM_EXPANDED = 240;

// The floating bottom panel covers the same region "today" and other near-term nodes render in
// by default (they're the ones closest to the bottom of the canvas, same "latitude = time"
// principle roadmapLayout.js uses everywhere) — without this, the default view would land with
// today's own node hidden and unclickable behind the panel. This only nudges fitView's *final*
// panY by a constant, leaving the zoom level, effectiveTop/windowHeight fit, and panX completely
// untouched — it's clearance for a floating control, not a change to the date-to-y mapping.
const BOTTOM_PANEL_CLEARANCE_EXPANDED = 230;
const BOTTOM_PANEL_CLEARANCE_COLLAPSED = 70;

export default function Roadmap({ roadmap, onBack, onReset }) {
  const { state, patch } = useApp();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const entranceEnabled = !reducedMotion && !hasPlayedRoadmapEntrance;
  const [selected, setSelected] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // { project, projectType, mode: 'guide' | 'choice' | 'customStep' } — the reveal-next-step
  // flow for a started project; null when no prompt is open.
  const [projectPrompt, setProjectPrompt] = useState(null);
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [dragging, setDragging] = useState(false);
  // Task 7 — true only for the short window right after a button-triggered zoom/reset, so the
  // canvas transform gets a CSS transition; manual wheel/drag/pinch clears it immediately (see
  // onWheel/onPointerMove/onTouchMove) so direct manipulation always stays instant/1:1.
  const [smoothZoom, setSmoothZoom] = useState(false);
  const smoothZoomTimer = useRef(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const dragState = useRef(null);
  const pinchState = useRef(null);

  useEffect(() => {
    if (reducedMotion || hasPlayedRoadmapEntrance) return undefined;
    const t = setTimeout(() => { hasPlayedRoadmapEntrance = true; }, ENTRANCE_TOTAL_MS);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  const isDone = (id) => !!state.completedNodes[id];
  // Completing a started project's current LAST step (its one active step — see
  // buildProjectChain in roadmapGenerator.js, `steps` grows strictly in insertion order,
  // untouched by the chronological re-sort used only for display) opens the reveal-next-step
  // prompt instead of just toggling — a project's chain never pre-populates future steps, so
  // finishing the one visible step is the trigger to reveal the next.
  const toggleDone = (id) => {
    const newValue = !state.completedNodes[id];
    patch({ completedNodes: { ...state.completedNodes, [id]: newValue } });
    if (!newValue) return;
    const project = (state.startedProjects || []).find(
      (p) => p.status !== 'completed' && p.steps.length && p.steps[p.steps.length - 1].id === id,
    );
    if (project) openNextStepPrompt(project);
  };

  const openNextStepPrompt = (project) => {
    const found = findProjectType(project.categoryId, project.projectTypeId);
    if (!found) return;
    const { projectType } = found;
    const mode = project.guideStepsUsed < projectType.steps.length ? 'guide' : 'choice';
    setSelected(null);
    setProjectPrompt({ project, projectType, mode });
  };

  // consumesGuideSlot: true for a guide-suggested step (even if the user edited/replaced its
  // wording — it still fills that guide slot), false for a step added after the guide is
  // exhausted, so guideStepsUsed only ever tracks real progress through the curated guide.
  const appendProjectStep = (title, date, consumesGuideSlot, desc) => {
    const { project } = projectPrompt;
    const newStep = { id: makeTaskId('project-step'), title, date, desc };
    patch({
      startedProjects: state.startedProjects.map((p) => (p.id === project.id
        ? { ...p, steps: [...p.steps, newStep], guideStepsUsed: consumesGuideSlot ? p.guideStepsUsed + 1 : p.guideStepsUsed }
        : p)),
    });
    setProjectPrompt(null);
  };

  const markProjectComplete = () => {
    const { project } = projectPrompt;
    patch({
      startedProjects: state.startedProjects.map((p) => (p.id === project.id ? { ...p, status: 'completed' } : p)),
    });
    setProjectPrompt(null);
  };

  // Changing a date only ever writes an override string — roadmapGenerator.js re-derives that
  // node's position from it via the exact same date-to-y path every other node uses, nothing
  // special-cased for edited nodes.
  const updateNodeDate = (id, value) => {
    if (!value) return;
    patch({ nodeDateOverrides: { ...state.nodeDateOverrides, [id]: value } });
  };
  // Required tasks get a light confirmation since removing one changes the core-progress count;
  // optional tasks (opportunity anchors and their steps) remove immediately — same distinction
  // the rest of the app already draws between required and optional nodes.
  const removeNode = (id, required) => {
    if (required && !window.confirm('This is a required step — are you sure you want to remove it?')) return;
    patch({ removedNodeIds: { ...state.removedNodeIds, [id]: true } });
    setSelected(null);
  };

  // Manual creation only (Task 1 scope) — the user fills in their own task, nothing suggested by
  // the app. Positioned via the same date-to-y path as everything else since roadmapGenerator.js
  // treats `date` as just another template input. The form itself lives in AddTaskModal, shared
  // with ProjectBuilderScreen's "Add a milestone" flow.
  const addTask = (task) => {
    patch({ customTasks: [...(state.customTasks || []), { id: makeTaskId('custom'), ...task }] });
    setShowAddForm(false);
  };

  const requiredNodes = roadmap.spine.filter((n) => n.required);
  const trunkDoneCount = requiredNodes.filter((n) => isDone(n.id)).length;
  const trunkTotal = requiredNodes.length;

  const fitView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    // `today.y` is (proportional to) the whole plan's time-span in pixels — today sits a fixed
    // BOTTOM_MARGIN above the canvas's bottom edge, and every other node's y only ever moves
    // further from today (upward) the further in the future it is. Capping how far above today.y
    // the default view starts effectively caps the default view to a window of real time, not a
    // pixel count — `effectiveTop` is 0 (i.e. this reduces to fitting the whole canvas, same as
    // before) whenever the plan's actual span is already <= DEFAULT_WINDOW_DAYS.
    const windowPixels = DEFAULT_WINDOW_DAYS * PIXELS_PER_DAY;
    const effectiveTop = Math.max(0, roadmap.today.y - windowPixels);
    const windowHeight = roadmap.canvasHeight - effectiveTop;

    const zoom = clamp(Math.min(vw / roadmap.canvasWidth, vh / windowHeight), MIN_ZOOM, 1);
    const panX = (vw - roadmap.canvasWidth * zoom) / 2;
    const panelClearance = panelCollapsed ? BOTTOM_PANEL_CLEARANCE_COLLAPSED : BOTTOM_PANEL_CLEARANCE_EXPANDED;
    const panY = (vh - windowHeight * zoom) / 2 - effectiveTop * zoom - panelClearance;
    setView({ zoom, panX, panY });
  }, [roadmap.canvasWidth, roadmap.canvasHeight, roadmap.today.y, panelCollapsed]);

  useEffect(() => { fitView(); }, [fitView]);

  const zoomAt = useCallback((cx, cy, factor) => {
    setView((v) => {
      const newZoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (cx - v.panX) / v.zoom;
      const worldY = (cy - v.panY) / v.zoom;
      return { zoom: newZoom, panX: cx - worldX * newZoom, panY: cy - worldY * newZoom };
    });
  }, []);

  // Task 7 — marks the canvas transform to transition smoothly for a short window. Only called
  // from the zoom-control buttons/reset below; wheel/drag/pinch clear it immediately instead of
  // calling it, so direct manipulation never picks up the transition.
  const markSmoothZoom = () => {
    setSmoothZoom(true);
    clearTimeout(smoothZoomTimer.current);
    smoothZoomTimer.current = setTimeout(() => setSmoothZoom(false), 280);
  };
  useEffect(() => () => clearTimeout(smoothZoomTimer.current), []);

  // Wheel (zoom) and touch (pinch) need non-passive listeners to preventDefault, which React's
  // synthetic onWheel/onTouchMove props can't reliably guarantee — attach natively instead.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      clearTimeout(smoothZoomTimer.current);
      setSmoothZoom(false);
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        pinchState.current = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          zoom: view.zoom,
          panX: view.panX,
          panY: view.panY,
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        clearTimeout(smoothZoomTimer.current);
        setSmoothZoom(false);
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const factor = dist / pinchState.current.dist;
        const rect = el.getBoundingClientRect();
        const cx = pinchState.current.midX - rect.left;
        const cy = pinchState.current.midY - rect.top;
        const newZoom = clamp(pinchState.current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const worldX = (cx - pinchState.current.panX) / pinchState.current.zoom;
        const worldY = (cy - pinchState.current.panY) / pinchState.current.zoom;
        setView({ zoom: newZoom, panX: cx - worldX * newZoom, panY: cy - worldY * newZoom });
      }
    };
    const onTouchEnd = (e) => { if (e.touches.length < 2) pinchState.current = null; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomAt, view.zoom, view.panX, view.panY]);

  // Pointer capture must NOT be grabbed on pointerdown itself — capturing immediately redirects
  // the eventual 'click' away from whatever was actually hit (a node deep inside the SVG), which
  // silently broke every node click and mark-complete toggle. Only start capturing (and panning)
  // once the pointer has actually moved past a small threshold, so a plain click always reaches
  // its real target and only a genuine drag pans the canvas.
  const DRAG_THRESHOLD = 5;
  const onPointerDown = (e) => {
    dragState.current = {
      pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
      startPanX: view.panX, startPanY: view.panY, moved: false,
    };
  };
  const onPointerMove = (e) => {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      ds.moved = true;
      setDragging(true);
      clearTimeout(smoothZoomTimer.current);
      setSmoothZoom(false);
      e.currentTarget.setPointerCapture(ds.pointerId);
    }
    setView((v) => ({ ...v, panX: ds.startPanX + dx, panY: ds.startPanY + dy }));
  };
  const onPointerUp = (e) => {
    const ds = dragState.current;
    if (ds?.moved) {
      try { e.currentTarget.releasePointerCapture(ds.pointerId); } catch { /* already released */ }
    }
    dragState.current = null;
    setDragging(false);
  };

  const zoomButton = (factor) => {
    markSmoothZoom();
    const vw = viewportRef.current?.clientWidth ?? VIEWPORT_HEIGHT;
    const vh = viewportRef.current?.clientHeight ?? VIEWPORT_HEIGHT;
    zoomAt(vw / 2, vh / 2, factor);
  };
  const handleResetView = () => {
    markSmoothZoom();
    fitView();
  };

  // Task 5 — the detail modal and the project "choice" modal both need to keep their content
  // visible while playing an exit animation, even though the state that content came from
  // (`selected` / `projectPrompt`) is nulled out the instant the user closes them. These refs
  // retain the last real value purely for rendering the closing frame(s); every click handler
  // below still reads the live `selected`/`projectPrompt` state exactly as before.
  const { rendered: selectedRendered, closing: selectedClosing } = useModalExit(!!selected);
  const lastSelectedRef = useRef(null);
  if (selected) lastSelectedRef.current = selected;
  const modalNode = selected || lastSelectedRef.current;

  const { rendered: choiceRendered, closing: choiceClosing } = useModalExit(projectPrompt?.mode === 'choice');
  const lastChoiceRef = useRef(null);
  if (projectPrompt?.mode === 'choice') lastChoiceRef.current = projectPrompt;
  const choiceNode = projectPrompt?.mode === 'choice' ? projectPrompt : lastChoiceRef.current;

  const guideStepTitle = projectPrompt?.mode === 'guide'
    ? projectPrompt.projectType.steps[projectPrompt.project.guideStepsUsed]
    : '';
  const promptProjectName = projectPrompt?.project?.projectName ?? '';

  const selectedIsAnchorOnly = modalNode?.category === 'opportunity' && modalNode?.hasBranch;
  const anchorDone = selectedIsAnchorOnly && modalNode.branchSteps
    ? modalNode.branchSteps.filter((s) => isDone(s.id)).length
    : 0;
  const anchorTotal = selectedIsAnchorOnly ? modalNode.branchSteps.length : 0;

  // The chain-starting node has no single id of its own to toggle — its "complete" state is
  // derived from its steps. Give it a real action at every state instead of a dead-end summary:
  // kick off the first step, advance to the next incomplete one, or undo the whole chain once
  // every step is done — so it responds like every other clickable node, not a lesser one.
  const advanceChain = () => {
    if (!selectedIsAnchorOnly) return;
    if (anchorDone === anchorTotal) {
      const updates = {};
      modalNode.branchSteps.forEach((s) => { updates[s.id] = false; });
      patch({ completedNodes: { ...state.completedNodes, ...updates } });
      return;
    }
    const next = modalNode.branchSteps.find((s) => !isDone(s.id));
    if (next) toggleDone(next.id);
  };
  const chainButtonLabel = anchorDone === 0
    ? 'Start'
    : anchorDone === anchorTotal
      ? 'Completed — undo'
      : `Continue — mark next step complete (${anchorDone}/${anchorTotal})`;

  // Layout-restructure-only state: the paired first-visit callouts (below) share the exact same
  // "stay mounted through an exit animation" need as every modal, so they reuse useModalExit
  // rather than a bespoke fade mechanism.
  const tooltipsOpen = !state.roadmapTooltipsSeen;
  const { rendered: tooltipsRendered, closing: tooltipsClosing } = useModalExit(tooltipsOpen);
  const dismissTooltips = () => patch({ roadmapTooltipsSeen: true });

  return (
    <div className="roadmap-fullscreen-root" ref={rootRef}>
      <div className="roadmap-viewport-wrap">
        <div
          className={`roadmap-viewport${dragging ? ' dragging' : ''}`}
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className={`roadmap-canvas-inner${smoothZoom ? ' view-smooth' : ''}`}
            style={{ transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})` }}
          >
            <svg width={roadmap.canvasWidth} height={roadmap.canvasHeight} style={{ overflow: 'visible' }}>
            {/* Spine connective line: today up through every spine item, in chronological order.
                On first load only, each segment draws in via stroke-dashoffset instead of
                appearing solid immediately — the `d`/coordinates themselves are untouched. */}
            <path
              className={entranceEnabled ? 'roadmap-draw-line' : undefined}
              style={entranceEnabled ? {
                '--seg-length': segLength(roadmap.today.x, roadmap.today.y, roadmap.spine[0]?.x ?? roadmap.today.x, roadmap.spine[0]?.y ?? roadmap.today.y),
                animationDelay: '0ms',
              } : undefined}
              d={line(roadmap.today.x, roadmap.today.y, roadmap.spine[0]?.x ?? roadmap.today.x, roadmap.spine[0]?.y ?? roadmap.today.y)}
              stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5"
            />
            {roadmap.spine.slice(0, -1).map((n, i) => {
              const next = roadmap.spine[i + 1];
              const delay = entranceDelay(i + 1, entranceEnabled);
              return (
                <path
                  key={`sp-${n.id}`}
                  className={entranceEnabled ? 'roadmap-draw-line' : undefined}
                  style={entranceEnabled ? { '--seg-length': segLength(n.x, n.y, next.x, next.y), animationDelay: `${delay}ms` } : undefined}
                  d={line(n.x, n.y, next.x, next.y)} stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5"
                />
              );
            })}

            {/* Each multi-step item's own isolated diagonal, plus the chain within it. Branch
                lines keep their permanent dashed "6 6" pattern (that's how optional branches read
                as distinct from the solid required spine), so their first-load reveal is a plain
                opacity fade rather than the dash-offset draw (which would fight that pattern). */}
            {roadmap.spine.filter((n) => n.hasBranch).map((n) => {
              const anchorIndex = roadmap.spine.indexOf(n);
              const anchorDelay = entranceDelay(anchorIndex, entranceEnabled);
              const stepDelay = (k) => anchorDelay + (k + 1) * ENTRANCE_STEP_MS;
              return (
                <g key={`branch-${n.id}`}>
                  <path
                    className={entranceEnabled ? 'roadmap-fade-line' : undefined}
                    style={entranceEnabled ? { animationDelay: `${stepDelay(0)}ms` } : undefined}
                    d={line(n.x, n.y, n.branchSteps[0].x, n.branchSteps[0].y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6"
                  />
                  {n.branchSteps.slice(0, -1).map((s, i) => {
                    const next = n.branchSteps[i + 1];
                    return (
                      <path
                        key={`bs-${s.id}`}
                        className={entranceEnabled ? 'roadmap-fade-line' : undefined}
                        style={entranceEnabled ? { animationDelay: `${stepDelay(i + 1)}ms` } : undefined}
                        d={line(s.x, s.y, next.x, next.y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Branch step nodes (hollow — optional). Labels get extra clearance beyond the dot's
                own position (in the branch's own peel direction) so they clear the spine's label
                column even when a step lands close in time to a spine item. */}
            {roadmap.spine.filter((n) => n.hasBranch).flatMap((n) => {
              const anchorIndex = roadmap.spine.indexOf(n);
              const anchorDelay = entranceDelay(anchorIndex, entranceEnabled);
              return n.branchSteps.map((s, i) => {
                const cfg = configFor(s);
                const done = isDone(s.id);
                const labelX = n.side > 0 ? 20 : -20;
                const delay = entranceEnabled ? anchorDelay + (i + 1) * ENTRANCE_STEP_MS : 0;
                return (
                  <g key={s.id} className="node-badge" onClick={() => setSelected(s)} transform={`translate(${s.x},${s.y})`}>
                    <g className="node-pop" style={{ animationDelay: `${delay}ms` }}>
                      <circle className="ring" r="13" fill={cfg.color} fillOpacity={done ? 1 : 0} stroke={cfg.color} strokeWidth="2" strokeDasharray={done ? undefined : '3 3'} pointerEvents="all" />
                      {done
                        ? <CheckCircle2 className="node-icon-pop" x="-7" y="-7" size={14} color="#fff" />
                        : <cfg.Icon className="node-icon-pop" x="-6" y="-6" size={12} color={cfg.color} />}
                    </g>
                    <text className="node-label" x={labelX} y="4" textAnchor={n.side > 0 ? 'start' : 'end'}>{s.title}</text>
                    <text className="node-due" x={labelX} y="17" textAnchor={n.side > 0 ? 'start' : 'end'}>
                      {s.category === 'project' ? `${s.projectLabel} · ${s.due}` : s.due}
                    </text>
                  </g>
                );
              });
            })}

            {/* Spine nodes: core (solid/required) and opportunity anchors (hollow/optional).
                labelSide alternates per item (spine x is always dead-center) so consecutive spine
                labels don't all pile onto one side, and a branch always peels opposite its own
                anchor's label — see roadmapLayout.js. */}
            {roadmap.spine.map((n, i) => {
              const cfg = configFor(n);
              const done = isDone(n.id);
              const isLeft = n.labelSide < 0;
              const delay = entranceDelay(i, entranceEnabled);
              return (
                <g key={n.id}>
                  {n.stageLabel && (
                    <text className="stage-label" x={n.x} y={n.y + 46} textAnchor="middle">— {n.stageLabel} —</text>
                  )}
                  <g className="node-badge" onClick={() => setSelected(n)} transform={`translate(${n.x},${n.y})`}>
                    <g className="node-pop" style={{ animationDelay: `${delay}ms` }}>
                      {n.required ? (
                        <>
                          <circle className="ring" r="18" fill={done ? cfg.color : '#fff'} stroke={cfg.color} strokeWidth="3" pointerEvents="all" />
                          {done
                            ? <CheckCircle2 className="node-icon-pop" x="-9" y="-9" size={18} color="#fff" />
                            : <cfg.Icon className="node-icon-pop" x="-8" y="-8" size={16} color={cfg.color} />}
                        </>
                      ) : n.category === 'custom' ? (
                        <>
                          <circle className="ring" r="16" fill={cfg.color} fillOpacity={done ? 1 : 0} stroke={cfg.color} strokeWidth="2.5" strokeDasharray={done ? undefined : '2 3'} pointerEvents="all" />
                          {done
                            ? <CheckCircle2 className="node-icon-pop" x="-8" y="-8" size={16} color="#fff" />
                            : <cfg.Icon className="node-icon-pop" x="-7" y="-7" size={14} color={cfg.color} />}
                        </>
                      ) : (
                        <>
                          <circle className="ring" r="16" fill={cfg.color} fillOpacity={done ? 1 : 0} stroke={cfg.color} strokeWidth="2.5" strokeDasharray={done ? undefined : '4 4'} pointerEvents="all" />
                          {done
                            ? <CheckCircle2 className="node-icon-pop" x="-8" y="-8" size={16} color="#fff" />
                            : <cfg.Icon className="node-icon-pop" x="-7" y="-7" size={14} color={cfg.color} />}
                        </>
                      )}
                    </g>
                    <text className="node-label" x={isLeft ? -26 : 26} y="2" textAnchor={isLeft ? 'end' : 'start'} fontWeight="600">{n.title}</text>
                    <text className="node-due" x={isLeft ? -26 : 26} y="18" textAnchor={isLeft ? 'end' : 'start'}>
                      {n.category === 'project' ? `${n.projectLabel} · ${n.due}` : `${cfg.label} · ${n.due}${n.hasBranch ? ` · ${n.branchSteps.length} steps` : ''}`}
                    </text>
                  </g>
                </g>
              );
            })}

            <g
              className="node-badge"
              onClick={() => setSelected({ ...roadmap.today, isToday: true })}
              transform={`translate(${roadmap.today.x},${roadmap.today.y})`}
            >
              <g className="node-pop">
                <circle r="18" fill="var(--gold)" stroke="var(--gold)" strokeWidth="3" />
                <Compass x="-8" y="-8" size={16} color="#fff" />
              </g>
              <text className="node-label" x={roadmap.today.x < roadmap.canvasWidth / 2 ? -26 : 26} y="2" textAnchor={roadmap.today.x < roadmap.canvasWidth / 2 ? 'end' : 'start'} fontWeight="600">You are here</text>
              <text className="node-due" x={roadmap.today.x < roadmap.canvasWidth / 2 ? -26 : 26} y="18" textAnchor={roadmap.today.x < roadmap.canvasWidth / 2 ? 'end' : 'start'}>Today · {roadmap.today.due}</text>
            </g>
            </svg>
          </div>
        </div>

        <div
          className="zoom-controls"
          style={{ bottom: panelCollapsed ? ZOOM_CONTROLS_BOTTOM_COLLAPSED : ZOOM_CONTROLS_BOTTOM_EXPANDED }}
        >
          <button type="button" className="zoom-btn" onClick={() => zoomButton(1.25)} aria-label="Zoom in"><ZoomIn size={16} /></button>
          <button type="button" className="zoom-btn" onClick={() => zoomButton(1 / 1.25)} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <button type="button" className="zoom-btn" onClick={handleResetView} aria-label="Recenter / reset view"><Crosshair size={16} /></button>
          <button type="button" className="zoom-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {tooltipsRendered && (
          <>
            <div className={`roadmap-callout roadmap-callout-tl${tooltipsClosing ? ' callout-exit' : ''}`}>
              <button type="button" className="roadmap-callout-close" onClick={dismissTooltips} aria-label="Dismiss">
                <X size={12} />
              </button>
              <Maximize2 size={16} className="roadmap-callout-icon" />
              <div className="roadmap-callout-text">
                <strong>Full-screen roadmap</strong>
                No UI blocking the map.
              </div>
              <svg className="roadmap-callout-arrow roadmap-callout-arrow-tl" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M 4 4 C 4 26 8 34 30 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M 22 33 L 31 37 L 27 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={`roadmap-callout roadmap-callout-tr${tooltipsClosing ? ' callout-exit' : ''}`}>
              <button type="button" className="roadmap-callout-close" onClick={dismissTooltips} aria-label="Dismiss">
                <X size={12} />
              </button>
              <Move size={16} className="roadmap-callout-icon" />
              <div className="roadmap-callout-text">
                <strong>Pan, zoom, and explore</strong>
                Use these controls to navigate the map.
              </div>
              <svg className="roadmap-callout-arrow roadmap-callout-arrow-tr" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M 40 4 C 40 26 36 34 14 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M 22 33 L 13 37 L 17 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        )}
      </div>

      <div className={`roadmap-panel${panelCollapsed ? ' collapsed' : ''}`}>
        <button
          type="button"
          className="roadmap-panel-toggle"
          onClick={() => setPanelCollapsed((c) => !c)}
          aria-label={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <ChevronDown size={16} />
        </button>

        <div className="roadmap-panel-content">
          {trunkDoneCount === trunkTotal && (
            <div className="win-banner">
              <b>Path complete.</b>
              Every core step is checked off — nothing left to figure out on your own.
            </div>
          )}

          {roadmap.caveatNote && (
            <div className="caveat-banner">{roadmap.caveatNote}</div>
          )}

          <div className="roadmap-panel-top">
            <div className="roadmap-panel-info">
              <div className="roadmap-panel-eyebrow-row">
                <span className="roadmap-panel-icon-badge"><Compass size={12} /></span>
                <span className="eyebrow" style={{ margin: 0 }}>Step 6 of 6</span>
              </div>
              <h1 className="rm-title">{roadmap.title}</h1>
              <p className="rm-sub">{roadmap.subtitle}</p>
            </div>

            <div className="roadmap-panel-side">
              <div className="roadmap-panel-progress">
                <div className="progress-box">
                  <div className="progress-num">{trunkDoneCount} / {trunkTotal}</div>
                  <div className="progress-label">Core steps complete</div>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${(trunkDoneCount / trunkTotal) * 100}%` }} />
                </div>
              </div>
              <div className="roadmap-panel-actions">
                <button type="button" className="btn btn-ghost" onClick={onBack}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" className="btn btn-outline" onClick={onReset}>
                  <RotateCcw size={14} /> Start over
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                  <Plus size={16} /> Add Task
                </button>
              </div>
            </div>
          </div>

          <div className="roadmap-panel-divider" />

          <div className="legend">
            <span className="legend-item"><span className="dot" style={{ background: 'var(--teal)' }} /> Required — solid ring</span>
            <span className="legend-item"><span className="dot" style={{ background: 'var(--stone)', border: '2px solid var(--stone)' }} /> Optional — hollow ring</span>
            <span className="legend-item"><span className="dot" style={{ background: 'var(--ink-soft)', border: '2px dotted var(--ink-soft)' }} /> Custom — dotted ring</span>
            <span className="legend-item"><span className="dot" style={{ background: 'var(--gold)' }} /> You are here</span>
          </div>
        </div>
      </div>

      {selectedRendered && modalNode && (
        <div className={`overlay${selectedClosing ? ' overlay-exit' : ''}`} onClick={() => setSelected(null)}>
          <div className={`modal${selectedClosing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            <div
              className="modal-eyebrow"
              style={{ color: modalNode.type === 'today' ? 'var(--gold)' : configFor(modalNode).color }}
            >
              {modalNode.type === 'today' ? 'Today'
                : modalNode.category === 'project' ? 'Project'
                : modalNode.category === 'custom' ? 'Custom task'
                : modalNode.category === 'opportunity' ? 'Opportunity · optional'
                : modalNode.category === 'core' ? configFor(modalNode).label
                : 'Step · optional'}
            </div>
            <h2 className="modal-title">{modalNode.title}</h2>
            <div className="modal-due">Due {modalNode.due}</div>
            <p className="modal-desc">{modalNode.desc}</p>

            {modalNode.resources && modalNode.resources.length > 0 && (
              <div className="modal-resources">
                Recommended resources:
                <ul>{modalNode.resources.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}

            {modalNode.type !== 'today' && (
              <div className="modal-edit-row">
                <label className="modal-edit-date">
                  <span className="label">Due date</span>
                  <input
                    type="date"
                    value={toDateInputValue(modalNode.date)}
                    onChange={(e) => updateNodeDate(modalNode.id, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeNode(modalNode.id, modalNode.required)}
                >
                  <Trash2 size={14} /> Remove task
                </button>
              </div>
            )}

            {selectedIsAnchorOnly && (
              <>
                <div className="step-chain-progress">
                  {anchorDone} / {anchorTotal} steps complete — see the branch on the map for each step.
                </div>
                <button
                  className={`complete-btn ${anchorDone === anchorTotal ? 'done' : 'todo'}`}
                  onClick={advanceChain}
                >
                  <CheckCircle2 size={16} />
                  {chainButtonLabel}
                </button>
              </>
            )}

            {modalNode.type !== 'today' && !selectedIsAnchorOnly && (
              <button
                className={`complete-btn ${isDone(modalNode.id) ? 'done' : 'todo'}`}
                onClick={() => toggleDone(modalNode.id)}
              >
                <CheckCircle2 size={16} />
                {isDone(modalNode.id) ? 'Marked complete — undo' : 'Mark complete'}
              </button>
            )}
          </div>
        </div>
      )}

      <AddTaskModal
        isOpen={showAddForm}
        eyebrowColor={CUSTOM_CONFIG.color}
        onCancel={() => setShowAddForm(false)}
        onSubmit={addTask}
      />

      <AddTaskModal
        isOpen={projectPrompt?.mode === 'guide'}
        title={`What's next for ${promptProjectName}?`}
        eyebrow="Next step"
        eyebrowColor={PROJECT_CONFIG.color}
        nameLabel="Step name"
        submitLabel="Add this step"
        initialTitle={guideStepTitle}
        onCancel={() => setProjectPrompt(null)}
        onSubmit={(task) => appendProjectStep(task.title, task.date, true, task.desc)}
      />

      {choiceRendered && choiceNode && (
        <div className={`overlay${choiceClosing ? ' overlay-exit' : ''}`} onClick={() => setProjectPrompt(null)}>
          <div className={`modal${choiceClosing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setProjectPrompt(null)}><X size={18} /></button>
            <div className="modal-eyebrow" style={{ color: PROJECT_CONFIG.color }}>Project</div>
            <h2 className="modal-title">You've completed every guide step!</h2>
            <p className="modal-desc">
              {choiceNode.project.projectName} doesn't have a fixed end date — wrap it up here,
              or keep adding your own steps.
            </p>
            <div className="task-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setProjectPrompt((p) => ({ ...p, mode: 'customStep' }))}
              >
                + Add another step
              </button>
              <button type="button" className="btn btn-primary" onClick={markProjectComplete}>
                Mark project complete
              </button>
            </div>
          </div>
        </div>
      )}

      <AddTaskModal
        isOpen={projectPrompt?.mode === 'customStep'}
        title={`Add a step for ${promptProjectName}`}
        eyebrow="Project step"
        eyebrowColor={PROJECT_CONFIG.color}
        nameLabel="Step name"
        submitLabel="Add step"
        onCancel={() => setProjectPrompt(null)}
        onSubmit={(task) => appendProjectStep(task.title, task.date, false, task.desc)}
      />
    </div>
  );
}
