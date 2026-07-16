import { ArrowLeft } from 'lucide-react';
import { ADMISSIONS_TEXT } from '../data/admissionsText';
import { getBuiltTracks } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroOnce } from '../hooks/useMascotSeen';

export default function AdmissionsOverviewScreen() {
  const { state, patch } = useApp();
  // A pure info/rundown screen with no student-entered data to track completion of — once its
  // one intro line has been shown, a later revisit honestly has nothing NEW to say, so (per this
  // stage's own explicit "or nothing at all" allowance) it just goes quiet rather than repeating
  // a generic line that wouldn't add anything real.
  const mascotText = useMascotIntroOnce('admissions-intro');
  const copy = ADMISSIONS_TEXT[state.educationLevel];
  const hasBuiltTrack = getBuiltTracks(state.interestTags).length > 0;
  // Course Selection (Transcript & GPA -> Course Selection) applies to High School, and — as of
  // the UC Davis partner-school addition — to an Undergraduate/Transfer student who selected UC
  // Davis as their current school (see CLAUDE.md's "UC Davis Partner School" sections; Task
  // content there is still placeholder-only, this is purely routing). Everyone else skips
  // straight to the Reach/Match/Safety Summary when Discovery is also skipped, exactly the
  // pre-Course-Selection behavior (that screen sits right before Opportunities regardless of
  // level — see ProgramSummaryScreen.jsx).
  const isCollegeAtUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';
  const hasCourseFlow = state.educationLevel === 'highschool' || isCollegeAtUCDavis;
  const afterDiscoverySkip = hasCourseFlow ? 'transcript' : 'programSummary';

  return (
    <div>
      <MascotWidget text={mascotText} />
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
