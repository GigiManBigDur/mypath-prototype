import { useEffect, useRef } from 'react';
import { speak, stopSpeaking } from '../utils/speech';

// Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — the shared "speak the mascot's current line
// aloud" behavior, used both by MascotWidget (Stage 5's in-flow dialogue) and HubScreen's own
// pointing dialogue (Stage 4). `text` should be `null`/falsy whenever there's nothing to speak
// right now — critically, the CALLER is responsible for passing `null` once a line is dismissed
// (MascotWidget does this itself), since that's what makes "dismissing stops the speech
// immediately" work: it's just a `text` change like any other, handled by the same effect below.
//
// `lastSpokenRef` guards against re-speaking the exact same line on a render that didn't
// meaningfully change it (e.g. `muted` toggling off with the same `text` still showing — see
// below) — speech should only ever start on a genuinely NEW line, not replay one that was already
// shown.
export function useMascotSpeech(text, muted) {
  const lastSpokenRef = useRef(null);

  useEffect(() => {
    if (!text || muted) {
      // Muting mid-speech, or the line going away (dismissed/no longer relevant), both stop
      // audio immediately — the same "don't let it keep talking" requirement either way.
      stopSpeaking();
      return;
    }
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    speak(text);
  }, [text, muted]);

  // Unmounting (navigating to a different screen entirely) should also cut off mid-speech audio,
  // not just let it play out over the new screen.
  useEffect(() => () => stopSpeaking(), []);
}
