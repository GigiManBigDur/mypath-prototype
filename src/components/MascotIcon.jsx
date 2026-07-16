// The illustrated mascot — built from the app's own existing Compass motif (already the brand
// icon in the persistent header bar, and the "You are here" trail marker on WelcomeScreen/
// YearOverview) rather than an unrelated character, so it reads as continuous with the rest of
// the app's identity instead of a bolted-on addition. Pure inline SVG + CSS keyframes, matching
// this codebase's standing preference for hand-drawn illustration over image assets (see
// WelcomeScreen's own trail/marker SVG). `prefers-reduced-motion` is handled entirely in CSS
// (global.css's own `@media (prefers-reduced-motion: reduce)` block zeroes out both animations
// directly) rather than JS state, since this is a plain continuous idle loop with no one-time
// entrance sequence to coordinate — unlike WelcomeScreen's intro, there's nothing here that a
// double-rAF or staggered timer needs to get right.
//
// Extracted out of HubScreen.jsx (Dashboard/Guide Stage 2) so Stage 5's in-flow MascotWidget can
// reuse the exact same illustration at a smaller size, rather than a second hand-copied SVG
// silently drifting out of sync with the hub's own version — the `size` prop scales the whole
// thing uniformly (the SVG's internal 160x160 viewBox and every coordinate inside it stay fixed;
// only the rendered width/height change), so nothing about the animations/geometry needed to
// change to support a smaller widget-sized instance.
export default function MascotIcon({ size = 140 }) {
  return (
    <svg className="mascot-svg" viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {/* Fixed, not part of the bob group — a still shadow under a bobbing body is what actually
          sells the "lifting" illusion; a shadow that moves in lockstep with the body wouldn't. */}
      <ellipse className="mascot-shadow" cx="80" cy="146" rx="38" ry="7" />
      <g className="mascot-bob">
        <circle className="mascot-body" cx="80" cy="80" r="56" />
        <circle className="mascot-face-ring" cx="80" cy="80" r="56" />
        <ellipse className="mascot-eye" cx="63" cy="66" rx="5" ry="7" />
        <ellipse className="mascot-eye" cx="97" cy="66" rx="5" ry="7" />
        <path className="mascot-mouth" d="M 67 88 Q 80 98 93 88" />
        {/* Compass needle, echoing the brand icon — a small chest emblem below the face (not
            centered on it, which read as a nose overlapping the eyes/mouth in an earlier pass),
            slow independent spin, decorative only. Two nested <g>s, not one: a CSS transform on
            an SVG element REPLACES its presentation-attribute transform rather than composing
            with it (the same landmine WelcomeScreen's own marker positioning and Roadmap.jsx's
            node transforms already document) — putting the CSS-animated rotation on the SAME
            element that carries the positioning `transform="translate(...)"` attribute would
            silently drop the translate the moment the animation applied, snapping the needle
            back to the SVG's raw (0,0) origin. The outer <g> only ever carries the attribute
            translate; the inner <g> only ever carries the CSS animation, so neither one's
            transform can clobber the other's. */}
        <g transform="translate(80 112)">
          <g className="mascot-needle">
            <path d="M 0 -14 L 6 0 L 0 14 L -6 0 Z" className="mascot-needle-north" />
            <path d="M 0 -14 L 6 0 L 0 0 Z" className="mascot-needle-tip" />
          </g>
        </g>
        <circle className="mascot-needle-pin" cx="80" cy="112" r="3.5" />
      </g>
    </svg>
  );
}
