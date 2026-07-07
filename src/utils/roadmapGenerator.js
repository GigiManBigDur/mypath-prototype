import { MAJORS } from '../data/majors';
import { findCareer } from '../data/careers';
import { getPrograms } from '../data/programs';
import { findOpportunity } from '../data/opportunities';
import { TRUNK_STEPS } from '../data/trunkSteps';
import { getBuiltTracks } from '../data/interests';
import { layoutTrunk, layoutBranches } from './roadmapLayout';

const LEVEL_LABEL = {
  highschool: 'senior-year',
  undergraduate: 'graduate-school',
  transfer: 'transfer',
};

export function generateRoadmap(state) {
  const tracks = getBuiltTracks(state.interestTags);
  const level = state.educationLevel;

  const career = state.selectedCareerId ? findCareer(state.selectedCareerId, tracks, level) : null;
  const major = state.selectedMajorId ? MAJORS[state.selectedMajorId] : null;

  const selectedPrograms = state.selectedMajorId
    ? getPrograms(state.selectedMajorId, level).filter((p) =>
        state.selectedProgramKeys.includes(`${state.selectedMajorId}::${p.institution}`)
      )
    : [];
  const programNames = selectedPrograms.map((p) => p.institution);

  const ctx = {
    programNames,
    majorName: major?.name,
    careerName: career?.name,
  };

  const resolvedTrunk = TRUNK_STEPS[level].map((step) => ({
    id: step.id,
    title: step.title,
    type: step.type,
    due: step.due,
    desc: typeof step.desc === 'function' ? step.desc(ctx) : step.desc,
    resources: typeof step.resources === 'function' ? step.resources(ctx) : step.resources,
  }));
  const trunk = layoutTrunk(resolvedTrunk);

  const branchDefs = [
    ...buildGpaBranches(selectedPrograms),
    ...buildOpportunityBranches(tracks, level, state.selectedOpportunityIds, trunk.length),
  ];
  const branch = layoutBranches(branchDefs, trunk);

  const title = career ? `Your Path to ${career.name}` : 'Your Academic Plan';
  const subtitle = `A personalized ${LEVEL_LABEL[level]} plan, built from your profile.`;

  return { title, subtitle, trunk, branch };
}

function buildGpaBranches(selectedPrograms) {
  const byTarget = new Map();
  for (const p of selectedPrograms) {
    if (!p.gpaTarget) continue;
    if (!byTarget.has(p.gpaTarget)) byTarget.set(p.gpaTarget, []);
    byTarget.get(p.gpaTarget).push(p.institution);
  }
  return Array.from(byTarget.entries()).map(([target, institutions], i) => ({
    id: `gpa-${i}`,
    title: 'Maintain your GPA',
    due: 'Ongoing',
    desc: `${target} to stay competitive for ${institutions.join(', ')}.`,
    resources: [],
    attachTrunkIndex: 0,
  }));
}

function buildOpportunityBranches(tracks, level, selectedOpportunityIds, trunkLength) {
  const branches = [];
  selectedOpportunityIds.forEach((id, i) => {
    const opp = findOpportunity(id, tracks, level);
    if (!opp) return;
    const attachTrunkIndex = trunkLength > 1 ? i % (trunkLength - 1) : 0;
    branches.push({
      id: `${opp.id}-prep`,
      title: `Prepare for ${opp.name}`,
      due: `Prep · ~${opp.prepWeeks} wk${opp.prepWeeks === 1 ? '' : 's'} before deadline`,
      desc: `${opp.description} ${opp.howToApply}.`,
      resources: opp.resource ? [`${opp.resource.label} — ${opp.resource.note}`] : [],
      attachTrunkIndex,
    });
    branches.push({
      id: `${opp.id}-deadline`,
      title: `${opp.name} — deadline / start`,
      due: opp.deadline,
      desc: `This is when ${opp.name} opens or is due. ${opp.howToApply}.`,
      resources: [],
      attachTrunkIndex,
    });
  });
  return branches;
}
