import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getMascotLine } from '../data/mascotDialogue';

// Dashboard/Guide feature, Stage 5 — permanently marks a mascot dialogue "intro" key as seen,
// the moment a screen renders with that key as its current resolved dialogue. Each screen decides
// its OWN current key from real progress state (see e.g. SurveyScreen's own field-sequence logic)
// and only ever calls this for whichever key it's actually about to show as an intro line —
// revisit lines are never passed here, since those are meant to repeat every visit by design.
//
// Marking happens on mount/key-change via this effect, not on manual dismiss — a message that
// was displayed counts as "seen" regardless of whether the user clicked the widget's dismiss
// button or just kept working and never touched it. This mirrors DiscoveryScreen's own one-shot
// `discoveryEntryStep` clearing (Stage 2) and `activeCourseCheckpoint`'s read-once shape: a plain
// `useEffect` keyed on the identifier, appending to the array only if it isn't already there.
export function useMarkMascotSeen(key) {
  const { state, patch } = useApp();
  useEffect(() => {
    if (key && !state.mascotSeenKeys.includes(key)) {
      patch({ mascotSeenKeys: [...state.mascotSeenKeys, key] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// A real, confirmed bug this hook exists to fix: a caller that checks
// `state.mascotSeenKeys.includes(key)` directly in its own render body (to decide what TEXT to
// show) breaks the instant `useMarkMascotSeen` actually marks that key seen — the mark-seen
// effect fires essentially immediately after mount, triggering a re-render in which that same
// live check now reads `true`, so the intro line vanishes (or flips to a revisit line) within
// milliseconds, before a user could ever actually read it. Confirmed directly via Playwright: a
// widget built this way rendered NO text at any point after mount, not even for one frame — by
// the time the DOM was queried, the mark-seen round trip had already completed.
//
// The fix is to snapshot "was this key already seen" and freeze that answer for as long as the
// CALLER keeps asking about the SAME key value across consecutive renders — but re-derive it
// fresh from live state the moment the key actually CHANGES to something new (including back to
// a value it held earlier). This is deliberately narrower than "cache forever per key, once
// per mount": an earlier version of this hook cached the very first answer for each key forever,
// which fixed the flicker but broke a real, needed case — DiscoveryScreen's single mounted
// instance revisiting 'discovery-careers-intro' a SECOND time (careers -> majors -> back to
// careers) kept reading the STALE "not yet seen" snapshot from the first visit, showing the full
// intro again instead of the revisit line, even though the key had genuinely been marked seen in
// between. Recomputing on every key CHANGE (not "first time this key is ever seen") gets both
// right: the mark-seen effect's own re-render keeps the SAME key, so the snapshot stays frozen
// (no flicker); actually leaving and coming back changes the key away and then back, which counts
// as a fresh transition each time, so the snapshot re-reads current `mascotSeenKeys` on return
// (correctly showing the revisit line by then). Reading/writing the refs directly in the render
// body (not inside an effect) is what makes the fresh snapshot available in time for the SAME
// render that the key change happens on, rather than one render behind.
function useMascotSeenSnapshot(key) {
  const { state } = useApp();
  const lastKey = useRef();
  const snapshot = useRef(true);
  if (key !== lastKey.current) {
    lastKey.current = key;
    snapshot.current = key ? state.mascotSeenKeys.includes(key) : true;
  }
  return snapshot.current;
}

// Convenience wrapper for the common "one intro key, no revisit text defined, just go quiet
// afterward" shape (pure info screens like Admissions Overview) — resolves the text AND marks it
// seen in one call, so a screen with nothing more nuanced to decide doesn't need to hand-roll the
// same three-line `!seenKeys.includes(key) ? ... : null` check itself. Screens with real
// progression logic (SurveyScreen's field sequence, Discovery's sub-steps, ...) still compute
// their own key and call `useMarkMascotSeen` directly instead, since THEIR "is this still
// relevant" question depends on more than just "have they seen it."
export function useMascotIntroOnce(key) {
  const wasAlreadySeen = useMascotSeenSnapshot(key);
  useMarkMascotSeen(wasAlreadySeen ? null : key);
  return wasAlreadySeen ? null : getMascotLine(key);
}

// Convenience wrapper for the other common shape this stage's screens share: a real intro line
// shown once, then a short, freely-repeatable revisit line on every later visit — as opposed to
// `useMascotIntroOnce`'s "go quiet after" for screens with nothing further to say.
// `revisitKey` is optional; passing none reproduces `useMascotIntroOnce`'s own quiet-after
// behavior for a caller that only sometimes has a revisit line (e.g. a per-sub-step key set where
// only some sub-steps got one).
export function useMascotIntroThenRevisit(introKey, revisitKey) {
  const wasAlreadySeen = useMascotSeenSnapshot(introKey);
  useMarkMascotSeen(wasAlreadySeen ? null : introKey);
  if (!wasAlreadySeen) return getMascotLine(introKey);
  return revisitKey ? getMascotLine(revisitKey) : null;
}

// Exported for screens with a real precondition beyond plain "have they seen it" (e.g.
// TranscriptScreen/CourseSelectionScreen choosing between two mutually-exclusive intro variants,
// or checkpoint-mode branches) that still need the same anti-flicker snapshot behavior for
// whichever key they land on, without going through the two convenience wrappers above.
export { useMascotSeenSnapshot };
