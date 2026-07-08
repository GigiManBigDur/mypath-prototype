import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks } from '../data/interests';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import CareersStep from './discovery/CareersStep';
import MajorsStep from './discovery/MajorsStep';
import ProgramsStep from './discovery/ProgramsStep';

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

  const tracks = getBuiltTracks(state.interestTags);

  // Defensive: this screen should only be reached when at least one selected
  // interest maps to a built track — Admissions/Opportunities route around it
  // otherwise. If state ever ends up here with none (e.g. restored mid-flow
  // after interests changed), bounce forward instead of rendering empty steps.
  useEffect(() => {
    if (tracks.length === 0) patch({ screen: 'opportunities' });
  }, [tracks.length]);

  if (tracks.length === 0) return null;

  const level = state.educationLevel;
  const careers = getCareerPool(tracks, level);
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
      patch({ screen: 'opportunities' });
    }
  };

  return (
    <div>
      <BackBar onBack={goBackSubStep} />
      <div className="eyebrow">Step 3 of 5 · {SUB_STEP_COPY[subStep].title}</div>
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
        <CareersStep
          careers={careers}
          selectedCareerIds={state.selectedCareerIds}
          onToggle={toggleCareer}
        />
      )}
      {subStep === 'majors' && (
        <MajorsStep
          majorIds={majorIds}
          selectedMajorIds={state.selectedMajorIds}
          onToggle={toggleMajor}
        />
      )}
      {subStep === 'programs' && (
        <ProgramsStep
          majorIds={state.selectedMajorIds}
          educationLevel={level}
          selectedProgramKeys={state.selectedProgramKeys}
          onToggle={toggleProgram}
          gpa={state.gpa}
        />
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" disabled={!canAdvance} onClick={handleNext}>
          {subStep === 'programs' ? 'Continue to Opportunities' : 'Continue'}
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
