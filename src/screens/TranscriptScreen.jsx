import { ArrowLeft, FileText } from 'lucide-react';
import { getBuiltTracks } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';
import ComingSoonNotice from '../components/ComingSoonNotice';

// Stage 2 of the Course Selection build (not yet built) — a real transcript entry flow that
// calculates state.gpa instead of the student self-reporting it. This is a placeholder confirming
// the flow/navigation order only. Back mirrors the same built-track skip AdmissionsOverviewScreen/
// DiscoveryScreen already use — Discovery is conditionally skipped when no interest tag maps to a
// built track, so going back from the screen right after it has to land on whichever screen was
// actually shown last (Discovery itself, or Admissions if Discovery never rendered).
export default function TranscriptScreen() {
  const { state, patch } = useApp();
  const hasBuiltTrack = getBuiltTracks(state.interestTags).length > 0;

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => patch({ screen: hasBuiltTrack ? 'discovery' : 'admissions' })}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={4} total={8} />
      <h1 className="page-title">Transcript &amp; GPA</h1>
      <p className="page-sub">
        Enter your real transcript here and we'll calculate your GPA automatically — no
        self-reporting needed.
      </p>

      <ComingSoonNotice
        icon={FileText}
        title="Transcript entry is on its way"
        description="This step will let you enter your coursework and grades directly, and calculate your GPA from it automatically — replacing the old self-reported GPA field."
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'courseSelection' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
