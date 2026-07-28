// Map 2 Restructure: Fixed Lanes + Right-Angle Connectors (HOI4-Style) (see CLAUDE.md) — replaces
// the old diagonal-branch, per-label-collision-avoidance system with a strategy-game-tech-tree
// layout: every multi-step chain (an opportunity or project with 2+ total steps) holds one FIXED
// horizontal lane for its entire sequence, connected to the spine by a single right-angle jog and
// to its own later steps by pure vertical lines, with lanes reused once a chain finishes and an
// explicit labeled time axis running down the canvas's own left edge.
//
// THE ONE RULE THAT MUST NOT BREAK: every node's vertical position is still governed by the exact
// same rule it always has been — real date, scaled by PIXELS_PER_DAY, with the MIN_SPINE_GAP floor
// applying only for a genuine 0-1-real-day gap (or to preserve real-date order against a prior
// floored run's own accumulated drift — see that fix's own history below). `layoutSequenceByDate`
// is now the ONE canonical function expressing this rule, shared by the spine (Pass 1, anchored at
// "today") AND every chain's own steps (anchored at the chain's own already-computed spine
// position instead) — this REPLACES the old, genuinely different MIN_BRANCH_GAP-based vertical
// rule branches used to have, per this restructure's own explicit instruction to use "the existing
// shared date-to-y function" for every node, not two different rules for spine vs. branch. This
// restructure changes HORIZONTAL placement and connector SHAPE only — `npm run verify:spacing`
// (which only ever exercises spine-only inputs, no chains) is untouched by any of this and must
// keep passing byte-for-byte identically, since Pass 1 itself was not touched at all.
//
// This is also what makes the whole old per-label collision-avoidance system (placedLabels,
// intersects, NUDGE_STEP/MAX_NUDGES, BRANCH_SLOPES, BRANCH_SPACING_MULTIPLIER) unnecessary and
// removed entirely: since each chain now owns one exclusive, fixed horizontal lane for its whole
// lifetime (never shared with another chain that's genuinely concurrent with it — see the lane
// assignment below), and same-lane steps are already guaranteed at least MIN_SPINE_GAP vertical
// separation by the same date-to-y rule the spine relies on for its own readability, there is no
// remaining case where two chains' own labels could collide with each other. LANE_GAP/LANE_WIDTH
// are deliberately fixed, generous design constants (not derived from real text measurement) —
// matching the tech-tree reference's own rigid, evenly-spaced parallel-column aesthetic, a
// deliberate simplification rather than an oversight.

import { realDaysBetween } from './dates';

const TOP_MARGIN = 90;
const BOTTOM_MARGIN = 90;
// Horizontal room beyond the outermost lane, for that lane's own label text extending further
// outward (away from the spine) — same role the old LABEL_BUFFER played for the diagonal system,
// just applied to a fixed lane's own extent now instead of an organically-grown branch's.
const LABEL_BUFFER = 300;
export const PIXELS_PER_DAY = 32;
// The floor must apply ONLY when two items positioned by the SAME date-to-y call are 0 or 1 real
// day apart — anything 2+ days apart uses pure `PIXELS_PER_DAY * daysBetween` math with zero
// flooring. This is a literal 60, not derived from PIXELS_PER_DAY — see the historical note in
// `layoutSequenceByDate` below for why, and CLAUDE.md's own "MIN_SPINE_GAP's floor must trigger
// ONLY when..." section for the full history. It must stay strictly under 2 * PIXELS_PER_DAY (64)
// or a genuine 2-day gap would render smaller than or equal to the 0/1-day floor, inverting the
// ordering the "only floor at <=1 day" rule exists to guarantee.
const MIN_SPINE_GAP = 60;

// Fixed-lane constants (this restructure) — LANE_GAP is the distance from the spine's own
// centerline to the first lane's own node column on either side (chosen generously enough that a
// lane's own dot/label never lands under a real spine item's own label, which extends from x=0 by
// a small fixed offset); LANE_WIDTH is the pitch between consecutive same-side lanes (chosen
// generously enough that a chain step's own label, extending further outward from its lane,
// doesn't reach the next lane over). Both were verified visually against real dense multi-chain
// plans during this restructure's own staged build/test process, not assumed correct on paper.
const LANE_GAP = 280;
const LANE_WIDTH = 260;
// Task 5 — a reserved strip on the canvas's own LEFT edge for the labeled time axis, added purely
// as EXTRA width beyond the spine's own symmetric centerX (see below) — this guarantees the axis
// always has real, dedicated room and never competes for space with an actual lane/label, and
// leaves the canvas's own RIGHT-side extent completely unaffected by the axis's existence.
const AXIS_WIDTH = 90;
const AXIS_TICK_X = 22;

