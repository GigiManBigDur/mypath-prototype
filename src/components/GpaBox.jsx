import { useCountUp } from '../hooks/useCountUp';

// Palette repaint, Transcript/Course Selection batch (see CLAUDE.md) — Task 1's own "count-up
// effect... rather than an instant static update" for the GPA summary boxes shown on
// TranscriptScreen.jsx (both the Roslyn and UC Davis variants). Extracted out of that file (it
// used to be a small local function there) so High School Selection + Transcript for Transfer
// Students' own `TransferHighSchoolTranscript` component (src/components/) can reuse the identical
// display treatment without importing from a screen file (which would create a circular import,
// since that screen file itself renders `TransferHighSchoolTranscript`). Purely a display
// wrapper — the real GPA value (already computed by calculateUnweightedGpa/calculateWeightedGpa/
// calculate4ScaleGpa/calculateUCDavisGpa) is what's passed in; this only decides how the
// transition to a new value is shown, never recomputes anything.
export default function GpaBox({ value, label }) {
  const displayed = useCountUp(value);
  return (
    <div className="gpa-summary-box">
      <div className="gpa-summary-value">{displayed != null ? displayed.toFixed(2) : '—'}</div>
      <div className="gpa-summary-label">{label}</div>
    </div>
  );
}
