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

// Stage 2, Batch 2 of 5 (see CLAUDE.md) — Academics, Testing, Essays. Same conventions as Batch 1:
// simple, static shapes, colored via the shared "bloom" tokens only, one shared entrance fade
// (`admissions-visual-in`, global.css) rather than a bespoke animation per visual. A few of these
// (Testing's labeled target/stamp/doors, Essays' draft numbers) use small, plain SVG `<text>` —
// genuinely the simplest way to convey a beat whose own Stage 1 script explicitly calls for a
// literal label/stamp/number, not "elaborate," and not a deviation from Batch 1's own abstract-
// shape approach where that approach already fully conveyed a beat's meaning without needing text.
export function BuildingOnTranscriptVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 140" aria-hidden="true">
      {/* the transcript — a document base with ruled lines */}
      <rect x="40" y="98" width="120" height="32" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      {[108, 116, 124].map((y) => (
        <rect key={y} x="52" y={y} width="96" height="3" rx="1.5" fill="var(--bloom-card-border)" />
      ))}
      {/* the building, resting on top of it */}
      <rect x="75" y="35" width="50" height="63" fill="var(--bloom-blue)" opacity="0.88" />
      <path d="M 70 35 L 100 14 L 130 35 Z" fill="var(--bloom-orange)" />
      {[0, 1].flatMap((row) => [0, 1, 2].map((col) => (
        <rect key={`${row}-${col}`} x={83 + col * 12} y={46 + row * 18} width="7" height="7" rx="1.5" fill="var(--bloom-bg)" opacity="0.85" />
      )))}
    </svg>
  );
}

export function TwoPathsVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 140" aria-hidden="true">
      <circle cx="30" cy="115" r="6" fill="var(--bloom-ink-soft)" />
      {/* flat, easy path */}
      <path d="M 30 115 H 110" stroke="var(--bloom-card-border)" strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" />
      <circle cx="110" cy="115" r="5" fill="var(--bloom-card-border)" />
      {/* uphill, rigorous path, ending in a flag */}
      <path d="M 30 115 L 170 30" stroke="var(--bloom-orange)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M 170 30 V 12" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 170 12 L 189 18 L 170 24 Z" fill="var(--bloom-orange)" />
    </svg>
  );
}

