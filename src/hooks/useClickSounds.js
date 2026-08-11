import { useEffect, useRef } from 'react';
import { playClickSound, preloadClickSound } from '../utils/clickSound';

// Click Sound Effects (see CLAUDE.md), Task 3 — applied app-wide via a SINGLE delegated click
// listener (attached once, from AppShell in App.jsx, for the app's whole lifetime) rather than
// adding a call to every individual button across this app's ~39 screen/component files. This
// codebase has no single shared Button React component — confirmed directly via grep before
// building this — every clickable element is a plain, inline `<button>`, matching its own
// established convention (`.polish`'s own press-feedback CSS already scopes to `.btn`/`button.card`/
// `.tag`/`.pill`/etc., all of which resolve to real `<button>` elements in the DOM). A document-
// level listener checking `button, [role="button"]` is the JS equivalent of that same shared
// selector set — the closest, most faithful way to "hook into the same shared interactive-element
// definition the button-press animation already goes through" without a component to hook into.
// `[role="button"]` covers the 5 documented exceptions (CourseSelectionScreen ×2,
// MyNarrativeScreen, HubChatPanel, YearOverview) where a clickable card can't itself be a real
// `<button>` since it nests its own separate real `<button>` inside (a `<button>` can't legally
// nest another one).
//
// Deliberately universal, not scoped to `.polish`'s own screen exclusions (the hub, Map 2) — those
// exclusions exist to avoid STACKING two different visual press-animation systems on the same
// element, a concern that doesn't apply to an audio cue at all, so every real button click
// anywhere in the app plays the sound, matching Task 3's own literal "every clickable button in
// the app."
export function useClickSounds(muted) {
  // A ref (not a `useEffect` dependency) so toggling `muted` never requires tearing down and
  // re-attaching the document-level listener — the listener itself is attached exactly once, for
  // the app's whole lifetime; only the live mute check inside it changes.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Fix: playback delay — preload/pre-decode the real click-sound file as early as possible (see
  // clickSound.js's own header comment for the full mechanism), unconditionally, regardless of the
  // CURRENT mute state — a student who starts muted and unmutes later should still get an instant
  // first click, not a late decode delay just because sfx happened to be off at app load.
  useEffect(() => {
    preloadClickSound();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (mutedRef.current) return;
      const target = e.target.closest('button, [role="button"]');
      if (!target || target.disabled) return;
      playClickSound();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
