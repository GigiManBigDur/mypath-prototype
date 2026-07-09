import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { findOpportunity, PROGRESSION_LADDERS } from '../data/opportunities';
import { TRUNK_STAGES, STAGE_PLAN, DEFAULT_SCHOOL_YEAR, TRANSFER_CAVEAT } from '../data/trunkSteps';
import { getBuiltTracks, getOpportunityTracks } from '../data/interests';
import { layoutRoadmap } from './roadmapLayout';
import { anchorDate, formatDate, startOfToday, realAddDays, realDaysBetween, parseDateInputValue } from './dates';

// Single-stage label (unchanged behavior for the final-year case) vs. the multi-year label used
// once earlier stages are prepended, so a freshman doesn't see "personalized senior-year plan".
const LEVEL_LABEL = {
  highschool: 'senior-year',
  undergraduate: 'graduate-school',
  transfer: 'transfer',
};
const LEVEL_LABEL_MULTI_YEAR = {
  highschool: 'high school',
  undergraduate: 'grad-school prep',
  transfer: 'transfer',
};

export function generateRoadmap(state) {
  const planStartDate = startOfToday();
  const builtTracks = getBuiltTracks(state.interestTags);
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const level = state.educationLevel;
  const dateOverrides = state.nodeDateOverrides || {};
  const removed = state.removedNodeIds || {};

  const careerPool = getCareerPool(builtTracks, level);
  const selectedCareers = careerPool.filter((c) => state.selectedCareerIds.includes(c.id));
  const selectedMajors = state.selectedMajorIds.map((id) => MAJORS[id]).filter(Boolean);

  const mergedPrograms = getMergedPrograms(state.selectedMajorIds, level);
  const selectedPrograms = mergedPrograms.filter((p) => state.selectedProgramKeys.includes(p.key));
  const distinctSchoolNames = [...new Set(selectedPrograms.map((p) => p.institution))];

  const ctx = {
    programNames: distinctSchoolNames,
    distinctSchoolNames,
    majorName: selectedMajors.length ? selectedMajors.map((m) => m.name).join(' and ') : undefined,
    careerName: selectedCareers.length ? selectedCareers.map((c) => c.name).join(' and ') : undefined,
  };

  const today = {
    id: 'today',
    title: 'Today',
    type: 'today',
    date: planStartDate,
    due: formatDate(planStartDate),
    desc: 'This is today — your starting point. Everything on this plan is scheduled relative to right now.',
    resources: [],
  };

  const schoolYear = state.schoolYear ?? DEFAULT_SCHOOL_YEAR[level];
  const stageNames = STAGE_PLAN[level][schoolYear] ?? STAGE_PLAN[level][DEFAULT_SCHOOL_YEAR[level]];
  const yearSpan = stageNames.length;

  // Required, single-step items — every core admissions/milestone task, flattened across
  // however many year-stages the student's schoolYear pulls in. None of these carry a `steps`
  // chain in the data, so they always render as plain points on the spine (see Task 2 rule in
  // roadmapLayout.js / Roadmap.jsx). A user-removed core task is dropped entirely; a user-edited
  // due date overrides the template-computed one, using the exact same anchorDate() call — the
  // override is just a different input date, nothing about the positioning path changes.
  const coreItems = stageNames.flatMap((stageName, stageIndex) => {
    const stage = TRUNK_STAGES[level][stageName];
    return stage.steps
      .filter((step) => !removed[step.id])
      .map((step, stepIndex) => {
        const templateDate = anchorDate({ ...step.date, yearOffset: stageIndex }, planStartDate);
        const realDate = dateOverrides[step.id] ? parseDateInputValue(dateOverrides[step.id]) : templateDate;
        return {
          id: step.id,
          title: typeof step.title === 'function' ? step.title(ctx) : step.title,
          category: 'core',
          required: true,
          coreType: step.type,
          date: realDate,
          due: formatDate(realDate),
          desc: typeof step.desc === 'function' ? step.desc(ctx) : step.desc,
          resources: typeof step.resources === 'function' ? step.resources(ctx) : step.resources,
          stageLabel: stepIndex === 0 && stageNames.length > 1 ? stage.label : undefined,
          steps: null,
        };
      });
  });

  // Transfer students 2+ years out still get the single application-year trunk (transfer
  // timelines vary too much to model precisely) — flag that assumption instead of pretending
  // otherwise.
  const caveatNote = level === 'transfer' && schoolYear >= 2 ? TRANSFER_CAVEAT : null;

  const opportunityItems = buildOpportunityItems(
    opportunityTracks, level, state.selectedOpportunityIds, planStartDate, yearSpan, dateOverrides, removed,
  );

  const customItems = buildCustomItems(state.customTasks || [], dateOverrides, removed);

  const spineItems = [...coreItems, ...opportunityItems, ...customItems];

  const { today: laidToday, spine, canvasHeight, canvasWidth } = layoutRoadmap({ today, spineItems });

  const levelLabel = stageNames.length > 1 ? LEVEL_LABEL_MULTI_YEAR[level] : LEVEL_LABEL[level];

  return {
    title: titleFor(selectedCareers),
    subtitle: `A personalized ${levelLabel} plan, built from your profile.`,
    today: laidToday,
    spine,
    canvasHeight,
    canvasWidth,
    caveatNote,
  };
}

