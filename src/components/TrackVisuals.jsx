import {
  Briefcase, Cpu, Stethoscope, Palette, GraduationCap, Dumbbell, ChefHat, Users, Film,
  Sparkles, Mountain, Heart,
} from 'lucide-react';
import { TRACK_LABELS, TRACK_ICON_NAMES } from '../data/interests';

// Palette repaint, Discovery batch (see CLAUDE.md) — the name->component map for
// `TRACK_ICON_NAMES` (interests.js), matching this codebase's standing "data holds icon NAMES,
// the screen owns the map" convention. Shared by CareersStep/MajorsStep (and, via `TrackBadge`
// alone, anywhere else a track needs a colored label) so the icon+color pairing can't drift
// between call sites the way two independent copies eventually would.
const TRACK_ICON_MAP = {
  Briefcase, Cpu, Stethoscope, Palette, GraduationCap, Dumbbell, ChefHat, Users, Film,
  Sparkles, Mountain, Heart,
};

// The same 7-color vivid "bloom" accent set the hub's own tile icons and Sign-Up's avatar picker
// already use (global.css's `:root` tokens) — cycled by a track's own position in TRACK_LABELS'
// key order (stable, since that object's own key order never changes at runtime) rather than
// assigning arbitrary colors per call site, so the same track always resolves to the same color
// everywhere it's shown.
const TRACK_COLOR_TOKENS = [
  'var(--bloom-purple)', 'var(--bloom-yellow)', 'var(--bloom-teal)', 'var(--bloom-orange)',
  'var(--bloom-pink)', 'var(--bloom-blue)', 'var(--bloom-green)',
];
const TRACK_ORDER = Object.keys(TRACK_LABELS);

export function getTrackColor(track) {
  const index = TRACK_ORDER.indexOf(track);
  return TRACK_COLOR_TOKENS[(index < 0 ? 0 : index) % TRACK_COLOR_TOKENS.length];
}

// Implement New Admin Dashboard, Align Colors With the Menu Screen (see CLAUDE.md), Task 2 — the
// SAME 7 tokens above, re-exposed as a standalone {key, var} roster for a picker UI, rather than a
// track. The admin console's own "Organization Profile & Branding" brand-color swatches read this
// directly instead of the attached Claude Design's own independently-invented 6-hue oklch()
// palette — literal reuse of the exact colors already established everywhere else in this app
// (interest tracks throughout Survey/Discovery/Course Selection/Opportunity Finder, the hub's own
// tile icons) is the most direct way to satisfy "clearly related... not a disconnected,
// independently-invented palette," stronger even than merely "related." `getBloomAccentColor`
// falls back to the app's own universal `--bloom-accent` (never one of the 7) for an unset/unknown
// key, matching this file's own `getTrackColor` fallback-to-a-real-default posture.
export const BLOOM_ACCENT_SWATCHES = [
  { key: 'purple', var: '--bloom-purple' },
  { key: 'yellow', var: '--bloom-yellow' },
  { key: 'teal', var: '--bloom-teal' },
  { key: 'orange', var: '--bloom-orange' },
  { key: 'pink', var: '--bloom-pink' },
  { key: 'blue', var: '--bloom-blue' },
  { key: 'green', var: '--bloom-green' },
];

export function getBloomAccentColor(key) {
  const found = BLOOM_ACCENT_SWATCHES.find((s) => s.key === key);
  return found ? `var(${found.var})` : 'var(--bloom-accent)';
}

function getTrackIconComponent(track) {
  return TRACK_ICON_MAP[TRACK_ICON_NAMES[track]] || Briefcase;
}

// The colored pill used for a group-of-cards' own section header (CareersStep always; MajorsStep
// in Browse/grouped mode) — replaces the old plain-text `.career-group-label`, without changing
// that class's own CSS for its OTHER consumers (CourseSelectionScreen's program-recommendation
// sections, out of scope for this repaint batch and still grouped by a different dimension
// entirely — major/program-type, not track).
export function TrackBadge({ track }) {
  const Icon = getTrackIconComponent(track);
  const color = getTrackColor(track);
  return (
    <div className="track-badge" style={{ '--track-accent': color }}>
      <Icon size={14} />
      {TRACK_LABELS[track] || track}
    </div>
  );
}

// The small colored icon box placed on an individual card (career/major) so a dense grid of
// text-heavy cards reads as visually distinct by subject area at a glance, not a flat wall of
// text. Deliberately smaller than the hub's own `.hub-tile-icon-box` (this sits inside an
// already-content-dense card, not a spacious hub tile).
export function TrackIcon({ track }) {
  const Icon = getTrackIconComponent(track);
  const color = getTrackColor(track);
  return (
    <div className="track-icon-box" style={{ '--track-accent': color }}>
      <Icon size={16} />
    </div>
  );
}
