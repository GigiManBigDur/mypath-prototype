import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';

// Multi-Session Chat (see CLAUDE.md) — manages ONLY the list of general sessions and which
// session ("Ask MyPath AI anything") is currently active; it has no opinion on any one session's
// own conversation mechanics (that's `useHubChat(sessionId)` for a general session, or
// `useNarrativeSession()` for the reserved `'narrative'` pseudo-session — see `ChatSessionView.jsx`,
// which is the one place both are read together). The narrative session is deliberately NOT a
// real entry in `state.chatSessions` at all — it's a fixed, hard-coded, always-first id backed by
// the separate `state.onboardingChatHistory` field, so it's represented here only as the reserved
// string `'narrative'`, never as an object in `sessions`.
export function useChatSessions() {
  const { state, patch } = useApp();
  const sessions = state.chatSessions || [];
  const activeSessionId = state.activeChatSessionId || 'narrative';

  const setActiveSessionId = (id) => patch({ activeChatSessionId: id });

  const createSession = () => {
    const session = { id: makeTaskId('chat-session'), kind: 'general', title: 'New Chat', history: [] };
    patch({ chatSessions: [...sessions, session], activeChatSessionId: session.id });
  };

  // Only ever called on a real general session (the narrative session has no delete control in
  // the UI — it's pinned) — falls back to the narrative session if the one being deleted was
  // active, since it always exists and is a sensible, always-available default to land on.
  const deleteSession = (id) => {
    const next = sessions.filter((s) => s.id !== id);
    patch({
      chatSessions: next,
      activeChatSessionId: activeSessionId === id ? 'narrative' : activeSessionId,
    });
  };

  return { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession };
}
