import { createPortal } from 'react-dom';
import { ShoppingBag, X } from 'lucide-react';

// Course Selection: Visible Selection List + Auto-Pick Button (see CLAUDE.md), Task 1 — a real,
// persistent "shopping list" panel, shared by BOTH the Roslyn and UC Davis Course Selection
// screens rather than two independently-built copies. This REPLACES the old "Your selected
// courses (N)" chip strip that used to render inline at the very bottom of the page, well below
// the policy grid / recommendation grids / Program-Specific / School-Specific sections — a student
// had to scroll all the way down past everything just to check what they'd already picked. A
// `position: fixed` panel is genuinely visible the entire time the student is browsing/scrolling,
// with its own internal scroll region so a long list (this app's own courses.js/
// courseRecommendations.js header comments both note a merged, multi-track selection can
// legitimately run past a single year's real load) never grows the panel itself past a reasonable
// height.
//
// Deliberately renders unconditionally whenever there's at least one selection — no
// collapse/expand toggle the way `ModuleReviewWidget.jsx`'s own chat panel has, since THAT widget's
// whole point is staying out of the way until asked for; this one exists specifically to always be
// checkable at a glance while browsing, which a default-collapsed panel would undercut. Positioned
// bottom-LEFT — the opposite corner from `ModuleReviewWidget`'s own bottom-right toggle/panel (both
// render together on this exact screen), matching the same "two floating widgets get opposite
// corners so neither reads as, or visually collides with, the other" precedent that widget's own
// header comment already documents for `MapChatWidget`.
//
// `getLabel` is optional (defaults to `course.name`, Roslyn's own real display text) so the UC
// Davis variant can pass its own real `${code} — ${name}` — a small, genuine improvement over the
// bare course CODE the old inline chip strip showed there (confirmed via grep: `{course.code}` was
// the entire visible label), not a functional change either screen's behavior depends on.
//
// Rendered via `createPortal(..., document.body)`, not inline — a real, confirmed requirement, not
// a style choice, matching `ModuleReviewWidget.jsx`'s own identical fix on this exact screen:
// Course Selection is one of the screens App.jsx wraps in `.screen-transition`, whose entrance
// animation leaves a permanent (`animation-fill-mode: both`) transform on the element even after it
// finishes — any non-`none` transform on an ancestor makes it a containing block for `position:
// fixed` descendants, which would otherwise anchor this panel to that wrapper's own box instead of
// the real viewport.
export default function SelectedCoursesPanel({ courses, onRemove, getLabel }) {
  if (!courses || courses.length === 0) return null;
  const label = getLabel || ((course) => course.name);
  return createPortal(
    <div className="selected-courses-panel">
      <div className="selected-courses-header">
        <ShoppingBag size={15} />
        <span>Your Courses ({courses.length})</span>
      </div>
      <div className="selected-courses-list">
        {courses.map((course) => (
          <div className="selected-courses-row" key={course.id}>
            <span className="selected-courses-name" title={label(course)}>{label(course)}</span>
            <button
              type="button"
              className="selected-courses-remove-btn"
              onClick={() => onRemove(course.id)}
              aria-label={`Remove ${label(course)}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