export function CourseLevelUpVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(20 ${16 + i * 32})`}>
          <rect width="150" height="20" rx="7" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" />
          <circle cx="14" cy="10" r="7" fill="var(--bloom-card-border)" />
          <rect x="28" y="7" width="100" height="6" rx="3" fill="var(--bloom-card-border)" opacity="0.7" />
        </g>
      ))}
      {/* the leveled-up course — offset, accent-colored, a star instead of a plain marker */}
      <g transform="translate(32 84)">
        <rect width="164" height="24" rx="8" fill="var(--bloom-yellow)" opacity="0.22" stroke="var(--bloom-yellow)" strokeWidth="2" />
        <g transform="translate(15 12)" fill="var(--bloom-yellow)">
          <path d="M 0 -9 L 2.4 -2.4 L 9 0 L 2.4 2.4 L 0 9 L -2.4 2.4 L -9 0 L -2.4 -2.4 Z" />
        </g>
        <rect x="30" y="8" width="112" height="8" rx="4" fill="var(--bloom-ink)" opacity="0.55" />
      </g>
    </svg>
  );
}

export function RigorBarChartVisual() {
  const bars = [
    { x: 34, h: 32, color: 'var(--bloom-teal)' },
    { x: 90, h: 56, color: 'var(--bloom-purple)' },
    { x: 146, h: 82, color: 'var(--bloom-orange)' },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <line x1="20" y1="112" x2="200" y2="112" stroke="var(--bloom-card-border)" strokeWidth="2.5" strokeLinecap="round" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={112 - b.h} width="34" height={b.h} rx="8" fill={b.color} opacity="0.88" />
      ))}
    </svg>
  );
}

export function PracticeTargetVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 160 150" aria-hidden="true">
      <circle cx="80" cy="58" r="42" fill="none" stroke="var(--bloom-card-border)" strokeWidth="3" />
      <circle cx="80" cy="58" r="27" fill="none" stroke="var(--bloom-teal)" strokeWidth="3" opacity="0.7" />
      <circle cx="80" cy="58" r="12" fill="var(--bloom-teal)" />
      <text x="80" y="128" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="13" fontWeight="700" fill="var(--bloom-ink-soft)">no pressure</text>
    </svg>
  );
}

export function PracticeExamStampVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 140" aria-hidden="true">
      <rect x="30" y="15" width="110" height="110" rx="8" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      {[35, 47, 59, 71].map((y, i) => (
        <rect key={y} x="45" y={y} width={i === 3 ? 50 : 80} height="5" rx="2.5" fill="var(--bloom-card-border)" opacity="0.7" />
      ))}
      <g transform="translate(85 88) rotate(-16)">
        <rect x="-58" y="-16" width="116" height="32" rx="6" fill="none" stroke="var(--bloom-orange)" strokeWidth="2.5" opacity="0.9" />
        <text textAnchor="middle" y="6" fontFamily="'IBM Plex Sans', sans-serif" fontSize="15" fontWeight="800" letterSpacing="1" fill="var(--bloom-orange)">PRACTICE</text>
      </g>
    </svg>
  );
}

export function RetakeCalendarVisual() {
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      cells.push({ x: 32 + col * 24, y: 64 + row * 18, highlight: row === 2 && col === 3 });
    }
  }
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 180 150" aria-hidden="true">
      <rect x="20" y="25" width="140" height="110" rx="10" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <rect x="20" y="25" width="140" height="24" rx="10" fill="var(--bloom-teal)" opacity="0.85" />
      <circle cx="55" cy="20" r="4" fill="var(--bloom-ink-soft)" />
      <circle cx="125" cy="20" r="4" fill="var(--bloom-ink-soft)" />
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width="16"
          height="12"
          rx="3"
          fill={c.highlight ? 'var(--bloom-orange)' : 'var(--bloom-card-border)'}
          opacity={c.highlight ? 1 : 0.55}
        />
      ))}
    </svg>
  );
}

export function DoorsChoiceVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 240 150" aria-hidden="true">
      <g transform="translate(25 20)">
        <rect width="90" height="105" rx="10" fill="var(--bloom-blue)" opacity="0.85" />
        <circle cx="76" cy="55" r="4" fill="var(--bloom-card)" />
        <text x="45" y="128" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fontWeight="700" fill="var(--bloom-ink-soft)">Submit Scores</text>
      </g>
      <g transform="translate(135 20)">
        <rect width="90" height="105" rx="10" fill="var(--bloom-purple)" opacity="0.85" />
        <circle cx="14" cy="55" r="4" fill="var(--bloom-card)" />
        <text x="45" y="128" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fontWeight="700" fill="var(--bloom-ink-soft)">Test-Optional</text>
      </g>
    </svg>
  );
}

export function EssayDocumentVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 140 130" aria-hidden="true">
      <path d="M 30 10 H 92 L 110 28 V 110 H 30 Z" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <path d="M 92 10 L 92 28 L 110 28 Z" fill="var(--bloom-card-border)" />
      {[45, 55, 65, 75, 85].map((y, i) => (
        <rect key={y} x="42" y={y} width={i === 4 ? 38 : 56} height="4" rx="2" fill="var(--bloom-card-border)" opacity="0.75" />
      ))}
      {/* a small pencil, to make this read as an essay being actively written, not just any doc */}
      <g transform="translate(96 104) rotate(-45)">
        <rect x="-4" y="-16" width="8" height="26" rx="2" fill="var(--bloom-orange)" />
        <path d="M -4 -16 L 0 -24 L 4 -16 Z" fill="var(--bloom-ink)" />
      </g>
    </svg>
  );
}

export function BookOpeningTabsVisual() {
  const tabColors = ['var(--bloom-purple)', 'var(--bloom-teal)', 'var(--bloom-orange)', 'var(--bloom-pink)'];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 140" aria-hidden="true">
      <g transform="translate(110 80) rotate(-7)">
        <rect x="-84" y="-52" width="84" height="100" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      </g>
      <g transform="translate(110 80) rotate(7)">
        <rect x="0" y="-52" width="84" height="100" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
        {tabColors.map((c, i) => (
          <rect key={c} x="78" y={-38 + i * 24} width="18" height="16" rx="4" fill={c} opacity="0.9" />
        ))}
      </g>
    </svg>
  );
}

export function DraftStackVisual() {
  const drafts = [
    { dx: -18, dy: 22, num: '1', opacity: 0.55 },
    { dx: -6, dy: 10, num: '2', opacity: 0.78 },
    { dx: 8, dy: -4, num: '3', opacity: 1 },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 140" aria-hidden="true">
      {drafts.map((d) => (
        <g key={d.num} transform={`translate(${88 + d.dx} ${70 + d.dy})`} opacity={d.opacity}>
          <rect x="-40" y="-46" width="80" height="92" rx="8" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
          {[-28, -16, -4].map((y) => (
            <rect key={y} x="-24" y={y} width="48" height="4" rx="2" fill="var(--bloom-card-border)" />
          ))}
          <circle cx="26" cy="34" r="11" fill="var(--bloom-accent)" />
          <text x="26" y="38" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fontWeight="800" fill="white">{d.num}</text>
        </g>
      ))}
    </svg>
  );
}

export function TwoVoicesVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <g transform="translate(20 20)">
        <path d="M 6 0 H 74 A 8 8 0 0 1 82 8 V 46 A 8 8 0 0 1 74 54 H 24 L 8 68 L 12 54 H 6 A 8 8 0 0 1 -2 46 V 8 A 8 8 0 0 1 6 0 Z" fill="var(--bloom-card-border)" opacity="0.8" />
        <rect x="16" y="20" width="50" height="4" rx="2" fill="var(--bloom-card)" opacity="0.8" />
        <rect x="16" y="32" width="34" height="4" rx="2" fill="var(--bloom-card)" opacity="0.8" />
      </g>
      <g transform="translate(120 20)">
        <path d="M 6 0 H 74 A 8 8 0 0 1 82 8 V 46 A 8 8 0 0 1 74 54 H 24 L 8 68 L 12 54 H 6 A 8 8 0 0 1 -2 46 V 8 A 8 8 0 0 1 6 0 Z" fill="var(--bloom-pink)" />
        <path d="M 14 20 Q 24 14 34 20 T 54 20" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 14 34 Q 30 40 46 32" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Stage 2, Batch 3 of 5 (see CLAUDE.md) — Extracurriculars & the Spike, Recommendation Letters,
// Building Your List. Same conventions as Batches 1/2: simple static shapes, the shared
// `admissions-visual-in` entrance fade only, bloom tokens only, minimal `<text>` reserved for
// beats whose own Stage 1 script explicitly calls for a literal label/name.
export function ClutteredClubsVisual() {
  const dots = [18, 46, 74, 102, 130, 158, 186, 32, 88, 144];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 210 90" aria-hidden="true">
      {dots.map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 === 0 ? 30 : 58} r="10" fill="var(--bloom-ink-soft)" opacity="0.28" />
      ))}
    </svg>
  );
}

export function SpikePeakVisual() {
  const hills = [24, 54, 150, 180];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <line x1="12" y1="108" x2="208" y2="108" stroke="var(--bloom-card-border)" strokeWidth="2.5" strokeLinecap="round" />
      {hills.map((x) => (
        <path key={x} d={`M ${x - 18} 108 Q ${x} 80 ${x + 18} 108 Z`} fill="var(--bloom-teal)" opacity="0.5" />
      ))}
      <path d="M 84 108 L 110 24 L 136 108 Z" fill="var(--bloom-orange)" />
    </svg>
  );
}

export function SpikeFocusVisual() {
  const scattered = [
    { x: 30, y: 26 }, { x: 172, y: 30 }, { x: 26, y: 90 }, { x: 176, y: 86 },
    { x: 44, y: 60 }, { x: 158, y: 58 },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 120" aria-hidden="true">
      {scattered.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r="6" fill="var(--bloom-ink-soft)" opacity="0.3" />
      ))}
      {/* a soft glow behind the one focused point — a plain low-opacity circle, not an SVG
          filter/blur, per Task 2's own "keep this simple" instruction */}
      <circle cx="100" cy="58" r="26" fill="var(--bloom-yellow)" opacity="0.25" />
      <circle cx="100" cy="58" r="15" fill="var(--bloom-yellow)" />
    </svg>
  );
}

export function GrowthComparisonVisual() {
  // A small stem+leaf shape at 3 growing sizes (echoing the mascot's own leaf-sprout design —
  // MascotIcon.jsx's `mascot-leaf-shape` paths — reused/scaled here rather than a second,
  // unrelated plant shape) versus one placed abruptly full-size with a dashed "not real" outline.
  const leaf = (scale, x, y, dashed) => (
    <g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-2" y="0" width="4" height="20" rx="2" fill="var(--bloom-card-border)" />
      <g transform="translate(0 0)" stroke={dashed ? 'var(--bloom-ink-soft)' : 'none'} strokeDasharray={dashed ? '3 3' : undefined} strokeWidth={dashed ? '1.5' : '0'}>
        <path d="M 0 2 Q -13 -6 -8 -18 Q 5 -12 0 2 Z" fill={dashed ? 'none' : 'var(--bloom-accent)'} />
        <path d="M 0 2 Q 13 -6 8 -18 Q -5 -12 0 2 Z" fill={dashed ? 'none' : 'var(--bloom-accent)'} />
      </g>
    </g>
  );
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 110" aria-hidden="true">
      <line x1="10" y1="95" x2="102" y2="95" stroke="var(--bloom-card-border)" strokeWidth="2" strokeDasharray="4 4" />
      {leaf(0.5, 26, 75, false)}
      {leaf(0.75, 54, 75, false)}
      {leaf(1, 84, 75, false)}
      <line x1="130" y1="95" x2="196" y2="95" stroke="var(--bloom-card-border)" strokeWidth="2" strokeDasharray="4 4" />
      {leaf(1.15, 165, 75, true)}
    </svg>
  );
}

export function SpecificLetterVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 160 130" aria-hidden="true">
      <rect x="20" y="10" width="120" height="110" rx="8" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      {[28, 40, 52].map((y) => (
        <rect key={y} x="36" y={y} width="88" height="5" rx="2.5" fill="var(--bloom-card-border)" opacity="0.7" />
      ))}
      <rect x="36" y="70" width="88" height="22" rx="6" fill="var(--bloom-accent)" opacity="0.18" stroke="var(--bloom-accent)" strokeWidth="2" />
      <rect x="44" y="77" width="60" height="6" rx="3" fill="var(--bloom-accent)" />
      <rect x="36" y="100" width="60" height="5" rx="2.5" fill="var(--bloom-card-border)" opacity="0.7" />
    </svg>
  );
}

export function RealConversationVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      <circle cx="46" cy="40" r="16" fill="var(--bloom-teal)" />
      <circle cx="86" cy="46" r="13" fill="var(--bloom-purple)" />
      <path d="M 60 38 Q 68 30 76 38" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="26" y="66" width="76" height="4" rx="2" fill="var(--bloom-card-border)" opacity="0.6" />

      <g opacity="0.55">
        <rect x="130" y="30" width="70" height="18" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" />
        <circle cx="144" cy="39" r="6" fill="var(--bloom-card-border)" />
        <rect x="156" y="36" width="36" height="5" rx="2.5" fill="var(--bloom-card-border)" />
        <rect x="130" y="52" width="70" height="18" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" />
        <circle cx="144" cy="61" r="6" fill="var(--bloom-card-border)" />
        <rect x="156" y="58" width="36" height="5" rx="2.5" fill="var(--bloom-card-border)" />
      </g>
    </svg>
  );
}

export function AskEarlyTimelineVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 100" aria-hidden="true">
      <line x1="20" y1="55" x2="200" y2="55" stroke="var(--bloom-card-border)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="55" r="10" fill="var(--bloom-accent)" />
      <rect x="34" y="20" width="52" height="16" rx="8" fill="var(--bloom-accent)" opacity="0.85" />
      <circle cx="176" cy="55" r="8" fill="var(--bloom-orange)" opacity="0.85" />
      <rect x="146" y="70" width="60" height="16" rx="8" fill="var(--bloom-orange)" opacity="0.5" />
    </svg>
  );
}

export function FolderHandoffVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 110" aria-hidden="true">
      <path d="M 20 30 H 60 L 70 42 H 130 V 92 H 20 Z" fill="var(--bloom-yellow)" opacity="0.85" />
      <rect x="34" y="50" width="18" height="24" rx="3" fill="var(--bloom-card)" />
      <rect x="58" y="54" width="42" height="6" rx="3" fill="var(--bloom-card)" opacity="0.9" />
      <rect x="58" y="66" width="30" height="6" rx="3" fill="var(--bloom-card)" opacity="0.9" />

      <path d="M 140 60 H 168" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" />
      <path d="M 162 53 L 172 60 L 162 67" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="196" cy="55" r="14" fill="var(--bloom-purple)" opacity="0.85" />
    </svg>
  );
}

export function ReachMatchSafetyBasketsVisual() {
  // Reuses this app's own real, already-established Reach/Match/Safety color convention
  // (programs.js's reachMatchSafetyTag / ProgramSummaryScreen's own RMS badges — orange/yellow/
  // green) rather than inventing a new color mapping for the identical concept.
  const tiers = [
    { x: 20, color: 'var(--bloom-orange)' },
    { x: 90, color: 'var(--bloom-yellow)' },
    { x: 160, color: 'var(--bloom-green)' },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 110" aria-hidden="true">
      {tiers.map((t) => (
        <g key={t.x}>
          <path d={`M ${t.x} 60 H ${t.x + 40} L ${t.x + 36} 96 H ${t.x + 4} Z`} fill={t.color} opacity="0.85" />
          <rect x={t.x + 6} y="42" width="12" height="14" rx="3" fill={t.color} />
          <rect x={t.x + 22} y="46" width="12" height="14" rx="3" fill={t.color} opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

export function FitCirclesVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <circle cx="88" cy="55" r="46" fill="var(--bloom-teal)" opacity="0.55" />
      <circle cx="132" cy="55" r="46" fill="var(--bloom-purple)" opacity="0.55" />
      <circle cx="110" cy="90" r="46" fill="var(--bloom-orange)" opacity="0.55" />
      <text x="60" y="42" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fontWeight="700" fill="var(--bloom-ink)">Academic</text>
      <text x="158" y="42" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fontWeight="700" fill="var(--bloom-ink)">Social</text>
      <text x="110" y="122" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="11" fontWeight="700" fill="var(--bloom-ink)">Financial</text>
    </svg>
  );
}

export function GenuineSafetyVisual() {
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 160 130" aria-hidden="true">
      <rect x="30" y="60" width="100" height="50" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <path d="M 22 60 L 80 24 L 138 60 Z" fill="var(--bloom-orange)" />
      <rect x="66" y="80" width="28" height="30" fill="var(--bloom-card-border)" opacity="0.6" />
      <circle cx="118" cy="34" r="18" fill="var(--bloom-accent)" />
      <path d="M 111 34 L 116 40 L 127 27" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AcademicPlanIconVisual() {
  // A real, confirmed bug: nesting the lucide-react `Compass` component's own root <svg> directly
  // inside this hand-drawn <svg> rendered ZERO visible pixels (confirmed via screenshot — even the
  // surrounding dashed path/circle, which sit as plain sibling elements, showed up fine, isolating
  // the problem to the nested-icon technique itself, not this component's other markup). Rather
  // than chase that down, the compass is hand-drawn directly as plain SVG — a circle outline plus a
  // classic two-triangle needle — matching this file's own established "pure inline SVG shapes,
  // nothing nested" pattern every other visual here already uses, and a deliberate callback to this
  // app's own real Compass motif (the brand icon in the persistent header bar, and the original
  // pre-redesign mascot's own needle emblem) rather than an arbitrary new icon shape.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 120" aria-hidden="true">
      <path d="M 20 100 Q 60 40 100 70 T 180 20" stroke="var(--bloom-card-border)" strokeWidth="3" strokeDasharray="6 6" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="60" r="34" fill="var(--bloom-accent)" opacity="0.16" />
      <circle cx="100" cy="60" r="26" fill="var(--bloom-card)" stroke="var(--bloom-accent)" strokeWidth="3.5" />
      <g transform="translate(100 60) rotate(-35)">
        <path d="M 0 -18 L 6 0 L 0 6 Z" fill="var(--bloom-accent)" />
        <path d="M 0 18 L -6 0 L 0 -6 Z" fill="var(--bloom-card-border)" />
      </g>
    </svg>
  );
}

// Stage 2, Batch 4 of 5 (see CLAUDE.md), FINAL module batch — The Four-Year Arc, Transition.
// Same conventions as every prior batch: static shapes, the shared `admissions-visual-in` fade
// only, bloom tokens only.
//
// The Four-Year Arc is the one module built as a single, CONTINUOUS motif (this batch's own Task
// 1 instruction) rather than 5 independently-designed illustrations — a real timeline with 5
// stops (Freshman/Sophomore/Junior/Summer/Senior), each with its own small distinguishing icon,
// and a "you are here" marker + progress fill tracking how far along it the mascot has "walked" as
// each beat advances. `FourYearArcTimeline({ stopIndex })` is the one shared internal component;
// it's wrapped by 5 tiny, parameter-less named exports below so `BEAT_VISUALS` itself never needs
// a new entry SHAPE for this — every other beat in this whole feature is still just `key ->
// component-with-no-props`, so this keeps that one contract intact rather than special-casing the
// screen's own lookup logic for one module.
const YEAR_STOPS = [
  { x: 30 }, { x: 83 }, { x: 136 }, { x: 189 }, { x: 240 },
];

