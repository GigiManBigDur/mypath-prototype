import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MascotIcon from './MascotIcon';
import { useApp } from '../context/AppContext';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { makeTaskId } from '../utils/ids';
import { parseDateInputValue, formatDateWithYear } from '../utils/dates';
import { chainExistsFor, findChainAnchor } from '../utils/suggestionResolver';

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
// AI Personalization, Stage 2 (see CLAUDE.md) — `state.pendingSuggestion`, when present, takes
// over this widget entirely, OVERRIDING whatever contextual `text` the calling screen passed in.
// This is deliberate: a suggestion can be triggered from Roadmap.jsx (Map 2) but the student may
// navigate elsewhere before it resolves, and "no calling screen needs to know or care about
// suggestions" only holds if the widget itself is what decides suggestion-vs-normal-dialogue
// priority, reading `state` directly the same way it already does for `voiceMuted`. This is also
// why Roadmap.jsx now renders `<MascotWidget text={null} />` for the first time — Map 2
// deliberately has no OTHER in-flow dialogue (see CLAUDE.md's own Stage 5 section), but a pending
// suggestion still needs somewhere to surface while the student is right there having just
// triggered it.
// Improve the AI "Thinking" Indicator (see CLAUDE.md), Task 2 — `thinking` (default `false`, only
// ever passed `true` by Roadmap.jsx while its own Stage 2 suggestion request is in flight) closes
// a real gap: previously nothing here indicated a suggestion request was even happening between
// it firing and its `onResult`/`onError`. When true and there's no real dialogue/suggestion text
// to show yet, this renders a small thinking-only bubble (the same animated mascot every chat
// surface now uses) instead of returning null — the moment `effectiveText` becomes real (the
// suggestion arrives, or fails and the caller flips `thinking` back to false), the normal
// dialogue/suggestion rendering below takes back over, unchanged.
export default function MascotWidget({ text, thinking = false }) {
  const { state, patch } = useApp();
  const [dismissed, setDismissed] = useState(false);

  // Fix: Replace Automatic Date Computation with a Manual, Constrained Date Step (see CLAUDE.md),
  // Task 1 — a second sub-view entered once the student clicks Accept: a date picker asking "When
  // should this happen?" instead of the app silently computing a date itself. Local, ephemeral UI
  // state (not persisted) — matching this app's own "buffer locally, commit once" convention
  // elsewhere (AddTaskModal, etc.).
  //
  // Fix: Fix Calendar Positioning (see CLAUDE.md) — this step is now rendered as its own real,
  // centered `.overlay`/`.modal` (portaled, same shared classes/CSS `AddTaskModal`/Roadmap.jsx's
  // own detail modal already use) instead of a small `<input type="date">` embedded inside the
  // corner `.mascot-widget` bubble. That embedded version was the actual bug: `.mascot-widget` is
  // pinned near the BOTTOM of the viewport (`.mascot-widget { position: fixed; bottom: ... }`), so
  // a date input sitting inside it had little to no room below for the browser's own native
  // calendar popup to render into — confirmed directly via `getBoundingClientRect()` that the
  // input's own bottom edge routinely sat within ~40-60px of the real viewport bottom, nowhere
  // near enough room for a native date-picker popup (which several browsers render as tall as
  // ~300px) to fit without being clipped below the fold. `.overlay`'s own CSS (`position: fixed;
  // inset: 0; display:flex; align-items:center; justify-content:center;`) plus `.modal`'s own
  // `max-height: 85vh; overflow-y: auto;` are what actually guarantee full visibility now,
  // regardless of viewport size or scroll position — not a fix specific to this one input.
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);

  const suggestion = state.pendingSuggestion;
  const effectiveText = suggestion
    ? pickingDate
      ? `When should "${suggestion.title}" happen?`
      : `${suggestion.rationale} Want to add "${suggestion.title}" to your plan?`
    : text;

  // A genuinely NEW suggestion (a different sourceTaskId, including one replacing another, or the
  // pending suggestion clearing entirely) always resets the date-picker sub-view back to its
  // starting point — a leftover picked date/error from a PREVIOUS suggestion should never bleed
  // into the next one.
  useEffect(() => {
    setPickingDate(false);
    setDateInput('');
    setDateError(null);
  }, [suggestion?.sourceTaskId]);

  // A NEW piece of dialogue (the `text` prop changing — including from null to a real line, or
  // from one real line to the next, OR a suggestion appearing/resolving/moving into its
  // date-picker step) always starts undismissed. Dismissing one line only ever hides THAT line; it
  // never permanently silences the widget for the rest of the screen.
  useEffect(() => {
    setDismissed(false);
  }, [effectiveText]);

  // Dashboard/Guide feature, Stage 6, now running on ElevenLabs Voice (see CLAUDE.md) — speaks
  // `effectiveText` aloud alongside it appearing. Passing `null` once dismissed (rather than the
  // raw text) is what makes "dismissing stops the speech immediately" work for free: from
  // useMascotSpeech's own perspective, a dismiss is just an ordinary "the current line went away"
  // change, handled by the exact same effect that also stops audio when a screen navigates away or
  // the line is genuinely replaced.
  useMascotSpeech(!dismissed ? effectiveText : null, state.voiceMuted);

  // Improve the AI "Thinking" Indicator (see CLAUDE.md), Task 2 — a thinking-only bubble (no real
  // text yet, nothing to dismiss) renders BEFORE the normal `!effectiveText` early-return below
  // would otherwise make this whole component invisible. Not portaled through the same dismiss/
  // speech machinery below on purpose — this state is transient by design (the same maxDuration
  // fix that already bounds every other AI request bounds this one too) and has nothing real to
  // act on yet.
  if (thinking && !effectiveText) {
    return createPortal(
      <div className="mascot-widget">
        <MascotIcon size={52} thinking />
        <div className="mascot-widget-bubble">
          <p className="mascot-widget-text">Thinking of something based on what you just did&hellip;</p>
        </div>
      </div>,
      document.body,
    );
  }

  if (!effectiveText || dismissed) return null;

  // Fix: Properly Diagnose the Persistent Chain-Attachment Bug (see CLAUDE.md) — root cause,
  // confirmed by reproducing it against the real chain data before this fix: `confirmDate` used
  // to check the picked date ONLY against `suggestion.triggerTaskDate` (the date of whatever task
  // the student just completed). But the AI can relate a suggestion to ANY existing chain, not
  // just the one containing the trigger task — so a date that's genuinely after the trigger task
  // could still land BEFORE the target chain's own real first step. `buildFirstYearChain`
  // (roadmapGenerator.js) merges every step into one array and re-sorts by date, promoting
  // WHICHEVER STEP SORTS EARLIEST onto the spine as the chain's anchor — with no protection against
  // a newly-inserted step displacing the chain's real first step. A date that passed the old
  // "after the trigger task" check alone could still sort earliest, silently promoting the
  // ai-suggested step onto the spine (and demoting the chain's real first step into the branch)
  // instead of landing in the branch itself. Fixed by ALSO checking the picked date against the
  // target chain's own CURRENT anchor date (`findChainAnchor`, suggestionResolver.js) whenever
  // `relatedOpportunityId` resolves to a real chain — guaranteeing a confirmed date can never sort
  // earlier than that chain's real first step, so it can never become the new anchor.
  const confirmDate = () => {
    if (!dateInput) { setDateError('Pick a date to continue.'); return; }
    const picked = parseDateInputValue(dateInput);

    const triggerDate = suggestion.triggerTaskDate ? parseDateInputValue(suggestion.triggerTaskDate) : null;
    if (triggerDate && picked.getTime() <= triggerDate.getTime()) {
      setDateError(`This needs to be after ${suggestion.triggerTaskTitle || 'the task you just completed'}'s date (${formatDateWithYear(triggerDate)}).`);
      return;
    }

    if (suggestion.relatedOpportunityId) {
      const anchor = findChainAnchor(state, suggestion.relatedOpportunityId);
      if (anchor && picked.getTime() <= anchor.date.getTime()) {
        setDateError(`This needs to be after ${anchor.title}'s date (${formatDateWithYear(anchor.date)}), so it attaches after that chain's own first step.`);
        return;
      }
    }

    commitSuggestion(dateInput);
  };

  // Task 3/4 — Task 3: still identify and attach to an existing chain when one applies, so this
  // is never treated as a plain new custom task; `chainExistsFor` (suggestionResolver.js)
  // re-checks against the LIVE roadmap (an opportunity referenced when the suggestion was first
  // generated could have since been removed from the plan) rather than trusting the model's own
  // `relatedOpportunityId` blindly. If it resolves, this appends to `aiChainInsertions[opportunityId]`
  // — roadmapGenerator.js splices it into that opportunity's own existing chain as one more dated
  // step (sorted into place alongside its real neighbors, and — as of the fix above — always dated
  // after that chain's own current anchor, so it lands in the branch, never on the spine). Task 4
  // — if no chain is identified (null, or one that no longer resolves), this instead appends a
  // real, permanent STANDALONE roadmap task (its own `category: 'ai-suggested'` spine item,
  // unchanged fallback behavior). Neither branch ever touches `suggestionSourceTaskIds` — that was
  // already set the moment the request was triggered (see Roadmap.jsx's `maybeTriggerSuggestion`),
  // which is what actually prevents an immediate re-suggestion for the same source task, not
  // anything decided here.
  const commitSuggestion = (date) => {
    if (suggestion.relatedOpportunityId && chainExistsFor(state, suggestion.relatedOpportunityId)) {
      const existing = state.aiChainInsertions || {};
      const forOpportunity = existing[suggestion.relatedOpportunityId] || [];
      patch({
        aiChainInsertions: {
          ...existing,
          [suggestion.relatedOpportunityId]: [...forOpportunity, {
            id: makeTaskId('ai-chain-step'),
            title: suggestion.title,
            date,
            desc: suggestion.rationale,
          }],
        },
        pendingSuggestion: null,
      });
      return;
    }
    patch({
      aiSuggestedTasks: [...(state.aiSuggestedTasks || []), {
        id: makeTaskId('ai-suggestion'),
        title: suggestion.title,
        date,
        desc: suggestion.rationale,
        sourceTaskId: suggestion.sourceTaskId,
      }],
      pendingSuggestion: null,
    });
  };
  const dismissSuggestion = () => patch({ pendingSuggestion: null });

  return (
    <>
      {createPortal(
        <div className="mascot-widget">
          <button
            type="button"
            className="mascot-widget-dismiss"
            onClick={() => (suggestion ? dismissSuggestion() : setDismissed(true))}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
          <MascotIcon size={52} />
          <div className="mascot-widget-bubble">
            <p className="mascot-widget-text">{effectiveText}</p>
            {suggestion && !pickingDate && (
              <div className="mascot-suggestion-actions">
                <button type="button" className="mascot-suggestion-accept" onClick={() => setPickingDate(true)}>Accept</button>
                <button type="button" className="mascot-suggestion-dismiss" onClick={dismissSuggestion}>Not now</button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
      {suggestion && pickingDate && createPortal(
        <div className="overlay" onClick={dismissSuggestion}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={dismissSuggestion} aria-label="Cancel"><X size={18} /></button>
            <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)' }}>AI Suggestion</div>
            <h2 className="modal-title">When should this happen?</h2>
            <label className="task-form-field">
              <span className="label">Date</span>
              <input
                type="date"
                autoFocus
                value={dateInput}
                onChange={(e) => { setDateInput(e.target.value); setDateError(null); }}
              />
            </label>
            {dateError && <p className="mascot-suggestion-date-error">{dateError}</p>}
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={dismissSuggestion}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={confirmDate} disabled={!dateInput}>Confirm</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
