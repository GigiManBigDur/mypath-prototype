import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from '../components/MascotIcon';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { ADMISSIONS_MODULES } from '../data/admissionsPresentation';

// Admissions Overview Presentation, Stage 1 (see CLAUDE.md) — a real, research-grounded 10-module
// presentation inserted into the pre-hub flow (Sign Up -> Survey -> THIS SCREEN -> the onboarding
// AI conversation -> Hub), replacing the old one-line "Quick context: ..." hub dialogue
// (`ADMISSIONS_CONTEXT_LINES`, now removed).
//
// Delivery mechanism (Task 4) reuses the EXACT beat-advance pattern OnboardingConversationScreen's
// own 'greeting' phase already established: `useMascotSpeech(text, muted)` returns `isSpeaking`; a
// `wasSpeakingRef` tracks the true -> false transition (speech genuinely finished — real audio
// timing when unmuted, the estimated-duration fallback otherwise) to auto-advance to the next beat
// with no click needed. Only once a MODULE's own last beat finishes does this stop auto-advancing
// and reveal "Continue" instead — the literal Task 4 requirement ("beats advance automatically
// within a module... a 'Continue' click moves between modules").
//
// Stage 1 scope (Task 3): each beat's `visualConcept` (admissionsPresentation.js) is shown as a
// clearly-labeled placeholder note, not real illustration/animation — that's Stage 2, a separate,
// later, smaller-batched task given the larger ~38-beat scope here.
export default function AdmissionsPresentationScreen() {
  const { state, patch } = useApp();
  const [moduleIndex, setModuleIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  const currentModule = ADMISSIONS_MODULES[moduleIndex];
  const currentBeat = currentModule.beats[beatIndex];
  const isLastBeatOfModule = beatIndex === currentModule.beats.length - 1;
  const isLastModule = moduleIndex === ADMISSIONS_MODULES.length - 1;

  const isSpeaking = useMascotSpeech(showContinue ? null : currentBeat.narration, state.voiceMuted);
  const wasSpeakingRef = useRef(false);

  useEffect(() => {
    if (showContinue) { wasSpeakingRef.current = false; return undefined; }
    if (isSpeaking) { wasSpeakingRef.current = true; return undefined; }
    if (!wasSpeakingRef.current) return undefined; // this beat's narration hasn't started yet
    wasSpeakingRef.current = false;
    if (isLastBeatOfModule) {
      setShowContinue(true);
    } else {
      setBeatIndex((i) => i + 1);
    }
    return undefined;
  }, [isSpeaking, showContinue, isLastBeatOfModule]);

  const handleContinue = () => {
    if (isLastModule) {
      patch({ screen: 'onboardingConversation' });
      return;
    }
    setModuleIndex((i) => i + 1);
    setBeatIndex(0);
    setShowContinue(false);
  };

  return (
    <div className="admissions-presentation-page">
      <button type="button" className="btn btn-ghost admissions-presentation-back" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="admissions-presentation-progress">
        Module {moduleIndex + 1} of {ADMISSIONS_MODULES.length}
      </div>
      <h2 className="admissions-presentation-title">{currentModule.title}</h2>

      <div className="admissions-presentation-mascot">
        <MascotIcon size={140} speaking={isSpeaking} />
      </div>

      <p className="admissions-presentation-caption">{currentBeat.narration}</p>

      <div className="admissions-presentation-visual-note">
        <span className="admissions-presentation-visual-note-label">Visual concept (Stage 2)</span>
        <span className="admissions-presentation-visual-note-text">{currentBeat.visualConcept}</span>
      </div>

      {showContinue && (
        <div className="btn-row admissions-presentation-continue-row">
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            {isLastModule ? "Continue to my conversation" : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
