// Dev-time self-test for the Academic Plan spine's date-to-y spacing rule (see CLAUDE.md's
// "MIN_SPINE_GAP's floor must trigger ONLY when..." section for the full history behind this).
//
// This is NOT wired into the app's render path. layoutRoadmap() already recomputes every node's
// position from scratch, from the one authoritative formula, on every state change (it's called
// fresh inside generateRoadmap(), which is itself re-run by a useMemo keyed on state) — there is
// no partial-patch code path for a runtime "validate and auto-correct" pass to meaningfully guard
// against, and a validator that just re-ran the same formula would only ever be checking
// f(x) == f(x). What's actually useful is an independent, out-of-band check that the real
// function still produces the confirmed rule's values — run this by hand (`npm run verify:spacing`)
// after touching roadmapLayout.js, not on every keystroke.
//
// Loads the REAL roadmapLayout.js through Vite's own module loader (not a reimplementation of the
// formula, and not a plain `node` import — roadmapLayout.js uses extension-less relative imports,
// which only Vite's resolver, not Node's stricter ESM loader, handles) so this is testing the
// actual production code path, not a copy of it.

import { createServer } from 'vite';

const EXPECTED_GAPS = { 0: 60, 1: 60, 2: 64, 3: 96, 4: 128, 5: 160, 6: 192, 7: 224 };

function makeItem(id, date, overrides = {}) {
  return {
    id,
    title: id,
    date,
    due: date.toISOString().slice(0, 10),
    category: 'core',
    required: true,
    coreType: 'procedure',
    desc: '',
    resources: [],
    steps: null,
    ...overrides,
  };
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  let failures = 0;
  let checks = 0;

  try {
    const { layoutRoadmap, PIXELS_PER_DAY } = await server.ssrLoadModule('/src/utils/roadmapLayout.js');

    if (PIXELS_PER_DAY !== 32) {
      console.error(`FAIL: PIXELS_PER_DAY is ${PIXELS_PER_DAY}, expected 32 (confirmed rule changed? update EXPECTED_GAPS/this script if intentional)`);
      failures += 1;
    }

    const today = { date: new Date(2026, 0, 1), title: 'Today', desc: '', resources: [] };
    const base = addDays(today.date, 100); // arbitrary offset, unrelated to "today" itself

    // Each row of the expected-value table describes an ISOLATED pair — two items with nothing
    // else on the spine — so each gap is tested with its own fresh layoutRoadmap() call, not one
    // long chain. A chained version of this test (tried first) surfaces a real, separate, and
    // entirely expected effect: if a node was floored (pushed further from its true position than
    // its own date warrants), the NEXT node's gap can render smaller than this table's value, since
    // that next node's position is computed purely from its own true date, independent of how far
    // its predecessor got pushed — the "extra" distance the predecessor absorbed comes back out of
    // the following gap. That's a correct, direct consequence of the confirmed per-item rule
    // (floor decided by TRUE day-gap from the immediately preceding item, no compounding across
    // MORE than one step) — not a bug — but it does mean the table's values are a per-pair
    // guarantee, not a "every rendered gap on a real multi-item spine will read exactly this"
    // guarantee. See CLAUDE.md if this needs restating there.
    console.log('--- Isolated pairs, gap 0-7 ---');
    for (const gap of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const items = [makeItem('a', base), makeItem('b', addDays(base, gap))];
      const { spine } = layoutRoadmap({ today, spineItems: items });
      const actual = Math.round(Math.abs(spine[0].y - spine[1].y));
      const expected = EXPECTED_GAPS[gap];
      checks += 1;
      const ok = actual === expected;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  day-gap=${gap}  expected=${expected}px  actual=${actual}px`);
    }

    // Same isolated-pair approach, across every node type — required core, optional opportunity
    // anchor, and custom task — confirming the rule applies identically to all three, not just core.
    console.log('\n--- Cross-type check (core vs opportunity vs custom, isolated pairs) ---');
    const typeVariants = [
      { category: 'core', required: true, coreType: 'procedure' },
      { category: 'opportunity', required: false, coreType: 'opportunity' },
      { category: 'custom', required: false, coreType: 'custom' },
    ];
    for (const variant of typeVariants) {
      for (const gap of [1, 5]) {
        const typedItems = [
          makeItem(`${variant.category}-a`, base, variant),
          makeItem(`${variant.category}-b`, addDays(base, gap), variant),
        ];
        const { spine: typedSpine } = layoutRoadmap({ today, spineItems: typedItems });
        const actual = Math.round(Math.abs(typedSpine[0].y - typedSpine[1].y));
        const expected = EXPECTED_GAPS[gap];
        const ok = actual === expected;
        checks += 1;
        if (!ok) failures += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  [${variant.category}] day-gap=${gap}  expected=${expected}px  actual=${actual}px`);
      }
    }

    // Edge case: gap measured directly against "today" itself (t=0), not just between two
    // non-today items — the first spine item's own distance from the Today node follows the
    // exact same rule.
    console.log('\n--- Gap from "today" itself ---');
    for (const gap of [0, 1, 2]) {
      const itemDate = addDays(today.date, gap);
      const { today: laidToday, spine: todaySpine } = layoutRoadmap({
        today, spineItems: [makeItem('near-today', itemDate)],
      });
      const actual = Math.round(Math.abs(laidToday.y - todaySpine[0].y));
      const expected = EXPECTED_GAPS[gap];
      const ok = actual === expected;
      checks += 1;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  today -> day-gap=${gap}  expected=${expected}px  actual=${actual}px`);
    }

    // Regression test for the actual historical bug class (see CLAUDE.md): comparing a node's
    // proportional y against the PREVIOUS node's rendered position (prevY) instead of the TRUE
    // day-gap from the previous node's real date. An isolated 2-item pair can't distinguish the
    // two comparisons (there's no prior drift yet to bleed in), so this needs a 3+ item chain
    // where an earlier pair is genuinely floored first: item-0/item-1 are 0 days apart (floors,
    // pushing item-1 88px further than its true position), item-1/item-2 are 1 day apart (floors
    // again), then item-2/item-3 are a genuine 2 real days apart. Per the confirmed rule, item-3
    // must NOT be floored — it's computed purely from its own true date, giving a 24px rendered
    // gap from item-2 here (smaller than the isolated-pair table's 64px, because item-2 itself
    // was pushed away from ITS true position — see this script's own header comment). The buggy
    // version instead compares item-3's naive position against item-2's already-drifted prevY,
    // finds it's still "too close", and incorrectly floors item-3 too, producing a 60px gap.
    console.log('\n--- Compounding-drift regression (historical bug class) ---');
    {
      const chain = [
        makeItem('r0', base),
        makeItem('r1', addDays(base, 0)),
        makeItem('r2', addDays(base, 1)),
        makeItem('r3', addDays(base, 3)), // 2 real days after r2
      ];
      const { spine } = layoutRoadmap({ today, spineItems: chain });
      const actual = Math.round(Math.abs(spine[2].y - spine[3].y));
      const ok = actual === 24;
      checks += 1;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  r2 -> r3 (true 2-day gap after two floored predecessors)  expected=24px (unfloored)  actual=${actual}px${ok ? '' : '  <-- floored when it should not have been (compounding-drift bug)'}`);
    }
  } finally {
    await server.close();
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures > 0) {
    console.error(`\n${failures} spacing mismatch(es) found against the confirmed rule (PIXELS_PER_DAY=32, MIN_SPINE_GAP=60, floor only at 0-1 real days apart).`);
    process.exit(1);
  }
  console.log('\nAll spacing checks match the confirmed rule.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
