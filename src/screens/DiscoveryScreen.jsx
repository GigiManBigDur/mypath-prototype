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

const SUB_STEPS = ['careers', 'majors', 'programs'];

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
  const [subStep, setSubStep] = useState('careers');
  // "Recommended for you" / "Browse all ___" — one independent toggle per sub-step, local and
  // unpersisted (same "session-only UI convenience, not data worth surviving a reload" trade
  // Project Builder's and Opportunity Finder's own browse-mode toggles already make). The actual
  // consequential data (selectedCareerIds/selectedMajorIds/selectedProgramKeys) is unaffected
  // either way.
  const [careersView, setCareersView] = useState('recommended');
  const [majorsView, setMajorsView] = useState('recommended');
  const [programsView, setProgramsView] = useState('recommended');

  const tracks = getBuiltTracks(state.interestTags);
  // Course Selection (Transcript & GPA -> Course Selection) only applies to High School — see
  // AdmissionsOverviewScreen's identical check.
  const afterDiscovery = state.educationLevel === 'highschool' ? 'transcript' : 'opportunities';

  // Defensive: this screen should only be reached when at least one selected
  // interest maps to a built track — Admissions/Transcript route around it
  // otherwise. If state ever ends up here with none (e.g. restored mid-flow
  // after interests changed), bounce forward to whichever screen is actually
  // next instead of rendering empty steps.
  useEffect(() => {
    if (tracks.length === 0) patch({ screen: afterDiscovery });
  }, [tracks.length, afterDiscovery]);

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

  const goBackSubStep = () => {
    const idx = SUB_STEPS.indexOf(subStep);
    if (idx === 0) {
      patch({ screen: 'admissions' });
    } else {
      setSubStep(SUB_STEPS[idx - 1]);
    }
  };

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

  const handleNext = () => {
    const idx = SUB_STEPS.indexOf(subStep);
    if (idx < SUB_STEPS.length - 1) {
      setSubStep(SUB_STEPS[idx + 1]);
    } else {
      patch({ screen: afterDiscovery });
    }
  };

  return (
    <div>
      <BackBar onBack={goBackSubStep} />
      <StepProgress step={3} total={8} label={SUB_STEP_COPY[subStep].title} />
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
          {subStep === 'programs' ? (afterDiscovery === 'transcript' ? 'Continue to Transcript' : 'Continue to Opportunities') : 'Continue'}
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