// 1-2 careers get named; 3+ would grow unbounded and wrap awkwardly, so switch to a generic title.
function titleFor(selectedCareers) {
  if (selectedCareers.length === 0) return 'Your Academic Plan';
  if (selectedCareers.length <= 2) return `Your Path to ${selectedCareers.map((c) => c.name).join(' & ')}`;
  return 'Your Personalized Academic Plan';
}

// User-created tasks (the "+ Add Task" flow in Roadmap.jsx): single-step by design — no chain,
// no sub-branch — positioned via the exact same date-to-y path as every other node. A task's
// stored `date` is just a template input like any other; a `nodeDateOverrides` entry (from
// editing it after creation) still wins over it, same override precedence core/opportunity items
// use. `category: 'custom'` is what gives it a visually distinct ring in Roadmap.jsx, and what
// keeps it out of the required core-progress count and out of the opportunity anchor/chain logic.
function buildCustomItems(customTasks, dateOverrides, removed) {
  return customTasks
    .filter((task) => !removed[task.id])
    .map((task) => {
      const templateDate = parseDateInputValue(task.date);
      const realDate = dateOverrides[task.id] ? parseDateInputValue(dateOverrides[task.id]) : templateDate;
      return {
        id: task.id,
        title: task.title,
        category: 'custom',
        required: false,
        coreType: 'custom',
        date: realDate,
        due: formatDate(realDate),
        desc: task.desc || 'A task you added yourself.',
        resources: [],
        steps: null,
      };
    });
}

// Escalated milestone title for year N (yearIndex is 1-based among the escalation years — 1
// means "year 2 overall", since year 1 always keeps the opportunity's own unmodified data).
// 'repeat' activities (already at their peak tier, e.g. Junior Nationals) just reuse year 1's own
// final step every year instead of climbing a ladder.
function progressionTitle(opp, yearIndex) {
  if (opp.progressionType === 'repeat') return opp.prepSteps[opp.prepSteps.length - 1];
  const ladder = PROGRESSION_LADDERS[opp.progressionType] || [];
  return ladder[Math.min(yearIndex - 1, ladder.length - 1)] || opp.prepSteps[opp.prepSteps.length - 1];
}

// Each selected opportunity becomes one optional spine item for its FIRST year, anchored at the
// date of its EARLIEST step (its "starting point" — e.g. "Register for DECA") rather than its
// deadline, carrying its full ordered step chain as data — completely unmodified from before
// multi-year progression existed. Prep steps are spread across the `prepWeeks` window before the
// deadline (clamped to start after today) — the LAST prep step IS the deadline/event itself (e.g.
// "Compete at Regionals") rather than a separate trailing node, since that step already
// represents the opportunity's actual terminal action.
//
// For `recurring` opportunities (club/competition activities — see PROGRESSION_LADDERS in
// opportunities.js) on a plan spanning more than one year-stage, every additional year gets its
// OWN chain too — shorter than year 1's (no "register"/"build from scratch" step, since the
// student isn't starting over), built from that opportunity's `progressionPrepSteps` data plus
// the escalated milestone title as the final step. A bare single-point node would read as "no
// prep needed for the harder tier," which isn't true. Non-recurring opportunities are entirely
// unaffected: exactly one chain, in its nearest year, same as always.
function buildOpportunityItems(tracks, level, selectedOpportunityIds, planStartDate, yearSpan, dateOverrides, removed) {
  const items = [];
  selectedOpportunityIds.forEach((id) => {
    const opp = findOpportunity(id, tracks, level);
    if (!opp) return;

    if (!removed[opp.id]) {
      const item = buildFirstYearChain(opp, planStartDate, dateOverrides, removed);
      if (item) items.push(item);
    }

    if (opp.recurring) {
      for (let yearIndex = 1; yearIndex < yearSpan; yearIndex += 1) {
        const item = buildEscalationChain(opp, yearIndex, planStartDate, dateOverrides, removed);
        if (item) items.push(item);
      }
    }
  });
  return items;
}

