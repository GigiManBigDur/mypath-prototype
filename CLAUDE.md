# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MyPath is an academic/career planning app. This repo is a **click-through prototype**, not
the production app: a student answers a short survey and gets a personalized visual roadmap
(career → major → program → opportunities → academic plan), entirely client-side.

Hard constraints that shaped this build — preserve them unless the user explicitly asks to
change direction:
- **No backend, no database, no auth.** React app (Vite) only, deployable as a static site.
- **No AI/LLM calls anywhere.** All "recommendations" are hardcoded data + conditional logic
  in `src/data/`. Do not wire up the Claude API or any model here.
- **State lives in React** (`src/context/AppContext.jsx`, `useState`), persisted to
  `localStorage` on every change. Refreshing mid-flow restores where the user left off;
  there is no requirement to preserve it beyond that.
- **11 of the app's interest tracks have full career/major/program content**
  (`BUILT_TRACKS` in `interests.js`): Business, STEM, Healthcare, Creative/Arts,
  Academic/Humanities, Sports, Culinary Arts, Community & Leadership, Media & Entertainment,
  Personal Development, and Outdoors (Gardening/Travel). Only two things remain opportunity-only
  now: "Law" (falls all the way back to the fully generic opportunity list — `track: 'other'`)
  and Fitness/Fashion under Lifestyle & Hobbies (`track: 'lifestyle'`, real opportunity content,
  no career/major/program chain — parked until they come up, same as Law). See "Track
  resolution" below.
  Note the `academic` track key is reused for both category concepts: it's the id of the
  "Academic" interest *category* in `CATEGORIES` (which also contains the math-leaning
  "Mathematics" tag that routes to `stem` instead) and separately the *track* key that the
  humanities-leaning tags in that category (History, Philosophy, Political Science, Psychology,
  Literature) route to — don't conflate the two when reading `interests.js`. **The Lifestyle &
  Hobbies category is the one place a single `CATEGORIES` entry maps its tags to more than one
  track** — Gardening/Travel → `outdoors`, Cooking → `culinary`, Fitness/Fashion → `lifestyle` —
  specifically so the built `outdoors`/`culinary` tracks don't accidentally pull Fitness/Fashion
  along with them just because they share a category label.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run lint      # oxlint
```

No test suite exists yet. Verification for this project means running `npm run build` +
`npm run lint`, then actually clicking through the flow in a browser (see "Testing" below).

## Git & deployment

**Commit and push regularly — this is a standing requirement, not an opt-in.** This repo has
a GitHub remote already (`origin` → `github.com/GigiManBigDur/mypath-prototype`, **public**)
and a linked Vercel project (`seal-man/mypath-prototype`). The user wants a saved, revertible
version of the project at all times, so:
- After finishing a meaningful unit of work (a feature, a fix, a data addition — not every
  single file edit), stage the relevant files, write a clean, descriptive commit message, and
  push to `origin/main`. Do this proactively, without waiting to be asked each time.
- Don't let uncommitted work pile up across a long session — commit incrementally as logical
  pieces land, not just once at the very end.
- Follow standard git safety rules regardless: no `--force` push, no amending published
  commits, no `--no-verify`. Don't create a second GitHub repo — reuse this one.
- **Keep this file current as part of the same workflow.** After a round of changes that
  alters architecture (not just data content), update the relevant section here before/with
  that commit — don't wait for the user to run `/init` again. A stale CLAUDE.md is a bug the
  same way a failing build is.

**Both public deploy targets are opt-in only — do not auto-redeploy either one.** Only the
git commit+push above is standing/automatic. GitHub Pages redeploy was briefly made
standing-automatic too, then the user explicitly reversed that: only run
`npm run deploy:pages` when they signal a version is ready to publish (e.g. "this is the
final version," "deploy it," "update the public link") — not proactively after every change.
Until then, the everyday testing link is the local dev server (`npm run dev`,
`localhost:5173`), which always reflects the latest code by definition. When a deploy *is*
requested: `deploy:pages` builds with `DEPLOY_TARGET=gh-pages` (which flips
`vite.config.js`'s `base` to `/mypath-prototype/` — GitHub Pages serves project sites under a
subpath, not the domain root) and pushes `dist/` to the `gh-pages` branch via the `gh-pages`
npm package, publishing to `https://gigimanbigdur.github.io/mypath-prototype/`. This requires
the repo to stay **public** — Pages needs that on the free tier, which is why it was made
public.

