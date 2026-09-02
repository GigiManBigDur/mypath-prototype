import ChatConversation from './ChatConversation';
import ChatTaskConfirmFooter from './ChatTaskConfirmFooter';
import NarrativeReviewFooter from './NarrativeReviewFooter';
import TranscriptPauseFooter from './TranscriptPauseFooter';
import EcHandoffFooter from './EcHandoffFooter';
import { useHubChat } from '../hooks/useHubChat';
import { useNarrativeSession } from '../hooks/useNarrativeSession';

// Multi-Session Chat (see CLAUDE.md) — the one shared conversation body both `HubChatPanel.jsx`
// (the hub's own panel, with the real session-tab switcher) and `MapChatWidget.jsx` (the small
// Academic Plan widget, which has no switcher of its own and just mirrors whatever's active)
// render for a given `sessionId`, instead of each independently calling `useHubChat()`/rendering
// its own near-identical `ChatConversation` block.
//
// `sessionId === 'narrative'` is the one reserved pseudo-id representing the original interests/
// narrative/strategy conversation (backed by `state.onboardingChatHistory`, via
// `useNarrativeSession()` — see that hook's own header comment); every other id is a real entry in
// `state.chatSessions`, resolved via `useHubChat(sessionId)`. Redirect-to-Build-Your-Own JSX and
// the task-add confirm footer are identical to what `HubChatPanel.jsx`/`MapChatWidget.jsx` already
// rendered inline before this component existed.
//
// IMPORTANT: every caller MUST render this with `key={sessionId}` at the call site
// (`<ChatSessionView key={sessionId} sessionId={sessionId} ... />`). Without that key, a single
// mounted instance would call a DIFFERENT hook (`useNarrativeSession()` vs. `useHubChat(sessionId)`)
// between renders whenever `sessionId` changes underneath it — a real Rules-of-Hooks violation.
// The `key` forces a full remount on every session switch instead, which also means each session
// gets a clean, non-leaking input box for free (no stale draft text from a different session
// bleeding through `ChatConversation`'s own local `inputValue` state).
export default function ChatSessionView({ sessionId, emptyHint }) {
  if (sessionId === 'narrative') {
    return <NarrativeChatBody />;
  }
  return <GeneralChatBody sessionId={sessionId} emptyHint={emptyHint} />;
}

function NarrativeChatBody() {
  const {
    chatHistory, loading, sendMessage, editMessage, showReview, latestReadyOverview, confirmNarrative, dismissReview,
    showTranscriptPause, beginTranscriptPause, showEcHandoff, beginEcHandoff,
  } = useNarrativeSession();
  // Implement the Corrected Flow Order (see CLAUDE.md) — bug fix: this footer used to only ever
  // render inside OnboardingConversationScreen.jsx's own inline JSX, not here, so a student who
  // reached the hub without acting on the transcript-pause hand-off (its own footer never forces a
  // decision) and then reopened "Our Conversation" from the hub's own chat panel would see no way
  // to trigger it from that entry point — a real gap in "one continuous thread regardless of entry
  // point," the exact principle this whole feature is built around. Same precedence as that
  // screen's own footer (Guarantee the Transcript & GPA Trigger, see CLAUDE.md — the EC hand-off
  // footer needs the identical treatment, for the identical reason): the transcript hand-off takes
  // priority over the EC hand-off, which takes priority over the narrative-overview review, when
  // more than one happens to be pending at once.
  return (
    <ChatConversation
      messages={chatHistory}
      loading={loading}
      onSend={sendMessage}
      onEditMessage={editMessage}
      placeholder="Tell me what's on your mind…"
      footer={showTranscriptPause ? (
        <TranscriptPauseFooter onBegin={beginTranscriptPause} />
      ) : showEcHandoff ? (
        <EcHandoffFooter onBegin={beginEcHandoff} />
      ) : showReview ? (
        <NarrativeReviewFooter latestReadyOverview={latestReadyOverview} onConfirm={confirmNarrative} onDismiss={dismissReview} />
      ) : null}
    />
  );
}

function GeneralChatBody({ sessionId, emptyHint }) {
  const {
    chatHistory, loading, sendMessage, editMessage, goToBuildYourOwn,
    pendingTask, pickingDate, dateInput, dateError,
    startPickingDate, updateDateInput, dismissPendingTask, finalizeAddTask,
  } = useHubChat(sessionId);

  return (
    <ChatConversation
      messages={chatHistory}
      loading={loading}
      onSend={sendMessage}
      onEditMessage={editMessage}
      emptyHint={emptyHint}
      renderMessageExtra={(m) => m.intent === 'redirect_build_your_own' && (
        <div className="chat-redirect-action">
          <button type="button" className="btn btn-primary" onClick={goToBuildYourOwn}>Go to Project Builder</button>
        </div>
      )}
      footer={(
        <ChatTaskConfirmFooter
          pendingTask={pendingTask}
          pickingDate={pickingDate}
          dateInput={dateInput}
          dateError={dateError}
          onStartPickingDate={startPickingDate}
          onDateChange={updateDateInput}
          onDismiss={dismissPendingTask}
          onConfirm={finalizeAddTask}
        />
      )}
    />
  );
}
