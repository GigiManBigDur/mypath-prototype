import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestChatReply } from '../utils/chatRequest';
import { makeTaskId } from '../utils/ids';
import { getEffectiveToday, parseDateInputValue } from '../utils/dates';

// Polished Hub-to-Chat Transition + Persistent Chat History (see CLAUDE.md) — the real chat
// conversation itself, re-hosted inline in the hub instead of behind the old portaled overlay
// modal (`AiChatModal`, now retired). Per this task's own explicit scope ("container/presentation,
// not rebuilding the underlying chat logic"), every piece of the actual conversation mechanics —
// general app-help answers, task-add confirm-first, the Build-Your-Own redirect, the mascot
// speaking/voiceover hookup, the honesty guardrail already enforced server-side — is byte-for-byte
// the same as the original AiChatModal build. The one real change beyond presentation: `messages`
// moved from local, ephemeral `useState` into `state.chatHistory` (AppContext), so the
// conversation now survives a close/reopen or a full reload — Task 4's own persistence
// requirement — cleared only by the hub's own Reset button, same as every other piece of state.
//
// The mascot itself is NOT rendered here — it stays put in HubScreen's own `.hub-mascot-area` so
// it visually "stays anchored" across the whole transition (Task 2). This component only reports
// the latest reply's text upward via `onAssistantReply`, so HubScreen's own `useMascotSpeech` call
// can drive the ONE shared mascot instance's speaking animation/voiceover.
export default function HubChatPanel({ onBack, exiting, onAssistantReply }) {
  const { state, patch } = useApp();
  const chatHistory = state.chatHistory || [];
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatHistory.length, loading]);

  // Stopping speech the instant the panel starts exiting (Task 5's own reverse transition) is the
  // same "dismissing is just an ordinary 'the current line went away' change" contract every other
  // caller of useMascotSpeech already relies on — HubScreen clears its own speakingText the moment
  // it kicks off the exit transition, so there's nothing extra to do here.

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const history = chatHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...chatHistory, { role: 'user', content: trimmed }];
    patch({ chatHistory: afterUser });
    setInputValue('');
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
          onAssistantReply(proposal.reply);
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

      <div className="chat-messages hub-chat-messages" ref={listRef}>
        {chatHistory.length === 0 && !loading && (
          <p className="chat-empty-hint">
            Ask how something in MyPath works, what to do next, or have me add a task to your plan.
          </p>
        )}
        {chatHistory.map((m, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
            {m.content}
            {m.intent === 'redirect_build_your_own' && (
              <div className="chat-redirect-action">
                <button type="button" className="btn btn-primary" onClick={goToBuildYourOwn}>Go to Project Builder</button>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-bubble chat-bubble-assistant chat-bubble-loading">Thinking&hellip;</div>}

        {pendingTask && !pickingDate && (
          <div className="chat-task-confirm">
            <p>Want me to add &ldquo;{pendingTask.title}&rdquo; to your plan?</p>
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={dismissPendingTask}>Not now</button>
              <button type="button" className="btn btn-primary" onClick={() => { setPickingDate(true); setDateError(null); }}>Add it</button>
            </div>
          </div>
        )}

        {pendingTask && pickingDate && (
          <div className="chat-task-confirm">
            <label className="task-form-field">
              <span className="label">Date</span>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => { setDateInput(e.target.value); setDateError(null); }}
                autoFocus
              />
            </label>
            {dateError && <p className="mascot-suggestion-date-error">{dateError}</p>}
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={dismissPendingTask}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={finalizeAddTask} disabled={!dateInput}>Confirm</button>
            </div>
          </div>
        )}
      </div>

      {/* Deliberately no `autoFocus` here, unlike the old AiChatModal's own input — that was a
          small, portaled overlay always fully within the viewport, so autofocusing it was
          harmless; this panel is embedded inline, lower on the hub page, and autofocusing a
          below-the-fold input would make the browser's own native scroll-into-view yank the whole
          page (mascot included) the instant the panel finished entering — confirmed directly via
          getBoundingClientRect() before removing it — which reads as a jarring jump, exactly what
          this transition's own "one fluid transformation, not a hard cut" goal exists to avoid. */}
      <form className="chat-input-row hub-chat-input-row" onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message…"
        />
        <button type="submit" className="chat-send-btn" disabled={!inputValue.trim() || loading} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
