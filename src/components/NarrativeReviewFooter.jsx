import { Rocket } from 'lucide-react';

// Multi-Session Chat (see CLAUDE.md) — extracted verbatim out of
// `OnboardingConversationScreen.jsx`'s own inline chat `footer` JSX, so `ChatSessionView.jsx` can
// render the identical review/confirm UI for the narrative session no matter where it's opened
// from (the original pre-hub first-time screen, or the "Our Conversation" tab inside "Ask MyPath
// AI anything"). Purely presentational — every prop comes straight from `useNarrativeSession`'s
// own return value at the call site.
export default function NarrativeReviewFooter({ latestReadyOverview, onConfirm, onDismiss }) {
  return (
    <div className="chat-task-confirm">
      <p>
        <strong>{latestReadyOverview.narrativeTitle}</strong> — {latestReadyOverview.overviewPhaseTitles.length} phases developed
        from your conversation so far.
      </p>
      <p>{latestReadyOverview.narrativeSummary}</p>
      <ol className="chat-task-confirm-list">
        {latestReadyOverview.overviewPhaseTitles.map((title, i) => (
          <li key={title}>
            {latestReadyOverview.phaseDimensions?.[i] === 'summer' && <span className="onboarding-phase-summer-tag">Summer</span>}
            {title}
          </li>
        ))}
      </ol>
      {/* Expand the Multi-Year Overview (see CLAUDE.md), Task 1 — shown here too, not just on the
          later My Narrative screen, so the student sees this real, distinctive candidate at the
          moment they confirm the whole plan. */}
      {latestReadyOverview.capstoneIdea && (
        <p className="onboarding-capstone-preview">
          <strong>Capstone idea:</strong> {latestReadyOverview.capstoneIdea}
        </p>
      )}
      {/* Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") — a
          compact confirmation that the 4 newly-mandatory dimensions are genuinely present, not
          just the project arc/summers — full text for each lives on the spacious My Narrative
          screen once confirmed, not crammed into this already-dense review card. */}
      {(latestReadyOverview.courseGuidanceNote || latestReadyOverview.testingTimelineNote
        || latestReadyOverview.collegeListNote || latestReadyOverview.essayMaterialNote) && (
        <p className="onboarding-dimensions-covered">
          Also covers: course rigor, testing timeline, college list, and essay material —
          all tied to this same direction.
        </p>
      )}
      <div className="task-form-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          <Rocket size={14} /> Confirm My Plan
        </button>
        {/* Task 4's own "reject and keep refining" option, the same real, visible second action
            Build Your Own's identical review footer already offers (see BuildYourOwnView,
            ProjectBuilderScreen.jsx) — only hides THIS review; nothing in chatHistory/
            readyForOverview/the proposed phases is touched, so the conversation (and its input,
            already always visible) is immediately ready for more discussion. */}
        <button type="button" className="btn btn-ghost" onClick={onDismiss}>
          Not quite right — keep refining
        </button>
      </div>
    </div>
  );
}
