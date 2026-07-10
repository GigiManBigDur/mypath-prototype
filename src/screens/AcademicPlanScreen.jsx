import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../utils/roadmapGenerator';
import Roadmap from '../components/Roadmap';

// The step indicator, title/subtitle, progress, legend, Back, and Start Over controls all used
// to live in this screen's own header, above the Roadmap component. They now live inside
// Roadmap's own bottom panel (see Roadmap.jsx) as part of the full-bleed canvas restructure, so
// this screen is just wiring: build the roadmap data, hand it to Roadmap along with the two
// screen-level navigation actions it can't own itself.
export default function AcademicPlanScreen() {
  const { state, patch, reset } = useApp();
  const roadmap = useMemo(() => generateRoadmap(state), [state]);

  return (
    <Roadmap
      roadmap={roadmap}
      onBack={() => patch({ screen: 'projectBuilder' })}
      onReset={reset}
    />
  );
}
