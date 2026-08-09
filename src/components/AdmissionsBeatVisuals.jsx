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
};
