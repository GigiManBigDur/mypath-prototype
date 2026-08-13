import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from '../components/MascotIcon';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ADMISSIONS_MODULES } from '../data/admissionsPresentation';
import { ADMISSIONS_MODULES_GRAD } from '../data/admissionsPresentationGrad';
import { ADMISSIONS_MODULES_TRANSFER } from '../data/admissionsPresentationTransfer';
import { BEAT_VISUALS } from '../components/AdmissionsBeatVisuals';

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
// Stage 2, Batch 1 of 5 (see CLAUDE.md) — a beat with a real, built visual (`BEAT_VISUALS`,
// AdmissionsBeatVisuals.jsx) now renders it INSTEAD of Stage 1's own plain placeholder note; a
// beat with no entry yet keeps falling back to that same placeholder, completely unchanged.
//
// Stage 2, Batch 2 of 5 (see CLAUDE.md) — `BEAT_VISUALS`' own object shape gained one more
// optional field, `Illustration`, so a beat can be BOTH a mascot gesture AND a standalone
// illustration at once.
//
// Stage 3 (Final, see CLAUDE.md) — real animated transition polish, no content/positioning/visual
// changes (every module's own beats, `BEAT_VISUALS` entries, and the module sequence itself are
// completely untouched by this pass — see AdmissionsBeatVisuals.jsx, unmodified since Batch 4).
// Two distinct transition tiers, per this stage's own Task 1/2:
//   - Beat-to-beat (WITHIN a module, auto-advancing on speech completion): a quick, consistent
//     cross-fade + subtle rise applied to the illustration/caption/placeholder-note as ONE unit
//     (`.admissions-beat-content`) — the exact same cross-fade idiom this app's own entrance
//     animations already use everywhere (`admissions-visual-in`, `onboarding-greeting-in`,
//     `bloom-section-reveal`), not a new technique invented for this pass. Sequenced via a real
//     `transitionPhase` state + `setTimeout`: the OUTGOING content plays a quick exit animation
//     BEFORE `beatIndex` actually advances (which is what remounts the wrapper, via its own
//     `key`, and replays its entrance animation) — the same "exit class first, state change
//     second, key-driven remount handles the entrance" sequencing this codebase already favors
//     for a short, simple transition that doesn't need a dedicated exit-tracking hook
//     (`useModalExit.js`) the way a longer-lived modal does.
//   - Module-to-module (on a real Continue click): a distinct, more pronounced variant of the
//     SAME animation family (longer duration, more movement) applied to both the beat-content
//     wrapper AND the title/progress header (`.admissions-presentation-header`, now its own
//     `moduleIndex`-keyed wrapper so it only remounts on a genuine module change, never on a
//     plain beat change) — plus a one-shot scale-pulse layered on top of the mascot's own
//     continuous idle/speaking animation (a sibling class, never replacing it — the same
//     "transient one-shot cue is independent of the ongoing idle/speaking animation" precedent
//     `MascotIcon.jsx`'s own `thinking`/`speaking` props already established), so the mascot
//     itself visibly marks "something bigger just changed" without needing a new gesture.
// `prefers-reduced-motion` disables every new animation via CSS AND collapses the JS-side
// transition delays to 0ms (not just skipping the animation, per this app's own established
// convention that a real, recurring per-beat delay with nothing left to animate is just dead
// waiting, not a graceful degradation) — matching the reduced-motion handling this app's other
// choreographed sequences (OnboardingConversationScreen's own entrance) already use, just applied
// here to a delay that recurs on every beat/module rather than a one-time entrance.
//
// Skippable presentation (see CLAUDE.md) — a persistent "Skip presentation" control, visible from
// module 1 onward (not gated by `showContinue`/`transitionPhase` the way Continue is), reusing the
// exact `.btn-ghost` + colored-accent visual weight Project Builder's own "Skip for now"
// (`.pb-skip`) already established for this app's other optional/skippable steps — smaller and
// less prominent than the filled `.btn-primary` Continue button, never competing with it. Skipping
// calls the IDENTICAL `patch({ screen: 'onboardingConversation' })` the last module's own Continue
// already uses — this screen never writes any OTHER persisted state (moduleIndex/beatIndex/
// transitionPhase are all local, ephemeral useState, never patched to the real app state), so
// finishing normally and skipping early are structurally indistinguishable from the rest of the
// app's own perspective — there's nothing downstream for skipping to desync. Unmounting (via
// either path) already stops any in-flight speech and clears any pending transition timers on its
// own (the existing `useMascotSpeech`/`pendingTimeouts` cleanup effects, both already unconditional
// on unmount) — Skip needed no new cleanup logic of its own.
//
// Background music (see CLAUDE.md) — a real, Pixabay-sourced, properly-licensed lofi track plays
// quietly underneath the whole presentation, via `useBackgroundMusic` (backgroundMusic.js) — a
// plain module mirroring speech.js's own "one shared module-level audio source, not routed through
// React state" shape. `useBackgroundMusic(state.musicMuted, isSpeaking)` is called exactly once,
// for this screen's entire mounted lifetime: `isSpeaking` (the SAME signal already driving the
// mascot's own speaking animation, reused rather than a second, independently-tracked one) is what
// drives Task 2's optional ducking — the music dips slightly further whenever narration is
// genuinely playing, easing back up between beats/modules. The hook's own unmount effect fires on
// EVERY exit path this screen has (finishing all 10 modules, Skip, or Back all unmount it
// identically), so Task 3's fade-out needed no special-casing per exit button, the same
// "unmounting already handles cleanup regardless of which button triggered it" precedent Skip's own
// comment above already established for speech/timers.
//
// Independent Toggle Controls for AI Voice and Background Music (see CLAUDE.md) — a real, deliberate
// follow-up correction: this originally read `state.voiceMuted` here too (one blanket mute governing
// both narration AND music together), matching the OLD single-button behavior at the time this was
// first built. It now reads its own dedicated `state.musicMuted` instead — muting narration
// (`useMascotSpeech`'s own `state.voiceMuted` argument, just below, untouched) no longer silences the
// music, and vice versa. `isSpeaking` itself is STILL driven by `state.voiceMuted` (see
// useMascotSpeech.js — even muted, it still fires on an ESTIMATED timer to keep the mascot's visual
// "talking" animation and beat-advance timing correct), so ducking still tracks the real narration
// BEAT timing regardless of whether voice or music happen to be independently muted.
const BEAT_EXIT_MS = 220;
const MODULE_EXIT_MS = 340;
const MASCOT_PULSE_MS = 500;