// Fix: AI-Suggested Node's Horizontal Position Doesn't Match Its Branch (see CLAUDE.md) — an
// accepted AI suggestion can land BETWEEN the anchor and a chain's own original first step,
// becoming the new `steps[0]`. That fix no longer matters for HORIZONTAL position now that a
// chain's steps all share one fixed lane `x` regardless of which one sorts first — but it still
// matters for the chain's own vertical spacing: the original bug was that `steps[0]`'s own gap
// from the anchor collapsed to a flat constant regardless of real elapsed time, when what should
// happen is `steps[0]` gets positioned by its OWN real date relative to the anchor, exactly like
// every other step. `layoutSequenceByDate` already does this correctly and uniformly for every
// step (there's no special-cased `base` to get wrong anymore) — kept here only as a historical
// note, since a future reader diffing this file's own history might otherwise wonder why the old
// `aiSuggested`-gated `base` special-case is gone: it's gone because the bug it fixed can no
// longer occur under the new, uniform layoutSequenceByDate rule.

// Positions a chronologically-sorted sequence of `{ t, ...rest }` entries (t = real days from
// "today", ascending) relative to an arbitrary anchor point (anchorT, anchorY), using
// PIXELS_PER_DAY scaling with the confirmed MIN_SPINE_GAP floor. This is the ONE canonical
// "date determines y" function now, used identically for:
//   - The spine (anchorT=0, anchorY=0) — this exactly reproduces the spine's own original Pass 1
//     loop, confirmed by direct comparison against the pre-restructure code before this file was
//     rewritten, which is what makes `npm run verify:spacing` (spine-only inputs) pass byte-for-
//     byte identically without needing any changes of its own.
//   - Each chain's own steps (anchored at that chain's own already-computed spine position instead
//     of "today" itself) — this REPLACES the old MIN_BRANCH_GAP-based rule branches used to use
//     (which floored at a flat 46px regardless of real day-gap, unlike the spine's stricter
//     "only floor at 0-1 real days apart" rule) with the identical spine rule, per this
//     restructure's own explicit instruction to use one shared date-to-y function everywhere.
//
// The floor logic itself (comparing TRUE day-gap to the immediately preceding entry, OR whether
// the true position would otherwise land less negative than the accumulated `prevY` minus
// MIN_SPINE_GAP) is unchanged from the spine's own original, hard-won logic — see CLAUDE.md's own
// "MIN_SPINE_GAP's floor must trigger ONLY when..." and "Fill Out the High School Academic Plan"
// sections for the full history of why both conditions are needed (a single day-gap check alone
// doesn't prevent a compounding-drift order inversion across a RUN of 3+ close-together entries).
function layoutSequenceByDate(entries, anchorT, anchorY) {
  let prevY = anchorY;
  let prevT = anchorT;
  return entries.map((entry) => {
    const { t } = entry;
    const trueY = anchorY - (t - anchorT) * PIXELS_PER_DAY;
    const needsFloor = (t - prevT) <= 1 || trueY > prevY - MIN_SPINE_GAP;
    const y = needsFloor ? prevY - MIN_SPINE_GAP : trueY;
    prevY = y;
    prevT = t;
    return { ...entry, y };
  });
}

// Task 5 — one tick per real calendar month spanning every date actually referenced by this
// roadmap (every spine item's own date, plus every one of its steps' dates, plus "today" itself as
// a floor) — walked directly from real Date objects, not reverse-engineered from pixel positions,
// so this can never disagree with where real content actually renders. Each tick's own y uses the
// exact same (unfloored) date-to-y mapping as the spine's own anchor point — ticks are always at
// least 28 real days apart, i.e. at least 896px at PIXELS_PER_DAY=32, far past MIN_SPINE_GAP, so
// there's never a reason to floor one tick against another.
function buildAxisTicks(spineItems, todayDate, yShift) {
  const allDates = [todayDate];
  spineItems.forEach((item) => {
    allDates.push(item.date);
    (item.steps || []).forEach((s) => allDates.push(s.date));
  });
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const ticks = [];
  let guard = 0;
  while (cursor <= end && guard < 60) { // a single-year view never legitimately needs more than ~14
    const t = realDaysBetween(cursor, todayDate);
    const y = -t * PIXELS_PER_DAY + yShift;
    ticks.push({ y, label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) });
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  return ticks;
}

