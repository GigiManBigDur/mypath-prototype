import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Two distinct trail shapes, not one shape CSS-scaled down — the mobile variant has a much
// narrower horizontal swing relative to its height so the winding S-curve reads as intentional
// on a narrow screen instead of looking cramped. The very first coordinate of each path (the "M")
// is also BASE_POINT below — keep them in sync if either path changes.
const TRAIL_PATH_DESKTOP = 'M 200 620 C 200 540 70 520 70 450 C 70 380 330 360 330 290 C 330 220 90 200 90 130 C 90 70 200 55 200 20';
const TRAIL_PATH_MOBILE = 'M 130 620 C 130 550 60 530 60 460 C 60 390 200 370 200 300 C 200 230 60 210 60 140 C 60 80 130 60 130 20';

const BASE_POINT_DESKTOP = { x: 200, y: 620 };
const BASE_POINT_MOBILE = { x: 130, y: 620 };

// Fractional distance along the trail (0 = base/today, 1 = the top) for each ghost milestone.
const MILESTONES = [
  { t: 0.26, label: 'Explore what excites you' },
  { t: 0.58, label: 'Get a plan built around you' },
  { t: 0.88, label: 'Know exactly what’s next' },
];

// Module-level, not AppContext/localStorage state — this only needs to remember "already
// played" for the lifetime of the tab (e.g. navigating back here from the survey), not across
// a real reload, so a plain module variable is enough.
let hasPlayedIntro = false;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(query).matches
  ));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export default function WelcomeScreen() {
  const { patch } = useApp();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isMobile = useMediaQuery('(max-width: 720px)');
  const pathRef = useRef(null);

  const trailPath = isMobile ? TRAIL_PATH_MOBILE : TRAIL_PATH_DESKTOP;
  const basePoint = isMobile ? BASE_POINT_MOBILE : BASE_POINT_DESKTOP;

  const [pathLength, setPathLength] = useState(0);
  const [markerPoints, setMarkerPoints] = useState([]);
  // The trail starts fully undrawn ('enter'), gets nudged to drawn one frame later so the browser
  // actually paints the undrawn state before transitioning (a same-frame class change wouldn't
  // animate). `revealed` counts how many milestone markers have been individually revealed so
  // far, driven by its own staggered timers below — a CSS `transition-delay` alone can't do this,
  // since a transition only fires on an actual property CHANGE, and a class applied once at mount
  // and never removed has nothing to transition from. A return visit (e.g. Back from the survey)
  // skips straight to the settled state via `hasPlayedIntro`, same as reduced motion.
  const skipIntro = reducedMotion || hasPlayedIntro;
  const [drawn, setDrawn] = useState(skipIntro);
  const [revealed, setRevealed] = useState(skipIntro ? MILESTONES.length : 0);
  const [heroVisible, setHeroVisible] = useState(skipIntro);

  // Layout effect, not a regular one — this measures real SVG geometry and feeds it back into
  // render (marker positions, path length), so it needs to run before paint to avoid a visible
  // one-frame flash of unpositioned markers.
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setPathLength(length);
    setMarkerPoints(MILESTONES.map((m) => {
      const pt = path.getPointAtLength(m.t * length);
      return { ...m, x: pt.x, y: pt.y };
    }));
  }, [trailPath]);

  useEffect(() => {
    if (skipIntro) return undefined;
    setDrawn(false);
    // Double rAF: the first frame commits the "undrawn" starting style, the second flips the
    // class that carries the CSS transition — collapsing this to one rAF (or a setTimeout(0))
    // risks the browser batching both style changes into a single paint, which skips the
    // animation entirely instead of playing it.
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [skipIntro, pathLength]);

  useEffect(() => {
    if (skipIntro || markerPoints.length === 0) return undefined;
    setRevealed(0);
    const timers = markerPoints.map((_, i) => setTimeout(() => {
      setRevealed((r) => Math.max(r, i + 1));
    }, 500 + i * 500));
    return () => timers.forEach(clearTimeout);
  }, [skipIntro, markerPoints.length]);

  useEffect(() => {
    if (skipIntro) return undefined;
    // Hero content settles in once the trail (1.8s) and the last marker (delay 1.5s + ~0.5s pop)
    // have both resolved — reads as one sequence finishing, not an unrelated fourth effect.
    const timer = setTimeout(() => {
      setHeroVisible(true);
      hasPlayedIntro = true;
    }, 1900);
    return () => clearTimeout(timer);
  }, [skipIntro]);

  return (
    <div className="welcome-screen">
      <div className="welcome-trail-wrap">
        <svg
          className="welcome-trail-svg"
          viewBox={isMobile ? '0 0 260 640' : '0 0 400 640'}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <path
            ref={pathRef}
            d={trailPath}
            className={`welcome-trail-path${!reducedMotion && !drawn ? ' enter' : ''}`}
            style={{ '--path-length': pathLength || 1000 }}
          />

          {markerPoints.map((m, i) => (
            // Positioning lives entirely in the --mx/--my custom properties consumed by the CSS
            // `transform` on .welcome-marker (see global.css), not an SVG `transform` attribute —
            // a CSS transform on an element REPLACES its presentation-attribute transform rather
            // than composing with it, so mixing "attribute translate + CSS scale" here would
            // silently drop the translate the moment the pop-in animation's scale kicked in.
            <g
              key={m.label}
              className={`welcome-marker${!reducedMotion && revealed <= i ? ' enter' : ''}`}
              style={{ '--mx': `${m.x}px`, '--my': `${m.y}px` }}
            >
              <circle className="welcome-marker-ring" r="7" />
              {/* Mobile stacks the label BELOW its marker (centered) instead of extending it
                  sideways — the narrow trail variant's markers sit close enough to the viewBox
                  edges that a long label extending left/right would clip off the actual screen;
                  vertical space along a tall trail is abundant, horizontal space on a phone isn't. */}
              <text
                className="welcome-marker-label"
                x={isMobile ? 0 : (i % 2 === 0 ? -14 : 14)}
                y={isMobile ? 22 : 4}
                textAnchor={isMobile ? 'middle' : (i % 2 === 0 ? 'end' : 'start')}
              >
                {m.label}
              </text>
            </g>
          ))}

          <g transform={`translate(${basePoint.x}, ${basePoint.y})`}>
            {!reducedMotion && <circle className="welcome-here-pulse" r="18" />}
            <circle r="18" fill="var(--gold)" stroke="var(--gold)" strokeWidth="3" />
            <Compass x="-8" y="-8" size={16} color="#fff" />
          </g>
        </svg>
      </div>

      <div className={`welcome-hero-content${!reducedMotion && !heroVisible ? ' enter' : ''}`}>
        <h1 className="welcome-title">MyPath</h1>
        <p className="welcome-tagline">
          Your personalized path to college, projects, and everything in between.
        </p>
        <button
          type="button"
          className="btn btn-primary welcome-cta"
          onClick={() => patch({ screen: 'survey' })}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
