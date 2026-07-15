import { useLayoutEffect, useRef, useState } from 'react';
import {
  ClipboardList, Briefcase, GraduationCap, Landmark, FileText, BookOpen, Search, Hammer,
  Map as MapIcon, ListChecks, Lock, ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSurveyComplete } from './SurveyScreen';

// Dashboard/Guide feature, Stage 2/3 (see CLAUDE.md) — the central hub, now the landing screen
// after sign-up (replacing the old direct-to-survey entry). Stage 2 was layout + mascot + working
// navigation only, with no order enforcement at all. Stage 3 adds real lock/unlock: every tile
// still navigates to a real, already-built screen (no new screens here), but a locked tile is
// disabled and shows why, instead of just quietly doing nothing when clicked. `unlock` and
// `lockedReason` are both `(state, hasPartnerSchool) => value` for a uniform shape even though
// most tiles ignore `hasPartnerSchool` — only Opportunity Finder's condition actually depends on
// it. `state.gpa !== ''` is reused as "Transcript & GPA is done or was explicitly skipped" —
// TranscriptScreen's Continue AND Skip both write a real (non-blank) value there (see CLAUDE.md's
// Course Selection Stage 2 section), so this is the same signal every other GPA-aware consumer in
// this app already treats as "don't guess, blank means not entered yet," not a new concept.
const TILES = [
  {
    id: 'survey', screen: 'survey', Icon: ClipboardList,
    title: "Let's Build Your Plan",
    desc: 'Tell us your interests, grade, and school to get started.',
    unlock: () => true,
  },
  {
    id: 'careers', screen: 'discovery', discoveryEntryStep: 'careers', Icon: Briefcase,
    title: 'Careers of Interest',
    desc: 'Explore careers that match what excites you.',
    unlock: (state) => isSurveyComplete(state),
    lockedReason: () => "Complete Let's Build Your Plan first",
  },
  {
    id: 'majors', screen: 'discovery', discoveryEntryStep: 'majors', Icon: GraduationCap,
    title: 'Related College Majors',
    desc: 'See majors that lead toward your chosen careers.',
    unlock: (state) => state.selectedCareerIds.length > 0,
    lockedReason: () => 'Select at least one career first',
  },
  {
    id: 'programs', screen: 'discovery', discoveryEntryStep: 'programs', Icon: Landmark,
    title: 'Recommended Programs',
    desc: 'Browse real schools known for your selected majors.',
    unlock: (state) => state.selectedMajorIds.length > 0,
    lockedReason: () => 'Select at least one major first',
  },
  {
    // Deliberately unlocked as soon as a program is selected, same gate as Your School List
    // right below it — not gated behind Transcript & GPA/Course Selection/Opportunities, since
    // the Academic Plan is meant to be revisited constantly as more gets added to it, not
    // something only reachable once every later step is done. Also deliberately NOT part of
    // GUIDED_SEQUENCE below (Stage 4) — the mascot never force-points at it mid-sequence, only
    // offers it as the natural endpoint once the real sequence is finished.
    id: 'plan', screen: 'plan', Icon: MapIcon,
    title: 'Academic Plan',
    desc: 'Your personalized roadmap, task by task.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
  {
    id: 'programSummary', screen: 'programSummary', Icon: ListChecks,
    title: 'Your School List',
    desc: 'Your selected programs, grouped by Reach, Match, and Safety.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
  {
    // Only ever shown once a real partner school is selected (Roslyn or UC Davis) — hidden
    // entirely otherwise, not greyed out. Filtered below, not here (this flag only controls
    // visibility; `unlock` below is the separate lock/unlock check for once it IS shown).
    id: 'transcript', screen: 'transcript', Icon: FileText,
    title: 'Transcript & GPA',
    desc: 'Log your grades and see your calculated GPA.',
    requiresPartnerSchool: true,
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
  {
    id: 'courseSelection', screen: 'courseSelection', Icon: BookOpen,
    title: 'Course Selection',
    desc: "Pick next year's courses from your school's real catalog.",
    requiresPartnerSchool: true,
    unlock: (state) => state.gpa !== '',
    lockedReason: () => 'Complete or skip Transcript & GPA first',
  },
  {
    // Partner-school users follow the real screen-flow order (transcript -> courseSelection ->
    // opportunities), so this unlocks at the same point Course Selection itself does, not a step
    // later — Course Selection has no hard completion gate of its own in the real flow either
    // (its own Continue always advances regardless of whether any courses were picked). Everyone
    // else has no Transcript & GPA/Course Selection step to wait on at all, so it falls back to
    // the same "at least one program selected" gate most other tiles use.
    id: 'opportunities', screen: 'opportunities', Icon: Search,
    title: 'Opportunity Finder',
    desc: 'Find real competitions, clubs, and programs worth pursuing.',
    unlock: (state, hasPartnerSchool) => (hasPartnerSchool ? state.gpa !== '' : state.selectedProgramKeys.length > 0),
    lockedReason: (state, hasPartnerSchool) => (hasPartnerSchool ? 'Complete or skip Transcript & GPA first' : 'Select at least one program first'),
  },
  {
    id: 'projectBuilder', screen: 'projectBuilder', Icon: Hammer,
    title: 'Project Builder',
    desc: 'Start a hands-on project to build your portfolio.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
];

// Dashboard/Guide feature, Stage 4 (see CLAUDE.md) — the PRIMARY sequence the mascot actively
// guides the user through, deliberately distinct from each tile's own Stage 3 `unlock` condition
// above. Unlock controls what's clickable; this controls what the mascot points at as "the next
// thing to do." Academic Plan and Your School List are excluded on purpose — they unlock early
// per Stage 3 and stay available the whole time, but the mascot never force-points at them
// mid-sequence, only offers Academic Plan as the natural endpoint once every step here is done
// (see `getNextGuidedStep` below). `isDone` for each step reuses the exact same real state signal
// that step's own tile (or the NEXT tile's `unlock`) already checks — e.g. "Careers of Interest is
// done" is the same `selectedCareerIds.length > 0` check that unlocks Related College Majors —
// not a new completion concept invented just for the mascot. Dialogue lines are short/generic
// placeholders per this stage's own explicit scope; real varied dialogue is Stage 5.
const GUIDED_SEQUENCE = [
  {
    id: 'survey', requiresPartnerSchool: false,
    isDone: (state) => isSurveyComplete(state),
    intro: "Let's start by building your plan!",
  },
  {
    id: 'careers', requiresPartnerSchool: false,
    isDone: (state) => state.selectedCareerIds.length > 0,
    intro: 'Pick a few careers that catch your eye.',
  },
  {
    id: 'majors', requiresPartnerSchool: false,
    isDone: (state) => state.selectedMajorIds.length > 0,
    intro: "Let's see which majors fit those careers.",
  },
  {
    id: 'programs', requiresPartnerSchool: false,
    isDone: (state) => state.selectedProgramKeys.length > 0,
    intro: 'Time to browse some real programs!',
  },
  {
    id: 'transcript', requiresPartnerSchool: true,
    isDone: (state) => state.gpa !== '',
    intro: "Let's log your grades and calculate your GPA.",
  },
  {
    id: 'courseSelection', requiresPartnerSchool: true,
    // UC Davis and Roslyn track selected courses in two deliberately separate fields (see
    // AppContext.jsx) — check whichever one applies to this student's own partner school.
    isDone: (state) => (state.currentSchool === 'UC Davis'
      ? state.selectedUCDavisCourseIds.length > 0
      : state.selectedCourseIds.length > 0),
    intro: "Let's pick out next year's courses.",
  },
  {
    id: 'opportunities', requiresPartnerSchool: false,
    isDone: (state) => state.selectedOpportunityIds.length > 0,
    intro: "Let's find some real opportunities worth pursuing.",
  },
  {
    id: 'projectBuilder', requiresPartnerSchool: false,
    // Project Builder is explicitly optional/skippable content (its own screen has a persistent
    // "Skip for now" control) — "done" here means the student actually started a project, a real
    // trackable action, same "did they do something real" shape every earlier step's isDone
    // already uses (select a career/major/program, log a GPA, pick a course, save an
    // opportunity). There's no separate "explicitly skipped" flag anywhere in this app's state to
    // check instead.
    isDone: (state) => state.startedProjects.length > 0,
    intro: 'Ready to start a hands-on project?',
  },
];

const ENDPOINT_STEP = { id: 'plan', intro: 'Your plan is really coming together! Come back anytime.' };

// Re-evaluated fresh from `state` on every render — nothing here is cached from a previous visit,
// so returning to the hub after finishing a step always reflects the CURRENT next incomplete step,
// per this stage's own explicit requirement.
function getNextGuidedStep(state, hasPartnerSchool) {
  const relevant = GUIDED_SEQUENCE.filter((s) => !s.requiresPartnerSchool || hasPartnerSchool);
  return relevant.find((s) => !s.isDone(state)) || ENDPOINT_STEP;
}

export default function HubScreen() {
  const { state, patch } = useApp();

  const hasPartnerSchool = state.currentSchool === 'Roslyn High School' || state.currentSchool === 'UC Davis';
  const tiles = TILES.filter((t) => !t.requiresPartnerSchool || hasPartnerSchool);
  const nextStep = getNextGuidedStep(state, hasPartnerSchool);

  const goTo = (tile) => {
    // `discoveryEntryStep` is a one-shot signal, not a durable field — DiscoveryScreen reads it
    // once (as its initial subStep) and clears it right back to null on mount, the same
    // read-once-then-clear shape `activeCourseCheckpoint`/`activeUCDavisCheckpoint` already use
    // elsewhere in this app, so a later NORMAL entry into Discovery (via the real admissions
    // flow) is never left starting on a stale sub-step from an old hub click.
    patch({ screen: tile.screen, ...(tile.discoveryEntryStep ? { discoveryEntryStep: tile.discoveryEntryStep } : {}) });
  };

  const greetingName = state.displayName || state.username;

  const mascotRef = useRef(null);
  const tileRefs = useRef(new Map());

  return (
    <div className="hub-screen">
      <div className="hub-mascot-area">
        {/* A dedicated wrapper around just the mascot SVG, sized tightly to it — NOT the whole
            .hub-mascot-area (which also contains the greeting bubble stacked below). The pointer
            arrow anchors to THIS ref, so it renders right at the mascot's own base and its angle
            is measured from the mascot's real center, not from further down past the bubble. */}
        <div className="hub-mascot-figure" ref={mascotRef}>
          <Mascot />
          <PointerArrow mascotRef={mascotRef} tileRefs={tileRefs} targetId={nextStep.id} tileCount={tiles.length} />
        </div>
        {(greetingName || nextStep) && (
          <div className="mascot-greeting">
            {greetingName && <p>Welcome, {greetingName}!</p>}
            <p className="mascot-dialogue">{nextStep.intro}</p>
          </div>
        )}
      </div>

      <h1 className="page-title hub-title">Where to next?</h1>
      <p className="page-sub">Pick anything below — you can always come back here.</p>

      <div className="grid grid-3 hub-tile-grid">
        {tiles.map((tile) => {
          const unlocked = tile.unlock(state, hasPartnerSchool);
          const isPointingTarget = tile.id === nextStep.id;
          return (
            <button
              type="button"
              key={tile.id}
              ref={(el) => {
                if (el) tileRefs.current.set(tile.id, el);
                else tileRefs.current.delete(tile.id);
              }}
              className={`card hub-tile${unlocked ? '' : ' locked'}${isPointingTarget ? ' pointing-target' : ''}`}
              disabled={!unlocked}
              onClick={() => goTo(tile)}
            >
              {unlocked
                ? <tile.Icon className="hub-tile-icon" size={26} />
                : <Lock className="hub-tile-icon hub-tile-lock-icon" size={22} />}
              <div className="card-title">{tile.title}</div>
              <p className="card-desc">{tile.desc}</p>
              {!unlocked && (
                <p className="hub-tile-lock-reason">{tile.lockedReason(state, hasPartnerSchool)}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Dashboard/Guide feature, Stage 4 — the mascot's own "gesture/animation... directed at the
// target tile," one of the 3 required pointing signals alongside the pulsing tile highlight
// (`.pointing-target` on the tile itself, see global.css) and the dialogue line. Rather than
// hand-waving a fixed-direction nudge (tiles reflow across viewport widths and as tiles are
// added/removed from the DOM when `hasPartnerSchool` changes), this measures REAL positions —
// same "don't fake it, compute it" approach WelcomeScreen's own marker placement already uses
// (getPointAtLength there, getBoundingClientRect here) — and rotates a small arrow to the real
// angle between the mascot and the target tile's current on-screen position.
function PointerArrow({ mascotRef, tileRefs, targetId, tileCount }) {
  const [angle, setAngle] = useState(null);

  useLayoutEffect(() => {
    function recompute() {
      const mascotEl = mascotRef.current;
      const targetEl = tileRefs.current.get(targetId);
      if (!mascotEl || !targetEl) { setAngle(null); return; }
      const mascotRect = mascotEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      // Measured from the mascot's own right-edge center, matching exactly where
      // .mascot-pointer is CSS-anchored (`right: -4px; top: 50%`) — see that rule's own comment
      // for why it's not anchored below the mascot instead.
      const mx = mascotRect.right;
      const my = mascotRect.top + mascotRect.height / 2;
      const tx = targetRect.left + targetRect.width / 2;
      const ty = targetRect.top + targetRect.height / 2;
      setAngle(Math.atan2(ty - my, tx - mx) * (180 / Math.PI));
    }
    // A plain synchronous call here raced React StrictMode's dev-only double-mount: the ref
    // callbacks that populate `tileRefs` hadn't landed yet the instant this specific layout
    // effect fired (confirmed directly — both `mascotRef.current` and every `tileRefs` entry
    // read as unset at that exact point, then were populated a moment later), so the arrow never
    // appeared at all. A single `requestAnimationFrame` defers the first measurement to after the
    // browser's next paint, by which point StrictMode's mount/remount cycle has settled and every
    // ref is reliably attached — same "don't trust synchronous-at-mount DOM state, wait a frame"
    // lesson WelcomeScreen's own double-rAF trail reveal already established for this codebase,
    // just one rAF instead of two since there's no CSS transition being raced here, only a DOM
    // read.
    const raf = requestAnimationFrame(recompute);
    // Tile positions genuinely reflow on resize (a real CSS grid, not a fixed-viewBox SVG like
    // WelcomeScreen's trail) and whenever the number of rendered tiles changes (hasPartnerSchool
    // toggling, or — from this stage on — the pointing target itself moving to a different tile).
    // These later calls need no rAF wrapper of their own — by resize time the DOM is already
    // settled, this only mattered for the very first measurement racing mount.
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, tileCount]);

  if (angle === null) return null;

  return (
    <div className="mascot-pointer" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
      <div className="mascot-pointer-inner">
        <ArrowRight size={20} />
      </div>
    </div>
  );
}

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
function Mascot() {
  return (
    <svg className="mascot-svg" viewBox="0 0 160 160" width="140" height="140" aria-hidden="true">
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
