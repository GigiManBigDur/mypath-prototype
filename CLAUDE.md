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
- **Business, STEM, Healthcare, and Creative/Arts have full content.** Every other interest
  tag is "unbuilt" and falls back to generic content (see "Track resolution" below). The data
  shape in `src/data/` is intentionally structured so a new track can be added by filling in
  `careers.js` / `majors.js` / `programs.js` / `opportunities.js` for that track key, adding it
  to `BUILT_TRACKS` in `interests.js`, and mapping the relevant tag(s) to it — no screen/component
  changes needed.

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

This repo has a GitHub remote already (`origin` → `github.com/GigiManBigDur/mypath-prototype`,
private) and a linked Vercel project (`seal-man/mypath-prototype`). Standing practice for this
project: after a meaningful change, commit locally with a clean message and push — don't wait to
be asked. Don't create a second GitHub repo.

The production site (`https://mypath-prototype-seven.vercel.app`) is **not** wired to
auto-deploy on push — the Vercel project isn't linked to GitHub (the account authenticated via
device code, not GitHub OAuth), so pushing to `main` alone does not update the live site.
To publish a change: `npx vercel deploy --prod --yes` from the project root (requires the
Vercel CLI to already be logged in — it was set up interactively once and shouldn't need
re-auth on this machine).

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

**`AppContext` (`src/context/AppContext.jsx`) is the single source of truth** for every
answer/selection across all five screens (interest tags, education level, GPA, selected
career/major/programs/opportunities, completed roadmap nodes) plus the current `screen`.
It's a flat `useState` object with a `patch()` merge function, auto-persisted to
`localStorage` under `mypath-prototype-state`. `reset()` clears storage and returns to the
survey. Any screen can read or write any part of this state via `useApp()`.

**Track resolution supports merging multiple interests, not just one.**
`getBuiltTracks(selectedTagNames)` in `src/data/interests.js` returns the *ordered, deduped*
list of built tracks (`business` / `stem` / `healthcare` / `creative`) among the user's
selected tags — tags that map to `other` are dropped. Screens 3 & 4 key off this array, not a
single track:
- If 2+ selected tags map to built tracks, Screen 3a merges career cards from all of them
  (`CareersStep` takes a `tracks` array and does `tracks.flatMap(...)`).
- If some tags are built and some aren't, the unbuilt ones are silently dropped — no
  placeholder shown.
- If **no** selected tag maps to a built track, Screen 3 (Discovery) is skipped entirely and
  Screen 4 shows a small "more opportunities coming soon" note plus `GENERIC_OPPORTUNITIES`
  (level-appropriate generic opportunities in `opportunities.js`, e.g. NHS/SAT-prep for high
  schoolers, GRE-prep for grad-bound students) instead of track-specific ones.

Once a career is picked, downstream steps (majors, programs) no longer need to know which
track it came from — `findCareer(id, tracks, level)` in `careers.js` searches across the given
tracks, but `MAJORS` (in `majors.js`) is one flat namespace keyed by major id regardless of
track, so majors/programs lookups never need a track argument.

**Data layer (`src/data/`) is keyed by `[track][educationLevel]`, not by screen.**
- `careers.js`, `programs.js` (via `getPrograms()`), `opportunities.js` all branch on
  `educationLevel` (`highschool` / `undergraduate` / `transfer`) to decide undergrad-level vs.
  grad-level content. **Transfer reuses the `highschool` careers/majors data directly**
  (`CAREERS.business.transfer = CAREERS.business.highschool`, same pattern for all four
  tracks) — only `programs.js` adds a transfer-specific note at read time
  (`transferNoteFor()`), it isn't duplicated data.
- `majors.js` is a flat lookup by major id (undergrad and grad majors across all tracks share
  one namespace); careers reference majors by id via `relevantMajors`.
