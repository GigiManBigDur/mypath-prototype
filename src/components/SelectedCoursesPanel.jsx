import { createPortal } from 'react-dom';
import { ShoppingBag, Trash2, X } from 'lucide-react';

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
//
// Fix Auto-Pick with Real Constraints + List Enhancements (see CLAUDE.md) —
// - Task 2: `onClearAll` (optional — undefined hides the button entirely, a safe default for any
//   future caller that doesn't need this) is only ever invoked AFTER a real `window.confirm(...)`,
//   the exact same lightweight synchronous confirmation pattern this codebase already uses for its
//   other genuine "are you sure" moments (the hub's own Reset button, Roadmap.jsx's required-task
//   removal) — no accidental full clears, and no need for a bespoke two-step UI just for this one
//   action.
// - Task 3: `onOpenDetail` (optional, same "undefined = no-op" default) makes each row itself
//   clickable, reusing whatever real detail-modal state the caller already owns
//   (`setSelectedCourseDetail`, the SAME state this screen's own main catalog grid already opens
//   its detail modal through) — this component has no opinion on how that modal renders, only that
//   clicking a row hands the real course object up to whichever function the caller supplies. The
//   remove button stops propagation so removing a course never also opens its modal.
export default function SelectedCoursesPanel({ courses, onRemove, onClearAll, onOpenDetail, getLabel }) {
  if (!courses || courses.length === 0) return null;
  const label = getLabel || ((course) => course.name);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to remove all selected courses?')) {
      onClearAll();
    }
  };

  return createPortal(
    <div className="selected-courses-panel">
      <div className="selected-courses-header">
        <ShoppingBag size={15} />
        <span>Your Courses ({courses.length})</span>
        {onClearAll && (
          <button type="button" className="selected-courses-clear-btn" onClick={handleClearAll}>
            <Trash2 size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="selected-courses-list">
        {courses.map((course) => {
          const clickable = !!onOpenDetail;
          return (
            <div
              className={`selected-courses-row${clickable ? ' selected-courses-row-clickable' : ''}`}
              key={course.id}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onOpenDetail(course) : undefined}
              onKeyDown={clickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(course); }
              } : undefined}
            >
              <span className="selected-courses-name" title={label(course)}>{label(course)}</span>
              <button
                type="button"
                className="selected-courses-remove-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(course.id); }}
                aria-label={`Remove ${label(course)}`}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