**Vercel deploys are also opt-in.** Only run `npx vercel deploy --prod --yes` when the user
explicitly asks; treat "committed to GitHub" and "live" (on either target) as separate facts.
As of this writing the Vercel account has an unresolved issue — every deploy after the very
first one got stuck at status `UNKNOWN` with zero build logs ever generated (`vercel ls` shows
this clearly), almost certainly an
account-level block (e.g. email verification), not a code or network problem. Don't spend more
than one retry on it without checking `vercel ls` / `vercel inspect <url>` first — if every
recent deployment shows `UNKNOWN` with no logs, it's the account, not this attempt. GitHub
Pages is the standing/default public link; Vercel (`https://mypath-prototype-seven.vercel.app`)
is secondary and manual only.

## Architecture

**Screen flow is a single-page state machine, not a router.** `App.jsx` reads
`state.screen` from `AppContext` and renders the matching component from a `SCREENS` map
(`survey → admissions → discovery → opportunities → plan`). Screens advance by calling
`patch({ screen: 'next' })` — there's no URL routing, back/forward is handled by explicit
"Back" buttons that patch `screen` backwards. **The `discovery` screen is conditionally
skipped**: `AdmissionsOverviewScreen`'s Continue button routes straight to `opportunities`
when the user has no built-track interest selected, and `OpportunityFinderScreen`'s Back
button routes to `admissions` (not `discovery`) in that same case. `DiscoveryScreen` also
has a defensive `useEffect` that bounces to `opportunities` if it's ever reached with zero
built tracks (e.g. state restored from `localStorage` after interests changed).

**`AppContext` (`src/context/AppContext.jsx`) is the single source of truth**, a flat
`useState` object with a `patch()` merge function, auto-persisted to `localStorage` under
`mypath-prototype-state`. Key fields: `interestTags`, `educationLevel`, `schoolYear` (what
grade/year within that level — 9-12 for highschool, 1-4 undergraduate, 1-3 transfer; drives
how many trunk stages get prepended, see "Multi-year trunk" below), `gpa`,
`selectedCareerIds` / `selectedMajorIds` / `selectedProgramKeys` (all **arrays** — Screens 3a/
3b/3c are multi-select, not single-select), `selectedOpportunityIds`, `completedNodes` (flat
map of node/step id → boolean, shared by every core spine item and every opportunity's branch
steps alike), `nodeDateOverrides` (flat map of node/step id → `'YYYY-MM-DD'`, a user-edited due
date that overrides the template-computed one), `removedNodeIds` (flat map of node/step id →
`true`, a user-deleted task), and `screen`. `reset()` clears storage and returns to the survey. The Survey screen's
"What year are you in?" pill group resets `schoolYear: null` whenever `educationLevel` changes
(its options are conditional on level), so Continue stays disabled until both are picked.

**Track resolution has two tiers, not one.** `src/data/interests.js` exports:
- `getBuiltTracks(tags)` — the 11 tracks with full career/major/program data. Drives Screen 3's
  routing/content and the Back-button target.
- `getOpportunityTracks(tags)` — a superset also including `lifestyle` (Fitness/Fashion, the
  one opportunity-only track). Drives Screen 4's content. An empty result (only "Law" selected,
  or nothing) falls back to `GENERIC_OPPORTUNITIES`.

Both are *merging*, not single-value: selecting 2+ built-track tags merges their career cards
on Screen 3a (`getCareerPool(tracks, level)` in `careers.js`, then filtered by
`selectedCareerIds`); mixing a built and unbuilt tag silently drops the unbuilt one. Once a
career is picked, downstream steps don't need to know which track it came from — `MAJORS` is
one flat namespace keyed by major id regardless of track.

