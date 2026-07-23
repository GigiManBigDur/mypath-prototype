import ChatConversation from './ChatConversation';
import ChatTaskConfirmFooter from './ChatTaskConfirmFooter';
import { useHubChat } from '../hooks/useHubChat';
import { ArrowLeft } from 'lucide-react';

// Polished Hub-to-Chat Transition + Persistent Chat History (see CLAUDE.md) — the real chat
// conversation itself, re-hosted inline in the hub instead of behind the old portaled overlay
// modal (`AiChatModal`, now retired). Per this task's own explicit scope ("container/presentation,
// not rebuilding the underlying chat logic"), every piece of the actual conversation mechanics —
// general app-help answers, task-add confirm-first, the Build-Your-Own redirect, the mascot
// speaking/voiceover hookup, the honesty guardrail already enforced server-side — is byte-for-byte
// the same as the original AiChatModal build. `messages` lives in `state.chatHistory` (AppContext),
// so the conversation now survives a close/reopen or a full reload — Task 4's own persistence
// requirement — cleared only by the hub's own Reset button, same as every other piece of state.
//
// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md) — the actual message-
// list/input-row rendering comes from the shared `ChatConversation` component (extracted here so
// Project Builder's own "Build Your Own" conversation can reuse the identical UI instead of a
// third, separate implementation).
//
// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md), Task 1 — the actual conversation
// LOGIC (send/task-confirm/date-pick/Build-Your-Own-redirect) now lives in the shared
// `useHubChat` hook, extracted here so the new `MapChatWidget.jsx` (rendered on the Academic Plan)
// reads/writes the exact same `state.chatHistory` through the exact same mechanics — this
// component keeps only what's genuinely specific to the hub's own presentation (its header, the
// "Back to Hub" button, the exit-transition class).
//
// The mascot itself is NOT rendered here — it stays put in HubScreen's own `.hub-mascot-area` so
// it visually "stays anchored" across the whole transition (Task 2). This component only reports
// the latest reply's text upward via `onAssistantReply`, so HubScreen's own `useMascotSpeech` call
// can drive the ONE shared mascot instance's speaking animation/voiceover.
export default function HubChatPanel({ onBack, exiting, onAssistantReply }) {
  const {
    chatHistory, loading, sendMessage, goToBuildYourOwn,
    pendingTask, pickingDate, dateInput, dateError,
    startPickingDate, updateDateInput, dismissPendingTask, finalizeAddTask,
  } = useHubChat(onAssistantReply);

  return (
    <div className={`hub-chat-panel${exiting ? ' hub-chat-exit' : ''}`}>
      <div className="hub-chat-header">
        <div>
          <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
          <h2 className="hub-chat-title">Ask me anything</h2>
        </div>
        <button type="button" className="hub-chat-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Hub
        </button>
      </div>

      <ChatConversation
        messages={chatHistory}
        loading={loading}
        onSend={sendMessage}
        emptyHint="Ask how something in MyPath works, what to do next, or have me add a task to your plan."
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
    </div>
  );
}
