import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModalExit } from '../hooks/useModalExit';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestCreativeConnection } from '../utils/creativeSuggestions';
import { makeTaskId } from '../utils/ids';
import { getEffectiveToday, parseDateInputValue } from '../utils/dates';

// AI Personalization, Stage 3: The Creative-Leap Layer (see CLAUDE.md) — the real feature behind
// the Hub's "Ask MyPath AI anything" button, replacing its old "Coming soon" placeholder.
// Task 1 — a few preset starting options (to reduce the blank-page problem) plus free-form text,
// both routed through the SAME submitPrompt path. Rendered as its own real, centered
// `.overlay`/`.modal` (portaled, matching every other modal in this app) rather than crammed into
// the small inline hub box — the response text plus a date-picker step need real room, the same
// reasoning that moved Stage 2's own date-picker out of the corner mascot widget.
const PRESET_PROMPTS = [
  'Help me find a unique angle',
  "What's distinctive about my profile so far?",
  'Suggest a project idea based on my interests',
];

// Task 3/4 — this exact sentence is the one standing, ALWAYS-VISIBLE honesty note (never
// conditional on what the model itself reports) shown both in the modal's own result step and
// baked into the created project's own step description if the student acts on it — one shared
// constant so the two can never drift out of sync with each other.
const HONESTY_NOTE = 'This is a direction to explore — specific organizations or contacts are for you to find and verify yourself.';

export default function CreativeConnectionModal({ isOpen, initialPrompt, onClose }) {
  const { state, patch } = useApp();
  const { rendered, closing } = useModalExit(isOpen);
  // 'prompt' | 'loading' | 'result' | 'error' | 'datepick'
  const [step, setStep] = useState('prompt');
  const [promptText, setPromptText] = useState(initialPrompt || '');
  const [result, setResult] = useState(null);
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState(null);

  // A fresh open always starts at the prompt step, seeded from whatever the student already typed
  // in the Hub's own inline input (if anything) — a leftover result/error from a PREVIOUS question
  // never bleeds into the next time this modal opens.
  useEffect(() => {
    if (isOpen) {
      setStep('prompt');
      setPromptText(initialPrompt || '');
      setResult(null);
      setDateInput('');
      setDateError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!rendered) return null;

  // Task 2 — the full Stage 1 profile (not the bounded/summarized Stage-2-only variant), per the
  // build spec's own explicit "full real profile... especially any written outcomes" — this is
  // student-initiated and infrequent, so Stage 2's own cost-bounding concern doesn't apply here.
  const submitPrompt = (promptValue) => {
    const trimmed = promptValue.trim();
    if (!trimmed) return;
    setStep('loading');
    const profileSummary = compileStudentProfile(state);
    requestCreativeConnection(
      { prompt: trimmed, profileSummary },
      {
        onResult: (proposal) => {
          if (!proposal || typeof proposal.title !== 'string' || !proposal.title.trim() || typeof proposal.response !== 'string' || !proposal.response.trim()) {
            setStep('error');
            return;
          }
          setResult(proposal);
          setStep('result');
        },
        onError: () => setStep('error'),
      },
    );
  };

  const askAgain = () => {
    setStep('prompt');
    setPromptText('');
    setResult(null);
  };

  // Task 4 — turning an accepted creative connection into a real Project Builder entry. There is
  // no real curated PROJECT_CATEGORIES entry backing this (it's a genuinely freeform idea, not one
  // of the 6 curated categories) — `categoryId`/`projectTypeId: 'ai-creative'` are synthetic,
  // never matching anything in projects.js, and `aiSuggested: true` is what Roadmap.jsx reads both
  // to skip the (nonexistent) curated guide-step flow and to show the AI-suggested sparkle badge,
  // the same visual marker every other AI-originated node already carries.
  const confirmProject = () => {
    if (!dateInput) { setDateError('Pick a date to continue.'); return; }
    const picked = parseDateInputValue(dateInput);
    const today = getEffectiveToday(state.dateOverride);
    if (picked.getTime() < today.getTime()) {
      setDateError('Pick today or a future date.');
      return;
    }
    const newProject = {
      id: makeTaskId('project'),
      categoryId: 'ai-creative',
      projectTypeId: 'ai-creative',
      projectName: result.title,
      status: 'active',
      guideStepsUsed: 0,
      aiSuggested: true,
      steps: [{
        id: makeTaskId('project-step'),
        title: result.title,
        date: dateInput,
        desc: `${result.response} ${HONESTY_NOTE}`,
      }],
    };
    patch({ startedProjects: [...(state.startedProjects || []), newProject] });
    onClose();
  };

  return createPortal(
    <div className={`overlay${closing ? ' overlay-exit' : ''}`} onClick={onClose}>
      <div className={`modal creative-connection-modal${closing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)' }}><Sparkles size={13} /> Ask MyPath AI</div>

        {step === 'prompt' && (
          <>
            <h2 className="modal-title">What&rsquo;s on your mind?</h2>
            <div className="creative-preset-list">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="creative-preset-btn"
                  onClick={() => { setPromptText(preset); submitPrompt(preset); }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitPrompt(promptText); }}>
              <label className="task-form-field">
                <span className="label">Or ask your own question</span>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. What's a project idea that combines my interests?"
                  autoFocus
                />
              </label>
              <div className="task-form-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!promptText.trim()}>Ask</button>
              </div>
            </form>
          </>
        )}

        {step === 'loading' && (
          <>
            <h2 className="modal-title">Thinking&hellip;</h2>
            <p className="modal-desc">Looking for a genuine connection across your real profile.</p>
          </>
        )}

        {step === 'result' && result && (
          <>
            <h2 className="modal-title">{result.title}</h2>
            <p className="modal-desc creative-connection-text">{result.response}</p>
            <p className="caveat-banner creative-honesty-note">{HONESTY_NOTE}</p>
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={askAgain}>Ask something else</button>
              <button type="button" className="btn btn-primary" onClick={() => { setStep('datepick'); setDateError(null); }}>
                Turn into a project
              </button>
            </div>
          </>
        )}

        {step === 'datepick' && (
          <>
            <h2 className="modal-title">When should you start this?</h2>
            <label className="task-form-field">
              <span className="label">Start date</span>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => { setDateInput(e.target.value); setDateError(null); }}
                autoFocus
              />
            </label>
            {dateError && <p className="mascot-suggestion-date-error">{dateError}</p>}
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setStep('result')}>Back</button>
              <button type="button" className="btn btn-primary" onClick={confirmProject} disabled={!dateInput}>Confirm</button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <h2 className="modal-title">Something went wrong</h2>
            <p className="modal-desc">Couldn&rsquo;t get a response just now — try again in a moment.</p>
            <div className="task-form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
              <button type="button" className="btn btn-primary" onClick={askAgain}>Try again</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