**Self-Discovery (Screen 3) is multi-select end to end**, with pruning on the way back up:
`DiscoveryScreen.jsx`'s `toggleCareer`/`toggleMajor` handlers recompute which majors/programs
are still reachable after a change and drop any selections that no longer are (e.g.
deselecting a career drops majors that were only reachable through it). Majors merge
(deduped) across every selected career; `getMergedPrograms(majorIds, level)` in `programs.js`
merges programs across every selected major, deduped **by institution+program** (not by
major) — a program legitimately offered under two selected majors shows once, labeled with
both, keyed by `${institution}::${program}` rather than the old `${majorId}::${institution}`.

**Data layer (`src/data/`) is keyed by `[track][educationLevel]`, not by screen.**
- `careers.js` / `programs.js` (via `getPrograms()`) / `opportunities.js` all branch on
  `educationLevel` (`highschool` / `undergraduate` / `transfer`). Transfer reuses the
  `highschool` careers/majors data directly; only `programs.js` adds a transfer-specific note
  at read time, not duplicated data. **The 6 tracks added after the original 5** (Sports,
  Culinary Arts, Community & Leadership, Media & Entertainment, Personal Development, Outdoors)
  go one step further and alias `undergraduate` to `highschool` too, not just `transfer` — their
  source spec gave one career list per track, not a distinct "requires a grad degree next" tier
  the way business/stem/healthcare/creative/academic do, so there's no separate advanced tier to
  fabricate. See the comment at the top of the `sports:` block in `careers.js`.
- `programs.js` entries carry a real numeric `gpaValue` (illustrative, from a fixed benchmark
  table) instead of a selectivity-tier string, plus optional `gpaWeighted: 'portfolio' |
  'audition'` for programs where GPA is secondary to a submission (e.g. Juilliard has
  `gpaValue: null`). **Most majors have 5 programs; the 10 majors added for the 6 newer tracks
  have 3 each** (their source spec gave an already-appropriate selectivity spread per major
  up front — Extremely/Highly Selective flagship down to Moderately/Less Selective accessible
  options — rather than needing the "3 flagship-only + 2 accessible added later" pattern the
  original 24 majors went through). Don't assume every `PROGRAMS[majorId]` array has the same
  length. `selectProgramsForGpa(programs, gpaString, majorCount)` (called from
  `ProgramsStep.jsx`, not `getMergedPrograms` itself, which stays a pure merge/dedupe) then picks
  which of those to actually show: mostly programs at-or-below the entered GPA plus one
  aspirational reach pick for motivation, backfilling from further reach options only if there
  weren't enough reachable ones to fill the quota (`maxShownFor(majorCount)`, 4 cards per
  selected major). Programs with `gpaValue: null` are always treated as reachable on the GPA
  axis, matching their "GPA is secondary" intent. A blank/unparseable GPA does **not** guess —
  it falls back to `evenSample()`, an evenly-spaced cross-section of the full selectivity range,
  which is also what a GPA high enough to make everything "reachable" effectively converges to.
  `selectProgramsForGpa` itself still does no labeling or balancing — it only changes which
  programs get selected for display. The card grid separately surfaces `gpaValue` as a "Typical
  GPA" line, and `reachMatchSafetyTag(gpaString, gpaValue)` (also in `programs.js`) computes a
  **personalized** Reach/Match/Safety badge per card (`diff = gpa - gpaValue`: `>= 0.3` →
  Safety, `>= -0.2` → Match, else Reach — rounded to 2 decimals before comparing, since raw
  float subtraction like `3.0 - 3.2` lands a few ulps off an exact boundary and silently flips
  the tag). It returns `null` — no badge rendered — under the same "don't guess" rule as the
  selection above: blank/unparseable GPA, or `gpaValue: null` (nothing to compare against
  either way). This is intentionally still just a per-card label: no sorting/filtering by tag
  and no "balance your list" messaging anywhere. Styled as a colored pill (`.rms-badge`, one of
  `--teal`/`--gold`/`--rust`) specifically so it never reads as the same thing as the plain-text,
  GPA-independent `Selectivity` line elsewhere on the card; portfolio/audition-weighted programs
  keep the tag but pair it with a `.rms-caveat` ("Based on GPA alone — portfolio also weighed")
  so it doesn't overstate confidence for admissions that aren't decided by GPA alone.
