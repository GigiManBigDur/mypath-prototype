import { MAJORS } from '../data/majors';
import { getCareerPool } from '../data/careers';
import { getMergedPrograms } from '../data/programs';
import { getSchoolDeadlineInfo, schoolRequiresSupplement, realDeadlineDate } from '../data/collegeDeadlines';
import { findOpportunity, PROGRESSION_LADDERS } from '../data/opportunities';
import { TRUNK_STAGES, STAGE_PLAN, DEFAULT_SCHOOL_YEAR, TRANSFER_CAVEAT, getStage0TargetLabel } from '../data/trunkSteps';
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
import { anchorDate, formatDate, getEffectiveToday, realAddDays, realDaysBetween, parseDateInputValue } from './dates';
import { isInternationalStudent } from './internationalStudent';

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
  // Real-Time Tracking feature (see CLAUDE.md) — resolves through the tester-set override
  // (state.dateOverride) when one is active, real device date otherwise. Every date in this
  // whole plan is computed relative to this ONE value (anchorDate() calls throughout), so an
  // active override consistently shifts the entire "today"-anchored timeline, not just the
  // "You are here" marker's own display.
  const planStartDate = getEffectiveToday(state.dateOverride);
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

  // Single-step items — every core admissions/milestone task, flattened across however many
  // year-stages the student's schoolYear pulls in. Almost all of these are Required
  // (`required: true`, the default whenever a trunk step doesn't say otherwise) — a small handful
  // (the post-acceptance phase's own genuinely optional steps, e.g. a financial aid appeal or a
  // waitlist letter of continued interest — see trunkSteps.js) set `required: false` directly in
  // their own data, read here via `step.required !== false` rather than the old hardcoded
  // `required: true`, so an explicit `false` is honored while every other step (which never sets
  // this field at all) still defaults to Required exactly as before. None of these carry a `steps`
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
          required: step.required !== false,
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
    state.aiChainInsertions || {},
  );

  const customItems = buildCustomItems(state.customTasks || [], dateOverrides, removed);
  const projectItems = buildProjectItems(state.startedProjects || [], dateOverrides, removed, state.completedNodes || {});
  const aiSuggestedItems = buildAiSuggestedItems(state.aiSuggestedTasks || [], dateOverrides, removed);

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

  // Per-School Application Deadlines & Supplemental Essays (see CLAUDE.md) — highschool-only:
  // undergraduate/transfer students' own selected `programs` are grad-school programs (LEVEL_LABEL
  // below already treats `undergraduate` as "graduate-school"), a genuinely different application
  // cycle this feature's own real/pattern deadline research doesn't cover. Replaces the old static
  // "Submit all college applications" trunk step (`t5`, removed from trunkSteps.js) with real,
  // per-school tasks generated fresh from `selectedPrograms` every time this function runs — see
  // buildApplicationItems' own header comment for why this needs no separate "did the selection
  // change" tracking to satisfy Task 5's own regeneration requirement.
  const applicationItems = level === 'highschool'
    ? buildApplicationItems(selectedPrograms, stageNames, planStartDate, dateOverrides, removed)
    : [];

  // Fill Out the High School Academic Plan (see CLAUDE.md) — highschool-only, same reasoning as
  // applicationItems above: both the personal-statement chain and AP exam registration/testing
  // are Roslyn-catalog-specific content (`courses.js`'s own `weightCategory`), with no
  // undergraduate/transfer equivalent this feature covers.
  const seniorStageIndex = stageNames.indexOf('senior');
  const personalStatementItem = level === 'highschool' && seniorStageIndex !== -1
    ? buildPersonalStatementChain(seniorStageIndex, planStartDate, dateOverrides, removed)
    : null;
  const apExamItems = level === 'highschool'
    ? buildApExamItems(stageNames, state.selectedCourseIds, state.courseCheckpoints || {}, planStartDate, dateOverrides, removed)
    : [];

  // Real International Student Logic: Citizenship + Current Location Together (see CLAUDE.md) —
  // applies at every education level (unlike applicationItems/personalStatementItem/apExamItems
  // above), since TOEFL/IELTS and F-1 visa logistics are the same real process whether applying
  // to undergrad, grad school, or transferring — see buildInternationalStudentItems' own header
  // comment for the full citizenship + partner-school branching.
  const internationalItems = buildInternationalStudentItems(state, stageNames, planStartDate, dateOverrides, removed);

  const spineItems = [
    ...coreItems, ...opportunityItems, ...customItems, ...projectItems, ...courseItems,
    ...applicationItems, ...(personalStatementItem ? [personalStatementItem] : []), ...apExamItems,
    ...internationalItems, ...aiSuggestedItems,
  ];

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

  // Date-cluster feature (see CLAUDE.md) — generalizes the Real-Time Tracking feature's own
  // "You are here + today's one task" merge to ANY 2+ top-level spine items sharing the exact
  // same real date (required, custom, or opportunity-chain items alike), not just a today
  // collision. Grouped by calendar day (`toDateString()`, not `getTime()` — two items dated the
  // same day always share midnight already, since every date in this app is constructed at
  // midnight, but this is the more obviously-correct key regardless). Purely a "which items, if
  // any, share a date" pointer — a display-only field, not a positioning change; Roadmap.jsx
  // decides how to fold each cluster's members into one marker instead of rendering them
  // individually. Scoped to top-level spine items only (not branch sub-steps, which have no
  // marker of their own to cluster with — matching `todayCollision`'s own existing scope).
  const dateGroups = new Map();
  spine.forEach((item) => {
    const key = item.date.toDateString();
    if (!dateGroups.has(key)) dateGroups.set(key, []);
    dateGroups.get(key).push(item);
  });
  const dateClusters = [...dateGroups.values()]
    .filter((items) => items.length >= 2)
    .map((items) => ({
      id: `cluster-${items[0].id}`,
      date: items[0].date,
      items,
      // Only the year actually containing real "today" can have a "today cluster" — same
      // `isCurrentYearView` gate `todayCollision` below already uses.
      isToday: isCurrentYearView && realDaysBetween(items[0].date, laidToday.date) === 0,
    }));

  // Real-Time Tracking feature, Task 3 (see CLAUDE.md) — when "You are here" lands on the exact
  // same real date as EXACTLY ONE other spine item, the two are meant to read as one combined
  // moment on the map, not two separate close-but-distinct markers — Roadmap.jsx folds
  // `todayCollision`'s own rendering into the "today" marker. Deliberately only set when today's
  // date matches a single item (`todayMatches.length === 1`) — 2+ matches is now a date CLUSTER
  // instead (see `dateClusters` above, `isToday: true` entry), which gets its own distinct
  // cluster-flagged-as-today treatment rather than reusing this single-item merge shape.
  const todayMatches = isCurrentYearView
    ? spine.filter((item) => realDaysBetween(item.date, laidToday.date) === 0)
    : [];
  const todayCollision = todayMatches.length === 1 ? todayMatches[0] : null;

  return {
    title: titleFor(selectedCareers),
    subtitle: `A personalized ${levelLabel} plan, built from your profile.`,
    today: laidToday,
    // Only the year actually containing real "today" should show the "You are here" marker/
    // connector — Roadmap.jsx gates both on this.
    showToday: isCurrentYearView,
    todayCollision,
    dateClusters,
    spine,
    canvasHeight,
    canvasWidth,
    caveatNote,
  };
}

// A task belongs to whichever year its own real date falls in — no special-casing, including for
// Project Builder milestones or multi-step opportunity chains. Most items are single-step
// (`steps: null`) and either wholly belong to this year or don't. A multi-step chain's own anchor
// point (`item.date`/`item.title`/etc — for both an opportunity and a project, per
// buildFirstYearChain/buildEscalationChain/buildProjectChain above, this literally IS the chain's
// own first step, not a separate summary node) and each of its `steps` are filtered independently
// by their own dates, since a chain can, in principle, straddle a year boundary (e.g. an
// opportunity's last prep weeks landing just before a year-stage rolls over):
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

