// Click Sound Effects (see CLAUDE.md) — a short, simple synthesized click/blip tone, generated
// entirely via the Web Audio API rather than sourcing a real audio file (Task 1) — unlike the
// Admissions Overview Presentation's real, licensed background-music track, a clean UI click tone
// is straightforward to generate programmatically and doesn't need a real recorded asset.
//
// A plain module, not a hook — same reasoning speech.js/backgroundMusic.js already established:
// there's only ever a shared, app-wide notion of "play the click sound," so a module-level
// function is simpler than routing every call through React state.

const BASE_FREQUENCY = 900;   // Hz — a clean, mid-high "click" register, not too low/boomy or shrill
const PITCH_VARIATION = 0.12; // Task 2 — ±12% per play (a smaller range than Minecraft's own
                               // ~±20% block-sound variation this feature is explicitly modeled on,
                               // tuned down since a much shorter UI blip reads as MORE different-
                               // sounding per percent of pitch shift than a longer sample would)
const SWEEP_RATIO = 0.55;     // the note's own fixed downward pitch-sweep shape — same "click"
                               // character every single play; only the overall pitch LEVEL varies
const CLICK_DURATION = 0.06;  // seconds — short, per Task 1's own "short, simple" framing
const CLICK_VOLUME = 0.12;    // quiet — a UI accent, never a dominant sound

let audioCtx = null;

// Lazily created on first real play (always inside a genuine click handler, i.e. a real user
// gesture) rather than eagerly at module load — the safest way to avoid ever touching browser
// autoplay-policy edge cases, matching this app's own established "only ever create/resume audio
// resources from within a real user-triggered call" posture (speech.js, backgroundMusic.js).
function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null; // Web Audio genuinely unsupported — fail silently, nothing plays, no error
  audioCtx = new Ctor();
  return audioCtx;
}

export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    // Task 2 — randomize the pitch on every play, within a small range, so repeated clicks don't
    // sound identical/robotic (the same principle behind Minecraft's block-breaking sound variation).
    const pitchMultiplier = 1 - PITCH_VARIATION / 2 + Math.random() * PITCH_VARIATION;
    const startFreq = BASE_FREQUENCY * pitchMultiplier;
    const endFreq = startFreq * SWEEP_RATIO;

    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // a bit more "click" character than a pure sine tone
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + CLICK_DURATION);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now); // exponentialRampToValueAtTime requires a nonzero start
    gain.gain.exponentialRampToValueAtTime(CLICK_VOLUME, now + 0.004); // fast attack, avoids a pop
    gain.gain.exponentialRampToValueAtTime(0.0001, now + CLICK_DURATION); // quick decay

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + CLICK_DURATION + 0.01);
  } catch {
    // Real, deliberate "fail silently" — same posture speech.js/backgroundMusic.js already take;
    // a UI click sound is polish, never something that should risk breaking a real button click.
  }
}
