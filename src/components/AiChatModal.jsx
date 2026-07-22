import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';
import MascotIcon from './MascotIcon';
import { useApp } from '../context/AppContext';
import { useModalExit } from '../hooks/useModalExit';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestChatReply } from '../utils/chatRequest';
import { makeTaskId } from '../utils/ids';
import { getEffectiveToday, parseDateInputValue } from '../utils/dates';

// Build the Real "Ask MyPath AI Anything" Conversational Chat (see CLAUDE.md) — the real feature
// behind the Hub's own AI button, replacing the earlier single-shot "Coming soon" placeholder for
// good. Genuinely distinct from Project Builder's "Build Your Own" (single-shot project
// ideation): this is an ongoing, MULTI-TURN conversation the student can keep talking in, that can
// also answer general "how does this app work" questions and recognize task-add / project-idea
// requests within the flow of an otherwise normal conversation.
//
// Task 1 — the conversation itself lives in local, ephemeral component state (`messages`), NOT
// AppContext/localStorage — matching this app's own established "session-only UI convenience"
// precedent for browse-state elsewhere (Project Builder's own sub-view state, etc.). Closing and
// reopening this modal always starts a fresh conversation; there's no requirement anywhere in the
// build spec for it to survive a close/reopen or a reload, and adding that would be new persisted
// state complexity beyond what was actually asked for.
export default function AiChatModal({ isOpen, initialPrompt, onClose }) {
  const { state, patch } = useApp();
  const { rendered, closing } = useModalExit(isOpen);
  const [messages, setMessages] = useState([]); // [{role: 'user'|'assistant', content, intent?}]
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  // Task 3 — the one action currently awaiting the student's explicit confirmation (never added
  // silently, same rule held since Stage 2): `{ title } | null`.
  const [pendingTask, setPendingTask] = useState(null);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);
  // The most recent assistant reply text, fed to useMascotSpeech below — kept separate from
  // `messages` so speech only ever triggers on a genuinely NEW reply arriving, not on every
  // re-render the message list itself causes (e.g. scrolling).
  const [speakingText, setSpeakingText] = useState(null);
  const listRef = useRef(null);

  // A fresh open always starts a brand-new conversation, seeded with whatever the student already
  // typed in the Hub's own inline input (if anything) as the starting draft — matching Build Your
  // Own's own "seed from typed text" precedent.
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue(initialPrompt || '');
      setLoading(false);
      setPendingTask(null);
      setPickingDate(false);
      setDateInput('');
      setDateError(null);
      setSpeakingText(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Task 1 — "the mascot delivers each response using its existing speaking animation and
  // voiceover (same ElevenLabs integration already built)": the exact same shared hook
  // MascotWidget.jsx/HubScreen.jsx already use, fed the latest reply text. Passing `null` once
  // the modal starts closing (rather than the raw text) stops audio immediately, the same
  // "dismissing is just an ordinary 'the current line went away' change" contract every other
  // caller of this hook already relies on.
  const isSpeaking = useMascotSpeech(!closing ? speakingText : null, state.voiceMuted);

  if (!rendered) return null;

  // Task 2 — the full Stage 1 profile (not a bounded/summarized variant), matching Build Your
  // Own's own reasoning: student-initiated, infrequent relative to Stage 2's auto-triggers, and
  // "using its knowledge of... the student's actual current progress/state" needs the real thing.
  // `history` is every prior turn BEFORE this one — the server builds the actual multi-turn
  // request from it, so context genuinely carries across turns rather than each reply being
  // answered in isolation.
  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
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
            setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I couldn't come up with a reply just now — try asking again." }]);
            return;
          }
          setMessages((prev) => [...prev, { role: 'assistant', content: proposal.reply, intent: proposal.intent }]);
          setSpeakingText(proposal.reply);
          if (proposal.intent === 'propose_task' && proposal.taskTitle) {
            setPendingTask({ title: proposal.taskTitle });
          }
        },
        onError: () => {
          setLoading(false);
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong — try asking again in a moment.' }]);
        },
      },
    );
  };

  // Task 3's own alternative for project/creative requests — a real redirect, not a second
  // implementation of Build Your Own's own creative-connection logic living here too.
  const goToBuildYourOwn = () => {
    patch({ screen: 'projectBuilder' });
    onClose();
  };

  const dismissPendingTask = () => {
    setPendingTask(null);
    setPickingDate(false);
    setDateInput('');
    setDateError(null);
  };

  // Task 3/4 — confirm-first, same rule held since Stage 2: Accept only ever reveals a date
  // picker (student picks the date, same "student picks the date, not the AI" convention the
  // last two chain-suggestion/Build-Your-Own fixes already established), never adds anything
  // until Confirm. Task 4's own "same distinct AI visual marker used elsewhere" falls out for
  // free: this writes to the EXISTING `state.aiSuggestedTasks` array, which
  // roadmapGenerator.js/Roadmap.jsx already render with the sparkle badge — zero new rendering
  // logic needed.
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
    });
    setMessages((prev) => [...prev, { role: 'assistant', content: `Added "${pendingTask.title}" to your plan.` }]);
    dismissPendingTask();
  };

  return createPortal(
    <div className={`overlay${closing ? ' overlay-exit' : ''}`} onClick={onClose}>
      <div className={`modal chat-modal${closing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="chat-header">
          <MascotIcon size={44} speaking={isSpeaking} />
          <div>
            <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
            <h2 className="modal-title" style={{ fontSize: 18, margin: 0 }}>Ask me anything</h2>
          </div>
        </div>

        <div className="chat-messages" ref={listRef}>
          {messages.length === 0 && !loading && (
            <p className="chat-empty-hint">
              Ask how something in MyPath works, what to do next, or have me add a task to your plan.
            </p>
          )}
          {messages.map((m, i) => (
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

        <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message…"
            autoFocus
          />
          <button type="submit" className="chat-send-btn" disabled={!inputValue.trim() || loading} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