- `opportunities.js`: every opportunity has `date` (a template `{month, day}`, or
  `{offsetDays: N}` for the two deliberately-in-the-past ones — see dates below) and
  `prepSteps` (2-4 ordered sub-task names). `getOpportunityPool(tracks, level)` /
  `findOpportunity(id, tracks, level)` merge/dedupe across tracks or fall back to
  `GENERIC_OPPORTUNITIES` — both `OpportunityFinderScreen` and `roadmapGenerator.js` use these
  rather than reading `OPPORTUNITIES[track][level]` directly. **`OPPORTUNITIES.culinary` and
  `.outdoors` deliberately reuse some ids already present in `OPPORTUNITIES.lifestyle`**
  (e.g. `culinary-youth-programs`, `4h-programs`) rather than moving them — `lifestyle` still
  covers Fitness/Fashion (see "Track resolution" above) and stripping its content out from under
  those two sub-tags would have quietly emptied their opportunity pool. `getOpportunityPool`
  already dedupes merged tracks by id, so selecting e.g. both "Cooking" and "Fitness" together
  still shows each real opportunity once, not twice.
- **Recurring competitions/clubs escalate across multi-year plans instead of clustering into
  year 1.** An opportunity can carry `recurring: true, progressionType: 'competition' |
  'leadership' | 'repeat'` (e.g. `deca`, `fbla`, `science-olympiad`, `hosa`,
  `academic-decathlon`, `speech-debate-nsda`, `key-interact-club`, `school-media-club`,
  `regional-state-championships`, `junior-nationals`, and their undergraduate/transfer
  equivalents). One-time opportunities (Bank of America Student Leaders, YoungArts, Scholastic
  Art & Writing, NSLI-Y, CNA training, etc.) simply don't have this flag and are entirely
  unaffected. `PROGRESSION_LADDERS` (exported from `opportunities.js`) maps `'competition'` →
  `['Compete at State', 'Compete at State', 'Compete at Nationals']` and `'leadership'` → an
  officer/project/lead-your-chapter ladder; `'repeat'` isn't in the map — it means "reuse year
  1's own final prepStep title every year" (for activities already at their peak tier, e.g.
  Junior Nationals). `roadmapGenerator.js`'s `progressionTitle(opp, yearIndex)` reads that
  ladder, clamped to its last rung if the plan runs longer than the ladder does.

**Dates are "today"-anchored, not fixed-calendar.** `src/utils/dates.js`: data files store
template dates as `{month, day, yearOffset?}` (interpreted as N days after Aug 15 on an
implied academic year — human-readable, no real year attached — shifted `yearOffset` calendar
years forward, default 0) or `{offsetDays: N}` for an explicit possibly-negative offset.
`anchorDate(date, planStartDate)` is the one place a template date becomes a real `Date`, by
adding its offset (plus `yearOffset` years) to `planStartDate` (= `new Date()`, captured fresh
each time `generateRoadmap()` runs). This means every generated plan is relative to whatever
day the user actually opens the app — a template date always maps to today-or-later, so only
the two explicit negative-offset opportunities (one Lifestyle & Hobbies, one Personal
Development — see `opportunities.js`) can ever be in the past. `OpportunityFinderScreen`
greys those out with a "Deadline passed" badge and disables selecting them, which is also
*why* nothing can ever appear before "You are here" on the roadmap: nothing past-dated can
reach `selectedOpportunityIds` in the first place.

