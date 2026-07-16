// Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — free, browser-native voiceover via the Web
// Speech API (`SpeechSynthesis`). Deliberately the cheap version: this is here to test whether
// voice adds anything at all before ever considering a paid, more natural-sounding service, so
// there's no attempt to disguise synthetic-sounding browser voices as something they're not.
//
// Kept as a plain module (not a hook) since `speechSynthesis` is a single, genuinely global
// browser resource — there's only ever one utterance meaningfully "in flight" for the whole app
// (only one screen, and therefore at most one mascot dialogue source, is ever mounted at a time),
// so a shared module-level a la carte API (`speak`/`stopSpeaking`) is simpler than routing every
// call through React state.
export function isSpeechAvailable() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';
}

let cachedVoices = [];

function refreshVoices() {
  if (!isSpeechAvailable()) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;
}

// Call once, early (App.jsx, on mount) — voice lists load ASYNCHRONOUSLY on many browsers
// (Chrome in particular reports an empty list on the very first `getVoices()` call and only
// populates it once its own `voiceschanged` event fires), so priming this well before the first
// real mascot line needs to speak (which requires navigating past Welcome/Sign Up first, giving
// the browser a real head start) means `speak()` itself can stay a plain synchronous call rather
// than needing its own async retry/wait logic.
export function primeVoices() {
  if (!isSpeechAvailable()) return;
  refreshVoices();
  if (cachedVoices.length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices, { once: true });
  }
}

// "Show Available Voice Options" feature (see CLAUDE.md) — the real voice list this device/
// browser actually offers, exposed so a settings panel can list every option with a preview
// button, rather than the app silently guessing on the student's behalf. Always a fresh read
// (via `refreshVoices()`), not a stale snapshot from whenever this was first called.
export function getAvailableVoices() {
  refreshVoices();
  return cachedVoices;
}

// No API exposes "which voice sounds warm/friendly" — this is a plain name-substring wishlist of
// voices commonly available on major platforms (macOS/iOS Safari, Chrome, Windows Edge) that
// tend to read as more natural than a device's absolute-first default, checked in order; the
// first one actually present on this device/browser wins. Falls through to "first English voice,
// then just the first voice available" if none of these are present — matching Task 1's own
// original "choose one that sounds relatively natural if there's a choice, defaulting to
// whatever's first" instruction. Only ever consulted now when `preferredURI` (below) doesn't
// resolve to a real voice — i.e. the student hasn't explicitly picked one yet, or picked one that
// stopped being available (a device/voice-pack change) — since an explicit human pick should
// always win over this heuristic guess.
const PREFERRED_VOICE_NAME_HINTS = [
  'Samantha', 'Google US English', 'Microsoft Zira', 'Karen', 'Moira', 'Google UK English Female',
];

// `preferredURI` is `state.voiceURI` (AppContext.jsx) — a voice's own stable `voiceURI`, the one
// thing about a `SpeechSynthesisVoice` worth persisting (the objects themselves aren't meaningful
// to serialize/store, and aren't guaranteed to be the same object instances across a
// `getVoices()` re-fetch anyway). Resolved fresh against the CURRENT voice list every call,
// rather than cached, so a voice that's no longer available (uninstalled, or a genuinely
// different device) safely falls through to the auto-pick heuristic instead of silently doing
// nothing.
function pickVoice(preferredURI) {
  refreshVoices();
  if (cachedVoices.length === 0) return null;
  if (preferredURI) {
    const preferred = cachedVoices.find((v) => v.voiceURI === preferredURI);
    if (preferred) return preferred;
  }
  for (const hint of PREFERRED_VOICE_NAME_HINTS) {
    const match = cachedVoices.find((v) => v.name.includes(hint));
    if (match) return match;
  }
  return cachedVoices.find((v) => v.lang && v.lang.startsWith('en')) || cachedVoices[0];
}

// A natural-feeling rate/pitch, not the flat default — slightly slower than 1.0 so it doesn't
// read as rushed, and a touch higher-pitched than flat so it doesn't read as monotone. Hand-
// picked judgment calls, not derived from anything measured; browser TTS quality varies enough
// by device that these are a reasonable middle ground, not a guarantee of "warm."
const SPEECH_RATE = 0.95;
const SPEECH_PITCH = 1.05;

// Speaks `text` aloud, replacing whatever was speaking before (a mascot line changing — the
// student advancing to a new screen/sub-step, or the survey's own staggered sequence moving on
// — should always interrupt the previous line, never queue behind it; the same is true of a
// voice-settings preview interrupting a mascot line, or vice versa — there's still only ever one
// utterance meaningfully "in flight"). A real, confirmed "fail silently" case (Task 3): if speech
// isn't available at all, OR the voice list is still empty even after `primeVoices()` had a
// chance to populate it (a device/browser with genuinely no usable voices), this is a deliberate
// no-op — no error, no attempted `speak()` call, the caller's own text UI is completely
// unaffected either way. `preferredURI` (optional) is a specific voice's `voiceURI` to use
// instead of the auto-pick heuristic — see `pickVoice()`'s own comment.
//
// Radial-layout pass (see CLAUDE.md) — `onStart`/`onEnd` are optional callbacks wired straight to
// the real utterance's own `onstart`/`onend`/`onerror` events, added so `useMascotSpeech` can
// drive a "the mascot is actively speaking right now" boolean off REAL audio timing when audio is
// actually playing (rather than a guessed duration) — see `estimateSpeechDuration` below for the
// fallback used when it isn't. Returns `true` only if a real utterance was actually queued, so the
// caller knows whether to fall back to the estimated-duration timer instead.
export function speak(text, preferredURI, { onStart, onEnd } = {}) {
  if (!isSpeechAvailable() || !text) return false;
  refreshVoices();
  if (cachedVoices.length === 0) return false;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  const voice = pickVoice(preferredURI);
  if (voice) utterance.voice = voice;
  utterance.rate = SPEECH_RATE;
  utterance.pitch = SPEECH_PITCH;
  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

// Radial-layout pass (see CLAUDE.md) — Task 4's mascot "speaking" animation needs SOME notion of
// "how long is this line" even when there's no real audio to time it against (muted, or a device
// with no usable voices at all) — a plain, honest estimate (~2.3 words/sec, roughly in line with
// SPEECH_RATE's slightly-slower-than-default pace) rather than a fixed duration, so a one-word
// line and a long paragraph don't animate for the same length of time. Clamped to a sane range so
// neither extreme looks broken (a blink-and-you-miss-it flash, or an animation that outlasts the
// dialogue bubble itself).
export function estimateSpeechDuration(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.min(6000, Math.max(1200, Math.round((words / 2.3) * 1000)));
}

// Stops whatever's currently speaking (or queued) immediately — used both when a mascot line is
// dismissed/muted before finishing and when the screen it belongs to unmounts (navigating away
// mid-speech). Safe to call even when nothing is speaking, or when speech isn't available at all.
export function stopSpeaking() {
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}