export default function AdmissionsPresentationScreen() {
  const { state, patch } = useApp();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Admissions Overview Presentation, per-level scripts (see CLAUDE.md) — the ONE real branch
  // point this feature needed, now a 3-way switch: Undergraduate-track students (already applying
  // to grad school, per this app's own existing `educationLevel` semantics — LEVEL_LABEL elsewhere
  // already treats `undergraduate` as "graduate-school") see the grad-admissions script;
  // Transfer-track students see the transfer-admissions script; High School students keep the
  // original, unmodified `ADMISSIONS_MODULES` (first-year college-admissions content).
  // `state.educationLevel` is guaranteed set by the time this screen is ever reached — Survey's own
  // `canContinue` gate already requires it before Continue is even enabled — so there's no "not yet
  // answered" case to handle here. EVERYTHING below this line reads `activeModules` generically —
  // no other code in this component needed to change, per Task 3's own "reuse all existing
  // infrastructure" requirement (unchanged across both the grad and transfer additions).
  const activeModules = state.educationLevel === 'undergraduate'
    ? ADMISSIONS_MODULES_GRAD
    : state.educationLevel === 'transfer'
      ? ADMISSIONS_MODULES_TRANSFER
      : ADMISSIONS_MODULES;
  const [moduleIndex, setModuleIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  // 'idle' | 'beat-exit' | 'module-exit' — drives which exit animation (if any) plays on the
  // CURRENT content just before it's replaced; see the header comment above for the full sequence.
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [mascotPulse, setMascotPulse] = useState(false);
  const pendingTimeouts = useRef([]);

  const currentModule = activeModules[moduleIndex];
  const currentBeat = currentModule.beats[beatIndex];
  const isLastBeatOfModule = beatIndex === currentModule.beats.length - 1;
  const isLastModule = moduleIndex === activeModules.length - 1;

  const beatVisual = BEAT_VISUALS[`${currentModule.id}-${beatIndex}`];
  const IllustrationComponent = typeof beatVisual === 'function'
    ? beatVisual
    : (beatVisual && typeof beatVisual === 'object' ? beatVisual.Illustration ?? null : null);
  const mascotGestureAngle = beatVisual && typeof beatVisual === 'object' ? beatVisual.mascotPointAngle ?? null : null;
  const hasBuiltVisual = !!beatVisual;

  const isSpeaking = useMascotSpeech(showContinue || transitionPhase !== 'idle' ? null : currentBeat.narration, state.voiceMuted);
  const wasSpeakingRef = useRef(false);

  useBackgroundMusic(state.musicMuted, isSpeaking);

  // Cleanup on unmount only — clears any transition timers still pending so a stray Back-button
  // click mid-transition can never trigger a "set state on an unmounted component" warning.
  useEffect(() => () => {
    pendingTimeouts.current.forEach(clearTimeout);
  }, []);

  const runAfterDelay = (ms, fn) => {
    const t = setTimeout(fn, reducedMotion ? 0 : ms);
    pendingTimeouts.current.push(t);
  };

  useEffect(() => {
    if (showContinue || transitionPhase !== 'idle') { wasSpeakingRef.current = false; return undefined; }
    if (isSpeaking) { wasSpeakingRef.current = true; return undefined; }
    if (!wasSpeakingRef.current) return undefined; // this beat's narration hasn't started yet
    wasSpeakingRef.current = false;
    if (isLastBeatOfModule) {
      setShowContinue(true);
    } else {
      // Beat-to-beat transition: play the quick exit animation on the CURRENT content first,
      // then actually advance beatIndex once it's had time to play — the key-driven remount
      // (below) is what plays the matching entrance for the new beat.
      setTransitionPhase('beat-exit');
      runAfterDelay(BEAT_EXIT_MS, () => {
        setBeatIndex((i) => i + 1);
        setTransitionPhase('idle');
      });
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, showContinue, transitionPhase, isLastBeatOfModule]);

  const handleSkip = () => {
    // Connect the AI Conversation's Opening to the Admissions Overview (see CLAUDE.md) — the one
    // real signal the conversation's own greeting needs, alongside the same navigation this
    // button always did.
    patch({ screen: 'onboardingConversation', admissionsPresentationSkipped: true });
  };

  const handleContinue = () => {
    if (transitionPhase !== 'idle') return; // guard against a double-click mid-transition
    if (isLastModule) {
      // Written explicitly (not just left to DEFAULT_STATE's own `false`) — this is genuinely
      // reachable a second time in principle, so the correct value should never depend on what
      // this field happened to be left at before.
      patch({ screen: 'onboardingConversation', admissionsPresentationSkipped: false });
      return;
    }
    setTransitionPhase('module-exit');
    runAfterDelay(MODULE_EXIT_MS, () => {
      setModuleIndex((i) => i + 1);
      setBeatIndex(0);
      setShowContinue(false);
      setTransitionPhase('idle');
      // A one-shot pulse on the mascot marking the new module landing, layered on top of its own
      // continuous idle/speaking animation — cleared after it plays once.
      setMascotPulse(!reducedMotion);
      runAfterDelay(MASCOT_PULSE_MS, () => setMascotPulse(false));
    });
  };

  const beatContentClass = [
    'admissions-beat-content',
    transitionPhase === 'beat-exit' ? 'admissions-beat-content-exiting' : '',
    transitionPhase === 'module-exit' ? 'admissions-beat-content-module-exiting' : '',
  ].filter(Boolean).join(' ');

  const headerClass = [
    'admissions-presentation-header',
    transitionPhase === 'module-exit' ? 'admissions-presentation-header-exiting' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="admissions-presentation-page">
      <div className="admissions-presentation-topbar">
        <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn btn-ghost admissions-presentation-skip" onClick={handleSkip}>
          Skip presentation <ArrowRight size={14} />
        </button>
      </div>

      {/* Keyed by moduleIndex ONLY (not beatIndex) — this is what makes the header's own entrance
          animation replay exclusively on a real module change, never on a plain beat-to-beat
          advance within the same module. */}
      <div className={headerClass} key={moduleIndex}>
        <div className="admissions-presentation-progress">
          Module {moduleIndex + 1} of {activeModules.length}
        </div>
        <h2 className="admissions-presentation-title">{currentModule.title}</h2>
      </div>

      <div className={`admissions-presentation-mascot${mascotPulse ? ' admissions-presentation-mascot-pulse' : ''}`}>
        <MascotIcon
          size={140}
          speaking={isSpeaking}
          pointing={mascotGestureAngle !== null}
          pointAngle={mascotGestureAngle}
        />
      </div>

      {/* Keyed by module+beat together — remounts (and therefore replays its own entrance
          animation) on every beat change AND every module change alike; which EXIT animation (if
          any) played on the way out is controlled separately, above, via transitionPhase. */}
      <div className={beatContentClass} key={`${currentModule.id}-${beatIndex}`}>
        {IllustrationComponent && (
          <div className="admissions-presentation-illustration">
            <IllustrationComponent />
          </div>
        )}

        <p className="admissions-presentation-caption">{currentBeat.narration}</p>

        {!hasBuiltVisual && (
          <div className="admissions-presentation-visual-note">
            <span className="admissions-presentation-visual-note-label">Visual concept (Stage 2)</span>
            <span className="admissions-presentation-visual-note-text">{currentBeat.visualConcept}</span>
          </div>
        )}
      </div>

      {showContinue && (
        <div className="btn-row admissions-presentation-continue-row">
          <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={transitionPhase !== 'idle'}>
            {isLastModule ? "Continue to my conversation" : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
