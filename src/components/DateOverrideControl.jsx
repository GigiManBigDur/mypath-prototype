import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, X } from 'lucide-react';
import { getEffectiveToday, toDateInputValue } from '../utils/dates';

// Real-Time Tracking feature, Task 2 (see CLAUDE.md) — a small, clearly testing-only control that
// lets a tester manually set what "today" is treated as throughout the app, without waiting for
// real time to pass. Feeds `state.dateOverride` — the SAME field every "what day is it"
// computation in the app already resolves through (getEffectiveToday(), utils/dates.js) — so
// setting it here consistently affects the roadmap's own "You are here" position, deadline-passed
// opportunity checks, and the UC Davis quarter banner alike, not just this control's own display.
// Rendered as a `position: fixed` overlay by AcademicPlanScreen.jsx (a sibling of whichever
// sub-view — Map 1 or Map 2 — is active) rather than owned by either sub-view itself, so it's
// always available and consistently positioned regardless of which one is showing, and doesn't
// need to account for Map 2's own very different (full-bleed, no normal shell) layout.
//
// **Rendered via `createPortal(..., document.body)`, not inline — a real, confirmed bug, not a
// style choice.** Map 1 (`state.planYearIndex === null`) is one of the screens `App.jsx` wraps in
// `.screen-transition` (`needsTransition = ... || (screenKey === 'plan' && !isPlanDetail)`), whose
// `screen-enter` keyframe animates `transform` with `animation-fill-mode: both` — per the CSS
// spec, ANY non-`none` transform on an ancestor (including one from a still-`fill`-ing animation)
// makes that ancestor a containing block for `position: fixed` descendants. This is the exact same
// landmine already documented and fixed once for `MascotWidget` and the course detail modal —
// confirmed here too via a real `getBoundingClientRect()` check: the toggle button's own
// `bottom: 16px` resolved far below the actual viewport (rendering fully off-screen, invisible)
// instead of near the visible bottom edge. The portal escapes the ancestor entirely, same fix
// that already worked for both prior cases — Map 2 was never wrapped in `.screen-transition` to
// begin with, so the portal is a no-op there, but using it unconditionally means this component
// never has to know or care which sub-view it's currently rendered under.
export default function DateOverrideControl({ state, patch }) {
  const [open, setOpen] = useState(false);
  const active = !!state.dateOverride;
  const effectiveValue = toDateInputValue(getEffectiveToday(state.dateOverride));

  if (!open) {
    return createPortal(
      <button
        type="button"
        className={`date-override-toggle${active ? ' date-override-toggle-active' : ''}`}
        onClick={() => setOpen(true)}
        title="Testing tool — change what date the app treats as today"
      >
        <FlaskConical size={13} />
        {active ? `Testing as ${effectiveValue}` : 'Change Date (Testing)'}
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="date-override-panel">
      <div className="date-override-panel-header">
        <span><FlaskConical size={13} /> Change Date (Testing)</span>
        <button type="button" className="date-override-panel-close" onClick={() => setOpen(false)} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <p className="date-override-panel-note">
        Testing tool only — not part of the real app. Overrides what "today" means everywhere it
        matters: the roadmap's "You are here" marker, deadline-passed opportunity checks, and the
        UC Davis quarter banner all follow this date instead of the real one.
      </p>
      <label className="date-override-field">
        <span>Treat today as</span>
        <input
          type="date"
          value={effectiveValue}
          onChange={(e) => patch({ dateOverride: e.target.value || null })}
        />
      </label>
      {active && (
        <button type="button" className="date-override-reset" onClick={() => patch({ dateOverride: null })}>
          Reset to real today
        </button>
      )}
    </div>,
    document.body,
  );
}
