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
import { findProjectType, findCategory } from '../data/projects';
import { BUILT_TRACKS, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getCourseById } from '../data/courses';
import { getCourseById as getUCDavisCourseById } from '../data/ucdavisCourses';
import { calculateUnweightedGpa, calculateWeightedGpa } from './gpa';
import { calculateUCDavisGpa } from './ucdavisGpa';
import { getEffectiveToday, realDaysBetween } from './dates';
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
//
// Fix: AI Suggestions Related to Existing Chains (see CLAUDE.md) — `steps` is a NEW field: the
// chain's own real, LIVE, ordered step list (title/date/complete/id), read from the already-
// computed `roadmap` (the same one resolvePlanHistory below uses, passed in rather than
// recomputed a second time) instead of re-deriving titles from `opp.prepSteps` directly. This
// matters specifically because a chain can have removed/date-overridden steps, or (now) an
// AI-accepted step already spliced in — the AI needs to see the chain exactly as it currently
// exists, since Stage 2's own suggestion flow later looks up "insertRelativeToStepTitle" against
// this SAME live data (see suggestionResolver.js) — showing it a stale, template-only step list
// here would just mean more suggestions silently fail that lookup and get skipped.
function resolveOpportunities(state, roadmap) {
  return state.selectedOpportunityIds.map((id) => {
    const opp = findOpportunity(id, OPPORTUNITY_TRACKS, state.educationLevel);
    if (!opp) return { id, name: id, resolved: false };

    const chainItem = roadmap.spine.find((item) => item.category === 'opportunity' && item.sourceOpportunityId === id);
    const liveSteps = chainItem
      ? [
        { id: chainItem.id, title: chainItem.title, date: toISODate(chainItem.date), complete: !!state.completedNodes[chainItem.id] },
        ...(chainItem.branchSteps || []).map((s) => ({ id: s.id, title: s.title, date: toISODate(s.date), complete: !!state.completedNodes[s.id] })),
      ]
      : [];

    const totalSteps = liveSteps.length || (opp.prepSteps?.length || 1);
    const completedSteps = liveSteps.filter((s) => s.complete).length;
    const outcomeNotes = liveSteps.map((s) => state.taskOutcomes[s.id]).filter(Boolean);

    return {
      id,
      name: opp.name,
      track: opp._track || null,
      trackLabel: opp._track ? TRACK_LABELS[opp._track] : null,
      recurring: !!opp.recurring,
      totalSteps,
      completedSteps,
      complete: totalSteps > 0 && completedSteps === totalSteps,
      steps: liveSteps,
      outcomeNotes,
    };
  });
}

function toISODate(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date;
}

function resolveProjects(state) {
  return (state.startedProjects || []).map((project) => {
    // Move: Build Your Own (see CLAUDE.md) — a "Build Your Own" project carries a REAL
    // `categoryId` (unlike the fully-synthetic 'ai-creative' sentinel this used before the
    // feature moved into Project Builder) but a synthetic `projectTypeId`
    // (BUILD_YOUR_OWN_PROJECT_TYPE_ID in ProjectBuilderScreen.jsx), so `findProjectType` still
    // correctly returns `null` for it. Reporting the REAL category label alongside an honest
    // "Build Your Own" framing instead of the raw synthetic id string — this profile is what a
    // LATER AI request reads back, so accurate category context still matters here.
    const resolved = project.aiSuggested ? null : findProjectType(project.categoryId, project.projectTypeId);
    const totalSteps = project.steps.length;
    const completedSteps = project.steps.filter((s) => state.completedNodes[s.id]).length;
    return {
      id: project.id,
      category: project.aiSuggested ? `${findCategory(project.categoryId)?.label || project.categoryId} (Build Your Own)` : (resolved?.category?.label || project.categoryId),
      projectType: project.aiSuggested ? 'AI-generated idea' : (resolved?.projectType?.name || project.projectTypeId),
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
function resolvePlanHistory(state, roadmap) {
  if (!state.educationLevel) return { tasks: [], customTasks: [] };

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
  // Computed once and shared by resolveOpportunities/resolvePlanHistory below (both previously
  // called generateRoadmap independently — resolveOpportunities didn't call it at all before the
  // AI-chain-suggestions fix, and this avoids the redundant second full computation that would
  // otherwise mean) — see resolveOpportunities' own comment for why it now needs live roadmap data
  // at all. `state.educationLevel` can be null (survey not yet complete); generateRoadmap handles
  // that safely (an empty spine), same as resolvePlanHistory's own pre-existing null guard did.
  const roadmap = state.educationLevel ? generateRoadmap(state) : { spine: [] };
  const { tasks, customTasks } = resolvePlanHistory(state, roadmap);

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
      opportunities: resolveOpportunities(state, roadmap),
      projects: resolveProjects(state),
    },
    planHistory: { tasks, customTasks },
  };
}

// AI Personalization, Stage 2 (see CLAUDE.md), Task 1 — a cost-efficient variant for the real API
// call: `basicProfile`/`academic`/`goals`/`activities` are reused verbatim from
// `compileStudentProfile` (already inherently small/bounded — a real student has at most a
// handful of careers/majors/programs/opportunities/projects, nothing here needs summarizing), but
// `planHistory` is replaced with a bounded summary instead of every task's full detail, so a real
// request stays roughly the same size whether the plan spans one year or four: a plain count, plus
// full detail ONLY for tasks with a written outcome note, the most recently completed few tasks,
// and incomplete tasks due soon. A task already covered by the outcome-notes list is excluded from
// the other two lists to avoid sending the same task twice.
const RECENT_COMPLETED_COUNT = 5;
const UPCOMING_WINDOW_DAYS = 45;
const UPCOMING_MAX_COUNT = 10;

export function compileSuggestionProfile(state, triggeringTaskId) {
  const full = compileStudentProfile(state);
  const { tasks } = full.planHistory;
  const today = getEffectiveToday(state.dateOverride);

  const withOutcome = tasks.filter((t) => t.outcomeNote);
  const withOutcomeIds = new Set(withOutcome.map((t) => t.id));

  const recentlyCompleted = tasks
    .filter((t) => t.complete && !withOutcomeIds.has(t.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, RECENT_COMPLETED_COUNT);

  const upcoming = tasks
    .filter((t) => !t.complete && !withOutcomeIds.has(t.id))
    .filter((t) => {
      const days = realDaysBetween(new Date(t.date), today);
      return days >= 0 && days <= UPCOMING_WINDOW_DAYS;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, UPCOMING_MAX_COUNT);

  return {
    ...full,
    planHistory: {
      counts: {
        total: tasks.length,
        completed: tasks.filter((t) => t.complete).length,
        incomplete: tasks.filter((t) => !t.complete).length,
      },
      tasksWithOutcomeNotes: withOutcome,
      recentlyCompleted,
      upcoming,
    },
    triggeringTask: tasks.find((t) => t.id === triggeringTaskId) || null,
  };
}
