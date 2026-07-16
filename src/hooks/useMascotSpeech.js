import { useEffect, useRef } from 'react';
import { speak, stopSpeaking } from '../utils/speech';

// Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — the shared "speak the mascot's current line
// aloud" behavior, used both by MascotWidget (Stage 5's in-flow dialogue) and HubScreen's own
// pointing dialogue (Stage 4). `text` should be `null`/falsy whenever there's nothing to speak
// right now — critically, the CALLER is responsible for passing `null` once a line is dismissed
// (MascotWidget does this itself), since that's what makes "dismissing stops the speech
// immediately" work: it's just a `text` change like any other, handled by the same effect below.
//
// `lastSpokenRef` guards against re-speaking the exact same line/voice combination on a render
// that didn't meaningfully change either (e.g. `muted` toggling off with the same `text` still
// showing) — speech should only ever start on a genuinely NEW line, not replay one that was
// already shown. `voiceURI` (from "Show Available Voice Options," see CLAUDE.md) is tracked in
// the same ref specifically so that PICKING A DIFFERENT VOICE while the same line is still
// showing counts as a real change too — re-speaking the current line in the newly-picked voice
// immediately, rather than only taking effect the next time the text happens to change. That's
// what makes picking a voice in the settings panel feel like it actually "took" right away,
// rather than something you have to trust will apply next time.
export function useMascotSpeech(text, muted, voiceURI) {
  const lastSpokenRef = useRef({ text: null, voiceURI: undefined });

  useEffect(() => {
    if (!text || muted) {
      // Muting mid-speech, or the line going away (dismissed/no longer relevant), both stop
      // audio immediately — the same "don't let it keep talking" requirement either way.
      stopSpeaking();
      return;
    }
    if (text === lastSpokenRef.current.text && voiceURI === lastSpokenRef.current.voiceURI) return;
    lastSpokenRef.current = { text, voiceURI };
    speak(text, voiceURI);
  }, [text, muted, voiceURI]);

  // Unmounting (navigating to a different screen entirely) should also cut off mid-speech audio,
  // not just let it play out over the new screen.
  useEffect(() => () => stopSpeaking(), []);
}
