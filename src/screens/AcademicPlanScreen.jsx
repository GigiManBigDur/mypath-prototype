import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { getYearOverview } from '../utils/yearOverview';
import Roadmap from '../components/Roadmap';
import YearOverview from '../components/YearOverview';

// The Academic Plan is two sub-views:
//   - Map 1 (Year Overview, `state.planYearIndex === null`): a small animated list of the years
//     this plan spans (YearOverview.jsx) — a normal, lightweight screen.
//   - Map 2 (Roadmap.jsx): the existing task roadmap, scoped to whichever year was clicked —
//     `yearWindow` below is `{ start, endExclusive, isCurrentYear }`, derived from the SAME
//     `yearStartDate`s Map 1 already computed (getYearOverview), so the two views can never
//     disagree about where one year ends and the next begins. `endExclusive` is `null` for the
//     plan's last year (unbounded). generateRoadmap()/filterItemsToYear() do the actual
//     date-range filtering — see roadmapGenerator.js.
// `onBack` means something different depending on which sub-view is active: from Map 1 it goes
// back out to the hub (the single, consistent return point for every screen — see the "Return to
// Hub" routing restructure in CLAUDE.md); from Map 2 it goes back to Map 1 (the "return to
// years" control), not all the way out of the Plan screen.
export default function AcademicPlanScreen() {
  const { state, patch, reset } = useApp();
  const years = useMemo(() => getYearOverview(state), [state]);
  const yearWindow = useMemo(() => {
    if (state.planYearIndex === null) return null;
    const current = years[state.planYearIndex];
    const next = years[state.planYearIndex + 1];
    return {
      start: current.yearStartDate,
      endExclusive: next ? next.yearStartDate : null,
      isCurrentYear: state.planYearIndex === 0,
    };
  }, [years, state.planYearIndex]);
  const roadmap = useMemo(() => generateRoadmap(state, yearWindow), [state, yearWindow]);

  if (state.planYearIndex === null) {
    return (
      <YearOverview
        years={years}
        onSelectYear={(stageIndex) => patch({ planYearIndex: stageIndex })}
        onBack={() => patch({ screen: 'hub' })}
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
