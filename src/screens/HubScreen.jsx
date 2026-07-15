import {
  ClipboardList, Briefcase, GraduationCap, Landmark, BookOpen, Search, Hammer, Map, ListChecks,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Dashboard/Guide feature, Stage 2 (see CLAUDE.md) — the central hub, now the landing screen
// after sign-up (replacing the old direct-to-survey entry). This stage is layout + mascot +
// working navigation ONLY: no order enforcement (a tile always navigates, even if the target
// screen's own existing defensive checks bounce it elsewhere — e.g. Discovery reached with no
// interests selected yet) and no guided pointing — both explicitly later stages. Every tile
// target is a real, already-built screen; nothing here creates new screens or new flow logic
// beyond the two small additions noted below.
const TILES = [
  {
    id: 'survey', screen: 'survey', Icon: ClipboardList,
    title: "Let's Build Your Plan",
    desc: 'Tell us your interests, grade, and school to get started.',
  },
  {
    id: 'careers', screen: 'discovery', discoveryEntryStep: 'careers', Icon: Briefcase,
    title: 'Careers of Interest',
    desc: 'Explore careers that match what excites you.',
  },
  {
    id: 'majors', screen: 'discovery', discoveryEntryStep: 'majors', Icon: GraduationCap,
    title: 'Related College Majors',
    desc: 'See majors that lead toward your chosen careers.',
  },
  {
    id: 'programs', screen: 'discovery', discoveryEntryStep: 'programs', Icon: Landmark,
    title: 'Recommended Programs',
    desc: 'Browse real schools known for your selected majors.',
  },
  {
    id: 'courseSelection', screen: 'transcript', Icon: BookOpen,
    title: 'Course Selection',
    desc: 'Update your transcript and pick next year\'s courses.',
    // Only ever shown once a real partner school is selected (Roslyn or UC Davis) — hidden
    // entirely otherwise, not greyed out, per this stage's own spec. Filtered below, not here.
    requiresPartnerSchool: true,
  },
  {
    id: 'opportunities', screen: 'opportunities', Icon: Search,
    title: 'Opportunity Finder',
    desc: 'Find real competitions, clubs, and programs worth pursuing.',
  },
  {
    id: 'projectBuilder', screen: 'projectBuilder', Icon: Hammer,
    title: 'Project Builder',
    desc: 'Start a hands-on project to build your portfolio.',
  },
  {
    id: 'plan', screen: 'plan', Icon: Map,
    title: 'Academic Plan',
    desc: 'Your personalized roadmap, task by task.',
  },
  {
    id: 'programSummary', screen: 'programSummary', Icon: ListChecks,
    title: 'Your School List',
    desc: 'Your selected programs, grouped by Reach, Match, and Safety.',
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
        {tiles.map((tile) => (
          <button
            type="button"
            key={tile.id}
            className="card hub-tile"
            onClick={() => goTo(tile)}
          >
            <tile.Icon className="hub-tile-icon" size={26} />
            <div className="card-title">{tile.title}</div>
            <p className="card-desc">{tile.desc}</p>
          </button>
        ))}
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
