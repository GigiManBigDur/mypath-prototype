import { useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking, estimateSpeechDuration } from '../utils/speech';

// Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — the shared "speak the mascot's current line
// aloud" behavior, used both by MascotWidget (Stage 5's in-flow dialogue) and HubScreen's own
// pointing dialogue (Stage 4). `text` should be `null`/falsy whenever there's nothing to speak
// right now — critically, the CALLER is responsible for passing `null` once a line is dismissed
// (MascotWidget does this itself), since that's what makes "dismissing stops the speech
// immediately" work: it's just a `text` change like any other, handled by the same effect below.
//
// Radial-layout pass, Task 4 (see CLAUDE.md) — this hook now also returns `isSpeaking`, so a
// caller can drive a visually distinct "the mascot is actively talking" animation state, separate
// from its idle/pointing states. Real audio (unmuted, a real voice available) drives it off the
// utterance's own `onstart`/`onend` events via `speech.js`'s `speak()` — genuinely synced to the
// audio, not guessed. Muted, or a device with no usable voices, has no real audio to sync to at
// all, so it falls back to `estimateSpeechDuration(text)` — a plain word-count-based timer — so
// the mascot still looks like it's "saying" the line roughly as long as it takes to read, rather
// than either not animating at all or animating forever.
//
// `lastKeyRef` (a `text|voiceURI` fingerprint) replaces the old `lastSpokenRef` — same guard
// against re-speaking/re-triggering on a render that didn't meaningfully change either value
// (e.g. `muted` toggling off with the same `text` still showing), but now shared by both the real
// and estimated-timer branches so neither restarts the speaking animation from scratch on a
// no-op render. `voiceURI` counts as a real change on purpose (see the original comment this
// replaces) — picking a different voice while the same line is showing re-speaks it immediately
// in the new voice, and re-triggers the speaking animation to match.
export function useMascotSpeech(text, muted, voiceURI) {
  const lastKeyRef = useRef(null);
  // Real, confirmed bug found building this (see CLAUDE.md) — React 18 StrictMode's dev-only
  // mount -> cleanup -> remount replay (NOT just a double-invoked effect body; the SEPARATE
  // unmount-only effect below actually fires its cleanup, canceling the just-scheduled timer)
  // made the muted/estimated-timer branch's own key-based dedup indistinguishable from a genuine
  // later mute-toggle with the same line still showing — both look identical (same key) by the
  // time the effect body re-runs. `lastKeySetAtRef` breaks the tie using real wall-clock time:
  // StrictMode's replay happens synchronously, well under 50ms after the original; a real user
  // toggling mute happens much later. See the branch below for exactly how each case is handled.
  const lastKeySetAtRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timeoutRef = useRef(null);

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

    const key = `${text}|${voiceURI}`;
    const isNewKey = key !== lastKeyRef.current;

    if (muted) {
      // Muting always stops any real audio immediately, on every render, regardless of whether
      // the key changed — matches this hook's own original, already-relied-upon "mute stops
      // immediately" contract.
      stopSpeaking();
      if (isNewKey) {
        // Genuinely new content while muted (a new line, not just a toggle) — the dialogue text
        // still "appears," so the speaking animation still plays, timed against a word-count
        // estimate rather than real audio, since there's none to sync to (Task 4's own "and/or").
        lastKeyRef.current = key;
        lastKeySetAtRef.current = Date.now();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSpeaking(true);
        timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
      } else if (Date.now() - lastKeySetAtRef.current > 50) {
        // A genuinely later occurrence of the same line/voice combination while muted — mute was
        // just toggled ON with this exact line already showing — stop the animation right away.
        setIsSpeaking(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      } else if (!timeoutRef.current) {
        // Within the StrictMode replay window AND no timer is currently pending — the unmount-
        // only effect's cleanup (below) already canceled the one scheduled a moment ago. Without
        // this, the animation would silently run forever: `isNewKey` is false here (so the branch
        // above never re-schedules), and the "real toggle" branch above didn't fire either (too
        // soon), so nothing would otherwise ever turn it back off. Reschedule it — a few
        // milliseconds of drift from the original schedule is imperceptible.
        timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
      }
      return;
    }

    // Bug fix, confirmed directly (not assumed) — this is what made the mascot's speaking pose
    // "stop working" specifically on the hub. Two compounding real issues, both fixed together:
    //   1. `speak()` returning `true` only means a real utterance was successfully QUEUED, never
    //      a guarantee the browser will actually fire `onend`/`onerror` for it — confirmed by
    //      observing real `speechSynthesis` behavior in this app's own dev/test environment:
    //      `speak()` returns `true` (real voices present), `speechSynthesis.speaking` never
    //      becomes `true`, and neither event ever fires, leaving `isSpeaking` stuck `true`
    //      forever with nothing left to flip it back.
    //   2. Adding a plain unconditional safety-net timer here (an earlier attempt at this fix)
    //      still didn't survive React 18 StrictMode's dev-only mount -> cleanup -> remount
    //      replay — the EXACT SAME race already documented and fixed for the muted branch above,
    //      just never applied here too: the first invocation's timer gets canceled by the
    //      unmount-only cleanup effect below, and the second invocation's `isNewKey` reads
    //      `false` (since `lastKeyRef` was already set by the first invocation and the cleanup
    //      never resets it) — so `if (!isNewKey) return;` used to bail out before ever
    //      (re-)scheduling anything, leaving no live speech AND no pending timer. Confirmed
    //      directly: `isSpeaking` stayed stuck `true` for 8+ seconds straight (well past the 6s
    //      cap `estimateSpeechDuration` enforces) with only the plain-timer fix in place.
    // Fixed the same way the muted branch's own `lastKeySetAtRef` recovery already does: a
    // genuinely new key always (re-)starts speaking; an unchanged key within the ~50ms StrictMode
    // replay window with no timer currently pending means the just-issued attempt was torn down
    // before completing, so it's re-issued; an unchanged key well outside that window is a
    // genuine later re-render (e.g. unmuting with the same line still showing) and — matching
    // this branch's own original "isNewKey gates everything" contract — does nothing.
    const startSpeaking = () => {
      setIsSpeaking(true);
      speak(text, voiceURI, {
        onEnd: () => {
          setIsSpeaking(false);
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        },
      });
      // A real `onEnd` firing clears this immediately above, so a normally-completing utterance
      // is still timed by real audio exactly as before — this is only ever a backstop for when
      // the browser silently never reports completion (see point 1 above).
      timeoutRef.current = setTimeout(() => setIsSpeaking(false), estimateSpeechDuration(text));
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
  }, [text, muted, voiceURI]);

  // Unmounting (navigating to a different screen entirely) should also cut off mid-speech audio
  // and any pending estimated-timer fallback, not just let either play out over the new screen.
  // Also runs as HALF of React 18 StrictMode's dev-only mount->cleanup->remount replay (see the
  // long comment above) — resetting `timeoutRef.current` to null here (not just clearing the
  // browser timer) is what lets the main effect's own re-run correctly detect "nothing pending"
  // instead of reading a stale, already-canceled timer id as if it were still live.
  useEffect(() => () => {
    stopSpeaking();
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  return isSpeaking;
}
