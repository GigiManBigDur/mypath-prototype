// ElevenLabs Voice integration (see CLAUDE.md — "Integrate ElevenLabs Voice"). Every mascot line
// in this app is synthesized through Eleven Creative's Text-to-Speech API, using one fixed voice
// ("Karma - Social Media Starlet") — replacing the earlier free browser-native SpeechSynthesis
// version this file used to wrap. The real ElevenLabs API key lives ONLY in a server-side Vercel
// serverless function (api/tts.js) — this module never touches it and never could; it only ever
// calls this app's OWN `/api/tts` proxy over a plain fetch, exactly like calling any other backend
// endpoint. See api/tts.js's own header comment for the proxy itself and why this is the one
// deliberate exception to this app's "no backend" constraint.
//
// Kept as a plain module (not a hook), same reasoning as the SpeechSynthesis version it replaces —
// there's only ever one utterance meaningfully "in flight" for the whole app (one screen mounted
// at a time), so a shared module-level speak()/stopSpeaking() pair is simpler than routing every
// call through React state.

// The Vite dev server (`npm run dev`) has no serverless functions of its own, and GitHub Pages
// (a purely static host) can't run one either — so the client always calls this app's OWN linked
// Vercel deployment directly, via an absolute cross-origin URL, regardless of where the frontend
// itself happens to be served from. A plain hardcoded constant rather than an env var: the
// endpoint's own URL isn't sensitive (it's a public API route with its own origin allowlist, see
// api/tts.js), and a prototype doesn't need the extra indirection of a configurable value that
// still requires a full rebuild to change either way.
const TTS_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/tts';

let currentAudio = null;
let currentAbortController = null;

// Stops whatever's currently speaking (or still being fetched) immediately — used both when a
// mascot line is dismissed/muted before finishing and when the screen it belongs to unmounts
// (navigating away mid-speech). Safe to call even when nothing is speaking/fetching. Aborting the
// in-flight fetch (not just pausing any already-playing audio) matters specifically because a real
// network request has real latency a browser TTS call never did — without this, an old, superseded
// request could still resolve and start playing audio for a line the student already navigated
// away from.
export function stopSpeaking() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

// Fetches real ElevenLabs audio for `text` from this app's own server-side proxy and plays it,
// wiring `onStart`/`onEnd` to the actual audio element's own real `playing`/`ended`/`error` events
// — genuinely synced to real playback, not guessed. Fire-and-forget (no return value): callers
// drive their own fallback timer in parallel (see useMascotSpeech.js), the same "real audio wins,
// a timer is just a backstop" shape the old SpeechSynthesis version used, still needed here since
// a real HTTP request can fail or hang in ways a same-process browser API call couldn't.
//
// A real, deliberate "fail silently" case (Task 2's own "graceful fallback" requirement): if the
// fetch fails for ANY reason — network error, server error, a missing/invalid API key, ElevenLabs
// itself erroring, audio decoding failure, an autoplay-policy block — no exception ever escapes
// this function. `onEnd` fires so the caller's own speaking-animation state doesn't get stuck, and
// the caller's own dialogue TEXT (already rendered independent of this call — MascotWidget/
// HubScreen never gate the visible text on whether audio loaded) is completely unaffected either
// way.
export function speak(text, { onStart, onEnd } = {}) {
  stopSpeaking();
  if (!text) return;

  const controller = new AbortController();
  currentAbortController = controller;

  fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`TTS request failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      if (controller.signal.aborted) return; // superseded by a newer call while this was in flight
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.addEventListener('playing', () => { if (onStart) onStart(); }, { once: true });
      const finish = () => { URL.revokeObjectURL(url); if (onEnd) onEnd(); };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      audio.play().catch(finish);
    })
    .catch(() => {
      if (!controller.signal.aborted && onEnd) onEnd();
    });
}

// The mascot "speaking" animation (Task 4 of the original Radial-layout pass) needs SOME notion
// of "how long is this line" as a fallback when real audio timing can't be relied on (muted, or
// the ElevenLabs fetch itself is still in flight/never resolves) — a plain, honest estimate
// (~2.3 words/sec) rather than a fixed duration, so a one-word line and a long paragraph don't
// animate for the same length of time. Clamped to a sane range so neither extreme looks broken.
export function estimateSpeechDuration(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.min(6000, Math.max(1200, Math.round((words / 2.3) * 1000)));
}
