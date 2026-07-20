// AI Personalization, Stage 1: Data Aggregation Layer (see CLAUDE.md). Pure organization of data
// that already exists in `state` into one structured summary — no API calls, no AI, no cost at
// this stage. `compileStudentProfile(state)` is meant to be the ONE function Stage 2's future AI
// layer eventually reads from, so every resolution here reuses this app's own existing lookup
// functions (the same ones Discovery/Roadmap/HubScreen already call) rather than re-deriving a
// second copy of any of this logic.
import { getCareerPool } from '../data/careers';
import { MAJORS } from '../data/majors';
import { getMergedPrograms, reachMatchSafetyTag } from '../data/programs';
import { findOpportunity } from '../data/opportunities';
import { findProjectType } from '../data/projects';
import { BUILT_TRACKS, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getCourseById } from '../data/courses';
import { getCourseById as getUCDavisCourseById } from '../data/ucdavisCourses';
import { calculateUnweightedGpa, calculateWeightedGpa } from './gpa';
import { calculateUCDavisGpa } from './ucdavisGpa';
import { generateRoadmap } from './roadmapGenerator';

// Widened to every built track / every opportunity track, not just the narrow set the student's
// own interest tags happen to map to — the same "a Browse-mode selection outside the student's
// own interests must still resolve" fix already applied twice elsewhere in this app
// (roadmapGenerator.js's own careerPool/opportunity lookups). A student's REAL selection should
// never silently vanish from their own profile just because it came from Browse mode.
function resolveCareers(state) {
  const pool = getCareerPool(BUILT_TRACKS, state.educationLevel);
  return state.selectedCareerIds
    .map((id) => pool.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ id: c.id, name: c.name }));
}

function resolveMajors(state) {
  return state.selectedMajorIds
    .map((id) => MAJORS[id])
    .filter(Boolean)
    .map((m) => ({ id: m.id, name: m.name }));
}

// Each program's Reach/Match/Safety tag comes from the exact same `reachMatchSafetyTag` call
// ProgramsStep/ProgramSummaryScreen already make per card — this is a real, personalized signal
// (how a school's own gpaValue compares to the student's real GPA), not re-derived differently.
function resolvePrograms(state) {
  const merged = getMergedPrograms(state.selectedMajorIds, state.educationLevel);
  return state.selectedProgramKeys
    .map((key) => merged.find((p) => p.key === key))
    .filter(Boolean)
    .map((p) => ({
      key: p.key,
      institution: p.institution,
      program: p.program,
      selectivity: p.selectivity,
      reachMatchSafety: reachMatchSafetyTag(state.gpa, p.gpaValue),
    }));
}

// Completion is read directly off `completedNodes` using the same per-step id convention
// roadmapGenerator.js's own chain builders already use (`${opp.id}-prep-${i}`) — this
// deliberately only reports the opportunity's OWN year-1 chain, not any later escalation-year
// chain a recurring opportunity might also have generated on a multi-year plan; `recurring` is
// still surfaced so Stage 2 knows this is an ongoing, not one-time, commitment.
function resolveOpportunities(state) {
  return state.selectedOpportunityIds.map((id) => {
    const opp = findOpportunity(id, OPPORTUNITY_TRACKS, state.educationLevel);
    if (!opp) return { id, name: id, resolved: false };

    const stepNames = opp.prepSteps?.length ? opp.prepSteps : [`Prepare for ${opp.name}`];
    const stepIds = stepNames.map((_, i) => `${id}-prep-${i}`);
    const completedSteps = stepIds.filter((sid) => state.completedNodes[sid]).length;
    const outcomeNotes = stepIds.map((sid) => state.taskOutcomes[sid]).filter(Boolean);

    return {
      id,
      name: opp.name,
      track: opp._track || null,
      trackLabel: opp._track ? TRACK_LABELS[opp._track] : null,
      recurring: !!opp.recurring,
      totalSteps: stepIds.length,
      completedSteps,
      complete: completedSteps === stepIds.length,
      outcomeNotes,
    };
  });
}

function resolveProjects(state) {
  return (state.startedProjects || []).map((project) => {
    const resolved = findProjectType(project.categoryId, project.projectTypeId);
    const totalSteps = project.steps.length;
    const completedSteps = project.steps.filter((s) => state.completedNodes[s.id]).length;
    return {
      id: project.id,
      category: resolved?.category?.label || project.categoryId,
      projectType: resolved?.projectType?.name || project.projectTypeId,
      projectName: project.projectName,
      status: project.status,
      totalSteps,
      completedSteps,
      steps: project.steps.map((s) => ({
        title: s.title,
        date: s.date,
        complete: !!state.completedNodes[s.id],
        outcomeNote: state.taskOutcomes[s.id] || null,
      })),
    };
  });
}