function YearStopIcon({ index, color }) {
  switch (index) {
    case 0: // Freshman — a small leaf/sprout pair, echoing the mascot's own leaf design (habits,
            // building a foundation)
      return (
        <g>
          <path d="M 0 4 Q -8 -3 -5 -11 Q 3 -7 0 4 Z" fill={color} />
          <path d="M 0 4 Q 8 -3 5 -11 Q -3 -7 0 4 Z" fill={color} />
        </g>
      );
    case 1: // Sophomore — a small upward chevron (adding rigor)
      return <path d="M -6 4 L 0 -6 L 6 4" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    case 2: // Junior — a small peak (the big push)
      return <path d="M -8 4 L 0 -12 L 8 4 Z" fill={color} />;
    case 3: // Summer — a small sun
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round">
          <circle cx="0" cy="-2" r="5" fill={color} stroke="none" />
          <line x1="0" y1="-13" x2="0" y2="-9" />
          <line x1="-9" y1="-2" x2="-12" y2="-2" />
          <line x1="9" y1="-2" x2="12" y2="-2" />
          <line x1="-6.5" y1="-7.5" x2="-8.5" y2="-9.5" />
          <line x1="6.5" y1="-7.5" x2="8.5" y2="-9.5" />
        </g>
      );
    default: // Senior — a small flag (finish line)
      return (
        <g>
          <line x1="0" y1="4" x2="0" y2="-14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 0 -14 L 12 -10 L 0 -6 Z" fill={color} />
        </g>
      );
  }
}

