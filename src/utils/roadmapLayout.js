// One unified vertical spine, not separate trunk/branch/chip concepts. Every item — required
// core admissions tasks and every selected opportunity's starting point alike — is positioned on
// the spine by real date (today at the bottom, later dates higher up), same "latitude = time"
// principle used everywhere else in this app. A light minimum-gap pass nudges spine items apart
// when two real dates land too close together to read.
//
// Multi-step items (currently only opportunities — core tasks are always single-step, see
// trunkSteps.js) get their own diagonal sub-branch peeling off the spine, positioned by the same
// time principle. Each branch is computed against a running list of every label already placed
// (every earlier spine item, and every earlier branch's own steps) and nudges itself further out
// along its own diagonal whenever it would collide — so a chain never has to fight over lateral
// space with another chain's steps, it just routes around them.

import { realDaysBetween } from './dates';

const TOP_MARGIN = 90;
const BOTTOM_MARGIN = 90;
const LABEL_BUFFER = 300; // horizontal room for node/branch label text extending outward from center
// Exported so Roadmap.jsx's default-zoom calculation (cap the initial view to a ~2-year window
// anchored at today, see fitView) can convert a day-span into the same pixel units this file
// positions everything in, instead of hardcoding a second copy that could drift out of sync.
// Raised from 20 specifically so MIN_SPINE_GAP can be a real 60px (see below) while
// 2 * PIXELS_PER_DAY (64) still clears it — the rate itself doesn't otherwise need to change; this
// is purely a side effect of the floor request. Every day-to-day increase beyond the floor is
// still exactly PIXELS_PER_DAY px, same "adding rate" as before, just at this new value.
export const PIXELS_PER_DAY = 32;
// The floor must apply ONLY when two spine items are 0 or 1 real day apart — anything 2+ days
// apart uses pure `PIXELS_PER_DAY * daysBetween` math with zero flooring (see the withPosition
// loop below). This is a literal 60, not derived from PIXELS_PER_DAY like it used to be — 60 was
// requested directly. It must still stay strictly under 2 * PIXELS_PER_DAY (64) or a 2-day gap
// would render smaller than or equal to the 0/1-day floor, inverting the ordering the "only floor
// at <=1 day" rule exists to guarantee — PIXELS_PER_DAY was raised (see above) specifically to
// keep that true. If you change this value again, re-check it against 2 * PIXELS_PER_DAY before
// assuming it's safe.
const MIN_SPINE_GAP = 60;
const MIN_BRANCH_GAP = 46;
// Alternating per-segment slope (horizontal px per vertical px for THAT segment only) — using one
// constant slope for a whole branch makes every point in it exactly colinear with the anchor, so
// "connect step to previous step" and "connect every step straight back to the anchor" render as
// the same single straight ray. Alternating slopes give each segment its own direction, so the
// chain actually bends at every node instead of looking like one long spoke.
// LEFT AT ITS ORIGINAL VALUES ON PURPOSE — do not bump this up to widen branches. `rel` (used for
// both the collision-avoidance nudge loop AND `y`) is derived independently of slope, but the
// nudge loop's OUTCOME (how many times it fires) is not: widening x here changes which label
// boxes collide, which can change how many times a step gets nudged, which changes its final
// `rel` and therefore its `y` — verified empirically (a dense FBLA/DECA test plan) to shift `y`
// for a real subset of steps. BRANCH_SPACING_MULTIPLIER below widens branches instead, applied
// only to each step's already-finalized `x` after every collision decision is locked in, so the
// nudge loop keeps making the exact same decisions (and therefore the exact same `y`) it always
// has — see the proof in layoutBranch's own comment.
const BRANCH_SLOPES = [0.65, 0.2];
// Uniformly stretches every branch's x further from the spine, applied only after layoutBranch's
// nudge loop has already finalized rel/y using the untouched BRANCH_SLOPES above — see the proof
// there for why this can only ever increase separation between labels, never introduce a new
// overlap. Doubling gives noticeably more horizontal breathing room on both sides.
const BRANCH_SPACING_MULTIPLIER = 2;

