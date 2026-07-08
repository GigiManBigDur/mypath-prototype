import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { findOpportunity } from '../data/opportunities';
import { TRUNK_STAGES, STAGE_PLAN, DEFAULT_SCHOOL_YEAR, TRANSFER_CAVEAT } from '../data/trunkSteps';
import { getBuiltTracks, getOpportunityTracks } from '../data/interests';
import { layoutRoadmap } from './roadmapLayout';
import { anchorDate, formatDate, startOfToday, realAddDays, realDaysBetween } from './dates';

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

  // Required, single-step items — every core admissions/milestone task, flattened across
  // however many year-stages the student's schoolYear pulls in. None of these carry a `steps`
  // chain in the data, so they always render as plain points on the spine (see Task 2 rule in
  // roadmapLayout.js / Roadmap.jsx).
  const coreItems = stageNames.flatMap((stageName, stageIndex) => {
    const stage = TRUNK_STAGES[level][stageName];
    return stage.steps.map((step, stepIndex) => {
      const realDate = anchorDate({ ...step.date, yearOffset: stageIndex }, planStartDate);
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

  const opportunityItems = buildOpportunityItems(opportunityTracks, level, state.selectedOpportunityIds, planStartDate);

  const spineItems = [...coreItems, ...opportunityItems];

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

// Each selected opportunity becomes one optional spine item, anchored at the date of its
// EARLIEST step (its "starting point" — e.g. "Register for DECA") rather than its deadline, and
// carrying its full ordered step chain as data. Prep steps are spread across the `prepWeeks`
// window before the deadline (clamped to start after today), followed by the actual
// deadline/event step. When there's more than one step, roadmapLayout.js gives this item its own
// isolated diagonal sub-branch; the branch's positioning never depends on any other item.
function buildOpportunityItems(tracks, level, selectedOpportunityIds, planStartDate) {
  const items = [];
  selectedOpportunityIds.forEach((id) => {
    const opp = findOpportunity(id, tracks, level);
    if (!opp) return;

    const deadlineDate = anchorDate(opp.date, planStartDate);
    const stepNames = opp.prepSteps?.length ? opp.prepSteps : [`Prepare for ${opp.name}`];

    const earliestStart = realAddDays(planStartDate, 1);
    let windowStart = realAddDays(deadlineDate, -opp.prepWeeks * 7);
    if (windowStart < earliestStart) windowStart = earliestStart;
    const spanDays = Math.max(realDaysBetween(deadlineDate, windowStart), stepNames.length);

    const steps = stepNames.map((stepName, i) => {
      const frac = (i + 1) / (stepNames.length + 1);
      const stepDate = realAddDays(windowStart, Math.round(spanDays * frac));
      return {
        id: `${opp.id}-prep-${i}`,
        title: stepName,
        date: stepDate,
        due: formatDate(stepDate),
        desc: i === 0
          ? `${opp.description} This is the first step in preparing for ${opp.name}.`
          : `Step ${i + 1} of ${stepNames.length} in preparing for ${opp.name}.`,
        resources: i === 0 && opp.resource ? [`${opp.resource.label} — ${opp.resource.note}`] : [],
      };
    });

    steps.push({
      id: `${opp.id}-deadline`,
      title: `${opp.name} — deadline / start`,
      date: deadlineDate,
      due: formatDate(deadlineDate),
      desc: `This is when ${opp.name} opens or is due. ${opp.howToApply}.`,
      resources: [],
    });

    const startDate = steps[0].date;
    items.push({
      id: opp.id,
      title: opp.name,
      category: 'opportunity',
      required: false,
      coreType: 'opportunity',
      date: startDate,
      due: formatDate(startDate),
      desc: opp.description,
      resources: [],
      steps,
    });
  });
  return items;
}
