import { useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking, estimateSpeechDuration } from '../utils/speech';

// Dashboard/Guide feature, Stage 6 (see CLAUDE.md), now running on ElevenLabs Voice instead of the
// original browser SpeechSynthesis — the shared "speak the mascot's current line aloud" behavior,
// used both by MascotWidget (in-flow dialogue) and HubScreen's own pointing dialogue. `text`
// should be `null`/falsy whenever there's nothing to speak right now — critically, the CALLER is
// responsible for passing `null` once a line is dismissed (MascotWidget does this itself), since
// that's what makes "dismissing stops the speech immediately" work: it's just a `text` change like
// any other, handled by the same effect below.
//
// This hook also returns `isSpeaking`, so a caller can drive a visually distinct "the mascot is
// actively talking" animation state, separate from its idle/pointing states. Real audio (unmuted)
// drives it off the actual audio element's own `playing`/`ended`/`error` events via `speech.js`'s
// `speak()` — genuinely synced to the audio, not guessed, INCLUDING the real network latency of an
// actual TTS fetch (unlike the old same-process browser API, `isSpeaking` only turns `true` once
// real playback genuinely begins, not the moment the request is fired off — see `startSpeaking`
// below). Muted has no real audio to sync to at all, so it falls back to
// `estimateSpeechDuration(text)` — a plain word-count-based timer — so the mascot still looks like
// it's "saying" the line roughly as long as it takes to read.
//
// `lastKeyRef` (now just the dialogue `text` itself — there's only one fixed ElevenLabs voice, so
// there's no second value to fingerprint the way `voiceURI` once was) guards against re-speaking/
// re-triggering on a render that didn't meaningfully change the line (e.g. `muted` toggling off
// with the same `text` still showing).
export function useMascotSpeech(text, muted) {
  const lastKeyRef = useRef(null);
  // Real, confirmed bug found building the original SpeechSynthesis version (see CLAUDE.md) —
  // React 18 StrictMode's dev-only mount -> cleanup -> remount replay (NOT just a double-invoked
  // effect body; the SEPARATE unmount-only effect below actually fires its cleanup, canceling
  // whatever was just started) made this branch's own key-based dedup indistinguishable from a
  // genuine later mute-toggle with the same line still showing — both look identical (same key) by
  // the time the effect body re-runs. `lastKeySetAtRef` breaks the tie using real wall-clock time:
  // StrictMode's replay happens synchronously, well under 50ms after the original; a real user
  // toggling mute happens much later. Still needed with the ElevenLabs rewrite — this is a
  // React-level race, unrelated to which underlying speech mechanism is used.
  const lastKeySetAtRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timeoutRef = useRef(null);

  // A generous allowance for the real TTS fetch+decode round trip, on top of the per-line reading
  // estimate — this app's own dev/test environment (and a real deployed one) can see real network
  // latency an in-process browser API call never had, so the "in case nothing ever fires" safety
  // net has to cover the WHOLE lifecycle (fetch -> decode -> play -> finish), not just the
  // estimated reading time alone, or it could fire before real playback even has a chance to
  // start.
  const FETCH_LATENCY_BUFFER_MS = 4000;

  useEffect(() => {
    if (!text) {
      // The line going away (dismissed, screen navigated, or no longer relevant) stops audio and
      // the speaking animation immediately — the same "don't let it keep talking" requirement.
      stopSpeaking();
      setIsSpeaking(false);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      lastKeyRef.current = null;
      return;
    }

    const key = text;
    const isNewKey = key !== lastKeyRef.current;

    if (muted) {
      // Muting always stops any real audio immediately (and skips ever calling the ElevenLabs API
      // at all while muted — no point spending a real network request, and real usage/cost, on
      // audio nobody will hear), on every render, regardless of whether the key changed — matches
      // this hook's own original, already-relied-upon "mute stops immediately" contract.
      stopSpeaking();
      if (isNewKey) {
        // Genuinely new content while muted (a new line, not just a toggle) — the dialogue text
        // still "appears," so the speaking animation still plays, timed against a word-count
        // estimate rather than real audio, since there's none to sync to.
        lastKeyRef.current = key;
        lastKeySetAtRef.current = Date.now();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSpeaking(true);
        timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
      } else if (Date.now() - lastKeySetAtRef.current > 50) {
        // A genuinely later occurrence of the same line while muted — mute was just toggled ON
        // with this exact line already showing — stop the animation right away.
        setIsSpeaking(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      } else if (!timeoutRef.current) {
        // Within the StrictMode replay window AND no timer is currently pending — the unmount-
        // only effect's cleanup (below) already canceled the one scheduled a moment ago. Without
        // this, the animation would silently run forever. Reschedule it — a few milliseconds of
        // drift from the original schedule is imperceptible.
        timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
      }
      return;
    }

    // `isSpeaking` turns `true` once real playback genuinely begins (`onStart`, wired to the audio
    // element's own `playing` event) — a real TTS fetch has real network latency an in-process
    // browser API call never did, so optimistically flipping this the instant `speak()` is CALLED
    // (the old SpeechSynthesis version's own approach, safe there since queuing an utterance was
    // near-instant) would desync the mouth/expression animation from when the student can actually
    // hear anything.
    //
    // `speech.js`'s own contract guarantees `onEnd` fires on EVERY path — a real completed
    // playback, or any failure (network error, no deployed endpoint yet, an autoplay-policy block,
    // a bad API key, ElevenLabs itself erroring) — so `started` (never real React state, just a
    // closure flag scoped to this one `speak()` call) is what tells `onEnd` which of those actually
    // happened. Real playback finishing just stops normally. Real playback NEVER STARTING is Task
    // 2's own "graceful fallback" requirement extended to the VISUAL GESTURE, not just the dialogue
    // text — without this, an unreachable/failing TTS endpoint would silently kill the whole
    // pointing/speaking animation too (since `pointing`/`speaking` both read this hook's own
    // `isSpeaking`), even though the text itself was always independently safe. Falling back to the
    // same word-count `estimateSpeechDuration` timing the muted branch already uses keeps the
    // gesture's own timing honest (a one-word line and a paragraph don't animate equally long) and
    // means a broken TTS endpoint degrades to "exactly what happens in dev before Vercel is
    // deployed" rather than "the mascot goes visibly inert."
    const startSpeaking = () => {
      let started = false;
      speak(text, {
        onStart: () => {
          started = true;
          setIsSpeaking(true);
        },
        onEnd: () => {
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
          if (started) {
            setIsSpeaking(false);
          } else {
            setIsSpeaking(true);
            timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
          }
        },
      });
      // Overall safety net in case real playback starts but `ended`/`error` never fire, or the
      // fetch itself hangs forever without ever resolving `onEnd` at all.
      timeoutRef.current = setTimeout(() => setIsSpeaking(false), FETCH_LATENCY_BUFFER_MS + estimateSpeechDuration(text));
    };

    if (isNewKey) {
      lastKeyRef.current = key;
      lastKeySetAtRef.current = Date.now();
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      startSpeaking();
    } else if (Date.now() - lastKeySetAtRef.current > 50) {
      // Genuine later re-render, same key — nothing to do, matching the original contract.
    } else if (!timeoutRef.current) {
      // Within the StrictMode replay window and nothing currently pending — recover.
      startSpeaking();
    }
  }, [text, muted]);

  // Unmounting (navigating to a different screen entirely) should also cut off mid-speech audio
  // (or an in-flight fetch — see stopSpeaking's own comment) and any pending fallback timer, not
  // just let either play out over the new screen. Also runs as HALF of React 18 StrictMode's
  // dev-only mount->cleanup->remount replay (see the long comment above) — resetting
  // `timeoutRef.current` to null here (not just clearing the browser timer) is what lets the main
  // effect's own re-run correctly detect "nothing pending" instead of reading a stale, already-
  // canceled timer id as if it were still live.
  useEffect(() => () => {
    stopSpeaking();
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  return isSpeaking;
}
