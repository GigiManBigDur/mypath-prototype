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
//
// Radial-layout pass, Task 4 (see CLAUDE.md) — `speaking` is a NEW, purely additive prop: it swaps
// which CSS animation the existing bob/eye/chest-light elements use (a quicker, livelier bob; a
// rhythmic eye squeeze instead of an occasional blink; a faster chest pulse) via one extra class,
// `.mascot-speaking`, applied to the same elements that already animate at idle. This deliberately
// does NOT touch the character's own shapes/markup at all — the design itself was already right
// and stays exactly as built; only which animation preset plays changes, driven by
// `useMascotSpeech`'s own returned `isSpeaking` boolean (real audio timing when unmuted, an
// estimated word-count timer otherwise — see that hook's own comment).
//
// Pointing-animation overhaul (see CLAUDE.md) — `pointing`/`pointAngle` drive a real wand-based
// pointing gesture (replacing the old separate arrow element, HubScreen.jsx's own former
// `PointerArrow`). `pointing` is a plain boolean (the caller passes `isSpeaking` straight through
// — see HubScreen.jsx — so "pointing" and "currently speaking/being displayed" are the SAME real
// signal). `pointAngle` is the REAL measured angle (degrees, standard `atan2(dy, dx)` convention:
// 0=target directly right, 90=directly below, -90=directly above, ±180=directly left) from the
// mascot to the current target tile's actual on-screen position — see HubScreen.jsx's own
// `usePointAngle`. Bug fix: an earlier version of this only computed a binary left/right side
// (`leanDirection`) and aimed at a fixed angle regardless of exactly where the target was — a
// tile sitting almost directly above the mascot, or one further away at a shallow angle, still
// got the identical "point left" or "point right" gesture as one sitting at a much steeper angle.
// This version aims precisely along the real measured angle instead.
//
// Structured as TWO new sibling groups layered on top of the untouched body:
//   - `.mascot-pose` (new OUTERMOST wrapper, added around everything below) leans the WHOLE
//     character toward the target when pointing — now a CONTINUOUS lean (via inline `transform`,
//     not a fixed-degree CSS class), scaled by the target's real horizontal offset (`cos` of the
//     angle) so a target further to the side leans the body more than one closer to directly
//     ahead. The CSS `transition` on `.mascot-pose` (unconditional, not gated by a class) is what
//     still gives the "start-pointing"/"end-pointing" transitions for free — a transition
//     animates between successive inline `transform` values exactly the same way it would between
//     class-driven ones.
//   - `.mascot-arm`/`.mascot-wand` (new, a sibling of `.mascot-bob`, NOT nested inside it) raise
//     from a resting, tucked-at-the-side pose to an extended point, ALSO now at the real measured
//     angle rather than one fixed raised angle. Deliberately a SIBLING of `.mascot-bob` — `.mascot-
//     bob` already owns its own `transform` (the idle/speaking bob animation), and a CSS transform
//     on one element REPLACES rather than composes with another rule's transform on that SAME
//     element (the exact landmine this codebase's own WelcomeScreen/Roadmap.jsx/hub-tile
//     transforms already document repeatedly) — keeping the arm+wand as a separate sibling group
//     is what lets the body's own bob/speaking animation and the arm's own raise animation run
//     simultaneously without one silently overwriting the other. The arm is drawn once, on the
//     character's right side, and mirrored via `scaleX(-1)` on its own outer wrapper
//     (`.mascot-arm-mirror`) whenever the target is on the left half (real `cos(angle) < 0`) — a
//     THIRD, separate element, so the mirror-flip and the raise-rotation (an inner child of the
//     mirror wrapper) don't collide with each other either.
//
//     The math: the arm's own neutral/undrawn orientation points straight down (angle 90° in this
//     same convention). Mirroring negates the horizontal component of the target direction, so a
//     "local" angle — always expressed as if the target were on the right (using `Math.abs(cos)`
//     for the horizontal component) — stays within ±90° of straight-right regardless of which real
//     side the target is actually on; rotating the arm by `local angle - 90°` swings it from
//     "pointing down" to "pointing at the local angle," and the SAME rotation value reads correctly
//     as the true real-world direction once the mirror (if any) is applied on top of it.
// The wand's own continuous "held pose, not frozen" motion (Task 2's own explicit requirement) is
// a slow glow pulse on just the wand's tip (`.mascot-wand-tip`, animating `opacity`+`r`, not
// `transform`, so it can run as a plain `animation` alongside the wand's own `transition`-driven
// extend/retract with zero property conflicts) — active only while actually raised, so it never
// runs during idle.
const MAX_LEAN_DEG = 10;

