import { createPortal } from 'react-dom';
import { ShoppingBag, Trash2, X } from 'lucide-react';

// Course Selection: Visible Selection List + Auto-Pick Button (see CLAUDE.md), Task 1 — a real,
// persistent "shopping list" panel, originally built (and still used) by BOTH the Roslyn and UC
// Davis Course Selection screens rather than two independently-built copies. This REPLACED the old
// "Your selected courses (N)" chip strip that used to render inline at the very bottom of the page,
// well below the policy grid / recommendation grids / Program-Specific / School-Specific
// sections — a student had to scroll all the way down past everything just to check what they'd
// already picked. A `position: fixed` panel is genuinely visible the entire time the student is
// browsing/scrolling, with its own internal scroll region so a long list (this app's own
// courses.js/courseRecommendations.js header comments both note a merged, multi-track selection
// can legitimately run past a single year's real load) never grows the panel itself past a
// reasonable height.
//
// Bring Selection List, Auto-Pick, Delete-All, and Descriptions to Opportunity Finder (see
// CLAUDE.md) — this component (originally `SelectedCoursesPanel.jsx`, course-specific in both name
// and its own display text) was generalized into this genuinely shared, domain-neutral component
// once Opportunity Finder needed the identical real pattern for a completely different content
// type — the same "extract once, reuse everywhere" precedent this codebase already established for
// `ChatConversation.jsx` (shared by 4 different chat surfaces) and `TrackVisuals.jsx` (shared by
// every track-colored screen). The rename touched every real caller (both Course Selection
// variants, plus the new Opportunity Finder one) and the matching CSS class names in global.css —
// this codebase's own documented history already treats "reusing a name for something it doesn't
// literally describe" as a real, confirmed source of confusion/bugs (see the mute/voice-settings
// toggle button naming-collision fixes elsewhere in CLAUDE.md), so a genuinely shared component
// gets a genuinely neutral name rather than staying named after its first caller. `items`/
// `itemLabel` are the two new generic surfaces — `itemLabel` (e.g. `'Courses'`, `'Opportunities'`)
// only ever appears in the header's own "Your {itemLabel} (N)" text; every other prop
// (`onRemove`/`onClearAll`/`onOpenDetail`/`getLabel`) was already domain-neutral from the start.
//
// Deliberately renders unconditionally whenever there's at least one selection — no
// collapse/expand toggle the way `ModuleReviewWidget.jsx`'s own chat panel has, since THAT widget's
// whole point is staying out of the way until asked for; this one exists specifically to always be
// checkable at a glance while browsing, which a default-collapsed panel would undercut. Positioned
// bottom-LEFT — the opposite corner from `ModuleReviewWidget`'s own bottom-right toggle/panel (both
// render together on every screen this component appears on), matching the same "two floating
// widgets get opposite corners so neither reads as, or visually collides with, the other" precedent
// that widget's own header comment already documents for `MapChatWidget`.
//
// `getLabel` is optional (defaults to `item.name`, Course Selection's own real display text — the
// generic default also happens to already match Opportunity Finder's own real `opp.name` field, so
// that caller doesn't need to pass it at all) so the UC Davis course variant can pass its own real
// `${code} — ${name}` — a small, genuine improvement over the bare course CODE the old inline chip
// strip showed there, not a functional change either screen's behavior depends on.
//
// Rendered via `createPortal(..., document.body)`, not inline — a real, confirmed requirement, not
// a style choice, matching `ModuleReviewWidget.jsx`'s own identical fix on these exact screens:
// every screen this component renders on is one of the screens App.jsx wraps in
// `.screen-transition`, whose entrance animation leaves a permanent (`animation-fill-mode: both`)
// transform on the element even after it finishes — any non-`none` transform on an ancestor makes
// it a containing block for `position: fixed` descendants, which would otherwise anchor this panel
// to that wrapper's own box instead of the real viewport.
//
// Fix Auto-Pick with Real Constraints + List Enhancements (see CLAUDE.md) —
// - Task 2: `onClearAll` (optional — undefined hides the button entirely, a safe default for any
//   future caller that doesn't need this) is only ever invoked AFTER a real `window.confirm(...)`,
//   the exact same lightweight synchronous confirmation pattern this codebase already uses for its
//   other genuine "are you sure" moments (the hub's own Reset button, Roadmap.jsx's required-task
//   removal) — no accidental full clears, and no need for a bespoke two-step UI just for this one
//   action. `confirmMessage` lets each caller supply its own exact wording (a course vs. an
//   opportunity read naturally with slightly different phrasing) while keeping the SAME real
//   confirm-gated mechanism.
// - Task 3: `onOpenDetail` (optional, same "undefined = no-op" default) makes each row itself
//   clickable, reusing whatever real detail-modal state the caller already owns (the SAME state
//   the caller's own main browsing grid already opens its detail modal through) — this component
//   has no opinion on how that modal renders, only that clicking a row hands the real item object
//   up to whichever function the caller supplies. The remove button stops propagation so removing
//   an item never also opens its modal.
export default function SelectedItemsPanel({
  items, onRemove, onClearAll, onOpenDetail, getLabel, itemLabel = 'Courses', confirmMessage,
}) {
  if (!items || items.length === 0) return null;
  const label = getLabel || ((item) => item.name);

  const handleClearAll = () => {
    if (window.confirm(confirmMessage || 'Are you sure you want to remove all selected courses?')) {
      onClearAll();
    }
  };

  return createPortal(
    <div className="selected-items-panel">
      <div className="selected-items-header">
        <ShoppingBag size={15} />
        <span>Your {itemLabel} ({items.length})</span>
        {onClearAll && (
          <button type="button" className="selected-items-clear-btn" onClick={handleClearAll}>
            <Trash2 size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="selected-items-list">
        {items.map((item) => {
          const clickable = !!onOpenDetail;
          return (
            <div
              className={`selected-items-row${clickable ? ' selected-items-row-clickable' : ''}`}
              key={item.id}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onOpenDetail(item) : undefined}
              onKeyDown={clickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(item); }
              } : undefined}
            >
              <span className="selected-items-name" title={label(item)}>{label(item)}</span>
              <button
                type="button"
                className="selected-items-remove-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                aria-label={`Remove ${label(item)}`}
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
