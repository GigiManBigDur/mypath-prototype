import { GraduationCap } from 'lucide-react';

// Implement the Corrected Flow Order: Transcript & GPA Moves Into Session 1 (see CLAUDE.md) —
// the small, single-action footer shown right below the conversation's own natural transition
// line the moment the AI sets `readyForTranscriptPause: true` (see useNarrativeSession.js's own
// `showTranscriptPause`/`beginTranscriptPause`). Reuses `.chat-task-confirm`, the exact same
// shared footer-card class `NarrativeReviewFooter.jsx` already established, so this reads as the
// same visual "the conversation wants a real action from you" language, not a second invented one.
// Deliberately no "not now"/dismiss option, unlike that later review footer — this is a required,
// one-time hand-off (the student can still explicitly Skip once actually on the real Transcript &
// GPA form, exactly like every other path into that screen already supports), not an optional
// draft the student might want to keep refining first.
export default function TranscriptPauseFooter({ onBegin }) {
  return (
    <div className="chat-task-confirm">
      <p>
        <GraduationCap size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Let's get your real transcript and GPA entered so the rest of this conversation is grounded
        in your actual academic record.
      </p>
      <div className="task-form-actions">
        <button type="button" className="btn btn-primary" onClick={onBegin}>
          Enter my transcript &amp; GPA →
        </button>
      </div>
    </div>
  );
}
