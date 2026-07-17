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
// Pointing-animation overhaul (see CLAUDE.md) — `pointing`/`leanDirection` are two more purely
// additive props, driving a real wand-based pointing gesture (replacing the old separate arrow
// element, HubScreen.jsx's own former `PointerArrow`). `pointing` is a plain boolean (the caller
// passes `isSpeaking` straight through — see HubScreen.jsx — so "pointing" and "currently
// speaking/being displayed" are the SAME real signal, not two independently-tracked states);
// `leanDirection` is `'left' | 'right' | null` (which side of the mascot the current target tile
// is actually on, measured — see HubScreen.jsx's `useLeanDirection`). Structured as TWO new
// sibling groups layered on top of the untouched body:
//   - `.mascot-pose` (new OUTERMOST wrapper, added around everything below) leans the WHOLE
//     character a few degrees toward the target when pointing — a CSS `transition` (not a
//     keyframe animation) on `transform`, so simply toggling the `pointing`/`lean-left`/
//     `lean-right` classes on/off is what gives the "start-pointing"/"end-pointing" transitions
//     for free, with zero extra JS state machine needed.
//   - `.mascot-arm`/`.mascot-wand` (new, a sibling of `.mascot-bob`, NOT nested inside it) raise
//     from a resting, tucked-at-the-side pose to an extended point, also via CSS transitions on
//     the SAME `pointing` toggle. Deliberately a SIBLING of `.mascot-bob`, not a child of it —
//     `.mascot-bob` already owns its own `transform` (the idle/speaking bob animation), and a CSS
//     transform on one element REPLACES rather than composes with another rule's transform on
//     that SAME element (the exact landmine this codebase's own WelcomeScreen/Roadmap.jsx/hub-tile
//     transforms already document repeatedly) — keeping the arm+wand as a separate sibling group
//     is what lets the body's own bob/speaking animation and the arm's own raise animation run
//     simultaneously without one silently overwriting the other. The arm is drawn once, on the
//     character's right side, and mirrored via `scaleX(-1)` on its own outer wrapper
//     (`.mascot-arm-mirror`) when `leanDirection === 'left'` — a THIRD, separate element, so the
//     mirror-flip and the raise-rotation (an inner child of the mirror wrapper) don't collide with
//     each other either, for the same "different elements, different concerns" reason.
// The wand's own continuous "held pose, not frozen" motion (Task 2's own explicit requirement) is
// a slow glow pulse on just the wand's tip (`.mascot-wand-tip`, animating `opacity`+`r`, not
// `transform`, so it can run as a plain `animation` alongside the wand's own `transition`-driven
// extend/retract with zero property conflicts) — active only while actually raised, so it never
// runs during idle.
export default function MascotIcon({ size = 140, speaking = false, pointing = false, leanDirection = null }) {
  // A real pointing pose needs a real, measured direction — with neither (still measuring, e.g.
  // the very first frame after mount), the character simply stays in its centered idle pose
  // rather than guessing a side, same "don't fake it" posture the old PointerArrow already held
  // for its own angle.
  const isPointing = pointing && !!leanDirection;
  const leanClass = leanDirection === 'left' ? ' mascot-lean-left' : leanDirection === 'right' ? ' mascot-lean-right' : '';

  return (
    <svg className="mascot-svg" viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
      {/* Fixed, not part of the bob group — a still shadow under a bobbing body is what actually
          sells the "lifting" illusion; a shadow that moves in lockstep with the body wouldn't. */}
      <ellipse className="mascot-shadow" cx="80" cy="149" rx="36" ry="7" />
      <g className={`mascot-pose${isPointing ? ' mascot-pointing' : ''}${leanClass}`}>
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

        {/* Arm + wand — always drawn on the character's right side; mirrored to the left via
            `.mascot-lean-left`'s own CSS rule when pointing that way (see the header comment
            above for why this lives in its own wrapper rather than flipping `.mascot-arm`
            itself). Resting: arm tucked down at the body's side, wand retracted (scaled to
            nothing) so it reads as put-away, not just invisible. */}
        <g className="mascot-arm-mirror">
          <g className={`mascot-arm${isPointing ? ' mascot-arm-raised' : ''}`}>
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
