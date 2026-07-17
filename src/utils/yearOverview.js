// Map 1 (Year Overview) data — deliberately tiny and separate from roadmapGenerator.js/
// roadmapLayout.js: it only needs to know WHICH years the plan spans and WHICH one is current,
// never any individual task's date. Reuses the exact same stage-resolution data (TRUNK_STAGES/
// STAGE_PLAN/DEFAULT_SCHOOL_YEAR) generateRoadmap() already uses, so the two views can never
// disagree about how many years there are or what they're called.
import { TRUNK_STAGES, STAGE_PLAN, DEFAULT_SCHOOL_YEAR } from '../data/trunkSteps';
import { anchorDate, getEffectiveToday } from './dates';

// stageIndex 0 is always "the year containing today" by construction — every stage gets
// yearOffset: stageIndex applied to its dates elsewhere (roadmapGenerator.js), and yearOffset 0
// is defined as "starts now." No date math is needed to find the current year; it's always the
// first entry.
export function getYearOverview(state) {
  // Real-Time Tracking feature (see CLAUDE.md) — same shared "today" resolution
  // roadmapGenerator.js uses, so Map 1 and Map 2 can never disagree about which year is current
  // while a testing override is active.
  const planStartDate = getEffectiveToday(state.dateOverride);
  const level = state.educationLevel;
  const schoolYear = state.schoolYear ?? DEFAULT_SCHOOL_YEAR[level];
  const stageNames = STAGE_PLAN[level][schoolYear] ?? STAGE_PLAN[level][DEFAULT_SCHOOL_YEAR[level]];

  return stageNames.map((stageName, stageIndex) => ({
    stageIndex,
    stageName,
    label: TRUNK_STAGES[level][stageName].label,
    isCurrent: stageIndex === 0,
    // The real calendar date this year-stage starts on (Aug 15 — the same implied-academic-year
    // epoch every template date in this app is anchored to — shifted forward by stageIndex years).
    // Map 2 uses this (and the next stage's own yearStartDate as its exclusive end) to decide
    // which real task dates fall inside this year; Map 1 itself doesn't need it beyond ordering.
    yearStartDate: anchorDate({ month: 8, day: 15, yearOffset: stageIndex }, planStartDate),
  }));
}