function FourYearArcTimeline({ stopIndex }) {
  const activeX = YEAR_STOPS[stopIndex].x;
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 260 120" aria-hidden="true">
      <line x1="25" y1="95" x2="240" y2="95" stroke="var(--bloom-card-border)" strokeWidth="3" strokeLinecap="round" />
      <line x1="25" y1="95" x2={activeX} y2="95" stroke="var(--bloom-accent)" strokeWidth="3" strokeLinecap="round" />
      {YEAR_STOPS.map((stop, i) => {
        const active = i === stopIndex;
        return (
          <g key={stop.x} transform={`translate(${stop.x} ${active ? 62 : 78}) scale(${active ? 1.3 : 0.85})`} opacity={active ? 1 : 0.5}>
            <YearStopIcon index={i} color={active ? 'var(--bloom-accent)' : 'var(--bloom-card-border)'} />
          </g>
        );
      })}
      {/* the "you are here" marker, tracking progress along the real timeline */}
      <circle cx={activeX} cy="95" r="12" fill="var(--bloom-accent)" opacity="0.22" />
      <circle cx={activeX} cy="95" r="7" fill="var(--bloom-accent)" />
    </svg>
  );
}

export function FourYearArcFreshmanVisual() { return <FourYearArcTimeline stopIndex={0} />; }
export function FourYearArcSophomoreVisual() { return <FourYearArcTimeline stopIndex={1} />; }
export function FourYearArcJuniorVisual() { return <FourYearArcTimeline stopIndex={2} />; }
export function FourYearArcSummerVisual() { return <FourYearArcTimeline stopIndex={3} />; }
export function FourYearArcSeniorVisual() { return <FourYearArcTimeline stopIndex={4} />; }

