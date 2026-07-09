import { useMemo } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../utils/roadmapGenerator';
import Roadmap from '../components/Roadmap';

export default function AcademicPlanScreen() {
  const { state, patch, reset } = useApp();
  const roadmap = useMemo(() => generateRoadmap(state), [state]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'projectBuilder' })}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn btn-ghost" onClick={reset}>
          <RotateCcw size={14} /> Start over
        </button>
      </div>

      <div className="eyebrow">Step 6 of 6</div>

      <Roadmap roadmap={roadmap} />
    </div>
  );
}
