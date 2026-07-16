// Hub redesign (see CLAUDE.md) — a friendly rounded robot-with-a-leaf-sprout character,
// replacing the original Compass-motif illustration to match the reference image's own character
// design. Pure inline SVG + CSS keyframes still, matching this codebase's standing preference for
// hand-drawn illustration over image assets (see WelcomeScreen's own trail/marker SVG) — only the
// shapes/colors changed, not the underlying approach. `prefers-reduced-motion` is still handled
// entirely in CSS (global.css's own `@media (prefers-reduced-motion: reduce)` block) rather than
// JS state, for the same reason as before: a plain continuous idle loop, nothing to coordinate.
//
// Still shared between the hub's own large instance and Stage 5's in-flow MascotWidget (the
// `size` prop scales the whole thing uniformly; the SVG's internal 160x160 viewBox and every
// coordinate inside it stay fixed) — one illustration, not two copies drifting apart.
export default function MascotIcon({ size = 140 }) {
  return (
    <svg className="mascot-svg" viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {/* Fixed, not part of the bob group — a still shadow under a bobbing body is what actually
          sells the "lifting" illusion; a shadow that moves in lockstep with the body wouldn't. */}
      <ellipse className="mascot-shadow" cx="80" cy="149" rx="36" ry="7" />
      <g className="mascot-bob">
        <rect className="mascot-body" x="35" y="30" width="90" height="112" rx="45" />
        <circle className="mascot-ear" cx="38" cy="74" r="7" />
        <circle className="mascot-ear" cx="122" cy="74" r="7" />
        <rect className="mascot-face" x="52" y="56" width="56" height="42" rx="21" />
        <path className="mascot-eye" d="M 64 79 Q 69 71 74 79" />
        <path className="mascot-eye" d="M 86 79 Q 91 71 96 79" />
        <circle className="mascot-chest-light" cx="80" cy="119" r="6" />
        {/* Leaf sprout — sways independently via its own inner <g>, same "outer <g> carries the
            positioning translate, inner <g> carries only the CSS-animated transform" split this
            codebase's own WelcomeScreen/Roadmap.jsx transforms already document — a CSS transform
            REPLACES an SVG element's presentation-attribute transform rather than composing with
            it, so putting both on one element would silently drop the translate the instant the
            sway animation applied. */}
        <g transform="translate(80 26)">
          <g className="mascot-leaf">
            <path className="mascot-leaf-shape" d="M 0 6 Q -14 -6 -9 -19 Q 5 -13 0 6 Z" />
            <path className="mascot-leaf-shape" d="M 0 6 Q 14 -6 9 -19 Q -5 -13 0 6 Z" />
          </g>
        </g>
      </g>
    </svg>
  );
}
