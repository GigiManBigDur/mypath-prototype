import { ArrowLeft } from 'lucide-react';
import { ADMISSIONS_TEXT } from '../data/admissionsText';
import { getBuiltTracks } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';

export default function AdmissionsOverviewScreen() {
  const { state, patch } = useApp();
  const copy = ADMISSIONS_TEXT[state.educationLevel];
  const hasBuiltTrack = getBuiltTracks(state.interestTags).length > 0;
  // Course Selection (Transcript & GPA -> Course Selection) only applies to High School —
  // Undergraduate/Transfer skip straight to the Reach/Match/Safety Summary when Discovery is
  // also skipped, exactly the pre-Course-Selection behavior for them (that screen sits right
  // before Opportunities regardless of level — see ProgramSummaryScreen.jsx).
  const afterDiscoverySkip = state.educationLevel === 'highschool' ? 'transcript' : 'programSummary';

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={2} total={9} />
      <h1 className="page-title">{copy.title}</h1>

      <div className="prose">
        {copy.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => patch({ screen: hasBuiltTrack ? 'discovery' : afterDiscoverySkip })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
