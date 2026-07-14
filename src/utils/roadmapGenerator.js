import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { findOpportunity, PROGRESSION_LADDERS } from '../data/opportunities';
import { TRUNK_STAGES, STAGE_PLAN, DEFAULT_SCHOOL_YEAR, TRANSFER_CAVEAT } from '../data/trunkSteps';
import { BUILT_TRACKS, OPPORTUNITY_TRACKS } from '../data/interests';
import { getCourseById, ESTIMATED_COURSE_REQUEST_WINDOW } from '../data/courses';
import { getCourseById as getUCDavisCourseById } from '../data/ucdavisCourses';
import {
  QUARTER_LABELS,
  ESTIMATED_REGISTRATION_LEAD_DAYS,
  getNextQuarter,
  buildStageQuarterLists,
} from '../data/ucdavisQuarters';
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

// Map 2 (the per-year detail view) scopes the plan down to a single year-stage's real dates.
// `yearWindow` is `{ start, endExclusive, isCurrentYear }` (endExclusive `null` = unbounded, for
// the plan's last year) — see AcademicPlanScreen.jsx, which derives it from yearOverview.js's
// `yearStartDate`s. Omitting `yearWindow` entirely (or passing `null`) keeps the old unfiltered
// whole-plan behavior.
export function generateRoadmap(state, yearWindow = null) {
  const planStartDate = startOfToday();
  const level = state.educationLevel;
  const dateOverrides = state.nodeDateOverrides || {};
  const removed = state.removedNodeIds || {};

  // Looked up across EVERY built track, not just the student's own narrow interest-derived set
  // (getBuiltTracks(state.interestTags)) — Discovery's "Browse all careers" mode lets a student
  // select a career outside their own interests, and this needs to resolve it for the plan's own
  // title/personalization text (ctx.careerName below), same fix pattern as the opportunity lookup
  // above. A no-op for anything selected via "Recommended for you".
  const careerPool = getCareerPool(BUILT_TRACKS, level);
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

  // Looked up across EVERY opportunity track, not just getOpportunityTracks(state.interestTags)
  // (the narrow set derived from the student's own survey answers) — Opportunity Finder's "Browse
  // all opportunities" mode lets a student select an opportunity from a track outside their own
  // interests, and findOpportunity() below needs to be able to resolve it regardless of which
  // track it actually lives in. Widening this is a no-op for anything selected via the
  // "Recommended for you" view, since that narrower set is always a subset of OPPORTUNITY_TRACKS.
  const opportunityItems = buildOpportunityItems(
    OPPORTUNITY_TRACKS, level, state.selectedOpportunityIds, planStartDate, yearSpan, dateOverrides, removed,
  );

  const customItems = buildCustomItems(state.customTasks || [], dateOverrides, removed);
  const projectItems = buildProjectItems(state.startedProjects || [], dateOverrides, removed);

  // Course Selection Stage 4 — highschool-only, same gating as every Course Selection screen
  // (Transcript & GPA / Course Selection are unreachable for undergraduate/transfer, so
  // state.selectedCourseIds/courseCheckpoints are always empty for them in practice; this guard
  // makes that explicit rather than relying on incidental emptiness). A UC-Davis-selecting
  // Undergraduate/Transfer student gets the quarter-based analog instead (see
  // buildUCDavisQuarterItems below) — see CLAUDE.md's "UC Davis Partner School, Stage 4" section.
  const isCollegeAtUCDavis = (level === 'undergraduate' || level === 'transfer') && state.currentSchool === 'UC Davis';
  const courseItems = level === 'highschool'
    ? buildCourseItems(stageNames, state.selectedCourseIds, state.courseCheckpoints || {}, planStartDate, dateOverrides, removed)
    : isCollegeAtUCDavis
      ? buildUCDavisQuarterItems(state, stageNames, planStartDate, dateOverrides, removed)
      : [];

  const spineItems = [...coreItems, ...opportunityItems, ...customItems, ...projectItems, ...courseItems];

  // Scope to the selected year, if any. A non-current year uses that year's own start date as
  // the layout epoch instead of real "today" — the min-gap/collision math only ever depends on
  // DIFFERENCES between item dates, so this doesn't change any item's spacing relative to its
  // neighbors, it just keeps the canvas's own internal "day 0" sane for a year that isn't the one
  // actually happening right now (real "today" could sit far outside a future year's own span).
  // The current year's own start date IS real today by construction (see yearOverview.js), so
  // this is a no-op for that case — every item keeps positioning exactly as it always did.
  const isCurrentYearView = !yearWindow || yearWindow.isCurrentYear;
  const scopedItems = yearWindow ? filterItemsToYear(spineItems, yearWindow.start, yearWindow.endExclusive) : spineItems;
  const layoutToday = isCurrentYearView ? today : { ...today, date: yearWindow.start };

  const { today: laidToday, spine, canvasHeight, canvasWidth } = layoutRoadmap({ today: layoutToday, spineItems: scopedItems });

  const levelLabel = stageNames.length > 1 ? LEVEL_LABEL_MULTI_YEAR[level] : LEVEL_LABEL[level];

  return {
    title: titleFor(selectedCareers),
    subtitle: `A personalized ${levelLabel} plan, built from your profile.`,
    today: laidToday,
    // Only the year actually containing real "today" should show the "You are here" marker/
    // connector — Roadmap.jsx gates both on this.
    showToday: isCurrentYearView,
    spine,
    canvasHeight,
    canvasWidth,
    caveatNote,
  };
}