// Rough label-block geometry, used only to decide "would these two labels visually collide" —
// doesn't need to be pixel-perfect, just a safe overestimate (IBM Plex Sans at 13px averages
// under 6.3px/char, so this errs generous).
const CHAR_PX = 6.3;
const LABEL_PAD = 16;
const LABEL_BLOCK_HEIGHT = 30;
const SPINE_EDGE_GAP = 26;
const BRANCH_EDGE_GAP = 20;
const NUDGE_STEP = 18;
const MAX_NUDGES = 80;
// intersects() below treats two boxes as colliding if they come within this many px of each
// other, not just on literal overlap. Without it, two labels whose true edges land a few px
// apart (e.g. an opportunity's own branch step landing close to an UNRELATED spine node it
// shares no chain with — the two boxes' real edges came within 16px in one observed case) count
// as "not colliding" and never get nudged apart, even though that reads as visually cramped/
// touching on screen. This is the one thing standing between "no rectangle overlap" and "a
// human would call this a comfortable gap" — it doesn't touch rel/y/BRANCH_SLOPES math at all,
// only whether the EXISTING nudge loop decides to fire.
const COLLISION_PADDING = 24;

function labelWidth(text) {
  return text.length * CHAR_PX + LABEL_PAD;
}

// A label reads two lines (title, due) of possibly different lengths — use whichever is wider.
function blockWidth(title, due) {
  return Math.max(labelWidth(title), labelWidth(`${due} XXXXXXXXXXXXXX`));
}

function labelBBox(x, y, side, width, edgeGap) {
  const left = side > 0 ? x + edgeGap : x - edgeGap - width;
  return { left, right: left + width, top: y - LABEL_BLOCK_HEIGHT / 2, bottom: y + LABEL_BLOCK_HEIGHT / 2 };
}

// Stage dividers ("— Sophomore Year —") render centered on the spine, just below their node —
// registered here too so a nearby branch routes around them like any other label.
function centeredLabelBBox(x, y, text) {
  const width = labelWidth(text);
  return { left: x - width / 2, right: x + width / 2, top: y - 10, bottom: y + 10 };
}

function intersects(a, b) {
  return a.left - COLLISION_PADDING < b.right
    && b.left - COLLISION_PADDING < a.right
    && a.top - COLLISION_PADDING < b.bottom
    && b.top - COLLISION_PADDING < a.bottom;
}

