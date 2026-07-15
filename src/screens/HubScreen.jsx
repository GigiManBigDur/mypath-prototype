import {
  ClipboardList, Briefcase, GraduationCap, Landmark, FileText, BookOpen, Search, Hammer, Map,
  ListChecks, Lock,
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
    // something only reachable once every later step is done.
    id: 'plan', screen: 'plan', Icon: Map,
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

export default function HubScreen() {
  const { state, patch } = useApp();

  const hasPartnerSchool = state.currentSchool === 'Roslyn High School' || state.currentSchool === 'UC Davis';
  const tiles = TILES.filter((t) => !t.requiresPartnerSchool || hasPartnerSchool);

  const goTo = (tile) => {
    // `discoveryEntryStep` is a one-shot signal, not a durable field — DiscoveryScreen reads it
    // once (as its initial subStep) and clears it right back to null on mount, the same
    // read-once-then-clear shape `activeCourseCheckpoint`/`activeUCDavisCheckpoint` already use
    // elsewhere in this app, so a later NORMAL entry into Discovery (via the real admissions
    // flow) is never left starting on a stale sub-step from an old hub click.
    patch({ screen: tile.screen, ...(tile.discoveryEntryStep ? { discoveryEntryStep: tile.discoveryEntryStep } : {}) });
  };

  const greetingName = state.displayName || state.username;

  return (
    <div className="hub-screen">
      <div className="hub-mascot-area">
        <Mascot />
        {greetingName && (
          <div className="mascot-greeting">
            <p>Welcome, {greetingName}!</p>
          </div>
        )}
      </div>

      <h1 className="page-title hub-title">Where to next?</h1>
      <p className="page-sub">Pick anything below — you can always come back here.</p>

      <div className="grid grid-3 hub-tile-grid">
        {tiles.map((tile) => {
          const unlocked = tile.unlock(state, hasPartnerSchool);
          return (
            <button
              type="button"
              key={tile.id}
              className={`card hub-tile${unlocked ? '' : ' locked'}`}
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