**Multi-year trunk: `src/data/trunkSteps.js` is stages, not one flat list per level.**
`TRUNK_STAGES[level][stageName]` holds `{ label, steps }` — the final stage in every level
(`senior` / `application`) is the original single-year plan, plus one added "Check your GPA"
milestone per Task 6 below. Earlier stages (`freshman`/`sophomore`/`junior` for highschool;
`exploration`/`prep` for undergraduate; `current` for transfer) get prepended depending on how
much runway the student has, per `STAGE_PLAN[level][schoolYear]` — an ordered array of stage
names ending in that final stage (e.g. `highschool[9] = ['freshman','sophomore','junior',
'senior']`, `highschool[12] = ['senior']`). `roadmapGenerator.js` looks up that sequence, and
for each stage at index `i` applies `yearOffset: i` to every one of its steps' dates — so the
stage the student is currently in is always `yearOffset: 0` regardless of what it's named, and
later stages project forward one calendar year each. **Every stage has exactly one "Check your
GPA" milestone** — the four originally-existing ones (freshman/sophomore/junior/undergrad-prep)
plus five added afterward (senior/undergrad-exploration/undergrad-application/transfer-current/
transfer-application) so no stage is silently missing GPA tracking; this replaced an earlier,
separate system of quarterly Fall/Winter/Spring GPA checkpoints that lived in
`roadmapGenerator.js` and, once stages existed, visually collided with these per-stage ones at
the same granularity — that quarterly system is gone entirely. The first step of each stage
(when more than one stage is in play) carries a `stageLabel` that `Roadmap.jsx` renders as a
small "— Sophomore Year —" divider; a 12th-grader/4th-year/non-transfer-2nd-3rd-year student
still gets exactly one stage, so `stageLabel` is never set. Transfer students 2+ years out keep
the single `application` stage as-is (transfer timelines vary too much to model precisely) but
get a `caveatNote` string (`TRANSFER_CAVEAT`) surfaced as a banner near the top of
`Roadmap.jsx` instead of a fabricated multi-year transfer plan.

**The roadmap is one unified vertical spine, not separate trunk/branch/chip concepts.**
`roadmapGenerator.js` builds a `today` node plus a single flat `spineItems` array combining two
kinds of items, distinguished by a `required` boolean (drives the solid-vs-hollow ring styling
in `Roadmap.jsx` — see Task 3 of the restructure this became):
- **Core items** (`category: 'core'`, `required: true`) — the flattened, stage-resolved trunk
  steps described above. Always single-step (`steps: null`); core tasks never carry a
  step-chain, only opportunities currently do.
- **Opportunity items** (`category: 'opportunity'`, `required: false`) — one per selected
  opportunity, anchored at the date of its *earliest* prep step (its "starting point", e.g.
  "Register for DECA") rather than its deadline, carrying its full ordered `steps` chain as data
  (prep steps spread across the `prepWeeks` window before the deadline, clamped to start after
  today). **The last prep step *is* the deadline/event** (e.g. "Compete at Regionals") — it
  carries `opp.date` directly and `isLast: true`, rather than a separate trailing
  `${opp.id}-deadline` node with its own near-duplicate date; that used to be a genuine leftover
  from before chains existed, when each opportunity was a single hardcoded-date node. `isLast` is
  also what `Roadmap.jsx`'s `configFor()` uses to give that step the "deadline" icon/label — don't
  go back to sniffing `id.endsWith('-deadline')`, that id no longer exists. `buildFirstYearChain()`
  in `roadmapGenerator.js` applies any per-step `nodeDateOverrides`/`removedNodeIds` first, then
  **re-sorts `steps` by real date and recomputes `isLast` on the sorted array** before returning —
  the branch connector logic connects consecutive *array* entries, not consecutive *by-date*
  entries, so a user dragging a step's due date past a sibling's has to reorder the array itself
  or the connector won't reflow to match the new visual order. If every step of a chain gets
  removed, the function returns `null` and the whole item is omitted from the roadmap.
  For `recurring` opportunities on a plan spanning more than one year-stage
  (`yearSpan = stageNames.length`, from the multi-year trunk below), `buildOpportunityItems()`
  appends one extra single-step spine item per additional year — id `${opp.id}-y${n}`, date one
  calendar year later each time, title carrying the escalated `progressionTitle()` milestone —
  rather than a second full prep chain; a returning competitor doesn't re-walk "register /
  prepare / practice" every year. A 1-year plan (`yearSpan === 1`) never generates any of these,
  so this is a no-op for a senior/4th-year/non-transfer-2nd-3rd-year student regardless of which
  opportunities they pick.

