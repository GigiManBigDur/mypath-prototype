// Positions every node on the roadmap canvas from real dates — nothing is hand-placed. x carries
// no timing information; it's left/right placement for readability.
//
// The trunk (today + core steps) is laid out as a sequence of segments, each segment being the
// gap between two consecutive anchors. A segment's height is normally proportional to the real
// days between those two dates — but if the opportunities/GPA chains that fall in that segment
// need more room than that (to keep every node at least MIN_NODE_GAP apart), the segment
// *expands* to fit them instead of compressing the content. This guarantees no label ever
// overlaps, at the cost of the trunk occasionally not being perfectly date-proportional in a
// crowded stretch — readability wins over strict proportionality.

import { realDaysBetween } from './dates';

const CENTER_X = 400;
const X_WIGGLE = [-20, 30, -30, 30, -10, 20, -25];
const PIXELS_PER_DAY = 3.4; // controls how "tall" the timeline feels when there's room to spare
const BASE_Y = 1180; // today's y before the top margin shift

const MIN_NODE_GAP = 60;
const TOP_MARGIN = 90;
const BOTTOM_MARGIN = 90;
const CANVAS_WIDTH = 800;

const CHAIN_SIDE_OFFSETS = [170, 240, 310, 380, 450];

// Which segment a date belongs to: the segment whose bottom (earlier) anchor is the latest
// anchor at or before that date. A date after every anchor (possible once "today" is a real,
// arbitrary date rather than a fixed point months before the plan starts) lands in an open-ended
// extension segment above the last anchor, rather than being folded into the segment below it.
function segmentIndexFor(offsetDays, anchorOffsets) {
  let idx = 0;
  for (let i = 0; i < anchorOffsets.length; i++) {
    if (anchorOffsets[i] <= offsetDays) idx = i;
  }
  return idx;
}

function pickColumn(usedBands, yMin, yMax, nextSideRef) {
  let side = nextSideRef.value;
  let attempt = 0;
  let magnitude = CHAIN_SIDE_OFFSETS[0];
  const overlaps = (s, m) =>
    usedBands.some((b) => b.side === s && b.magnitude === m && yMax >= b.yMin - 30 && yMin <= b.yMax + 30);
  while (overlaps(side, magnitude) && attempt < CHAIN_SIDE_OFFSETS.length * 2) {
    attempt++;
    if (attempt < CHAIN_SIDE_OFFSETS.length) {
      magnitude = CHAIN_SIDE_OFFSETS[attempt];
    } else {
      side = -side;
      magnitude = CHAIN_SIDE_OFFSETS[attempt - CHAIN_SIDE_OFFSETS.length];
    }
  }
  usedBands.push({ side, magnitude, yMin, yMax });
  nextSideRef.value = -nextSideRef.value;
  return CENTER_X + side * magnitude;
}

export function layoutRoadmap({ today, trunkSteps, chains }, planStartDate) {
  // 1. Natural (date-driven) offsets for every anchor, in days since today.
  const anchors = [
    { ...today, offsetDays: 0 },
    ...trunkSteps.map((s) => ({ ...s, offsetDays: realDaysBetween(s.date, planStartDate) })),
  ];
  const anchorOffsets = anchors.map((a) => a.offsetDays);

  // 2. Bucket each chain into the segment its first node falls into.
  const chainsWithOffsets = chains.map((c) => ({
    ...c,
    nodeOffsets: c.nodes.map((n) => realDaysBetween(n.date, planStartDate)),
  }));
  // segments has one extra slot beyond the anchors: segments[anchors.length - 1] holds anything
  // dated after the final trunk node (e.g. a GPA checkpoint that lands past "Get accepted" once
  // the whole plan is compressed by a late "today") — it renders as an extension above the top.
  const segments = Array.from({ length: anchors.length }, () => []);
  for (const chain of chainsWithOffsets) {
    const idx = segmentIndexFor(chain.nodeOffsets[0], anchorOffsets);
    segments[idx].push(chain);
  }

  // 3. Required height per segment = max(date-proportional height, room needed for the longest
  // chain in it — chains sit in parallel columns, so it's the tallest one that sets the floor).
  // The final (extension) segment has no natural upper date to measure against, so its height is
  // driven entirely by its content.
  const requiredHeights = [];
  for (let i = 0; i < anchors.length; i++) {
    const naturalHeight = i < anchors.length - 1
      ? (anchors[i + 1].offsetDays - anchors[i].offsetDays) * PIXELS_PER_DAY
      : 0;
    const longestChain = segments[i].reduce((max, c) => Math.max(max, c.nodes.length), 0);
    const neededHeight = longestChain > 0 ? MIN_NODE_GAP * (longestChain + 1) : 0;
    requiredHeights.push(Math.max(naturalHeight, neededHeight, longestChain > 0 ? MIN_NODE_GAP : 0));
  }

  // 4. Assign anchor y positions sequentially from the bottom using those (possibly expanded)
  // heights. anchorY has one more entry than there are real anchors — the last is just the top
  // boundary for the extension segment, not a rendered node.
  const anchorY = [BASE_Y];
  for (const h of requiredHeights) anchorY.push(anchorY[anchorY.length - 1] - h);

  const todayNode = { ...today, x: CENTER_X, y: anchorY[0] };
  const trunk = trunkSteps.map((step, i) => ({
    ...step,
    x: CENTER_X + X_WIGGLE[i % X_WIGGLE.length],
    y: anchorY[i + 1],
  }));
  const allAnchors = [todayNode, ...trunk];

  // 5. Place each chain's nodes evenly within its segment's (guaranteed-sufficient) height,
  // in a dedicated column so its sequence reads as one connected mini-path.
  const branch = [];
  const usedBands = [];
  const nextSideRef = { value: 1 };
  segments.forEach((segChains, i) => {
    if (!segChains.length) return;
    const segBottomY = anchorY[i];
    const segTopY = anchorY[i + 1];
    const anchorBelow = allAnchors[i];

    segChains
      .slice()
      .sort((a, b) => a.nodeOffsets[0] - b.nodeOffsets[0])
      .forEach((chain) => {
        const ys = chain.nodes.map((_, idx) => Math.round(segBottomY - MIN_NODE_GAP * (idx + 1)));
        // Chains shorter than the segment's tallest still use the same fixed gap, just end
        // higher up — clamp to stay within the segment as a final safety net.
        const clampedYs = ys.map((y) => Math.min(segBottomY - MIN_NODE_GAP, Math.max(y, segTopY + MIN_NODE_GAP)));
        const yMin = Math.min(...clampedYs);
        const yMax = Math.max(...clampedYs);
        const x = pickColumn(usedBands, yMin, yMax, nextSideRef);

        chain.nodes.forEach((node, idx) => {
          branch.push({
            ...node,
            x,
            y: clampedYs[idx],
            attachX: idx === 0 ? anchorBelow.x : x,
            attachY: idx === 0 ? anchorBelow.y : clampedYs[idx - 1],
          });
        });
      });
  });

  // 6. Shift everything into a positive coordinate range and report the canvas height needed.
  const all = [todayNode, ...trunk, ...branch];
  const minY = Math.min(...all.map((n) => n.y));
  const maxY = Math.max(...all.map((n) => n.y));
  const shift = TOP_MARGIN - minY;
  for (const n of all) n.y += shift;
  const canvasHeight = Math.round(maxY - minY + TOP_MARGIN + BOTTOM_MARGIN);

  return { today: todayNode, trunk, branch, canvasHeight, canvasWidth: CANVAS_WIDTH };
}
