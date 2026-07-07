// Positions the roadmap's two kinds of elements:
//   - trunk: today + the core admissions steps, evenly spaced on one straight vertical line.
//     There are only ever ~7 of these, so simple fixed spacing is enough — no date-proportional
//     math, no collision handling needed.
//   - chips: one per selected opportunity (its whole prep chain collapsed into a single clickable
//     item — see roadmapGenerator.js) plus one per GPA checkpoint. Each chip attaches to whichever
//     trunk node is chronologically closest, grouped and stacked near that anchor, alternating
//     left/right for balance. A handful of chips at most, so a simple fixed-gap stack is enough.
//
// Individual opportunity steps are NOT plotted on the canvas at all — they only appear in the
// expanded panel when a chip is clicked (see Roadmap.jsx).

import { realDaysBetween } from './dates';

const CENTER_X = 400;
const TRUNK_GAP = 170;
const TOP_MARGIN = 90;
const BOTTOM_MARGIN = 90;
const CANVAS_WIDTH = 800;

const CHIP_SIDE_OFFSET = 220;
const CHIP_GAP = 50;

function nearestAnchor(date, anchors) {
  let best = anchors[0];
  let bestDiff = Infinity;
  for (const a of anchors) {
    const diff = Math.abs(realDaysBetween(date, a.date));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = a;
    }
  }
  return best;
}

export function layoutRoadmap({ today, trunkSteps, chips }) {
  // Trunk: straight line, evenly spaced, today at the bottom.
  const todayNode = { ...today, x: CENTER_X, y: TOP_MARGIN + trunkSteps.length * TRUNK_GAP };
  const trunk = trunkSteps.map((step, i) => ({
    ...step,
    x: CENTER_X,
    y: TOP_MARGIN + (trunkSteps.length - 1 - i) * TRUNK_GAP,
  }));
  const anchors = [todayNode, ...trunk];

  // Group chips by nearest trunk/today anchor, sort each group chronologically, stack centered
  // on the anchor's y, alternating side per chip (globally, for left/right balance).
  const groups = new Map();
  for (const chip of chips) {
    const anchor = nearestAnchor(chip.date, anchors);
    if (!groups.has(anchor.id)) groups.set(anchor.id, { anchor, items: [] });
    groups.get(anchor.id).items.push(chip);
  }

  const laidOutChips = [];
  let sideIndex = 0;
  for (const { anchor, items } of groups.values()) {
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    items.forEach((chip, i) => {
      const side = sideIndex % 2 === 0 ? 1 : -1;
      sideIndex++;
      const centeredIndex = i - (items.length - 1) / 2;
      laidOutChips.push({
        ...chip,
        x: CENTER_X + side * CHIP_SIDE_OFFSET,
        y: Math.round(anchor.y + centeredIndex * CHIP_GAP),
        attachX: anchor.x,
        attachY: anchor.y,
      });
    });
  }

  // Shift everything so the topmost element sits at TOP_MARGIN, and report the height needed.
  const allY = [...anchors.map((a) => a.y), ...laidOutChips.map((c) => c.y)];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const yShift = TOP_MARGIN - minY;
  todayNode.y += yShift;
  trunk.forEach((n) => { n.y += yShift; });
  laidOutChips.forEach((c) => { c.y += yShift; c.attachY += yShift; });

  return {
    today: todayNode,
    trunk,
    chips: laidOutChips,
    canvasHeight: Math.round(maxY - minY + TOP_MARGIN + BOTTOM_MARGIN),
    canvasWidth: CANVAS_WIDTH,
  };
}
