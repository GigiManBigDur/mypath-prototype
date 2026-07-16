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

// No API exposes "which voice sounds warm/friendly" — this is a plain name-substring wishlist of
// voices commonly available on major platforms (macOS/iOS Safari, Chrome, Windows Edge) that
// tend to read as more natural than a device's absolute-first default, checked in order; the
// first one actually present on this device/browser wins. Falls through to "first English voice,
// then just the first voice available" if none of these are present — matching Task 1's own
// "choose one that sounds relatively natural if there's a choice, defaulting to whatever's first"
// instruction.
const PREFERRED_VOICE_NAME_HINTS = [
  'Samantha', 'Google US English', 'Microsoft Zira', 'Karen', 'Moira', 'Google UK English Female',
];

function pickVoice() {
  refreshVoices();
  if (cachedVoices.length === 0) return null;
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
// — should always interrupt the previous line, never queue behind it). A real, confirmed
// "fail silently" case (Task 3): if speech isn't available at all, OR the voice list is still
// empty even after `primeVoices()` had a chance to populate it (a device/browser with genuinely
// no usable voices), this is a deliberate no-op — no error, no attempted `speak()` call, the
// caller's own text UI is completely unaffected either way.
export function speak(text) {
  if (!isSpeechAvailable() || !text) return;
  refreshVoices();
  if (cachedVoices.length === 0) return;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = SPEECH_RATE;
  utterance.pitch = SPEECH_PITCH;
  window.speechSynthesis.speak(utterance);
}

// Stops whatever's currently speaking (or queued) immediately — used both when a mascot line is
// dismissed/muted before finishing and when the screen it belongs to unmounts (navigating away
// mid-speech). Safe to call even when nothing is speaking, or when speech isn't available at all.
export function stopSpeaking() {
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}
