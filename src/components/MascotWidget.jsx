import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MascotIcon from './MascotIcon';

// Dashboard/Guide feature, Stage 5 — the in-flow mascot widget, appearing on every real screen
// after the hub (not the hub itself, which already has its own larger mascot + pointer + greeting
// from Stages 2/4). Purely presentational: the CALLER (each screen) is responsible for resolving
// which dialogue text is currently relevant (its own key-sequence logic, reading real progress
// state) and for calling `useMarkMascotSeen` on whatever key it resolved — this component only
// renders `text` and handles the dismiss interaction, nothing else.
//
// `text` may be `null` (nothing currently relevant to say — e.g. every intro for this screen has
// already been seen and no revisit line is defined) — the component renders nothing in that case
// rather than an empty bubble.
//
// Deliberately NOT rendered on `welcome`/`signup`/`hub` — `welcome` and `signup` come before the
// mascot has anything contextual to say yet, and `hub` already has its own dedicated, larger
// mascot presence (Stages 2-4) that this smaller corner widget would visually duplicate.
//
// Rendered via `createPortal(..., document.body)`, NOT inline — this is a real, confirmed bug fix,
// not a style preference. Every pre-Plan screen this widget appears on is wrapped by App.jsx's
// `.screen-transition` div, whose `screen-enter` keyframe animates `transform: translateY(...)`
// with `animation-fill-mode: both`; per the CSS spec, ANY non-`none` transform on an ancestor
// (including one supplied by a still-`fill`-ing animation) makes that ancestor a containing block
// for `position: fixed` descendants. This is the exact same landmine already documented and fixed
// once in this codebase for the course detail modal (see CourseSelectionScreen.jsx / CLAUDE.md) —
// confirmed directly here too: `.mascot-widget`'s own `left: 20px` measured via
// `getBoundingClientRect()` resolved to x≈280 instead of x≈20 (offset by `.screen-transition`'s
// own centered `.app-shell` position), which is what let the widget's real, visible dismiss
// button silently land on top of and intercept clicks meant for SurveyScreen's own "High School"
// pill underneath — caught directly via Playwright, not assumed. The portal escapes that ancestor
// entirely, the same fix that already worked for the modal.
export default function MascotWidget({ text }) {
  const [dismissed, setDismissed] = useState(false);

  // A NEW piece of dialogue (the `text` prop changing — including from null to a real line, or
  // from one real line to the next) always starts undismissed. Dismissing one line only ever
  // hides THAT line; it never permanently silences the widget for the rest of the screen.
  useEffect(() => {
    setDismissed(false);
  }, [text]);

  if (!text || dismissed) return null;

  return createPortal(
    <div className="mascot-widget">
      <button
        type="button"
        className="mascot-widget-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
      <MascotIcon size={52} />
      <p className="mascot-widget-text">{text}</p>
    </div>,
    document.body,
  );
}
