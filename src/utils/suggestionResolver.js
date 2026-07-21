// Fix: AI Suggestions Related to Existing Chains Aren't Inserted Correctly (see CLAUDE.md).
//
// The server (api/suggest.js) only ever returns a STRUCTURED INTENT — either a standalone
// suggestion with its own date, or a chain-related one naming an opportunity id + a real step
// title to position relative to (never a raw computed date for that case, since the server has no
// access to this student's own live roadmap/completedNodes/nodeDateOverrides). This module is
// where that intent gets turned into something safe to show the student: it resolves a chain
// reference against the CURRENT, real roadmap, computes an actual date positioned between the two
// real neighboring steps, and validates that date before anything is ever shown — never trusted to
// the model's own arithmetic.
//
// Called once, synchronously, the moment a raw proposal comes back (Roadmap.jsx's
// maybeTriggerSuggestion), BEFORE `state.pendingSuggestion` is ever set — an unresolvable or
// chronologically invalid chain reference means `resolveSuggestion` returns `null` and NOTHING is
// shown to the student at all (per this fix's own Task 3: "skip suggesting it entirely rather than
// inserting something chronologically nonsensical"), rather than showing a suggestion that could
// later fail or land somewhere nonsensical once accepted.
import { generateRoadmap } from './roadmapGenerator';
import {
  getEffectiveToday, realDaysBetween, realAddDays, parseDateInputValue, toDateInputValue,
} from './dates';

// A chain's own steps (anchor + branchSteps) as one real, ordered array — the exact same shape
// resolveOpportunities (profileCompiler.js) already exposes to the model, so a step title the
// model saw is looked up against the identical data here.
function liveChainSteps(state, opportunityId) {
  const roadmap = generateRoadmap(state);
  const chainItem = roadmap.spine.find(
    (item) => item.category === 'opportunity' && item.sourceOpportunityId === opportunityId,
  );
  if (!chainItem) return null;
  return [
    { id: chainItem.id, title: chainItem.title, date: chainItem.date },
    ...(chainItem.branchSteps || []).map((s) => ({ id: s.id, title: s.title, date: s.date })),
  ];
}

function findStepIndex(steps, title) {
  const needle = title.trim().toLowerCase();
  return steps.findIndex((s) => s.title.trim().toLowerCase() === needle);
}

// Resolves a validated server proposal (api/suggest.js's own `validateProposal` shape) into either
// a display-ready suggestion object, or `null` (skip — nothing shown). `sourceTaskId` is threaded
// straight through, matching the shape Roadmap.jsx already stored on `pendingSuggestion`.
export function resolveSuggestion(proposal, state, sourceTaskId) {
  const today = getEffectiveToday(state.dateOverride);

  if (!proposal.relatedOpportunityId) {
    // Standalone — the model's own date, sanity-checked (never in the past) but not otherwise
    // repositioned; there's no existing chain to validate it against.
    const date = parseDateInputValue(proposal.date);
    if (Number.isNaN(date.getTime())) return null;
    if (realDaysBetween(date, today) < 0) return null;
    return {
      sourceTaskId,
      title: proposal.title,
      rationale: proposal.rationale,
      date: toDateInputValue(date),
      chainOpportunityId: null,
    };
  }

  // Chain-related — Task 1/2/3: resolve against the LIVE chain, compute a real position, and
  // validate it before ever returning something showable.
  const steps = liveChainSteps(state, proposal.relatedOpportunityId);
  if (!steps || steps.length === 0) return null; // opportunity id doesn't resolve to a real chain

  const targetIndex = findStepIndex(steps, proposal.insertRelativeToStepTitle || '');
  if (targetIndex === -1) return null; // referenced a step that isn't really in this chain

  let lowerBound;
  let upperBound;
  if (proposal.insertPosition === 'before') {
    if (targetIndex === 0) return null; // would land before the chain's own first step — invalid
    lowerBound = steps[targetIndex - 1].date;
    upperBound = steps[targetIndex].date;
  } else if (proposal.insertPosition === 'after') {
    if (targetIndex === steps.length - 1) return null; // would land after the chain's own deadline
    lowerBound = steps[targetIndex].date;
    upperBound = steps[targetIndex + 1].date;
  } else {
    return null;
  }

  const gapDays = realDaysBetween(upperBound, lowerBound);
  const computedDate = realAddDays(lowerBound, Math.round(gapDays / 2));

  // Task 3's explicit checks — redundant with the arithmetic above in the success path (a real
  // midpoint between two real neighbors can't actually violate these), but kept as an explicit,
  // final confirmation rather than trusting the computation silently, per the fix's own wording.
  if (realDaysBetween(computedDate, today) < 0) return null;
  if (realDaysBetween(computedDate, steps[0].date) < 0) return null;
  if (realDaysBetween(upperBound, computedDate) < 0) return null;

  return {
    sourceTaskId,
    title: proposal.title,
    rationale: proposal.rationale,
    date: toDateInputValue(computedDate),
    chainOpportunityId: proposal.relatedOpportunityId,
  };
}