// AI Personalization, Stage 2 (see CLAUDE.md) — an ACCEPTED suggestion, mirroring buildCustomItems
// exactly (single-step, date-editable/removable/completable the same generic way every other core
// item already is), but its own `category: 'ai-suggested'` — deliberately NOT folded into
// `customTasks`, which specifically means "the student typed this in themselves." Once accepted,
// this behaves like any normal task in every other respect; only the ring style/color differ (see
// Roadmap.jsx's own CORE_TYPE_CONFIG/ring-rendering).
function buildAiSuggestedItems(aiSuggestedTasks, dateOverrides, removed) {
  return (aiSuggestedTasks || [])
    .filter((task) => !removed[task.id])
    .map((task) => {
      const templateDate = parseDateInputValue(task.date);
      const realDate = dateOverrides[task.id] ? parseDateInputValue(dateOverrides[task.id]) : templateDate;
      return {
        id: task.id,
        title: task.title,
        category: 'ai-suggested',
        required: false,
        coreType: 'ai-suggested',
        date: realDate,
        due: formatDate(realDate),
        desc: task.desc || 'Suggested based on something you reported.',
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
// Two-Phase Generation (see CLAUDE.md) — a Build Your Own project started under the NEW
// overview-milestone shape (`project.overviewMilestones` present) is expanded into MULTIPLE spine
// items, one per overview phase, instead of the single chain `buildProjectChain` below produces —
// see `buildOverviewMilestoneChains`'s own header comment for the full shape. A curated (non-Build-
// Your-Own) project, or an OLD-shape Build Your Own project from before this restructure (plain
// `project.steps`/`guideSteps`), is completely unaffected — it still goes through
// `buildProjectChain` exactly as it always has.
function buildProjectItems(startedProjects, dateOverrides, removed, completedNodes) {
  return startedProjects.flatMap((project) => (project.overviewMilestones
    ? buildOverviewMilestoneChains(project, dateOverrides, removed, completedNodes)
    : [buildProjectChain(project, dateOverrides, removed)].filter(Boolean)));
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
  // AI Personalization, Stage 3: The Creative-Leap Layer (see CLAUDE.md) — a project born from an
  // accepted creative connection (no real curated PROJECT_CATEGORIES entry backs it) carries
  // `project.aiSuggested`, propagated onto every one of its own steps here — same convention
  // `buildFirstYearChain`'s own `track` field already established for opportunity chains — so
  // Roadmap.jsx's existing `s.aiSuggested`/`n.aiSuggested` sparkle-badge checks (already built for
  // Stage 2's chain-attached suggestions) show it here too with zero new rendering logic needed.
  steps = steps.map((step, i) => ({
    ...step,
    category: 'project',
    isLast: i === total - 1,
    projectLabel: `${project.projectName} · Step ${i + 1} of ${total}`,
    aiSuggested: !!project.aiSuggested,
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
    aiSuggested: !!project.aiSuggested,
    steps: branchSteps.length ? branchSteps : null,
  };
}

// A rough, HONESTLY-ESTIMATED gap between one overview phase and the next, used only until the
// earlier phase's own granular steps have actually been planned (see below) — the same "clearly-
// labeled estimate, refined once the real thing is known" posture ESTIMATED_COURSE_REQUEST_WINDOW
// (courses.js) already takes for a different kind of unknowable-in-advance date.
const ESTIMATED_MILESTONE_SPACING_DAYS = 21;

// Two-Phase Generation (see CLAUDE.md), Tasks 2/5 — each overview phase becomes its OWN spine
// item, in sequence, mirroring an opportunity chain's own shape exactly: the phase's own title/id
// IS the promoted anchor node (playing the same role an opportunity's own first prep step plays —
// e.g. "Register for DECA" is never a separate summary node either), with its later-generated
// granular `subSteps` (Task 4) becoming its diagonal branch once they exist. A phase with no
// subSteps yet renders as a plain point, exactly like a freshly-started curated project — the
// moment its steps are generated, it becomes a real branch, same connector/isLast machinery as
// everywhere else in this file.
//
// Locking (Task 2's own "only the first overview milestone is unlocked; every subsequent one is
// locked until the one before it is marked complete") is computed FRESH every time this runs, from
// `completedNodes` — the exact same "unlock is just a function of current real state, never a
// separately-stored flag that could drift out of sync" precedent this app's own hub tiles
// (`unlock: (state) => ...`, HubScreen.jsx) already established, extended here to spine nodes
// instead of hub tiles. A phase counts as done when EITHER its own anchor is marked complete
// directly (the same generic `toggleDone` every other node already supports — useful for a phase
// with no subSteps yet, or one the student considers done regardless of subStep completion) OR,
// once it has real subSteps, all of them are complete — matching Task 5's own explicit "or the
// milestone itself" wording.
//
// Dating: milestone 0 always has a REAL date — `project.startDate`, the date picked when "Start
// This Project" was confirmed. Every later phase's date is computed by a running cursor, never
// separately stored (so there's nothing to keep in sync as earlier phases get planned): once a
// phase's own granular steps exist, the cursor advances to the day after its own real, student-
// picked `targetDate` (see MilestonePlanningPanel.jsx); until then, it advances by the fixed
// ESTIMATED_MILESTONE_SPACING_DAYS placeholder above — an honest, clearly-a-guess gap for a phase
// nobody has actually thought through the timing of yet (this is also literally why later phases
// read as more loosely positioned before they're reached — "later phases get planned once earlier
// ones are actually done," per this feature's own stated rationale, not a bug in the spacing).
function buildOverviewMilestoneChains(project, dateOverrides, removed, completedNodes) {
  const milestones = project.overviewMilestones || [];
  if (milestones.length === 0) return [];

  const items = [];
  let cursor = parseDateInputValue(project.startDate);
  let previousDone = true; // milestone 0 is always unlocked, regardless of any "previous" concept

  milestones.forEach((m, i) => {
    const anchorDate = cursor;

    let branchSteps = [];
    if (m.subSteps && m.subSteps.length) {
      branchSteps = m.subSteps
        .filter((s) => !removed[s.id])
        .map((s) => {
          const real = dateOverrides[s.id] ? parseDateInputValue(dateOverrides[s.id]) : parseDateInputValue(s.date);
          return { id: s.id, title: s.title, date: real, due: formatDate(real), desc: s.desc || '', resources: [] };
        });
      branchSteps.sort((a, b) => a.date.getTime() - b.date.getTime());
      branchSteps = branchSteps.map((s, idx) => ({
        ...s,
        category: 'project',
        isLast: idx === branchSteps.length - 1,
        aiSuggested: true,
        projectLabel: `${project.projectName} · ${m.title}`,
      }));
    }

    const milestoneDone = !!completedNodes[m.id]
      || (branchSteps.length > 0 && branchSteps.every((s) => !!completedNodes[s.id]));
    const isLocked = !previousDone;
    const realAnchorDate = dateOverrides[m.id] ? parseDateInputValue(dateOverrides[m.id]) : anchorDate;

    if (!removed[m.id]) {
      items.push({
        id: m.id,
        title: m.title,
        category: 'project',
        required: false,
        coreType: 'project',
        date: realAnchorDate,
        due: formatDate(realAnchorDate),
        desc: m.desc || `Part of your ${project.projectName} project.`,
        resources: [],
        projectLabel: `${project.projectName} · Phase ${i + 1} of ${milestones.length}`,
        aiSuggested: true,
        locked: isLocked,
        lockedReason: isLocked ? `Complete "${milestones[i - 1].title}" first` : null,
        milestoneMeta: { projectId: project.id, milestoneId: m.id },
        steps: branchSteps.length ? branchSteps : null,
      });
    }

    // Advance the cursor for the NEXT phase — see this function's own header comment for why this
    // is computed fresh every time rather than stored.
    if (m.targetDate) {
      cursor = realAddDays(parseDateInputValue(m.targetDate), 1);
    } else if (branchSteps.length) {
      cursor = realAddDays(branchSteps[branchSteps.length - 1].date, 1);
    } else {
      cursor = realAddDays(anchorDate, ESTIMATED_MILESTONE_SPACING_DAYS);
    }
    // A removed phase doesn't block the sequence forever — treat it as "resolved" so the next one
    // can still unlock, the same way a removed required trunk task doesn't get to permanently gate
    // anything else either.
    previousDone = milestoneDone || !!removed[m.id];
  });

  return items;
}

// Course Selection Stage 4 — wires Stage 3's course selections into real, dated, single-step
// roadmap tasks. Two kinds of source, both built through this same function into ONE task per
// registration cycle (not one per course — see this function's own comment for why):
//   - Stage 0's task comes from `state.selectedCourseIds` (the "upcoming registration cycle"
//     picked during onboarding's Course Selection screen).
//   - A future stage's task comes from that stage's own `courseCheckpoints[stageName].
//     selectedCourseIds`, populated once the student completes that checkpoint's Part 2 (see
//     buildCourseCheckpointItem below) — same shape, same builder, just a different source array
//     and a later stageIndex.
// Every item is required/single-step/core, so it flows through the exact same generic date-
// override/removal/positioning path every other core item already uses — no special-casing.
//
// ONE spine task per registration cycle, not one per course — mirrors the exact same fix applied
// to UC Davis's buildUCDavisEnrollmentItem (see that function's own comment for the full
// rationale): every course requested in the same cycle shares the exact same request date, so
// one-node-per-course was pure visual clutter, a real, confirmed regression on any year with more
// than a couple selections. The full course list (name + department for each) lives in a real
// `courseList` array — Roadmap.jsx renders it as an actual `<ul>`, not a comma-joined sentence
// baked into `desc`. `targetLabel` (e.g. "Sophomore Year") names which year's courses this cycle
// is actually requesting — `null` only for `isFinalRequestStage` (no next Roslyn cycle to name).
// Returns null if every selected id failed to resolve to a real course, or the whole cycle's
// selection is empty.
//
// A large course count on one task is not itself a sign of a bug — confirmed the same way as the
// UC Davis case: Course Selection's own "Recommended for you" view merges across every selected
// interest track with no course-load cap (the Survey's own interest-tag picker has no selection
// cap either — see its own header comment), so a student with several interest tags can
// legitimately end up recommended (and select) more than a single year's real load (8 classes for
// 9th/10th grade, 7 for 11th, 6 for 12th, per the app's own Course Load Per Grade policy data).
// Each cycle's own id (`y${requestStageIndex}`) and each checkpoint's own nested
// `courseCheckpoints[stageName].selectedCourseIds` stay fully isolated from every other cycle's —
// there is no merging-across-years bug, only a real selection that now displays as a scannable
// list instead of a run-on paragraph.
function buildCourseRequestItem(courseIds, requestStageIndex, isFinalRequestStage, targetLabel, planStartDate, dateOverrides, removed) {
  const courses = courseIds.map((courseId) => getCourseById(courseId)).filter(Boolean);
  if (courses.length === 0) return null;

  const id = `course-request-y${requestStageIndex}`;
  if (removed[id]) return null;
  const templateDate = anchorDate({ ...ESTIMATED_COURSE_REQUEST_WINDOW, yearOffset: requestStageIndex }, planStartDate);
  const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;

  return {
    id,
    title: isFinalRequestStage ? 'Finalize your course registration' : `Request your ${targetLabel} courses`,
    category: 'core',
    required: true,
    coreType: 'course-request',
    date: realDate,
    due: formatDate(realDate),
    desc: "This date is an estimate of Roslyn's course-request window, not a published deadline — check with your counselor for the exact date.",
    courseList: courses.map((course) => `${course.name} (${course.department})`),
    resources: [],
    steps: null,
  };
}

// One two-part "revisit" checkpoint per future high-school year except the last (see
// generateRoadmap's yearSpan-2 upper bound) — dated within the CHECKPOINT's own stage, since
// that's when the registration act for the FOLLOWING stage's courses actually happens (same
// "request now, take next year" timing buildCourseRequestItem already uses for stage 0). Unlike
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

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Per-School Application Deadlines & Supplemental Essays (see CLAUDE.md). Generated fresh from
// `selectedPrograms` (the SAME array generateRoadmap() already derives from
// state.selectedProgramKeys for the plan's own title/personalization text) every time this
// function runs — there is no separate cache/snapshot of "the programs the student had selected
// when this task was first created," so Task 5's own "regenerate as selections change"
// requirement falls out for free, the same way every other selection-driven spine item in this
// file already works (opportunityItems, courseItems, etc.).
//
// Deduped by INSTITUTION, not by individual program key — a real student submits ONE application
// to a school regardless of how many of that school's own programs/majors they're considering
// there (Common App-style platforms don't support "apply twice to the same school"), so two
// selected programs at the same institution produce exactly one submission task (and, if
// applicable, one supplement/PIQ task), not a confusing duplicate of each.
//
// Anchored at the SENIOR stage specifically (`stageNames.indexOf('senior')`) — the same
// year-offset the old static `t5` step (see trunkSteps.js, now removed) always resolved to,
// since 'senior' is always the final stage in STAGE_PLAN.highschool regardless of which
// schoolYear (9-12) produced the current stage sequence — so a student years out from actually
// applying (e.g. a 9th-grader) still gets these tasks generated now, correctly positioned on
// their own future senior year.
function buildApplicationItems(selectedPrograms, stageNames, planStartDate, dateOverrides, removed) {
  const seniorStageIndex = stageNames.indexOf('senior');
  if (seniorStageIndex === -1 || selectedPrograms.length === 0) return [];

  const byInstitution = new Map();
  selectedPrograms.forEach((p) => {
    if (!byInstitution.has(p.institution)) byInstitution.set(p.institution, p);
  });

  const items = [];
  byInstitution.forEach((program, institution) => {
    const info = getSchoolDeadlineInfo(institution);
    // Real calendar-date math, not anchorDate()'s usual today-relative template offset — see
    // collegeDeadlines.js's own header comment for why a real admissions deadline needs this.
    const regularAnchor = realDeadlineDate(info.single || info.regular, planStartDate, seniorStageIndex);
    const regularDateStr = formatDate(regularAnchor);
    const earlyDateStr = info.early ? formatDate(realDeadlineDate(info.early, planStartDate, seniorStageIndex)) : null;
    const slug = slugify(institution);

    const applicationId = `application-${slug}`;
    if (!removed[applicationId]) {
      const realDate = dateOverrides[applicationId] ? parseDateInputValue(dateOverrides[applicationId]) : regularAnchor;
      items.push({
        id: applicationId,
        title: info.isVerified ? `Submit application to ${institution}` : `Submit application to ${institution} (Est.)`,
        category: 'core',
        required: true,
        coreType: 'college-application',
        date: realDate,
        due: formatDate(realDate),
        desc: describeApplicationDeadline(institution, info, regularDateStr, earlyDateStr),
        resources: ['Common App', 'Coalition App', `${institution}'s own admissions website`],
        steps: null,
      });
    }

    if (schoolRequiresSupplement(institution, program.selectivity)) {
      const supplementId = `supplement-${slug}`;
      if (!removed[supplementId]) {
        const templateDate = realAddDays(regularAnchor, -21);
        const realDate = dateOverrides[supplementId] ? parseDateInputValue(dateOverrides[supplementId]) : templateDate;
        items.push({
          id: supplementId,
          title: info.isUC
            ? `Complete ${institution}'s Personal Insight Questions`
            : info.isVerified ? `Complete ${institution}'s supplemental essays` : `Complete ${institution}'s supplemental essays (Est.)`,
          category: 'core',
          required: true,
          coreType: 'college-supplement',
          date: realDate,
          due: formatDate(realDate),
          desc: describeSupplementDeadline(institution, info),
          resources: info.isUC
            ? ['UC Personal Insight Questions — official prompts (admission.universityofcalifornia.edu)']
            : [`${institution}'s own supplemental essay prompts (published each application cycle)`],
          steps: null,
        });
      }
    }

    // Fill Out the High School Academic Plan (see CLAUDE.md), Tasks 4/5/7 — real testing and
    // documentation logistics that genuinely happen PER SCHOOL (score reports, transcripts, and
    // status tracking are each sent/checked separately, school by school, not once for the whole
    // list) — built in this same per-institution loop since they all reuse `info`/`regularAnchor`,
    // already resolved above, rather than re-deriving a second `byInstitution` map.
    const testDecisionId = `test-decision-${slug}`;
    if (!removed[testDecisionId]) {
      const templateDate = realAddDays(regularAnchor, -30);
      const realDate = dateOverrides[testDecisionId] ? parseDateInputValue(dateOverrides[testDecisionId]) : templateDate;
      items.push({
        id: testDecisionId,
        title: `Decide: submit scores to ${institution}, or apply test-optional?`,
        category: 'core',
        required: true,
        coreType: 'test-decision',
        date: realDate,
        due: formatDate(realDate),
        desc: `Check ${institution}'s own current testing policy — many schools are test-optional now, but whether submitting a strong score helps your application still varies school to school.`,
        resources: [`${institution}'s own admissions website (testing policy)`],
        steps: null,
      });
    }

    const scoreReportId = `score-report-${slug}`;
    if (!removed[scoreReportId]) {
      const templateDate = realAddDays(regularAnchor, -14);
      const realDate = dateOverrides[scoreReportId] ? parseDateInputValue(dateOverrides[scoreReportId]) : templateDate;
      items.push({
        id: scoreReportId,
        title: `Send SAT/ACT scores to ${institution}`,
        category: 'core',
        required: true,
        coreType: 'score-report',
        date: realDate,
        due: formatDate(realDate),
        desc: 'Only relevant if you\'re submitting scores — official reports are sent directly from College Board or ACT, not by you, and can take a week or more to arrive.',
        resources: ['College Board Send Scores (official)', 'ACT Score Reports (official)'],
        steps: null,
      });
    }

    const transcriptId = `transcript-request-${slug}`;
    if (!removed[transcriptId]) {
      // -12 days, deliberately not -10 — PATTERN_DATES' own private (Jan 5) and public-non-UC
      // (Jan 15) regular deadlines are EXACTLY 10 days apart, so a -10 offset here would mean any
      // selection spanning one unverified private AND one unverified public school always collides
      // (a private school's own application date landing on the exact same day as a DIFFERENT
      // public school's own transcript-request) — a real, confirmed structural collision, not a
      // one-off coincidence, caught via a dense multi-school test selection.
      const templateDate = realAddDays(regularAnchor, -12);
      const realDate = dateOverrides[transcriptId] ? parseDateInputValue(dateOverrides[transcriptId]) : templateDate;
      items.push({
        id: transcriptId,
        title: `Send your transcript to ${institution}`,
        category: 'core',
        required: true,
        coreType: 'transcript-request',
        date: realDate,
        due: formatDate(realDate),
        desc: 'Your school counselor\'s office sends this directly — ask early, since a busy counseling office may need lead time, especially around a shared deadline for the rest of your senior class.',
        resources: [],
        steps: null,
      });
    }

    const trackStatusId = `track-status-${slug}`;
    if (!removed[trackStatusId]) {
      const templateDate = realAddDays(regularAnchor, 14);
      const realDate = dateOverrides[trackStatusId] ? parseDateInputValue(dateOverrides[trackStatusId]) : templateDate;
      items.push({
        id: trackStatusId,
        title: `Track your application status at ${institution}`,
        category: 'core',
        required: false,
        coreType: 'track-status',
        date: realDate,
        due: formatDate(realDate),
        desc: `A light check-in — log into ${institution}'s own applicant portal and confirm every required document actually arrived.`,
        resources: [],
        steps: null,
      });
    }
  });

  return items;
}

// Task 4's own "(Est.)" honesty requirement — a verified school's own note is still a real "these
// can shift by a day or two, confirm before applying" caveat, just a much lighter one than the
// full "typical deadline for this type of school" framing a pattern-derived date needs.
function describeApplicationDeadline(institution, info, regularDateStr, earlyDateStr) {
  if (info.isUC) {
    return info.isVerified
      ? `${institution}'s application deadline — the UC system uses one single deadline, no Early Decision/Action option. Even verified deadlines can shift by a day or two — confirm the exact date on the UC application portal before applying.`
      : `(Est.) Typical deadline for this type of school — confirm the exact date closer to application season, as these can shift slightly year to year. UC-system schools use one single deadline (${regularDateStr} here), no Early Decision/Action option.`;
  }
  return info.isVerified
    ? `${institution}'s Regular Decision deadline. Early Action/Decision, if you're applying that way, is due ${earlyDateStr}. Even verified deadlines can shift by a day or two — confirm the exact date on ${institution}'s own admissions site before applying.`
    : `(Est.) Typical deadline for this type of school — confirm the exact date closer to application season, as these can shift slightly year to year. This Regular Decision estimate is ${regularDateStr}; if ${institution} offers Early Action/Decision, that's typically around ${earlyDateStr}.`;
}

// The "a few weeks before" offset (21 real days) is itself a general best-practice
// recommendation, not an independently verified per-school fact, even for one of the 5 verified
// application-deadline schools — so this always carries its own honest caveat about the offset,
// regardless of whether the underlying application deadline itself is verified or pattern-based.
function describeSupplementDeadline(institution, info) {
  const base = info.isUC
    ? "Draft and polish your Personal Insight Questions (PIQs) — the UC system's own required short-answer prompts, used across every UC campus, in place of a Common App-style supplement."
    : `Draft and polish ${institution}'s own required supplemental essays, on top of your main Common App essay.`;
  const estimateNote = info.isVerified
    ? "This due date gives you a few weeks of buffer before the real application deadline — a general best-practice cushion, not an independently confirmed date."
    : "(Est.) Typical deadline for this type of school — confirm the exact date closer to application season, as these can shift slightly year to year. This due date gives you a few weeks of buffer before the estimated application deadline.";
  return `${base} ${estimateNote}`;
}

function buildCourseItems(stageNames, selectedCourseIds, courseCheckpoints, planStartDate, dateOverrides, removed) {
  const yearSpan = stageNames.length;
  const isFinalRequestStage = yearSpan === 1;
  // Stage 0's own Course Selection (Stage 3's onboarding pick) targets the CURRENT stage
  // (stageNames[0]) directly — a real, confirmed off-by-one bug used to target stageNames[1]
  // (the year AFTER the current one) instead, so a 9th-grader answering "Freshman" on the Survey
  // ended up with Course Selection targeting "Sophomore Year." That off-by-one came from
  // conflating stage 0's onboarding selection with a CHECKPOINT's own "register now for next
  // year" pattern (which stays correct and unchanged below — a checkpoint fires mid-plan and
  // legitimately preps the FOLLOWING stage's courses in advance, the normal "spring registration
  // for next fall" pattern). Stage 0 is different: it's the very first, immediate Course
  // Selection a student does during onboarding, representing "what you're taking this year" —
  // per the Survey's own reworded question ("What grade are you entering / about to start?"),
  // stageNames[0] already IS that grade, so no +1 shift belongs here.
  // getStage0TargetLabel (trunkSteps.js) is the single shared source for this value —
  // CourseSelectionScreen.jsx's own on-screen scope-clarifying banner reads the exact same
  // function, so the two can never drift out of sync the way they once did (see that function's
  // own comment for the real, confirmed drift this fixes).
  const stage0TargetLabel = getStage0TargetLabel(stageNames);
  const items = [];
  const stage0Item = buildCourseRequestItem(selectedCourseIds, 0, isFinalRequestStage, stage0TargetLabel, planStartDate, dateOverrides, removed);
  if (stage0Item) items.push(stage0Item);

  // Every future stage except the last gets a checkpoint (Task 3 — a 12th grader / the plan's
  // final stage has no next Roslyn cycle to register for, so this range is empty for them: for
  // yearSpan <= 2 there is no stageIndex satisfying 1 <= i <= yearSpan-2).
  for (let stageIndex = 1; stageIndex <= yearSpan - 2; stageIndex += 1) {
    const stageName = stageNames[stageIndex];
    const targetStageName = stageNames[stageIndex + 1];
    const checkpointItem = buildCourseCheckpointItem(stageName, targetStageName, stageIndex, planStartDate, dateOverrides, removed);
    if (checkpointItem) items.push(checkpointItem);

    const checkpoint = courseCheckpoints[stageName];
    if (checkpoint?.selectedCourseIds?.length) {
      const targetLabel = TRUNK_STAGES.highschool[targetStageName].label;
      const item = buildCourseRequestItem(checkpoint.selectedCourseIds, stageIndex, false, targetLabel, planStartDate, dateOverrides, removed);
      if (item) items.push(item);
    }
  }

  return items;
}

// Fill Out the High School Academic Plan (see CLAUDE.md), Task 8 — tied to REAL Course Selection
// data, not guessed: mirrors buildCourseItems' own per-stage/per-checkpoint iteration exactly,
// checking each stage's own real selected course list (stage 0's `selectedCourseIds`, or a future
// stage's own `courseCheckpoints[stageName].selectedCourseIds`) for at least one AP-weighted
// course (courses.js's own `weightCategory === 'ap'`). Deliberately does NOT also try to infer a
// future exam from `state.transcript` — a transcript entry is already-completed, past-tense
// coursework with a grade recorded, not a genuine future exam to plan for, so checking it wouldn't
// usefully predict anything. A checkpoint's own selections are for the FOLLOWING stage (see
// buildCourseCheckpointItem's own comment — the registration act happens one stage earlier than
// the courses/exam themselves), so each course list is paired with the stage it actually applies
// to (`targetYearOffset`), not the checkpoint's own registration stage — that's the year the
// student is really enrolled and the exam genuinely happens. At most one Register+Take pair per
// real year that has a real AP course selected; a plan with no AP courses selected anywhere
// produces nothing here at all.
function buildApExamItems(stageNames, selectedCourseIds, courseCheckpoints, planStartDate, dateOverrides, removed) {
  const yearSpan = stageNames.length;
  const items = [];

  const hasApCourse = (courseIds) => (courseIds || []).some((id) => getCourseById(id)?.weightCategory === 'ap');

  const addPairIfNeeded = (courseIds, targetYearOffset) => {
    if (!hasApCourse(courseIds)) return;

    const registerId = `ap-exam-register-y${targetYearOffset}`;
    if (!removed[registerId]) {
      // Nov 8, not Nov 5 — deliberately offset a few days from the senior year's own `sr-css-
      // profile` step (also Nov 5), which otherwise land on the exact same real date for any
      // senior with an AP course selected and correctly merge into one date-cluster marker (the
      // Date-Cluster feature working as designed) — a real, harmless case, but avoidable, and
      // avoiding it keeps each task independently visible on the spine without opening a cluster.
      const templateDate = anchorDate({ month: 11, day: 8, yearOffset: targetYearOffset }, planStartDate);
      const realDate = dateOverrides[registerId] ? parseDateInputValue(dateOverrides[registerId]) : templateDate;
      items.push({
        id: registerId,
        title: 'Register for your AP exam(s)',
        category: 'core',
        required: true,
        coreType: 'procedure',
        date: realDate,
        due: formatDate(realDate),
        desc: 'AP exam registration typically opens in the fall with a November deadline — check with your school\'s AP coordinator for the exact date.',
        resources: ['AP Exam Registration (official College Board site)'],
        steps: null,
      });
    }

    const takeId = `ap-exam-take-y${targetYearOffset}`;
    if (!removed[takeId]) {
      const templateDate = anchorDate({ month: 5, day: 5, yearOffset: targetYearOffset }, planStartDate);
      const realDate = dateOverrides[takeId] ? parseDateInputValue(dateOverrides[takeId]) : templateDate;
      items.push({
        id: takeId,
        title: 'Take your AP exam(s)',
        category: 'core',
        required: true,
        coreType: 'milestone',
        date: realDate,
        due: formatDate(realDate),
        desc: 'AP exams are administered in a fixed window each May — check the official schedule for your exact exam dates.',
        resources: ['AP Exam Schedule (official College Board site)'],
        steps: null,
      });
    }
  };

  // Stage 0's own current-year selections — the same source buildCourseItems' own stage-0 request
  // item already reads.
  addPairIfNeeded(selectedCourseIds, 0);

  // Every future checkpoint's own selections are FOR stageIndex + 1, same offset
  // buildCourseCheckpointItem's own targetStageName already uses.
  for (let stageIndex = 1; stageIndex <= yearSpan - 2; stageIndex += 1) {
    const stageName = stageNames[stageIndex];
    const checkpoint = courseCheckpoints[stageName];
    if (checkpoint?.selectedCourseIds?.length) {
      addPairIfNeeded(checkpoint.selectedCourseIds, stageIndex + 1);
    }
  }

  return items;
}

// Real International Student Logic: Citizenship + Current Location Together (see CLAUDE.md) —
// applies across all 3 education levels (unlike buildApplicationItems/buildApExamItems/
// buildPersonalStatementChain above, which are highschool-only Roslyn-catalog-specific content):
// standardized-testing/visa logistics are the same real-world process regardless of whether a
// student is applying to undergrad, grad school, or transferring. Anchored at the plan's own
// FINAL stage (stageNames.length - 1) — the same "senior"/"application" stage
// buildApplicationItems/buildPersonalStatementChain already anchor at for highschool, generalized
// to whichever stage is actually last for the student's own level, so a student years out from
// actually applying still gets these positioned on their own future final year, same precedent.
//
// International status derives entirely from isInternationalStudent(state) (citizenship !== US) —
// a blank/unanswered citizenship never triggers any of this, matching that field's own "don't
// guess" contract. A genuine US citizen gets none of this, unchanged from current behavior.
//
// Two distinct task sets, not one generic "international student" bucket — whether the student is
// ALREADY physically at a real US partner school (Roslyn High School or UC Davis — the same
// `hasPartnerSchool` check every other partner-school-aware screen in this app already computes,
// recomputed fresh here per this codebase's own per-file convention) changes which tasks actually
// still apply:
// - NOT yet at a partner school (applying from abroad for the first time): the full process —
//   TOEFL/IELTS, then (once accepted) the F-1 visa entry sequence (I-20, SEVIS I-901 fee, the
//   visa interview itself).
// - ALREADY at a partner school (already handled initial entry into the US): none of the above
//   applies again — a single, lighter "check with your school's international office" task
//   instead, about maintaining/transferring status for their next real academic step.
function buildInternationalStudentItems(state, stageNames, planStartDate, dateOverrides, removed) {
  if (!isInternationalStudent(state)) return [];

  const finalStageIndex = stageNames.length - 1;
  const hasPartnerSchool = state.currentSchool === 'Roslyn High School' || state.currentSchool === 'UC Davis';
  const items = [];

  const addItem = (id, title, coreType, date, desc, resources) => {
    if (removed[id]) return;
    const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : date;
    items.push({
      id, title, category: 'core', required: true, coreType,
      date: realDate, due: formatDate(realDate), desc, resources, steps: null,
    });
  };

  if (!hasPartnerSchool) {
    addItem(
      'intl-toefl-ielts',
      'Register for and take the TOEFL or IELTS exam',
      'toefl-ielts',
      anchorDate({ month: 9, day: 20, yearOffset: finalStageIndex }, planStartDate),
      "Most US schools require English proficiency proof from international applicants — register early, since test dates fill up and scores can take a couple of weeks to arrive.",
      ['ETS TOEFL (official)', 'IELTS (official)'],
    );
    // Dates deliberately don't land on `t6`/`pa-compare-aid`/transfer's own final-stage `t5`
    // (trunkSteps.js) — checked directly against every education level's own final-stage trunk
    // dates (senior/application) before picking these, the same collision-avoidance diligence
    // "Fill Out the High School Academic Plan" already documents elsewhere in this file (e.g. the
    // AP-exam-register Nov 8 vs. `sr-css-profile` Nov 5 note above). A coincidental collision with
    // a per-school DYNAMIC date (buildApplicationItems, above — those resolve to real calendar
    // dates that shift with "today") is left to the Date-Cluster feature's own graceful merge,
    // same as that feature's own documented precedent.
    addItem(
      'intl-i20-form',
      'Receive your I-20 form from your accepted school',
      'i20-form',
      anchorDate({ month: 4, day: 18, yearOffset: finalStageIndex }, planStartDate),
      "Your accepted school's international student office issues this once you've confirmed enrollment and submitted the required financial documentation — you'll need it for every step that follows.",
      ['US Department of State — Student Visa (official)'],
    );
    addItem(
      'intl-sevis-fee',
      'Pay the SEVIS I-901 fee',
      'sevis-fee',
      anchorDate({ month: 4, day: 26, yearOffset: finalStageIndex }, planStartDate),
      "Required before your visa interview — pay online and keep the receipt, you'll need to show it at your interview.",
      ['FMJfee.com — official SEVIS I-901 payment site'],
    );
    addItem(
      'intl-f1-visa-interview',
      'Schedule and attend your F-1 visa interview',
      'f1-visa-interview',
      anchorDate({ month: 5, day: 18, yearOffset: finalStageIndex }, planStartDate),
      'Book this as early as possible — wait times at US embassies/consulates vary widely and can take weeks, especially during peak season.',
      ['US Department of State — Visa Appointment Wait Times (official)'],
    );
  } else {
    // Aug 25 (10 days after Aug 15), not Sept 25 — deliberately BEFORE
    // `buildPersonalStatementChain`'s own earliest-reachable step date for a highschool senior
    // (that chain's own 5 steps spread across a window ending at a Nov 20 deadline, naturally
    // starting no earlier than ~day 27 after Aug 15 — this stays clear of it under ordinary
    // real-world usage, though since that chain's OWN window can compress arbitrarily close to
    // "today" if the app happens to be used very close to its own deadline, a coincidental
    // same-day cluster is still possible in that edge case, same as this file's other dynamic-date
    // collisions — left to the Date-Cluster feature's own graceful merge, not chased further).
    addItem(
      'intl-f1-status-check',
      "Check with your school's international student office about maintaining or transferring your F-1 status",
      'f1-status-check',
      anchorDate({ month: 8, day: 25, yearOffset: finalStageIndex }, planStartDate),
      "You've already handled initial entry into the US — this is just a check-in about what maintaining (or transferring) your F-1 status looks like for your next academic step.",
      [],
    );
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
// (state.selectedUCDavisCourseIds) are actually FOR, so it becomes ONE real enrollment task
// directly — no checkpoint needed, exactly mirroring how Roslyn's stage-0 course-request items
// come straight from state.selectedCourseIds with no checkpoint. Every other quarter slot gets
// its own checkpoint task — Fall, Winter, Spring, and Summer are all identically two-part
// (transcript update + course selection), since real final grades post after every quarter, not
// just once a year; 'summer' is still explicitly optional via required: false — plus, once that
// checkpoint's own selectedCourseIds is populated, ONE real enrollment task for whatever was
// selected, same "checkpoint produces a dated task" coexistence buildCourseItems already
// established for Roslyn.
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
        const item = buildUCDavisEnrollmentItem(
          state.selectedUCDavisCourseIds || [], stageName, slot, planStartDate, dateOverrides, removed,
        );
        if (item) items.push(item);
        return;
      }

      const checkpointItem = buildUCDavisCheckpointItem(stageName, slot, planStartDate, dateOverrides, removed);
      if (checkpointItem) items.push(checkpointItem);

      const record = checkpoints[stageName]?.[slot.quarter];
      if (record?.selectedCourseIds?.length) {
        const item = buildUCDavisEnrollmentItem(record.selectedCourseIds, stageName, slot, planStartDate, dateOverrides, removed);
        if (item) items.push(item);
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

// ONE spine task per registration cycle, not one per course — every course selected for a given
// quarter shares the exact same registration date, so one-node-per-course was purely visual
// clutter (a real, confirmed bug: several same-dated nodes stacking up and crowding/overlapping
// neighboring opportunity chains on a dense quarter). The full course list (code + name for each)
// lives in this one task's own `courseList` array — a real `${code} — ${name}` line per course,
// rendered by Roadmap.jsx as an actual `<ul>` (the same "structured array, not a run-on paragraph"
// pattern `resources` already established there — see its own `.modal-resources` block), not
// crammed into `desc` as a comma-joined sentence the way an earlier version of this function did
// (confirmed hard to scan once a student selects more than a couple courses). `desc` itself is
// now just the estimated-date disclaimer, rendered above the list per the existing modal layout —
// unchanged in substance from before, just no longer also carrying the course list. Returns null
// (task omitted) if every selected id failed to resolve to a real course, or if the whole
// quarter's selection is empty.
//
// A double-digit course count here is not itself a sign of a merging bug — confirmed directly:
// Course Selection's own "Recommended for you" view merges across every selected major with no
// course-load guardrail (e.g. 2 majors alone can surface 15 recommended courses), and nothing in
// Stage 3 frames selections as "just this one quarter." A student selecting most or all of a
// multi-major recommended list genuinely ends up with more than the ~3-5 courses (~12-16 units) a
// real quarter holds — this function is correctly reporting whatever was actually selected, not
// incorrectly combining separate quarters/years (each quarter's own id
// `ucdavis-enroll-${stageName}-${quarter}` and its checkpoint's own nested
// `ucdavisQuarterCheckpoints[stageName][quarter]` storage stay fully isolated from every other
// quarter's).
function buildUCDavisEnrollmentItem(courseIds, stageName, slot, planStartDate, dateOverrides, removed) {
  const quarterLabel = QUARTER_LABELS[slot.quarter];
  const courses = courseIds.map((courseId) => getUCDavisCourseById(courseId)).filter(Boolean);
  if (courses.length === 0) return null;

  const id = `ucdavis-enroll-${stageName}-${slot.quarter}`;
  if (removed[id]) return null;
  const templateDate = clampToFuture(realAddDays(slot.startDate, -ESTIMATED_REGISTRATION_LEAD_DAYS), planStartDate);
  const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;

  return {
    id,
    title: `Select and enroll in your ${quarterLabel} quarter courses`,
    category: 'core',
    required: true,
    coreType: 'ucdavis-enrollment',
    date: realDate,
    due: formatDate(realDate),
    desc: `This date is an estimate of UC Davis's registration window (~${ESTIMATED_REGISTRATION_LEAD_DAYS} days before ${quarterLabel} quarter begins), not a published deadline — check Schedule Builder for your exact pass time.`,
    courseList: courses.map((course) => `${course.code} — ${course.name}`),
    resources: [],
    steps: null,
  };
}

// One checkpoint per quarter slot except the very first slot of the plan (handled directly by
// buildUCDavisQuarterItems above, no checkpoint needed there — Stage 2's own onboarding
// TranscriptScreen already collected that first transcript entry before Stage 3's course
// selection ever ran, so there's no "Part 1" left to do for it).
//
// Every checkpoint — Fall, Winter, Spring, and Summer alike — is now a full two-part task
// (transcript + course selection, mirroring Roslyn's own course-checkpoint exactly). An earlier
// version only made Fall two-part and treated Winter/Spring/Summer as a lighter, single-part
// "just pick courses" task, on the assumption that grades only change once a year — wrong for a
// real quarter system, where final grades post after every quarter, not just once. Fixed by
// dropping the single-part branch entirely: there is no longer any structural difference between
// Fall's checkpoint and Winter/Spring/Summer's. Summer is still the one exception, but only along
// a DIFFERENT axis — it's still `required: false` (optional to complete at all, not every student
// takes summer courses), which alone is enough to make it render as the same hollow/dashed
// "optional" ring every optional opportunity already uses — no new ring-rendering logic needed
// (see Roadmap.jsx's own three-way required/custom/dashed branch). Deliberately does NOT do
// prerequisite-locking the way Roslyn's Part 2 does — Stage 2's own catalog fetch never captured
// per-course prerequisite text for UC Davis (see UCDavisCourseCard's own comment in
// CourseSelectionScreen.jsx), so there's no real data to check against; fabricating a
// prerequisite rule here would be the exact "guess instead of parse" this codebase's standing
// rule already forbids elsewhere.
function buildUCDavisCheckpointItem(stageName, slot, planStartDate, dateOverrides, removed) {
  const id = `ucdavis-checkpoint-${stageName}-${slot.quarter}`;
  if (removed[id]) return null;
  const isOptional = slot.quarter === 'summer';
  const quarterLabel = QUARTER_LABELS[slot.quarter];
  const templateDate = clampToFuture(realAddDays(slot.startDate, -ESTIMATED_REGISTRATION_LEAD_DAYS), planStartDate);
  const realDate = dateOverrides[id] ? parseDateInputValue(dateOverrides[id]) : templateDate;
  return {
    id,
    title: `Update your transcript & select ${quarterLabel} quarter courses${isOptional ? ' (optional)' : ''}`,
    category: 'core',
    required: !isOptional,
    coreType: 'ucdavis-checkpoint',
    date: realDate,
    due: formatDate(realDate),
    desc: `Two steps: update your transcript with your final grades from the prior quarter, then select your ${quarterLabel} quarter courses — this also refreshes your GPA everywhere it's used, including Reach/Match/Safety.${isOptional ? ' This quarter is entirely optional — not every student takes summer courses.' : ''} This date is an estimate of UC Davis's registration window, not a published deadline.`,
    resources: [],
    steps: null,
    checkpointStageName: stageName,
    checkpointQuarter: slot.quarter,
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

// Each selected opportunity becomes one optional spine item for its FIRST year. Restructure (see
// CLAUDE.md — "Remove Anchor Node, Promote First Step to the Spine"): there is no separate
// summary/anchor node anymore — the chain's own first prep step (e.g. "Register for DECA")
// literally IS the spine item, mirroring buildProjectChain's own "first entry doubles as the
// spine node" shape exactly. It's fully independently clickable/mark-completable via the plain
// toggleDone() path, with no derived "chain-level" completion state to keep in sync — that
// derived-state ambiguity (a summary node with no real id of its own to complete) was the actual
// root cause of a real, previously-shipped bug where a "Start" button ended up wired to silently
// complete the first sub-task instead. Prep steps are spread across the `prepWeeks` window before
// the deadline (clamped to start after today) — the LAST prep step IS the deadline/event itself
// (e.g. "Compete at Regionals") rather than a separate trailing node, since that step already
// represents the opportunity's actual terminal action.
//
// For `recurring` opportunities (club/competition activities — see PROGRESSION_LADDERS in
// opportunities.js) on a plan spanning more than one year-stage, every additional year gets its
// OWN chain too — shorter than year 1's (no "register"/"build from scratch" step, since the
// student isn't starting over), built from that opportunity's `progressionPrepSteps` data plus
// the escalated milestone title as the final step. A bare single-point node would read as "no
// prep needed for the harder tier," which isn't true. Non-recurring opportunities are entirely
// unaffected: exactly one chain, in its nearest year, same as always.
function buildOpportunityItems(tracks, level, selectedOpportunityIds, planStartDate, yearSpan, dateOverrides, removed, aiChainInsertions = {}) {
  const items = [];
  selectedOpportunityIds.forEach((id) => {
    const opp = findOpportunity(id, tracks, level);
    if (!opp) return;

    // No more "is the whole opportunity removed" pre-check keyed on the raw opportunity id — see
    // the restructure note on buildFirstYearChain below. Per-step removal (handled inside
    // buildStepsChain's own filter) already collapses to `null`/omitted once every step is gone,
    // the same way a fully-removed Project Builder chain already does.
    //
    // Fix: AI Suggestions Related to Existing Chains (see CLAUDE.md) — any accepted suggestion
    // tagged with THIS opportunity's own id (aiChainInsertions[opp.id]) is only ever merged into
    // the year-1 chain, never an escalation-year one (matching resolveOpportunities' own
    // "year-1 chain only" scoping in profileCompiler.js, which is what the AI was actually shown
    // when it made the suggestion in the first place).
    const firstYearItem = buildFirstYearChain(opp, planStartDate, dateOverrides, removed, aiChainInsertions[id] || []);
    if (firstYearItem) items.push(firstYearItem);

    if (opp.recurring) {
      for (let yearIndex = 1; yearIndex < yearSpan; yearIndex += 1) {
        const escalationItem = buildEscalationChain(opp, yearIndex, planStartDate, dateOverrides, removed);
        if (escalationItem) items.push(escalationItem);
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

// Appends the opportunity's own name to a promoted first step's title (e.g. "Register your team"
// -> "Register your team for Science Olympiad Club") so the connection is still clear once
// there's no separate anchor label carrying it. Skipped when the step's own title already names
// the opportunity (e.g. DECA's own first step is literally "Register for DECA") — appending again
// would read as a redundant "Register for DECA for DECA" rather than adding real context.
function titleWithOpportunityContext(stepTitle, oppName) {
  return stepTitle.toLowerCase().includes(oppName.toLowerCase()) ? stepTitle : `${stepTitle} for ${oppName}`;
}

// Builds the original full prep-chain item (year 1) for one opportunity. No separate anchor: the
// chain's own first step (by real, sorted date) is promoted directly onto the spine — same id,
// same date-based positioning, same connections to the rest of the chain — exactly the way
// buildProjectChain already promotes a project's own first step. Its title gets the opportunity's
// own name appended (e.g. "Register your team for Science Olympiad Club") since there's no
// separate anchor label left to carry that context; every other field (date/desc/resources)
// comes straight from that real step, not from a synthetic wrapper. `totalSteps` is the chain's
// ORIGINAL step count (including the promoted one) — Roadmap.jsx's "· N steps" subtitle reads
// this instead of `branchSteps.length`, which would otherwise undercount by exactly one now that
// the first step has moved off the branch and onto the spine.
function buildFirstYearChain(opp, planStartDate, dateOverrides, removed, aiInsertedSteps = []) {
  const deadlineDate = anchorDate(opp.date, planStartDate);
  const stepNames = opp.prepSteps?.length ? opp.prepSteps : [`Prepare for ${opp.name}`];

  let steps = buildStepsChain(
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

  // Fix: AI Suggestions Related to Existing Chains (see CLAUDE.md) — merges in any accepted
  // suggestion the AI tagged as belonging to THIS opportunity, each already carrying its own
  // fixed, one-time-computed date (resolved once at accept time by suggestionResolver.js's
  // resolveSuggestion(), positioned between two real neighboring steps at that moment — never
  // recomputed here). Deliberately reuses the exact same "add to the array, then re-sort by real
  // date and recompute isLast" tail buildStepsChain's own sort already does, rather than trying to
  // splice at a remembered array index — this is what makes the inserted step connect into the
  // SAME diagonal branch via the SAME date-driven positioning `layoutBranch`/roadmapLayout.js
  // already use for every other step, with zero changes to that file. Respects removedNodeIds/
  // nodeDateOverrides exactly like every other step, via the same per-id lookups.
  const extraSteps = aiInsertedSteps
    .filter((s) => !removed[s.id])
    .map((s) => {
      const templateDate = parseDateInputValue(s.date);
      const realDate = dateOverrides[s.id] ? parseDateInputValue(dateOverrides[s.id]) : templateDate;
      return {
        id: s.id,
        title: s.title,
        date: realDate,
        due: formatDate(realDate),
        desc: s.desc || `A follow-up step suggested based on something you reported about ${opp.name}.`,
        resources: [],
        aiSuggested: true,
      };
    });
  if (extraSteps.length) {
    steps = [...steps, ...extraSteps]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((step, i, arr) => ({ ...step, isLast: i === arr.length - 1 }));
  }

  // Palette repaint, Academic Plan batch (see CLAUDE.md) — `track` is a purely additive, display-
  // only field (same convention `projectLabel`/`courseList` already established here), carrying
  // the exact same `opp._track` Batch 1's color mapping already resolves for Survey/Discovery/
  // Course Selection/Opportunity Finder cards. Set on every step (not just the promoted one) so a
  // chain's entire branch — connector line, every step's ring, the deadline step too — reads as
  // one consistent interest-colored chain, not just its starting point. Doesn't touch date/
  // position fields at all, so roadmapLayout.js's layout math is completely unaffected.
  const track = opp._track || null;
  const [anchor, ...branchSteps] = steps.map((step) => ({ ...step, track }));

  return {
    id: anchor.id,
    title: titleWithOpportunityContext(anchor.title, opp.name),
    category: 'opportunity',
    required: false,
    coreType: 'opportunity',
    date: anchor.date,
    due: anchor.due,
    desc: anchor.desc,
    resources: anchor.resources,
    track,
    totalSteps: steps.length,
    steps: branchSteps.length ? branchSteps : null,
    // Fix: AI Suggestions Related to Existing Chains (see CLAUDE.md) — a purely additive lookup
    // field (not read by roadmapLayout.js at all) letting suggestionResolver.js find "the chain
    // for opportunity X" by its real, stable id rather than by this item's own `id` (which is
    // whichever step happens to be promoted onto the spine, and can change if that step is later
    // removed).
    sourceOpportunityId: opp.id,
    // The promoted anchor can itself be an ai-inserted step (if the earliest-dated step in the
    // merged array happens to be one) — carried through so Roadmap.jsx's spine rendering can show
    // the same persistent sparkle badge in that case too, not just for branch steps.
    aiSuggested: anchor.aiSuggested || false,
  };
}

// Fill Out the High School Academic Plan (see CLAUDE.md), Task 3 — the old atomic "Draft your
// personal statement" trunk step (trunkSteps.js's own `t3`, now removed) becomes a real 5-step
// chain, reusing the exact same buildStepsChain() mechanism opportunity prep chains already use —
// no new mechanism, just a second real caller of it. `category: 'core', required: true` (not
// 'opportunity'), since this is a Required part of the plan, not an optional add-on: the chain-
// rendering code (roadmapLayout.js/Roadmap.jsx) never gates whether a branch renders on category,
// only on `hasBranch` (`steps.length >= 1`), so a Required core item with a real `steps` array
// renders exactly the way an opportunity's own chain already does — just with the solid (not
// dashed) anchor ring every other Required core task already gets. Highschool-only, since this
// replaces highschool's own senior-year `t3`; undergraduate/transfer's own statement-of-purpose
// steps are untouched plain trunk data.
function buildPersonalStatementChain(seniorStageIndex, planStartDate, dateOverrides, removed) {
  const deadlineDate = anchorDate({ month: 11, day: 20, yearOffset: seniorStageIndex }, planStartDate);
  const stepNames = [
    'Brainstorm your personal statement topic',
    'Draft your personal statement',
    'Get feedback on your draft',
    'Revise your personal statement',
    'Proofread your final essays',
  ];

  const steps = buildStepsChain(
    stepNames, deadlineDate, 10, planStartDate, dateOverrides, removed,
    (i) => `personal-statement-${i}`,
    (stepName, i, isLastByDefault) => ({
      title: stepName,
      desc: isLastByDefault
        ? 'One final read-through before you submit every essay — read it out loud, and have someone else look it over too. Typos and awkward phrasing are far easier to catch out loud than silently.'
        : i === 0
          ? 'Before you write a word, spend real time here — the strongest essays come from a specific, genuine story, not a topic picked because it "sounds good."'
          : i === 1
            ? 'Get a full draft down before you polish anything — focus on getting the real story onto the page first.'
            : i === 2
              ? 'A teacher, counselor, or someone who knows you well — ask for honest feedback on whether it actually sounds like you.'
              : 'Work the feedback in — this is usually where an essay goes from "fine" to "actually yours."',
      resources: i === 0
        ? ['Common App official essay prompts page']
        : i === 1
          ? ['3 example essays that worked']
          : [],
    }),
  );
  if (!steps) return null;

  const [anchor, ...branchSteps] = steps;
  return {
    id: anchor.id,
    title: anchor.title,
    category: 'core',
    required: true,
    coreType: 'procedure',
    date: anchor.date,
    due: anchor.due,
    desc: anchor.desc,
    resources: anchor.resources,
    totalSteps: steps.length,
    steps: branchSteps.length ? branchSteps : null,
  };
}

// Builds a shorter chain for escalation year `yearIndex` (1-based among escalation years — 1
// means "year 2 overall") of a `recurring` opportunity: `opp.progressionPrepSteps[rung]` (clamped
// to its last rung, same pattern as PROGRESSION_LADDERS) supplies the prep-step titles, and the
// escalated milestone from `progressionTitle()` is appended as the final step. Same anchor-
// removal restructure as buildFirstYearChain above — no separate summary node, the chain's own
// first step for this year is promoted directly onto the spine, renamed with the opportunity's
// name (plus "(Year N)", matching the old wrapper title's own trailing year marker). `chainKey`
// only prefixes each step's own id now — the returned item's real `id` comes from whichever step
// actually becomes the promoted anchor, not from `chainKey` itself.
function buildEscalationChain(opp, yearIndex, planStartDate, dateOverrides, removed) {
  const chainKey = `${opp.id}-y${yearIndex + 1}`;

  const deadlineDate = anchorDate({ ...opp.date, yearOffset: yearIndex }, planStartDate);
  const milestone = progressionTitle(opp, yearIndex);
  const prepStepNames = progressionPrepStepNames(opp, yearIndex);
  const stepNames = [...prepStepNames, milestone];

  const steps = buildStepsChain(
    stepNames, deadlineDate, opp.prepWeeks, planStartDate, dateOverrides, removed,
    (i) => `${chainKey}-prep-${i}`,
    (stepName, i, isLastByDefault, total) => ({
      title: stepName,
      desc: isLastByDefault
        ? `Your year ${yearIndex + 1} milestone for ${opp.name}: ${stepName.toLowerCase()}. ${opp.howToApply}.`
        : `Step ${i + 1} of ${total} preparing for year ${yearIndex + 1} of ${opp.name}.`,
      resources: [],
    }),
  );
  if (!steps) return null;

  // Same `track` field as buildFirstYearChain above, for the same reason — an escalation-year
  // chain is still the same real opportunity/interest area, just a later year, so it keeps the
  // identical track color throughout its own (shorter) branch too.
  const track = opp._track || null;
  const [anchor, ...branchSteps] = steps.map((step) => ({ ...step, track }));

  return {
    id: anchor.id,
    title: `${titleWithOpportunityContext(anchor.title, opp.name)} (Year ${yearIndex + 1})`,
    category: 'opportunity',
    required: false,
    coreType: 'opportunity',
    date: anchor.date,
    due: anchor.due,
    desc: anchor.desc,
    resources: anchor.resources,
    track,
    totalSteps: steps.length,
    steps: branchSteps.length ? branchSteps : null,
  };
}

function progressionPrepStepNames(opp, yearIndex) {
  const rungs = opp.progressionPrepSteps || [];
  if (!rungs.length) return [];
  return rungs[Math.min(yearIndex - 1, rungs.length - 1)];
}
