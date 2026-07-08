// The roadmap is one shared timeline. Every node's y comes ONLY from its own real date via
// dateToY(), a single pure function used identically for spine nodes and sub-branch steps alike
// — never computed relative to a sibling, a previous step, or any other node's resolved
// position. This is deliberate and non-negotiable: an earlier version nudged sub-branch step
// positions to dodge label collisions, which silently decoupled a step's height from its actual
// date (a task due in 3 weeks could end up drawn as far away as one due in 4 months, just because
// they shared a chain). If a node's real date needs 3 weeks of clearance, it gets 3 weeks of
// clearance — full stop. The only exception, explicitly: a light minimum-gap pass on the SPINE's
// own dots (not sub-branch steps), so two spine items landing on almost the same day don't render
// as touching circles.
//
// Position, connector-line drawing, and label placement are three genuinely independent passes
// below, and MUST stay that way:
//   1. computeSpinePositions / computeBranchPositions — canonical (x, y) per node. Pure.
//   2. connector segments — reads already-computed positions, draws step-to-step (never fanned
//      back to the anchor). Never writes a position.
//   3. label placement — computes a `labelOffset` (how far the TEXT block sits from its own dot)
//      so no label ever overlaps another label or ANY connector segment on the canvas, including
//      a chain's own line to its own steps. This only ever moves text. It never touches x/y.
// If you're touching one of these, don't let the change leak into the other two.

import { realDaysBetween } from './dates';

const PIXELS_PER_DAY = 3;
const TOP_MARGIN = 90;
const BOTTOM_MARGIN = 90;
const MIN_SPINE_GAP = 70; // light, spine-dots-only minimum vertical gap

const BRANCH_BASE_OFFSET = 40; // horizontal clearance a branch keeps from the spine at minimum
const BRANCH_SLOPE = 0.5; // horizontal px per day traveled along a branch's one diagonal

const LABEL_BUFFER = 260; // canvas half-width padding beyond the widest content, for label room
const CHAR_PX = 6.3; // rough overestimate of IBM Plex Sans width/char at 13px
const LABEL_PAD = 16;
const LABEL_HALF_HEIGHT = 15;
const SPINE_LABEL_GAP = 26;
const BRANCH_LABEL_GAP = 20;
const LABEL_NUDGE = 16;
const MAX_LABEL_NUDGES = 120;

// ---------------------------------------------------------------------------------------------
// Pass 1: canonical positions. Pure functions of each node's own date. Nothing here ever reads
// another node's x/y.
// ---------------------------------------------------------------------------------------------

function dateToY(date, todayDate) {
  return -realDaysBetween(date, todayDate) * PIXELS_PER_DAY;
}

// Spine items get a light forward min-gap pass on top of their pure date position — the one
// documented exception. `labelSide` (which side of the spine the label renders on) is a static
// alternating assignment based on chronological order, not derived from any resolved position.
function computeSpinePositions(items, todayDate) {
  const withY = items
    .map((item) => ({ item, y: dateToY(item.date, todayDate) }))
    .sort((a, b) => b.y - a.y); // soonest (largest y, closest to today) first

  let prevY = 0; // today
  let sideToggle = 0;
  return withY.map(({ item, y }) => {
    let adjustedY = y;
    if (prevY - adjustedY < MIN_SPINE_GAP) adjustedY = prevY - MIN_SPINE_GAP;
    prevY = adjustedY;
    const labelSide = sideToggle % 2 === 0 ? 1 : -1;
    sideToggle += 1;
    return { item, x: 0, y: adjustedY, labelSide };
  });
}