`roadmapLayout.js` positions everything by real date — today at the bottom, later dates higher
up, same "latitude = time" principle used everywhere else in this app (`PIXELS_PER_DAY`) — with
a light forward-only minimum-gap pass so two items landing on the same day don't collide. This
is a genuine change from the old trunk, which used fixed per-node spacing; the old trunk had no
branches to route around, this one does, so position now has to track real elapsed time.
**If you touch the spacing constants, they all live at the top of `roadmapLayout.js`
(`PIXELS_PER_DAY`, `MIN_SPINE_GAP`, `MIN_BRANCH_GAP`, `BRANCH_SLOPES`) — canvas width/height are
always derived from actual content afterward, never assumed.**

Any spine item with more than one step (in practice, only opportunities — see above) gets its
own diagonal sub-branch peeling off the spine at that item's date, instead of the old
"collapsible chip that expands on click" — density is now handled by zoom/pan (below), not by
hiding content behind a click. A branch's steps are laid out as a genuinely connected path, not
a fan: **`layoutBranch()` accumulates each step's x incrementally from the *previous* step's x**
(`prevX + side * deltaRel * slope`), using an alternating slope per segment (`BRANCH_SLOPES =
[0.65, 0.2]`) rather than one constant slope for the whole branch. A single constant slope makes
every point in a branch a pure function of one cumulative distance from the anchor — i.e.
mathematically colinear — so drawing "step → previous step" segments renders *identically* to
drawing every step straight back to the anchor (a fan/starburst), even though the code is
already connecting them in sequence; the visual bug is geometric, not in which points get
connected. Alternating the slope per segment breaks that colinearity so the chain actually bends
at each node — **don't collapse `BRANCH_SLOPES` back down to one constant, or the fan comes
back even though the connecting code looks correct.** Each branch is still computed in true
isolation from every *other* branch's step-vs-step spacing (own `MIN_BRANCH_GAP`, own diagonal),
which is what actually fixes the old collapsed-chip overlap bug (multiple opportunities' prep
steps used to compete for the same lateral space). But branches still have to share the canvas with the
spine's own labels and with each other's labels, so there's a second layer:
`roadmapLayout.js` maintains a running `placedLabels` list of every label's *approximate*
rendered bounding box (character-count-based width estimate, not real DOM measurement) — every
spine item's label is placed first (all of them, both earlier and later in time than any given
branch, since a branch has to route around labels on both sides of it chronologically), then
each branch step nudges itself further along its own diagonal (via `NUDGE_STEP`) until it clears
every previously-placed box, registering its own box before the next step or branch is placed.
Every spine item also alternates which side its *own* label renders on (`labelSide`) — spine x
is always dead-center, so without alternating, every spine label would permanently claim one
side and guarantee a collision with any branch peeling that way; a branch always peels to the
side **opposite** its own anchor's label so an item never has to route around itself.

**The `<svg>` itself needs `style={{ overflow: 'visible' }}`.** SVG root elements default to CSS
`overflow: hidden` on their own coordinate box (`0,0` to `canvasWidth,canvasHeight`), independent
of the pannable `.roadmap-viewport`'s own clipping — a long label positioned near x=0 or the
right edge (common for a left/right-anchored label on a node close to center, or any label whose
real rendered width exceeds the approximate estimate used for layout) would get visually clipped
by the SVG's own box, even though the actual text content was always intact in the DOM (this
looked like truncated/missing characters, e.g. "Local Community Theater..." rendering as "al
Community Theater...", but was pixel clipping, not string truncation). Since zoom/pan already
exists so nothing has to fit in one fixed frame, there's no reason to let the SVG clip anything.

