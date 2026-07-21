// Fix: Replace Automatic Date Computation with a Manual, Constrained Date Step (see CLAUDE.md).
//
// This file used to compute a suggested date automatically — a midpoint between two real chain
// steps, resolved from the model's own "insert before/after step X" instruction (see the
// superseded "AI Suggestions Related to Existing Chains" fix). That auto-computation has been
// replaced entirely: the student now picks their own date (MascotWidget's date-picker step,
// constrained only to fall after the triggering task's own date). All that's left for this module
// to do is the one thing only the app can check — whether a chain-related proposal's
// `relatedOpportunityId` actually resolves to a real, currently-selected opportunity chain — since
// the model can reference an id that's since been removed from the plan, or (rarely) hallucinate
// one that never existed. `chainExistsFor` is called at ACCEPT time (after the student confirms a
// valid date), not before — Task 3 still needs chain detection/attachment to work; Task 4's
// "falls back to a standalone task" is simply what happens whenever this returns false.
import { generateRoadmap } from './roadmapGenerator';

export function chainExistsFor(state, opportunityId) {
  if (!opportunityId) return false;
  const roadmap = generateRoadmap(state);
  return roadmap.spine.some((item) => item.category === 'opportunity' && item.sourceOpportunityId === opportunityId);
}
