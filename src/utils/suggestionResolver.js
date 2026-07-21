// Fix: Fix Calendar Positioning + Properly Diagnose the Persistent Chain-Attachment Bug
// (see CLAUDE.md).
//
// Root cause of the chain-attachment bug (confirmed by reproducing it against a real chain before
// writing this fix, not assumed): `roadmapGenerator.js`'s `buildFirstYearChain` merges an accepted
// ai-inserted step into the chain's own step array, re-sorts by real date, and PROMOTES WHICHEVER
// STEP SORTS EARLIEST onto the spine as the chain's "anchor" (`const [anchor, ...branchSteps] =
// steps`) — this is the same mechanism that already promotes an opportunity's own real first prep
// step, and it has no concept of "never let something dated earlier than the current anchor
// become the new anchor." The only date validation that existed (MascotWidget's `confirmDate`)
// checked the picked date against the TRIGGERING task's own date — but the triggering task (the
// one the student just completed and wrote an outcome about) is very often NOT the same task as
// the target chain's own first step: the AI can relate a suggestion to any existing chain, not
// just the one the trigger task happens to belong to. So a picked date could easily satisfy
// "after the trigger task" while still landing BEFORE the target chain's real anchor date — which
// silently promotes the new step onto the spine (displacing the chain's real first step into the
// branch instead) rather than adding it as a branch step. `findChainAnchor` is what closes this:
// it exposes the target chain's own CURRENT anchor (id + real date) so the date-picker can also
// validate against it directly, guaranteeing a confirmed date can never sort earlier than the
// chain's real first step.
import { generateRoadmap } from './roadmapGenerator';

export function findChainAnchor(state, opportunityId) {
  if (!opportunityId) return null;
  const roadmap = generateRoadmap(state);
  return roadmap.spine.find((item) => item.category === 'opportunity' && item.sourceOpportunityId === opportunityId) || null;
}

export function chainExistsFor(state, opportunityId) {
  return !!findChainAnchor(state, opportunityId);
}