`Roadmap.jsx` renders the spine, every branch, and the zoom/pan viewport, and handles the detail
modal. Required (core) nodes render with a solid ring (filled white when incomplete, filled with
the type color when done); optional (opportunity anchors and their branch steps) render with a
thinner, dashed hollow ring when incomplete. **Every ring `<circle>` needs `pointerEvents="all"`**
— an unfilled circle (`fill="none"`, the hollow/optional style whenever a node isn't done yet)
only hit-tests its stroke by default SVG behavior, not its interior, so without this a hollow
node's clickable area was a thin ring around the edge instead of matching its visual size; solid
circles always have a real fill so they never needed it, but it's applied everywhere now for
consistency. Every node is independently clickable — a core node or a branch step opens the
standard modal (desc + resources + complete-toggle). An opportunity's own anchor node has no
single id of its own to toggle (its completion is derived from its steps), so its modal instead
gets a status-driven action button: **"Start"** (0 steps done, marks the first step complete),
**"Continue — mark next step complete (X/Y)"** (some done, marks the next incomplete one), or
**"Completed — undo"** (all done, resets every step in the chain back to incomplete) — this
keeps the anchor "actionable" like every other node instead of being a dead-end read-only
summary, while still deriving its state from the real per-step `completedNodes` entries rather
than introducing a separate completion concept. `completedNodes` is flat and shared, so step ids
(`${opp.id}-prep-${i}`) just need to be unique — no separate tracking structure. The Today node
is never completable and core-progress counting only considers `required` spine items
(`roadmap.spine.filter(n => n.required)`), matching the old trunk-only progress count.

**Every node is fully editable, not just a chain's starting anchor.** The detail modal (for
every node except Today) renders a due-date `<input type="date">` plus a "Remove task" button.
Editing the date calls `patch({ nodeDateOverrides: { ...state.nodeDateOverrides, [id]: value } })`
— on the next `generateRoadmap()` run this flows through the exact same `anchorDate()`/position
path as a template date, nothing special-cased for user-edited ones (see `buildFirstYearChain`/
`coreItems` above). Removing calls `window.confirm(...)` first only when `selected.required` is
true ("This is a required step — are you sure you want to remove it?"); optional
(opportunity/branch) nodes remove immediately with no dialog. Both actions apply to core spine
items, an opportunity's own anchor node, and any individual step inside its chain uniformly —
there's no separate code path for "editing a chain" vs. "editing a single point." Use
`parseDateInputValue()` (`src/utils/dates.js`), not `new Date('YYYY-MM-DD')` directly, whenever
turning a date-input string back into a `Date` — plain ISO date-only strings parse as UTC
midnight in JS, which silently renders one day early in any timezone behind UTC.

