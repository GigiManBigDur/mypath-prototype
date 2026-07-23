import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ChatConversation from './ChatConversation';
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
            updateChatHistory([...afterUser, { role: 'assistant', content: "Sorry, I couldn't think of anything just now — try again." }]);
            return;
          }
          updateChatHistory([...afterUser, {
            role: 'assistant',
            content: proposal.reply,
            planReady: proposal.planReady,
            milestones: proposal.milestones,
          }]);
        },
        onError: () => {
          setLoading(false);
          updateChatHistory([...afterUser, { role: 'assistant', content: 'Sorry, something went wrong — try again in a moment.' }]);
        },
      },
    );
  };

  // Same "scan for the most recent ready turn" precedent BuildYourOwnView's own `latestReadyPlan`
  // already established — keeps refining if the student keeps talking after reaching a ready list.
  let latestReadySteps = null;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    if (m.role === 'assistant' && m.planReady && m.milestones?.length) { latestReadySteps = m.milestones; break; }
  }

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
      <p className="field-hint">
        Let&rsquo;s plan the concrete steps for this phase — grounded in your original project
        conversation, scoped to just &ldquo;{milestone.title}.&rdquo;
      </p>
      <ChatConversation
        messages={chatHistory}
        loading={loading}
        onSend={sendMessage}
        emptyHint={`What do you already know about how you'll approach "${milestone.title}"?`}
      />
      {latestReadySteps && !pickingDate && (
        <div className="milestone-ready-preview">
          <div className="field-label">Proposed steps for this phase</div>
          <ol>{latestReadySteps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="task-form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-primary" onClick={() => setPickingDate(true)}>
              Set a target date &amp; add these steps
            </button>
          </div>
        </div>
      )}
      {latestReadySteps && pickingDate && (
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