export function layoutRoadmap({ today, spineItems }) {
  const daysFromToday = (date) => realDaysBetween(date, today.date);

  const withT = spineItems
    .map((item) => ({ item, t: daysFromToday(item.date) }))
    .sort((a, b) => a.t - b.t);

  // Pass 1: spine y — the spine's own original formula, expressed through the shared helper above
  // with anchorT=0/anchorY=0 (today's own coordinates before any canvas shift) — byte-for-byte the
  // same seed values (`prevY=0`, `prevT=0`) the original hardcoded loop used.
  const positionedSpine = layoutSequenceByDate(withT, 0, 0);

  // labelSide alternation — unchanged mechanism (spine x is always 0, so without alternating,
  // every spine label would permanently claim the same side). A chain's own anchor gets this
  // overridden below, forced away from its own lane's side specifically.
  let sideToggle = 0;
  const withPosition = positionedSpine.map(({ item, t, y }) => {
    const labelSide = sideToggle % 2 === 0 ? 1 : -1;
    sideToggle += 1;
    return { item, t, y, labelSide };
  });

  // Task 2/3 — fixed-lane assignment for every chain (an item with >=1 real step beyond its own
  // spine anchor — the "one revealed step already needs a real branch" fix already established
  // this threshold, unchanged here), processed in start-time order: reuse the lowest-numbered lane
  // whose previous occupant has already finished (its own last step's date) by this chain's own
  // start, otherwise claim a brand-new lane, alternating new lanes left/right of the spine for
  // visual balance. A lane, once created, keeps its side/column position forever — only WHICH
  // chain currently occupies it changes over time.
  const chainEntries = withPosition.filter(({ item }) => item.steps && item.steps.length >= 1);
  const lanes = []; // [{ endT, side, indexOnSide }]
  const laneByItem = new Map();
  let newLaneToggle = 0;
  chainEntries
    .slice()
    .sort((a, b) => a.t - b.t)
    .forEach(({ item, t }) => {
      const lastStepT = daysFromToday(item.steps[item.steps.length - 1].date);
      let lane = lanes.find((l) => l.endT <= t);
      if (lane) {
        lane.endT = lastStepT;
      } else {
        const side = newLaneToggle % 2 === 0 ? 1 : -1;
        const indexOnSide = lanes.filter((l) => l.side === side).length;
        lane = { endT: lastStepT, side, indexOnSide };
        lanes.push(lane);
        newLaneToggle += 1;
      }
      laneByItem.set(item, lane);
    });
  const laneX = (lane) => lane.side * (LANE_GAP + lane.indexOnSide * LANE_WIDTH);

  // Pass 2: place each chain's own steps in its assigned lane — a single fixed x for the whole
  // chain, vertical position via the SAME layoutSequenceByDate rule the spine uses, anchored at
  // the chain's own already-computed spine position (not "today") so a chain step's absolute y is
  // still ultimately just real-days-from-today, scaled identically to everything else. A chain
  // anchor's own label is forced to point AWAY from its own lane (never the same side its lane
  // occupies) — Task 4's right-angle connector jogs from the anchor straight out to the lane, so
  // if the anchor's own label pointed the same direction, that jog would run straight through the
  // label's own text.
  const rawPositioned = withPosition.map(({ item, t, y, labelSide }) => {
    const hasBranch = !!(item.steps && item.steps.length >= 1);
    if (!hasBranch) {
      return { ...item, x: 0, y, hasBranch, side: 0, labelSide, branchSteps: null };
    }
    const lane = laneByItem.get(item);
    const thisLaneX = laneX(lane);
    const stepEntries = item.steps.map((step) => ({ step, t: daysFromToday(step.date) }));
    const positionedSteps = layoutSequenceByDate(stepEntries, t, y);
    const branchSteps = positionedSteps.map(({ step, y: sy }) => ({ ...step, x: thisLaneX, y: sy }));
    return {
      ...item, x: 0, y, hasBranch, side: lane.side, labelSide: -lane.side, branchSteps,
    };
  });

  const todayNode = { ...today, x: 0, y: 0 };

  let minY = 0;
  let maxY = 0;
  let minX = 0;
  let maxX = 0;
  const account = (x, y) => {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  };
  rawPositioned.forEach((n) => {
    account(n.x, n.y);
    if (n.branchSteps) n.branchSteps.forEach((s) => account(s.x, s.y));
  });

  // The spine sits at whatever x keeps every lane on-canvas — this is what lets the canvas scale
  // to however many concurrent lanes the selected opportunities/projects actually need, instead of
  // assuming a fixed frame. AXIS_WIDTH is added as EXTRA width purely on the left (leftShift, not
  // centerX itself), so the axis gets guaranteed dedicated room without touching the right side's
  // own extent at all.
  const centerX = Math.round(Math.max(-minX, maxX) + LABEL_BUFFER);
  const leftShift = centerX + AXIS_WIDTH;
  const yShift = TOP_MARGIN - minY;

  todayNode.x = leftShift;
  todayNode.y += yShift;

  const spine = rawPositioned.map((n) => ({
    ...n,
    x: n.x + leftShift,
    y: n.y + yShift,
    branchSteps: n.branchSteps
      ? n.branchSteps.map((s) => ({ ...s, x: s.x + leftShift, y: s.y + yShift }))
      : null,
  }));

  const canvasHeight = Math.round(maxY - minY + TOP_MARGIN + BOTTOM_MARGIN);
  const canvasWidth = Math.round(centerX * 2 + AXIS_WIDTH);

  const axisTicks = buildAxisTicks(spineItems, today.date, yShift);

  return {
    today: todayNode, spine, canvasHeight, canvasWidth, axisTicks, axisTickX: AXIS_TICK_X,
  };
}
