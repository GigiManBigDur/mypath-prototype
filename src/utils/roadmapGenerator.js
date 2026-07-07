import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { findOpportunity } from '../data/opportunities';
import { TRUNK_STEPS } from '../data/trunkSteps';
import { getBuiltTracks, getOpportunityTracks } from '../data/interests';
import { layoutTrunk, layoutBranches } from './roadmapLayout';
import { formatShortDate, addDays } from './dates';

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

  const resolvedTrunk = TRUNK_STEPS[level].map((step) => ({
    id: step.id,
    title: typeof step.title === 'function' ? step.title(ctx) : step.title,
    type: step.type,
    date: step.date,
    due: formatShortDate(step.date),
    desc: typeof step.desc === 'function' ? step.desc(ctx) : step.desc,
    resources: typeof step.resources === 'function' ? step.resources(ctx) : step.resources,
  }));
  const trunk = layoutTrunk(resolvedTrunk);

  const branchDefs = [
    ...buildGpaCheckpoints(selectedPrograms),
    ...buildOpportunityBranches(opportunityTracks, level, state.selectedOpportunityIds),
  ];
  const branch = layoutBranches(branchDefs, trunk);

  const title = selectedCareers.length
    ? `Your Path to ${selectedCareers.map((c) => c.name).join(' & ')}`
    : 'Your Academic Plan';
  const subtitle = `A personalized ${LEVEL_LABEL[level]} plan, built from your profile.`;

  return { title, subtitle, trunk, branch };
}

// Three dated GPA-reminder nodes (one per term) sharing the same target text, built from the
// highest benchmark among all selected programs. Programs with no numeric value (pure
// audition-based admission, e.g. Juilliard) and programs flagged portfolio/audition-weighted
// get called out explicitly rather than folded into the number.
function buildGpaCheckpoints(selectedPrograms) {
  if (!selectedPrograms.length) return [];

  const numeric = selectedPrograms.filter((p) => typeof p.gpaValue === 'number');
  const auditionOnly = selectedPrograms.filter((p) => p.gpaValue == null);
  const anyWeighted = selectedPrograms.some((p) => p.gpaWeighted);

  let desc;
  if (numeric.length === 0) {
    desc = `Your list is entirely audition/portfolio-based programs (e.g. ${auditionOnly[0].institution}), where GPA is secondary to your audition or portfolio — there's no specific benchmark to chase here, focus on your artistic preparation instead.`;
  } else {
    const maxValue = Math.max(...numeric.map((p) => p.gpaValue));
    if (anyWeighted) {
      desc = `Your list includes portfolio/audition-based programs where GPA matters less than your submission, but keeping it above ${maxValue}+ keeps every option open.`;
    } else {
      const institutions = [...new Set(numeric.map((p) => p.institution))];
      desc = `Aim for a ${maxValue}+ unweighted GPA to stay competitive for ${institutions.join(', ')}.`;
    }
    if (auditionOnly.length && numeric.length) {
      desc += ` Your list also includes audition-based programs (e.g. ${auditionOnly[0].institution}) where GPA matters less than your audition.`;
    }
  }

  return GPA_CHECKPOINTS.map((checkpoint) => ({
    id: checkpoint.id,
    title: `Check your GPA — ${checkpoint.label}`,
    date: checkpoint.date,
    due: formatShortDate(checkpoint.date),
    desc,
    resources: [],
  }));
}

function buildOpportunityBranches(tracks, level, selectedOpportunityIds) {
  const branches = [];
  selectedOpportunityIds.forEach((id) => {
    const opp = findOpportunity(id, tracks, level);
    if (!opp) return;
    const prepDate = addDays(opp.date, -opp.prepWeeks * 7);
    branches.push({
      id: `${opp.id}-prep`,
      title: `Prepare for ${opp.name}`,
      date: prepDate,
      due: formatShortDate(prepDate),
      desc: `${opp.description} ${opp.howToApply}.`,
      resources: opp.resource ? [`${opp.resource.label} — ${opp.resource.note}`] : [],
    });
    branches.push({
      id: `${opp.id}-deadline`,
      title: `${opp.name} — deadline / start`,
      date: opp.date,
      due: formatShortDate(opp.date),
      desc: `This is when ${opp.name} opens or is due. ${opp.howToApply}.`,
      resources: [],
    });
  });
  return branches;
}
