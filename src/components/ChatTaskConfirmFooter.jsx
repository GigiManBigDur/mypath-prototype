// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md), Task 1 — the task-add confirm/
// date-pick footer, extracted out of `HubChatPanel.jsx` so `MapChatWidget.jsx` can render the
// identical UI too, driven by the exact same `useHubChat` state, rather than a second copy of this
// markup. Purely presentational — every prop here comes straight from `useHubChat`'s own return
// value at the call site.
export default function ChatTaskConfirmFooter({
  pendingTask, pickingDate, dateInput, dateError,
  onStartPickingDate, onDateChange, onDismiss, onConfirm,
}) {
  if (!pendingTask) return null;

  if (!pickingDate) {
    return (
      <div className="chat-task-confirm">
        <p>Want me to add &ldquo;{pendingTask.title}&rdquo; to your plan?</p>
        <div className="task-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>Not now</button>
          <button type="button" className="btn btn-primary" onClick={onStartPickingDate}>Add it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-task-confirm">
      <label className="task-form-field">
        <span className="label">Date</span>
        <input
          type="date"
          value={dateInput}
          onChange={(e) => onDateChange(e.target.value)}
          autoFocus
        />
      </label>
      {dateError && <p className="mascot-suggestion-date-error">{dateError}</p>}
      <div className="task-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDismiss}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={!dateInput}>Confirm</button>
      </div>
    </div>
  );
}
