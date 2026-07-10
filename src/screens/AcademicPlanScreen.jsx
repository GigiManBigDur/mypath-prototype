import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { getYearOverview } from '../utils/yearOverview';
import Roadmap from '../components/Roadmap';
import YearOverview from '../components/YearOverview';

// The Academic Plan is now two sub-views (this is Map 1's first pass — Map 2 doesn't yet filter
// to a single year; that's the next, separate step):
//   - Map 1 (Year Overview, `state.planYearIndex === null`): a small animated list of the years
//     this plan spans (YearOverview.jsx) — a normal, lightweight screen.
//   - Map 2 (Roadmap.jsx): the existing full task roadmap. For now this still shows the WHOLE
//     multi-year plan unfiltered, exactly as it always has — per-year filtering is deliberately
//     deferred to a follow-up pass, so Map 1 can be verified fully on its own first.
// `onBack` means something different depending on which sub-view is active: from Map 1 it goes
// back out to Project Builder (unchanged); from Map 2 it goes back to Map 1 (the new "return to
// years" control), not all the way out of the Plan screen.
export default function AcademicPlanScreen() {
  const { state, patch, reset } = useApp();
  const roadmap = useMemo(() => generateRoadmap(state), [state]);
  const years = useMemo(() => getYearOverview(state), [state]);

  if (state.planYearIndex === null) {
    return (
      <YearOverview
        years={years}
        onSelectYear={(stageIndex) => patch({ planYearIndex: stageIndex })}
        onBack={() => patch({ screen: 'projectBuilder' })}
        onReset={reset}
      />
    );
  }

  return (
    <Roadmap
      roadmap={roadmap}
      onBack={() => patch({ planYearIndex: null })}
      onReset={reset}
    />
  );
}