// A task belongs to whichever year its own real date falls in — no special-casing, including for
// Project Builder milestones or multi-step opportunity chains. Most items are single-step
// (`steps: null`) and either wholly belong to this year or don't. A multi-step chain's own anchor
// point (`item.date`/`item.title`/etc — for an opportunity this is a distinct summary dated at its
// first step; for a project, per buildProjectChain above, it literally IS the first step) and
// each of its `steps` are filtered independently by their own dates, since a chain can, in
// principle, straddle a year boundary (e.g. an opportunity's last prep weeks landing just before
// a year-stage rolls over):
//   - If the anchor's own date survives, the chain keeps its original anchor and just drops
//     whichever steps fell outside this year (recomputing `isLast` on what's left).
//   - If the anchor doesn't survive but later steps do, the earliest surviving step is promoted
//     to the anchor for this year's view — the same "first step doubles as anchor" shape
//     buildProjectChain already produces, rather than inventing a synthetic wrapper node.
//   - If nothing survives, the whole item is omitted from this year entirely.
function filterItemsToYear(items, start, endExclusive) {
  const inRange = (date) => date >= start && (endExclusive === null || date < endExclusive);

  return items.reduce((acc, item) => {
    if (!item.steps) {
      if (inRange(item.date)) acc.push(item);
      return acc;
    }

    const survivingSteps = item.steps.filter((s) => inRange(s.date));

    if (inRange(item.date)) {
      acc.push({
        ...item,
        steps: survivingSteps.length
          ? survivingSteps.map((s, i) => ({ ...s, isLast: i === survivingSteps.length - 1 }))
          : null,
      });
      return acc;
    }

    if (survivingSteps.length === 0) return acc;

    const [newAnchor, ...rest] = survivingSteps;
    acc.push({
      ...item,
      id: newAnchor.id,
      title: newAnchor.title,
      date: newAnchor.date,
      due: newAnchor.due,
      desc: newAnchor.desc,
      resources: newAnchor.resources,
      steps: rest.length ? rest.map((s, i) => ({ ...s, isLast: i === rest.length - 1 })) : null,
    });
    return acc;
  }, []);
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

// A started Project Builder project (see ProjectBuilderScreen.jsx / Roadmap.jsx's reveal-next-
// step flow). Unlike an opportunity, there's no separate "anchor" node distinct from its steps —
// the FIRST revealed step doubles as the anchor, titled with its own actual step text (e.g.
// "Define the problem your app will solve"), not the project's name. `project.steps` grows one
// entry at a time in Roadmap.jsx as the user completes each one, so this only ever has to lay
// out whatever's been revealed so far; a project with exactly one revealed step (freshly
// started) renders as a plain point (`steps: null`, matching `hasBranch === false`), exactly
// like a single custom task — the moment a second step is revealed, it becomes a real branch,
// same connector/isLast machinery as an opportunity chain. Every step (including the one acting
// as anchor) carries a `projectLabel` ("Name · Step X of Y") so Roadmap.jsx can show project
// context under the title without overwriting it — recomputed after the date-sort below so the
// numbering always matches what's actually rendered in order.
function buildProjectItems(startedProjects, dateOverrides, removed) {
  return startedProjects
    .map((project) => buildProjectChain(project, dateOverrides, removed))
    .filter(Boolean);
}

function buildProjectChain(project, dateOverrides, removed) {
  let steps = project.steps
    .map((step) => {
      const realDate = dateOverrides[step.id] ? parseDateInputValue(dateOverrides[step.id]) : parseDateInputValue(step.date);
      return {
        id: step.id,
        title: step.title,
        date: realDate,
        due: formatDate(realDate),
        desc: step.desc || `Part of your ${project.projectName} project.`,
        resources: [],
      };
    })
    .filter((step) => !removed[step.id]);

  if (steps.length === 0) return null;

  steps.sort((a, b) => a.date.getTime() - b.date.getTime());
  const total = steps.length;
  steps = steps.map((step, i) => ({
    ...step,
    category: 'project',
    isLast: i === total - 1,
    projectLabel: `${project.projectName} · Step ${i + 1} of ${total}`,
  }));

  const [anchor, ...branchSteps] = steps;

  return {
    id: anchor.id,
    title: anchor.title,
    category: 'project',
    required: false,
    coreType: 'project',
    date: anchor.date,
    due: anchor.due,
    desc: anchor.desc,
    resources: [],
    projectLabel: anchor.projectLabel,
    steps: branchSteps.length ? branchSteps : null,
  };
}

// Course Selection Stage 4 — wires Stage 3's course selections into real, dated, single-step
// roadmap tasks. Two kinds of item, both built through this same function:
//   - Stage 0's tasks come from `state.selectedCourseIds` (the "upcoming registration cycle"
//     picked during onboarding's Course Selection screen).
//   - A future stage's tasks come from that stage's own `courseCheckpoints[stageName].
//     selectedCourseIds`, populated once the student completes that checkpoint's Part 2 (see
//     buildCourseCheckpointItem below) — same shape, same builder, just a different source array
//     and a later stageIndex.
// Every item is required/single-step/core, so it flows through the exact same generic date-
// override/removal/positioning path every other core item already uses — no special-casing.
function buildCourseRequestItems(courseIds, requestStageIndex, isFinalRequestStage, planStartDate, dateOverrides, removed) {
  return courseIds
    .map((courseId) => {
      const course = getCourseById(courseId);
      if (!course) return null;
      const id = `course-request-${courseId}-y${requestStageIndex}`;
      if (removed[id]) return null;
      const templateDate = anchorDate({ ...ESTIMATED_COURSE_REQUEST_WINDOW, yearOffset: requestStageIndex }, planStartDate);
      const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
      return {
        id,
        title: isFinalRequestStage ? `Finalize your registration for ${course.name}` : `Request ${course.name} for next year`,
        category: 'core',
        required: true,
        coreType: 'course-request',
        date: realDate,
        due: formatDate(realDate),
        desc: `${course.name} (${course.department}). This date is an estimate of Roslyn's course-request window, not a published deadline — check with your counselor for the exact date.`,
        resources: [],
        steps: null,
      };
    })
    .filter(Boolean);
}

// One two-part "revisit" checkpoint per future high-school year except the last (see
// generateRoadmap's yearSpan-2 upper bound) — dated within the CHECKPOINT's own stage, since
// that's when the registration act for the FOLLOWING stage's courses actually happens (same
// "request now, take next year" timing buildCourseRequestItems already uses for stage 0). Unlike
// every other item here, this one carries no `steps` chain — its "two sequential parts" are
// handled entirely through Roadmap.jsx's own special modal for `coreType === 'course-checkpoint'`
// (see checkpointStageName below, which that modal reads to know which
// state.courseCheckpoints[...] entry it's driving), not through a branch on the spine.
function buildCourseCheckpointItem(stageName, targetStageName, stageIndex, planStartDate, dateOverrides, removed) {
  const id = `course-checkpoint-${stageName}`;
  if (removed[id]) return null;
  const templateDate = anchorDate({ ...ESTIMATED_COURSE_REQUEST_WINDOW, yearOffset: stageIndex }, planStartDate);
  const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
  const targetLabel = TRUNK_STAGES.highschool[targetStageName].label;
  return {
    id,
    title: `Update your courses for ${targetLabel}`,
    category: 'core',
    required: true,
    coreType: 'course-checkpoint',
    date: realDate,
    due: formatDate(realDate),
    desc: `Two steps: update your transcript with the courses you just completed, then select your courses for ${targetLabel} (checked against real prerequisites). This date is an estimate of Roslyn's course-request window, not a published deadline.`,
    resources: [],
    steps: null,
    checkpointStageName: stageName,
  };
}

function buildCourseItems(stageNames, selectedCourseIds, courseCheckpoints, planStartDate, dateOverrides, removed) {
  const yearSpan = stageNames.length;
  const items = buildCourseRequestItems(selectedCourseIds, 0, yearSpan === 1, planStartDate, dateOverrides, removed);

  // Every future stage except the last gets a checkpoint (Task 3 — a 12th grader / the plan's
  // final stage has no next Roslyn cycle to register for, so this range is empty for them: for
  // yearSpan <= 2 there is no stageIndex satisfying 1 <= i <= yearSpan-2).
  for (let stageIndex = 1; stageIndex <= yearSpan - 2; stageIndex += 1) {
    const stageName = stageNames[stageIndex];
    const checkpointItem = buildCourseCheckpointItem(stageName, stageNames[stageIndex + 1], stageIndex, planStartDate, dateOverrides, removed);
    if (checkpointItem) items.push(checkpointItem);

    const checkpoint = courseCheckpoints[stageName];
    if (checkpoint?.selectedCourseIds?.length) {
      items.push(...buildCourseRequestItems(checkpoint.selectedCourseIds, stageIndex, false, planStartDate, dateOverrides, removed));
    }
  }

  return items;
}

// UC Davis Course Selection Stage 4 (see CLAUDE.md's own section for the full design rationale) —
// the quarter-system analog of buildCourseItems above. Unlike Roslyn's single yearly cadence,
// registration happens ~3x per academic year here, so the "one checkpoint per year" shape had to
// be decoupled: real quarter dates come from ucdavisQuarters.js's own real-calendar walk (not
// this app's usual today-relative template system — see that file's own header comment for why),
// grouped into one array per plan stage via buildStageQuarterLists. The very first quarter slot
// of the very first stage is special: it's the quarter Stage 3's onboarding selections
// (state.selectedUCDavisCourseIds) are actually FOR, so it becomes real enrollment tasks directly
// — no checkpoint needed, exactly mirroring how Roslyn's stage-0 course-request items come
// straight from state.selectedCourseIds with no checkpoint. Every other quarter slot gets its own
// checkpoint task (two-part only for 'fall', single-part otherwise, 'summer' explicitly optional
// via required: false) plus — once that checkpoint's own selectedCourseIds is populated — real
// enrollment tasks for whatever was selected, same "checkpoint produces dated tasks" coexistence
// buildCourseItems already established for Roslyn.
function buildUCDavisQuarterItems(state, stageNames, planStartDate, dateOverrides, removed) {
  const yearSpan = stageNames.length;
  const next = getNextQuarter(planStartDate);
  const stageQuarterLists = buildStageQuarterLists(next.quarter, next.calendarYear, yearSpan);
  const checkpoints = state.ucdavisQuarterCheckpoints || {};
  const items = [];

  stageQuarterLists.forEach((quarters, stageIndex) => {
    const stageName = stageNames[stageIndex];
    quarters.forEach((slot, slotIndex) => {
      if (stageIndex === 0 && slotIndex === 0) {
        items.push(...buildUCDavisEnrollmentItems(
          state.selectedUCDavisCourseIds || [], stageName, slot, planStartDate, dateOverrides, removed,
        ));
        return;
      }

      const checkpointItem = buildUCDavisCheckpointItem(stageName, slot, planStartDate, dateOverrides, removed);
      if (checkpointItem) items.push(checkpointItem);

      const record = checkpoints[stageName]?.[slot.quarter];
      if (record?.selectedCourseIds?.length) {
        items.push(...buildUCDavisEnrollmentItems(record.selectedCourseIds, stageName, slot, planStartDate, dateOverrides, removed));
      }
    });
  });

  return items;
}

// Clamps an estimated date to never land before tomorrow — same defensive clamp
// buildStepsChain's own `earliestStart` already applies to opportunity prep windows, needed here
// too since "registration window" (quarter start minus a fixed lead time) could land in the past
// if the quarter itself starts very soon relative to when the student opens the app.
function clampToFuture(date, planStartDate) {
  const earliest = realAddDays(planStartDate, 1);
  return date < earliest ? earliest : date;
}

function buildUCDavisEnrollmentItems(courseIds, stageName, slot, planStartDate, dateOverrides, removed) {
  const quarterLabel = QUARTER_LABELS[slot.quarter];
  return courseIds
    .map((courseId) => {
      const course = getUCDavisCourseById(courseId);
      if (!course) return null;
      const id = `ucdavis-enroll-${courseId}-${stageName}-${slot.quarter}`;
      if (removed[id]) return null;
      const templateDate = clampToFuture(realAddDays(slot.startDate, -ESTIMATED_REGISTRATION_LEAD_DAYS), planStartDate);
      const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
      return {
        id,
        title: `Enroll in ${course.code} for ${quarterLabel} quarter`,
        category: 'core',
        required: true,
        coreType: 'ucdavis-enrollment',
        date: realDate,
        due: formatDate(realDate),
        desc: `${course.name} (${course.department}). This date is an estimate of UC Davis's registration window (~${ESTIMATED_REGISTRATION_LEAD_DAYS} days before ${quarterLabel} quarter begins), not a published deadline — check Schedule Builder for your exact pass time.`,
        resources: [],
        steps: null,
      };
    })
    .filter(Boolean);
}

// One checkpoint per quarter slot except the very first slot of the plan (handled directly by
// buildUCDavisQuarterItems above, no checkpoint needed there). Fall is the only two-part one
// (transcript + course selection, mirroring Roslyn's course-checkpoint exactly); Winter/Spring
// are single-part (course selection only — no transcript re-prompt, since that year's courses
// aren't graded yet); Summer is single-part AND `required: false`, which alone is enough to make
// it render as the same hollow/dashed "optional" ring every optional opportunity already uses —
// no new ring-rendering logic needed (see Roadmap.jsx's own three-way required/custom/dashed
// branch). Deliberately does NOT do prerequisite-locking the way Roslyn's Part 2 does — Stage 2's
// own catalog fetch never captured per-course prerequisite text for UC Davis (see
// UCDavisCourseCard's own comment in CourseSelectionScreen.jsx), so there's no real data to check
// against; fabricating a prerequisite rule here would be the exact "guess instead of parse" this
// codebase's standing rule already forbids elsewhere.
function buildUCDavisCheckpointItem(stageName, slot, planStartDate, dateOverrides, removed) {
  const id = `ucdavis-checkpoint-${stageName}-${slot.quarter}`;
  if (removed[id]) return null;
  const isTwoPart = slot.quarter === 'fall';
  const isOptional = slot.quarter === 'summer';
  const quarterLabel = QUARTER_LABELS[slot.quarter];
  const templateDate = clampToFuture(realAddDays(slot.startDate, -ESTIMATED_REGISTRATION_LEAD_DAYS), planStartDate);
  const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
  return {
    id,
    title: isTwoPart
      ? `Update your transcript & select ${quarterLabel} quarter courses`
      : `Select your ${quarterLabel} quarter courses${isOptional ? ' (optional)' : ''}`,
    category: 'core',
    required: !isOptional,
    coreType: 'ucdavis-checkpoint',
    date: realDate,
    due: formatDate(realDate),
    desc: isTwoPart
      ? `Two steps: update your transcript with your final grades, then select your ${quarterLabel} quarter courses — this also refreshes your GPA everywhere it's used, including Reach/Match/Safety. This date is an estimate of UC Davis's registration window, not a published deadline.`
      : `Select which courses you're planning to take ${quarterLabel} quarter${isOptional ? ' — this is entirely optional, not every student takes summer courses' : ''}. This date is an estimate of UC Davis's registration window, not a published deadline.`,
    resources: [],
    steps: null,
    checkpointStageName: stageName,
    checkpointQuarter: slot.quarter,
    checkpointIsTwoPart: isTwoPart,
  };
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
      resources: opp.stepResources?.[i] || [],
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
