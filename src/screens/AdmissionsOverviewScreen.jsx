import { ArrowLeft } from 'lucide-react';
import { ADMISSIONS_TEXT } from '../data/admissionsText';
import { getBuiltTracks } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';

export default function AdmissionsOverviewScreen() {
  const { state, patch } = useApp();
  const copy = ADMISSIONS_TEXT[state.educationLevel];
  const hasBuiltTrack = getBuiltTracks(state.interestTags).length > 0;

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={2} total={6} />
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
          onClick={() => patch({ screen: hasBuiltTrack ? 'discovery' : 'opportunities' })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
