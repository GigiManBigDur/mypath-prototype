// Positions nodes on the same 800x1320 winding-trunk canvas used by the reference prototype.

const START_Y = 1180;
const END_Y = 160;
const CENTER_X = 400;
const X_WIGGLE = [-20, 30, -30, 30, -10, 20, -25];

// Offsets alternate side (left/right) and step further out each time, so branches
// sharing the same trunk attach point never land near each other.
const BRANCH_OFFSETS = [
  { dx: 230, dy: -60 },
  { dx: -230, dy: -60 },
  { dx: 230, dy: 30 },
  { dx: -230, dy: 30 },
  { dx: 190, dy: -130 },
  { dx: -190, dy: -130 },
  { dx: 190, dy: 100 },
  { dx: -190, dy: 100 },
];

export function layoutTrunk(steps) {
  const n = steps.length;
  const stepY = n > 1 ? (START_Y - END_Y) / (n - 1) : 0;
  return steps.map((step, i) => ({
    ...step,
    x: CENTER_X + X_WIGGLE[i % X_WIGGLE.length],
    y: Math.round(START_Y - i * stepY),
  }));
}

export function layoutBranches(branchDefs, laidOutTrunk) {
  const usedByAttachIndex = new Map();
  return branchDefs.map((b) => {
    const attach = laidOutTrunk[b.attachTrunkIndex] || laidOutTrunk[laidOutTrunk.length - 1];
    const bucketCount = usedByAttachIndex.get(b.attachTrunkIndex) || 0;
    usedByAttachIndex.set(b.attachTrunkIndex, bucketCount + 1);
    const offset = BRANCH_OFFSETS[bucketCount % BRANCH_OFFSETS.length];
    return {
      ...b,
      attachX: attach.x,
      attachY: attach.y,
      x: attach.x + offset.dx,
      y: attach.y + offset.dy,
    };
  });
}