export function AllStopsLitVisual() {
  // The exact same 10-dot roadmap geometry `RoadmapDotsVisual` (Batch 1's own Introduction module)
  // already established — deliberately NOT that same component reused directly, since it's fixed
  // at "only the first 2 dots lit" and Batch 1's own components must stay byte-for-byte untouched —
  // this is a genuinely new, sibling component with every dot (and the baseline itself) lit, for
  // "the same 10-stop map from the Introduction, now fully lit up."
  const stops = Array.from({ length: 10 }, (_, i) => 20 + i * 22.2);
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 240 60" aria-hidden="true">
      <line x1={stops[0]} y1="30" x2={stops[9]} y2="30" stroke="var(--bloom-accent)" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      {stops.map((x) => (
        <circle key={x} cx={x} cy="30" r="8" fill="var(--bloom-accent)" stroke="var(--bloom-accent)" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

export function YouPuzzlePieceVisual() {
  // The same interlocking tab/notch technique `PuzzlePiecesVisual` (Batch 1's Big Picture module)
  // already established, extended with a 4th, larger, distinctly-labeled piece joining the
  // existing 3 — "a single puzzle piece labeled 'You' fitting into the picture from module 2."
  const pieceY = 50;
  const size = 38;
  const colors = ['var(--bloom-purple)', 'var(--bloom-teal)', 'var(--bloom-yellow)'];
  const xs = [14, 60, 106];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      {xs.map((x, i) => (
        <g key={x} opacity="0.7">
          <rect x={x} y={pieceY} width={size} height={size} rx="8" fill={colors[i]} />
          <circle cx={x + size} cy={pieceY + size / 2} r="7" fill={colors[i]} />
          {i > 0 && <circle cx={x} cy={pieceY + size / 2} r="7" fill="var(--bloom-bg)" />}
        </g>
      ))}
      <g>
        <rect x="152" y="38" width="56" height="56" rx="10" fill="var(--bloom-accent)" />
        <circle cx="152" cy="66" r="9" fill="var(--bloom-bg)" />
        <text x="180" y="72" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="15" fontWeight="800" fill="white">You</text>
      </g>
    </svg>
  );
}

// Undergrad (Grad School) Admissions Overview, Stage 2, Batch 1 of 5 (see CLAUDE.md) — real,
// distinct visuals for the GRAD SCRIPT's own Introduction and The Big Picture modules (7 beats:
// grad-introduction's 3, grad-big-picture's 4) — the first Stage-2 visual batch for the grad
// script, mirroring the exact "small, incremental batches" approach the HS script's own Stage 2
// already established above. Same conventions throughout: pure inline SVG, bloom tokens only, one
// shared entrance fade (`admissions-visual-in`, global.css), no elaborate particle effects (that's
// the final transition-polish stage, once every visual batch across every script is done). Every
// entry below is keyed under the grad script's own namespaced `grad-*` module ids
// (admissionsPresentationGrad.js), so nothing here can ever collide with the HS entries above or
// bleed into that script's own rendering — the same "namespace the ids, never worry about
// collision" guarantee Stage 1 already established for the grad script's own content.
export function BroadVsFocusedVisual() {
  // "Two silhouettes side by side: one wide and shallow, one narrow and deep" — two low, wide,
  // muted shapes (broad, shallow) beside one tall, narrow, accent-colored shape (focused, deep).
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <line x1="15" y1="120" x2="205" y2="120" stroke="var(--bloom-card-border)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="15" y="94" width="46" height="26" rx="7" fill="var(--bloom-card-border)" opacity="0.55" />
      <rect x="66" y="94" width="46" height="26" rx="7" fill="var(--bloom-card-border)" opacity="0.4" />
      <rect x="150" y="26" width="40" height="94" rx="10" fill="var(--bloom-purple)" />
    </svg>
  );
}

export function WeightedScaleVisual() {
  // "A scale, subtly different in shape from a college-admissions scale" — a balance beam tilted
  // asymmetrically (not perfectly level), with one pan hanging noticeably lower/heavier than the
  // other, to read as "holistic, but weighted differently" rather than an evenly-balanced scale.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 130" aria-hidden="true">
      <line x1="100" y1="34" x2="100" y2="105" stroke="var(--bloom-card-border)" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="105" x2="130" y2="105" stroke="var(--bloom-card-border)" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="26" x2="168" y2="46" stroke="var(--bloom-ink-soft)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="35" r="4" fill="var(--bloom-ink-soft)" />
      <line x1="32" y1="26" x2="32" y2="50" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <path d="M 16 50 A 16 9 0 0 0 48 50 Z" fill="var(--bloom-teal)" opacity="0.85" />
      <line x1="168" y1="46" x2="168" y2="76" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <path d="M 149 76 A 19 10 0 0 0 187 76 Z" fill="var(--bloom-orange)" />
    </svg>
  );
}

export function FourDocsConvergeVisual() {
  // "Four documents converging into one folder" — four small document icons at the corners, each
  // with a thin connecting line leading into one central folder receiving all four.
  const docs = [
    { x: 20, y: 14 }, { x: 160, y: 14 }, { x: 20, y: 84 }, { x: 160, y: 84 },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 140" aria-hidden="true">
      {docs.map((d) => (
        <g key={`${d.x}-${d.y}`}>
          <rect x={d.x} y={d.y} width="34" height="42" rx="4" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
          <rect x={d.x + 6} y={d.y + 10} width="22" height="3" rx="1.5" fill="var(--bloom-card-border)" />
          <rect x={d.x + 6} y={d.y + 18} width="22" height="3" rx="1.5" fill="var(--bloom-card-border)" />
          <rect x={d.x + 6} y={d.y + 26} width="14" height="3" rx="1.5" fill="var(--bloom-card-border)" />
        </g>
      ))}
      <path d="M 50 40 L 90 62" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M 165 40 L 130 62" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M 50 90 L 90 76" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M 165 90 L 130 76" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M 88 60 H 112 L 122 70 H 160 V 104 H 88 Z" fill="var(--bloom-accent)" opacity="0.9" />
    </svg>
  );
}

export function FacultyFitVisual() {
  // The task's own explicit example for a beat about research/program fit mattering: a "You" icon
  // connecting to a specific lab/faculty icon — a uniquely-shaped hexagon (not just another circle)
  // to read as "one particular match," not an interchangeable connection — with a small glow where
  // the dashed line snaps into alignment. Paired with a real mascot gesture (BEAT_VISUALS entry
  // below), the same "mascot points, illustration sits below it" combo Essays/Recommendation
  // Letters/Transition already established for the HS script.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 180 120" aria-hidden="true">
      <circle cx="34" cy="60" r="18" fill="var(--bloom-teal)" />
      <path d="M 52 60 H 108" stroke="var(--bloom-accent)" strokeWidth="2.5" strokeDasharray="4 4" fill="none" opacity="0.85" />
      <circle cx="108" cy="60" r="7" fill="var(--bloom-accent)" opacity="0.25" />
      <path d="M 146 34 L 168 47 L 168 73 L 146 86 L 124 73 L 124 47 Z" fill="var(--bloom-purple)" />
    </svg>
  );
}

