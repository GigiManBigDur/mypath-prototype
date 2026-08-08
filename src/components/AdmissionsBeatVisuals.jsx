// Admissions Overview Presentation, Stage 2, Batch 1 of 5 (see CLAUDE.md) — real, distinct visuals
// for the Introduction and The Big Picture modules only (6 beats), the first of several small,
// incremental batches building toward all 10 modules. Every other beat (modules 3-10) has no entry
// here yet and keeps falling back to Stage 1's own plain placeholder note — see
// `AdmissionsPresentationScreen.jsx`'s own lookup logic.
//
// Pure inline SVG, matching this codebase's own standing preference for hand-drawn illustration
// over image assets (MascotIcon.jsx, WelcomeScreen's trail). Deliberately simple, static shapes
// with a single lightweight fade-in entrance (no elaborate particle effects or layered animation —
// that's explicitly Stage 3, once every visual batch is done) — colored via this app's own shared
// "bloom" CSS custom properties, never a second, invented palette.
//
// `BEAT_VISUALS` is keyed by `${module.id}-${beatIndex}` (admissionsPresentation.js's own real
// module ids). Each entry is either:
//   - a component function -> rendered as a standalone supporting illustration alongside the mascot
//   - `{ mascotPointAngle: number }` -> no separate illustration; the beat is fundamentally about
//     the mascot's OWN gesture, so it reuses the EXISTING pointing/arm-raise system (MascotIcon.jsx)
//     at a fixed, hand-picked angle instead — genuinely reusing what's already built, never a new
//     mascot behavior invented for this feature (Task 2's own explicit instruction).
export function TangledToChecklistVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 240 140" aria-hidden="true">
      {/* A scattered, tangled little cluster of icons on the left... */}
      <g stroke="var(--bloom-ink-soft)" strokeWidth="1.5" opacity="0.7">
        <line x1="34" y1="42" x2="58" y2="70" />
        <line x1="58" y1="70" x2="30" y2="92" />
        <line x1="30" y1="92" x2="62" y2="46" />
        <line x1="34" y1="42" x2="30" y2="92" />
      </g>
      <circle cx="34" cy="42" r="7" fill="var(--bloom-purple)" />
      <circle cx="58" cy="70" r="7" fill="var(--bloom-orange)" />
      <circle cx="30" cy="92" r="7" fill="var(--bloom-pink)" />
      <circle cx="62" cy="46" r="7" fill="var(--bloom-blue)" />

      {/* ...resolving, via a simple arrow, into one organized checklist on the right. */}
      <path d="M 95 68 H 118" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" />
      <path d="M 112 61 L 122 68 L 112 75" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(140 ${40 + i * 30})`}>
          <rect width="86" height="20" rx="7" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" />
          <circle cx="14" cy="10" r="7" fill="var(--bloom-accent)" />
          <path d="M 10.5 10 L 13 12.5 L 18 7" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="28" y="7" width="46" height="6" rx="3" fill="var(--bloom-card-border)" />
        </g>
      ))}
    </svg>
  );
}

export function RoadmapDotsVisual() {
  const stops = Array.from({ length: 10 }, (_, i) => 20 + i * 22.2);
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 240 60" aria-hidden="true">
      <line x1={stops[0]} y1="30" x2={stops[9]} y2="30" stroke="var(--bloom-card-border)" strokeWidth="3" strokeLinecap="round" />
      {stops.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="30"
          r={i < 2 ? 8 : 6}
          fill={i < 2 ? 'var(--bloom-accent)' : 'var(--bloom-card)'}
          stroke={i < 2 ? 'var(--bloom-accent)' : 'var(--bloom-card-border)'}
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}

export function CrossedChecklistVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(20 ${14 + i * 40})`}>
          <rect width="24" height="24" rx="6" fill="none" stroke="var(--bloom-orange)" strokeWidth="2.5" />
          <path d="M 4 4 L 20 20" stroke="var(--bloom-orange)" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="40" y="6" width="150" height="12" rx="6" fill="var(--bloom-card-border)" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

export function PuzzlePiecesVisual() {
  // Three simple puzzle-piece shapes (a rounded square body, plus a small circular "tab"/"notch"
  // on shared edges) sliding together — approximated with plain circles rather than a hand-carved
  // jigsaw path, per Task 3's own "keep this simple" instruction; the alignment of the tabs/notches
  // across the three pieces is what reads clearly as "coming together," not literal jigsaw geometry.
  const pieceY = 42;
  const size = 48;
  const colors = ['var(--bloom-purple)', 'var(--bloom-teal)', 'var(--bloom-yellow)'];
  const xs = [22, 82, 142];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      {xs.map((x, i) => (
        <g key={x}>
          <rect x={x} y={pieceY} width={size} height={size} rx="9" fill={colors[i]} opacity="0.88" />
          {/* tab bump on the right edge, except the last piece */}
          {i < 2 && <circle cx={x + size} cy={pieceY + size / 2} r="9" fill={colors[i]} opacity="0.88" />}
          {/* notch cut into the left edge, except the first piece — a page-colored circle
              "removing" a bite, matching the previous piece's own tab position */}
          {i > 0 && <circle cx={x} cy={pieceY + size / 2} r="9" fill="var(--bloom-bg)" />}
        </g>
      ))}
    </svg>
  );
}

export function ConvergingArrowsVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 140" aria-hidden="true">
      <defs>
        <marker id="admissions-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--bloom-ink-soft)" />
        </marker>
      </defs>
      <circle cx="110" cy="72" r="6" fill="var(--bloom-purple)" />
      <circle cx="34" cy="24" r="7" fill="var(--bloom-blue)" />
      <circle cx="186" cy="24" r="7" fill="var(--bloom-orange)" />
      <circle cx="110" cy="128" r="7" fill="var(--bloom-pink)" />
      <path d="M 40 30 L 96 62" stroke="var(--bloom-ink-soft)" strokeWidth="2" fill="none" markerEnd="url(#admissions-arrowhead)" />
      <path d="M 180 30 L 124 62" stroke="var(--bloom-ink-soft)" strokeWidth="2" fill="none" markerEnd="url(#admissions-arrowhead)" />
      <path d="M 110 121 L 110 84" stroke="var(--bloom-ink-soft)" strokeWidth="2" fill="none" markerEnd="url(#admissions-arrowhead)" />
      <circle cx="110" cy="72" r="14" fill="none" stroke="var(--bloom-accent)" strokeWidth="2.5" />
    </svg>
  );
}

export const BEAT_VISUALS = {
  // "Before we dive in, let's walk through how college admissions actually works." — a welcoming
  // gesture, reusing the mascot's own existing arm-raise/pointing system at a fixed, friendly
  // up-and-out angle (no illustration alongside it; the mascot's own gesture IS the visual).
  'introduction-0': { mascotPointAngle: -55 },
  'introduction-1': TangledToChecklistVisual,
  'introduction-2': RoadmapDotsVisual,
  'big-picture-0': CrossedChecklistVisual,
  'big-picture-1': PuzzlePiecesVisual,
  'big-picture-2': ConvergingArrowsVisual,
};
