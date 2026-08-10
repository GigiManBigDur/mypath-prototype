import { useEffect } from 'react';
import { setBackgroundMusicActive, duckBackgroundMusic, stopBackgroundMusic } from '../utils/backgroundMusic';

// Ties backgroundMusic.js's plain module (see its own header comment) to a component's real
// lifecycle + the app's live mute/ducking signals — mirrors useMascotSpeech.js's own "hook wraps a
// plain module, drives it off props/lifecycle, cleans up on unmount" shape. Meant to be called
// exactly once, for the whole mounted lifetime of AdmissionsPresentationScreen.
//
// `muted` should be the live `state.voiceMuted` value (Task 4). `ducked` should be true whenever
// narration is actively playing (Task 2) — the screen's own existing `isSpeaking` value already
// driving the mascot's speaking animation is exactly this signal, reused rather than a second,
// independently-tracked one.
export function useBackgroundMusic(muted, ducked) {
  // Unmount only — fires on EVERY exit path (finishing all 10 modules, Skip, or Back all unmount
  // this screen identically), so Task 3's fade-out is handled once, here, regardless of which
  // button the student actually clicked.
  useEffect(() => () => stopBackgroundMusic(), []);

  // Mount (a real fade-in, Task 1) + every later mute toggle (Task 4).
  useEffect(() => {
    setBackgroundMusicActive(muted, ducked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  // Live ducking while narration plays (Task 2) — no-ops harmlessly on a redundant call (e.g. the
  // one that also fires on the same mount render as the effect above), see duckBackgroundMusic's
  // own comment for why that can't cut the initial fade-in short.
  useEffect(() => {
    if (!muted) duckBackgroundMusic(ducked);
  }, [ducked, muted]);
}