// Every step's (x, y) is a pure function of its OWN date: y via the same dateToY() the spine
// uses, x via its date's offset from the chain's fixed anchor date (item.date) — never from
// where a previous step in the same chain ended up. No gap enforcement here, by design.
function computeBranchPositions(item, side, todayDate) {
  return item.steps.map((step) => {
    const y = dateToY(step.date, todayDate);
    const daysFromAnchor = realDaysBetween(step.date, item.date);
    const x = side * (BRANCH_BASE_OFFSET + daysFromAnchor * BRANCH_SLOPE);
    return { ...step, x, y };
  });
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers shared by passes 2 and 3.
// ---------------------------------------------------------------------------------------------

function labelWidth(text) {
  return text.length * CHAR_PX + LABEL_PAD;
}
function blockWidth(title, due) {
  return Math.max(labelWidth(title), labelWidth(`${due} XXXXXXXXXXXXXX`));
}
function labelBBox(x, y, side, dist, width) {
  const left = side > 0 ? x + dist : x - dist - width;
  return { left, right: left + width, top: y - LABEL_HALF_HEIGHT, bottom: y + LABEL_HALF_HEIGHT };
}
function centeredLabelBBox(x, y, text) {
  const width = labelWidth(text);
  return { left: x - width / 2, right: x + width / 2, top: y - 10, bottom: y + 10 };
}
function boxesIntersect(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
// Liang-Barsky segment-vs-AABB clip test — true if the line (x1,y1)-(x2,y2) passes through `box`
// at all, not just whether an endpoint does (a straight connector can cut through a distant,
// unrelated label without either of its own endpoints overlapping it).
function segmentIntersectsBox(x1, y1, x2, y2, box) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - box.left, box.right - x1, y1 - box.top, box.bottom - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return tMin <= tMax;
}

// ---------------------------------------------------------------------------------------------
// Pass 3: label placement. Given a node's already-fixed dot position, find how far its label
// text needs to sit from that dot (`dist`, starting at the normal gap) to clear every label and
// every connector segment already on the canvas. Returns the distance only — never the dot's x/y.
// ---------------------------------------------------------------------------------------------

function placeLabel(x, y, side, baseGap, width, segments, placed) {
  let dist = baseGap;
  let bbox = labelBBox(x, y, side, dist, width);
  const blocked = () =>
    placed.some((p) => boxesIntersect(p, bbox)) ||
    segments.some((s) => segmentIntersectsBox(s.x1, s.y1, s.x2, s.y2, bbox));
  let guard = 0;
  while (guard < MAX_LABEL_NUDGES && blocked()) {
    dist += LABEL_NUDGE;
    bbox = labelBBox(x, y, side, dist, width);
    guard += 1;
  }
  placed.push(bbox);
  return dist;
}

export function layoutRoadmap({ today, spineItems }) {
  // ---- Pass 1: positions ----
  const positioned = computeSpinePositions(spineItems, today.date);
  const spine = positioned.map(({ item, x, y, labelSide }) => {
    const hasBranch = !!(item.steps && item.steps.length > 1);
    const branchSide = hasBranch ? -labelSide : 0;
    const branchSteps = hasBranch ? computeBranchPositions(item, branchSide, today.date) : null;
    return { ...item, x, y, labelSide, hasBranch, branchSide, branchSteps };
  });
  const todayNode = { ...today, x: 0, y: 0 };

  // ---- Pass 2: connector segments (read-only over positions from pass 1) ----
  const segments = [];
  const chronological = [...spine].sort((a, b) => b.y - a.y); // today -> soonest -> ... -> latest
  let prevPoint = todayNode;
  chronological.forEach((n) => {
    segments.push({ x1: prevPoint.x, y1: prevPoint.y, x2: n.x, y2: n.y });
    prevPoint = n;
  });
  spine.forEach((n) => {
    if (!n.hasBranch) return;
    let prevStepPoint = { x: n.x, y: n.y };
    n.branchSteps.forEach((s) => {
      segments.push({ x1: prevStepPoint.x, y1: prevStepPoint.y, x2: s.x, y2: s.y });
      prevStepPoint = { x: s.x, y: s.y };
    });
  });

  // ---- Pass 3: label placement (text offsets only) ----
  const placed = [];
  placed.push(labelBBox(todayNode.x, todayNode.y, 1, SPINE_LABEL_GAP, blockWidth('You are here', todayNode.due)));

  // Sub-pass 3a: every spine label first (and stage dividers, as fixed obstacles), so branch
  // labels below can see the complete spine label set regardless of chronological order.
  const spineLabelDist = spine.map((n) => {
    const dist = placeLabel(n.x, n.y, n.labelSide, SPINE_LABEL_GAP, blockWidth(n.title, n.due), segments, placed);
    if (n.stageLabel) placed.push(centeredLabelBBox(n.x, n.y + 46, `— ${n.stageLabel} —`));
    return dist;
  });

  // Sub-pass 3b: every branch step's label, now that all spine labels are already registered.
  const spineWithLabels = spine.map((n, i) => {
    const branchSteps = n.branchSteps
      ? n.branchSteps.map((s) => {
          const dist = placeLabel(s.x, s.y, n.branchSide, BRANCH_LABEL_GAP, blockWidth(s.title, s.due), segments, placed);
          return { ...s, labelOffset: dist };
        })
      : null;
    return { ...n, labelOffset: spineLabelDist[i], branchSteps };
  });

  // ---- Canvas bounds, from canonical positions AND placed label extents so nothing clips ----
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
  account(todayNode.x, todayNode.y);
  spineWithLabels.forEach((n) => {
    account(n.x, n.y);
    if (n.branchSteps) n.branchSteps.forEach((s) => account(s.x, s.y));
  });
  placed.forEach((b) => { account(b.left, b.top); account(b.right, b.bottom); });

  const centerX = Math.round(Math.max(-minX, maxX) + LABEL_BUFFER);
  const yShift = TOP_MARGIN - minY;
  const shift = (n) => ({ ...n, x: n.x + centerX, y: n.y + yShift });

  const finalToday = shift(todayNode);
  const finalSpine = spineWithLabels.map((n) => ({
    ...shift(n),
    branchSteps: n.branchSteps ? n.branchSteps.map(shift) : null,
  }));

  const canvasHeight = Math.round(maxY - minY + TOP_MARGIN + BOTTOM_MARGIN);
  const canvasWidth = Math.round(centerX * 2);

  return { today: finalToday, spine: finalSpine, canvasHeight, canvasWidth };
}
