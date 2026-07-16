import { useEffect, useRef, useState } from 'react';

// Palette repaint, Transcript/Course Selection batch (see CLAUDE.md) — Task 1's own "a satisfying
// animation when the GPA numbers calculate/update — a count-up effect... rather than an instant
// static update." Purely a DISPLAY-layer animation: the real GPA value (calculateUnweightedGpa/
// calculateWeightedGpa/calculate4ScaleGpa, utils/gpa.js) is computed exactly as before and passed
// in as `value` — this hook only decides what number to SHOW on any given frame while animating
// toward it, it never recomputes or rounds the real value itself.
//
// `null` (an honestly-blank GPA — no transcript entries yet, or nothing to average) is passed
// through immediately with no animation; there's no meaningful "count up to nothing."
export function useCountUp(value, durationMs = 700) {
  const [displayed, setDisplayed] = useState(value);
  // Tracks whatever's CURRENTLY on screen (updated every tick), not just the value an animation
  // started from — a real edge case this fixes: if `value` changes again while a count-up is
  // already mid-flight (e.g. two quick transcript edits), the next animation must resume from
  // wherever the display actually sits at that moment, not from a stale snapshot of whatever
  // "from" was when the FIRST animation began — otherwise a fast second edit would visibly jump
  // back before counting up again.
  const displayedRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (value == null) {
      displayedRef.current = null;
      setDisplayed(null);
      return undefined;
    }

    const from = displayedRef.current ?? value;
    if (from === value) {
      setDisplayed(value);
      return undefined;
    }

    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic — starts fast, settles gently, rather than a linear (mechanical-feeling)
      // count or a bouncy overshoot that would misleadingly suggest the NUMBER itself overshot.
      const eased = 1 - (1 - t) ** 3;
      const next = from + (value - from) * eased;
      displayedRef.current = next;
      setDisplayed(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayedRef.current = value;
        setDisplayed(value);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return displayed;
}
