import { ArrowLeft, Plus, X } from 'lucide-react';
import ChatSessionView from './ChatSessionView';
import { useChatSessions } from '../hooks/useChatSessions';

// Polished Hub-to-Chat Transition + Persistent Chat History (see CLAUDE.md) — the real chat
// conversation itself, re-hosted inline in the hub instead of behind the old portaled overlay
// modal (`AiChatModal`, now retired). Per this task's own explicit scope ("container/presentation,
// not rebuilding the underlying chat logic"), every piece of the actual conversation mechanics —
// general app-help answers, task-add confirm-first, the Build-Your-Own redirect, the mascot
// speaking/voiceover hookup, the honesty guardrail already enforced server-side — is byte-for-byte
// the same as the original AiChatModal build.
//
// Multi-Session Chat (see CLAUDE.md) — "Ask MyPath AI anything" is now a real multi-session
// system, matching tools like ChatGPT/Claude.ai: a horizontal, scrollable row of session tabs sits
// above the existing header. The pinned "Our Conversation" tab (the reserved `'narrative'`
// pseudo-session, backed by `state.onboardingChatHistory` — see `useNarrativeSession.js`) is
// always first and has no delete control; every general session (`state.chatSessions`, via
// `useChatSessions()`) gets its own tab with a small `×` to delete it (gated behind a
// confirmation, matching this app's own established destructive-action pattern), plus a trailing
// "+ New Chat" button. The actual conversation body for whichever tab is active is rendered by the
// one shared `ChatSessionView` — this component only owns the tab row, header, and back button.
// A horizontal tab row (rather than a vertical sidebar) was chosen deliberately: `.hub-chat-panel`
// is `width: min(94%, 620px)` and already collapses to a static full-width grid row at
// `max-width: 980px`, so a sidebar would fight for space inside that width and need its own
// separate responsive treatment; a horizontal row reuses the panel's existing width at every
// breakpoint with one new CSS block.
//
// The mascot itself is NOT rendered here — it stays put in HubScreen's own `.hub-mascot-area` so
// it visually "stays anchored" across the whole transition (Task 2).
export default function HubChatPanel({ onBack, exiting }) {
  const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession } = useChatSessions();

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat?')) deleteSession(id);
  };

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

      <div className="hub-chat-session-tabs">
        <button
          type="button"
          className={`hub-chat-session-tab hub-chat-session-tab-pinned${activeSessionId === 'narrative' ? ' active' : ''}`}
          onClick={() => setActiveSessionId('narrative')}
        >
          Our Conversation
        </button>
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`hub-chat-session-tab${activeSessionId === s.id ? ' active' : ''}`}
            onClick={() => setActiveSessionId(s.id)}
            title={s.title}
          >
            <span className="hub-chat-session-tab-label">{s.title}</span>
            <span
              role="button"
              tabIndex={0}
              className="hub-chat-session-tab-delete"
              onClick={(e) => handleDelete(e, s.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e, s.id); }}
              aria-label={`Delete ${s.title}`}
            >
              <X size={12} />
            </span>
          </button>
        ))}
        <button type="button" className="hub-chat-session-new-btn" onClick={createSession}>
          <Plus size={14} /> New Chat
        </button>
      </div>

      <ChatSessionView
        key={activeSessionId}
        sessionId={activeSessionId}
        emptyHint="Ask how something in MyPath works, what to do next, or have me add a task to your plan."
      />
    </div>
  );
}
