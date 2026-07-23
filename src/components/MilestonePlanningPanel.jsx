import { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ChatConversation from './ChatConversation';
import MascotIcon from './MascotIcon';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { useModalExit } from '../hooks/useModalExit';
import { requestBuildYourOwnChatReply } from '../utils/buildYourOwnChatRequest';
import { compileStudentProfile } from '../utils/profileCompiler';
import { parseDateInputValue, realDaysBetween, formatDateWithYear } from '../utils/dates';

// Two-Phase Generation (see CLAUDE.md), Task 3/4 — the scoped, embedded chat shown inside an
// unlocked-but-not-yet-planned overview milestone's own detail modal (Roadmap.jsx). Reuses the
// exact same `/api/build-your-own-chat` endpoint and `ChatConversation` UI the original project
// conversation already established ("reusing the existing chat system," per this task's own
// explicit instruction) — the only new piece is `milestoneContext`, which switches the SAME
// endpoint into a narrower conversation about just this one phase's own granular steps (see that
// file's own `buildMilestoneDetailPrompt`). This is a genuinely separate conversation from the
// original project-level one — `milestone.chatHistory` (persisted on the milestone object itself,
// inside `state.startedProjects`), not `state.buildYourOwnChatHistory` — since it's about a
// specific phase, not the whole project, and needs its own independent back-and-forth.
export default function MilestonePlanningPanel({ project, milestone, anchorDate, onAttach }) {
  const { state, patch } = useApp();
  const [loading, setLoading] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState('');
  // Add Explicit "Not Satisfied, Keep Refining" Option (see CLAUDE.md) — same "dismiss by source
  // turn index, not a plain boolean" convention BuildYourOwnView's own `dismissedReadyIndex`
  // already established, so dismissing THIS ready turn's preview doesn't also suppress a later,
  // genuinely new one if the student keeps refining and reaches planReady again.
  const [dismissedReadyIndex, setDismissedReadyIndex] = useState(-1);

  // Make the Overview-Task Chat More Obviously Interactive (see CLAUDE.md) — the latest reply's
  // text, fed to useMascotSpeech below, kept separate from chatHistory so speech only ever
  // triggers on a genuinely NEW reply arriving — the exact same convention BuildYourOwnView/
  // HubChatPanel's own mascot-speech wiring already established. Task 3's own "reinforce the
  // mascot's presence" is what motivates giving this panel its own MascotIcon/useMascotSpeech pair
  // at all — this screen previously had neither.
  const [speakingText, setSpeakingText] = useState(null);
  const isSpeaking = useMascotSpeech(speakingText, state.voiceMuted);

  // Task 1/2 — a single, app-wide, persisted "have they ever used one of these chats before" flag
  // (not per-milestone — once a student understands the pattern once, they don't need it repeated
  // for every later overview task), the same "one-time, dismiss-once-ever" shape
  // `roadmapTooltipsSeen` already established for the Academic Plan's own first-visit callouts.
  // Both the hint (Task 1) and the input's own glow (Task 2) derive from this ONE flag, and both
  // Task 2's own two stated triggers — "starts typing" (via ChatConversation's new `onInputFocus`)
  // and "the hint is dismissed" (its own close button) — resolve to the exact same action: mark
  // this flag seen. There's nothing left to fade separately once it's set.
  const firstTimeUI = !state.milestoneChatHintSeen;
  const dismissFirstTimeUI = () => patch({ milestoneChatHintSeen: true });
  const { rendered: hintRendered, closing: hintClosing } = useModalExit(firstTimeUI);

  const chatHistory = milestone.chatHistory || [];

  const updateChatHistory = (next) => {
    patch({
      startedProjects: state.startedProjects.map((p) => (p.id !== project.id ? p : {
        ...p,
        overviewMilestones: p.overviewMilestones.map((m) => (m.id !== milestone.id ? m : { ...m, chatHistory: next })),
      })),
    });
  };

  const sendMessage = (trimmed) => {
    const history = chatHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...chatHistory, { role: 'user', content: trimmed }];
    updateChatHistory(afterUser);
    setLoading(true);
    const profileSummary = compileStudentProfile(state);
    requestBuildYourOwnChatReply(
      {
        history,
        prompt: trimmed,
        profileSummary,
        milestoneContext: {
          projectName: project.projectName,
          overviewMilestones: (project.overviewMilestones || []).map((m) => m.title),
          currentMilestoneTitle: milestone.title,
          currentMilestoneDesc: milestone.desc || '',
        },
      },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            const fallback = "Sorry, I couldn't think of anything just now — try again.";
            updateChatHistory([...afterUser, { role: 'assistant', content: fallback }]);
            setSpeakingText(fallback);
            return;
          }
          updateChatHistory([...afterUser, {
            role: 'assistant',
            content: proposal.reply,
            planReady: proposal.planReady,
            milestones: proposal.milestones,
          }]);
          setSpeakingText(proposal.reply);
        },
        onError: () => {
          setLoading(false);
          const errorText = 'Sorry, something went wrong — try again in a moment.';
          updateChatHistory([...afterUser, { role: 'assistant', content: errorText }]);
          setSpeakingText(errorText);
        },
      },
    );
  };

  // Same "scan for the most recent ready turn" precedent BuildYourOwnView's own `latestReadyPlan`
  // already established — keeps refining if the student keeps talking after reaching a ready list.
  let latestReadySteps = null;
  let latestReadySourceIndex = -1;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (m.role === 'assistant' && m.planReady && m.milestones?.length) {
      latestReadySteps = m.milestones;
      latestReadySourceIndex = i;
      break;
    }
  }
  const readyDismissed = latestReadySourceIndex === dismissedReadyIndex;

  const confirmDate = () => {
    if (!dateInput) { setDateError('Pick a date to continue.'); return; }
    const picked = parseDateInputValue(dateInput);
    if (realDaysBetween(picked, anchorDate) <= 0) {
      setDateError(`This needs to be after "${milestone.title}"'s own start date (${formatDateWithYear(anchorDate)}).`);
      return;
    }
    onAttach(latestReadySteps, dateInput);
  };

  return (
    <div className="milestone-planning-panel">
      {/* Task 3 — a small header pairing the mascot with a plain "MyPath AI" label, the same
          visual language BuildYourOwnView's own chat header already uses, so this reads as the
          same familiar assistant rather than an unlabeled text box. `thinking`/`speaking` drive
          the exact same animation states every other chat surface already does. */}
      <div className="chat-header milestone-chat-header">
        <MascotIcon size={40} thinking={loading} speaking={isSpeaking} />
        <div>
          <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
          <h2 className="hub-chat-title" style={{ fontSize: 15 }}>Planning this phase</h2>
        </div>
      </div>

      <p className="field-hint">
        Let&rsquo;s plan the concrete steps for this phase — grounded in your original project
        conversation, scoped to just &ldquo;{milestone.title}.&rdquo;
      </p>

      <div className={`milestone-chat-wrap${firstTimeUI ? ' milestone-chat-glow' : ''}`}>
        <ChatConversation
          messages={chatHistory}
          loading={loading}
          onSend={sendMessage}
          onInputFocus={dismissFirstTimeUI}
          emptyHint={`What do you already know about how you'll approach "${milestone.title}"?`}
        />
        {/* Task 1 — a small, dismissible, first-time-only hint pointing at the chat input. Shown
            once, ever (see `firstTimeUI`'s own comment above), never reappearing after it's
            dismissed OR the student starts typing (ChatConversation's own `onInputFocus`). */}
        {hintRendered && (
          <div className={`milestone-chat-hint${hintClosing ? ' callout-exit' : ''}`}>
            <button type="button" className="roadmap-callout-close" onClick={dismissFirstTimeUI} aria-label="Dismiss">
              <X size={12} />
            </button>
            <MessageCircle size={16} className="roadmap-callout-icon" />
            <div className="roadmap-callout-text">
              Chat here with the AI to plan out the exact steps for this phase.
            </div>
            <div className="milestone-chat-hint-arrow" aria-hidden="true" />
          </div>
        )}
      </div>

      {latestReadySteps && !readyDismissed && !pickingDate && (
        <div className="milestone-ready-preview">
          <div className="field-label">Proposed steps for this phase</div>
          <ol>{latestReadySteps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-primary" onClick={() => setPickingDate(true)}>
              Set a target date &amp; add these steps
            </button>
            {/* Add Explicit "Not Satisfied, Keep Refining" Option (see CLAUDE.md) — a real,
                visible second action next to the commit button, not something the student has
                to guess they can do by just typing more. Only hides this preview (see
                dismissedReadyIndex's own comment above) — nothing in chatHistory/planReady/
                milestones is touched, so nothing is lost. */}
            <button type="button" className="btn btn-ghost" onClick={() => setDismissedReadyIndex(latestReadySourceIndex)}>
              Not quite right — keep refining
            </button>
          </div>
        </div>
      )}
      {latestReadySteps && !readyDismissed && pickingDate && (
        <div className="milestone-date-picker">
          <label className="task-form-field">
            <span className="label">When do you want to complete this phase by?</span>
            <input type="date" value={dateInput} onChange={(e) => { setDateInput(e.target.value); setDateError(''); }} />
          </label>
          {dateError && <p className="mascot-suggestion-date-error">{dateError}</p>}
          <div className="task-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPickingDate(false)}>Back</button>
            <button type="button" className="btn btn-primary" onClick={confirmDate}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