**Zoom, pan, and drag** replace the old fixed-scale, horizontal-scroll-only canvas (`.canvas-
scroll`), since a multi-year plan with several opportunities can now run to several thousand
pixels tall. `.roadmap-viewport` (fixed height, `overflow: hidden`) holds `.roadmap-canvas-
inner`, a plain div carrying `transform: translate(panX, panY) scale(zoom)` — the SVG inside is
rendered at its true native pixel size (`roadmap.canvasWidth`/`canvasHeight`, no `viewBox`
scaling) and the CSS transform does all the zooming. Wheel = zoom (centered on the cursor, via
the standard "keep the point under the cursor fixed" formula), pointer drag = pan, two-finger
touch = pinch-zoom (tracked via native `touchstart`/`touchmove` listeners, since wheel/touch
need `{ passive: false }` to `preventDefault()`, which React's synthetic `onWheel`/`onTouchMove`
props can't reliably guarantee — see the `useEffect` that attaches them directly to the
viewport DOM node). `fitView()` auto-fits on load/whenever `canvasWidth`/`canvasHeight` change
(i.e. when the plan's content actually changes, not on every render). **The `.zoom-controls`
buttons are a DOM sibling of `.roadmap-viewport`, not a child of it** — nesting them inside the
div that owns the drag `onPointerDown` handler caused `setPointerCapture` to swallow the
buttons' own click events; keep that separation if you touch this again.

**`onPointerDown` must NOT call `setPointerCapture` immediately** — doing so broke node clicks
and mark-complete entirely (a real mouse click still fires `pointerdown`/`pointerup`, and
capturing the pointer on `down` redirects the resulting `click` away from whatever was actually
hit deep inside the SVG, so it never reached a node's `onClick`). The fix: `onPointerDown` only
records the starting position; `onPointerMove` compares against a `DRAG_THRESHOLD` (5px) and
only calls `setPointerCapture`/starts panning once the pointer has genuinely moved past it. A
plain click (down+up with no real movement) never triggers capture at all, so it reaches its
real target through normal bubbling; only an actual drag pans. If you rework the pan gesture,
keep this click-vs-drag distinction — it's not optional polish, node clicks silently stop
working without it.

## Design tokens

`src/styles/global.css` holds all fonts/colors as CSS custom properties (`--paper`, `--ink`,
`--gold`, `--teal`, `--rust`, `--stone`, etc.) plus the roadmap-specific classes originally
ported from the reference prototype (paper/trail-map palette, Fraunces/IBM Plex fonts). Match
these tokens rather than introducing new colors when building new UI.

## Testing changes

There's no automated test suite. To verify a change actually works, run the dev server and
drive it with a headless browser (Playwright works; `chromium-cli` was not available in this
environment — the Chromium binary it installs is cached under `~/Library/Caches/ms-playwright`,
so reinstalling only needs `npm install playwright` in a scratch dir, not a fresh browser
download). Cover at minimum:
- One run per built track (Business, STEM, Healthcare, Creative, Academic/Humanities, Sports,
  Culinary Arts, Community & Leadership, Media & Entertainment, Personal Development, Outdoors)
  and one opportunity-only tag (Fitness or Fashion, or "Law"), through all 5 screens.
- All three education levels at least once.
- A multi-career/multi-major/multi-program selection spanning two tracks — confirm merged
  counts, a combined single plan, and (if programs differ in GPA) the max-benchmark logic.
- A dense opportunity selection (several multi-step opportunities at once, ideally from one
  track) — this is the scenario that broke the old collapsed-chip layout; confirm each
  opportunity renders as its own isolated diagonal branch, not overlapping another opportunity's
  steps or the spine's own labels. Don't just eyeball this: group every `.node-label`/`.node-due`
  text element in the rendered SVG by its parent node's `transform` (so a node's own title+due
  lines aren't flagged against each other), then check `getBoundingClientRect()` for any
  cross-node overlap — the real bug this catches only shows up as actual rendered text collision
  (variable-width strings), not raw node-to-node distance, so a distance-threshold check alone
  will miss it. Screenshot + eyeball too, especially after zooming into any dense cluster.
- Confirm required (core) nodes render as solid rings and optional (opportunity) nodes as hollow
  dashed rings, both on the spine and within branches; confirm exactly one "Check your GPA" label
  exists per active stage (`gpaCount === stageLabelCount || (stageLabelCount === 0 && gpaCount
  === 1)` for the single-stage case).
- Zoom (wheel + buttons), pan (drag), and reset-view — verify `.roadmap-canvas-inner`'s inline
  `transform` actually changes after each interaction; this regressed once already because the
  zoom buttons were nested inside the pointer-drag div and `setPointerCapture` ate their clicks
  (see Architecture) — if you restructure the viewport markup, re-verify button clicks still
  fire.
- At least one `schoolYear` per level that prepends stages (e.g. highschool 9, undergraduate 1,
  transfer 1) plus the final-stage-only case (highschool 12, undergraduate 4, transfer 2/3) —
  confirm the multi-stage cases show the right number of `.stage-label` dividers, and test the
  longest case (highschool 9th grade with several opportunities selected, ~35+ nodes) renders
  with zero cross-node label overlap and pans/zooms cleanly.
