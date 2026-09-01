import { Check, RotateCcw } from 'lucide-react';

// Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md), Task 6 — the persistent
// Confirm / "keep refining" choice, reusing the exact `.chat-task-confirm`/`.task-form-actions`
// shared footer-card language `NarrativeReviewFooter.jsx` already established, so this reads as
// the same "the conversation wants a real decision from you" visual pattern, not a second invented
// one. Deliberately available the ENTIRE time a module review is active, not gated behind any
// AI-declared "ready" signal — the AI never decides this is resolved, only the student does, by
// clicking one of these two buttons whenever they're ready (they can keep chatting first if they
// want).
export default function ModuleReviewFooter({ onConfirm, onKeepRefining }) {
  return (
    <div className="chat-task-confirm">
      <p>Ready to move on, or want to reconsider this one?</p>
      <div className="task-form-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          <Check size={14} /> Confirm and continue
        </button>
        <button type="button" className="btn btn-ghost" onClick={onKeepRefining}>
          <RotateCcw size={14} /> Not quite right — keep refining
        </button>
      </div>
    </div>
  );
}