export function GpaExpandsVisual() {
  // "Several documents all pointing/aligning toward one single target" (Stage 1's own described
  // concept), read the OTHER direction per this batch's own explicit guidance — a single GPA
  // number expanding out to the real, distinct factors (SOP, research fit, letters) that have to
  // argue the same case alongside it, echoing the same "not just one number" idea the HS script's
  // own Introduction/Big Picture batch already applied wherever it genuinely fit.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <circle cx="40" cy="65" r="26" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2.5" />
      <text x="40" y="71" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="15" fontWeight="800" fill="var(--bloom-ink-soft)">GPA</text>
      <path d="M 66 50 L 118 26" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M 68 65 L 118 65" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M 66 80 L 118 104" stroke="var(--bloom-ink-soft)" strokeWidth="1.5" opacity="0.6" fill="none" />
      {/* SOP — a small document */}
      <rect x="122" y="14" width="30" height="24" rx="4" fill="var(--bloom-orange)" />
      {/* research fit — a small flask */}
      <path d="M 128 58 L 128 66 L 118 82 H 154 L 144 66 L 144 58 Z" fill="var(--bloom-teal)" />
      {/* letters — a small envelope */}
      <rect x="122" y="98" width="34" height="22" rx="3" fill="var(--bloom-purple)" />
      <path d="M 122 98 L 139 111 L 156 98" stroke="var(--bloom-card)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Undergrad (Grad School) Admissions Overview, Stage 2, Batch 2 of 5 (see CLAUDE.md) — real,
// distinct visuals for the grad script's own Academic Record, Testing, and The Statement of
// Purpose modules (13 beats). Batch 1's own Introduction/Big Picture components and BEAT_VISUALS
// entries above are completely untouched — this batch only appends new content. Same conventions
// as every prior batch: pure inline SVG, bloom tokens only, one shared entrance fade
// (`admissions-visual-in`, global.css), no elaborate particle effects. `<text>` is used only where
// a beat is genuinely about a specific label (the 4 named exams, a faculty/lab name placeholder) —
// the same minimal-text-where-needed precedent the HS script's own batches already established.
export function GpaZoomVisual() {
  // "A magnifying glass zooming past an overall GPA number toward specific course grades" — a
  // faint, dashed-outline overall GPA number, with a magnifying glass revealing real, distinct
  // per-course grade marks instead.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <circle cx="60" cy="65" r="38" fill="none" stroke="var(--bloom-card-border)" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.6" />
      <text x="60" y="72" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="20" fontWeight="800" fill="var(--bloom-card-border)">3.6</text>
      <circle cx="146" cy="55" r="34" fill="var(--bloom-card)" stroke="var(--bloom-accent)" strokeWidth="3.5" />
      <line x1="170" y1="79" x2="188" y2="97" stroke="var(--bloom-accent)" strokeWidth="5" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="128" y={40 + i * 11} width={i === 1 ? 26 : 18} height="6" rx="3" fill={['var(--bloom-teal)', 'var(--bloom-purple)', 'var(--bloom-orange)'][i]} />
      ))}
    </svg>
  );
}

export function MajorRelevantTranscriptVisual() {
  // "A transcript with major-relevant courses highlighted, others dimmed."
  const rows = [true, false, true, false];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 140" aria-hidden="true">
      {rows.map((relevant, i) => (
        <g key={i} transform={`translate(20 ${10 + i * 30})`}>
          <rect width="180" height="22" rx="6" fill={relevant ? 'var(--bloom-accent)' : 'var(--bloom-card)'} opacity={relevant ? 0.18 : 1} stroke={relevant ? 'var(--bloom-accent)' : 'var(--bloom-card-border)'} strokeWidth="2" />
          <rect x="10" y="8" width="120" height="6" rx="3" fill={relevant ? 'var(--bloom-accent)' : 'var(--bloom-card-border)'} opacity={relevant ? 1 : 0.6} />
        </g>
      ))}
    </svg>
  );
}

export function ResearchIntoFolderVisual() {
  // "A research-paper icon sliding into the same folder as the transcript" — a folder already
  // holding transcript-like ruled lines, with a distinctly flask-marked document (research,
  // not just any document) arriving via an arrow.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      <path d="M 16 28 H 56 L 66 40 H 126 V 90 H 16 Z" fill="var(--bloom-card-border)" opacity="0.5" />
      <rect x="30" y="48" width="86" height="6" rx="3" fill="var(--bloom-card)" opacity="0.9" />
      <rect x="30" y="60" width="60" height="6" rx="3" fill="var(--bloom-card)" opacity="0.9" />
      <rect x="30" y="72" width="70" height="6" rx="3" fill="var(--bloom-card)" opacity="0.9" />
      <path d="M 138 58 H 166" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" />
      <path d="M 160 51 L 170 58 L 160 65" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="180" y="32" width="30" height="40" rx="4" fill="var(--bloom-teal)" />
      <path d="M 192 44 V 52 L 185 66 H 205 L 198 52 V 44 Z" fill="var(--bloom-card)" opacity="0.9" />
    </svg>
  );
}

export function GrowthTrendVisual() {
  // "A line graph trending upward despite one dip" — a real dip at the second point, still
  // resolving to a clear overall upward trend.
  const points = [[24, 70], [70, 82], [116, 50], [162, 34], [196, 18]];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      <line x1="20" y1="100" x2="200" y2="100" stroke="var(--bloom-card-border)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${points.map((p) => p.join(' ')).join(' L ')}`} stroke="var(--bloom-accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill="var(--bloom-accent)" />
      ))}
    </svg>
  );
}

export function FourTestDoorsVisual() {
  // "Four labeled test-icon doors, one lit up based on field" — GRE lit, as the most general/
  // common of the four for a field-unspecified default framing.
  const doors = [
    { label: 'GRE', lit: true },
    { label: 'GMAT', lit: false },
    { label: 'LSAT', lit: false },
    { label: 'MCAT', lit: false },
  ];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      {doors.map((d, i) => (
        <g key={d.label} transform={`translate(${10 + i * 52} 15)`}>
          <rect width="42" height="80" rx="6" fill={d.lit ? 'var(--bloom-accent)' : 'var(--bloom-card-border)'} opacity={d.lit ? 0.9 : 0.35} />
          <circle cx="34" cy="42" r="2.5" fill="var(--bloom-card)" />
          <text x="21" y="98" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="10" fontWeight="700" fill="var(--bloom-ink-soft)">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function TestToBuildingVisual() {
  // "The same four doors, each now leading to a distinct building icon" — 4 distinctly-colored
  // building/roof icons, one per field (business, law, medicine, general graduate study).
  const colors = ['var(--bloom-purple)', 'var(--bloom-orange)', 'var(--bloom-teal)', 'var(--bloom-yellow)'];
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      {colors.map((c, i) => (
        <g key={c} transform={`translate(${14 + i * 52} 0)`}>
          <rect y="60" width="30" height="34" rx="4" fill="var(--bloom-card-border)" opacity="0.4" />
          <line x1="15" y1="60" x2="15" y2="30" stroke="var(--bloom-ink-soft)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 0 30 L 15 8 L 30 30 Z" fill={c} opacity="0.9" />
        </g>
      ))}
    </svg>
  );
}

export function TestOptionalDoorVisual() {
  // "One of the four doors shown propped open, no test icon required" — 3 plain closed/muted
  // doors beside one genuinely swung-open door (a rotated rect hinged near its own bottom-left
  // corner) with a checkmark in place of a lock/test icon.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 120" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${14 + i * 46} 15)`}>
          <rect width="36" height="80" rx="6" fill="var(--bloom-card-border)" opacity="0.4" />
          <circle cx="30" cy="42" r="2.5" fill="var(--bloom-card)" />
        </g>
      ))}
      <g transform="translate(158 15)">
        <rect width="36" height="80" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
        <g transform="rotate(-32 4 76)">
          <rect width="36" height="80" rx="6" fill="var(--bloom-accent)" opacity="0.85" />
        </g>
        <circle cx="18" cy="40" r="12" fill="var(--bloom-accent)" opacity="0.2" />
        <path d="M 12 40 L 17 45 L 26 33" stroke="var(--bloom-accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function ProgramPolicyCheckVisual() {
  // "A magnifying glass over one specific program's own requirements page."
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 130" aria-hidden="true">
      <rect x="20" y="15" width="110" height="100" rx="8" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      {[32, 46, 60, 74, 88].map((y, i) => (
        <rect key={y} x="34" y={y} width={i === 4 ? 50 : 82} height="6" rx="3" fill="var(--bloom-card-border)" opacity="0.6" />
      ))}
      <circle cx="140" cy="70" r="30" fill="var(--bloom-card)" opacity="0.4" stroke="var(--bloom-accent)" strokeWidth="4" />
      <line x1="161" y1="91" x2="182" y2="112" stroke="var(--bloom-accent)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function SopDocumentVisual() {
  // "The mascot pointing at a glowing, central document" — the SOP's own version of
  // EssayDocumentVisual (HS's Essays beat 0), given a real glow (a soft, low-opacity accent
  // circle behind it) and an accent-colored border instead of a plain one, to read as genuinely
  // the MOST important document, not just another essay. Paired with a real mascot gesture below.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 160 140" aria-hidden="true">
      <circle cx="80" cy="70" r="52" fill="var(--bloom-accent)" opacity="0.14" />
      <path d="M 34 18 H 100 L 120 38 V 122 H 34 Z" fill="var(--bloom-card)" stroke="var(--bloom-accent)" strokeWidth="2.5" />
      <path d="M 100 18 L 100 38 L 120 38 Z" fill="var(--bloom-accent)" opacity="0.7" />
      {[52, 64, 76, 88, 100].map((y, i) => (
        <rect key={y} x="46" y={y} width={i === 4 ? 40 : 62} height="5" rx="2.5" fill="var(--bloom-card-border)" opacity="0.75" />
      ))}
    </svg>
  );
}

