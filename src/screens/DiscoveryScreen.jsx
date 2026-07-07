import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks } from '../data/interests';
import { findCareer } from '../data/careers';
import CareersStep from './discovery/CareersStep';
import MajorsStep from './discovery/MajorsStep';
import ProgramsStep from './discovery/ProgramsStep';

const SUB_STEPS = ['careers', 'majors', 'programs'];

const SUB_STEP_COPY = {
  careers: {
    title: 'Careers of interest',
    sub: 'Based on your interests, here are careers worth exploring. Pick the one that excites you most.',
  },
  majors: {
    title: 'Related college majors',
    sub: 'These majors lead toward the career you picked. Pick the one that fits best.',
  },
  programs: {
    title: 'Recommended programs',
    sub: 'Well-known programs known for strength in this major.',
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

  const career = state.selectedCareerId
    ? findCareer(state.selectedCareerId, tracks, state.educationLevel)
    : null;

  const goBackSubStep = () => {
    const idx = SUB_STEPS.indexOf(subStep);
    if (idx === 0) {
      patch({ screen: 'admissions' });
    } else {
      setSubStep(SUB_STEPS[idx - 1]);
    }
  };

  const selectCareer = (id) => {
    patch({ selectedCareerId: id, selectedMajorId: null, selectedProgramKeys: [] });
  };
  const selectMajor = (id) => {
    patch({ selectedMajorId: id, selectedProgramKeys: [] });
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
    (subStep === 'careers' && !!state.selectedCareerId) ||
    (subStep === 'majors' && !!state.selectedMajorId) ||
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
          tracks={tracks}
          educationLevel={state.educationLevel}
          selectedCareerId={state.selectedCareerId}
          onSelect={selectCareer}
        />
      )}
      {subStep === 'majors' && career && (
        <MajorsStep
          majorIds={career.relevantMajors}
          selectedMajorId={state.selectedMajorId}
          onSelect={selectMajor}
        />
      )}
      {subStep === 'programs' && state.selectedMajorId && (
        <ProgramsStep
          majorId={state.selectedMajorId}
          educationLevel={state.educationLevel}
          selectedProgramKeys={state.selectedProgramKeys}
          onToggle={toggleProgram}
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
