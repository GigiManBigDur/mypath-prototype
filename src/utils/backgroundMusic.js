import bgmUrl from '../assets/audio/admissions-presentation-bgm.mp3';

// Background music for the Admissions Overview Presentation (see CLAUDE.md — "Add Background
// Music to the Admissions Overview Presentation"). A real, Pixabay-sourced track, properly
// licensed for this use, bundled as a static asset and imported via Vite's own asset pipeline —
// the resulting URL is automatically correct under both Vercel's root-served deploy and GitHub
// Pages' own /mypath-prototype/ base path, with no manual base-path handling needed here.
//
// A plain module, not a hook — same reasoning speech.js already established: there's only ever
// one thing meaningfully "playing" at a time for the whole app (one screen mounted at a time), so
// a shared module-level start/stop/duck pair is simpler than routing every call through React
// state. See useBackgroundMusic.js for how this ties into a component's real lifecycle.

const BASE_VOLUME = 0.14;        // quiet, clearly background — Task 2's own "never compete" bar
const DUCKED_VOLUME = 0.05;      // further reduced while the mascot is actively narrating
const FADE_IN_MS = 2200;         // Task 1 — "fades in smoothly... not an abrupt start"
const FADE_OUT_MS = 1600;        // Task 3 — "fades out smoothly rather than cutting off abruptly"
const DUCK_TRANSITION_MS = 450;  // ducking itself eases, rather than snapping instantly

let audio = null;
let rafId = null;
let lastDuckedState = null; // null = not yet set; lets duckBackgroundMusic no-op on a redundant call

function ensureAudio() {
  if (!audio) {
    audio = new Audio(bgmUrl);
    audio.loop = true; // the track (~2 min) is very likely shorter than a full 10-module walkthrough
    audio.volume = 0;
  }
  return audio;
}

function restingVolume(ducked) {
  return ducked ? DUCKED_VOLUME : BASE_VOLUME;
}

function cancelTween() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// Smoothly ramps the audio element's own volume from wherever it currently sits to `target` over
// `durationMs`, easing out (matching this app's own established easing preference — useCountUp.js's
// GPA count-up uses the identical ease-out-cubic curve — rather than a flat linear ramp, so a fade
// reads as a natural arrival/departure, not a mechanical ramp). `onDone` fires once it genuinely
// settles, which is what lets stopBackgroundMusic() only pause/reset the element AFTER the fade-out
// has actually finished playing, not the instant it starts.
function tweenVolume(target, durationMs, onDone) {
  if (!audio) return;
  cancelTween();
  const start = audio.volume;
  const startTime = performance.now();
  if (durationMs <= 0) {
    audio.volume = target;
    if (onDone) onDone();
    return;
  }
  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const eased = 1 - (1 - t) ** 3;
    // HTMLMediaElement.volume throws a real, synchronous IndexSizeError for anything outside
    // [0, 1] — confirmed directly (not assumed): the ease-out-cubic formula can overshoot by a
    // tiny floating-point amount right as t approaches 1 (e.g. -0.0004 instead of exactly 0), and
    // an uncaught throw here kills the rAF loop permanently mid-frame, before it ever reaches the
    // line that schedules the next one — freezing the fade wherever it happened to be, silently.
    // Clamping is the correct fix regardless of the precise floating-point mechanism.
    if (audio) audio.volume = Math.max(0, Math.min(1, start + (target - start) * eased));
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
      if (onDone) onDone();
    }
  };
  rafId = requestAnimationFrame(step);
}

// The one place real playback actually starts/stops — called on mount (a real fade-in, Task 1) and
// on every later mute toggle (Task 4: unmuting mid-presentation fades it back in from silence,
// muting fades it out rather than cutting it, matching this whole feature's own "smooth, not
// abrupt" ethos applied consistently to every transition it makes, not just entry/exit).
export function setBackgroundMusicActive(muted, ducked) {
  const el = ensureAudio();
  lastDuckedState = ducked;
  if (muted) {
    tweenVolume(0, FADE_OUT_MS, () => {
      if (audio) audio.pause();
    });
  } else {
    el.play().catch(() => {}); // real, honest "fail silently" — same posture speech.js already
                                // takes; an autoplay-policy block (no user gesture yet) just means
                                // no music plays, never a thrown error, and never blocks narration.
    tweenVolume(restingVolume(ducked), FADE_IN_MS);
  }
}

// Task 2 — ducks (or un-ducks) the resting volume while the presentation stays active/unmuted, via
// a quicker eased transition than a fresh fade-in. No-ops when `ducked` hasn't actually changed
// since the last real call, so a redundant effect firing on the same render (e.g. right alongside
// setBackgroundMusicActive on mount) can never cut a slower fade-in short with a snappier one.
export function duckBackgroundMusic(ducked) {
  if (!audio || lastDuckedState === ducked) return;
  lastDuckedState = ducked;
  tweenVolume(restingVolume(ducked), DUCK_TRANSITION_MS);
}

// Task 3 — fades the music down to silence, then pauses and resets it. Deliberately fire-and-forget
// and independent of whichever component/exit-path called it (finishing all 10 modules, Skip, or
// Back all unmount AdmissionsPresentationScreen identically): the fade continues on plain
// requestAnimationFrame callbacks even after the calling React component has already unmounted,
// since the Audio element itself lives at module scope, not tied to any component's own lifetime —
// the same "the audio module operates independently of whichever caller asked it to act" precedent
// speech.js's own stopSpeaking()/in-flight-fetch handling already established.
export function stopBackgroundMusic() {
  if (!audio) return;
  tweenVolume(0, FADE_OUT_MS, () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
}
