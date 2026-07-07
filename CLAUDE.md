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
- **Only Business and STEM have full content.** Every other interest tag routes to a
  "More paths coming soon" placeholder (`src/components/PlaceholderCard.jsx`). The data
  shape in `src/data/` is intentionally structured so a new track can be added by filling in
  `careers.js` / `majors.js` / `programs.js` / `opportunities.js` for that track key — no
  component changes needed.

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

## Architecture

**Screen flow is a single-page state machine, not a router.** `App.jsx` reads
`state.screen` from `AppContext` and renders the matching component from a `SCREENS` map
(`survey → admissions → discovery → opportunities → plan`). Screens advance by calling
`patch({ screen: 'next' })` — there's no URL routing, back/forward is handled by explicit
"Back" buttons that patch `screen` backwards.

**`AppContext` (`src/context/AppContext.jsx`) is the single source of truth** for every
answer/selection across all five screens (interest tags, education level, GPA, selected
career/major/programs/opportunities, completed roadmap nodes) plus the current `screen`.
It's a flat `useState` object with a `patch()` merge function, auto-persisted to
`localStorage` under `mypath-prototype-state`. `reset()` clears storage and returns to the
survey. Any screen can read or write any part of this state via `useApp()`.

**Track resolution drives Screens 3 & 4.** `resolvePrimaryTrack()` in `src/data/interests.js`
maps the *first* interest tag the user selected to a track (`business` / `stem` / `other`).
That track — not the full tag list — decides which `CAREERS`/`OPPORTUNITIES` dataset to show,
and whether the user sees real content or the placeholder card.

**Data layer (`src/data/`) is keyed by `[track][educationLevel]`, not by screen.**
- `careers.js`, `programs.js` (via `getPrograms()`), `opportunities.js` all branch on
  `educationLevel` (`highschool` / `undergraduate` / `transfer`) to decide undergrad-level vs.
  grad-level content. **Transfer reuses the `highschool` careers/majors data directly**
  (`CAREERS.business.transfer = CAREERS.business.highschool`) — only `programs.js` adds a
  transfer-specific note at read time (`transferNoteFor()`), it isn't duplicated data.
- `majors.js` is a flat lookup by major id (undergrad and grad majors share one namespace);
  careers reference majors by id via `relevantMajors`.
- `trunkSteps.js` holds the templated core admissions steps per education level. A step's
  `desc`/`resources` can be a plain string or a `(ctx) => string` function — the generator
  calls it with `{ programNames, majorName, careerName }` so e.g. "Build your college list"
  can mention the schools the user actually picked.

**The roadmap is generated, not authored.** `src/utils/roadmapGenerator.js` takes the whole
`AppContext` state and produces a `{ title, subtitle, trunk, branch }` object:
- `trunk` = the resolved `TRUNK_STEPS` for the education level (required path).
- `branch` = one GPA-reminder node per distinct `gpaTarget` among selected programs, plus a
  `Prepare for X` / `X — deadline/start` pair for every selected opportunity.

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
environment). Cover at minimum: one Business-track and one STEM-track run through all 5
screens across the three education levels, plus one placeholder-track run — check
`console --errors` / `page.on('pageerror')` and eyeball the roadmap screenshot for node
overlap, since layout bugs there are visual, not exceptions.
