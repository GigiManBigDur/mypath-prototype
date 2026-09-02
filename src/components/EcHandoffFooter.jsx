import { ListChecks } from 'lucide-react';

// Guarantee the Transcript & GPA Trigger + guaranteed EC hand-off (see CLAUDE.md), Task 3 — the
// small footer shown once the app's own guaranteed, deterministic trigger fires (see
// useNarrativeSession.js's own `showEcHandoff`/`beginEcHandoff`/`declineEcHandoff`). Mirrors
// `TranscriptPauseFooter.jsx`'s own shape — the same `.chat-task-confirm` visual language, since
// this is a required, one-time check-in, not an optional draft to keep refining.
//
// Guaranteed EC Check-In With Auto-Filing (see CLAUDE.md), Task 2/3 — this now fires for EVERY
// student, not just one who already has real records on file, so its own copy no longer assumes
// "you've already got some on file" — it asks plainly whether there's anything else to add.
// TWO real actions, unlike TranscriptPauseFooter's single-action design: "Yes" hands off to the
// real Profile page (`onBegin`); "No, that's everything" resolves the check-in directly, right here
// in the conversation, with no forced page visit — a genuinely different affordance than the
// Transcript & GPA pause, which has no in-conversation decline at all (that form's own real Skip
// button lives ONLY on the Transcript & GPA screen itself, once the student is already there).
export default function EcHandoffFooter({ onBegin, onDecline }) {
  return (
    <div className="chat-task-confirm">
      <p>
        <ListChecks size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Do you have any other activities or experiences — clubs, jobs, hobbies, competitions,
        volunteering — you'd like on record?
      </p>
      <div className="task-form-actions">
        <button type="button" className="btn btn-primary" onClick={onBegin}>
          Yes, let's add something →
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDecline}>
          No, that's everything
        </button>
      </div>
    </div>
  );
}
