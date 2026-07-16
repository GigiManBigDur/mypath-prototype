import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks, BUILT_TRACKS } from '../data/interests';
import { getCareerPool, getCareerGroups, getMajorGroups } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import CareersStep from './discovery/CareersStep';
import MajorsStep from './discovery/MajorsStep';
import ProgramsStep from './discovery/ProgramsStep';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';

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
  careers: {
    title: 'Careers of interest',
    sub: 'Based on your interests, here are careers worth exploring. Select as many as you\'d like to pursue.',
  },
  majors: {
    title: 'Related college majors',
    sub: 'These majors lead toward the careers you picked. Select as many as fit.',
  },
  programs: {
    title: 'Recommended programs',
    sub: 'Well-known programs known for strength in your selected majors.',
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

  const tracks = getBuiltTracks(state.interestTags);

  // Defensive: this screen should only be reached when at least one selected interest maps to a
  // built track. If state ever ends up here with none (e.g. restored mid-flow after interests
  // changed, or a stale hub click), bounce back to the hub — the single, consistent return point
  // for every screen now (see the "Return to Hub" routing restructure in CLAUDE.md) — instead of
  // rendering empty steps or silently forwarding into a DIFFERENT downstream screen.
  useEffect(() => {
    if (tracks.length === 0) patch({ screen: 'hub' });
  }, [tracks.length]);

  const mascotKeys = DISCOVERY_MASCOT_KEYS[subStep];
  const mascotText = useMascotIntroThenRevisit(mascotKeys.intro, mascotKeys.revisit);

  if (tracks.length === 0) return null;

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

  return (
    <div>
      <MascotWidget text={mascotText} />
      <BackBar onBack={() => patch({ screen: 'hub' })} />
      <StepProgress step={2} total={8} label={SUB_STEP_COPY[subStep].title} />
      <h1 className="page-title">{SUB_STEP_COPY[subStep].title}</h1>
      <p className="page-sub">{SUB_STEP_COPY[subStep].sub}</p>

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
        <button type="button" className="btn btn-primary" disabled={!canAdvance} onClick={handleNext}>
          Continue
        </button>
      </div>
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