- `opportunities.js` exports `getOpportunityPool(tracks, level)` (merged, de-duped list across
  the given built tracks, or `GENERIC_OPPORTUNITIES[level]` when `tracks` is empty) and
  `findOpportunity(id, tracks, level)`. Both `OpportunityFinderScreen` and
  `roadmapGenerator.js` use these instead of reading `OPPORTUNITIES[track][level]` directly —
  keep using them so the merge/fallback behavior stays consistent in one place.
- `trunkSteps.js` holds the templated core admissions steps per education level. A step's
  `desc`/`resources` can be a plain string or a `(ctx) => string` function — the generator
  calls it with `{ programNames, majorName, careerName }` so e.g. "Build your college list"
  can mention the schools the user actually picked, or fall back to generic phrasing when
  nothing was selected (the all-unbuilt-track path never has programs/major/career, so these
  functions must degrade gracefully when `ctx` fields are empty/undefined).

**The roadmap is generated, not authored.** `src/utils/roadmapGenerator.js` takes the whole
`AppContext` state and produces a `{ title, subtitle, trunk, branch }` object:
- `trunk` = the resolved `TRUNK_STEPS` for the education level (required path).
- `branch` = one GPA-reminder node per distinct `gpaTarget` among selected programs, plus a
  `Prepare for X` / `X — deadline/start` pair for every selected opportunity (looked up via
  `findOpportunity`, so this works whether the opportunity came from a built track or the
  generic fallback list).

  `src/utils/roadmapLayout.js` then assigns SVG coordinates on a fixed 800×1320 canvas
  (matching the reference prototype). Trunk nodes are spaced evenly bottom-to-top with a
  wiggle pattern; branch nodes attach to a specific trunk node index and pick an offset from
  `BRANCH_OFFSETS`, **bucketed per attach point** (not by global branch index) — this matters
  because several branches (GPA + an opportunity's prep/deadline pair) commonly attach to the
  *same* trunk node, and reusing a global offset counter caused their labels to overlap in
  testing. If you add new branch types, keep using the per-attach-point bucket.
- `src/components/Roadmap.jsx` is the SVG rendering + progress bar + detail modal, ported
  from the reference file `~/Downloads/mypath_roadmap_prototype.jsx` (the visual design
  source of truth: paper/trail-map palette, Fraunces/IBM Plex fonts, winding trunk-and-branch
  metaphor). Node completion state lives in `AppContext.completedNodes`, keyed by node id.

**Screen 3 (`DiscoveryScreen.jsx`) is a 3-step sub-wizard** (careers → majors → programs)
with its own local `subStep` state, separate from the top-level `screen` state. Selecting a
major clears any previously-selected programs; selecting a career clears major + programs —
keeps downstream selections from going stale when the user changes their mind upstream.

## Design tokens

`src/styles/global.css` holds all fonts/colors as CSS custom properties (`--paper`, `--ink`,
`--gold`, `--teal`, `--rust`, `--stone`, etc.) plus the roadmap-specific classes ported
verbatim from the reference prototype. Match these tokens rather than introducing new colors
when building new UI.

## Testing changes

There's no automated test suite. To verify a change actually works, run the dev server and
drive it with a headless browser (Playwright works; `chromium-cli` was not available in this
environment — the Chromium binary it installs is cached under `~/Library/Caches/ms-playwright`,
so reinstalling only needs `npm install playwright` in a scratch dir, not a fresh browser
download). Cover at minimum:
- One run per built track (Business, STEM, Healthcare, Creative) through all 5 screens.
- All three education levels at least once (highschool/transfer share career+major data;
  undergraduate exercises the separate grad-level data).
- A multi-track merge (e.g. two built-track tags selected together) — check the career count
  on Screen 3a matches the sum across tracks.
- A mixed built+unbuilt selection — check only the built track's cards show.
- An all-unbuilt selection — check Discovery is skipped and the generic fallback opportunities
  appear.

Check `console --errors` / `page.on('pageerror')` and eyeball the roadmap screenshot for node
overlap, since layout bugs there are visual, not exceptions.
