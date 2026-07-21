import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MascotIcon from './MascotIcon';
import { useApp } from '../context/AppContext';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { makeTaskId } from '../utils/ids';

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
export default function MascotWidget({ text }) {
  const { state, patch } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const suggestion = state.pendingSuggestion;
  const effectiveText = suggestion
    ? `${suggestion.rationale} Want to add "${suggestion.title}" to your plan?`
    : text;

  // A NEW piece of dialogue (the `text` prop changing — including from null to a real line, or
  // from one real line to the next, OR a suggestion appearing/resolving) always starts
  // undismissed. Dismissing one line only ever hides THAT line; it never permanently silences the
  // widget for the rest of the screen.
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

  if (!effectiveText || dismissed) return null;

  // Task 4 — Accept either appends a real, permanent STANDALONE roadmap task (its own
  // `category: 'ai-suggested'` spine item, see roadmapGenerator.js/Roadmap.jsx), or — Fix: AI
  // Suggestions Related to Existing Chains (see CLAUDE.md) — if `suggestion.chainOpportunityId`
  // is set (this suggestion was resolved against a real existing chain by suggestionResolver.js),
  // appends it to `aiChainInsertions[opportunityId]` instead, so roadmapGenerator.js splices it
  // into that opportunity's own chain as one more dated step rather than a disconnected standalone
  // one. `suggestion.date` was already computed and validated at resolve time either way — this
  // handler never picks or checks a date itself. "Not now" just clears the pending suggestion with
  // nothing added. Neither branch ever touches `suggestionSourceTaskIds` — that was already set
  // the moment the request was triggered (see Roadmap.jsx's `maybeTriggerSuggestion`), which is
  // what actually prevents an immediate re-suggestion for the same source task, not anything
  // decided here.
  const acceptSuggestion = () => {
    if (suggestion.chainOpportunityId) {
      const existing = state.aiChainInsertions || {};
      const forOpportunity = existing[suggestion.chainOpportunityId] || [];
      patch({
        aiChainInsertions: {
          ...existing,
          [suggestion.chainOpportunityId]: [...forOpportunity, {
            id: makeTaskId('ai-chain-step'),
            title: suggestion.title,
            date: suggestion.date,
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
        date: suggestion.date,
        desc: suggestion.rationale,
        sourceTaskId: suggestion.sourceTaskId,
      }],
      pendingSuggestion: null,
    });
  };
  const dismissSuggestion = () => patch({ pendingSuggestion: null });

  return createPortal(
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
        {suggestion && (
          <div className="mascot-suggestion-actions">
            <button type="button" className="mascot-suggestion-accept" onClick={acceptSuggestion}>Accept</button>
            <button type="button" className="mascot-suggestion-dismiss" onClick={dismissSuggestion}>Not now</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
