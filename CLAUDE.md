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
- **Business, STEM, Healthcare, Creative/Arts, and Academic/Humanities have full
  career/major/program content** (`BUILT_TRACKS` in `interests.js`). Five more interest tracks
  (Sports, Community & Leadership, Media & Entertainment, Lifestyle & Hobbies, Personal
  Development) have real opportunities but no career/major/program chain — see "Track
  resolution" below. Only "Law" falls all the way back to the fully generic opportunity list.
  Note the `academic` track key is reused for both category concepts: it's the id of the
  "Academic" interest *category* in `CATEGORIES` (which also contains the math-leaning
  "Mathematics" tag that routes to `stem` instead) and separately the *track* key that the
  humanities-leaning tags in that category (History, Philosophy, Political Science, Psychology,
  Literature) route to — don't conflate the two when reading `interests.js`.

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
map of node/step id → boolean, shared by trunk tasks, opportunity chip steps, and GPA chips
alike), and `screen`. `reset()` clears storage and returns to the survey. The Survey screen's
"What year are you in?" pill group resets `schoolYear: null` whenever `educationLevel` changes
(its options are conditional on level), so Continue stays disabled until both are picked.

**Track resolution has two tiers, not one.** `src/data/interests.js` exports:
- `getBuiltTracks(tags)` — tracks with full career/major/program data (`business` / `stem` /
  `healthcare` / `creative`). Drives Screen 3's routing/content and the Back-button target.
- `getOpportunityTracks(tags)` — a superset also including the six opportunity-only tracks.
  Drives Screen 4's content. An empty result (only "Law" selected, or nothing) falls back to
  `GENERIC_OPPORTUNITIES`.

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
  at read time, not duplicated data.
- `programs.js` entries carry a real numeric `gpaValue` (illustrative, from a fixed benchmark
  table) instead of a selectivity-tier string, plus optional `gpaWeighted: 'portfolio' |
  'audition'` for programs where GPA is secondary to a submission (e.g. Juilliard has
  `gpaValue: null`).
- `opportunities.js`: every opportunity has `date` (a template `{month, day}`, or
  `{offsetDays: N}` for the two deliberately-in-the-past ones — see dates below) and
  `prepSteps` (2-4 ordered sub-task names). `getOpportunityPool(tracks, level)` /
  `findOpportunity(id, tracks, level)` merge/dedupe across tracks or fall back to
  `GENERIC_OPPORTUNITIES` — both `OpportunityFinderScreen` and `roadmapGenerator.js` use these
  rather than reading `OPPORTUNITIES[track][level]` directly.

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
(`senior` / `application`) is the original single-year plan, unchanged. Earlier stages
(`freshman`/`sophomore`/`junior` for highschool; `exploration`/`prep` for undergraduate;
`current` for transfer) get prepended depending on how much runway the student has, per
`STAGE_PLAN[level][schoolYear]` — an ordered array of stage names ending in that final stage
(e.g. `highschool[9] = ['freshman','sophomore','junior','senior']`, `highschool[12] =
['senior']`). `roadmapGenerator.js` looks up that sequence, and for each stage at index `i`
applies `yearOffset: i` to every one of its steps' dates — so the stage the student is
currently in is always `yearOffset: 0` regardless of what it's named, and later stages project
forward one calendar year each. The first step of each stage (when more than one stage is in
play) carries a `stageLabel` that `Roadmap.jsx` renders as a small "— Sophomore Year —" divider
text above that node; a 12th-grader/4th-year/non-transfer-2nd-3rd-year student still gets
exactly one stage, so `stageLabel` is never set and the roadmap is pixel-identical to before
this feature existed. Transfer students 2+ years out keep the single `application` stage as-is
(transfer timelines vary too much to model precisely) but get a `caveatNote` string
(`TRANSFER_CAVEAT`) surfaced as a banner near the top of `Roadmap.jsx` instead of a fabricated
multi-year transfer plan. **If you add a new stage, only add to `TRUNK_STAGES`/`STAGE_PLAN` —
`roadmapLayout.js` needs no changes**, since the trunk already uses fixed per-node spacing
(not date-proportional) and computes canvas height dynamically from content; it was already
multi-year-safe before this feature, up to several dozen trunk nodes.

