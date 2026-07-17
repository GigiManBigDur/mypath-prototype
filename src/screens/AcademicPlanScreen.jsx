import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { getYearOverview } from '../utils/yearOverview';
import Roadmap from '../components/Roadmap';
import YearOverview from '../components/YearOverview';
import DateOverrideControl from '../components/DateOverrideControl';
import useRealTimeTick from '../hooks/useRealTimeTick';

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
  // Real-Time Tracking feature (see CLAUDE.md) — `tick` advances once a minute purely to bust
  // these memos' own caching as real time passes with no other state change (e.g. the tab left
  // open across midnight); it changes nothing about the memoized values themselves, which still
  // come entirely from `state`/`yearWindow`.
  const tick = useRealTimeTick();
  const years = useMemo(() => getYearOverview(state), [state, tick]);
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
  const roadmap = useMemo(() => generateRoadmap(state, yearWindow), [state, yearWindow, tick]);

  // DateOverrideControl is a sibling of whichever sub-view is active, not owned by either — see
  // its own header comment for why (Map 2's very different full-bleed layout in particular).
  return (
    <>
      {state.planYearIndex === null ? (
        <YearOverview
          years={years}
          onSelectYear={(stageIndex) => patch({ planYearIndex: stageIndex })}
          onBack={() => patch({ screen: 'hub' })}
          onReset={reset}
        />
      ) : (
        <Roadmap
          roadmap={roadmap}
          onBack={() => patch({ planYearIndex: null })}
          onReset={reset}
        />
      )}
      <DateOverrideControl state={state} patch={patch} />
    </>
  );
}
