import { useEffect, useState } from 'react';

const TICK_INTERVAL_MS = 60_000;

// Real-Time Tracking feature (see CLAUDE.md) — a cheap re-render trigger so date-dependent
// content (the roadmap's "You are here" position, which year Map 1 treats as current, etc.)
// naturally advances as real time passes, without requiring the user to touch anything. Checked
// once a minute, which is more than enough granularity for content positioned at day-level
// resolution — no reason to tick every second for this. Purely a local re-render nudge: it
// doesn't touch AppContext/localStorage at all, so it can't trigger the kind of redundant
// persistence writes AppContext's own mount-skip guard exists to avoid. Callers add the returned
// value to a `useMemo`'s own dependency array wherever "today" needs to stay live.
export default function useRealTimeTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return tick;
}