export default function MascotIcon({ size = 140, speaking = false, pointing = false, pointAngle = null }) {
  // A real pointing pose needs a real, measured angle — with none (still measuring, e.g. the very
  // first frame after mount), the character simply stays in its centered idle pose rather than
  // guessing a direction, same "don't fake it" posture the old PointerArrow already held.
  const hasAngle = pointing && pointAngle !== null && pointAngle !== undefined;
  let mirrored = false;
  let armRotateDeg = 0;
  let leanDeg = 0;
  if (hasAngle) {
    const rad = (pointAngle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    mirrored = dx < 0;
    // atan2(dy, |dx|) always keeps the horizontal component non-negative, so the result stays
    // within ±90° of straight-right regardless of the real target direction — see the header
    // comment for why this is what lets one rotation formula work for either side.
    const localDeg = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
    armRotateDeg = localDeg - 90;
    leanDeg = dx * MAX_LEAN_DEG;
  }

  return (
    <svg className="mascot-svg" viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {/* Fixed, not part of the bob group — a still shadow under a bobbing body is what actually
          sells the "lifting" illusion; a shadow that moves in lockstep with the body wouldn't. */}
      <ellipse className="mascot-shadow" cx="80" cy="149" rx="36" ry="7" />
      <g
        className={`mascot-pose${hasAngle ? ' mascot-pointing' : ''}`}
        style={hasAngle ? { transform: `rotate(${leanDeg}deg)` } : undefined}
      >
        <g className={`mascot-bob${speaking ? ' mascot-speaking' : ''}`}>
          <rect className="mascot-body" x="35" y="30" width="90" height="112" rx="45" />
          <circle className="mascot-ear" cx="38" cy="74" r="7" />
          <circle className="mascot-ear" cx="122" cy="74" r="7" />
          <rect className="mascot-face" x="52" y="56" width="56" height="42" rx="21" />
          <path className={`mascot-eye${speaking ? ' mascot-eye-talking' : ''}`} d="M 64 79 Q 69 71 74 79" />
          <path className={`mascot-eye${speaking ? ' mascot-eye-talking' : ''}`} d="M 86 79 Q 91 71 96 79" />
          <circle className={`mascot-chest-light${speaking ? ' mascot-chest-light-talking' : ''}`} cx="80" cy="119" r="6" />
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

        {/* Arm + wand — always drawn on the character's right side; mirrored to the left (inline
            style, see above) whenever the real target angle puts it on that half. Resting: arm
            tucked down at the body's side, wand retracted (scaled to nothing) so it reads as
            put-away, not just invisible. */}
        <g className="mascot-arm-mirror" style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
          <g
            className={`mascot-arm${hasAngle ? ' mascot-arm-raised' : ''}`}
            style={hasAngle ? { transform: `rotate(${armRotateDeg}deg)` } : undefined}
          >
            <rect className="mascot-arm-limb" x="111" y="68" width="16" height="34" rx="8" />
            <g className="mascot-wand">
              <rect className="mascot-wand-stick" x="115.5" y="100" width="7" height="42" rx="3.5" />
              <circle className="mascot-wand-tip" cx="119" cy="142" r="6" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