**The roadmap is generated, then laid out as chips, not plotted step-by-step.**
`roadmapGenerator.js` builds three things from state: a `today` node, a `trunk` array (the
flattened, stage-resolved steps described above), and a `chips` array — one entry per selected
opportunity (carrying its full ordered `steps` array as data: prep steps spread across the
`prepWeeks` window before the deadline, clamped to start after today, plus the deadline/event
step) and one per GPA checkpoint (`steps: null` — a simple non-expandable reminder, text from
`gpaDescText()` using the *highest* `gpaValue` among selected programs, phrased specially when
any are portfolio/audition-weighted). Title is `Your Path to X` for 1-2 selected careers,
`Your Path to X & Y`, or the generic `Your Personalized Academic Plan` for 3+.

`roadmapLayout.js` then positions two very different things:
- **The trunk is a single straight vertical line** — today + ~6 core steps, evenly spaced with
  a fixed gap. No date-proportional math, no collision handling; there are only ever a handful
  of these so it doesn't need it.
- **Chips are grouped by nearest trunk anchor** (by real date) and stacked with a simple fixed
  gap, alternating left/right. A chip's own steps are *not* plotted individually anywhere on
  the canvas — they only appear in the modal when the chip is clicked.

This chip-based design replaced an earlier version that plotted every individual prep step as
its own canvas node with an adaptive-spacing algorithm to avoid overlaps. That worked but
produced a busy, zigzagging canvas once someone selected several opportunities (each exploding
into 3-5 nodes) and needed increasingly complex collision logic to stay readable. Collapsing
each opportunity to one chip caps on-canvas node count at roughly trunk-count +
selected-opportunity-count regardless of how detailed any one chain is — **if you're touching
the roadmap, keep it this way; don't reintroduce per-step canvas plotting.**

`Roadmap.jsx` renders trunk/chips/today and handles the detail modal: trunk nodes and GPA
chips get the simple single-item modal (desc + one complete-toggle); opportunity chips get an
expanded step list, each step independently completable, with a "X/Y steps complete" line.
`completedNodes` is flat and shared, so step ids (`${opp.id}-prep-${i}`, `${opp.id}-deadline`)
just need to be unique — no separate tracking structure. The Today node is never completable
and is excluded from the trunk progress count (it isn't part of the `trunk` array).

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
- One run per built track (Business, STEM, Healthcare, Creative, Academic/Humanities) and one opportunity-only
  track, through all 5 screens.
- All three education levels at least once.
- A multi-career/multi-major/multi-program selection spanning two tracks — confirm merged
  counts, a combined single plan, and (if programs differ in GPA) the max-benchmark logic.
- A dense opportunity selection (several at once, ideally all from one track plus some GPA
  checkpoints) — this is the scenario that broke the old per-step layout; confirm the canvas
  still shows one chip per opportunity, not an exploded node-per-step canvas.
- Extract node positions via `document.querySelectorAll('g.node-badge')` and check trunk nodes
  share one x value (straight line) and no two labels are within ~40px on both axes — visual
  layout bugs here are not exceptions, so screenshot + eyeball too, not just the DOM check.
- At least one `schoolYear` per level that prepends stages (e.g. highschool 9, undergraduate 1,
  transfer 1) plus the final-stage-only case (highschool 12, undergraduate 4, transfer 2/3) —
  confirm the final-stage-only trunk is identical in node count/labels to before this feature,
  and that the multi-stage cases show the right number of `.stage-label` dividers with no
  overlap even at the longest case (highschool 9th grade, ~19 trunk nodes).