// Roslyn (highschool) and UC Davis (undergraduate/transfer) transcripts are mutually exclusive by
// construction (a student is on exactly one educationLevel/currentSchool combination at a time),
// so this branches once rather than trying to merge two genuinely different grading formats.
// Unweighted/weighted are recomputed live via gpa.js, since only the 4.0-scale number is ever
// persisted to `state.gpa` (see that file's own header comment) — the compiler needs all three,
// so it derives the other two the same way TranscriptScreen's own live preview already does.
// UC Davis's own grading system has no separate weighted/unweighted split to report (see
// ucdavisGpa.js) — its one real number is recomputed the same way, the other two fields stay null
// rather than fabricating a distinction that system doesn't have.
function resolveAcademic(state) {
  const isHighSchool = state.educationLevel === 'highschool';
  const isUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';

  const gpa = {
    scale4: state.gpa || null,
    unweighted: isHighSchool ? calculateUnweightedGpa(state.transcript) : null,
    weighted: isHighSchool ? calculateWeightedGpa(state.transcript) : null,
    ucdavis: isUCDavis ? calculateUCDavisGpa(state.ucdavisTranscript) : null,
  };

  const transcript = isHighSchool
    ? state.transcript.map((entry) => {
      const course = getCourseById(entry.courseId);
      return {
        course: course?.name || entry.courseId,
        department: course?.department || null,
        gradeEarned: entry.gradeEarned,
        yearTaken: entry.yearTaken,
      };
    })
    : isUCDavis
      ? state.ucdavisTranscript.map((entry) => {
        const course = getUCDavisCourseById(entry.courseId);
        return {
          course: course?.name || entry.courseId,
          code: course?.code || null,
          letterGrade: entry.letterGrade,
          classYear: entry.classYear,
          quarter: entry.quarter,
        };
      })
      : [];

  const currentCourses = isHighSchool
    ? state.selectedCourseIds.map((id) => getCourseById(id)?.name || id)
    : isUCDavis
      ? state.selectedUCDavisCourseIds.map((id) => getUCDavisCourseById(id)?.name || id)
      : [];

  return { gpa, transcript, currentCourses };
}

// Reuses `generateRoadmap(state)` (no `yearWindow`, the same full, unfiltered multi-year call
// HubScreen.jsx's own `countPlanTasks` already makes) and walks `roadmap.spine` the identical
// "count every top-level item, plus every hasBranch item's own branchSteps" way that function
// already established — this is the one real precedent for "flatten every node including chain
// sub-steps" in this codebase, reused here rather than re-derived. Every task's own real date,
// completion state, and (the whole point of this feature) any outcome note the student wrote are
// captured uniformly, whether it's a trunk task, an opportunity's prep step, a project's own
// step, or a custom task the student added themselves. `customTasks` below is a filtered VIEW of
// this same list (`category === 'custom'`), not a second, separately-derived array.
function resolvePlanHistory(state) {
  if (!state.educationLevel) return { tasks: [], customTasks: [] };

  const roadmap = generateRoadmap(state);
  const tasks = [];
  const addTask = (item, parentId) => {
    tasks.push({
      id: item.id,
      title: item.title,
      date: item.date instanceof Date ? item.date.toISOString().slice(0, 10) : item.date,
      category: item.category,
      coreType: item.coreType || null,
      required: !!item.required,
      complete: !!state.completedNodes[item.id],
      outcomeNote: state.taskOutcomes[item.id] || null,
      parentId: parentId || null,
    });
  };

  roadmap.spine.forEach((item) => {
    addTask(item);
    if (item.hasBranch) {
      (item.branchSteps || []).forEach((step) => addTask(step, item.id));
    }
  });

  return { tasks, customTasks: tasks.filter((t) => t.category === 'custom') };
}

export function compileStudentProfile(state) {
  const { tasks, customTasks } = resolvePlanHistory(state);

  return {
    generatedAt: new Date().toISOString(),
    basicProfile: {
      interests: state.interestTags || [],
      educationLevel: state.educationLevel || null,
      schoolYear: state.schoolYear ?? null,
      currentSchool: state.currentSchool || null,
    },
    academic: resolveAcademic(state),
    goals: {
      careers: resolveCareers(state),
      majors: resolveMajors(state),
      programs: resolvePrograms(state),
    },
    activities: {
      opportunities: resolveOpportunities(state),
      projects: resolveProjects(state),
    },
    planHistory: { tasks, customTasks },
  };
}
