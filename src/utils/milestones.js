import { parseDateInputValue, realAddDays, realDaysBetween, toDateInputValue } from './dates';
import { makeTaskId } from './ids';

// AI-First Onboarding, Stage 4 (see CLAUDE.md) — pure, presentation-free logic shared by every
// screen that reads/writes an "Overview milestone" (Build Your Own's own projects, the narrative-
// overview project, and now MyNarrativeScreen.jsx), extracted so a second, drifting copy never
// exists. `isMilestoneDone` was previously a local function inside ProjectBuilderScreen.jsx;
// `attachMilestoneSubSteps` was previously a local closure inside Roadmap.jsx — both moved here
// verbatim (their own behavior is completely unchanged) once a THIRD caller needed them.

// The same "done" rule buildOverviewMilestoneChains (roadmapGenerator.js) already uses for locking:
// a milestone counts as done either directly (its own promoted id marked complete) or, once it has
// real granular subSteps, once every one of those is complete.
export function isMilestoneDone(milestone, completedNodes) {
  if (completedNodes?.[milestone.id]) return true;
  const subSteps = milestone.subSteps || [];
  return subSteps.length > 0 && subSteps.every((s) => completedNodes?.[s.id]);
}

// Commits a milestone's own scoped-chat-generated (or manually typed) granular steps as real,
// dated sub-tasks, spread evenly across the real window from the day after `anchorDate` through
// the student's own picked `targetDateStr` — the exact same "spread evenly across a real window
// ending at a real date" shape `buildStepsChain` already uses for opportunity prep steps.
// Deliberately does NOT close over any caller-specific "which modal is open" state (Roadmap.jsx's
// own `setSelected(null)`) — the caller is responsible for closing its own detail view after this
// resolves, so this same function works identically whether the caller is the SVG roadmap's modal
// or MyNarrativeScreen.jsx's own.
export function attachMilestoneSubSteps(state, patch, {
  projectId, milestoneId, subStepTitles, anchorDate, targetDateStr,
}) {
  const targetDate = parseDateInputValue(targetDateStr);
  const windowStart = realAddDays(anchorDate, 1);
  const totalDays = realDaysBetween(targetDate, windowStart);
  const count = subStepTitles.length;
  const subSteps = subStepTitles.map((title, i) => {
    const offsetDays = count > 1 ? Math.round((totalDays * i) / (count - 1)) : totalDays;
    return { id: makeTaskId('milestone-step'), title, date: toDateInputValue(realAddDays(windowStart, offsetDays)), desc: '' };
  });
  patch({
    startedProjects: state.startedProjects.map((p) => (p.id !== projectId ? p : {
      ...p,
      overviewMilestones: p.overviewMilestones.map((m) => (m.id !== milestoneId ? m : {
        ...m, subSteps, targetDate: targetDateStr,
      })),
    })),
  });
}

// AI-First Onboarding, Stage 4 (see CLAUDE.md), Task 4 — a real, honest "on track" indicator,
// computed ONLY from data already structurally tied to this phase (its own promoted id, and its
// own real subSteps via `milestoneMeta`) — the SAME `completedNodes` map every other view already
// reads, never a second, disconnected tracking concept. This deliberately does NOT try to infer a
// connection to a real opportunity/course/activity that isn't its own subStep — Stage 3's own
// thematicKeywords are a loose, WHOLE-NARRATIVE hint for Course Selection's recommendation logic,
// not a real per-phase link, so treating them as "tied to this phase" here would be fabricating a
// connection that doesn't structurally exist.
//
// "Behind" reuses the EXACT same real "Overdue" concept the Digest/Checklist feature already
// established (`realDaysBetween(item.date, today) < 0` for a real, still-incomplete item) rather
// than inventing a new schedule-adherence heuristic — the same consistency principle This
// Week/Daily Schedule/weekly suggestions all had to learn before applies here too.
export function getMilestoneStatus(milestone, completedNodes, today) {
  if (isMilestoneDone(milestone, completedNodes)) {
    return { kind: 'complete', label: 'Complete' };
  }
  const subSteps = milestone.subSteps || [];
  if (subSteps.length === 0) {
    return { kind: 'unplanned', label: 'Not yet planned' };
  }
  const doneCount = subSteps.filter((s) => completedNodes?.[s.id]).length;
  const hasOverdue = subSteps.some((s) => !completedNodes?.[s.id] && realDaysBetween(parseDateInputValue(s.date), today) < 0);
  return {
    kind: hasOverdue ? 'behind' : 'on-track',
    label: `${hasOverdue ? 'Behind schedule' : 'On track'} — ${doneCount}/${subSteps.length} steps complete`,
    doneCount,
    total: subSteps.length,
  };
}
