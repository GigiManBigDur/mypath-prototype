import { useEffect, useState } from 'react';

// Extracted from WelcomeScreen.jsx (identical behavior) so Roadmap.jsx can reuse the same
// prefers-reduced-motion check for its own entrance/zoom animations instead of duplicating it.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(query).matches
  ));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
