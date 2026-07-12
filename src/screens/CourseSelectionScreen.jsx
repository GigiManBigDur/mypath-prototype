import { ArrowLeft, ListChecks } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';
import ComingSoonNotice from '../components/ComingSoonNotice';

// Stage 3 of the Course Selection build (not yet built) — placeholder confirming the flow/
// navigation order only. Unlike Transcript's Back button, this one never needs the built-track
// skip logic: Transcript is never itself conditionally skipped, so it's always the real previous
// screen regardless of how the student got here.
export default function CourseSelectionScreen() {
  const { patch } = useApp();

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'transcript' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={5} total={8} />
      <h1 className="page-title">Course Selection</h1>
      <p className="page-sub">
        Pick the courses you're planning to take, built around what your school actually offers.
      </p>

      <ComingSoonNotice
        icon={ListChecks}
        title="Course selection is on its way"
        description="This step will let you choose your upcoming courses based on your school's real catalog, feeding straight into your Academic Plan."
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'opportunities' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
