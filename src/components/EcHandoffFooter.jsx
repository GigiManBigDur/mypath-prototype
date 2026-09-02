import { ListChecks } from 'lucide-react';

// Guarantee the Transcript & GPA Trigger + guaranteed EC hand-off (see CLAUDE.md), Task 3 — the
// small, single-action footer shown once the app's own guaranteed, deterministic trigger fires
// (see useNarrativeSession.js's own `showEcHandoff`/`beginEcHandoff`) because the student already
// has real, existing activities & experiences on file that haven't been reviewed/confirmed during
// THIS conversation yet. Mirrors `TranscriptPauseFooter.jsx`'s own shape exactly — the same
// `.chat-task-confirm` visual language, the same single-action (no dismiss) design, since this is
// a required, one-time hand-off, not an optional draft to keep refining.
export default function EcHandoffFooter({ onBegin }) {
  return (
    <div className="chat-task-confirm">
      <p>
        <ListChecks size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        You've already got some real activities & experiences on file — let's take a quick look and
        make sure they're confirmed and up to date before we keep going.
      </p>
      <div className="task-form-actions">
        <button type="button" className="btn btn-primary" onClick={onBegin}>
          Review my activities &amp; experiences →
        </button>
      </div>
    </div>
  );
}
