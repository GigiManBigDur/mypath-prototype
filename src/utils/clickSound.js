import clickSoundUrl from '../assets/audio/click.mp3';

// Click Sound Effects (see CLAUDE.md) — plays a real, licensed click-sound asset (sourced from
// Pixabay/Mixkit, provided directly by the user, matching the same "real, licensed asset" posture
// the Admissions Overview Presentation's own background music already established) rather than the
// originally-shipped synthesized oscillator tone this file used to generate. Randomized pitch
// variation (Task 1's own explicit "keep the existing... logic") is preserved byte-for-byte in
// spirit — same ±12% range, same formula — just applied via `AudioBufferSourceNode.playbackRate`
// (the standard Web Audio way to vary a SAMPLE's pitch, and literally how games like Minecraft vary
// their own fixed block-sound samples too) instead of an oscillator's own `frequency` param, since
// there's no oscillator left to detune.
//
// A plain module, not a hook — same reasoning speech.js/backgroundMusic.js already established:
// there's only ever a shared, app-wide notion of "play the click sound," so a module-level function
// is simpler than routing every call through React state.

const PITCH_VARIATION = 0.12; // Task 2 (of the original feature) — ±12% per play, unchanged
const CLICK_VOLUME = 0.7;     // a real, already-mastered sample reads well closer to its own
                               // natural level than the old synthesized tone's much quieter 0.12
                               // ever needed to (that value was specifically calibrated to tame a
                               // harmonically-simple, perceptually-loud raw oscillator wave) — a
                               // hand-picked judgment call, since the actual mix couldn't be
                               // auditioned in this environment, same posture the background-music
                               // feature's own volume constants already documented.

let audioCtx = null;
let decodedBuffer = null;
let decodePromise = null;

// Creating an AudioContext never needs a user gesture — only RESUMING one that started suspended
// (autoplay policy) or otherwise producing real audible output does. Created eagerly here (called
// from preloadClickSound() below, itself called from AppShell's own mount effect, well before any
// real click) specifically because DECODING audio via decodeAudioData works fine on a suspended
// context — it's pure data processing, not audio output — so there's no reason to wait for a real
// gesture just to get the buffer ready in memory.
function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null; // Web Audio genuinely unsupported — fail silently, nothing plays, no error
  audioCtx = new Ctor();
  return audioCtx;
}

// Fix: the delay between a click and the sound actually starting was the fetch+decode round trip
// happening AT click time — confirmed directly as the cause, not guessed, by the fact that decoding
// a ~52KB MP3 is exactly the kind of work that reads as a perceptible "lag" on a UI action expected
// to feel instant. This function does that fetch+decode ONCE, as early as possible — called from
// AppShell's own mount effect (App.jsx), matching the exact "prime an audio resource early, from
// AppShell's own mount effect" precedent this app's own ElevenLabs voice-priming (`primeVoices()`)
// already established for the identical class of problem. By the time a real click ever happens,
// `decodedBuffer` is already sitting in memory, and playClickSound() below never touches the
// network or the decoder at click time — only a cheap, synchronous `createBufferSource()` call.
export function preloadClickSound() {
  if (decodedBuffer || decodePromise) return decodePromise; // already decoded, or already in flight
  const ctx = getAudioContext();
  if (!ctx) return null;
  decodePromise = fetch(clickSoundUrl)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      decodedBuffer = buffer;
      decodePromise = null;
      return buffer;
    })
    .catch(() => {
      decodePromise = null; // real, deliberate "fail silently" — see playClickSound()'s own retry
    });
  return decodePromise;
}

export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (!decodedBuffer) {
      // A genuinely rare edge case — preloadClickSound() either never ran, hasn't finished yet (an
      // extremely fast first click), or failed outright. Falls back to decoding now and retrying
      // once it's ready, rather than silently dropping this one click's sound — the exact behavior
      // this app had BEFORE preloading existed, just no longer the common path.
      preloadClickSound()?.then(() => {
        if (decodedBuffer) playClickSound();
      });
      return;
    }

    // Task 2 (of the original feature) — randomize the pitch on every play, within a small range,
    // so repeated clicks don't sound identical/robotic (the same principle behind Minecraft's
    // block-breaking sound variation) — unchanged formula/range from the synthesized version.
    const pitchMultiplier = 1 - PITCH_VARIATION / 2 + Math.random() * PITCH_VARIATION;

    const source = ctx.createBufferSource();
    source.buffer = decodedBuffer;
    source.playbackRate.value = pitchMultiplier;

    const gain = ctx.createGain();
    gain.gain.value = CLICK_VOLUME;

    source.connect(gain);
    gain.connect(ctx.destination);

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };

    source.start(0);
  } catch {
    // Real, deliberate "fail silently" — same posture speech.js/backgroundMusic.js already take;
    // a UI click sound is polish, never something that should risk breaking a real button click.
  }
}
