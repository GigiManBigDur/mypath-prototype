// Positions nodes on the same 800x1320 winding-trunk canvas used by the reference prototype.
// Every node's vertical position (y) is derived from its actual date — nothing is hand-placed.
// x carries no timing information; it's just left/right jitter for visual variety and to keep
// labels from overlapping when two nodes land at a similar height.

import { dateFraction, daysBetween } from './dates';

const BOTTOM_Y = 1180; // TIMELINE_START (earliest date)
const TOP_Y = 160; // TIMELINE_END (latest date)
const CENTER_X = 400;
const X_WIGGLE = [-20, 30, -30, 30, -10, 20, -25];

export function dateToY(date) {
  const f = dateFraction(date);
  return Math.round(BOTTOM_Y - f * (BOTTOM_Y - TOP_Y));
}

export function layoutTrunk(steps) {
  return steps.map((step, i) => ({
    ...step,
    x: CENTER_X + X_WIGGLE[i % X_WIGGLE.length],
    y: dateToY(step.date),
  }));
}

// Escalating side offsets tried when a branch collides with something already placed.
const SIDE_OFFSETS = [150, 210, 270, 330, 390];
const COLLISION_Y = 40;
const Y_NUDGE = 22;

// Labels render pointing away from center (textAnchor 'end' when x < CENTER_X, 'start'
// otherwise — see Roadmap.jsx) — two nodes on the same side at a similar height will have
// their labels run into each other regardless of how far apart their x values are, since both
// extend toward the same edge. So collision detection keys off side, not raw x distance.
function labelSide(x) {
  return x < CENTER_X ? -1 : 1;
}

export function layoutBranches(branchDefs, laidOutTrunk) {
  // Trunk nodes are fixed anchors — branches get pushed around them, never the reverse.
  const placed = laidOutTrunk.map((t) => ({ x: t.x, y: t.y }));

  return branchDefs.map((b, i) => {
    // Attach to whichever trunk node is chronologically closest, not a manual index.
    let nearest = laidOutTrunk[0];
    let bestDiff = Infinity;
    for (const t of laidOutTrunk) {
      const diff = Math.abs(daysBetween(b.date, t.date));
      if (diff < bestDiff) {
        bestDiff = diff;
        nearest = t;
      }
    }

    const y = dateToY(b.date);
    const preferredSide = i % 2 === 0 ? 1 : -1;
    const collidesAt = (x, yTry) =>
      placed.some((p) => Math.abs(p.y - yTry) < COLLISION_Y && labelSide(p.x) === labelSide(x));

    // Try the preferred side at increasing distance, then the opposite side, before nudging y.
    let found = null;
    for (let round = 0; round < 3 && !found; round++) {
      const yTry = y + (round === 0 ? 0 : (round % 2 === 1 ? 1 : -1) * Y_NUDGE * round);
      for (const side of [preferredSide, -preferredSide]) {
        for (const mag of SIDE_OFFSETS) {
          const x = CENTER_X + side * mag;
          if (!collidesAt(x, yTry)) {
            found = { x, y: yTry };
            break;
          }
        }
        if (found) break;
      }
    }
    // Every candidate collided (very crowded date) — fall back to the furthest preferred spot.
    const chosen = found || { x: CENTER_X + preferredSide * SIDE_OFFSETS[SIDE_OFFSETS.length - 1], y };

    const node = { ...b, x: chosen.x, y: chosen.y, attachX: nearest.x, attachY: nearest.y };
    placed.push({ x: chosen.x, y: chosen.y });
    return node;
  });
}
