import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks, BUILT_TRACKS } from '../data/interests';
import { getCareerPool, getCareerGroups, getMajorGroups, getMajorApplicationSentence } from '../data/careers';
import { getMergedPrograms, getProgramApplicationSentence } from '../data/programs';
import CareersStep from './discovery/CareersStep';
import MajorsStep from './discovery/MajorsStep';
import ProgramsStep from './discovery/ProgramsStep';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import ModuleReviewWidget from '../components/ModuleReviewWidget';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';
import { useModuleReview } from '../hooks/useModuleReview';

const SUB_STEPS = ['careers', 'majors', 'programs'];

// Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — unlike Survey's single continuous page,
// each of Discovery's 3 sub-steps only ever changes via an explicit user action (a hub tile
// click setting `discoveryEntryStep`, read once below), never automatically from a dependent
// field settling — so there's no cascade risk here the way Survey's field-sequence effect had to
// guard against.
const DISCOVERY_MASCOT_KEYS = {
  careers: { intro: 'discovery-careers-intro', revisit: 'discovery-careers-revisit' },
  majors: { intro: 'discovery-majors-intro', revisit: 'discovery-majors-revisit' },
  programs: { intro: 'discovery-programs-intro', revisit: 'discovery-programs-revisit' },
};

const SUB_STEP_COPY = {
  // AI-First Onboarding, Stage 5 (Task 3, see CLAUDE.md) — Careers/Majors' own `sub` are now both
  // `(level, narrative)`, layered ON TOP of whatever copy already existed (majors' own
  // education-level-specific sentence, untouched below) rather than replacing it: when a real
  // narrative was actually confirmed (`narrative.summary`), the tail reframes as confirming/
  // reviewing the direction the conversation already found instead of implying the student is
  // starting from zero; falls back to the exact original from-scratch framing for the one real
  // case where no narrative exists (a student who reached the hub via "Continue to my Hub" without
  // ever confirming an overview — see HubScreen.jsx's own `requiresNarrative` comment). Programs'
  // own `sub` is untouched — Task 3 only named Careers of Interest and Related Majors.
  careers: {
    title: 'Careers of interest',
    // Bug fix (see CLAUDE.md, "Careers of Interest Tile Stuck") — a THIRD, honest fallback for
    // the real, common case where NEITHER a narrative was confirmed NOR any real interest tags
    // exist at all (a student who reached the hub without ever clicking "Confirm My Plan") —
    // `hasRealInterestTracks` false means the careerGroups shown are actually every built track,
    // not a personalized subset, so the copy shouldn't claim otherwise.
    sub: (level, narrative, hasRealInterestTracks) => {
      if (narrative.summary) {
        return `Let's confirm the direction we found in our first conversation${narrative.themesText ? ` — around ${narrative.themesText}` : ''}. Here are careers that fit. Select as many as you'd like to pursue.`;
      }
      if (hasRealInterestTracks) {
        return "Based on your interests, here are careers worth exploring. Select as many as you'd like to pursue.";
      }
      return "Here are careers across every field — pick any that resonate. Select as many as you'd like to pursue.";
    },
  },
  majors: {
    title: 'Related college majors',
    // Clarify "Related College Majors" Copy by Education Level (see CLAUDE.md) — the education-
    // level-specific `getMajorApplicationSentence(level)` sentence stays exactly as it was; only
    // the tail after it now branches on whether a real narrative exists.
    sub: (level, narrative) => `${getMajorApplicationSentence(level)}${narrative.summary
      ? " Let's confirm these line up with the direction we already found — select as many as fit."
      : ' These majors lead toward the careers you picked. Select as many as fit.'}`,
  },
  programs: {
    title: 'Recommended programs',
    // Clarify "Recommended Programs" Copy by Education Level (see CLAUDE.md) — a function of
    // `level`, not a plain string, the same "resolve per-caller instead of a fixed string"
    // convention HubScreen.jsx's own function-valued `intro` entries already established for the
    // identical reason (varies by education level).
    sub: (level) => `${getProgramApplicationSentence(level)} Well-known programs known for strength in your selected majors.`,
  },
};