export function ResumeCrossedOutVisual() {
  // "A resume being crossed out, replaced by a different document" — a faded, struck-through
  // resume (with its own small "profile photo" circle, reading unmistakably as a resume rather
  // than a generic document) beside a distinct, accent-colored document taking its place.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 220 130" aria-hidden="true">
      <g opacity="0.45">
        <rect x="16" y="16" width="80" height="100" rx="6" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
        <circle cx="40" cy="36" r="8" fill="var(--bloom-card-border)" />
        {[54, 66, 78, 90].map((y) => (
          <rect key={y} x="26" y={y} width="60" height="5" rx="2.5" fill="var(--bloom-card-border)" />
        ))}
        <path d="M 12 12 L 100 120" stroke="var(--bloom-orange)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M 108 66 H 132" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" />
      <path d="M 126 59 L 136 66 L 126 73" stroke="var(--bloom-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="146" y="16" width="60" height="100" rx="6" fill="var(--bloom-accent)" opacity="0.16" stroke="var(--bloom-accent)" strokeWidth="2.5" />
      {[36, 48, 60, 72, 84, 96].map((y, i) => (
        <rect key={y} x="156" y={y} width={i % 2 === 0 ? 40 : 30} height="5" rx="2.5" fill="var(--bloom-accent)" opacity="0.8" />
      ))}
    </svg>
  );
}

export function WritingTheConnectionVisual() {
  // "A line drawing connecting a 'You' icon to a specific faculty/research icon" — deliberately a
  // DIFFERENT visual treatment from Big Picture's own `FacultyFitVisual` (a dashed line snapping
  // into place, a hexagon icon), even though the two beats share a related "fit" theme: here the
  // line is being actively DRAWN, a pen mid-stroke at its leading edge, ending at a diamond-shaped
  // icon rather than a hexagon — this beat is specifically about the act of WRITING that
  // connection, not just recognizing that it exists.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 120" aria-hidden="true">
      <circle cx="30" cy="60" r="16" fill="var(--bloom-teal)" />
      <path d="M 48 60 H 130" stroke="var(--bloom-accent)" strokeWidth="2.5" fill="none" />
      <g transform="translate(134 60) rotate(45)">
        <rect x="-4" y="-16" width="8" height="24" rx="2" fill="var(--bloom-ink)" />
        <path d="M -4 -16 L 0 -24 L 4 -16 Z" fill="var(--bloom-orange)" />
      </g>
      <path d="M 168 32 L 190 60 L 168 88 L 146 60 Z" fill="var(--bloom-purple)" />
    </svg>
  );
}

export function SpecificFacultyDocumentVisual() {
  // "A document with a highlighted faculty name and a specific lab name" — two distinct
  // accent-outlined highlight blocks standing out from the document's own plain, muted lines,
  // reading as "these two specific things are called out." Paired with a real mascot gesture,
  // the task's own literal example for this exact beat.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 160 130" aria-hidden="true">
      <path d="M 30 10 H 92 L 110 28 V 110 H 30 Z" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <path d="M 92 10 L 92 28 L 110 28 Z" fill="var(--bloom-card-border)" />
      <rect x="42" y="42" width="52" height="4" rx="2" fill="var(--bloom-card-border)" opacity="0.6" />
      <rect x="42" y="54" width="64" height="12" rx="4" fill="var(--bloom-accent)" opacity="0.2" stroke="var(--bloom-accent)" strokeWidth="1.5" />
      <rect x="42" y="72" width="50" height="12" rx="4" fill="var(--bloom-accent)" opacity="0.2" stroke="var(--bloom-accent)" strokeWidth="1.5" />
      <rect x="42" y="94" width="46" height="4" rx="2" fill="var(--bloom-card-border)" opacity="0.6" />
    </svg>
  );
}

