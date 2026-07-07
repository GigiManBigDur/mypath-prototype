import { useState } from 'react';
import { CheckCircle2, Circle, Flag, Star, MapPin, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TYPE_CONFIG = {
  procedure: { label: 'Step', color: '#6E7F87', Icon: Circle },
  milestone: { label: 'Milestone', color: '#2E6E5E', Icon: MapPin },
  major: { label: 'Major Goal', color: '#C98A2B', Icon: Star },
  final: { label: 'Final Goal', color: '#A6491F', Icon: Flag },
};

function curve(x1, y1, x2, y2) {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${midY} ${x2} ${y2}`;
}

export default function Roadmap({ roadmap }) {
  const { state, patch } = useApp();
  const [selected, setSelected] = useState(null);

  const isDone = (id) => !!state.completedNodes[id];
  const toggleDone = (id) =>
    patch({ completedNodes: { ...state.completedNodes, [id]: !state.completedNodes[id] } });

  const trunkDoneCount = roadmap.trunk.filter((n) => isDone(n.id)).length;
  const trunkTotal = roadmap.trunk.length;
  const currentNode = roadmap.trunk.find((n) => !isDone(n.id));

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
        <span className="legend-item"><span className="dot" style={{ background: 'var(--teal)' }} /> Main path (required)</span>
        <span className="legend-item"><span className="dot" style={{ background: 'var(--stone)' }} /> Side path (optional)</span>
        <span className="legend-item"><span className="dot" style={{ background: 'var(--gold)' }} /> You are here</span>
      </div>

      <div className="canvas-scroll">
        <svg viewBox="0 0 800 1320" width="800" height="660">
          {roadmap.trunk.slice(0, -1).map((n, i) => {
            const next = roadmap.trunk[i + 1];
            return <path key={`tt-${n.id}`} d={curve(n.x, n.y, next.x, next.y)} stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5" />;
          })}
          {roadmap.branch.map((b) => (
            <path key={`bb-${b.id}`} d={curve(b.attachX, b.attachY, b.x, b.y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6" />
          ))}

          {roadmap.branch.map((b) => (
            <g key={b.id} className="node-badge" onClick={() => setSelected({ ...b, type: 'procedure', isBranch: true })} transform={`translate(${b.x},${b.y})`}>
              <circle className="ring" r="16" fill={isDone(b.id) ? 'var(--stone)' : '#fff'} stroke="var(--stone)" strokeWidth="2" />
              {isDone(b.id) ? <CheckCircle2 x="-8" y="-8" size={16} color="#fff" /> : <Circle x="-6" y="-6" size={12} color="var(--stone)" />}
              <text className="node-label" x={b.x < 400 ? -22 : 22} y="4" textAnchor={b.x < 400 ? 'end' : 'start'}>{b.title}</text>
              <text className="node-due" x={b.x < 400 ? -22 : 22} y="18" textAnchor={b.x < 400 ? 'end' : 'start'}>{b.due}</text>
            </g>
          ))}

          {roadmap.trunk.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            const done = isDone(n.id);
            const isCurrent = currentNode && currentNode.id === n.id;
            return (
              <g key={n.id} className="node-badge" onClick={() => setSelected({ ...n, isBranch: false })} transform={`translate(${n.x},${n.y})`}>
                {isCurrent && <circle r="26" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="3 5" />}
                <circle className="ring" r="18" fill={done ? cfg.color : '#fff'} stroke={cfg.color} strokeWidth="3" />
                {done ? <CheckCircle2 x="-9" y="-9" size={18} color="#fff" /> : <cfg.Icon x="-8" y="-8" size={16} color={cfg.color} />}
                <text className="node-label" x={n.x < 400 ? -26 : 26} y="2" textAnchor={n.x < 400 ? 'end' : 'start'} fontWeight="600">{n.title}</text>
                <text className="node-due" x={n.x < 400 ? -26 : 26} y="18" textAnchor={n.x < 400 ? 'end' : 'start'}>{cfg.label} · {n.due}</text>
              </g>
            );
          })}
        </svg>
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
            <div className="modal-eyebrow" style={{ color: selected.isBranch ? 'var(--stone)' : TYPE_CONFIG[selected.type].color }}>
              {selected.isBranch ? 'Side path · optional' : TYPE_CONFIG[selected.type].label}
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
            <button
              className={`complete-btn ${isDone(selected.id) ? 'done' : 'todo'}`}
              onClick={() => toggleDone(selected.id)}
            >
              <CheckCircle2 size={16} />
              {isDone(selected.id) ? 'Marked complete — undo' : 'Mark complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