// Shared step-array builder for both a year-1 chain and a later-year escalation chain: spreads
// `stepNames` across the `prepWeeks` window before `deadlineDate` (clamped to start after today,
// last step pinned to the deadline itself), applies any per-step date overrides/removals, then
// re-sorts by real date and recomputes `isLast` on the sorted array. The spine/branch connector
// logic in roadmapLayout.js and Roadmap.jsx connects consecutive ARRAY entries, not consecutive
// BY-DATE entries, so a user dragging a step's due date past a sibling's has to reorder the array
// itself for the connector to reflow correctly. Returns null (chain omitted) if every step in it
// was removed. `stepId(i)` generates each step's id; `describe(...)` returns its title/desc/
// resources — the two callers differ only in wording, not in the date/sort/override mechanics.
function buildStepsChain(stepNames, deadlineDate, prepWeeks, planStartDate, dateOverrides, removed, stepId, describe) {
  const earliestStart = realAddDays(planStartDate, 1);
  let windowStart = realAddDays(deadlineDate, -prepWeeks * 7);
  if (windowStart < earliestStart) windowStart = earliestStart;
  const spanDays = Math.max(realDaysBetween(deadlineDate, windowStart), stepNames.length);

  let steps = stepNames
    .map((stepName, i) => {
      const isLastByDefault = i === stepNames.length - 1;
      const templateDate = isLastByDefault ? deadlineDate : realAddDays(windowStart, Math.round(spanDays * ((i + 1) / stepNames.length)));
      const id = stepId(i);
      const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
      const { title, desc, resources } = describe(stepName, i, isLastByDefault, stepNames.length);
      return { id, title, date: realDate, due: formatDate(realDate), desc, resources: resources || [] };
    })
    .filter((step) => !removed[step.id]);

  if (steps.length === 0) return null;

  steps.sort((a, b) => a.date.getTime() - b.date.getTime());
  return steps.map((step, i) => ({ ...step, isLast: i === steps.length - 1 }));
}

// Builds the original full prep-chain item (year 1) for one opportunity.
function buildFirstYearChain(opp, planStartDate, dateOverrides, removed) {
  const deadlineDate = anchorDate(opp.date, planStartDate);
  const stepNames = opp.prepSteps?.length ? opp.prepSteps : [`Prepare for ${opp.name}`];

  const steps = buildStepsChain(
    stepNames, deadlineDate, opp.prepWeeks, planStartDate, dateOverrides, removed,
    (i) => `${opp.id}-prep-${i}`,
    (stepName, i, isLastByDefault, total) => ({
      title: stepName,
      desc: isLastByDefault
        ? `This is when ${opp.name} opens or is due. ${opp.howToApply}.`
        : i === 0
          ? `${opp.description} This is the first step in preparing for ${opp.name}.`
          : `Step ${i + 1} of ${total} in preparing for ${opp.name}.`,
      resources: i === 0 && opp.resource ? [`${opp.resource.label} — ${opp.resource.note}`] : [],
    }),
  );
  if (!steps) return null;

  const anchorId = opp.id;
  const startDate = dateOverrides[anchorId] ? parseDateInputValue(dateOverrides[anchorId]) : steps[0].date;

  return {
    id: anchorId,
    title: opp.name,
    category: 'opportunity',
    required: false,
    coreType: 'opportunity',
    date: startDate,
    due: formatDate(startDate),
    desc: opp.description,
    resources: [],
    steps,
  };
}

// Builds a shorter chain for escalation year `yearIndex` (1-based among escalation years — 1
// means "year 2 overall") of a `recurring` opportunity: `opp.progressionPrepSteps[rung]` (clamped
// to its last rung, same pattern as PROGRESSION_LADDERS) supplies the prep-step titles, and the
// escalated milestone from `progressionTitle()` is appended as the final step. Removing the
// anchor id removes the whole year's chain, same as `buildFirstYearChain`.
function buildEscalationChain(opp, yearIndex, planStartDate, dateOverrides, removed) {
  const anchorId = `${opp.id}-y${yearIndex + 1}`;
  if (removed[anchorId]) return null;

  const deadlineDate = anchorDate({ ...opp.date, yearOffset: yearIndex }, planStartDate);
  const milestone = progressionTitle(opp, yearIndex);
  const prepStepNames = progressionPrepStepNames(opp, yearIndex);
  const stepNames = [...prepStepNames, milestone];

  const steps = buildStepsChain(
    stepNames, deadlineDate, opp.prepWeeks, planStartDate, dateOverrides, removed,
    (i) => `${anchorId}-prep-${i}`,
    (stepName, i, isLastByDefault, total) => ({
      title: stepName,
      desc: isLastByDefault
        ? `Your year ${yearIndex + 1} milestone for ${opp.name}: ${stepName.toLowerCase()}. ${opp.howToApply}.`
        : `Step ${i + 1} of ${total} preparing for year ${yearIndex + 1} of ${opp.name}.`,
      resources: [],
    }),
  );
  if (!steps) return null;

  const startDate = dateOverrides[anchorId] ? parseDateInputValue(dateOverrides[anchorId]) : steps[0].date;

  return {
    id: anchorId,
    title: `${opp.name} (Year ${yearIndex + 1})`,
    category: 'opportunity',
    required: false,
    coreType: 'opportunity',
    date: startDate,
    due: formatDate(startDate),
    desc: `Your year ${yearIndex + 1} milestone for ${opp.name}: ${milestone.toLowerCase()}. ${opp.howToApply}.`,
    resources: [],
    steps,
  };
}

function progressionPrepStepNames(opp, yearIndex) {
  const rungs = opp.progressionPrepSteps || [];
  if (!rungs.length) return [];
  return rungs[Math.min(yearIndex - 1, rungs.length - 1)];
}