export default function DiscoveryScreen() {
  const { state, patch } = useApp();
  // Dashboard/Guide hub (Stage 2, see CLAUDE.md) can land here on a specific sub-step (its own
  // Careers/Majors/Programs tiles) via `state.discoveryEntryStep` — read once as the initial
  // value (the lazy initializer only runs on mount), then immediately cleared back to null below
  // so a LATER hub click into Discovery is never left starting on a stale sub-step from an
  // earlier visit.
  // No longer paired with a setter — sub-step no longer advances internally (see handleNext
  // below), so this is fixed for the lifetime of this mount, set only from the hub's own click.
  const [subStep] = useState(() => state.discoveryEntryStep || 'careers');

  useEffect(() => {
    if (state.discoveryEntryStep) patch({ discoveryEntryStep: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // "Recommended for you" / "Browse all ___" — one independent toggle per sub-step, local and
  // unpersisted (same "session-only UI convenience, not data worth surviving a reload" trade
  // Project Builder's and Opportunity Finder's own browse-mode toggles already make). The actual
  // consequential data (selectedCareerIds/selectedMajorIds/selectedProgramKeys) is unaffected
  // either way.
  const [careersView, setCareersView] = useState('recommended');
  const [majorsView, setMajorsView] = useState('recommended');
  const [programsView, setProgramsView] = useState('recommended');

  // Bug fix (see CLAUDE.md, "Careers of Interest Tile Stuck") — this USED to bounce straight back
  // to the hub whenever `getBuiltTracks(state.interestTags)` came back empty, on the assumption
  // that was a rare anomaly ("restored mid-flow after interests changed, or a stale hub click") —
  // true under the OLD flow, where the Survey collected interestTags directly and this screen was
  // never reachable without them. AI-First Onboarding made this a COMMON, entirely expected case
  // instead: a student who reaches the hub without ever clicking "Confirm My Plan" on the
  // onboarding conversation (whether they explicitly skipped it, or simply never triggered
  // readyForOverview) has a genuinely, permanently empty `state.interestTags` — and every one of
  // Careers of Interest/Related College Majors/Recommended Programs shares this SAME screen and
  // effect, so all three were bouncing back to the hub the instant they mounted. From a real
  // student's perspective this looked exactly like "the tile's click did nothing" — the
  // navigation to `discovery` genuinely happened, then reverted within the same tick, too fast to
  // perceive. The actual fix for "make the navigation work" is to make this screen ALWAYS
  // reachable: an empty result now falls back to every built track (the exact same set Browse
  // mode already shows), rather than bouncing back — "Recommended for you" degrades gracefully
  // into "show me everything" when there's genuinely no narrower signal to work from, instead of
  // refusing to render at all.
  const rawTracks = getBuiltTracks(state.interestTags);
  const hasRealInterestTracks = rawTracks.length > 0;
  const tracks = hasRealInterestTracks ? rawTracks : BUILT_TRACKS;

  const mascotKeys = DISCOVERY_MASCOT_KEYS[subStep];
  const mascotText = useMascotIntroThenRevisit(mascotKeys.intro, mascotKeys.revisit);

  const level = state.educationLevel;
  // Looked up across EVERY built track, not just `tracks` (the student's own narrow
  // interest-derived set) — Browse mode lets a student select a career from outside their own
  // interests, and this pool needs to resolve it (for `selectedCareers`/majorIds below, and for
  // toggleCareer's own pruning) regardless of which track it actually lives in. Same fix pattern
  // as roadmapGenerator.js's opportunity lookup. Widening this is a no-op for anything selected
  // via "Recommended for you", since `tracks` is always a subset of BUILT_TRACKS.
  const careers = getCareerPool(BUILT_TRACKS, level);
  const careerGroups = getCareerGroups(tracks, level);
  const allCareerGroups = getCareerGroups(BUILT_TRACKS, level);
  const allMajorGroups = getMajorGroups(BUILT_TRACKS, level);
  const allMajorIds = [...new Set(allMajorGroups.flatMap((g) => g.majors.map((m) => m.id)))];
  // Palette repaint, Discovery batch (see CLAUDE.md) — a plain `{ majorId: track }` lookup so
  // MajorsStep's own Recommended (flat, ungrouped) mode can ALSO show a real, correctly-colored
  // TrackIcon per card, not just Browse mode (which already groups by track). Reuses the exact
  // "first track that references it" resolution `getMajorGroups` already applies — not a second,
  // possibly-drifting copy of that logic.
  const majorTrackMap = Object.fromEntries(
    allMajorGroups.flatMap((g) => g.majors.map((m) => [m.id, g.track])),
  );
  const selectedCareers = careers.filter((c) => state.selectedCareerIds.includes(c.id));
  const majorIds = [...new Set(selectedCareers.flatMap((c) => c.relevantMajors))];

  const toggleCareer = (id) => {
    const has = state.selectedCareerIds.includes(id);
    const newCareerIds = has
      ? state.selectedCareerIds.filter((c) => c !== id)
      : [...state.selectedCareerIds, id];
    const newCareers = careers.filter((c) => newCareerIds.includes(c.id));
    const validMajorIds = new Set(newCareers.flatMap((c) => c.relevantMajors));
    const newMajorIds = state.selectedMajorIds.filter((m) => validMajorIds.has(m));
    const validProgramKeys = new Set(getMergedPrograms(newMajorIds, level).map((p) => p.key));
    const newProgramKeys = state.selectedProgramKeys.filter((k) => validProgramKeys.has(k));
    patch({ selectedCareerIds: newCareerIds, selectedMajorIds: newMajorIds, selectedProgramKeys: newProgramKeys });
  };

  const toggleMajor = (id) => {
    const has = state.selectedMajorIds.includes(id);
    const newMajorIds = has
      ? state.selectedMajorIds.filter((m) => m !== id)
      : [...state.selectedMajorIds, id];
    const validProgramKeys = new Set(getMergedPrograms(newMajorIds, level).map((p) => p.key));
    const newProgramKeys = state.selectedProgramKeys.filter((k) => validProgramKeys.has(k));
    patch({ selectedMajorIds: newMajorIds, selectedProgramKeys: newProgramKeys });
  };

  const toggleProgram = (key) => {
    const has = state.selectedProgramKeys.includes(key);
    patch({
      selectedProgramKeys: has
        ? state.selectedProgramKeys.filter((k) => k !== key)
        : [...state.selectedProgramKeys, key],
    });
  };

  const canAdvance =
    (subStep === 'careers' && state.selectedCareerIds.length > 0) ||
    (subStep === 'majors' && state.selectedMajorIds.length > 0) ||
    (subStep === 'programs' && state.selectedProgramKeys.length > 0);

  // Return-to-Hub routing restructure (see CLAUDE.md) — Careers/Majors/Programs are 3 separate
  // hub tiles/destinations (see HubScreen.jsx's own TILES), so completing ANY of them returns to
  // the hub rather than silently advancing to the next sub-step within this same mounted screen.
  // A student picking up "Related College Majors" next does so by clicking that tile (now
  // unlocked), landing back here via `discoveryEntryStep`, exactly like every other hub-launched
  // screen. This replaced the old handleNext/goBackSubStep pair that stepped subStep forward/
  // backward internally — with Continue no longer chaining forward, keeping only backward
  // internal chaining on Back would have been asymmetric and confusing.
  const handleNext = () => patch({ screen: 'hub' });

  // Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — `subStep` itself
  // ('careers' | 'majors' | 'programs') is already the exact same module id string
  // api/onboarding-chat.js's own MODULE_LABELS expects, so no separate mapping is needed here.
  // `DISCOVERY_MASCOT_KEYS[subStep].intro` reuses the EXACT scripted line this screen already
  // shows via MascotWidget (Task 5) as the reactive conversation's own opening message; `handleNext`
  // (unchanged above) is the module's own real, already-existing advance action, only now run once
  // the student explicitly Confirms rather than the instant Continue is clicked.
  const moduleReview = useModuleReview(subStep, DISCOVERY_MASCOT_KEYS[subStep].intro, handleNext);

  // AI-First Onboarding, Stage 5 (Task 3, see CLAUDE.md) — resolved once here rather than inline,
  // since both careers' and majors' own `sub` functions read it; programs' own `sub` simply ignores
  // the second argument.
  const narrativeInfo = {
    summary: state.narrativeSummary,
    themesText: state.narrativeThemes?.length ? state.narrativeThemes.join(' and ') : null,
  };

  return (
    <div>
      <MascotWidget text={mascotText} />
      <BackBar onBack={() => patch({ screen: 'hub' })} />
      <StepProgress step={2} total={8} label={SUB_STEP_COPY[subStep].title} />
      <h1 className="page-title">{SUB_STEP_COPY[subStep].title}</h1>
      <p className="page-sub">
        {typeof SUB_STEP_COPY[subStep].sub === 'function' ? SUB_STEP_COPY[subStep].sub(level, narrativeInfo, hasRealInterestTracks) : SUB_STEP_COPY[subStep].sub}
      </p>

      <div className="step-track">
        {SUB_STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot${s === subStep ? ' active' : ''}${SUB_STEPS.indexOf(subStep) > i ? ' done' : ''}`}
          />
        ))}
      </div>

      {subStep === 'careers' && (
        <>
          <ViewToggle mode={careersView} setMode={setCareersView} browseLabel="Browse all careers" />
          <CareersStep
            careerGroups={careersView === 'recommended' ? careerGroups : allCareerGroups}
            selectedCareerIds={state.selectedCareerIds}
            onToggle={toggleCareer}
          />
        </>
      )}
      {subStep === 'majors' && (
        <>
          <ViewToggle mode={majorsView} setMode={setMajorsView} browseLabel="Browse all majors" />
          <MajorsStep
            majorIds={majorsView === 'recommended' ? majorIds : undefined}
            majorGroups={majorsView === 'browse' ? allMajorGroups : undefined}
            majorTrackMap={majorTrackMap}
            selectedMajorIds={state.selectedMajorIds}
            onToggle={toggleMajor}
          />
        </>
      )}
      {subStep === 'programs' && (
        <>
          <ViewToggle mode={programsView} setMode={setProgramsView} browseLabel="Browse all programs" />
          <ProgramsStep
            majorIds={state.selectedMajorIds}
            browseMajorIds={programsView === 'browse' ? allMajorIds : undefined}
            educationLevel={level}
            selectedProgramKeys={state.selectedProgramKeys}
            onToggle={toggleProgram}
            gpa={state.gpa}
          />
        </>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" disabled={!canAdvance} onClick={moduleReview.beginReview}>
          Continue
        </button>
      </div>

      <ModuleReviewWidget review={moduleReview} label={SUB_STEP_COPY[subStep].title} />
    </div>
  );
}

function BackBar({ onBack }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={onBack}>
      <ArrowLeft size={14} /> Back
    </button>
  );
}

// Shared "Recommended for you" / "Browse all ___" toggle, one per sub-step — same pill-group
// pattern Opportunity Finder's own view toggle uses.
function ViewToggle({ mode, setMode, browseLabel }) {
  return (
    <div className="field-block">
      <div className="pill-group">
        <button
          type="button"
          className={`pill${mode === 'recommended' ? ' selected' : ''}`}
          onClick={() => setMode('recommended')}
        >
          Recommended for you
        </button>
        <button
          type="button"
          className={`pill${mode === 'browse' ? ' selected' : ''}`}
          onClick={() => setMode('browse')}
        >
          {browseLabel}
        </button>
      </div>
    </div>
  );
}
