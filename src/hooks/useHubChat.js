import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestChatReply } from '../utils/chatRequest';
import { makeTaskId } from '../utils/ids';
import { getEffectiveToday, parseDateInputValue } from '../utils/dates';

// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md), Task 1 — the actual chat LOGIC,
// extracted out of `HubChatPanel.jsx` (previously the only caller) into this shared hook, so a
// second, smaller entry point (`MapChatWidget.jsx`, rendered on the Academic Plan) reads from and
// writes to the EXACT SAME `state.chatHistory` through the EXACT SAME send/task-confirm mechanics
// — not a second, independently-built implementation of the same conversation. Every caller gets:
// the persisted conversation, a loading flag, `sendMessage`, the task-add confirm-then-date-pick
// flow, and the Build-Your-Own redirect action — byte-for-byte what `HubChatPanel` already did,
// just no longer tied to being called from exactly one place. `onAssistantReply` is optional (not
// every caller needs to drive a mascot's speaking animation off it).
export function useHubChat(onAssistantReply) {
  const { state, patch } = useApp();
  const chatHistory = state.chatHistory || [];
  const [loading, setLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);

  const sendMessage = (trimmed) => {
    const history = chatHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...chatHistory, { role: 'user', content: trimmed }];
    patch({ chatHistory: afterUser });
    setLoading(true);
    setPendingTask(null);
    const profileSummary = compileStudentProfile(state);
    requestChatReply(
      { history, prompt: trimmed, profileSummary },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            patch({ chatHistory: [...afterUser, { role: 'assistant', content: "Sorry, I couldn't come up with a reply just now — try asking again." }] });
            return;
          }
          patch({ chatHistory: [...afterUser, { role: 'assistant', content: proposal.reply, intent: proposal.intent }] });
          if (onAssistantReply) onAssistantReply(proposal.reply);
          if (proposal.intent === 'propose_task' && proposal.taskTitle) {
            setPendingTask({ title: proposal.taskTitle });
          }
        },
        onError: () => {
          setLoading(false);
          patch({ chatHistory: [...afterUser, { role: 'assistant', content: 'Sorry, something went wrong — try asking again in a moment.' }] });
        },
      },
    );
  };

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
      chatHistory: [...chatHistory, { role: 'assistant', content: `Added "${pendingTask.title}" to your plan.` }],
    });
    dismissPendingTask();
  };

  return {
    chatHistory,
    loading,
    sendMessage,
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