// Positions one item's step chain as a genuine connected path — each step's x is accumulated
// incrementally from the PREVIOUS step's x (not computed fresh from the anchor every time), using
// an alternating slope per segment so the path actually bends at each node instead of tracing one
// straight ray. `side` is +1 (right) or -1 (left). Coordinates are relative to the parent spine
// node at (0, anchorY) and get shifted into final canvas space later, alongside everything else.
// `placedLabels` accumulates every label bbox placed so far (across every item, not just this
// branch) so each step can route around anything already on the canvas — including labels from
// other chains — instead of only avoiding itself.
//
// Every collision decision below (rel/y, the nudge loop, what gets pushed to placedLabels) runs
// entirely in this "narrow" coordinate system, using the original BRANCH_SLOPES — none of that
// changed for the wider-spacing tweak. Only the RETURNED x is widened, by a flat
// BRANCH_SPACING_MULTIPLIER applied once at the very end. This is safe rather than cosmetic
// hand-waving: every already-validated non-overlap in this function falls into one of three
// cases, and multiplying every branch step's x by the same K>1 (y, spine positions at x=0, and
// label widths/edgeGap all held fixed) can only ever widen that gap, never close it —
//   1. Same-side boxes not overlapping because one is fully left of the other (x1+width1 <= x2):
//      scaling both by K preserves x1*K+width1 <= x2*K whenever x2 > x1 >= 0 and K > 1, since the
//      required gap (width1) doesn't grow but the actual gap (x2-x1) does.
//   2. Opposite-side boxes: one side's x values are ~positive, the other's ~negative, so they're
//      already separated by construction — scaling in place (each side keeps its own sign)
//      only pushes them further apart.
//   3. A branch box vs. a same-side spine label (fixed at x=0, never scaled): moving the branch
//      step further from x=0 only increases its distance from the spine label.
// In short: scaling here can't introduce a new overlap between anything that didn't already
// overlap before scaling, so the "no label overlaps" invariant this file already guaranteed keeps
// holding — and because rel/y are computed before this multiply ever applies, every node's
// vertical position is provably untouched by it.
function layoutBranch(steps, anchorY, side, placedLabels) {
  const base = steps[0].date;
  let prevRel = 0;
  let prevX = 0;
  return steps.map((step, i) => {
    let rel = MIN_BRANCH_GAP + realDaysBetween(step.date, base) * PIXELS_PER_DAY;
    if (i > 0 && rel - prevRel < MIN_BRANCH_GAP) rel = prevRel + MIN_BRANCH_GAP;

    const slope = BRANCH_SLOPES[i % BRANCH_SLOPES.length];
    const width = blockWidth(step.title, step.due);
    let x = prevX + side * (rel - prevRel) * slope;
    let y = anchorY - rel;
    let bbox = labelBBox(x, y, side, width, BRANCH_EDGE_GAP);
    let guard = 0;
    while (guard < MAX_NUDGES && placedLabels.some((p) => intersects(p, bbox))) {
      rel += NUDGE_STEP;
      x = prevX + side * (rel - prevRel) * slope;
      y = anchorY - rel;
      bbox = labelBBox(x, y, side, width, BRANCH_EDGE_GAP);
      guard += 1;
    }
    placedLabels.push(bbox);
    prevRel = rel;
    prevX = x;
    return { ...step, x: x * BRANCH_SPACING_MULTIPLIER, y };
  });
}

