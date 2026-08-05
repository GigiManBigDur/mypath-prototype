import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestChatReply } from '../utils/chatRequest';
import { makeTaskId } from '../utils/ids';
import { getEffectiveToday, parseDateInputValue } from '../utils/dates';

// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md), Task 1 — the actual chat LOGIC,
// extracted out of `HubChatPanel.jsx` (previously the only caller) into this shared hook, so a
// second, smaller entry point (`MapChatWidget.jsx`, rendered on the Academic Plan) reads from and
// writes to the same underlying conversation mechanics — not a second, independently-built
// implementation of the same conversation. Every caller gets: the persisted conversation, a
// loading flag, `sendMessage`, `editMessage`, the task-add confirm-then-date-pick flow, and the
// Build-Your-Own redirect action.
//
// Multi-Session Chat (see CLAUDE.md) — this hook is now scoped to ONE general session at a time,
// identified by the required `sessionId` argument, rather than the single flat `state.chatHistory`
// it used to read/write directly. `state.chatSessions` (AppContext.jsx) is the real array of
// `{ id, kind: 'general', title, history }` objects this hook resolves `sessionId` against — every
// read/write below goes through it instead. `useChatSessions()` (a separate hook) is what manages
// the LIST itself (create/delete/switch); this hook only ever touches the ONE session it's given.
//
// Opt-In Voice Per Message in Chat + Editable Messages (see CLAUDE.md) — Task 1 removed the old
// `onAssistantReply` callback entirely: this hook used to call it on every new reply specifically
// to auto-trigger the mascot's speech (`setChatSpeakingText` in HubScreen.jsx/MapChatWidget.jsx);
// voice is now opt-in per message instead, via a Play button `ChatConversation.jsx` renders
// directly under each assistant bubble — this hook no longer has any opinion on speech at all.
export function useHubChat(sessionId) {
  const { state, patch } = useApp();
  const sessions = state.chatSessions || [];
  const chatHistory = sessions.find((s) => s.id === sessionId)?.history || [];
  const [loading, setLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);

  // Shared by both a normal send (from the full current history) and an edit-and-resubmit (from
  // history truncated to just before the edited message) — see `editMessage` below.
  //
  // A real, confirmed race was found and fixed here: writing this session's history happens
  // TWICE per send — once synchronously (the user's own message) and once later, asynchronously,
  // once the reply arrives. Re-deriving `(state.chatSessions || []).map(...)` fresh at EACH of
  // those two call sites (the original implementation) meant the SECOND write recomputed the
  // "every other session, untouched" list from the exact same closed-over `state` the FIRST write
  // also read — since `state` here is a snapshot from the render this hook call started in, not a
  // live ref, it never reflects the first write's own already-applied change by the time the
  // second (async) write runs. Concretely: the first write correctly set a real auto-derived
  // title alongside the new history; the second write, re-deriving from that same stale
  // snapshot, silently overwrote the WHOLE session object back to its pre-title state, complete
  // history included — since `patch()`'s functional `setState` merges against the latest state at
  // the KEY level (`chatSessions` as a whole), not down inside the array, a later write's own
  // freshly-computed replacement array wins entirely, title and all. Fixed by capturing
  // `otherSessions`/`baseSession`/`title` ONCE, up front, and having every later write in this
  // same `sendFrom` call rebuild from that one captured base instead of re-reading `state` again.
  const sendFrom = (baseHistory, trimmed) => {
    const history = baseHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...baseHistory, { role: 'user', content: trimmed }];
    const allSessions = state.chatSessions || [];
    const baseSession = allSessions.find((s) => s.id === sessionId)
      || { id: sessionId, kind: 'general', title: 'New Chat', history: [] };
    // First-message auto-titling — a brand-new session starts titled "New Chat"; the moment its
    // first real message is sent, retitle it from that message's own content (truncated), the
    // same lightweight convention real multi-session chat products (ChatGPT, Claude.ai) already
    // use, with no extra AI call needed. Decided once, up front, alongside `baseSession` above —
    // never re-derived later in this same call, which is exactly what the race above was.
    const isFirstMessage = baseHistory.length === 0;
    const shouldRetitle = isFirstMessage && baseSession.title === 'New Chat';
    const title = shouldRetitle ? (trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed) : baseSession.title;
    // A real, second bug caught alongside the race above: rebuilding the array as
    // `[...otherSessions, updated]` (filter-then-append) silently moved whichever session was
    // just written to the END of the array on every send — meaning the session tab row would
    // visibly reorder itself every time a message was sent in a non-last tab, which would read as
    // a genuinely confusing UI (tabs jumping around while typing). `.map()` in place instead
    // preserves each session's own original position; the `some()` check only matters for the
    // theoretical case `sessionId` isn't in `allSessions` yet (shouldn't happen in practice, since
    // `createSession()` always adds the record before any message can be sent in it).
    const sessionExists = allSessions.some((s) => s.id === sessionId);
    const writeHistory = (newHistory) => {
      const updated = { ...baseSession, title, history: newHistory };
      patch({
        chatSessions: sessionExists
          ? allSessions.map((s) => (s.id === sessionId ? updated : s))
          : [...allSessions, updated],
      });
    };

    writeHistory(afterUser);
    setLoading(true);
    setPendingTask(null);
    const profileSummary = compileStudentProfile(state);
    requestChatReply(
      { history, prompt: trimmed, profileSummary },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            writeHistory([...afterUser, { role: 'assistant', content: "Sorry, I couldn't come up with a reply just now — try asking again." }]);
            return;
          }
          writeHistory([...afterUser, { role: 'assistant', content: proposal.reply, intent: proposal.intent }]);
          if (proposal.intent === 'propose_task' && proposal.taskTitle) {
            setPendingTask({ title: proposal.taskTitle });
          }
        },
        onError: () => {
          setLoading(false);
          writeHistory([...afterUser, { role: 'assistant', content: 'Sorry, something went wrong — try asking again in a moment.' }]);
        },
      },
    );
  };

  const sendMessage = (trimmed) => sendFrom(chatHistory, trimmed);

  // Task 4 — editing a previously-sent user message discards it and everything that followed (that
  // reply and any later turns were all based on the OLD wording), then resends the corrected text
  // as a genuinely new final message, generating a fresh AI reply — the standard, expected "edit a
  // sent message" chat interaction. `index` is the edited message's own position in `chatHistory`.
  const editMessage = (index, newContent) => sendFrom(chatHistory.slice(0, index), newContent);

  const goToBuildYourOwn = () => patch({ screen: 'projectBuilder' });

  const dismissPendingTask = () => {
    setPendingTask(null);
    setPickingDate(false);
    setDateInput('');
    setDateError(null);
  };

  const finalizeAddTask = () => {
    if (!dateInput) { setDateError('Pick a date to continue.'); return; }
    const picked = parseDateInputValue(dateInput);
    const today = getEffectiveToday(state.dateOverride);
    if (picked.getTime() < today.getTime()) {
      setDateError('Pick today or a future date.');
      return;
    }
    patch({
      aiSuggestedTasks: [...(state.aiSuggestedTasks || []), {
        id: makeTaskId('ai-suggestion'),
        title: pendingTask.title,
        date: dateInput,
        desc: 'Added from a conversation with MyPath AI.',
      }],
      chatSessions: (state.chatSessions || []).map((s) => (s.id === sessionId
        ? { ...s, history: [...chatHistory, { role: 'assistant', content: `Added "${pendingTask.title}" to your plan.` }] }
        : s)),
    });
    dismissPendingTask();
  };

  return {
    chatHistory,
    loading,
    sendMessage,
    editMessage,
    goToBuildYourOwn,
    pendingTask,
    pickingDate,
    dateInput,
    dateError,
    startPickingDate: () => { setPickingDate(true); setDateError(null); },
    updateDateInput: (value) => { setDateInput(value); setDateError(null); },
    dismissPendingTask,
    finalizeAddTask,
  };
}
