import { useState } from 'react';
import { CheckCircle2, Circle, Flag, Star, MapPin, Compass, ListChecks, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TYPE_CONFIG = {
  today: { label: 'You are here', color: '#C98A2B', Icon: Compass },
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
  const displayHeight = Math.round(roadmap.canvasHeight * 0.5);

  const selectedStepsDone = selected?.steps ? selected.steps.filter((s) => isDone(s.id)).length : 0;

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
        <span className="legend-item"><span className="dot" style={{ background: 'var(--stone)' }} /> Opportunity / reminder</span>
        <span className="legend-item"><span className="dot" style={{ background: 'var(--gold)' }} /> You are here</span>
      </div>

      {roadmap.caveatNote && (
        <div className="caveat-banner">{roadmap.caveatNote}</div>
      )}

      <div className="canvas-scroll">
        <svg viewBox={`0 0 ${roadmap.canvasWidth} ${roadmap.canvasHeight}`} width={roadmap.canvasWidth} height={displayHeight}>
          <path
            d={curve(roadmap.today.x, roadmap.today.y, roadmap.trunk[0].x, roadmap.trunk[0].y)}
            stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5"
          />
          {roadmap.trunk.slice(0, -1).map((n, i) => {
            const next = roadmap.trunk[i + 1];
            return <path key={`tt-${n.id}`} d={`M ${n.x} ${n.y} L ${next.x} ${next.y}`} stroke="var(--teal)" strokeWidth="3" fill="none" opacity="0.5" />;
          })}
          {roadmap.chips.map((c) => (
            <path key={`cc-${c.id}`} d={curve(c.attachX, c.attachY, c.x, c.y)} stroke="var(--stone)" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6" />
          ))}

          {roadmap.chips.map((c) => {
            const ChipIcon = c.type === 'opportunity' ? ListChecks : Circle;
            const done = c.type === 'gpa' && isDone(c.id);
            return (
              <g key={c.id} className="node-badge" onClick={() => setSelected(c)} transform={`translate(${c.x},${c.y})`}>
                <circle className="ring" r="16" fill={done ? 'var(--stone)' : '#fff'} stroke="var(--stone)" strokeWidth="2" />
                {done ? <CheckCircle2 x="-8" y="-8" size={16} color="#fff" /> : <ChipIcon x="-7" y="-7" size={14} color="var(--stone)" />}
                <text className="node-label" x={c.x < 400 ? -22 : 22} y="4" textAnchor={c.x < 400 ? 'end' : 'start'}>{c.title}</text>
                <text className="node-due" x={c.x < 400 ? -22 : 22} y="18" textAnchor={c.x < 400 ? 'end' : 'start'}>
                  {c.due}{c.type === 'opportunity' ? ` · ${c.steps.length} steps` : ''}
                </text>
              </g>
            );
          })}

          {roadmap.trunk.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            const done = isDone(n.id);
            return (
              <g key={n.id}>
                {n.stageLabel && (
                  <text className="stage-label" x={n.x} y={n.y + 46} textAnchor="middle">— {n.stageLabel} —</text>
                )}
                <g className="node-badge" onClick={() => setSelected(n)} transform={`translate(${n.x},${n.y})`}>
                  <circle className="ring" r="18" fill={done ? cfg.color : '#fff'} stroke={cfg.color} strokeWidth="3" />
                  {done ? <CheckCircle2 x="-9" y="-9" size={18} color="#fff" /> : <cfg.Icon x="-8" y="-8" size={16} color={cfg.color} />}
                  <text className="node-label" x={n.x < 400 ? -26 : 26} y="2" textAnchor={n.x < 400 ? 'end' : 'start'} fontWeight="600">{n.title}</text>
                  <text className="node-due" x={n.x < 400 ? -26 : 26} y="18" textAnchor={n.x < 400 ? 'end' : 'start'}>{cfg.label} · {n.due}</text>
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
            <text className="node-label" x={roadmap.today.x < 400 ? -26 : 26} y="2" textAnchor={roadmap.today.x < 400 ? 'end' : 'start'} fontWeight="600">You are here</text>
            <text className="node-due" x={roadmap.today.x < 400 ? -26 : 26} y="18" textAnchor={roadmap.today.x < 400 ? 'end' : 'start'}>Today · {roadmap.today.due}</text>
          </g>
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
            <div
              className="modal-eyebrow"
              style={{ color: selected.type === 'today' || selected.type === 'gpa' || selected.type === 'opportunity' ? 'var(--stone)' : TYPE_CONFIG[selected.type].color }}
            >
              {selected.type === 'opportunity' ? 'Opportunity · optional'
                : selected.type === 'gpa' ? 'Reminder · optional'
                : selected.type === 'today' ? 'Today'
                : TYPE_CONFIG[selected.type].label}
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

            {selected.type === 'opportunity' && selected.steps && (
              <div className="step-chain">
                <div className="step-chain-progress">{selectedStepsDone} / {selected.steps.length} steps complete</div>
                {selected.steps.map((step) => (
                  <button type="button" key={step.id} className="step-row" onClick={() => toggleDone(step.id)}>
                    {isDone(step.id) ? <CheckCircle2 size={18} color="var(--teal)" /> : <Circle size={18} color="var(--stone)" />}
                    <span className="step-row-text">
                      <span className={isDone(step.id) ? 'step-row-title done' : 'step-row-title'}>{step.title}</span>
                      <span className="step-row-due">{step.due}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selected.type !== 'today' && selected.type !== 'opportunity' && (
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
