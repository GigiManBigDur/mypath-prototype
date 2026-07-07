import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { findOpportunity } from '../data/opportunities';
import { TRUNK_STEPS } from '../data/trunkSteps';
import { getBuiltTracks, getOpportunityTracks } from '../data/interests';
import { layoutRoadmap } from './roadmapLayout';
import { anchorDate, formatDate, startOfToday, realAddDays, realDaysBetween } from './dates';

const LEVEL_LABEL = {
  highschool: 'senior-year',
  undergraduate: 'graduate-school',
  transfer: 'transfer',
};

// Three dated checkpoints instead of one "ongoing" node — every task on the plan has a real
// deadline, GPA reminders included.
const GPA_CHECKPOINTS = [
  { id: 'gpa-fall', label: 'end of Fall term', date: { month: 12, day: 15 } },
  { id: 'gpa-winter', label: 'end of Winter term', date: { month: 3, day: 1 } },
  { id: 'gpa-spring', label: 'end of Spring term', date: { month: 5, day: 15 } },
];

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

  const trunkSteps = TRUNK_STEPS[level].map((step) => {
    const realDate = anchorDate(step.date, planStartDate);
    return {
      id: step.id,
      title: typeof step.title === 'function' ? step.title(ctx) : step.title,
      type: step.type,
      date: realDate,
      due: formatDate(realDate),
      desc: typeof step.desc === 'function' ? step.desc(ctx) : step.desc,
      resources: typeof step.resources === 'function' ? step.resources(ctx) : step.resources,
    };
  });

  const chips = [
    ...buildGpaChips(selectedPrograms, planStartDate),
    ...buildOpportunityChips(opportunityTracks, level, state.selectedOpportunityIds, planStartDate),
  ];

  const { today: laidToday, trunk, chips: laidChips, canvasHeight, canvasWidth } = layoutRoadmap({
    today,
    trunkSteps,
    chips,
  });

  return {
    title: titleFor(selectedCareers),
    subtitle: `A personalized ${LEVEL_LABEL[level]} plan, built from your profile.`,
    today: laidToday,
    trunk,
    chips: laidChips,
    canvasHeight,
    canvasWidth,
  };
}

// 1-2 careers get named; 3+ would grow unbounded and wrap awkwardly, so switch to a generic title.
function titleFor(selectedCareers) {
  if (selectedCareers.length === 0) return 'Your Academic Plan';
  if (selectedCareers.length <= 2) return `Your Path to ${selectedCareers.map((c) => c.name).join(' & ')}`;
  return 'Your Personalized Academic Plan';
}

// One chip per GPA checkpoint — a standalone reminder, not an expandable chain (no `steps`).
// Shares the same highest-benchmark text logic as before.
function buildGpaChips(selectedPrograms, planStartDate) {
  if (!selectedPrograms.length) return [];
  const desc = gpaDescText(selectedPrograms);
  return GPA_CHECKPOINTS.map((checkpoint) => {
    const realDate = anchorDate(checkpoint.date, planStartDate);
    return {
      id: checkpoint.id,
      type: 'gpa',
      title: `Check your GPA — ${checkpoint.label}`,
      date: realDate,
      due: formatDate(realDate),
      desc,
      resources: [],
      steps: null,
    };
  });
}

function gpaDescText(selectedPrograms) {
  const numeric = selectedPrograms.filter((p) => typeof p.gpaValue === 'number');
  const auditionOnly = selectedPrograms.filter((p) => p.gpaValue == null);
  const anyWeighted = selectedPrograms.some((p) => p.gpaWeighted);

  if (numeric.length === 0) {
    return `Your list is entirely audition/portfolio-based programs (e.g. ${auditionOnly[0].institution}), where GPA is secondary to your audition or portfolio — there's no specific benchmark to chase here, focus on your artistic preparation instead.`;
  }
  const maxValue = Math.max(...numeric.map((p) => p.gpaValue));
  let desc;
  if (anyWeighted) {
    desc = `Your list includes portfolio/audition-based programs where GPA matters less than your submission, but keeping it above ${maxValue}+ keeps every option open.`;
  } else {
    const institutions = [...new Set(numeric.map((p) => p.institution))];
    desc = `Aim for a ${maxValue}+ unweighted GPA to stay competitive for ${institutions.join(', ')}.`;
  }
  if (auditionOnly.length && numeric.length) {
    desc += ` Your list also includes audition-based programs (e.g. ${auditionOnly[0].institution}) where GPA matters less than your audition.`;
  }
  return desc;
}

// Each selected opportunity becomes one chip carrying its own ordered step chain (prepSteps
// spread evenly across the prep window, clamped to start after today, followed by the actual
// deadline/event) — the steps aren't plotted on the canvas, only shown when the chip is expanded.
function buildOpportunityChips(tracks, level, selectedOpportunityIds, planStartDate) {
  const chips = [];
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

    chips.push({
      id: opp.id,
      type: 'opportunity',
      title: opp.name,
      date: deadlineDate,
      due: formatDate(deadlineDate),
      desc: opp.description,
      resources: [],
      steps,
    });
  });
  return chips;
}
