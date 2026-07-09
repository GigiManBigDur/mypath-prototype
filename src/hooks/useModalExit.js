import { useEffect, useRef, useState } from 'react';

// Lets a modal/overlay play a real exit animation instead of vanishing the instant its `isOpen`
// prop flips false — React unmounts on a conditional immediately, before any CSS transition can
// run, so the DOM node has to stay mounted a little longer while a `closing` class plays out.
// `rendered` tells the caller whether to render anything at all; `closing` tells it which class
// to add. Purely presentational — doesn't touch any app state.
export function useModalExit(isOpen, durationMs = 180) {
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, durationMs);
    }
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return { rendered, closing };
}