export function layoutRoadmap({ today, spineItems }) {
  const daysFromToday = (date) => realDaysBetween(date, today.date);

  const withT = spineItems
    .map((item) => ({ item, t: daysFromToday(item.date) }))
    .sort((a, b) => a.t - b.t);

  // Pass 1: raw date-proportional y (today = 0, future = negative/upward) for every spine item,
  // with a forward min-gap pass that only ever pushes items further from "now" — never reorders
  // them — plus which side each item's OWN label renders on (labelSide alternates; spine x is
  // always dead-center, so without alternating, every spine label would permanently claim the
  // same side, guaranteeing a collision with any branch that happens to peel toward it).
  //
  // The primary floor decision compares TRUE day-gap (`t - prevT`, both real `daysFromToday`
  // values) to the previous item's real date, NOT the previous item's rendered `prevY` —
  // comparing against `prevY` was the ORIGINAL historical bug: if an earlier item had already
  // been floored (pushed further from its true position), that drift carried into `prevY`, so a
  // LATER pair of items that were genuinely several real days apart could still get floored
  // again, simply because the earlier drift hadn't been "paid off" yet. Using the true day-gap
  // for the FLOOR decision means only a pair that is ACTUALLY 0 or 1 real days apart ever floors
  // for that REASON — but this alone doesn't fully prevent order inversion.
  //
  // A SECOND, later-discovered gap in that same original fix (see CLAUDE.md — Fill Out the High
  // School Academic Plan): a RUN of 3+ consecutive 0-1-day-apart items still compounds — each
  // pairwise floor is individually correct (60px pushed relative to the PREVIOUS item), but the
  // push accumulates across the whole run (60px × run length). If a run is long enough, that
  // accumulated total can exceed what a LATER, genuinely-2+-day-apart item's own TRUE (unfloored)
  // position would place it at — and since that later item's floor decision only ever looks at
  // its OWN immediate predecessor's real date (correctly finding no reason to floor on its own
  // terms), it renders using its true, unflored y — which can end up LESS negative (rendering as
  // if EARLIER) than the run's own drift-inflated final position, inverting their visual order
  // even though every INDIVIDUAL pairwise decision was correct in isolation. Confirmed directly:
  // a real 3-item run (each pair 0-1 real days apart) followed by a 2-real-day-apart item produced
  // an 84px inversion on a real, dense generated plan — small compounding cases can even hide
  // inside this codebase's own pre-existing regression test, which checked the GAP'S MAGNITUDE
  // but never its DIRECTION (see verify-spacing.mjs's own updated comment).
  //
  // The fix: floor whenever EITHER the original day-based condition applies, OR the item's own
  // true position would otherwise land less negative than (i.e. rendering "before") the
  // accumulated `prevY` minus the same MIN_SPINE_GAP — this can only ever trigger to PRESERVE
  // ordering, never to re-introduce the original prevY-cascade bug: it goes false on its own the
  // moment a real date gap grows large enough to clear whatever drift came before it (confirmed by
  // the isolated 0-7-day table below being completely unaffected — for those, prevY always starts
  // at exactly 0, so this second condition can only ever agree with, never override, the day-based
  // one).
  //
  // All spine labels get placed into `placedLabels` up front, in this same pass, before any
  // branch is laid out — a branch needs to know about EVERY spine label (including ones later in
  // time than its own anchor) to route around them, not just the ones already processed.
  let prevY = 0;
  let prevT = 0;
  let sideToggle = 0;
  const placedLabels = [];
  const withPosition = withT.map(({ item, t }) => {
    const trueY = -t * PIXELS_PER_DAY;
    const needsFloor = t - prevT <= 1 || trueY > prevY - MIN_SPINE_GAP;
    const y = needsFloor ? prevY - MIN_SPINE_GAP : trueY;
    prevY = y;
    prevT = t;

    const labelSide = sideToggle % 2 === 0 ? 1 : -1;
    sideToggle += 1;

    placedLabels.push(labelBBox(0, y, labelSide, blockWidth(item.title, item.due), SPINE_EDGE_GAP));
    if (item.stageLabel) placedLabels.push(centeredLabelBBox(0, y + 46, `— ${item.stageLabel} —`));

    return { item, y, labelSide };
  });

  // Pass 2: lay out each item's branch (if any) against the complete spine label set, plus every
  // other branch's steps placed so far — each chain routes around everything already on the
  // canvas instead of just avoiding itself.
  const rawPositioned = withPosition.map(({ item, y, labelSide }) => {
    // `>= 1`, not `> 1` — a chain with exactly one branch step (e.g. a freshly-grown Project
    // Builder project with 2 total revealed steps: one anchor + one branch step) still needs its
    // one step rendered as a real branch point, not silently dropped. Every opportunity in
    // practice has 2+ prepSteps, so this is a no-op for existing chains; it only fixes what was
    // previously a latent "one-step chains vanish" bug.
    const hasBranch = !!(item.steps && item.steps.length >= 1);
    let branchSteps = null;
    const side = hasBranch ? -labelSide : 0;
    if (hasBranch) {
      branchSteps = layoutBranch(item.steps, y, side, placedLabels);
    }
    return { ...item, x: 0, y, hasBranch, side, labelSide, branchSteps };
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

  // The spine sits at whatever x keeps every branch (and its labels) on-canvas — this is what
  // lets the canvas scale to however dense/wide the selected opportunities make it, instead of
  // assuming a fixed frame.
  const centerX = Math.round(Math.max(-minX, maxX) + LABEL_BUFFER);
  const yShift = TOP_MARGIN - minY;

  todayNode.x = centerX;
  todayNode.y += yShift;

  const spine = rawPositioned.map((n) => ({
    ...n,
    x: n.x + centerX,
    y: n.y + yShift,
    branchSteps: n.branchSteps
      ? n.branchSteps.map((s) => ({ ...s, x: s.x + centerX, y: s.y + yShift }))
      : null,
  }));

  const canvasHeight = Math.round(maxY - minY + TOP_MARGIN + BOTTOM_MARGIN);
  const canvasWidth = Math.round(centerX * 2);

  return { today: todayNode, spine, canvasHeight, canvasWidth };
}
