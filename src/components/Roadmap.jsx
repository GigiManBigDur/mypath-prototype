import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Circle, Flag, Star, MapPin, Compass, ListChecks, X, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

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

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const VIEWPORT_HEIGHT = 620;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function configFor(node) {
  if (node.category === 'core' || node.type === 'today') return CORE_TYPE_CONFIG[node.coreType || node.type];
  if (node.id.endsWith('-deadline')) return BRANCH_DEADLINE_CONFIG;
  if (node.category === 'opportunity') return OPPORTUNITY_CONFIG;
  return BRANCH_STEP_CONFIG;
}

function line(x1, y1, x2, y2) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export default function Roadmap({ roadmap }) {
  const { state, patch } = useApp();
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef(null);
  const dragState = useRef(null);
  const pinchState = useRef(null);

  const isDone = (id) => !!state.completedNodes[id];
  const toggleDone = (id) =>
    patch({ completedNodes: { ...state.completedNodes, [id]: !state.completedNodes[id] } });

  const requiredNodes = roadmap.spine.filter((n) => n.required);
  const trunkDoneCount = requiredNodes.filter((n) => isDone(n.id)).length;
  const trunkTotal = requiredNodes.length;

  const fitView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const zoom = clamp(Math.min(vw / roadmap.canvasWidth, vh / roadmap.canvasHeight), MIN_ZOOM, 1);
    const panX = (vw - roadmap.canvasWidth * zoom) / 2;
    const panY = (vh - roadmap.canvasHeight * zoom) / 2;
    setView({ zoom, panX, panY });
  }, [roadmap.canvasWidth, roadmap.canvasHeight]);

  useEffect(() => { fitView(); }, [fitView]);

  const zoomAt = useCallback((cx, cy, factor) => {
    setView((v) => {
      const newZoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (cx - v.panX) / v.zoom;
      const worldY = (cy - v.panY) / v.zoom;
      return { zoom: newZoom, panX: cx - worldX * newZoom, panY: cy - worldY * newZoom };
    });
  }, []);

  // Wheel (zoom) and touch (pinch) need non-passive listeners to preventDefault, which React's
  // synthetic onWheel/onTouchMove props can't reliably guarantee — attach natively instead.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
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

  const onPointerDown = (e) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, startPanX: view.panX, startPanY: view.panY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setView((v) => ({ ...v, panX: dragState.current.startPanX + dx, panY: dragState.current.startPanY + dy }));
  };
  const onPointerUp = () => { dragState.current = null; setDragging(false); };

  const zoomButton = (factor) => {
    const vw = viewportRef.current?.clientWidth ?? VIEWPORT_HEIGHT;
    const vh = viewportRef.current?.clientHeight ?? VIEWPORT_HEIGHT;
    zoomAt(vw / 2, vh / 2, factor);
  };

  const selectedIsAnchorOnly = selected?.category === 'opportunity' && selected?.hasBranch;
  const anchorDone = selectedIsAnchorOnly && selected.branchSteps
    ? selected.branchSteps.filter((s) => isDone(s.id)).length
    : 0;

  return (
    <div>
      <div className="roadmap-header">
        <div>
          <h1 className="rm-title">{roadmap.title}</h1>
          <p className="rm-sub">{roadmap.subtitle}</p>
        </div>
        <div className="progress-box">
          <div className="progress-num">{trunkDoneCount} / {trunkTotal}</div>
          <div className="progress-label">Core steps complete</div>
        </div>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${(trunkDoneCount / trunkTotal) * 100}%` }} />
      </div>

      <div className="legend">
        <span className="legend-item"><span className="dot" style={{ background: 'var(--teal)' }} /> Required — solid ring</span>
        <span className="legend-item"><span className="dot" style={{ background: 'var(--stone)', border: '2px solid var(--stone)' }} /> Optional — hollow ring</span>
        <span className="legend-item"><span className="dot" style={{ background: 'var(--gold)' }} /> You are here</span>
      </div>

      {roadmap.caveatNote && (
        <div className="caveat-banner">{roadmap.caveatNote}</div>
      )}

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
            className="roadmap-canvas-inner"
            style={{ transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})` }}
          >
            <svg width={roadmap.canvasWidth} height={roadmap.canvasHeight}>
            {/* Spine connective line: today up through every spine item, in chronological order. */}
            <path
              d={line(roadmap.today.x, roadmap.today.y, roadmap.spine[0]?.x ?? roadmap.today.x, roadmap.spine[0]?.y ?? roadmap.today.y)}
              stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5"
            />
            {roadmap.spine.slice(0, -1).map((n, i) => {
              const next = roadmap.spine[i + 1];
              return <path key={`sp-${n.id}`} d={line(n.x, n.y, next.x, next.y)} stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5" />;
            })}

            {/* Each multi-step item's own isolated diagonal, plus the chain within it. */}
            {roadmap.spine.filter((n) => n.hasBranch).map((n) => (
              <g key={`branch-${n.id}`}>
                <path d={line(n.x, n.y, n.branchSteps[0].x, n.branchSteps[0].y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6" />
                {n.branchSteps.slice(0, -1).map((s, i) => {
                  const next = n.branchSteps[i + 1];
                  return <path key={`bs-${s.id}`} d={line(s.x, s.y, next.x, next.y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6" />;
                })}
              </g>
            ))}

            {/* Branch step nodes (hollow — optional). Labels get extra clearance beyond the dot's
                own position (in the branch's own peel direction) so they clear the spine's label
                column even when a step lands close in time to a spine item. */}
            {roadmap.spine.filter((n) => n.hasBranch).flatMap((n) => n.branchSteps.map((s) => {
              const cfg = configFor(s);
              const done = isDone(s.id);
              const labelX = n.side > 0 ? 20 : -20;
              return (
                <g key={s.id} className="node-badge" onClick={() => setSelected(s)} transform={`translate(${s.x},${s.y})`}>
                  <circle className="ring" r="13" fill={done ? cfg.color : 'none'} stroke={cfg.color} strokeWidth="2" strokeDasharray={done ? undefined : '3 3'} />
                  {done ? <CheckCircle2 x="-7" y="-7" size={14} color="#fff" /> : <cfg.Icon x="-6" y="-6" size={12} color={cfg.color} />}
                  <text className="node-label" x={labelX} y="4" textAnchor={n.side > 0 ? 'start' : 'end'}>{s.title}</text>
                  <text className="node-due" x={labelX} y="17" textAnchor={n.side > 0 ? 'start' : 'end'}>{s.due}</text>
                </g>
              );
            }))}

            {/* Spine nodes: core (solid/required) and opportunity anchors (hollow/optional).
                labelSide alternates per item (spine x is always dead-center) so consecutive spine
                labels don't all pile onto one side, and a branch always peels opposite its own
                anchor's label — see roadmapLayout.js. */}
            {roadmap.spine.map((n) => {
              const cfg = configFor(n);
              const done = isDone(n.id);
              const isLeft = n.labelSide < 0;
              return (
                <g key={n.id}>
                  {n.stageLabel && (
                    <text className="stage-label" x={n.x} y={n.y + 46} textAnchor="middle">— {n.stageLabel} —</text>
                  )}
                  <g className="node-badge" onClick={() => setSelected(n)} transform={`translate(${n.x},${n.y})`}>
                    {n.required ? (
                      <>
                        <circle className="ring" r="18" fill={done ? cfg.color : '#fff'} stroke={cfg.color} strokeWidth="3" />
                        {done ? <CheckCircle2 x="-9" y="-9" size={18} color="#fff" /> : <cfg.Icon x="-8" y="-8" size={16} color={cfg.color} />}
                      </>
                    ) : (
                      <>
                        <circle className="ring" r="16" fill={done ? cfg.color : 'none'} stroke={cfg.color} strokeWidth="2.5" strokeDasharray={done ? undefined : '4 4'} />
                        {done ? <CheckCircle2 x="-8" y="-8" size={16} color="#fff" /> : <cfg.Icon x="-7" y="-7" size={14} color={cfg.color} />}
                      </>
                    )}
                    <text className="node-label" x={isLeft ? -26 : 26} y="2" textAnchor={isLeft ? 'end' : 'start'} fontWeight="600">{n.title}</text>
                    <text className="node-due" x={isLeft ? -26 : 26} y="18" textAnchor={isLeft ? 'end' : 'start'}>{cfg.label} · {n.due}{n.hasBranch ? ` · ${n.branchSteps.length} steps` : ''}</text>
                  </g>
                </g>
              );
            })}

            <g
              className="node-badge"
              onClick={() => setSelected({ ...roadmap.today, isToday: true })}
              transform={`translate(${roadmap.today.x},${roadmap.today.y})`}
            >
              <circle r="18" fill="var(--gold)" stroke="var(--gold)" strokeWidth="3" />
              <Compass x="-8" y="-8" size={16} color="#fff" />
              <text className="node-label" x={roadmap.today.x < roadmap.canvasWidth / 2 ? -26 : 26} y="2" textAnchor={roadmap.today.x < roadmap.canvasWidth / 2 ? 'end' : 'start'} fontWeight="600">You are here</text>
              <text className="node-due" x={roadmap.today.x < roadmap.canvasWidth / 2 ? -26 : 26} y="18" textAnchor={roadmap.today.x < roadmap.canvasWidth / 2 ? 'end' : 'start'}>Today · {roadmap.today.due}</text>
            </g>
            </svg>
          </div>
        </div>

        <div className="zoom-controls">
          <button type="button" className="zoom-btn" onClick={() => zoomButton(1.25)} aria-label="Zoom in"><ZoomIn size={16} /></button>
          <button type="button" className="zoom-btn" onClick={() => zoomButton(1 / 1.25)} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <button type="button" className="zoom-btn" onClick={fitView} aria-label="Reset view"><Maximize2 size={16} /></button>
        </div>
      </div>

      {trunkDoneCount === trunkTotal && (
        <div className="win-banner">
          <b>Path complete.</b>
          Every core step is checked off — nothing left to figure out on your own.
        </div>
      )}

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            <div
              className="modal-eyebrow"
              style={{ color: selected.type === 'today' ? 'var(--gold)' : configFor(selected).color }}
            >
              {selected.type === 'today' ? 'Today'
                : selected.category === 'opportunity' ? 'Opportunity · optional'
                : selected.category === 'core' ? configFor(selected).label
                : 'Step · optional'}
            </div>
            <h2 className="modal-title">{selected.title}</h2>
            <div className="modal-due">Due {selected.due}</div>
            <p className="modal-desc">{selected.desc}</p>

            {selected.resources && selected.resources.length > 0 && (
              <div className="modal-resources">
                Recommended resources:
                <ul>{selected.resources.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}

            {selectedIsAnchorOnly && (
              <div className="step-chain-progress">
                {anchorDone} / {selected.branchSteps.length} steps complete — see the branch on the map for each step.
              </div>
            )}

            {selected.type !== 'today' && !selectedIsAnchorOnly && (
              <button
                className={`complete-btn ${isDone(selected.id) ? 'done' : 'todo'}`}
                onClick={() => toggleDone(selected.id)}
              >
                <CheckCircle2 size={16} />
                {isDone(selected.id) ? 'Marked complete — undo' : 'Mark complete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
