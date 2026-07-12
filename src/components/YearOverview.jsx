import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Compass, MapPin } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Map 1 — a small, animated "which year am I looking at" overview, sitting in front of Map 2
// (the full per-year task roadmap in Roadmap.jsx). Deliberately much lighter than Map 2: no
// dates-within-a-year math here at all, just N discrete year markers in a row. Reuses the same
// stroke-dasharray draw-in + staggered marker pop-in technique WelcomeScreen's hero trail uses,
// scaled down to a handful of points instead of one continuous curve.
const MARKER_GAP = 130;
const X_AMPLITUDE = 45;
const TOP_MARGIN = 60;
const BOTTOM_MARGIN = 60;
const CENTER_X = 100;
const VIEW_WIDTH = 200;

// Same "played once per session" pattern as WelcomeScreen's hasPlayedIntro / Roadmap's
// hasPlayedRoadmapEntrance — returning to Map 1 later (e.g. via Map 2's "Back to years" control)
// shows it already settled instead of replaying the draw-in every time.
let hasPlayedYearOverviewEntrance = false;

function buildPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY} ${curr.x} ${midY} ${curr.x} ${curr.y}`;
  }
  return d;
}

export default function YearOverview({ years, onSelectYear, onBack, onReset }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const skipEntrance = reducedMotion || hasPlayedYearOverviewEntrance;
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [drawn, setDrawn] = useState(skipEntrance);
  const [revealed, setRevealed] = useState(skipEntrance ? years.length : 0);

  const n = years.length;
  const canvasHeight = TOP_MARGIN + BOTTOM_MARGIN + Math.max(0, n - 1) * MARKER_GAP;
  // Index 0 (the current year) sits centered and at the bottom, matching Map 2's "today at the
  // bottom" convention — later years wind upward, alternating left/right, purely for visual
  // interest (there's no date-proportional meaning to the horizontal position here at all).
  const points = years.map((y, i) => ({
    ...y,
    x: i === 0 ? CENTER_X : (i % 2 === 1 ? CENTER_X - X_AMPLITUDE : CENTER_X + X_AMPLITUDE),
    y: canvasHeight - BOTTOM_MARGIN - i * MARKER_GAP,
  }));
  const pathD = buildPath(points);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    setPathLength(path.getTotalLength());
  }, [pathD]);

  useEffect(() => {
    if (skipEntrance || n < 2) return undefined;
    setDrawn(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [skipEntrance, n]);

  useEffect(() => {
    if (skipEntrance) return undefined;
    setRevealed(0);
    const timers = points.map((_, i) => setTimeout(() => {
      setRevealed((r) => Math.max(r, i + 1));
    }, 300 + i * 220));
    const finishTimer = setTimeout(() => { hasPlayedYearOverviewEntrance = true; }, 300 + points.length * 220 + 300);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipEntrance, n]);

  return (
    <div>
      <div className="pb-topbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          <RotateCcw size={14} /> Start over
        </button>
      </div>

      <div className="eyebrow">Step 8 of 8</div>
      <h1 className="page-title">Your Academic Plan</h1>
      <p className="page-sub">
        {n > 1
          ? 'Select a year to see your detailed plan for that year.'
          : 'Here’s your detailed plan for this year.'}
      </p>

      <div className="year-overview-wrap">
        <svg
          className="year-overview-svg"
          viewBox={`0 0 ${VIEW_WIDTH} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {pathD && (
            <path
              ref={pathRef}
              d={pathD}
              className={`year-overview-path${!skipEntrance && !drawn ? ' enter' : ''}`}
              style={{ '--path-length': pathLength || 1000 }}
            />
          )}

          {points.map((p, i) => (
            <g
              key={p.stageIndex}
              className={`year-overview-marker${!skipEntrance && revealed <= i ? ' enter' : ''}${p.isCurrent ? ' current' : ''}`}
              style={{ '--mx': `${p.x}px`, '--my': `${p.y}px` }}
              onClick={() => onSelectYear(p.stageIndex)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectYear(p.stageIndex); }}
            >
              {/* Invisible, generously-sized hit target — same pattern Roadmap.jsx's nodes use:
                  the visible ring/label combo has an asymmetric bounding box (circle + a label
                  offset well to one side), so a click landing in the gap between them would
                  otherwise miss both and fall through to the bare canvas. */}
              <circle className="year-overview-hit-target" r="34" fill="none" pointerEvents="all" />
              {p.isCurrent && <circle className="year-overview-pulse" r="20" pointerEvents="none" />}
              <circle className="year-overview-ring" r="20" pointerEvents="all" />
              {p.isCurrent
                ? <Compass x="-9" y="-9" size={18} color="#fff" />
                : <MapPin x="-8" y="-8" size={16} color="var(--teal)" />}
              <text
                className="year-overview-label"
                x={i % 2 === 1 && i !== 0 ? -30 : 30}
                y="5"
                textAnchor={i % 2 === 1 && i !== 0 ? 'end' : 'start'}
              >
                {p.label}
              </text>
              {p.isCurrent && (
                <text className="year-overview-current-tag" x="0" y="38" textAnchor="middle">
                  You are here
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