export function VagueToSpecificVisual() {
  // Blends Stage 1's own "a red flag rising next to a vague, faded sentence" with this batch's own
  // "a document being revised from vague to specific text" guidance: the same document's own top
  // half shows dashed-outline (never filled) vague lines flagged by a small red flag, its bottom
  // half shows solid, confident, accent-colored specific lines — one document, two real states.
  return (
    <svg className="admissions-visual-svg" viewBox="0 0 200 130" aria-hidden="true">
      <rect x="20" y="12" width="120" height="106" rx="8" fill="var(--bloom-card)" stroke="var(--bloom-card-border)" strokeWidth="2" />
      <rect x="34" y="30" width="92" height="5" rx="2.5" fill="none" stroke="var(--bloom-card-border)" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="34" y="42" width="70" height="5" rx="2.5" fill="none" stroke="var(--bloom-card-border)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M 150 20 L 150 46" stroke="var(--bloom-orange)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 150 20 L 168 27 L 150 34 Z" fill="var(--bloom-orange)" />
      <rect x="34" y="66" width="92" height="6" rx="3" fill="var(--bloom-accent)" opacity="0.85" />
      <rect x="34" y="80" width="76" height="6" rx="3" fill="var(--bloom-accent)" opacity="0.85" />
      <rect x="34" y="94" width="60" height="6" rx="3" fill="var(--bloom-accent)" opacity="0.85" />
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

  // Academics
  'academics-0': BuildingOnTranscriptVisual,
  'academics-1': TwoPathsVisual,
  'academics-2': CourseLevelUpVisual,
  'academics-3': RigorBarChartVisual,

  // Testing
  'testing-0': PracticeTargetVisual,
  'testing-1': PracticeExamStampVisual,
  'testing-2': RetakeCalendarVisual,
  'testing-3': DoorsChoiceVisual,

  // Essays — the first beat is genuinely about the mascot's own gesture (pointing at the essay),
  // so it gets BOTH: the existing pointing system aimed down-and-slightly-right (where the
  // illustration renders, right below the mascot) plus the illustration itself.
  'essays-0': { mascotPointAngle: 75, Illustration: EssayDocumentVisual },
  'essays-1': BookOpeningTabsVisual,
  'essays-2': DraftStackVisual,
  'essays-3': TwoVoicesVisual,

  // Extracurriculars & the Spike
  'extracurriculars-spike-0': ClutteredClubsVisual,
  'extracurriculars-spike-1': SpikePeakVisual,
  'extracurriculars-spike-2': SpikeFocusVisual,
  'extracurriculars-spike-3': GrowthComparisonVisual,

  // Recommendation Letters — beat 1 is genuinely about a letter being written on the student's
  // behalf, so — same "mascot gesture + illustration together" pattern Essays' own beat 0 already
  // established — it gets both.
  'recommendation-letters-0': { mascotPointAngle: 75, Illustration: SpecificLetterVisual },
  'recommendation-letters-1': RealConversationVisual,
  'recommendation-letters-2': AskEarlyTimelineVisual,
  'recommendation-letters-3': FolderHandoffVisual,

  // Building Your List
  'building-your-list-0': ReachMatchSafetyBasketsVisual,
  'building-your-list-1': FitCirclesVisual,
  'building-your-list-2': GenuineSafetyVisual,
  'building-your-list-3': AcademicPlanIconVisual,

  // The Four-Year Arc — one continuous timeline motif spanning all 5 beats; see the shared
  // FourYearArcTimeline component's own comment above for why this doesn't need a new
  // BEAT_VISUALS entry shape.
  'four-year-arc-0': FourYearArcFreshmanVisual,
  'four-year-arc-1': FourYearArcSophomoreVisual,
  'four-year-arc-2': FourYearArcJuniorVisual,
  'four-year-arc-3': FourYearArcSummerVisual,
  'four-year-arc-4': FourYearArcSeniorVisual,

  // Transition — the closing module, framed as a genuine handoff. Beat 1 is deliberately
  // mascot-only with `mascotPointAngle: null` (a real, truthy BEAT_VISUALS entry — suppresses
  // Stage 1's own placeholder note — that resolves to NO gesture and NO illustration): the
  // mascot's own default, centered, forward-facing idle pose already IS "the mascot turning to
  // face the student directly," so nothing further needed to be built for it. Beat 2 closes with
  // the SAME mascot-gesture-plus-illustration pattern Essays/Recommendation Letters already
  // established twice before, pointing at the new "You" piece joining the picture.
  'transition-0': AllStopsLitVisual,
  'transition-1': { mascotPointAngle: null },
  'transition-2': { mascotPointAngle: 75, Illustration: YouPuzzlePieceVisual },

  // Undergrad (Grad School) script — Introduction. Beat 0 reuses the EXACT same friendly
  // welcoming-gesture angle as the HS script's own 'introduction-0' (a genuine reuse of the already
  // -built mascot animation system, not a new one invented for this script). Beat 2 reuses
  // `RoadmapDotsVisual` directly (not a new sibling component) — the beat describes the identical
  // "10-stop table-of-contents, each stop lighting up" concept the HS script's own equivalent beat
  // already uses, and the component is parameter-less/pure, so sharing it here is a safe, direct
  // reuse rather than needless duplication (unlike `AllStopsLitVisual`, which had to be a genuinely
  // NEW sibling because ITS meaning — every dot lit — actually differs from `RoadmapDotsVisual`'s).
  'grad-introduction-0': { mascotPointAngle: -55 },
  'grad-introduction-1': BroadVsFocusedVisual,
  'grad-introduction-2': RoadmapDotsVisual,

  // Undergrad (Grad School) script — The Big Picture. Beat 2 is genuinely about the mascot's own
  // gesture (connecting a student to a specific faculty match), so it gets the same "mascot points,
  // illustration sits below it" combo Essays/Recommendation Letters/Transition already established.
  'grad-big-picture-0': WeightedScaleVisual,
  'grad-big-picture-1': FourDocsConvergeVisual,
  'grad-big-picture-2': { mascotPointAngle: 75, Illustration: FacultyFitVisual },
  'grad-big-picture-3': GpaExpandsVisual,

  // Undergrad (Grad School) script — Batch 2: Academic Record, Testing, The Statement of Purpose.
  'grad-academic-record-0': GpaZoomVisual,
  'grad-academic-record-1': MajorRelevantTranscriptVisual,
  'grad-academic-record-2': ResearchIntoFolderVisual,
  'grad-academic-record-3': GrowthTrendVisual,

  'grad-testing-0': FourTestDoorsVisual,
  'grad-testing-1': TestToBuildingVisual,
  'grad-testing-2': TestOptionalDoorVisual,
  'grad-testing-3': ProgramPolicyCheckVisual,

  // The Statement of Purpose — beats 0 and 3 are both genuinely about the mascot's own gesture
  // (pointing at the document itself; pointing at the specific highlighted faculty/lab callouts
  // within it), so both get the same "mascot points, illustration sits below it" combo Essays/
  // Recommendation Letters/Transition already established for the HS script, and Big Picture's own
  // 'fit' beat already established for this one.
  'grad-statement-of-purpose-0': { mascotPointAngle: 75, Illustration: SopDocumentVisual },
  'grad-statement-of-purpose-1': ResumeCrossedOutVisual,
  'grad-statement-of-purpose-2': WritingTheConnectionVisual,
  'grad-statement-of-purpose-3': { mascotPointAngle: 75, Illustration: SpecificFacultyDocumentVisual },
  'grad-statement-of-purpose-4': VagueToSpecificVisual,
};
