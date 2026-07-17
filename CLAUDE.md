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
npm run dev             # dev server at http://localhost:5173
npm run build           # production build to dist/
npm run preview         # serve the production build locally
npm run lint             # oxlint
npm run verify:spacing  # self-test for the Academic Plan spine's spacing rule — see below
```

No general test suite exists yet. Verification for this project means running `npm run build` +
`npm run lint`, then actually clicking through the flow in a browser (see "Testing" below).
`npm run verify:spacing` (`scripts/verify-spacing.mjs`) is the one exception — a standalone,
non-visual self-test for `roadmapLayout.js`'s date-to-y spacing rule, run by hand after touching
that file, not part of every build. See its own header comment and the `MIN_SPINE_GAP` section
below for why it exists and what it does (and does not) protect against.

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
(`welcome → signup → hub → survey → discovery → transcript → courseSelection →
programSummary → opportunities → projectBuilder → plan`). There's no URL routing. **Every screen
after the hub returns to `hub` on both Continue/Done and Back** (the Return-to-Hub routing
restructure, see its own section further below) — `hub` is the sole return point for the whole
post-signup flow, not a fixed forward/backward chain between screens.
`welcome` is `DEFAULT_STATE.screen` (`AppContext.jsx`), but only ever shown to a genuinely fresh
visitor — `loadInitialState()` spreads any stored state *over* the default, so a returning user
whose saved `screen` is anything else (e.g. `'plan'`) resumes exactly where they left off, never
bounced back to the welcome hero. `App.jsx`'s small persistent "MyPath — prototype" brand bar is
hidden specifically on `welcome` (`state.screen !== 'welcome'`) since that screen has its own
large "MyPath" hero title — showing both stacked would read as duplicated branding.

**Dashboard/Guide feature, Stage 1: a sign-up screen sits between `welcome` and `hub` —
`SignUpScreen.jsx`.** This is the first of a multi-stage build (sign-up → hub → order enforcement
→ guided pointing → in-flow dialogue → optional voiceover); this stage only handles collecting a
username, nothing downstream yet. `signup` itself has a Back button targeting `welcome`. Three new
`DEFAULT_STATE` fields (`AppContext.jsx`): `username` (required — the only field `SignUpScreen`'s
own `canContinue` gate depends on, trimmed before being saved), `displayName` (optional —
"preferred name if different from username," what Stage 2's hub greeting prefers over `username`
when set — see below), and `avatarIcon` (optional — a plain id string from `SignUpScreen`'s own
`AVATAR_OPTIONS`, e.g. `'compass'`, not a component reference — same "data holds icon NAMES, the
screen owns the name→component map" convention `ProjectBuilderScreen`'s `CATEGORY_ICONS` already
established; not consumed by anything yet, reserved for a later stage). All three are local
`useState` on `SignUpScreen`, seeded from existing `state` and committed to `AppContext` as one
unit on submit — the same buffer-locally-commit-on-submit shape `AddTaskModal` already uses,
rather than patching (and persisting to `localStorage`) on every keystroke. Both optional fields
carry a visible `.optional-badge` pill next to their field label (global.css), not just hint text,
since the build spec explicitly called for the optional fields to read as optional at a glance,
not just be technically skippable. `signup` deliberately has no `StepProgress` indicator, matching
`welcome`'s own precedent — it's a pre-flow screen, not one of the 9 tracked survey-through-plan
steps.

**Dashboard/Guide feature, Stage 2: the hub — `HubScreen.jsx` — is now the landing screen after
sign-up, replacing the old direct-to-survey entry.** `WelcomeScreen`'s "Get Started" button targets
`signup`; `SignUpScreen`'s Continue now targets `hub` (not `survey` directly, as it did before this
stage); `SurveyScreen`'s own Back button was updated to target `hub` to match, since the hub is now
genuinely the real previous screen for that flow. `App.jsx`'s unknown-screen fallback
(`SCREENS[state.screen] ? state.screen : ...`) was also switched from `'survey'` to `'hub'`, to
match the hub's new role as the app's actual home base. Guided pointing, in-flow dialogue, and
optional voiceover remain later, not-yet-built stages of this same feature; order enforcement
(Stage 3, immediately below) has been built.
- **Tiles** are a plain static array (`TILES` in `HubScreen.jsx`), each `{ id, screen, Icon, title,
  desc, unlock, lockedReason }`, rendered as `.card.hub-tile` buttons (reusing the shared
  `.card`/`.card-title`/`.card-desc` classes every other content grid in this app already uses) in
  a `.grid.grid-3`. Clicking an unlocked one just `patch()`es `screen` to that tile's real,
  already-existing screen key — no new screens were created for either stage. Eight tiles are
  always shown (Let's Build Your Plan → `survey`; Careers of Interest / Related College Majors /
  Recommended Programs → `discovery`, see below; Opportunity Finder → `opportunities`; Project
  Builder → `projectBuilder`; Academic Plan → `plan`; Your School List → `programSummary`); two
  more, Transcript & GPA → `transcript` and Course Selection → `courseSelection`, are filtered out
  of the `TILES` array entirely (not rendered, not greyed out) unless `state.currentSchool` is
  `'Roslyn High School'` or `'UC Davis'` — the same "only a real partner school" gate every other
  Course Selection entry point in this app already uses, checked directly against `currentSchool`
  rather than re-deriving `isCollegeAtUCDavis`, since the hub's own gate needs to also cover Roslyn
  (High School), not just the UC Davis/college case that helper is scoped to. (Transcript & GPA was
  missed in Stage 2's own original tile list and added in Stage 3 — Course Selection's own tile
  target changed from `transcript` to the real `courseSelection` screen key at the same time, now
  that Transcript & GPA is its own separate tile covering the `transcript` step.)
- **Careers of Interest / Related College Majors / Recommended Programs are three distinct tiles
  that all navigate to the one real `discovery` screen, landing on a different one of its three
  existing sub-steps** (`DiscoveryScreen.jsx`'s own `subStep`, previously always hardcoded to start
  at `'careers'` on every mount, since it was plain local `useState('careers')` with no external
  entry point). A new one-shot `state.discoveryEntryStep` field carries which sub-step a hub tile
  meant to land on: set by the tile's own `goTo()` right before navigating, read exactly once by
  `DiscoveryScreen`'s `useState(() => state.discoveryEntryStep || 'careers')` lazy initializer,
  then immediately cleared back to `null` in a mount-only `useEffect` — the same
  read-once-then-clear shape `activeCourseCheckpoint`/`activeUCDavisCheckpoint` already use
  elsewhere in this app, so a LATER hub click into Discovery always starts at the sub-step that
  click actually targeted, never replaying a stale entry step left over from an earlier visit. This needed no changes to Discovery's own sub-step logic (`canAdvance`/`handleNext`/
  the majors-depend-on-selected-careers data dependency) — a hub click landing directly on
  Majors/Programs before Careers/Majors have real selections yet simply shows whatever empty state
  those sub-steps already render for zero selections, which is fine and expected given this
  stage's own explicit "no order enforcement yet" scope.
- **The mascot (`Mascot()` in `HubScreen.jsx`) is built from the app's own existing Compass
  motif** — already the brand icon in the persistent header bar and the "You are here" trail
  marker on `WelcomeScreen`/`YearOverview` — rather than an unrelated illustrated character, so it
  reads as continuous with the rest of the app's identity. Pure inline SVG + CSS keyframes,
  matching this codebase's standing preference for hand-drawn illustration over image assets. A
  round teal body bobs gently (`@keyframes mascot-bob`, translateY + subtle scale, 3.2s loop) with
  a fixed (non-bobbing) shadow beneath it — the shadow staying still while the body moves is what
  actually sells a "lifting" illusion, a shadow bobbing in lockstep with the body wouldn't; two
  eyes blink together on their own independent loop (`@keyframes mascot-blink`, a `scaleY` dip
  that occupies only ~3% of a 4.5s cycle, so it reads as a natural occasional blink rather than a
  metronome). A small compass-needle emblem sits lower on the body as a chest badge with its own
  slow, independent side-to-side spin — **deliberately positioned below the face, not centered on
  it**: an earlier pass centered the needle on the face itself, where its length overlapped the
  eyes/mouth and read as an oversized nose rather than a compass emblem. **The needle's rotation is
  split across two nested `<g>` elements, not one** — the outer `<g>` carries the positioning
  `transform="translate(...)"` attribute, the inner `<g>` carries only the CSS `animation` that
  sets `transform: rotate(...)`. A CSS `transform` on an SVG element REPLACES its
  presentation-attribute `transform` rather than composing with it (the same landmine
  `WelcomeScreen`'s own marker positioning and `Roadmap.jsx`'s node transforms already document
  elsewhere in this codebase) — putting both on the same element was tried first and confirmed
  broken: the needle visibly snapped away from the mascot's body to float near the SVG's raw
  `(0,0)` origin the instant the spin animation applied, since the CSS transform silently dropped
  the attribute's translate. `prefers-reduced-motion` is handled entirely via a plain CSS
  `@media` block zeroing out all three animations (bob, blink, needle-spin) — no JS state needed,
  since this is a continuous idle loop with no one-time entrance sequence to coordinate, unlike
  `WelcomeScreen`'s own intro.
- **The greeting (`.mascot-greeting`, a speech-bubble variant of `.caveat-banner`'s own
  card/gold-accent-border language, with a small CSS-triangle tail pointing at the mascot) shows
  `state.displayName || state.username`** — preferring the optional preferred-name field from
  Stage 1 over the required username when the user actually set one, rather than literally always
  showing `username` regardless. This is what gives Stage 1's `displayName` field an actual
  purpose: it would otherwise be collected and never read anywhere. `username` itself is guaranteed
  non-blank by the time a user can ever reach the hub (`SignUpScreen`'s own `canContinue` gate), so
  the greeting has no separate "not set yet" case to handle.

**Dashboard/Guide feature, Stage 3: real prerequisite-based lock/unlock for hub tiles, plus the
missing Transcript & GPA tile from Stage 2.** Every `TILES` entry (`HubScreen.jsx`) now carries
`unlock: (state, hasPartnerSchool) => boolean` and `lockedReason: (state, hasPartnerSchool) =>
string` — both take the same two-argument shape even though only Opportunity Finder's condition
actually depends on `hasPartnerSchool`, so every tile's config reads uniformly rather than mixing
plain booleans/strings with functions for the one tile that needs them. A locked tile stays fully
visible (icon/title/desc unchanged) but renders `.hub-tile.locked`: dimmed via the same
dim-and-suppress-hover treatment `.card.passed` (Opportunity Finder's own "deadline passed" cards)
already established rather than inventing a new disabled-card language, its own theme `Icon`
swapped for a `Lock` icon, a real `disabled` attribute on the underlying `<button>` (not just a
JS-side click guard — clicking it is a genuine no-op, the same way a native disabled button
already behaves), and a visible `.hub-tile-lock-reason` line naming exactly what unlocks it. The
unlock sequence itself, in order:
1. **Let's Build Your Plan** (`survey`) — always unlocked (`unlock: () => true`).
2. **Careers of Interest** — unlocked once `isSurveyComplete(state)` (see below) is true.
3. **Related College Majors** — `state.selectedCareerIds.length > 0`.
4. **Recommended Programs** — `state.selectedMajorIds.length > 0`.
5. **Academic Plan** and **Your School List** — both `state.selectedProgramKeys.length > 0`,
   deliberately the SAME early gate as step 4 progressing into step 6 below, not chained behind
   Transcript & GPA/Course Selection/Opportunities/Project Builder — the build spec's own explicit
   reasoning is that the Academic Plan is meant to be revisited constantly as more gets added to
   it over time, not something only reachable once every later step is separately finished.
6. **Transcript & GPA** (partner-school only) — `state.selectedProgramKeys.length > 0`, the same
   gate as step 5.
7. **Course Selection** (partner-school only) — `state.transcriptCompleted`. Originally
   `state.gpa !== ''` (reusing the same "blank means not entered yet" signal every other
   GPA-aware consumer in this app treats this field as) — see the dedicated bug-fix note right
   after this list for why that turned out to be wrong and was replaced with a purpose-built flag.
8. **Opportunity Finder** — `hasPartnerSchool ? state.transcriptCompleted :
   state.selectedProgramKeys.length > 0`. Partner-school users follow the real screen-flow order
   (`transcript` → `courseSelection` → `opportunities`), so this unlocks at the exact same point
   Course Selection itself does, not a step later — Course Selection has no hard completion gate
   of its own in the real flow either (its own Continue always advances regardless of whether any
   courses were actually picked). Non-partner-school users have no Transcript & GPA/Course
   Selection step to wait on at all, so they fall back to the same "at least one program selected"
   gate most other tiles use.
9. **Project Builder** — `state.selectedProgramKeys.length > 0`, same reasoning as step 5/6 — it's
   optional/skippable content by its own design (see `ProjectBuilderScreen`'s own "Skip for now"
   control), so it doesn't need a stricter gate than the other program-gated tiles.

**Real, confirmed bug fix: `state.gpa !== ''` was never a reliable "Transcript & GPA done or
skipped" signal — it broke specifically for a genuine incoming freshman with zero prior
courses.** `TranscriptScreen`'s "Skip — I haven't taken any courses yet" button (shown whenever
`transcript` is empty) calls the exact same `advance()` function Continue does — and for a truly
empty transcript, `calculate4ScaleGpa([])` has nothing to average and returns `null`, so
`advance()` wrote `gpa: ''` right back out. That's byte-for-byte indistinguishable from "never
visited this screen at all," so a student who did the RIGHT thing (explicitly skipping, per Task
2's own "fully supported path, not a workaround") saw Course Selection stay locked afterward,
same as before they'd touched Transcript & GPA at all — confirmed directly via Playwright before
being fixed, not just inferred from reading the code. **`state.transcriptCompleted`** (a plain
boolean, `AppContext.jsx` `DEFAULT_STATE`) is a dedicated completion flag that fixes this without
touching `state.gpa`'s own semantics at all: `TranscriptScreen`'s `advance()` (both the Roslyn
`TranscriptScreen` and `UCDavisTranscriptScreen` variants, and only their non-checkpoint branch —
Course Selection Stage 4's per-year/per-quarter checkpoint completion is tracked separately via
`courseCheckpoints[stageName].part1Done`/`ucdavisQuarterCheckpoints[...].part1Done` and was never
part of this bug) now sets `transcriptCompleted: true` alongside `gpa` on every real submission,
Continue or Skip alike, regardless of whether the transcript has any entries. `gpa` itself keeps
meaning exactly what it always has everywhere else it's read (`ProgramsStep`'s curated program
list, `reachMatchSafetyTag`'s Reach/Match/Safety badges) — blank still honestly means "don't
guess," this flag is never consulted by anything GPA-VALUE-related, only by the hub's own "is this
step done" checks (Course Selection's/Opportunity Finder's `unlock`, and `GUIDED_SEQUENCE`'s own
`'transcript'` step `isDone` below — all three read the same old `state.gpa !== ''` before this
fix and all three needed the same replacement).

`isSurveyComplete(state)` is exported from `SurveyScreen.jsx` (not reimplemented in `HubScreen.jsx`
as a second copy) and is the EXACT formula `SurveyScreen`'s own `canContinue` already gated on
before this stage — extracted once so the hub's "is the survey done" check and the survey's own
"can I press Continue" check can never independently drift the way this codebase's own
`getStage0TargetLabel` precedent already had to fix a real bug for once (see `trunkSteps.js`).

**Dashboard/Guide feature, Stage 4: the mascot actively guides the user through a PRIMARY
sequence, distinct from Stage 3's unlock rules.** `GUIDED_SEQUENCE` (`HubScreen.jsx`) is a
separate, ordered array from `TILES` — unlock controls what's clickable; this controls what the
mascot actively points at as "the next thing to do." It deliberately excludes Academic Plan and
Your School List (they unlock early per Stage 3 and stay available the whole time, but the
mascot never force-points at them mid-sequence) and only has 8 real steps: survey → careers →
majors → programs → transcript → courseSelection (both partner-school only) → opportunities →
projectBuilder. Each step's own `isDone(state)` reuses the exact same real state signal that
step's tile (or the next tile's `unlock`) already checks — e.g. "Careers of Interest is done" is
the identical `selectedCareerIds.length > 0` check that unlocks Related College Majors — not a
new completion concept invented for the mascot. `getNextGuidedStep(state, hasPartnerSchool)`
filters the sequence to the steps relevant for this user and returns the FIRST one that isn't
done, or a synthetic `ENDPOINT_STEP` (`{ id: 'plan', intro: 'Your plan is really coming
together!...' }`) once every real step is finished — this is a plain function of the current
`state`, recomputed fresh on every render, so returning to the hub after finishing a step always
reflects the current next-incomplete-step; there's no caching to go stale. `projectBuilder`'s own
`isDone` (`state.startedProjects.length > 0`) is a deliberate judgment call, documented inline:
Project Builder is explicitly optional/skippable (its own screen has a persistent "Skip for now"),
and this app has no separate "explicitly skipped" flag anywhere in state to check instead, so
"done" means the same "did they take a real, trackable action" shape every earlier step already
uses, not a new concept.
- **Three signals, combined**, matching the build spec's own explicit requirement: a pulsing gold
  glow on the target tile (`.hub-tile.pointing-target`, `@keyframes hub-tile-pulse-glow` animating
  `box-shadow`, disabled under `prefers-reduced-motion` in favor of a static glow ring instead of
  removing the affordance entirely); a dialogue line in the existing `.mascot-greeting` speech
  bubble (`.mascot-dialogue`, a second, lighter-weight line under the Stage 2 "Welcome, [name]!"
  greeting rather than replacing it) with short, generic placeholder text per this stage's own
  explicit scope — real varied dialogue is Stage 5; and a real pointing gesture from the mascot
  itself (`PointerArrow`, below).
- **`PointerArrow` computes a REAL angle from the mascot to the target tile's actual on-screen
  position** (`Math.atan2` over `getBoundingClientRect()` on both), rotating a small `ArrowRight`
  icon to match — the same "don't fake it, measure it" approach `WelcomeScreen`'s own trail-marker
  placement already established (`getPointAtLength` there, `getBoundingClientRect` here), chosen
  deliberately over a fixed-direction nudge because tiles genuinely reflow across viewport widths
  and whenever the number of rendered tiles changes (`hasPartnerSchool` toggling). A `resize`
  listener recomputes it live. **A real timing bug surfaced and was fixed during this stage**: a
  synchronous `recompute()` call inside the measuring `useLayoutEffect` raced React StrictMode's
  dev-only double-mount cycle — confirmed directly via logging that both `mascotRef.current` and
  every `tileRefs` entry read as unset at the exact moment that specific effect fired, populated
  only a moment later — so the arrow never appeared in the dev server at all (this app's own
  everyday testing environment, StrictMode-wrapped in `main.jsx`). Fixed by deferring the initial
  measurement one `requestAnimationFrame`, the same "don't trust synchronous-at-mount DOM state,
  wait a frame" lesson `WelcomeScreen`'s own double-rAF trail reveal already established for this
  codebase — just one rAF here since there's no CSS transition being raced, only a DOM read.
  **A second real bug, caught by direct screenshot inspection, not just automated assertions**:
  the arrow was originally anchored directly below the mascot, which turned out to sit almost
  exactly where `.mascot-greeting`'s own upward-pointing tail triangle renders — being a later DOM
  sibling, the tail painted over the arrow and hid it completely (the automated test only checked
  that a rotation value existed, which it did; only a real screenshot revealed the arrow itself
  was invisible). Fixed by anchoring the arrow to the mascot's own right-edge instead
  (`.mascot-pointer { right: -4px; top: 50%; }`), with the angle calculation's own "from" point
  moved to match (`mascotRect.right`, `mascotRect.top + height/2`) so the visual anchor and the
  math it's rotated by describe the same point.

**Dashboard/Guide feature, Stage 5: in-flow dialogue — the mascot now appears on every real
screen after the hub (not just the hub itself), with real contextual, hand-written dialogue per
screen/sub-step.** This is primarily a content/voice task layered onto a small, reusable
mechanism, not a new pointing/guidance system — it doesn't touch Stage 4's hub-only
glow/pointer/greeting at all.
- **`MascotIcon.jsx`** is the mascot SVG illustration itself, extracted out of `HubScreen.jsx`'s
  former local `Mascot()` function (byte-identical markup/animations) so both the hub's own large
  mascot and this stage's smaller in-flow widget render the same illustration. Takes a `size` prop
  (hub uses 140, the widget uses 52); all internal coordinates/keyframes are otherwise unchanged.
- **`state.mascotSeenKeys`** (`AppContext.jsx`, a flat string array, persisted like everything
  else) is the single source of truth for "has this student already seen this specific line" —
  every distinct dialogue moment gets its own stable string key (e.g. `'survey-intro'`,
  `'discovery-majors-intro'`), appended once and never removed.
- **`src/data/mascotDialogue.js`** exports `MASCOT_LINES` (flat `key: text`) and
  `getMascotLine(key)` — pure content, matching this codebase's existing "data files stay free of
  logic, screens own the resolution logic" convention (`courses.js`, `opportunities.js`, ...).
  Every `-intro` key is meant to show at most once ever; a matching `-revisit` key (where one
  exists) is short/generic and repeats freely on every later visit; a screen with no `-revisit`
  key defined simply goes quiet on return visits rather than forcing a generic line that wouldn't
  add anything real — this is a deliberate per-screen judgment call (see the hook API below), not
  a hardcoded rule. A few keys extend beyond the original spec's explicit examples (e.g.
  `transcript-empty` for the "no transcript yet" skip state, `courseSelection-checkpoint` for
  Course Selection Stage 4's own two-part revisit mode, `programSummary-empty`,
  `projectBuilder-revisit`), written in the same voice, per the stage's own "don't leave any major
  step silent" instruction.
- **`MascotWidget.jsx`** is the small, dismissible, corner-of-the-screen widget every real screen
  renders: `{ text }` in, a mascot icon + text + dismiss (X) button out, `null` if `text` is
  falsy. Local `dismissed` state resets to `false` whenever `text` itself changes (a NEW line
  always starts undismissed; dismissing one line only hides that line, never silences the widget
  for the rest of the screen). **Rendered via `createPortal(..., document.body)`, not inline — a
  real, confirmed bug fix, not a style choice.** Every screen this widget appears on is wrapped by
  `App.jsx`'s `.screen-transition` div, whose `screen-enter` keyframe animates
  `transform: translateY(...)` with `animation-fill-mode: both` — per the CSS spec, ANY non-`none`
  transform on an ancestor (including one from a still-`fill`-ing animation) makes that ancestor a
  containing block for `position: fixed` descendants. This is the exact same landmine already
  documented and fixed once for the course detail modal (see the Course Selection Stage 3/4
  section) — confirmed directly here too via `getBoundingClientRect()`: the widget's own
  `left: 20px` resolved to `x≈280` instead of `x≈20`, offset by `.screen-transition`'s centered
  `.app-shell` position, which let the widget's real, visible dismiss button silently land on top
  of and intercept clicks meant for the underlying form (confirmed via Playwright: a real click on
  Survey's "High School" pill failed with the dismiss button reported as the actual hit target).
  The portal escapes the ancestor entirely, same fix that already worked for the modal. **The
  widget's own container also needs `pointer-events: none`** (`.mascot-widget` in `global.css`),
  with `pointer-events: auto` re-enabled only on the dismiss button and the text — needed
  separately from the portal fix, confirmed via Playwright reporting the widget's own empty
  bounding box as intercepting clicks meant for content well outside its visible card.
- **`src/hooks/useMascotSeen.js`** is the shared resolution layer every screen uses:
  - `useMarkMascotSeen(key)` — the core "append this key to `mascotSeenKeys` once" primitive, a
    plain `useEffect` keyed on `key`, mirroring this codebase's existing one-shot read/clear
    patterns (`discoveryEntryStep`, `activeCourseCheckpoint`).
  - `useMascotIntroOnce(key)` — the common "one intro line, no revisit text, go quiet after" shape
    (a screen where the summary already shown covers what a revisit would say, e.g.
    ProgramSummaryScreen).
  - `useMascotIntroThenRevisit(introKey, revisitKey)` — the other common shape: a real intro once,
    then a short, freely-repeatable revisit line on every later visit. `revisitKey` is optional;
    omitting it reproduces `useMascotIntroOnce`'s own quiet-after behavior for a caller that only
    sometimes has a revisit line (e.g. Discovery's per-sub-step key set, where not every sub-step
    got one).
  - `useMascotSeenSnapshot(key)` — exported separately for screens with a real precondition beyond
    plain "have they seen it" (TranscriptScreen/CourseSelectionScreen choosing between two
    mutually-exclusive intro variants depending on current state, or a checkpoint-mode branch that
    bypasses the intro/revisit split entirely) — see the flicker bug below for why this exists as
    its own primitive rather than being inlined per-caller.
  - **A real, confirmed bug found via this stage's own Playwright testing: naively checking
    `state.mascotSeenKeys.includes(key)` directly in a screen's render body (to decide what TEXT to
    show) self-invalidates within milliseconds.** `useMarkMascotSeen`'s effect fires essentially
    immediately after mount, appending the key to `mascotSeenKeys` — which triggers a re-render in
    which that SAME live check now reads `true`, so the intro line vanishes (or flips to a revisit
    line) before a user could ever actually read it. Confirmed directly: a widget built this way
    rendered NO text at any point after mount, not even for one frame — by the time the DOM was
    queried, the mark-seen round trip had already completed. `useMascotSeenSnapshot`'s fix is to
    freeze the "was this key already seen" answer for as long as the CALLER keeps asking about the
    SAME key value across consecutive renders, and only re-derive it fresh from live state the
    moment the key value actually CHANGES (via a `useRef` pair tracking the last-seen key and its
    snapshot, compared directly in the render body, not inside an effect). A plain
    `useState(() => ...)` lazy initializer isn't enough on its own here — it only captures a value
    once per component MOUNT, but DiscoveryScreen's single mounted instance asks about a
    DIFFERENT key on every sub-step change (`discovery-careers-intro` ->
    `discovery-majors-intro` -> ...), and later navigating BACK to a sub-step already visited
    needs to re-read the NOW-current seen-state (showing the revisit line), not a value frozen
    from the first-ever visit — recomputing on every key CHANGE (not "first time this key is ever
    seen") gets both right: the mark-seen effect's own re-render keeps the SAME key, so the
    snapshot stays frozen (no flicker); leaving and returning changes the key away and back,
    which counts as a fresh transition, so the snapshot re-reads current state on return.
- **`SurveyScreen.jsx` has the most involved wiring, since it's one continuous page with no real
  sub-screens** — its "landing on a new sub-step" moment is field-completion-driven rather than
  screen-navigation-driven. `SURVEY_MASCOT_SEQUENCE` pairs each dialogue key with a `when(state)`
  precondition (interests -> educationLevel -> schoolYear -> school), mirroring Stage 4's own
  `GUIDED_SEQUENCE`/`getNextGuidedStep` pattern at the field level instead of the tile level.
  `pendingMascotSteps(state)` snapshots every currently-eligible-and-unseen step as a plain array;
  an effect gated on the real progress fields ONLY (`interestTags.length`, `educationLevel`,
  `schoolYear`, `currentSchool` — deliberately NOT `mascotSeenKeys`) reveals that queue one step at
  a time via `setTimeout` (`MASCOT_STEP_DELAY_MS`, 2200ms), storing the currently-shown key in
  local `useState` rather than recomputing it live from `state.mascotSeenKeys` on every render.
  Two real, confirmed bugs were found and fixed building this:
  - **The cascade bug**: gating the resolution effect on `state.mascotSeenKeys` itself (instead of
    only the real progress fields) meant that marking one key seen was itself a state change that
    re-triggered the SAME effect, which immediately found the NEXT eligible-and-unseen step and
    marked THAT seen too — cascading through the whole sequence within milliseconds on a single
    fresh mount, confirmed directly (`mascotSeenKeys` ended up with both `'survey-intro'` AND
    `'survey-interests'` within one render pass). Excluding `mascotSeenKeys` from the effect's own
    dependency array fixes this — the effect only re-fires when the user genuinely changes a
    tracked field.
  - **The one-action-late lag bug**: resolving only the FIRST eligible-and-unseen step per trigger
    (an early version of this effect) starves every step after the first "free" one (no real
    precondition, e.g. `'survey-intro'`/`'survey-interests'`) until some LATER, unrelated field
    change happens to fire the effect again — in practice, a field's own prompt (e.g. "Now, where
    are you in your journey right now?") only appeared AFTER the user had already answered it, one
    action late, never before. Fixed by queuing every currently-eligible-unseen step (not just the
    first) and revealing them one at a time on the `MASCOT_STEP_DELAY_MS` timer instead of
    requiring a distinct real field-change per reveal — this does NOT reintroduce the cascade bug
    above, since each reveal still only marks ONE key seen and the queue itself is a plain
    snapshot, never recomputed against a mid-walk `mascotSeenKeys`.
- **`DiscoveryScreen.jsx`** keys its 3 sub-step dialogue moments (`discovery-careers-intro`/
  `-revisit`, `-majors-`, `-programs-`) directly off its own existing `subStep` local state via
  `useMascotIntroThenRevisit` — structurally simpler/safer than Survey's case, since `subStep` only
  ever changes via an explicit user action (`handleNext`/`goBackSubStep`), never automatically from
  a dependent field settling, so there's no cascade risk to guard against here.
- **`TranscriptScreen.jsx`/`CourseSelectionScreen.jsx`** (both the Roslyn AND UC Davis variants in
  each file) share one pattern: checkpoint mode (Course Selection Stage 4's own two-part revisit)
  always shows the same repeatable `'courseSelection-checkpoint'` line — covering both halves
  ("update your grades first, then pick your next courses") — and is never marked seen, since it's
  meant to repeat every time a checkpoint is reached; onboarding mode picks between two real
  mutually-exclusive intro variants based on current emptiness (`transcript-empty` vs.
  `transcript-intro`, depending on whether `state.transcript`/`ucdavisTranscript` is currently
  empty) via `useMascotSeenSnapshot`, falling back to the matching revisit line once seen. No
  UC-Davis-specific dialogue text was written separately for either screen — the content applies
  just as well to both variants, so both reuse the identical Roslyn-authored keys.
- **`ProgramSummaryScreen.jsx`** picks between `programSummary-intro`/`programSummary-empty`
  (whichever applies to the CURRENT selected-programs count) via a plain `useMascotIntroOnce` call
  — no revisit line was written for this screen, since there's nothing new to say on a later visit
  that the summary itself doesn't already show.
- **`OpportunityFinderScreen.jsx`** is the simplest case: one `useMascotIntroThenRevisit(
  'opportunities-intro', 'opportunities-revisit')` call, independent of which of the 3 browse
  views (Recommended/Browse/My School) is currently active.
- **`ProjectBuilderScreen.jsx`**: the intro line is one-time-ever regardless of which of the 3
  sub-views (categories/category/projectType) the student is on, since it's about the FEATURE, not
  a specific category. The revisit line (`'projectBuilder-revisit'`, "Ready to add another step to
  your project?") is deliberately gated on an actually-active started project
  (`state.startedProjects.some(p => p.status === 'active')`), not just "has seen the intro before"
  — a student who's browsed this screen once but never started anything has no next step to be
  nudged toward, so they see nothing on a return visit instead.
- **`YearOverview.jsx`** (Academic Plan Map 1 — the "(first view)" the original task spec called
  out) gets `plan-intro`/`plan-revisit` via `useMascotIntroThenRevisit`, called directly inside
  this component via `useApp()` even though it's technically a shared component, not a top-level
  screen — the same precedent `Roadmap.jsx` already established for reading `state`/`patch`
  directly rather than threading them down as extra props. **Deliberately NOT `Roadmap.jsx` (Map
  2)** — matching the original task's own explicit "(first view)" framing and this codebase's
  established Map 1/Map 2 distinction; Map 2 never gets its own mascot line.
- **A third, unrelated but real bug surfaced and was fixed while regression-testing this
  stage against the existing Playwright suite (`test-hub.js`)**: a test helper
  (`seedAndGoto`) that does `page.goto(BASE)` immediately followed by overwriting `localStorage`
  and `page.reload()`, with zero settle time in between, intermittently lost a race against the
  FIRST page's own legitimate async effects — specifically, DiscoveryScreen's own mascot-marking
  `patch()` call (a real, new mount-time side effect this stage introduced) firing asynchronously
  after commit could land AFTER the test's `evaluate()` seed but before/during `reload()`,
  clobbering the fresh seed with the old page's own stale state right as the new page was booting.
  This was NOT a real user-facing bug (no real user has an external process racing to overwrite
  their own browser's localStorage in the same instant they reload) — confirmed by tracing the
  exact `patch()` call site and its stack trace, and by verifying the SAME race could be forced
  even on unrelated screens by giving them a mount-time `patch()` call. Fixed at the test-harness
  level (`seedAndGoto` in `test-hub.js` now waits briefly after the initial `goto()` before
  overwriting localStorage, so any of that first page's own in-flight writes settle before the
  test's own seed becomes the definitively last write before reload) — not in the app itself,
  since the app's own behavior (marking a genuinely-just-shown intro line seen) is correct.
  Separately, `AppContext.jsx`'s own persistence effect was hardened to skip a redundant write on
  mount (comparing `state` by reference against a ref snapshotted at mount, not a boolean "have we
  run yet" flag — a boolean alone isn't enough under React StrictMode's dev-only double-effect
  invocation on mount, confirmed via a stack trace showing the write coming from React's own
  `reconnectPassiveEffects` replay) — a legitimate, harmless reduction in redundant localStorage
  writes, though the actual test race above turned out to live in the test harness, not this
  effect.

**"Return to Hub" routing restructure, plus folding Admissions Overview into the hub's own
dialogue.** Two related changes, done together: every screen's Continue/Done and Back now return
to the hub instead of chaining to a fixed next/previous screen, and Admissions Overview was
retired as a standalone screen/tile, its content folded into a few condensed sentences the mascot
delivers as part of its hub dialogue right before pointing at Careers of Interest.
- **Every screen after the hub now targets `screen: 'hub'` on Continue/Done, and (with one
  exception) on Back too** — `SurveyScreen`, all 3 of `DiscoveryScreen`'s sub-steps (careers/
  majors/programs, both directions — see below), `TranscriptScreen`/`CourseSelectionScreen` (both
  the Roslyn and UC Davis variants, non-checkpoint mode only — checkpoint mode is a separate
  mechanism entered from the Roadmap itself, not from a hub tile, and correctly keeps returning to
  `'plan'`, untouched by this restructure), `ProgramSummaryScreen`, `OpportunityFinderScreen`, and
  `ProjectBuilderScreen`'s own "Skip for now"/top-level Back. **The one deliberate exception**:
  `ProjectBuilderScreen`'s "Go to my Academic Plan" button (shown once a project is started) still
  targets `'plan'` directly — it's an explicit, textual "show me my plan" navigation choice the
  user is making, not a generic screen-completion action, so it doesn't fit the Continue/Done
  pattern this restructure targets.
- **Discovery's 3 sub-steps (careers/majors/programs) each independently return to the hub now,
  rather than chaining internally to the next sub-step within the same mounted `DiscoveryScreen`
  instance** — matching how the hub's own `TILES` already treat "Careers of Interest," "Related
  College Majors," and "Recommended Programs" as 3 separate destinations (`HubScreen.jsx`), not
  stages of one wizard. `DiscoveryScreen.jsx`'s old `handleNext`/`goBackSubStep` pair (which
  advanced/retreated `subStep` via `setSubStep`) was replaced with a single `handleNext = () =>
  patch({ screen: 'hub' })` and an equivalent inline Back handler; `subStep` itself is now
  `useState`'d without a setter (`const [subStep] = useState(...)`), fixed for the lifetime of a
  mount and set only by whichever hub tile's own `discoveryEntryStep` launched this visit — a
  student picking up "Related College Majors" next does so by clicking that tile (now unlocked)
  from the hub, landing back on `DiscoveryScreen` via the same `discoveryEntryStep` mechanism
  Stage 2 already established, not by an internal Continue advancing them there. The `.step-track`
  dot visualization (careers/majors/programs) is still rendered — it's still a reasonable
  at-a-glance "which of the 3 am I on" indicator — but is now purely cosmetic, no longer tied to
  any forward/backward navigation.
- **Every defensive/fallback bounce (a screen reached with mismatched state — e.g. Discovery
  reached with zero built tracks, Transcript/Course Selection reached by a non-partner-school
  student) now also targets `'hub'`**, replacing the old `afterDiscovery`/`hasCourseFlow`-derived
  fallback targets — hub is the one single, consistent return point for every abnormal case too,
  not just the normal completion path.
- **`StepProgress`'s numbering was renumbered down by one and its `total` dropped from `9` to
  `8`** across every screen that uses it (Survey stays step 1; Discovery 3→2; Transcript 4→3;
  Course Selection 5→4; Program Summary 6→5; Opportunity Finder 7→6; Project Builder 8→7),
  and `YearOverview.jsx`'s own plain "Step 9 of 9" eyebrow text became "Step 8 of 8" — a
  mechanical consequence of Admissions Overview (the old step 2) being deleted, closing the gap
  it left behind rather than leaving a numbering hole.
- **`AdmissionsOverviewScreen.jsx` and `src/data/admissionsText.js` were deleted outright** (not
  left as unused dead code) — removed from `App.jsx`'s `SCREENS` map and `TRANSITION_SCREENS` set,
  and `'admissions-intro'` removed from `mascotDialogue.js`'s `MASCOT_LINES` (Stage 5's own
  in-page dialogue instruction for that screen no longer applies, since the screen itself is
  gone). Admissions Overview was never actually a hub tile to begin with (Survey's own Continue
  used to chain straight into it before this restructure) — so no tile needed removing on the hub
  side, only the screen and its routing references.
- **Its content now lives in `ADMISSIONS_CONTEXT_LINES`** (`src/data/mascotDialogue.js`) — one
  condensed 1-2 sentence blurb per education level (highschool/undergraduate/transfer), a distilled
  version of what the old `ADMISSIONS_TEXT` page said for that level, not a lookup by the usual
  `-intro`/`-revisit` key pair every other `MASCOT_LINES` entry uses, since this is always shown
  exactly once (the survey-complete → careers-unlocked hub dialogue moment only ever happens once
  per student) as part of a LARGER composed line, not stood alone. `HubScreen.jsx`'s own
  `GUIDED_SEQUENCE` — the ordered list the mascot's hub dialogue already walks through (Stage 4) —
  has its `'careers'` entry's `intro` field as a **function of `state`** rather than a plain
  string, the only entry in the whole sequence that varies this way: `intro: (state) =>
  \`Quick context: ${ADMISSIONS_CONTEXT_LINES[state.educationLevel] || ADMISSIONS_CONTEXT_LINES
  .highschool} Now, let's figure out what excites you.\``. `HubScreen`'s own render resolves this
  generically (`typeof nextStep.intro === 'function' ? nextStep.intro(state) : nextStep.intro`)
  so every OTHER step's dialogue (still plain strings) is unaffected by the branch.
- **A real, pre-existing test-harness race was found and fixed while regression-testing this
  restructure** — not a bug in the app, but a fragility in how several Playwright test files
  navigate between seeded states. Multiple test files (`test-ucdavis-stage1.js`,
  `test-rms-summary.js`) had helper functions that called `seedAndGoto` (goto → overwrite
  localStorage → reload) more than once per page for the first time once this restructure meant
  reaching a downstream screen required a real hub round-trip instead of one continuous Continue
  chain — this surfaced the exact same race `test-hub.js`'s own `seedAndGoto` already had fixed
  (see its own entry above): a live app instance's own in-flight effects racing the test's fresh
  seed. Fixed the same way in each file — a brief settle delay after the initial `goto()`.
  Multiple pre-existing test files that drove screen-to-screen navigation by clicking through a
  fixed Continue chain (`test.js`, `test-rms-summary.js`, `test-myschool.js`, `test-ucdavis.js`,
  `test-ucdavis-stage1.js`, `test-ucdavis-stage2.js`, `test-ucdavis-stage3.js`,
  `test-ucdavis-grade-fix.js`, `test-stage5-mascot.js`) were updated to either assert the new
  `'hub'` target directly or navigate via a real hub tile click / direct re-seed instead of a
  Continue chain that no longer exists — these were updates to match an intentional behavior
  change, not regressions found in the app itself.

**Every screen now returns to the hub on completion — there is no screen-to-screen chaining
anywhere in the flow.** This replaced a much more elaborate multi-layered skip/chain system that
used to exist here (Admissions Overview → Discovery-or-skip → Transcript-or-skip → Course
Selection → Program Summary → Opportunities → Project Builder → Plan, with each screen computing
where to send its own Continue/Back next based on `educationLevel`/`currentSchool`/
`hasBuiltTrack`) — see the "Return to Hub" routing restructure section just above for the full
rationale and mechanics. **Which screens actually exist/are reachable for a given student is now
controlled entirely by hub tile visibility/unlock** (Dashboard/Guide Stage 3, `HubScreen.jsx`'s
own `TILES` — `requiresPartnerSchool` hides Transcript & GPA/Course Selection entirely for a
non-partner-school Undergraduate/Transfer student; `unlock` gates every other tile), not by
routing logic scattered across each screen's own Continue/Back handlers the way it used to be.
`transcript`/`courseSelection` are still effectively High-School-(or UC-Davis-)-only in the sense
that their hub tiles are hidden otherwise, and each still carries its own defensive `useEffect`
bouncing back to `'hub'` if reached with a mismatched `educationLevel`/`currentSchool` (state
restored mid-flow after either changed) — but there's no more Continue/Back chain connecting them
to any OTHER specific screen.

**Dashboard/Guide feature, Stage 6 (final stage): free, browser-native voiceover via the Web
Speech API (`SpeechSynthesis`), reading every mascot dialogue line aloud alongside the text.**
Deliberately the cheap version — no external TTS service, no API cost — to test whether voice
adds anything at all before ever considering a paid, more natural-sounding one; browser voices
vary a lot by device/OS and can sound synthetic, which is an accepted, expected limitation of this
stage, not a bug to chase.
- **`src/utils/speech.js`** is a plain module (not a hook) wrapping `window.speechSynthesis` —
  there's only ever one screen (and therefore at most one mascot dialogue source) mounted at a
  time in this app, so a shared module-level `speak(text)`/`stopSpeaking()` pair is simpler than
  routing every call through React state. `isSpeechAvailable()` checks for both
  `window.speechSynthesis` and `window.SpeechSynthesisUtterance` existing before anything else
  touches either. `primeVoices()` is called once, early, from `App.jsx`'s own `AppShell` mount
  effect — voice lists load ASYNCHRONOUSLY on many browsers (confirmed: Chrome in particular
  reports an empty list on the very first `getVoices()` call and only populates it once its own
  `voiceschanged` event fires), so priming well before the first real mascot line needs to speak
  (which requires navigating past Welcome/Sign Up first, giving the browser a real head start)
  means `speak()` itself can stay a plain synchronous call rather than needing its own async
  retry/wait logic.
- **Voice selection**: no API exposes "which voice sounds warm/friendly," so `pickVoice()` checks
  a small, hand-picked wishlist of voice-name substrings commonly available on major platforms
  (macOS/iOS Safari, Chrome, Windows Edge — e.g. `'Samantha'`, `'Google US English'`,
  `'Microsoft Zira'`) in order, using the first one actually present on this device; falls back to
  the first English voice, then just the first voice available, matching the task's own "choose
  one that sounds relatively natural if there's a choice, defaulting to whatever's first."
  `SPEECH_RATE`/`SPEECH_PITCH` (0.95/1.05 — hand-picked judgment calls, not derived from anything
  measured) are slightly off the browser's flat 1.0 defaults in the direction of sounding less
  rushed/less monotone, without pretending to guarantee "warm" on every device.
- **`src/hooks/useMascotSpeech.js`** (`useMascotSpeech(text, muted)`) is the shared "speak the
  current line, stop when it's no longer current" behavior, used by BOTH `MascotWidget` (Stage
  5's in-flow dialogue) and `HubScreen.jsx`'s own pointing dialogue (Stage 4) — one hook, not two
  separate implementations. A `lastSpokenRef` guards against re-speaking the exact same line on a
  render that didn't meaningfully change it (e.g. unmuting with the same `text` still on screen)
  — speech only ever starts on a genuinely NEW line. Effect cleanup on unmount also stops
  speech — navigating to a different screen mid-utterance cuts the audio off rather than letting
  it keep playing over the new screen.
- **"Dismissed before finishing, stop immediately" (a real explicit requirement) works for free,
  with no special-casing inside the hook itself**: `MascotWidget` passes `!dismissed ? text :
  null` into `useMascotSpeech`, not the raw `text` prop — from the hook's own perspective, a
  dismiss is just an ordinary "the current line went away" change, handled by the exact same
  effect branch that also fires when a screen unmounts or the line is genuinely replaced by a new
  one. `MascotWidget` reads `state.voiceMuted` directly via `useApp()` (added to `DEFAULT_STATE`,
  `AppContext.jsx`) rather than needing every one of its many call sites across every Stage-5
  screen updated to thread a new prop through.
- **The mute toggle is ONE control, not one per widget** — a speaker icon (`Volume2`/`VolumeX`
  from `lucide-react`) added to `App.jsx`'s own persistent header, which already renders on every
  screen except `welcome` and stays mounted across screen navigation (only the inner `<Screen />`
  swaps) — so a plain `state.voiceMuted` toggle here already satisfies "persisted... so the user
  doesn't have to re-mute it every screen" without needing a dedicated session-only store; it
  happens to also survive a reload the same way every other real AppContext-tracked preference
  does, a reasonable bonus for a deliberate mute choice, not something engineered around.
  `App.jsx`'s existing `.brand` div is now wrapped in a new `.app-header` flex row
  (`justify-content: space-between`) so the toggle sits at the opposite end without changing
  `.brand`'s own look — this required moving one existing CSS override
  (`.app-shell.app-shell-plan .brand { margin: 0; padding: ...; flex-shrink: 0; }`, needed because
  the full-bleed Plan layout's own flex column used to treat `.brand` as its direct child) to
  target `.app-header` instead, since that's the new direct flex child there.
- **Task 3 (missing voices, fail silently) is handled at two levels, not just inside `speak()`
  itself**: `speak()` re-checks the live voice list immediately before ever calling
  `speechSynthesis.speak()` and is a no-op if it's still empty (a device/browser with genuinely no
  usable voices) — no error, no attempted native call, text UI completely unaffected either way.
  Separately, the mute toggle itself only renders at all when `isSpeechAvailable()` is true, so a
  device with no Speech API support at all never shows a control that would otherwise do nothing
  audible either way ("no error shown to the user" extended to "no dead control shown," a
  judgment call in the same spirit).
- **Verified directly via Playwright, not just code review** — headless Chromium in this
  environment turned out to have real voices available (`getVoices()` returned 191 entries), so
  testing used real voice objects and a real native `SpeechSynthesisUtterance` throughout rather
  than a synthetic stand-in; `window.speechSynthesis` itself can't be wholesale replaced (a
  non-configurable `Window` property, confirmed directly), but its own `speak`/`cancel` methods
  ARE directly writable in place, which is what test instrumentation monkey-patches to record
  calls without needing real audio hardware. The zero-voices and speech-entirely-unavailable
  cases were confirmed separately by monkey-patching `getVoices()` to return `[]` and by `delete
  window.speechSynthesis` respectively (both directly confirmed viable operations on this
  property, unlike wholesale reassignment) — both leave the visible dialogue text and the rest of
  the app fully functional, with zero `speak()` calls attempted.

**The hub has its own small "Reset" button** (`HubScreen.jsx`), a plain testing convenience — not
a primary user-facing feature — so state can be cleared without digging through devtools/
localStorage by hand. Reuses `reset()` (`AppContext.jsx`) exactly as-is: it already clears every
field back to `DEFAULT_STATE` (including `screen: 'welcome'`) and wipes `localStorage`, so
"returns fully to the welcome screen with no leftover state" is just what calling it already does
— no extra logic needed here beyond the confirmation gate. `window.confirm('Are you sure? This
will erase all progress.')` guards the actual call, the same lightweight synchronous confirmation
pattern this codebase already uses for its one other real "are you sure" moment
(`Roadmap.jsx`'s required-task removal) — not worth a bespoke modal for a testing-only control.
Deliberately styled smaller/dimmer than even `.btn-ghost`'s already-quiet default
(`.hub-reset-btn`, 11px, 55% opacity until hover) and placed below the entire tile grid, set apart
from the hub's own real actions rather than looking like one more option in that row.

**"Show Available Voice Options" — Stage 6's voiceover used to always auto-pick a voice
(`speech.js`'s own name-substring wishlist); a small, explicitly temporary settings panel now
lets the student see every real voice the browser offers, preview each with an actual mascot
line, and pick one that replaces the auto-pick everywhere the mascot speaks.**
- **`speech.js` gained `getAvailableVoices()`** (a fresh `refreshVoices()` + return of the live
  list, not a stale snapshot) and both `pickVoice()`/`speak()` now accept an optional
  `preferredURI` — a specific voice's own `voiceURI`, checked FIRST before falling through to the
  existing wishlist heuristic. `state.voiceURI` (`AppContext.jsx`, `null` by default) is the one
  thing about a picked `SpeechSynthesisVoice` worth persisting — the objects themselves aren't
  meaningful to serialize and aren't guaranteed to be the same instances across a later
  `getVoices()` re-fetch, so this is resolved fresh against the CURRENT voice list on every
  `speak()` call rather than cached; a voice that's no longer available (uninstalled, or genuinely
  a different device) safely falls through to the heuristic instead of silently failing.
- **`useMascotSpeech(text, muted, voiceURI)`** gained the third param, threaded straight into
  `speak()`. Its own `lastSpokenRef` now tracks `{ text, voiceURI }` together, not just `text` —
  deliberately, so that picking a DIFFERENT voice while the same dialogue line is still on screen
  counts as a real, speak-worthy change too: the current line re-speaks immediately in the newly
  picked voice, rather than only taking effect the next time the text happens to change on its
  own. Both callers (`MascotWidget.jsx`, `HubScreen.jsx`) now pass `state.voiceURI` alongside
  `state.voiceMuted`, the same "read shared state directly via `useApp()`, don't thread a new prop
  through every Stage-5 screen" approach `voiceMuted` itself already established.
- **`VoiceSettingsPanel.jsx`** is a new, deliberately small/temporary modal — reuses this
  codebase's existing modal language wholesale (`.overlay`/`.modal`/`.modal-close`/
  `.modal-eyebrow`/`.modal-title`, `useModalExit` for the fade in/out, `createPortal(...,
  document.body)`) rather than inventing new UI for what's explicitly a testing tool, not a
  permanent feature. Lists every voice from `getAvailableVoices()` (re-read fresh each time the
  panel opens, not once on module load, so it reflects whatever's actually loaded by then) as a
  row with a round "preview" button (`speak(SAMPLE_TEXT, voice.voiceURI)`, where `SAMPLE_TEXT` is
  `getMascotLine('survey-intro')` — a real mascot line, not placeholder text) and a "pick" button
  (`patch({ voiceURI: voice.voiceURI })`) side by side, plus a "Default (auto-picked)" row at the
  top (`patch({ voiceURI: null })`) to explicitly clear a pick and fall back to the heuristic
  again. The currently-selected row gets a checkmark and highlighted border either way. An empty
  voice list shows its own honest message rather than a blank list — the same "don't guess, don't
  silently show nothing" posture `speech.js`'s own zero-voices fallback already established.
- **Trigger**: a small gear icon (`Settings2`, `lucide-react`) in `App.jsx`'s persistent header,
  right next to the existing mute toggle — both wrapped in a new `.header-actions` flex row so
  `.app-header`'s own `justify-content: space-between` still treats them as one unit at the
  right-hand end. **A real, confirmed naming collision surfaced and was fixed while building
  this**: both buttons initially shared the literal class `.voice-mute-toggle` for their identical
  round-icon styling, which broke a PRE-EXISTING Playwright test's own `.voice-mute-toggle`
  locator (confirmed directly — it silently resolved to 2 elements and Playwright clicked
  whichever came first in the DOM, the new settings button, not the real mute toggle, causing
  several of that test's own assertions to fail even though the mute toggle itself worked fine
  when clicked directly). Fixed by extracting the shared look into `.header-icon-btn` (applied to
  both) while giving each button back its own distinct, uniquely-selectable class
  (`.voice-mute-toggle` / `.voice-settings-toggle`) — the lesson being that reusing an
  already-meaningful class name purely for its styling, on a second unrelated element, can quietly
  break something that was relying on that class being unique.

**`ProgramSummaryScreen.jsx` aggregates every program the student selected across Discovery into
one Reach/Match/Safety-grouped list — deliberately a pure display layer, not a new scoring
system.** Every program's tag comes from calling the exact same `reachMatchSafetyTag(state.gpa,
program.gpaValue)` (`programs.js`) that `ProgramsStep.jsx`'s own `ProgramCard` already calls per
card during Discovery — this screen re-runs that identical pure function over
`getMergedPrograms(state.selectedMajorIds, level).filter(p => state.selectedProgramKeys.includes(
p.key))` and groups the results, nothing more. No new "factor" (acceptance rate, extracurricular
strength, etc.) was added — this app never collected that data, and inventing a formula around
data that doesn't exist would be a less honest version of the GPA-vs-benchmark comparison already
in use everywhere else. `gpaBenchmarkText()` (the "Typical GPA" display text, e.g. `"3.8+"` or
`"Audition-based — GPA secondary"`) was moved from being a private helper inside `ProgramsStep.jsx`
into a shared export in `programs.js` specifically so this screen could reuse the identical text
instead of a second copy drifting out of sync. A program whose `reachMatchSafetyTag` call returns
`null` (blank/unparseable `state.gpa`, or a portfolio/audition program with `gpaValue: null`) goes
into its own "Not Yet Categorized" section rather than being silently dropped or force-fit into a
bucket — same "don't guess" posture `selectProgramsForGpa`/`reachMatchSafetyTag` themselves already
use. Task 2's count line (`.rms-summary-line`, e.g. "You have 1 Reach, 2 Match, and 1 Safety
schools selected") is pure arithmetic over the same three group arrays already rendered below it —
no separate counting logic, so the line can never drift out of sync with what's actually shown.
Zero selected programs shows an honest empty-state message rather than an empty page.

**`AppContext` (`src/context/AppContext.jsx`) is the single source of truth**, a flat
`useState` object with a `patch()` merge function, auto-persisted to `localStorage` under
`mypath-prototype-state`. Key fields: `interestTags`, `educationLevel`, `schoolYear` (what
grade/year within that level — 9-12 for highschool, 1-4 undergraduate, 1-3 transfer; drives
how many trunk stages get prepended, see "Multi-year trunk" below), `currentSchool` (Survey's
school search/select field, `src/data/schools.js` — only `'Roslyn High School'` is real right
now, `''` means unselected; High-School-only, see the routing note above), `transcript` (array of
`{ id, courseId, gradeEarned, yearTaken }` — entered on `TranscriptScreen`, Course Selection Stage
2; see that section below), `selectedCourseIds` (array of `course.id` values picked on
`CourseSelectionScreen`, Course Selection Stage 3 — see that section below), `gpa` (no
longer entered directly on the Survey — the survey's own GPA text box was removed once Course
Selection Stage 1 shipped; `TranscriptScreen` now writes the converted 4.0-scale GPA here as a
string, same field/format the old input used, so downstream GPA-aware code (`ProgramsStep`,
`roadmapGenerator.js`) needed zero changes; blank/unparseable `gpa` was already a handled "don't
guess" fallback everywhere it's read, which is what an empty `transcript` naturally produces),
`selectedCareerIds` / `selectedMajorIds` / `selectedProgramKeys` (all **arrays** — Screens 3a/
3b/3c are multi-select, not single-select), `selectedOpportunityIds`, `completedNodes` (flat
map of node/step id → boolean, shared by every core spine item and every opportunity's branch
steps alike), `nodeDateOverrides` (flat map of node/step id → `'YYYY-MM-DD'`, a user-edited due
date that overrides the template-computed one), `removedNodeIds` (flat map of node/step id →
`true`, a user-deleted task), `customTasks` (array of `{ id, title, date: 'YYYY-MM-DD', desc }`
— tasks the user created themselves via the roadmap's "+ Add Task" control, see below),
`startedProjects` (array of started Project Builder projects, each growing its own `steps` array
over time — see the `ProjectBuilderScreen`/`buildProjectChain` section below, this is deliberately
NOT part of `customTasks`), and `screen`. `reset()` clears storage and returns to the survey. The Survey screen's
"What year are you in?" pill group resets `schoolYear: null` whenever `educationLevel` changes
(its options are conditional on level), so Continue stays disabled until both are picked.

**Track resolution has two tiers, not one.** `src/data/interests.js` exports:
- `getBuiltTracks(tags)` — the 11 tracks with full career/major/program data. Drives Screen 3's
  routing/content and the Back-button target.
- `getOpportunityTracks(tags)` — a superset also including `lifestyle` (Fitness/Fashion, the
  one opportunity-only track). Drives Screen 4's content. An empty result (only "Law" selected,
  or nothing) falls back to `GENERIC_OPPORTUNITIES`.

Both are *merging*, not single-value: selecting 2+ built-track tags merges their career cards
on Screen 3a, then filtered by `selectedCareerIds`; mixing a built and unbuilt tag silently
drops the unbuilt one. Once a career is picked, downstream steps don't need to know which track
it came from — `MAJORS` is one flat namespace keyed by major id regardless of track.

**The Survey's interest-tag picker has no selection cap** (it did originally — `MAX_TAGS = 3` —
removed since it only ever constrained which tracks feed Screen 3a's career pool, not how much
ends up on the Academic Plan; that's still gated separately by which careers/majors/programs/
opportunities the student actually selects downstream, unaffected by how many tags they start
from). Because a student can now realistically select tags spanning many tracks at once,
`careers.js` exports two pool builders instead of one: `getCareerPool(tracks, level)` stays the
flat, deduped-by-nothing-in-particular list existing id-based consumers need (`selectedCareerIds`
filtering in `DiscoveryScreen.jsx`, `roadmapGenerator.js`'s `selectedCareers` lookup) — untouched.
`getCareerGroups(tracks, level)` is the new one, `[{ track, careers }]` in the same order
`getBuiltTracks` produced `tracks` (i.e. the order the student's tags first introduced each
track) — this is what `CareersStep.jsx` actually renders, one section header (`TRACK_LABELS[track]`,
exported from `interests.js`) per group, so a large merged pool stays scannable instead of one
undifferentiated grid. A single "Academic" category tag group in `CATEGORIES` can still route to
two different tracks (Mathematics → `stem`, History → `academic`), so selecting both can produce
two separate group sections even though the student only opened one category on the Survey —
that's correct, matching how `getBuiltTracks` already treated them as distinct tracks before this
change; grouping just makes it visible now.

**Self-Discovery (Screen 3) is multi-select end to end**, with pruning on the way back up:
`DiscoveryScreen.jsx`'s `toggleCareer`/`toggleMajor` handlers recompute which majors/programs
are still reachable after a change and drop any selections that no longer are (e.g.
deselecting a career drops majors that were only reachable through it). Majors merge
(deduped) across every selected career; `getMergedPrograms(majorIds, level)` in `programs.js`
merges programs across every selected major, deduped **by institution+program** (not by
major) — a program legitimately offered under two selected majors shows once, labeled with
both, keyed by `${institution}::${program}` rather than the old `${majorId}::${institution}`.

**Each of Discovery's 3 sub-steps has its own independent "Recommended for you" / "Browse
all ___" toggle** (`DiscoveryScreen.jsx`'s `careersView`/`majorsView`/`programsView`, local
unpersisted `useState` each — same "session-only UI convenience" trade Project Builder's and
Opportunity Finder's own browse toggles already make). Recommended is the exact original,
unchanged behavior at every sub-step. Browse reuses the SAME data functions with a wider input
rather than new ones:
- **Careers**: `getCareerGroups(BUILT_TRACKS, level)` instead of `getCareerGroups(tracks, level)`
  — `CareersStep.jsx` already rendered grouped-by-track unconditionally (even Recommended's
  smaller result uses the same grouped shape), so no component changes were needed there at all.
- **Majors**: a new `getMajorGroups(tracks, level)` (`careers.js`) — analogous to
  `getCareerGroups`, but MAJORS itself has no per-major track field, so a major's track is only
  ever derived through whichever career(s) reference it (`getCareerPool([track], level).flatMap(c
  => c.relevantMajors)` per track). A major reachable from more than one track's careers (e.g.
  `business-administration`, deliberately reused by `sports`/`culinary` — see below) is grouped
  under the FIRST track that references it and not repeated later, same first-track-wins
  precedent `getOpportunityPool` already uses. `MajorsStep.jsx` takes an optional `majorGroups`
  prop (browse) alongside its original flat `majorIds` prop (recommended, untouched) and renders
  grouped-by-track section headers, same visual pattern as `CareersStep`.
- **Programs**: grouped by MAJOR, not track (the natural organizing dimension per-program) — every
  major reachable across `BUILT_TRACKS` at this level gets its own section, each running
  `getPrograms(majorId, level)` → `selectProgramsForGpa(..., gpa, 1)` **independently** (not
  merged across majors like Recommended's `getMergedPrograms` does), so the same program can
  legitimately appear under more than one major's section — Browse is exploring by major, not
  building one deduplicated school list yet. `ProgramsStep.jsx`'s card JSX was extracted into a
  shared `ProgramCard` so Recommended and Browse render Reach/Match/Safety tags and GPA
  benchmarks through the exact same code either way, per the "keep it working exactly the same"
  requirement — only which list feeds the cards differs.

**Two real, pre-existing bugs surfaced once Browse mode could select outside the student's own
tracks — both were the same root cause: a lookup scoped to `getBuiltTracks(state.interestTags)`
(the narrow, survey-derived set) instead of every track.**
1. `DiscoveryScreen.jsx`'s `careers` pool (used to resolve `selectedCareers`/`majorIds` for the
   Recommended Majors view, and inside `toggleCareer`'s own pruning) was `getCareerPool(tracks,
   level)` — a Browse-selected career outside `tracks` would silently vanish from
   `selectedCareers` the moment ANY career got toggled afterward, incorrectly pruning majors that
   were actually still reachable through it. Fixed by widening it to
   `getCareerPool(BUILT_TRACKS, level)` — `careerGroups` (the Recommended CareersStep's own
   narrower grouped display) is intentionally left as `getCareerGroups(tracks, level)`, since that
   one still needs to reflect only the student's own interests.
2. `roadmapGenerator.js`'s `careerPool` (used to resolve `selectedCareers` for the plan's own
   title and `ctx.careerName` personalization text) had the identical bug — `getCareerPool(
   getBuiltTracks(state.interestTags), level)`. A Browse-selected career would silently drop out
   of the plan's title (e.g. falling back to the generic "Your Personalized Academic Plan"
   instead of "Your Path to Software Engineer"). Fixed the same way, widened to `BUILT_TRACKS`.
   (`selectedMajors`/`mergedPrograms` in the same function were already safe — they resolve
   directly by id via `MAJORS`/`getMergedPrograms`, never track-scoped.)

**Course Selection is a multi-stage build; Stages 1-3 are all done now.** Stage 1 (survey/flow
changes — the school field, removing the self-reported GPA box, inserting `transcript` and
`courseSelection` into the screen order), Stage 2 (`TranscriptScreen`), and Stage 3
(`CourseSelectionScreen`, letting a student pick their upcoming courses from the same catalog) are
all real, wired-up screens — none of Course Selection is a placeholder anymore. All three stages
(plus the school selector) are gated to High School only — see the routing note near the top of
this Architecture section.

- **`src/data/courses.js` is the shared course database Stage 2 and Stage 3 both read from — built
  once, not duplicated per screen.** It's Roslyn High School's real 2026-27
  course catalog, parsed directly from the school's own published PDF, covering the 11
  departments the build spec named (Art, Business, English, Math, Music & Theater, Physical
  Education & Health, Science, Social Studies, World Languages, 21st Century Learning, Special
  Education — English as a New Language and BOCES-Barry Tech were in the source PDF but NOT in
  that list, and are deliberately excluded). 207 courses total. Each entry has `id` (a stable
  slug — what `TranscriptScreen` actually stores per entry, never an array index), `name` (Title
  Case; the source PDF used ALL CAPS section headers, so names were carefully re-cased — see the
  file's own header comment for exactly which parts were and weren't touched, e.g. acronyms like
  AP/RSH/PLTW and already-stylized text like "INCubator@RHS" were left alone), `department`,
  `credit`, `gradeLevels` (an array — which grades CAN take it, course metadata, NOT the same
  thing as a transcript entry's own user-entered "year taken"), `prerequisite`, a 1-2 sentence
  `description` distilled from the course's own real catalog text (not invented), and
  `weightCategory` (`'ap' | 'research_honors' | 'honors' | 'standard'`, tagged from the course's
  own name per the catalog's stated rule). Nine Special Education "self-contained/subject-
  specific" courses (e.g. Algebra 1A/1B, Applied Chemistry) have `credit: null` and
  `gradeLevels: []` with a `note` explaining why — the catalog itself states no fixed credit or
  grade range for these IEP-driven placements, and that was left unguessed rather than invented.
  Two courses (`College Preparatory Strategies for SAT/ACT Exams`, cross-listed under English and
  Math — the source catalog's own structure, not a duplication bug) carry `isPassFail: true`,
  since their own description explicitly states pass/fail grading; `gpa.js` excludes these from
  both GPA calculations, per the catalog's own stated exclusion rule. `getCourseById(id)` and
  `searchCourses(query)` (case-insensitive substring match against name + department) are the
  only two ways anything in the app reads this data — there is no free-text course entry
  anywhere, matching the "select from the real catalog" requirement.
- **`TranscriptScreen` (Stage 2) replaces the Stage 1 placeholder and, functionally, the original
  Survey GPA text box.** `CourseSearchField` (`src/components/`, modeled on `SchoolSearchField`
  but returns the full course object to its caller instead of tracking its own persistent value,
  since a selection here is just one step of a larger "add a course" form) searches
  `searchCourses()`; picking a course plus a 0-100 grade and an 8th-12th "year taken" appends one
  `{ id, courseId, gradeEarned, yearTaken }` entry to the new `state.transcript` array (persisted
  like everything else in `AppContext`). **"Skip — I haven't taken any high school courses yet"**
  is a real, equally-supported path for an incoming freshman, not a workaround: it's shown
  automatically whenever `transcript` is empty, and does the exact same thing the "Continue"
  button always does — advance, saving whatever GPA an empty transcript produces (blank, via the
  same "don't guess" contract every GPA-blank consumer already had). `src/utils/gpa.js` derives
  all three numbers live from `state.transcript` on every add/remove: `calculateUnweightedGpa`
  (a 0-100 average of raw grades, excluding `isPassFail` courses — Roslyn reports GPA on the same
  100-point scale courses are graded on, not a 4.0 scale), `calculateWeightedGpa` (same average,
  but each grade is multiplied by its course's real weight multiplier from
  `WEIGHT_MULTIPLIERS` — AP 1.1 / Research Honors 1.09 / Honors 1.08 / standard 1.0, the catalog's
  own stated policy — before averaging; also excludes `isPassFail` courses, since the source
  states that exclusion applies to both the unweighted AND weighted GPA, not just one), and
  `calculate4ScaleGpa` (the unweighted average run through a standard numeric-to-4.0 conversion
  table — 93-100→4.0, 90-92→3.7, ... down to 65+→1.0, 0-0.999→0 — this table is the common,
  widely-used one, not something the catalog itself states, since the catalog only gives the
  100-point scale and the weight multipliers, not a 4.0 conversion). **`calculate4ScaleGpa`'s
  result — not the weighted GPA — is the one value that actually feeds `state.gpa`**, written as
  a string (e.g. `'3.7'`) on Continue/Skip, exactly the same field and format the old self-
  reported input used, so `ProgramsStep`'s GPA-curated selection and `reachMatchSafetyTag`'s
  Reach/Match/Safety badges needed zero changes — verified end-to-end (a transcript averaging to
  a 3.7 4.0-scale GPA correctly produces the same Reach/Match/Safety badges a self-reported "3.7"
  always did). Weighted GPA is real, correctly calculated, and shown to the student (all three
  numbers display together, per Task 3), but is otherwise display-only — this app's GPA-aware
  features were built around one 4.0-scale number and stay that way rather than being redesigned
  around a weighted one.
- **`CourseSelectionScreen` (Stage 3) has four pieces, matching the build spec's own four tasks —
  policy summary, browsable catalog with filters, interest-based recommendations, and a personal
  selection list.** All of it reads from the same `COURSES` array Stage 2 uses; nothing is
  duplicated.
  - **Task 1 — policy summary**: a fixed `POLICY_SECTIONS` array (7 entries — Graduation
    Requirements, Subject Minimums, Diploma Types, Course Load Per Grade, GPA Weighting, Honors
    Distinction, AP Course Policy), rendered as a `.policy-grid` of small icon-header + bullet-list
    cards rather than prose, so a dense set of real Roslyn policy numbers (22 credits, 40 service
    hours, per-subject minimums, 3 diploma types, exam counts, course-load-per-grade, the same
    `WEIGHT_MULTIPLIERS` Stage 2's GPA math already uses, Honors Distinction thresholds, AP
    exam-or-reverts-to-Honors policy) stays scannable. This is fixed reference content, not derived
    from `COURSES` — the numbers came directly from the build spec, not the catalog file.
    **Immediately above it (only in the original onboarding view, never in checkpoint mode — see
    Stage 4 below), a `.course-scope-banner` clarifies that this page is scoped to next year's
    courses ONLY, not the student's whole remaining path** — a real gap the build spec caught: a
    student could otherwise read the full course grid as "plan your entire high school career
    here." `nextYearLabel` derives the actual next stage's label the same way `roadmapGenerator.js`
    does (`STAGE_PLAN`/`TRUNK_STAGES`, keyed off `state.schoolYear`) — `null` for a 12th-grader
    (`stageNames.length === 1`, no next Roslyn cycle to name), which swaps the copy to a
    "finalizing your current-year registration" framing instead of naming a nonexistent next
    year. Reuses `.caveat-banner`'s existing gold-accent visual language (same pattern the
    transfer-timeline caveat elsewhere in this app already uses for "important context, not just
    another muted aside"), with its own `.course-scope-banner` modifier making it bolder/darker
    than the default caveat styling specifically so it doesn't get lost as "one of the first
    things a student reads," per the build spec's own test criterion. Checkpoint mode (Part 2)
    never shows this banner — its own header (`Select Your Courses for ${targetStageLabel}`)
    already states the scope unambiguously, so repeating it here would be redundant.
  - **Task 2 — browsable catalog**: reuses the shared "Recommended for you" / "Browse all ___"
    pill toggle every other multi-content screen in this app uses (Discovery's 3 sub-steps,
    Opportunity Finder). Browse mode adds a plain text search box (name-only substring match) plus
    four independent multi-select pill-group filters — Category (department, from
    `[...new Set(COURSES.map(c => c.department))]`), Grade Level (9-12), Credits (0.5/1/2/`'none'`
    — `'none'` matches the 9 Special Education courses with no stated credit value, labeled
    "Varies" in the UI), and Special Attributes (AP/Honors/RSH, matched against `weightCategory`).
    Empty filter arrays mean "no filter applied," same convention Opportunity Finder's own track
    filter uses. No community comments/ratings on cards anywhere here, matching every other
    "explicitly no social features" content type in this app (opportunity steps, Project Builder's
    community examples).
  - **Task 3 — recommendations**: `src/data/courseRecommendations.js` exports
    `TRACK_RECOMMENDED_COURSES`, a hand-picked `{ [track]: courseId[] }` map keyed by the same
    `OPPORTUNITY_TRACKS` keys Opportunity Finder uses (not just `BUILT_TRACKS` — a student with
    only a `lifestyle`-track tag selected still gets a recommendation attempt), and
    `getRecommendedCourses(tracks, getCourseById)`, which merges + dedupes ids across every given
    track and resolves them to real course objects. `CourseSelectionScreen` calls this with
    `getOpportunityTracks(state.interestTags)` — the same track-resolution input Opportunity
    Finder itself uses, not majors (majors aren't tied to individual courses in this data model, so
    there's no finer-grained mapping to build without inventing one). Business, STEM, Healthcare,
    Creative, Academic/Humanities, and Media & Entertainment follow the build spec's own example
    mappings; Sports, Community & Leadership, Personal Development, Outdoors, and Lifestyle
    (Fitness/Fashion) were extended by judgment across the same 207-course catalog. **Culinary Arts
    is deliberately an empty list** — Roslyn's catalog has no Family & Consumer Science/Culinary
    department among the 11 covered departments, so forcing a weak match would be dishonest; the
    screen shows a plain "No strong course matches for this interest yet" message instead, per the
    spec's own explicit permission for weak-match tracks. The required disclaimer ("You're always
    free to explore any course you like — these are suggestions, not requirements.") renders
    directly under the Recommended toggle whenever that view is active. A course id can validly
    appear under more than one track (e.g. AP Biology under both STEM and Healthcare); the merge
    step dedupes so a student with tags spanning both only sees it once.
  - **Task 4 — selection list**: a dedicated `.course-select-btn` on each card (Recommended or
    Browse, same handler either way) toggles its `id` in `state.selectedCourseIds` — clicking the
    card body itself instead opens the detail modal (see below), so selection needed its own
    explicit control once that split happened; both write to the same array, so persistence is
    automatic via `AppContext`'s existing `localStorage` write regardless of which one was used. A
    "Your selected courses (N)" strip below the grid lists every selection as a removable chip
    (`.course-selected-chip`, reusing `.tag.selected` styling) so a student can review/deselect
    without hunting through the full grid again. **Roadmap wiring is now done — see Stage 4
    below.**

**A second, distinct "Program-Specific Course Recommendations" section extends Task 3 — driven by
selected majors, not interest tags, and grounded in real admissions research rather than the
track-based judgment calls `courseRecommendations.js` already makes.** `src/data/
programRecommendations.js` maps `MAJORS`' ~47 major ids (`src/data/majors.js`) to one of 5
admissions-research-backed **program types** (`MAJOR_TO_PROGRAM_TYPE`): `engineering-stem`,
`business`, `premed-healthcare`, `creative-arts`, `humanities-prelaw`
(`PROGRAM_TYPE_LABELS`). The framing is deliberately honest about its own precision: real
admissions guidance converges heavily by FIELD (Cornell Engineering and most other engineering
programs want largely the same math/science foundation), not dramatically between individual
schools in the same field — so this recommends courses "commonly recommended for [type] programs,"
never claiming to know one specific school's individual preference. Engineering/STEM, Business, and
Pre-Med/Healthcare are grounded in real, specific cited research (Cornell's stated engineering
requirements; Wharton/Haas-oriented business guidance; standard pre-med admissions guidance);
Creative/Arts and Academic/Humanities/Pre-Law extend that by the same kind of judgment call this
codebase already uses elsewhere (Arts programs weigh a portfolio more than a prerequisite list;
Humanities/Pre-Law programs value writing/history/government coursework). A handful of majors from
tracks with no dedicated research (Sports, Culinary Arts, Community & Leadership, Media &
Entertainment, Personal Development, Outdoors) are folded into the closest honestly-fitting type by
the same judgment (e.g. Sports Management is, by its own `overview` text, "the business side of
athletics" — mapped to `business`, not invented as its own type). **`culinary-arts` itself is
deliberately left OUT of the map entirely** — a hands-on skills-based program with no real
academic-prerequisite research to honestly report, the exact same "don't force a weak match"
precedent `TRACK_RECOMMENDED_COURSES.culinary` already set as an empty array.
`getSelectedProgramTypes(state.selectedMajorIds)` resolves the distinct types reachable from the
student's Discovery major selections (in first-introduced-first order, same convention
`getCareerGroups`/`getMajorGroups` already use), and `CourseSelectionScreen.jsx` renders one
`.career-group`-styled section per type (reusing that existing grouped-section class rather than
inventing new CSS) — a student whose selected majors span two types (e.g. Computer Science +
Business Administration) sees two separate labeled subsections, not a merged list. Zero majors
selected shows an honest "Select majors in Discovery..." prompt; majors selected that map to
nothing (i.e. only `culinary-arts`) show a distinct "No program-specific research available..."
message — neither case silently renders an empty section. Both this section and the existing
interest-based one keep their own "you're always free to explore any course you like" disclaimer
text, and both use the same extracted `CourseCard` component (pulled out of the main
recommended/browse grid specifically so this section didn't need to duplicate that JSX) — so a
course recommended by both layers renders identically and stays selectable/clickable either way.

**A third, even more specific "School-Specific Requirements" section sits below that one —
per individual selected SCHOOL + PROGRAM (`state.selectedProgramKeys`, the exact
`${institution}::${program}` keys Discovery's Programs step already produces via
`getMergedPrograms`), not per major/field.** This is deliberately a different kind of claim than
either recommendation layer above it: those are field-wide judgment calls ("Engineering programs
broadly want calculus and physics"); this one is ONLY ever a real, independently verified
structural fact about one specific school — never inferred from a program's name or subject.
`src/data/schoolRequirements.js` exports `SCHOOL_SPECIFIC_REQUIREMENTS`, keyed by that same
`${institution}::${program}` string for a direct lookup (no fuzzy matching), where each entry is
self-contained (`{ requirement, why, transferNote?, source }`) so the next verified program can be
added later by adding one new key — no lookup/render code changes needed, which is the whole point
of building it this way (full coverage of every program will happen gradually, one verified entry
at a time, not all at once). **Seeded with exactly one real, verified example**: Cornell
University's Communication major, added as a genuinely new 6th program card under the
`communications` major in `programs.js` (deliberately breaking that file's usual "5 per major"
convention — see the comment there) specifically to carry this — Cornell's Communication major is
housed in the College of Agriculture and Life Sciences (CALS), not a standalone communications
department, so it inherits CALS's blanket science-distribution requirements (a full year of
Introductory Biology with lab, 3 credits of Chemistry or Physics, a Statistics/Quantitative
Literacy course) — exactly the kind of non-obvious, easy-to-miss structural fact this feature
exists to surface, plus its own transfer-specific note (this coursework must be completed or in
progress at time of application) and a plain-text `source` description rather than a fabricated
URL, since no real citable link was verified for this entry. Zero programs selected shows its own
honest "Select a program in Discovery..." prompt rather than hiding the section entirely, same
pattern the Program-Specific Course Recommendations section above already uses for its own empty
state. Note that because `communications` now has 6 cards (`selectProgramsForGpa`'s
`maxShownFor(1)` caps a single-major view at 4), Cornell isn't guaranteed to appear in Discovery's
Programs step at every entered GPA — it reliably shows once the entered GPA reaches its own
`gpaValue` (3.8) or higher, since `selectProgramsForGpa`'s no-reach branch always includes the
single highest-`gpaValue` reachable program via `evenSample`'s endpoint-inclusive sampling; this is
existing, unmodified selection behavior working as designed, not something special-cased for this
one card.

**Grown to 26 entries (Cornell plus 25) in a second research pass, scoped to every school under
the `data-science`, `statistics`, `ms-ai-ml`, `ms-robotics`, and `ms-data-science` majors (all 5
schools per major, not just the flagship) — every other major's programs (~196 of the ~221 total
`institution::program` combinations) still show the honest unverified fallback, not a guess.**
This pass was done by an autonomous research agent with real web-search/fetch access, each finding
independently checked against one of three honest outcomes before being written here: a genuine
non-obvious requirement (e.g. UC Berkeley gates its Data Science and Statistics majors behind a
separate, competitive post-admission declaration process with its own course-specific GPA
thresholds — general campus admission doesn't guarantee entry to the major itself; MIT EECS offers
no standalone terminal master's to outside applicants at all, only a PhD track that awards a
master's along the way; Stanford's undergraduate Statistics-focused major was actually
discontinued in 2022 and folded into a new, differently-named Data Science major), an explicit
"checked, and it's genuinely just the general admission minimum" finding (several Arizona State
programs), or an honest "couldn't verify" left as the existing fallback. Most entries were fetched
directly from a real institutional page (`source` says "verified directly"); a handful used a
search-derived synthesis instead (`source` says "verified via search") — primarily because
`stanford.edu`-family domains returned 403s to direct fetch all session, so those specific findings
lean on multiple independently-cited `.edu` pages found via search rather than one directly-read
page. The three highest-stakes claims (the Stanford major-discontinuation claim, MIT's
no-terminal-master's policy, and a University of Utah requirement whose only found source was a
2016-dated PDF) were independently re-verified in a second, separate search pass before being
included, specifically because a wrong claim here is worse than the honest "not yet verified"
fallback it would replace — see each of those three entries' own `source` field, which notes the
re-verification. **The remaining ~191 programs were deliberately left unresearched rather than
attempted with lower rigor** — the standing instruction for this feature is real verification or an
honest fallback, never a rushed or lower-confidence guess just to fill in a card.

**A visibility gap surfaced once this shipped: the 25-program batch clustered entirely in one
narrow, largely graduate-level corner of STEM, so a tester picking an obvious, popular program in
any other track — or even MIT's plain Computer Science major in STEM — saw the honest fallback
every time, not a real example.** Cross-checking the 26 entries (Cornell plus the 25) against each
major's own flagship (most-selective) program found only 6 overlaps, and all 6 sat inside that same
data-science/statistics/AI/robotics cluster — zero overlap with Business, Healthcare, Creative,
Academic/Humanities, or any other track, and the single most obvious STEM pick (MIT's plain
`Computer Science (EECS)` major, not the graduate AI track) was still unverified. Fixed by directly
researching 5 more entries, one per track, each chosen specifically because it's the flagship/most
recognizable pick a tester would naturally reach for: `University of Pennsylvania::Wharton School`
(Business — Wharton's undergrad degree is nearly a third liberal-arts/language coursework despite
being a business school), `MIT::Computer Science (EECS)` (STEM — MIT has no competitive secondary
admission to declare Course 6 at all, a direct, useful contrast with UC Berkeley's EECS/Data
Science/Statistics entries elsewhere in this file, which DO gate declaration behind a separate
GPA-checked process), `Johns Hopkins University::Biology / Pre-Med Track` (Healthcare — "pre-med"
isn't a major there, it's a university-wide advising track layered on top of any declared major,
with its own real prerequisite checklist), `The Juilliard School::Music Performance` (Creative —
a two-stage prescreening-video-then-NYC-only-audition process), and `Yale University::Yale Law
School` (Academic/Humanities — accepts LSAT or GRE with no preference and explicitly no GPA/score
cutoff of any kind). Same rigor as the 25-program batch: 3 of the 5 were fetched directly, 2 hit
403s and are search-verified instead (each source field says which); nothing here is a guess dressed
up to fill the visibility gap. 31 entries total now.

**Course descriptions are complete, real catalog text — not manually truncated at parse time.**
Stage 2/3's original data entry hand-trimmed every description to a short length with a trailing
"...", which produced visible mid-sentence cutoffs in the UI (e.g. "PE - Extreme" rendering as
"...traditional physical education. The program is..."). All 112 originally-truncated entries were
re-parsed from the real source PDF (fetched fresh, converted to text via `pypdf`, cleaned of PDF
ligature/quote artifacts) and replaced with their complete text — `courses.js`'s own header comment
documents this. Any preview/truncation now happens **only** in the UI layer:
`CourseSelectionScreen.jsx`'s `courseSummary()` cuts a card's preview at the nearest sentence
boundary within `PREVIEW_MAX` (220 chars), falling back to the nearest word boundary with an
appended "...", so a preview can be shortened for card density but never mid-word. Clicking a
course card opens a detail modal showing the full, untruncated `description` — reusing
`Roadmap.jsx`'s exact node-detail-modal pattern (`useModalExit` for the fade in/out, a
`lastDetailRef` that retains the last real course so the closing frame still shows real content,
the same `.overlay`/`.modal`/`.modal-close`/`.modal-eyebrow`/`.modal-title`/`.modal-desc` classes)
rather than inventing a new one. Because the card body's click now opens that modal instead of
toggling selection, selection moved to its own explicit `.course-select-btn` pill on the card
(`stopPropagation`'d so it doesn't also open the modal) — the card itself became a plain `<div
role="button">` instead of a `<button>`, since a `<button>` can't legally nest another `<button>`.

**The course detail modal is rendered via `createPortal(..., document.body)`, not inline —
this is a real, previously-latent bug in the shared `.screen-transition` entrance-animation
system, not cosmetic.** `App.jsx` wraps `courseSelection` (and every other pre-Plan screen) in a
`.screen-transition` div whose `screen-enter` keyframe animates `transform: translateY(14px) →
translateY(0)` with `animation-fill-mode: both`. Per the CSS spec, ANY non-`none` transform on an
ancestor — including one supplied by a still-`fill`-ing animation whose resolved value is the
identity matrix — makes that ancestor a containing block for `position: fixed` descendants;
confirmed via `getBoundingClientRect()` that `.screen-transition`'s computed `transform` stays
`matrix(1,0,0,1,0,0)` (not the literal keyword `none`) forever after the animation completes, so a
plain inline `.overlay` rendered inside it was being positioned relative to `.screen-transition`'s
own box instead of the viewport — the modal rendered wildly off-center/clipped instead of centered
on screen. (Changing the keyframe's end state to `transform: none` does NOT fix this — a
fill-mode-active animation still counts as "having a transform" for containing-block purposes
regardless of its resolved value, confirmed empirically before reverting that attempted fix.)
`Roadmap.jsx`'s own modals never hit this because Map 2 (the only place they render) is never
wrapped in `.screen-transition` — this is the **first** modal used inside a `.screen-transition`-
wrapped screen. The portal is the correct fix (escapes the ancestor's containing-block entirely,
without touching the animation system every other transitioning screen already depends on) — if
you add a modal to any other pre-Plan screen in the future, use the same `createPortal(...,
document.body)` pattern rather than rendering it inline.

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
  `{offsetDays: N}` for the two deliberately-in-the-past ones — see dates below),
  `prepSteps` (2-4 ordered sub-task names), and `stepResources` — a parallel array, same length
  as `prepSteps`, where `stepResources[i]` is the array of real resources (0 or more short
  strings) shown on that specific step's detail modal. This replaced an earlier single
  opportunity-level `resource: {label, note}` field that only ever populated the *first* prep
  step (`i === 0 && opp.resource` in `roadmapGenerator.js`) — every step in a chain needed its
  own resources, not just the first, so the field became per-step and `resource` was removed
  entirely (verify with `grep -rn "\.resource\b"` — should only ever match `.resources`/
  `stepResources`, never a bare `.resource`). A step with no genuine external resource (a purely
  local/personal action like "Attend your first meeting" or "Election day") gets `[]` rather
  than a padded/fake one — same judgment call as the empty `resources` on purely reflective core
  tasks in `trunkSteps.js` (e.g. "Check your GPA", "Connect with a transfer advisor"); a data
  integrity check (`stepResources.length === prepSteps.length` for every opportunity, and no
  opportunity with *every* step's resources empty) should hold across the whole file — see the
  Node verification snippet used when this was built if you need to re-check after an edit.
  Escalation-year steps (`progressionPrepSteps`, year 2+ of a recurring opportunity) and custom
  user-created tasks are explicitly out of scope for step resources — the former would double
  the data-entry surface for a secondary chain, the latter would need an API to generate
  relevant resources for arbitrary user-typed content, both deferred separately.
  `getOpportunityPool(tracks, level)` /
  `findOpportunity(id, tracks, level)` merge/dedupe across tracks or fall back to
  `GENERIC_OPPORTUNITIES` — both `OpportunityFinderScreen` and `roadmapGenerator.js` use these
  rather than reading `OPPORTUNITIES[track][level]` directly. **`OPPORTUNITIES.culinary` and
  `.outdoors` deliberately reuse some ids already present in `OPPORTUNITIES.lifestyle`**
  (e.g. `culinary-youth-programs`, `4h-programs`) rather than moving them — `lifestyle` still
  covers Fitness/Fashion (see "Track resolution" above) and stripping its content out from under
  those two sub-tags would have quietly emptied their opportunity pool. `getOpportunityPool`
  already dedupes merged tracks by id, so selecting e.g. both "Cooking" and "Fitness" together
  still shows each real opportunity once, not twice.
- **`OpportunityFinderScreen` has a "Recommended for you" / "Browse all opportunities" toggle**
  (local, unpersisted `useState`, same "session-only UI convenience" trade Project Builder's own
  sub-views make — refreshing mid-browse just resets to Recommended). Recommended is the original,
  unchanged behavior (`getOpportunityPool(getOpportunityTracks(state.interestTags), level)`).
  Browse reuses the exact same `getOpportunityPool` function, just called with `OPPORTUNITY_TRACKS`
  (every track, from `interests.js`) instead of the student's own narrow interest-derived set —
  no new data-layer function needed, since `getOpportunityPool` already merges/dedupes across an
  arbitrary track list. Browse mode also shows a track filter (`pill-group`, multi-select,
  `TRACK_LABELS` — extended to include `lifestyle`, which previously had no label since it's
  opportunity-only and never appeared in the built-track-only contexts `TRACK_LABELS` originally
  served); an empty filter selection means "no filter" (show all tracks), not "show nothing".
  `GENERIC_OPPORTUNITIES` is deliberately excluded from Browse — it's fallback content for a
  student whose only selected tag maps to no real track at all (e.g. "Law"), not tied to any of
  the 12 real tracks, so it doesn't fit "browse by track." **Card display, selection, and the
  "deadline passed" disabled state are the exact same JSX block regardless of view mode** — only
  which array feeds it changes. This uncovered a real bug in `roadmapGenerator.js`: it looked up
  selected opportunities via `findOpportunity(id, tracks, level)` using only the student's own
  narrow `getOpportunityTracks(state.interestTags)` result, so a Browse-mode selection from
  outside that set would silently fail to resolve and never appear on the plan. Fixed by widening
  that lookup to `OPPORTUNITY_TRACKS` (all tracks) — a no-op for anything selected via
  Recommended, since that narrower set is always a subset.
- **A third view, "My School," sits alongside Recommended/Browse — real, independently-fetched
  club data, shown only for `educationLevel === 'highschool'` + `currentSchool === 'Roslyn High
  School'`, OR Undergraduate/Transfer + `currentSchool === 'UC Davis'` (`isCollegeAtUCDavis`, the
  same per-file-recomputed convention every other UC Davis feature uses)** — no other
  education-level/school combination sees this tab, including a High School or college student who
  hasn't picked a school yet. `getSchoolOpportunities(schoolName, level)` itself needed zero code
  changes to serve a second school — it was always schoolName-agnostic, scanning for any
  `schoolVerified` entry matching the given `schoolName`; only `OpportunityFinderScreen.jsx`'s
  `showMySchoolTab` gate and its own hint-text copy (which branches on `currentSchool` to avoid
  citing Roslyn-specific examples like DECA/Key Club for a UC Davis student) had to widen. Roslyn's
  own data was fetched directly from
  `hs.roslynschools.org/student-center/clubs` (52 real clubs, name + description parsed from the
  page's own HTML structure — a bold-span/normal-span pair per club — not summarized or
  paraphrased) and reconciled against the existing `OPPORTUNITIES` data two ways, per the build
  spec's own explicit "merge, don't duplicate" requirement:
  - **7 real clubs were ENRICHED into a pre-existing generic opportunity** rather than added as
    new entries, each now carrying `schoolVerified: true, schoolName: 'Roslyn High School'` plus
    real Roslyn name/description in place of the old generic copy: `business.highschool.deca`
    (DECA), `stem.highschool.science-olympiad` (renamed "Science Olympiad Club"),
    `community.highschool.key-interact-club` (renamed "Key Club" — Roslyn has no separate Interact
    Club), `community.highschool.student-government-hs` (renamed "Organization of Class Councils
    (OCC)" — Roslyn's real student government name), `media.highschool.school-media-club`
    (renamed "Harbor Hill Light & Hilltop Beacon (Yearbook & Newspaper)" — Roslyn actually runs
    these as two separate real clubs, so **both** are named in one enriched entry rather than
    picking one arbitrarily), `academic.highschool.speech-debate-nsda` (renamed "Forensics (Speech
    & Debate)" — Roslyn's own club is called Forensics, kept alongside the recognizable NSDA
    framing), and `GENERIC_OPPORTUNITIES.highschool.nhs` (National Honor Society, enriched with
    Roslyn's real 92-GPA eligibility threshold). A student sees ONE entry either way — in
    Recommended/Browse it now shows the real Roslyn details instead of generic national copy; see
    each entry's own "Enriched with real Roslyn-specific info" comment in `opportunities.js`.
  - **The other 44 real clubs, plus the 7 above, are what `getSchoolOpportunities(schoolName,
    level)` (new export in `opportunities.js`) resolves for the My School tab** — it scans EVERY
    track's array (not just the student's own interest-derived tracks, unlike Recommended/Browse)
    plus `GENERIC_OPPORTUNITIES`, filtering to `schoolVerified === true && schoolName === the
    given school`, since "what does my actual school offer" is deliberately a different lens from
    interest-based recommendation. Each new club was mapped to whichever real track its own
    description fit best (e.g. Astronomy Club/Robotics Club/Math Team → `stem`, Habitat for
    Humanity/BRIDGE/service-fundraising clubs → `community`) using the same per-club `id`
    (`rhs-<slugified-name>`) convention so they're distinguishable from every pre-existing
    opportunity id at a glance. **4 clubs (Asian Cultural Exchange, Jewish Student Union, Muslim
    Discussion Group, The Exchange) were deliberately left unmapped** — per the build spec's own
    "fine to leave unmapped/general rather than forcing a weak fit," these are religious/cultural
    affinity-exploration clubs with no service/leadership/skill-building angle that would honestly
    fit any of the 12 interest tracks — and live in `GENERIC_OPPORTUNITIES.highschool` instead
    (the same "no real track fits" bucket the "Law" tag fallback already uses), still fully
    selectable via My School regardless. **Selecting one of those 4 surfaced a real,
    previously-latent bug**: `findOpportunity(id, tracks, level)` only ever fell back to
    `GENERIC_OPPORTUNITIES` when `tracks.length === 0` (via `getOpportunityPool`), so a
    Roslyn student with even one real interest tag would have that selection silently vanish off
    their plan — the exact same "an out-of-scope selection silently disappears" bug class already
    fixed once for Browse mode (see the two bullets above). Fixed by having `findOpportunity`
    itself fall back to a direct `GENERIC_OPPORTUNITIES[level]` scan whenever the track-scoped
    pool doesn't resolve the id, regardless of how many tracks were passed in.
  - New clubs otherwise reuse the exact same opportunity shape as everything else in this file —
    honor societies (Science National Honor Society, Tri-M, International Thespian, World
    Languages Honor Society) use the non-recurring `['Confirm eligibility', 'Complete induction']`
    pattern the pre-existing `nhs` entry already established; genuinely competitive
    clubs/teams (Math Team A/B, Quiz Bowl, Mock Trial, Ethics and Government, Robotics Club) get
    `recurring: true, progressionType: 'competition'`; every other club gets `recurring: true,
    progressionType: 'leadership'` with the same 3-step `['Sign up', 'Attend your first
    meeting']` join pattern `key-interact-club`/`school-media-club` already used before this —
    no new prep-step shape was invented. `stepResources` stays honestly empty (`[]`) for the
    large majority, since a "join a club" action has no genuine external resource to cite beyond
    what's already in `howToApply`, same judgment call this file already documents for
    `key-interact-club`'s own steps.
  - **`OpportunityFinderScreen.jsx` renders a `.school-verified-badge` ("Verified — Roslyn High
    School") on any card with `schoolVerified: true`, in EVERY view it appears in** — not just My
    School — so a student browsing normally still sees when DECA/Key Club/etc. is grounded in
    real school data instead of generic copy.
- **UC Davis's own My School clubs (`ucdc-*` ids) mirror Roslyn's pattern above, fetched from
  `aggielife.ucdavis.edu/club_signup?view=all&` (UC Davis's own club directory, ~880 real groups
  total) — but deliberately a curated ~70-club SAMPLE, not the full directory,** since ingesting
  every group wasn't the ask and would have overwhelmed the tab. 7 clubs were selected from each of
  11 real AggieLife categories the build spec named (Academic/Honors, Advocacy and/or Political,
  Arts and Entertainment, Community Service, Dance Performance, Environmental/Sustainability,
  Ethnic/Cultural/Identity-Based, Health and Wellness, Professional, Recreation/Sports,
  Religious/and or Spiritual) — 77 total — selected by real mission-text substance (a genuine
  quality/completeness signal, not cherry-picked by name), with 2 grad-student-only orgs that
  surfaced in that selection swapped for undergrad-inclusive replacements, since the app's own
  UC-Davis-reachable audience is Undergraduate/Transfer only. Purely administrative entries
  (`Student Affairs Department`/`ASUCD` org types on AggieLife, e.g. the Center for Student
  Involvement's own listing) were excluded before selection ever ran; AggieLife's own
  "DO NOT REACTIVATE" filter category turned out to tag zero actual clubs in the fetched page, so
  it needed no explicit exclusion logic. Each club's own real category routed it to whichever app
  track fits its actual content — occasionally overriding AggieLife's own category tag when the
  real mission text clearly pointed elsewhere (Davis Historical Fencing Club is tagged "Dance
  Performance" on AggieLife but is routed to `sports` here as the martial-arts club it actually is;
  Radio Association of Davis is tagged "Recreation/Sports" but is routed to `stem` as the
  amateur-radio/electronics club it actually is) — identity/cultural/religious affinity clubs with
  no genuine skill/career angle go to `GENERIC_OPPORTUNITIES` instead, same "don't force a fit"
  precedent the 4 unmapped Roslyn clubs already established above. **Checked for genuine overlap
  with this file's own pre-existing generic/templated opportunities before writing any of this**
  (Model UN, ASUCD/student government, a campus newspaper/radio station, a UC Davis DECA chapter —
  none of which turned up as a real club in the fetched AggieLife data) — unlike Roslyn's 7
  enrichments, none of the 77 selected UC Davis clubs duplicated an existing entry closely enough
  to honestly merge, so this batch is 77 new entries and zero enrichments; forcing a merge where
  the content doesn't genuinely match would be a worse outcome than the honest "checked, found
  none" documented in `opportunities.js`'s own header comment for this addition. Every entry
  appears in BOTH that track's `undergraduate` and `transfer` arrays (identical content, identical
  id, in both) since a real UC Davis club is equally open to either education level — unlike the
  rest of this file's undergraduate-vs-transfer split (which often varies wording/framing by
  level), there's no genuine content difference to write twice here, and reusing the same id across
  the two arrays is safe since a given plan only ever reads one `educationLevel` at a time. Each
  entry also carries a **new `website` field** (the club's real external site, extracted alongside
  name/category/mission) — rendered as plain text in `OpportunityFinderScreen.jsx`'s `.card-meta`
  grid, alongside `howToApply`, the same "informative text, not a clickable link" precedent
  `stepResources` already established elsewhere in this file (the card itself is a `<button>`, so a
  nested `<a>` would be invalid HTML — same reasoning documented elsewhere in this file for why
  Course Selection's card body isn't a `<button>` either). Every `description` is a real, honest
  1-3 sentence excerpt of that club's own fetched mission text, trimmed to a sentence boundary
  (never invented or paraphrased), matching this file's existing description length elsewhere.
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
  ladder, clamped to its last rung if the plan runs longer than the ladder does. Every recurring
  opportunity also carries `progressionPrepSteps`: an array of rungs (same 1-based/clamped
  indexing as the milestone ladder), each rung a short list of prep-step titles for that
  escalation year — e.g. Science Olympiad's rung 0 is `["Refine your event project based on
  last year's results", 'Take 2 practice exams']`. This exists so a later year renders as a
  real (if shorter) branch instead of a bare point — a student shouldn't need zero prep for a
  harder tier. `roadmapGenerator.js`'s `buildEscalationChain()` appends the escalated milestone
  from `progressionTitle()` as that rung's final step and builds the whole thing through the
  same `buildStepsChain()` helper `buildFirstYearChain()` uses (spread-across-`prepWeeks`,
  override/removal application, re-sort-by-date-then-recompute-`isLast`) — an escalation year's
  chain is a first-class branch like year 1's, just shorter, not a different kind of spine item.

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
(when more than one stage is in play) still carries a `stageLabel` field (e.g. "Sophomore Year")
and `roadmapLayout.js` still reserves collision-avoidance space for it via `centeredLabelBBox`,
but `Roadmap.jsx` no longer renders it as a visible "— Sophomore Year —" divider on Map 2 — now
that Map 2 is always scoped to a single year (see the year-filtering fix), an in-canvas label
naming the one year already being viewed was redundant with Map 1, which already communicates
that. The field/reservation were deliberately left in place rather than removed outright, so
removing just the visible `<text>` couldn't shift any node's position as a side effect — a
12th-grader/4th-year/non-transfer-2nd-3rd-year student still gets exactly one stage, so
`stageLabel` is never set for them either way. Transfer students 2+ years out keep
the single `application` stage as-is (transfer timelines vary too much to model precisely) but
get a `caveatNote` string (`TRANSFER_CAVEAT`) surfaced as a banner near the top of
`Roadmap.jsx` instead of a fabricated multi-year transfer plan.

**Course Selection Stage 4 wires Stage 3's course selections into the roadmap — highschool-only,
built entirely on top of the multi-year trunk above, no new spine concept.** Two new single-step
core item kinds, both `category: 'core', required: true, steps: null` (solid ring, no new legend
entry — `configFor()` just gets two new `coreType` entries, `'course-request'` and
`'course-checkpoint'`, in `Roadmap.jsx`'s `CORE_TYPE_CONFIG`):
- **`course-request`** — **ONE task per registration cycle** (stage 0's `state.selectedCourseIds`,
  or a future checkpoint's own `courseCheckpoints[stageName].selectedCourseIds`, see below) — NOT
  one per course. An earlier version of this built one node per selected course id; since every
  course requested in the same cycle shares the exact same request date, that was pure visual
  clutter (same class of bug later confirmed and fixed for UC Davis's own enrollment tasks — see
  that section). Titled `Request your ${targetLabel} courses` (naming the TARGET year, e.g.
  "Request your Sophomore Year courses") or `Finalize your course registration` when this is the
  plan's only/last stage — `yearSpan === 1`, i.e. a 12th-grader, with no next Roslyn cycle to
  name. The actual selected courses (name + department per course) live in a real `courseList`
  array on the item, rendered by `Roadmap.jsx` as an actual `<ul>`/`<li>` list
  (`.modal-course-list`, styled to match the pre-existing `.modal-resources` block) — not a
  comma-joined sentence baked into `desc`, which now holds only the estimated-date disclaimer.
  Dated via `ESTIMATED_COURSE_REQUEST_WINDOW` (`courses.js` — `{ month: 3, day: 1 }`, own header
  comment explains why this is a clearly-labeled estimate, not scraped data: the parsed catalog
  states registration deadlines exist but never publishes a fixed date). The estimate is surfaced
  two ways: the coreType's own label reads `"Course Request (Est.)"` (visible on the spine without
  opening anything), and the modal `desc` spells it out in full ("check with your counselor for
  the exact date"). Because these are ordinary required/core/single-step items, they flow through
  the exact same `dateOverrides`/`removedNodeIds` path every other core item already uses — the id
  itself is now keyed by cycle (`course-request-y${stageIndex}`), not by course, matching that
  same consolidation — and `Roadmap.jsx`'s modal renders the standard date-edit/remove row and
  plain complete-toggle for them, same as any other required task. **A large course count on one
  task is not itself a bug** — confirmed directly (same investigation later repeated for UC
  Davis): Course Selection's own "Recommended for you" view merges across every selected interest
  track with no course-load cap, and the Survey's own interest-tag picker has no selection cap
  either, so a student with several tags can legitimately select more than a single year's real
  load (8 classes for 9th/10th grade, 7 for 11th, 6 for 12th, per this file's own Course Load Per
  Grade policy data) — each cycle's own id stays fully isolated from every other cycle's, so nothing
  merges across years.
- **Fix: a real, confirmed off-by-one — stage 0's Course Selection now targets the CURRENT stage,
  not stage+1.** `stage0TargetLabel` in `buildCourseItems()` used to read
  `TRUNK_STAGES.highschool[stageNames[1]].label` (the year AFTER the current one) for stage 0's
  own onboarding Course Selection — so a 9th-grader selecting "Freshman" on the Survey got Course
  Selection targeting "Sophomore Year" instead of their own actual freshman year. Fixed by reading
  `stageNames[0]` (the current stage) instead. The root cause was conflating stage 0's own
  IMMEDIATE, once-only onboarding selection with a CHECKPOINT's legitimately different "register
  now for next year" pattern (a checkpoint fires mid-plan and correctly preps the FOLLOWING
  stage's courses in advance — that part is untouched and still correct, see `course-checkpoint`
  below). The Survey's own High-School-only "What year are you in?" question was reworded to
  **"What grade are you entering / about to start?"** (`SurveyScreen.jsx`, scoped to
  `state.educationLevel === 'highschool'` only — Undergraduate/Transfer's "1st year"/"2nd year"
  phrasing doesn't carry the same ambiguity and is unaffected) specifically to remove the
  ambiguity that produced this bug: "what grade are you in" could mean either "currently
  completing" or "about to start," and the app's own logic had assumed the former while a real
  incoming freshman answering "9th" means the latter. `TranscriptScreen.jsx`'s own onboarding
  "Year Taken" pill options are now also scoped to `state.schoolYear` (`YEAR_OPTIONS.filter(y =>
  y < state.schoolYear)`) instead of always offering the full `[8, 9, 10, 11, 12]` range — a 9th
  grader now only sees 8th grade (matching "skipping is fully valid and expected for a true
  incoming freshman"), a 10th grader sees 8th+9th, and so on; checkpoint-mode transcript entry
  (a separate, later-firing screen for a DIFFERENT, future stage) keeps the full range, since
  scoping that to its own real current grade is a separate, unreported concern this fix doesn't
  touch. **The multi-year plan-LENGTH logic (`STAGE_PLAN`, unchanged) was deliberately left
  alone** — this fix is isolated to which year Course Selection/transcript entry target, not how
  many years the plan spans; a 9th grader still gets the same 4-stage plan, a 10th grader the
  same 3-stage plan, and so on, confirmed via Map 1's own year-marker count before and after.
- **Follow-up fix: the off-by-one above had a second, independent copy that drifted out of
  sync.** `CourseSelectionScreen.jsx`'s own on-screen scope-clarifying banner ("This page is for
  selecting your courses for `[Year]` only...") computed its target year through a SEPARATE,
  duplicate `nextYearLabel` calculation, not through `roadmapGenerator.js`'s own (already-fixed)
  logic — so once the roadmap's course-request task title was corrected to name the current
  grade, this banner kept reading `stageNames[1]` and still said the year AFTER it, for the exact
  same student. Fixed by extracting a single shared `getStage0TargetLabel(stageNames)` into
  `trunkSteps.js` (same "extract once, every caller reads the identical value" precedent
  `gpaBenchmarkText()` already established there for programs.js) — both `roadmapGenerator.js`'s
  `stage0TargetLabel` and `CourseSelectionScreen.jsx`'s own (renamed) `currentYearLabel` now call
  this one function, so the roadmap task title and the on-screen banner can never independently
  drift again the way they just did.
- **Mirrored for UC Davis's own Undergraduate/Transfer flows — but the actual root cause turned
  out to be different, confirmed by direct investigation rather than assumed.**
  `buildUCDavisQuarterItems` (UC Davis Stage 4) was built entirely on real calendar-date math via
  `getNextQuarter`/`buildStageQuarterLists` from day one (see that section above) — it never
  referenced `stageNames[1]` anywhere, so stage 0's own enrollment task was ALREADY correctly
  targeting the real next quarter with no off-by-one to fix. The real, analogous gaps were
  elsewhere:
  - The Survey's year question was reworded for Undergraduate/Transfer too — **"What year are you
    entering / about to start?"** (`SurveyScreen.jsx`), applied unconditionally across all 3
    levels (the question is asked BEFORE the school-selection field further down, so wording
    can't be conditioned on whether the student will end up at UC Davis or Roslyn).
  - **A real, confirmed unscoped-options gap**, the UC Davis analog of Roslyn's original
    `YEAR_OPTIONS` bug: `UCDavisTranscriptScreen`'s own "Class Year" pill row always offered all 4
    of `CLASS_YEAR_OPTIONS` (`['Freshman', 'Sophomore', 'Junior', 'Senior']`) regardless of
    `state.schoolYear`, letting a genuine incoming 1st-year student log "Senior"-level coursework
    that couldn't exist yet. Fixed with `CLASS_YEAR_OPTIONS.slice(0, schoolYear - 1)` (checkpoint
    mode keeps the full range, same exception Roslyn's fix already carved out) — a 1st-year
    student gets an EMPTY array, since a true incoming first-year has genuinely zero prior UC
    Davis coursework (unlike Roslyn's freshman, who still had one real option, 8th grade). Rather
    than render a permanently-unusable "Add Course" form with an empty Class Year row, the whole
    add-course form is hidden for that case, replaced with "You're just starting at UC Davis —
    there's nothing to add yet." alongside the existing Skip button (Task 3 — this Skip option,
    "Skip — I haven't taken any UC Davis courses yet," already existed from Stage 2 and needed no
    changes, just confirmation it still works).
  - **UC Davis's Course Selection had NO scope-clarifying banner at all before this fix** — not a
    hardcoded-wrong-value bug like Roslyn's, a genuinely missing one. Added
    `.course-scope-banner` to `UCDavisCourseSelectionScreen`, computing its named quarter via
    `QUARTER_LABELS[getNextQuarter(startOfToday()).quarter]` — the exact same `getNextQuarter`
    call `roadmapGenerator.js`'s own targeting logic uses, so this banner and the real enrollment
    task's own title can never independently drift the way Roslyn's banner once did (confirmed
    directly: seeding a plan and comparing the banner's named quarter against the roadmap's own
    "Select and enroll in your `[Quarter]` quarter courses" task title show the identical
    quarter).
  - **Multi-year/Transfer-specific plan-length logic (`STAGE_PLAN.undergraduate`/`.transfer`,
    unchanged) was deliberately left alone** — confirmed via Map 1's own year-marker count for
    every `(educationLevel, schoolYear)` combination before and after this fix.
- **`course-checkpoint`** — one per future high-school year *except the last* (`stageIndex` in
  `[1, yearSpan-2]` — see `buildCourseItems()`'s loop; this range is empty whenever `yearSpan <=
  2`, which is exactly when there's no year-after-next to plan for, e.g. an 11th- or 12th-grader
  — no special-casing needed for Task 3's "seniors get no revisit tasks" beyond this range check).
  Dated the same way as `course-request`, within the checkpoint's OWN stage (that's when the
  registration act for the FOLLOWING stage's courses happens — same "request now, take next year"
  timing `course-request` already uses for stage 0). Titled `Update your courses for ${target
  stage's label}`. Unlike every other spine item, a checkpoint carries no `steps` chain — its "two
  sequential parts" are a special MODAL, not a branch (see below), and it carries one extra field,
  `checkpointStageName`, that the modal reads to know which `state.courseCheckpoints[...]` entry
  it's driving.

**`state.courseCheckpoints` (`AppContext.jsx`) is `{ [stageName]: { part1Done, selectedCourseIds }
}`, keyed by stage NAME (e.g. `'sophomore'`) — a checkpoint's own target stage
(`stageNames[stageIndex + 1]`) is derived at generation/render time, never stored.** Once a
checkpoint's Part 2 finishes, its `selectedCourseIds` feeds `buildCourseRequestItems()` again —
same builder, same shape, just a later `stageIndex` and a different source array than stage 0's
top-level `state.selectedCourseIds` — producing that stage's own real `course-request` items
automatically the next time `generateRoadmap()` runs (it always does, on every state change). A
checkpoint node's own `completedNodes` entry is set directly (not via the generic complete-toggle)
the moment Part 2 finishes — see below.

**A checkpoint's two parts are Roadmap.jsx's special-cased modal (mirroring the existing
opportunity-anchor special case — `selectedIsCourseCheckpoint`, parallel to
`selectedIsAnchorOnly`), and they navigate to the real TranscriptScreen/CourseSelectionScreen
screens rather than reimplementing those mechanisms inline.** This is literal reuse, per the build
spec's own instruction ("reuse the exact same entry mechanism from Stage 2" / "reuse Stage 3's
course selection mechanism") — not a new modal-embedded UI. `state.activeCourseCheckpoint` (`{
stageName, part: 'transcript' | 'courses' } | null`) is the hand-off: `Roadmap.jsx`'s
`startCheckpointPart(stageName, part)` sets it and navigates (`screen: 'transcript'` or
`'courseSelection'`); both screens check it on mount and switch into "checkpoint mode" — different
header copy, different Back/Continue targets, and (Part 2 only) a different write target and real
prerequisite checking — while every existing mechanic (course search, grade entry, GPA
calculation, the Recommended/Browse toggle, filters, `CourseCard` grid) is 100% unchanged code:
- **Part 1 (`TranscriptScreen.jsx`)**: `checkpoint = state.activeCourseCheckpoint?.part ===
  'transcript' ? ... : null` gates the copy and the `advance()`/`goBack()` branch. Adding entries
  still writes to the same top-level `state.transcript` (there's no separate per-checkpoint
  transcript — a later checkpoint reviewing/adding entries sees everything entered so far,
  which is correct: it's still one real transcript). `advance()` in checkpoint mode writes the
  refreshed `gpa4Scale` to `state.gpa` — **the exact same field** every existing GPA-aware
  consumer already reads (`ProgramsStep`'s curated program list, `reachMatchSafetyTag`'s
  Reach/Match/Safety badges) — flips `courseCheckpoints[stageName].part1Done`, clears
  `activeCourseCheckpoint`, and returns to `screen: 'plan'`. This is why the refreshed GPA updates
  Reach/Match/Safety "everywhere else in the app" with zero changes to `programs.js` or
  `ProgramsStep.jsx` — they were never told which screen last wrote `state.gpa`, they just react
  to the value.
- **Part 2 (`CourseSelectionScreen.jsx`)**: `checkpoint`/`checkpointProgress` gate the copy, hide
  the (redundant, already-seen) policy summary and `StepProgress`, and redirect where "selected"
  reads/writes: `currentSelectedIds`/`isSelected()`/`toggleCourse()` all branch on checkpoint mode
  to use `courseCheckpoints[stageName].selectedCourseIds` instead of the top-level
  `selectedCourseIds` (which stays reserved for stage 0's onboarding selections only) — every
  `CourseCard` call site (main grid, each program-type group, the detail modal's Add/Remove
  button) was updated to go through these instead of reading `state.selectedCourseIds` directly.
  A defensive `useEffect` bounces to `plan` if Part 2 is somehow reached before
  `courseCheckpoints[stageName]?.part1Done` (Roadmap.jsx's own modal already disables that path,
  this is belt-and-suspenders for direct state restoration). "Save & Return to Plan" writes the
  final `selectedCourseIds` into `courseCheckpoints[stageName]`, sets
  `completedNodes['course-checkpoint-${stageName}']` directly (a checkpoint has no id-based
  complete-toggle of its own — same reasoning as an opportunity anchor), clears
  `activeCourseCheckpoint`, and returns to `plan`.

**Part 2's prerequisite checking (`src/utils/prerequisites.js`) is a deliberately conservative,
best-effort text matcher — never a fabricated rule.** Course `prerequisite` fields are free
catalog text (e.g. `"Completion of Algebra 2 B or Algebra 2"`), not a structured graph.
`checkPrerequisite(course, transcript)` splits on `"or"` (the catalog's own convention for
alternative-satisfying prerequisites), then for each alternative finds the **longest** real course
name it contains — not the first match in `COURSES` array order, which was a real, confirmed bug
during development: "Calculus" is literally a substring of "Precalculus", and "Algebra 2" is a
substring of "Algebra 2 B", so a naive first-match matcher silently resolved "Precalculus"'s own
prerequisite text to the wrong (unrelated, shorter-named) course. Longest-match resolves both
confirmed cases correctly. A referenced course only counts as "completed" with a real **passing
grade** (`gradeEarned >= 65`, Roslyn's own stated passing threshold — the same floor
`gpa.js`'s `convertTo4Scale` table treats as the bottom of its lowest non-zero band) in the
transcript, per the build spec's explicit "checked against actual completed grades, not just
did-they-take-it yes/no." A prerequisite string with no recognizable course-name reference (e.g.
AP Physics 1 & 2's `"Recommended grade of 90+ in three sciences, Precalculus"` — a threshold
across a subject area, not one course) is left **unparsed on purpose** (`checked: false`) —
inventing a rule for it would be a guess, and this codebase's standing rule is "don't guess" (same
principle as `programs.js`'s GPA-blank fallback). An unparsed prerequisite never blocks selection.
`CourseCard` renders an `ineligibleReason` (only ever passed in checkpoint mode) as a muted,
locked card — visible and readable (so the student can still see the real prerequisite text and
self-check it), but its `.course-select-btn` is disabled — "inform, don't just hide," the same
posture this screen's own filters already take, not a hard removal from the grid. Explicitly
**out of scope, per the build spec**: any performance-based recommendation logic ("you struggled
here, consider X instead") — this is accurate prerequisite-checking and an accurate GPA feeding
existing systems, nothing more.

**The roadmap is one unified vertical spine, not separate trunk/branch/chip concepts.**
`roadmapGenerator.js` builds a `today` node plus a single flat `spineItems` array combining
three kinds of items, distinguished by a `required` boolean (core vs. everything else — drives
the solid-vs-hollow ring styling in `Roadmap.jsx`, see Task 3 of the restructure this became)
and a `category` string (`'core' | 'opportunity' | 'custom'` — `category` alone is what
`Roadmap.jsx` uses to pick a third, dotted ring style for custom tasks, since `required` can't
distinguish opportunity from custom — both are `false`):
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
  appends one extra chain per additional year via `buildEscalationChain()` — id `${opp.id}-y${n}`,
  anchored one calendar year later each time, its steps drawn from that opportunity's
  `progressionPrepSteps` (see the `opportunities.js` bullet above) plus the escalated
  `progressionTitle()` milestone as the final step. It's shorter than year 1's chain (no
  "register"/"build from scratch" step — a returning competitor doesn't re-walk that), but it's
  never a single bare point: a student always sees real prep leading into the harder tier, not
  just a milestone with nothing behind it. A 1-year plan (`yearSpan === 1`) never generates any
  of these, so this is a no-op for a senior/4th-year/non-transfer-2nd-3rd-year student regardless
  of which opportunities they pick.
- **Custom items** (`category: 'custom'`, `required: false`) — user-created tasks from the
  roadmap's "+ Add Task" control (a persistent button above the canvas, not per-node — it
  creates something new, so it isn't attached to any existing node). `buildCustomItems()` in
  `roadmapGenerator.js` turns each `state.customTasks` entry into a spine item exactly the way
  `coreItems` does: `task.date` is the template input, a `nodeDateOverrides` entry (from editing
  it afterward) still wins over it, same precedence and the same `anchorDate`-free
  `parseDateInputValue` path every other user-edited date goes through. Deliberately
  single-step (`steps: null`) by design — Task 2's scope explicitly excludes giving custom tasks
  their own sub-branch/chain. This is manual creation only (the "User Input Destination" concept
  from the original spec) — there's no proactive "would you like to add this?" suggestion engine
  here; the app never decides what to suggest, the student always fills in their own task.

`roadmapLayout.js` positions everything by real date — today at the bottom, later dates higher
up, same "latitude = time" principle used everywhere else in this app (`PIXELS_PER_DAY`) — with
a light forward-only minimum-gap pass so two items landing on the same day don't collide. This
is a genuine change from the old trunk, which used fixed per-node spacing; the old trunk had no
branches to route around, this one does, so position now has to track real elapsed time.
**If you touch the spacing constants, they all live at the top of `roadmapLayout.js`
(`PIXELS_PER_DAY`, `MIN_SPINE_GAP`, `MIN_BRANCH_GAP`, `BRANCH_SLOPES`) — canvas width/height are
always derived from actual content afterward, never assumed.** `PIXELS_PER_DAY` is deliberately
large (32) now that Map 2 only ever renders a single year (≤ ~365 days) instead of a whole
multi-year plan — auto-fitting a single year at the old value (3) read as visually compressed,
and (separately, see below) a low `PIXELS_PER_DAY` made the floor's day-equivalent threshold
large enough that most real gaps triggered it. It was raised again from 20 to 32 specifically so
`MIN_SPINE_GAP` could become a real 60px (below) while `2 * PIXELS_PER_DAY` (64) still clears it
— the day-to-day rate itself didn't need to change on its own merits, this was purely a
consequence of the floor request. The resulting canvas is tall enough that the default `fitView`
fit can legitimately hit `MIN_ZOOM` (0.15) if zoomed out to the whole year at once — that's
expected and fine, not a regression to fix; zoom in/pan (or "Reset view") already handle the
rest, per the architecture below. That said, the *default* view no longer zooms out that far in
the first place — see `DEFAULT_WINDOW_DAYS` further down.

**`MIN_SPINE_GAP`'s floor must trigger ONLY when two spine items are truly 0 or 1 real day
apart — every 2+ day gap is pure `PIXELS_PER_DAY * daysBetween`, zero flooring.** The decision is
made by comparing TRUE day-gap (`t - prevT`, both real `daysFromToday` values) to the *previous
item's real date*, not by comparing the current item's proportional `y` against the previous
item's *rendered* `prevY`. Comparing against `prevY` was a real, previously-shipped bug: if an
earlier item had already been floored (pushed further from its true position than its real date
warrants), that drift carried into `prevY`, so a LATER pair of items that were genuinely several
real days apart could still get floored again — purely because the earlier drift hadn't been
"paid off" yet, not because they were actually close in time (confirmed empirically: gaps of 1–4
real days all rendered identically, and even a 5-day gap only barely cleared the floor, before
this fix). Comparing true day-gaps instead makes each item's floor decision independent of
whatever happened earlier in the sequence. `MIN_SPINE_GAP` is now a literal `60` (a specific
value that was requested directly, not derived from a multiplier like earlier passes) — it must
still stay strictly under `2 * PIXELS_PER_DAY` (64) or a 2-day gap would render smaller than or
equal to the 0/1-day floor, inverting the ordering the "only floor at ≤1 day" rule exists to
guarantee. If you change either constant again, re-check that relationship before assuming it's
still safe — it's not self-enforcing, unlike the earlier multiplier-derived version.

**`npm run verify:spacing` (`scripts/verify-spacing.mjs`) is a standalone self-test for this
exact rule — run it by hand after touching `roadmapLayout.js`, it is NOT wired into the render
path.** `layoutRoadmap()` already recomputes every node's position from scratch, from this one
function, on every state change (it's called fresh inside `generateRoadmap()`, itself re-run by
a `useMemo` keyed on `state`) — there's no partial-patch code path for a runtime "validate and
auto-correct" pass to meaningfully guard against, and a validator that just re-ran this same
formula would only ever be checking `f(x) == f(x)`. The script instead loads the REAL
`roadmapLayout.js` through Vite's own `ssrLoadModule` (not a reimplementation, and not a plain
`node` import — the file's extension-less relative imports only resolve through Vite's loader)
and checks its actual output against the confirmed rule's expected-value table using **isolated
2-item pairs** — one fresh `layoutRoadmap()` call per gap, 0 through 7 days, since the table
describes an isolated pair's own gap, not "every gap on a real multi-item spine will read exactly
this." It also has a dedicated **compounding-drift regression test** reproducing the actual
historical bug class: a 4-item chain where two earlier pairs are genuinely floored first, then
checks that a later, truly-2-real-days-apart pair is NOT floored (expects an unfloored 24px
gap, not the 60px floor) — an isolated 2-item test can't catch this bug class at all, since with
only one predecessor (and no prior drift yet to bleed in) the old buggy comparison and the fixed
one happen to agree; this was confirmed by deliberately reintroducing the old `prevY`-comparison
bug and verifying this specific test (and only this one) failed, before restoring the real fix.

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
back even though the connecting code looks correct.** `BRANCH_SLOPES` itself is intentionally
left at its original values, though — **don't bump it up to widen branches either.** `rel` (used
for both the collision-avoidance nudge loop below and `y`) doesn't depend on slope directly, but
the nudge loop's *outcome* — how many times a given step gets nudged — does, since nudging is
triggered by whether the step's label box (computed from `x`, which does depend on slope)
collides with anything already placed. Widening `BRANCH_SLOPES` changes which boxes collide,
which can change a step's final `rel`, which changes its `y` — confirmed empirically once (a
dense FBLA/DECA test plan) to shift several nodes' vertical positions when this was tried.
Horizontal branch spacing is instead controlled by **`BRANCH_SPACING_MULTIPLIER`**, applied to
each step's `x` only *after* `layoutBranch`'s nudge loop has already locked in `rel`/`y` using the
untouched `BRANCH_SLOPES` — so every collision decision (and therefore every `y`) is byte-for-byte
identical to what it would be without the multiplier. This is provably safe, not just
cosmetically safe: with `y`, spine positions (fixed at `x=0`), and label widths/edge-gaps all held
fixed, uniformly scaling every branch step's `x` by the same `K > 1` can only widen an
already-validated gap between two boxes, never close one — see the three-case proof in
`layoutBranch`'s own comment (same-side, opposite-side, vs. a same-side spine label) if you need
to touch either constant. Each branch is still computed in true
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

**`intersects()` (the function `layoutBranch`'s nudge loop calls against `placedLabels`) checks
for a minimum buffer, not literal rectangle overlap** — `COLLISION_PADDING` (24) is subtracted
from each box's edges before comparing. Without it, two labels whose true edges land a few px
apart (observed case: an opportunity's own branch step landing close to an UNRELATED spine node
it shares no chain with — a required core task and a different opportunity's branch step,
independently dated only ~3 real days apart, whose LABEL boxes came within 16px of each other
without literally overlapping) count as "not colliding" and never get nudged apart, even though
that reads as visually cramped/touching on screen — a real, previously-shipped gap in the
collision system (spine-to-spine spacing had already been fixed to follow the confirmed
`MIN_SPINE_GAP` rule by this point; branch-to-unrelated-spine-node proximity was a separate,
never-covered case, since `layoutBranch`'s own `MIN_BRANCH_GAP` only ever protects a step from
the OTHER steps in its own chain, with zero awareness of nearby spine nodes belonging to a
different item). Padding the collision check is deliberately the fix here, not a new day-gap-
based rule mirroring `MIN_SPINE_GAP` — a branch step's position is computed relative to its OWN
chain's anchor date, not "distance from the nearest other node," so there's no natural per-pair
day-gap to floor in the first place; padding instead makes the EXISTING nudge-until-clear loop
require genuine breathing room, not just non-overlap, whichever kind of box it's routing around.
This doesn't touch `rel`/`y`/`BRANCH_SLOPES` math, and the `BRANCH_SPACING_MULTIPLIER` proof
above still holds unchanged — it's about whether scaling can ever CLOSE an already-clear gap,
which is independent of how large "clear" is defined to be.

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
thinner, dashed hollow ring when incomplete (`strokeDasharray="4 4"`); custom tasks get their own
third style — same hollow ring, but dotted (`strokeDasharray="2 3"`) and in `--ink-soft` via a
dedicated `CUSTOM_CONFIG`/`Pencil` icon, specifically so a student can tell "I added this" apart
from "the app generated this" at a glance without introducing a new color token. The ring JSX is
a three-way branch on `n.required` then `n.category === 'custom'`, not a lookup table — if a
fourth node kind is ever added, extend that branch rather than trying to cram it into `configFor`
alone (which only supplies icon/color/label, not ring geometry). **Every ring `<circle>` needs `pointerEvents="all"`**
— an unfilled circle (`fill="none"`, the hollow/optional style whenever a node isn't done yet)
only hit-tests its stroke by default SVG behavior, not its interior, so without this a hollow
node's clickable area was a thin ring around the edge instead of matching its visual size; solid
circles always have a real fill so they never needed it, but it's applied everywhere now for
consistency. **Every node also has its own invisible `circle.hit-target`** (`fill="none"
pointerEvents="all"`, no stroke), rendered as a plain sibling *before* `.node-pop` rather than
inside it — sized to each node type's ring radius times ~1.22 (the peak scale the `node-click-
pulse` animation reaches: 22 for the r=18 required/today rings, 20 for the r=16 custom/
opportunity rings, 16 for the r=13 branch-step rings) so the actual clickable area matches the
full visual area that reacts on click, not just the ring's resting size. It's a plain sibling of
`.node-pop` specifically so it stays this fixed, generous size at rest instead of only reaching
it transiently mid-animation. Every node is independently clickable — a core node or a branch step opens the
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
(i.e. when the plan's content actually changes, not on every render) and also runs when the
"Reset view" zoom-control button is clicked (`Maximize2` icon) — same function, so both share the
behavior described next. **The default/reset fit caps how much of the timeline shows to at most a
`DEFAULT_WINDOW_DAYS` (currently 45) window anchored at "today," not the whole year** — this cap
originated as a ~2-year window back when Map 2 could still render a whole multi-year plan at once;
now that Map 2 is always scoped to a single year (see the "Map 1/Map 2" section above) AND
`PIXELS_PER_DAY` was raised significantly for readability (see roadmapLayout.js), auto-fitting an
entire year by default zoomed everything out so far it read as tiny again — same category of bug,
just resurfacing at the new, longer scale, so the window was shrunk to match (45 days lands the
default zoom close to 1, i.e. genuinely readable — verified empirically against a DECA/Bank of
America test plan). For a non-current year, "today" here is that year's own virtual layout epoch
(`roadmapGenerator.js`'s `layoutToday`), which sits at the same "bottom of canvas" position real
today always does, so this same mechanism anchors the default view sensibly for a future/past year
too, not just the current one. `roadmapLayout.js` positions today a fixed `BOTTOM_MARGIN` above the
canvas's bottom edge and everything else strictly further from today the further in the future it
is, so `roadmap.today.y` (exported alongside `PIXELS_PER_DAY` from `roadmapLayout.js`) is itself
proportional to the visible year's time-span in pixels — `fitView()` computes `effectiveTop =
max(0, today.y - windowDays in px)` and fits the region from `effectiveTop` down to the canvas
bottom, instead of the whole canvas. **This reduces to the exact old full-content-fit behavior
whenever the year's real content span is already ≤ the window** (`effectiveTop` comes out to 0, no
branch needed to special-case it) — a sparse year is unaffected. Manual zoom (wheel/pinch/
buttons) and pan are completely untouched by this — a student who wants the full year's span
can still zoom out to it exactly as before; only what's shown by default changed. **The `.zoom-controls`
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

**`ProjectBuilderScreen` (`src/screens/ProjectBuilderScreen.jsx`) is a curated browse-and-start
flow, plus a static, mocked Community Project Examples preview** — "Create Your Own" (AI-driven
dynamic brainstorming) is entirely out of scope and doesn't exist anywhere in this screen or its
data. Community Project Examples, by contrast, DOES have a presence here, but only as fixed
display content: `PROJECT_CATEGORIES[].communityExamples` (0-2 entries per category, `{ name,
handle, grade, blurb, likes }`) render as plain, non-interactive `<div>` cards styled to *look*
like real social posts — but there is no submission flow, no commenting, and `likes` is a fixed
number next to an icon, never a working like button. This is intentional: it's testing whether
the concept resonates, not a preview of the real feature's data model, and likes/rewards-based
incentives specifically were already decided against for the real product — don't wire up
interactivity here even experimentally. When a real Community feature ships, this field gets
replaced wholesale, not extended. Content otherwise lives in `src/data/projects.js`:
`PROJECT_CATEGORIES`, 6 categories each with a `description`, an `example` string (always framed
in the UI as illustrative — "not a real submission from another student" — the ONE per-category
example is a different, older piece of content than `communityExamples` and keeps its own
existing caveat treatment), and 3 `projectTypes`, each carrying `overview`, `timeCommitment`,
`steps` (array), and `resources` (array) — same "array of plain strings" shape `stepResources`
uses elsewhere. `icon` is a lucide-react icon *name* (string), not a component — data files stay
free of UI imports; `ProjectBuilderScreen` owns the name→component map (`CATEGORY_ICONS`).

The screen has 3 local, **unpersisted** sub-views (`'categories' | 'category' | 'projectType'`,
plain `useState`, not `AppContext`) — refreshing mid-browse just resets to the category grid,
an acceptable trade since nothing here is a consequential selection like the survey. A "Skip for
now" control (`.pb-skip`) renders at all 3 levels and always jumps straight to `patch({ screen:
'plan' })`, per spec ("fully skippable at every level").

**A started project is its own top-level state, `state.startedProjects`, and grows one step at a
time instead of being generated up front — it is NOT a `customTasks` entry** (an earlier version
of this feature modeled a started project as a single tagged custom task with freeform
"milestones" added anytime; that was fully replaced once projects needed real chain/sub-branch
rendering and strict one-active-step-at-a-time progression). Each entry is `{ id, categoryId,
projectTypeId, projectName, status: 'active' | 'completed', guideStepsUsed, steps: [{ id, title,
date, desc }] }`. Starting a project (`ProjectBuilderScreen`'s "Start This Project!" + date
picker) creates exactly one step — the project type's own **first** guide step text (not the
project's name; that's Task 1 of the growing-chain spec), dated to the chosen Start Date, with
`guideStepsUsed: 1` since that first guide slot is already spent.

**`roadmapGenerator.js`'s `buildProjectChain()` (`category: 'project'`) has no separate anchor
distinct from its steps, unlike an opportunity.** The FIRST entry in `project.steps` doubles as
the spine anchor (its own title, not a wrapper title) and every step after it becomes a
`branchSteps` entry — so a freshly-started project (one step) renders as a plain point exactly
like a custom task, and the moment a second step is revealed it becomes a real branch, same
connector/`isLast` machinery an opportunity chain uses. Every step also carries a `projectLabel`
string (`"${projectName} · Step X of Y"`, `Y` = however many steps are revealed so far,
recomputed after the date-sort) that `Roadmap.jsx` renders in place of the generic `label · due`
subtitle for `category === 'project'` nodes, so the project stays identifiable without
overwriting the step's own real title.

**Progression is driven entirely by `Roadmap.jsx`'s `toggleDone`, not by anything in
`ProjectBuilderScreen`** — since "mark complete" can happen from the Academic Plan regardless of
which screen the user started the project from. Completing a node checks whether its id is the
CURRENT LAST entry of some `active` project's `steps` array (insertion order, read directly from
`state.startedProjects` — deliberately NOT the chronologically-resorted view `buildProjectChain`
builds for display, so a user editing an earlier step's date via `nodeDateOverrides` can never
change which step counts as "active"). If so, it opens a reveal-next-step prompt instead of just
toggling:
- **Guide phase** (`guideStepsUsed < projectType.steps.length`): reuses `AddTaskModal` with
  `initialTitle` pre-filled from `projectType.steps[guideStepsUsed]` — editable, not locked; can
  be accepted as-is, tweaked, or replaced outright. Submitting appends the step and increments
  `guideStepsUsed` regardless of whether the text was changed (it still fills that guide slot).
- **Guide exhausted** (`guideStepsUsed === projectType.steps.length`): a small choice modal —
  "Mark project complete" (sets `status: 'completed'`, permanently stops prompting) or "+ Add
  another step" (the same `AddTaskModal`, blank this time, `guideStepsUsed` untouched since it's
  no longer tracking a guide slot). Choosing to add another step re-enters this same choice cycle
  once THAT step is completed — the custom-step phase is open-ended, not one-shot.

At most one step per project is ever incomplete at a time by construction: nothing generates
future steps ahead of where the user actually is, satisfying "never multiple future steps with
guessed dates." Completed steps are never removed from `steps` — they stay on the spine exactly
like any other completed node.

**`AddTaskModal` (`src/components/AddTaskModal.jsx`) was extracted from `Roadmap.jsx`'s inline
"+ Add Task" form** and is now shared three ways: Roadmap's own "+ Add Task", the growing-chain
guide-suggestion prompt (pre-filled via `initialTitle`/`initialDate`/`initialDesc`, all optional
and empty by default so the plain "+ Add Task" caller is unaffected), and the post-guide
open-ended "add another step" form. `title`/`eyebrow`/`eyebrowColor`/`nameLabel`/`submitLabel`
let each caller frame the same field set differently; the component itself has no opinion on
what the caller does with the submitted `{ title, date, desc }` (plain custom task vs. project
step) or how ids are generated (`makeTaskId()` in `src/utils/ids.js`, called at each callsite).

**`roadmapLayout.js`'s `hasBranch` check is `steps.length >= 1`, not `steps.length > 1`.** A
project that has grown to exactly one revealed branch step (two total: anchor + one) needs that
step to actually render as a branch, not silently vanish — the old `> 1` threshold was a latent
bug for any one-step chain (harmless for opportunities in practice, since every real opportunity
has 2+ prep steps, but real for a freshly-grown project). If you touch this, re-verify with a
project that has exactly two revealed steps, not just three or more — that's the case the old
threshold silently dropped.

**The Project Start Date picker does a *soft* conflict check, never a hard block.** On every
keystroke in the date input, `ProjectBuilderScreen` flattens `roadmap.spine` plus every
`hasBranch` item's `branchSteps` into one list and looks for any node within
`CONFLICT_WINDOW_DAYS` (3) of the chosen date; a match renders an inline `.pb-conflict-warning`
naming that node, but the "Confirm Start" button is never disabled by it — this mirrors the
spec's "a heads-up if it lands close to something else, not a hard block."

**`WelcomeScreen` (`src/screens/WelcomeScreen.jsx`) is the app's entry hero — a single
orchestrated animation sequence, not several independent effects.** An SVG trail (the same
winding-path visual language as the real roadmap's branches) draws itself in via
`stroke-dasharray`/`stroke-dashoffset`, 3 ghost milestone markers pop in along it on their own
staggered timers, then the title/tagline/CTA fade in once both have resolved. **Every one of
those stages uses the same "enter" class pattern**: an element starts with a modifier class
holding its hidden/undrawn state, and a piece of React state removes that class after a delay —
a CSS `transition-delay` alone does NOT work here, since a transition only fires on an actual
property *change*, and a class applied once at mount and never removed has nothing to transition
from (this was a real bug during development: markers set up with `transition-delay` but no
later class removal just stayed invisible forever). The trail's own draw-in needs one extra
wrinkle beyond that — a **double `requestAnimationFrame`** before flipping its class, so the
browser actually paints the fully-undrawn state on one frame before the transition starts on the
next; collapsing that to a single rAF (or `setTimeout(0)`) risks both style changes landing in
the same paint, which skips the animation rather than playing it.

Marker positions are computed for real, not eyeballed: `pathRef.current.getTotalLength()` /
`getPointAtLength()` (measured in a `useLayoutEffect`, not `useEffect`, to avoid a one-frame
flash of unpositioned markers) place each ghost milestone exactly on the rendered curve at a
fractional distance (`MILESTONES[].t`, 0 = base/today, 1 = the top). **Marker position and its
pop-in scale animation are both driven through ONE CSS `transform`, never an SVG `transform`
attribute plus a separate CSS transform on the same element** — a CSS `transform` property
replaces an element's presentation-attribute `transform` rather than composing with it, so
mixing "attribute translate + CSS scale" would silently drop the positioning the moment the
pop-in animation's scale kicked in. Position is passed in as `--mx`/`--my` custom properties
(with explicit `px` units) and consumed by `transform: translate(var(--mx), var(--my)) scale(...)`
in CSS instead.

**The mobile trail is a genuinely different path (`TRAIL_PATH_MOBILE`), not the desktop one
CSS-scaled down** — narrower horizontal amplitude relative to its height, so the winding S-curve
reads as intentional on a narrow screen. Marker labels *also* switch layout strategy on mobile:
desktop alternates each label to the left/right of its marker, but on a narrow viewport a
marker sitting close to the trail's (already narrower) horizontal edges has no room for a label
extending sideways — a long label would clip off the actual screen edge (a real bug caught
during testing: "Explore what excites you" rendered as "at excites you"). Mobile instead stacks
every label centered *below* its marker, trading the horizontal space it doesn't have for the
vertical space a tall trail always has plenty of.

The base of the trail echoes the real roadmap's "You are here" marker exactly (gold filled
circle, `Compass` icon, same colors) plus a continuous pulse ring animating its own `r`
attribute via CSS `@keyframes` — the one piece of visual continuity connecting this screen to
the actual product. **`prefers-reduced-motion: reduce` disables all of it at once**: a
`useMediaQuery` hook seeds every "have we animated yet" state to its *already-finished* value
(trail fully drawn, all markers revealed, hero content visible) so the final composition renders
immediately with no animation ever starting, and the continuous pulse ring isn't rendered at
all (a static ring wouldn't violate reduced-motion, but there's no reason to render an inert
element either) — a redundant `@media (prefers-reduced-motion: reduce)` CSS block also zeroes
out the relevant `transition`/`animation` properties directly, so the page is correct even if
JS is slow to hydrate.

**The Academic Plan is two sequential sub-views, Map 1 (Year Overview) then Map 2 (Per-Year
Detail), not one screen** — `AcademicPlanScreen.jsx` routes between them purely on
`state.planYearIndex` (`null` = Map 1, a stage index = Map 2 scoped to that year), added to
`DEFAULT_STATE`/persisted like every other navigation field so a returning user resumes on
whichever view they left. This split exists because one canvas rendering everything from 1-day
task gaps up to a 4-year span at once was the root cause behind the recurring spacing bugs the
old single-canvas roadmap kept hitting.

- **Map 1** (`src/components/YearOverview.jsx`, data from `src/utils/yearOverview.js`'s
  `getYearOverview(state)`) is a small, lightweight screen showing one node per year the plan
  spans (`STAGE_PLAN[level][schoolYear]`, the same stage-resolution data `generateRoadmap()`
  already uses, so the two views can never disagree on year count/names), connected by a
  winding SVG trail — the same stroke-dasharray draw-in + staggered marker pop-in technique as
  `WelcomeScreen`'s hero, scaled down to discrete points instead of one continuous curve.
  `getYearOverview` does no date-of-task math at all, only which years exist and which is
  current; **stage index 0 is always "the year containing today" by construction** (every
  stage already gets `yearOffset: stageIndex` elsewhere, and `yearOffset: 0` is defined as
  "starts now"), so the current year needs no date comparison to find — it's always the first
  entry, rendered gold-filled with a `Compass` icon, a pulsing ring, and a "You are here" tag,
  matching the real roadmap's own "You are here" marker. Each marker also carries
  `yearStartDate` (`anchorDate({month: 8, day: 15, yearOffset: stageIndex}, ...)`) for Map 2's
  filtering to consume, even though Map 1 itself doesn't need it beyond ordering. Clicking a
  marker sets `planYearIndex`; each marker group has an invisible, generously-sized hit-target
  circle (`r=34`, same pattern as `Roadmap.jsx`'s nodes) since the visible ring+offset-label
  combo has an asymmetric bounding box that would otherwise let clicks between them fall through
  to the bare canvas. A 1-year plan renders exactly one marker and no path (`n < 2`). Map 1 gets
  the normal `.polish` shell and the shared page-transition, unlike Map 2 (below).
- **Map 2** (`Roadmap.jsx`, reached by clicking a year in Map 1) is scoped to that one year's
  real dates — `AcademicPlanScreen.jsx` derives a `yearWindow` (`{ start, endExclusive,
  isCurrentYear }`) from the SAME `yearStartDate`s Map 1 already computed
  (`getYearOverview`/`years[i].yearStartDate`, next stage's own `yearStartDate` as the exclusive
  end, `null` for the plan's last year — unbounded), so the two views can never disagree about
  where one year ends and the next begins. `generateRoadmap(state, yearWindow)`
  (`roadmapGenerator.js`) does the actual filtering via `filterItemsToYear()`: **a task belongs to
  whichever year its own real date falls in, no special-casing** (including Project Builder
  milestones or a multi-step opportunity chain that straddles a year boundary — each step is
  filtered independently by its own date; if the chain's own anchor point survives, it keeps its
  original anchor and just drops whichever steps fell outside this year; if only later steps
  survive, the earliest surviving one is promoted to the anchor for this year's view, the same
  "first step doubles as anchor" shape `buildProjectChain` already produces for projects — never a
  synthetic wrapper node). For a year that isn't the one containing real "today" (i.e. not
  `stageIndex 0`), `generateRoadmap` lays the filtered items out against that year's own start
  date as the positioning epoch instead of real today (`layoutToday`) — the min-gap/collision math
  in `roadmapLayout.js` only ever depends on DIFFERENCES between item dates, so this doesn't
  change any item's spacing relative to its neighbors, it just keeps that year's own canvas "day
  0" sane instead of anchored to a real "today" that could sit far outside a future year's span.
  The returned `roadmap.showToday` flag (true only for `stageIndex 0`, since that's the only year
  guaranteed to actually contain real today — see `yearOverview.js`) gates both the "You are here"
  marker and its leading spine connector in `Roadmap.jsx`; every other spine-to-spine connector is
  unaffected. `onBack` from Map 2 returns to Map 1, not out of the Plan screen entirely (that exit
  — to `projectBuilder` — moved to Map 1's own Back button). Prev/next-year navigation from within
  Map 2 itself (as opposed to going back to Map 1 and clicking a different year) is still a
  deliberate, separate follow-up, not yet built. Only Map 2 gets the full-bleed `.app-shell-plan`
  layout (`App.jsx`'s `isPlanDetail` check, `screenKey === 'plan' && state.planYearIndex !== null`);
  Map 1 does not.

**Hub redesign: the hub's visual presentation was rebuilt to match an AI-generated reference
image's own colors/layout/character style — scoped strictly to the hub screen and the shared
mascot illustration, not the app's established palette everywhere else.** The reference image
itself showed several fictional features (a working search bar, notifications, an avatar, a
"Your Progress" stats card, an "Ask MyPath AI anything" chat input, a "Quick Actions" panel, a
literal circular/orbit tile arrangement connected by dotted lines) that don't exist in this app
and were deliberately NOT built — the AI-chat-input framing in particular would have violated
this app's own hard "no AI/LLM calls anywhere" constraint if implemented functionally, not just
stylistically. Only the real 10-tile list (`TILES` in `HubScreen.jsx`, unchanged from Stage 3)
was restyled; the "central mascot, tiles below" structural layout from Stage 2 was kept rather
than a literal orbit (still too fragile across this app's own variable 8-10 tile count and
already-tested narrow-viewport range — see `.hub-screen`'s own comment in global.css for the
full reasoning, carried over from before this redesign).
- **A new, hub-scoped color system** (`.app-shell.app-shell-hub` in global.css) parallels the
  existing `.app-shell-plan` full-bleed override exactly — `App.jsx`'s `isHub` check
  (`screenKey === 'hub'`) applies `app-shell-hub` in place of `.polish` (deliberately excluded
  from `.polish` the same way `.app-shell-plan` already is, since the hub's own tile hover/press
  treatment is redesigned from scratch, not the shared one every other `.card`-based screen
  uses) instead of the app-wide parchment/teal/gold palette: `--hub-bg` (#F4F4F1, light
  off-white), `--hub-card` (white), `--hub-card-border`, `--hub-ink`/`--hub-ink-soft`,
  `--hub-shadow`/`--hub-shadow-hover`, and `--hub-accent` (#2F8F5B, green). These tokens are
  genuinely new, not aliases of `--paper`/`--teal`/`--gold` — every other screen (Survey,
  Discovery, Academic Plan, etc.) keeps the original palette completely unchanged, confirmed
  directly via screenshot comparison before/after this redesign.
- **Tiles no longer share the app-wide `.card`/`.card-title`/`.card-desc` classes at all** — a
  deliberate clean break (`.hub-tile`/`.hub-tile-title`/`.hub-tile-desc`), not an override layered
  on top, so neither the shared classes nor the hub-specific ones ever need to account for the
  other's values. Each tile's icon sits in a `.hub-tile-icon-box` (46×46px rounded square) reading
  `--tile-accent`/`--tile-accent-bg` custom properties set inline per tile in `HubScreen.jsx`
  (`TILE_ACCENTS`, a small fixed 6-color pastel palette — green/purple/orange/pink/blue/teal —
  cycled by index via `i % TILE_ACCENTS.length`) — the same "data/JSX picks the value, CSS just
  reads a custom property" convention `ProjectBuilderScreen.jsx`'s own `--pb-accent` cycling
  already established in this codebase, reused rather than inventing a new pattern. A locked
  tile's icon box swaps to a muted grey with a `Lock` icon exactly as it did before this
  redesign — only the visual language changed, not the real lock/unlock logic from Stage 3, which
  this pass didn't touch at all (`unlock`/`lockedReason`/`disabled={!unlocked}` are untouched).
  The pointing-target pulse (Stage 4) was restyled to the hub's new green accent (was gold) —
  still a glow layered on top of the tile's own resting shadow, not a replacement of it.
- **The header was restructured to match the reference's own "Welcome back, [name]!" + headline
  layout** (`.hub-header-row`/`.hub-welcome-line`, left-aligned, above the mascot) — this MOVED
  the greeting name out of the speech bubble entirely (where Stage 2 originally put it) into its
  own header line, still using the identical `state.displayName || state.username` fallback
  logic Stage 2 established. The speech bubble (`.mascot-greeting`) now holds only the Stage 4
  guided-step dialogue line and a new progress-dots indicator.
- **The progress-dots indicator (`.hub-progress-dots`) is the reference's own "1/6" step-position
  readout, rebuilt from real data, not invented.** `getGuidedProgress(state, hasPartnerSchool)`
  (`HubScreen.jsx`) filters `GUIDED_SEQUENCE` (Stage 4, unchanged) to the steps relevant for this
  student and reports `{ total, currentIndex, doneCount }` — the same real per-step `isDone`
  checks Stage 4 already computes, not a new completion concept. No "AI" branding appears
  anywhere near it (the reference's own bubble was labeled "MyPath AI ✨"), matching this app's
  hard no-AI constraint.
- **The mascot character itself was redesigned** (`src/components/MascotIcon.jsx`, fully
  rewritten) from the original Compass-motif circle+needle illustration to a friendly rounded
  robot-with-a-leaf-sprout character matching the reference's own design language — cream/off-
  white rounded body, a near-black rounded "screen" face with two curved glowing-mint eyes, small
  dark ear dots on each side, a green 2-leaf sprout on top (independently swaying via its own
  nested `<g>`, same "outer g carries the translate, inner g carries only the CSS-animated
  transform" split this codebase's own WelcomeScreen/Roadmap.jsx transforms already document —
  putting both on one element would silently drop the positioning the instant the sway animation
  applied), and a small pulsing teal "chest light." Still pure inline SVG + CSS keyframes, matching
  this codebase's standing preference for hand-drawn illustration over image assets — only the
  shapes/colors changed, not the underlying approach. **This redesign is global, not hub-scoped**
  (Task 2 had no color-scope qualifier the way Task 1 did): `MascotIcon` is shared between the
  hub's own large instance and Stage 5's in-flow `MascotWidget`, so the new character appears
  everywhere the mascot already did — but `MascotWidget`'s own speech-bubble chrome (the gold-
  left-border `.mascot-widget-text` card) was deliberately left untouched, since that's part of
  every OTHER screen's own established palette, not the hub's. The reference's own wooden pointer
  stick prop was not replicated — this app already has a separate, real pointing mechanism
  (`PointerArrow`, Stage 4) that computes a genuine angle from measured DOM positions; adding a
  second, static prop would be redundant with (and could visually conflict with) the one that
  already works.
- **Task 3 (animation quality) added one genuinely new interaction on top of the existing Stage 4
  pointing mechanism, without touching its angle math**: `.mascot-pointer` (the arrow's own
  rotation) now carries a `transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`, so
  advancing to a new guided target eases the arrow smoothly to its new angle instead of snapping
  instantly — `PointerArrow`'s own `Math.atan2` measurement (still computed fresh from real
  `getBoundingClientRect()` positions every time) is completely unchanged; only how the
  already-correct new angle gets revealed changed. `.mascot-dialogue`'s own text is keyed by its
  content (`key={nextStepIntro}` in `HubScreen.jsx`) so React mounts a fresh DOM node whenever the
  guided step's line actually changes, which is what makes its `hub-dialogue-in` CSS entrance
  animation replay on every new line rather than only once ever. Tiles pop in with a short
  `nth-child`-staggered entrance on mount (`hub-tile-pop-in`, up to 10 tiles, 40ms increments per
  tile) — the same plain-CSS staggering approach this app's earlier animation/polish pass already
  established elsewhere (`:is(.grid, .tag-list, ...)`), reused rather than inventing per-item JS
  index bookkeeping. All of the above respects `prefers-reduced-motion` via the same plain CSS
  `@media` block pattern this codebase already uses everywhere else for continuous/entrance
  animations — no JS state needed.
- Verified after this pass: every one of the 10 real tiles renders correctly with no fictional
  reference-image feature present; the mascot's pointing/greeting/dialogue/voiceover all still
  function correctly with the new appearance (confirmed via the existing hub/voice/mascot
  Playwright regression suite — `test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`,
  `test-hub-reset.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`,
  `test-voice-picker.js`, `test-signup.js`, all passing; several of these needed their own
  `.card-title` → `.hub-tile-title` selector updates to match the intentional class-name change,
  the same "fix pre-existing tests after an intentional markup change" pattern this codebase's
  test suite has already needed before); no other screen's palette changed (spot-checked via
  screenshot against Survey and Academic Plan Map 1, both still rendering the original parchment/
  teal/gold palette unchanged); a narrow (375px) viewport collapses the tile grid to one column
  cleanly with no overlap or clipping.

**Hub redesign, Take 2 — a structural correction to a genuinely radial layout, plus real Progress/
Quick Actions/Ask-AI pieces and a new mascot "speaking" animation state.** The first hub-redesign
pass above got the real feature list and color language right but missed the reference image's
actual COMPOSITION — a true radial layout (mascot dead-center, tiles scattered in a loose ring at
varying distances) rather than a flat grid stacked below the mascot. This pass is a structural
correction on top of that same visual language, not a second redesign — the mascot's own character
design is explicitly unchanged (kept exactly as built), and the hub-scoped color tokens/tile-card
styling from the first pass are still the foundation.
- **`.hub-radial-wrap`** (`HubScreen.jsx`/`global.css`) is the one container for the mascot AND
  every tile: a fixed-height (`880px`), `position: relative` box on desktop, with each tile pinned
  to a hand-tuned `{x%, y%}` slot (`RADIAL_POSITIONS`, 10 entries) via `position: absolute` —
  scattered left/right of the vertical center column the mascot + its dialogue bubble occupy, so
  nothing ever overlaps them, matching the reference's own scattered composition rather than a
  literal grid. Positions are assigned by plain tile INDEX, not tile identity — which real tile
  lands in which visual slot can shift a little when `hasPartnerSchool` toggles (Transcript & GPA/
  Course Selection insert into the middle of the array), the same acceptable trade the original
  grid's own CSS auto-flow already made. Fixed, hand-checked slots were deliberately chosen over a
  runtime physics/collision layout — for a purely decorative composition capped at 10 items, fixed
  slots are simpler and can't drift into overlap the way a general-purpose algorithm could.
- **A real, confirmed CSS bug was found and fixed building this — the exact "a CSS transform
  replaces rather than composes" landmine this codebase has already documented several times
  elsewhere (WelcomeScreen's markers, Roadmap.jsx's node transforms, MascotIcon's own leaf sway),
  hit again in a new spot.** The first attempt applied `transform: translate(-50%, -50%)` (to
  center each tile on its `{x%, y%}` anchor point) directly on `.hub-tile` itself — the SAME
  element that already had an entrance `hub-tile-pop-in` keyframe animation (`transform:
  translateY(14px) scale(0.97) -> translateY(0) scale(1)`) and hover/press states also setting
  `transform`. The animation's own final keyframe value silently discarded the centering translate
  the instant it played (confirmed directly via `getBoundingClientRect()`: every tile's TOP-LEFT
  corner, not its center, sat exactly on its raw `{x%, y%}` point) — which is what caused the
  lowest ring of tiles to visually spill down and collide with the bottom row (quote card/Ask-AI
  bar/Quick Actions) in the first screenshot taken during this pass. Fixed with the same "outer
  element carries position, inner element carries animation" split already established elsewhere:
  **`.hub-tile-slot`** is a plain, NEVER-animated wrapper doing only the `{x%, y%}` centering; the
  real `.hub-tile` button (with all its existing hover/active/entrance animations, completely
  unchanged) lives inside it as a plain full-width child. The tile's own `ref` (used by
  `PointerArrow`'s `getBoundingClientRect()` measurement) stays on the inner `.hub-tile` button,
  which is what's actually visually positioned once its wrapper is centered — no changes needed to
  the pointer-arrow angle math itself. The container height (`880px`) and each slot's own y-range
  (capped at 88% rather than closer to 100%) were then hand-verified via a real
  `getBoundingClientRect()` measurement script (not just eyeballing a screenshot) to confirm the
  lowest tile row's bottom edge sits comfortably above the bottom row's own top edge.
- **The entrance-animation stagger delay moved from CSS `:nth-child` to an inline
  `animationDelay`** (set per tile in `HubScreen.jsx`'s own `.map()`, using the real array index) —
  a second, related fix: `.hub-tile` is no longer a direct child of `.hub-radial-wrap` once
  `.hub-tile-slot` wraps it, and even before that change, `:nth-child` counted ALL of the wrap's
  children including the 12 decorative particles and the mascot area (both earlier siblings in the
  DOM), so the stagger delays were never actually landing on the tiles they were meant for in the
  first place. Inline delay sidesteps needing DOM order to line up with the tile list's own order
  at all.
- **Task 1's decorative floating particles** (`PARTICLES`, `HubScreen.jsx` — 12 fixed `{x, y,
  size, color}` entries, reusing the tile accent palette for cohesion) are absolutely positioned
  `<span>`s with `pointer-events: none` and a slow float/fade keyframe, scattered in the gaps
  between the mascot and the tile ring — purely visual, no data behind any of it, hidden entirely
  under the narrow-viewport fallback (below).
- **Narrow-viewport fallback**: `.hub-radial-wrap` becomes a plain CSS grid below `980px`
  (`.hub-mascot-area` pulled out of absolute positioning and given `grid-column: 1 / -1` so it
  still reads as its own full-width row above the tiles, exactly like the mascot-above-grid layout
  this replaces); `.hub-tile-slot`'s absolute positioning is reset with `!important` (required,
  not a shortcut — it's beating an INLINE `left`/`top` style, which no plain class-based rule can
  outrank on specificity alone); particles are hidden outright. A true scattered radial ring only
  reads as intentional at a wide desktop width — the reference image's own composition genuinely
  is radial, so this pass builds it for real, but a ring still can't be forced to work below some
  width without every tile overlapping, so the fallback is a deliberate, acknowledged trade, not an
  oversight.
- **Task 2 (colorful tiles)**: `TILE_ACCENTS` (`HubScreen.jsx`) is a 7-color vivid palette (purple/
  yellow/teal/orange/pink/blue/green, cycled by index) reading `--tile-accent-bg`/`--tile-accent-
  fg` custom properties — the same cycling convention the first pass already established, just
  re-tuned toward genuinely vivid/saturated colors (each paired with whichever icon color, white or
  dark ink for the lighter yellow, actually reads clearly on top of it) rather than the first
  pass's softer pastels. Locked tiles are unaffected — `.hub-tile.locked .hub-tile-icon-box` still
  overrides to muted grey regardless of a tile's own accent index, per this task's own explicit
  "locked tiles stay muted until unlocked" instruction.
- **Task 3's real, buildable extras**:
  - **Top bar** (`.hub-topbar`) — logo (a `Leaf` icon, matching the reference's own leaf-themed
    logo and this mascot's own leaf sprout, a deliberate small departure from the app-wide
    `Compass` brand icon used everywhere else, since the hub already has its own separate visual
    identity per the first redesign pass) + a non-functional/placeholder search field (explicitly
    scoped as decorative, per this task's own instruction) + a purely decorative notification bell
    (no real notifications feature exists to back a live badge count with, and a fabricated count
    would be exactly the kind of invented number this app's data layer never allows itself
    elsewhere — so it's icon-only, no badge) + the student's own picked avatar (`AVATAR_OPTIONS`,
    `SignUpScreen.jsx` — now exported and imported here too, resolved by `state.avatarIcon`,
    falling back to a plain `User` icon if none was picked). **The hub renders this top bar
    INSTEAD OF the generic app-wide `.app-header`, not alongside it** — `App.jsx`'s existing
    `isHub` check now also gates the generic header's own render (`{!isHub && state.screen !==
    'welcome' && (...)}`), so there's exactly one top bar on the hub, not two stacked. The real
    mute toggle and voice-settings gear button (previously only ever rendered inside the generic
    header) move into this bar's own right-hand icon cluster instead of disappearing — `App.jsx`
    now passes `onOpenVoiceSettings` as a prop to every screen (harmless/unused by every screen
    except HubScreen, which is the only one that reads it), since `voiceSettingsOpen` itself still
    lives in `AppShell`'s own local state and `VoiceSettingsPanel` still renders unconditionally
    there via its usual portal — only the TRIGGER button's location changed, not the panel's own
    mount point. The mute/settings buttons keep their exact original classes
    (`voice-mute-toggle`/`voice-settings-toggle`) and `title` attributes so existing Playwright
    coverage (`test-voiceover.js`, `test-voice-picker.js`) keeps working unmodified.
  - **"Your Progress" card** (`.hub-progress-card`) — a conic-gradient percentage ring (no chart
    library: an outer circle painted `accent` for `pct`% of its circumference via inline
    `background: conic-gradient(...)`, with a smaller solid circle centered on top punching out
    the donut hole the percentage text sits in) plus three real stats, computed from real data, not
    invented:
    - **Tasks completed** — `countPlanTasks(roadmap, state.completedNodes)` (`HubScreen.jsx`)
      walks the FULL multi-year roadmap (`generateRoadmap(state)` with no `yearWindow`, the same
      unfiltered whole-plan spine `AcademicPlanScreen.jsx`'s own `useMemo` pattern already calls
      elsewhere — not just whatever single year Map 2 happens to be scoped to) and counts every
      real completable unit: a plain spine item's own id, or — for a chain with `branchSteps` —
      each step's own id, EXCEPT an opportunity's own anchor (which, per `Roadmap.jsx`'s own
      Start/Continue/Completed button, has no independent `completedNodes` entry of its own; its
      completion is only ever derived from its steps) is correctly excluded, while a started
      PROJECT's own anchor (which, per `buildProjectChain`, literally IS its first real step,
      individually toggled via `completedNodes` exactly like any other core item) is correctly
      included. Zero-survey-completed shows `0/0` rather than crashing on a null `educationLevel`
      — there's honestly no plan yet to count.
    - **Milestones reached** — reuses `getGuidedProgress`'s own `{ doneCount, total }` (Stage 4,
      unchanged) directly, the exact same real data the mascot's own progress-dots indicator
      already shows — not a second, parallel completion concept.
    - **Days active** — `state.accountCreatedAt` (`AppContext.jsx`, a plain `'YYYY-MM-DD'` string,
      `null` by default) is set once, ever, by `SignUpScreen.jsx`'s own submit handler
      (`state.accountCreatedAt || new Date().toISOString().slice(0, 10)` — never overwritten by a
      defensive re-submit), and the stat is `realDaysBetween(startOfToday(), parseDateInputValue(
      accountCreatedAt)) + 1` (inclusive of day one), clamped to a minimum of 1. A genuine, if
      simple, real metric rather than an invented placeholder number — this app has no actual
      visit-log to compute a richer "distinct days used" figure from, and inventing one would
      violate this app's own standing "don't fabricate data" rule.
    - **"View Roadmap"** is a plain `patch({ screen: 'plan' })` — the same real navigation every
      other route to the Academic Plan already uses.
  - **Quick Actions** (`.hub-quick-actions`) — **"Add a Task"** opens the exact same shared
    `AddTaskModal` Roadmap.jsx's own "+ Add Task" already uses (imported directly, `makeTaskId`
    from `utils/ids.js`), appending to the real `state.customTasks` array — no new task-creation
    mechanism was built. **"Start Over"** calls the hub's own existing `handleReset` — the exact
    same `window.confirm(...)` + `reset()` function the small standalone `.hub-reset-btn` link
    already used, not a duplicated confirm/reset flow. That small link is deliberately KEPT
    alongside this (not removed) — it's still real, pre-existing test coverage's own entry point
    (`test-hub-reset.js`), and being small/muted/below-the-fold, it doesn't visually compete with
    Quick Actions' own polished button.
  - **"Ask MyPath AI anything"** (`.hub-ask-ai`) — explicitly a UI mockup only, per this app's hard
    "no AI/LLM calls anywhere" constraint (see the top of this file): there is no model wired up
    behind this input at all. Submitting (`submitAskAi`) only ever reveals a plain, honest "Coming
    soon!" note (`.hub-ask-ai-note`) — no request is made, no new state fields are written beyond
    the local `askAiSubmitted` flag. The literal reference copy/branding is kept as specified,
    since DISPLAYING that label is not itself an AI call — only wiring one up would be, which this
    deliberately never does.
  - **A decorative quote card** (`.hub-quote-card`, bottom-left) is a single fixed `{ text, author
    }` constant (`QUOTE`, `HubScreen.jsx`) — pure visual flavor, not tied to any real data, matching
    the reference's own quote card and this app's standing "never fabricate an attributed source"
    posture (a real quote, correctly attributed, not invented).
  - **The three bottom-row pieces (quote / Ask-AI / Quick Actions) are laid out via a plain CSS
    grid in normal document flow** (`.hub-bottom-row`), not fixed/absolute page corners the way the
    reference's own mockup implied — this was a deliberate simplification so the row reflows
    cleanly on a narrow viewport (stacking to one column below `900px`) and scrolls naturally
    below a tall tile ring, instead of fighting fixed positioning across this app's own
    already-tested variable viewport range.
- **Task 4 — a distinct mascot "speaking" animation state, layered on top of the EXISTING idle/
  pointing states without touching the character's own shapes/markup at all** (per this pass's own
  explicit "keep the mascot design exactly as it currently is" instruction).
  - **`MascotIcon.jsx` gained one new, purely additive prop: `speaking`.** It swaps in one extra
    class (`.mascot-speaking` on the body's own bob group, `.mascot-eye-talking` on each eye,
    `.mascot-chest-light-talking` on the chest light) — the same elements that already animate at
    idle, just playing a different, livelier preset while `speaking` is true (a quicker/bouncier
    bob, a rhythmic eye squeeze instead of an occasional blink, a faster chest pulse) via
    `global.css`'s own new `mascot-speak-bob`/`mascot-eye-talk`/`mascot-chest-pulse-fast`
    keyframes. Compound selectors (`.mascot-bob.mascot-speaking`) beat the plain single-class idle
    rules regardless of declaration order, so no `!important` was needed.
  - **`useMascotSpeech(text, muted, voiceURI)` now also RETURNS a boolean** (`isSpeaking`), driven
    two different ways depending on whether there's real audio to sync to: when unmuted and a real
    voice is available, `speech.js`'s own `speak()` was extended to accept `{ onStart, onEnd }`
    callbacks wired directly to the real `SpeechSynthesisUtterance`'s `onstart`/`onend`/`onerror`
    events — genuinely synced to the actual audio, not guessed. When muted, or a device has no
    usable voices at all, there's no real audio to sync to, so it falls back to a new
    `estimateSpeechDuration(text)` (`speech.js` — a plain ~2.3-words/sec estimate, clamped to a
    sane 1200-6000ms range) driving a plain `setTimeout`, so the mascot still looks like it's
    "saying" the line roughly as long as it takes to read, matching this task's own "and/or"
    framing rather than going silent/frozen whenever sound happens to be off. Both `HubScreen.jsx`
    and `MascotWidget.jsx` now pass this returned value straight into `MascotIcon`'s `speaking`
    prop — the SAME shared hook drives the animation everywhere the mascot already speaks, not a
    second parallel mechanism built just for the hub.
  - **A real, confirmed bug was found and fixed building this — a genuinely new flavor of the
    React 18 StrictMode dev-only replay bug this codebase has already hit (and fixed) more than
    once elsewhere, but a subtler variant than the usual "double-invoke the same effect body"
    case.** StrictMode's dev-only mount -> cleanup -> remount replay doesn't just call the SAME
    effect body twice — it genuinely fires the SEPARATE unmount-only effect's cleanup function in
    between (the one that calls `stopSpeaking()`/`clearTimeout` on real unmount), canceling the
    just-scheduled estimated-duration timer entirely, before the main effect's own replay runs
    again. Confirmed directly: seeding a fresh, muted hub load and polling `.mascot-bob`'s own
    `class` attribute over several seconds showed `mascot-speaking` NEVER being removed, ever —
    the estimated timer had been silently canceled by this replay before it could ever fire, and
    the main effect's own key-based dedup (`key !== lastKeyRef.current`) — which correctly
    recognizes "this is the same line as before" — had no way to tell that apart from "the user
    just now toggled mute with this same line still showing" (which SHOULD stop the animation
    immediately), since both cases present as an effect re-run with an unchanged key. Fixed with a
    real wall-clock timestamp guard (`lastKeySetAtRef`, a plain `Date.now()` snapshot taken
    whenever a key is newly accepted): StrictMode's replay happens synchronously, well under 50ms
    after the original commit; a genuine later mute-toggle by an actual user happens much later.
    Within that ~50ms replay window, if no timer is currently pending (because the unmount-only
    effect's cleanup already canceled it), the estimated timer is simply RE-scheduled from scratch
    — a few milliseconds of drift from the original schedule is imperceptible; past that window,
    the same "same key, no new timer" shape is correctly treated as a real toggle and stops the
    animation immediately instead. The unmount-only cleanup effect was also fixed to reset
    `timeoutRef.current` back to `null` after clearing it (it previously only called
    `clearTimeout`, leaving a stale non-null id behind that could fool any later "is a timer
    currently pending" check into reading a canceled timer as if it were still live) — this was
    the second half of the same root cause, not a separate bug.
- Verified after this pass: `getBoundingClientRect()`-based geometry checks confirm all 10 tile
  slots render with zero pairwise visual overlap and the lowest tile row sits above the bottom
  row; unlocked tiles show multiple distinct vivid icon-box colors (no locked-grey false positive);
  the Progress card's three stats are real and change correctly when `completedNodes` gains real
  entries; Quick Actions' "Add a Task" genuinely appends to `state.customTasks` and "Start Over"
  genuinely triggers the same confirm dialog `.hub-reset-btn` uses (dismissing it changes nothing);
  "Ask MyPath AI anything" shows "Coming soon" on submit and writes no new state; the mascot's
  `.mascot-bob` element carries `mascot-speak-bob`/`mascot-eye-talk` immediately after a new
  dialogue line appears and reverts to the idle `mascot-bob` animation once the estimated duration
  elapses; no fictional reference-image feature name (Messages, Community, Find a Tutor, Partner
  Admin, Inspire Network, Upload Document, Progress Tracker, Projects & Portfolio) appears anywhere
  in the rendered hub; the full pre-existing hub/voice/mascot Playwright suite
  (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`, `test-hub-reset.js`,
  `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`,
  `test-signup.js`, the general `test.js`) all still pass — two needed a small, intentional-
  content-change update (`test-return-to-hub.js`'s expected hub headline text, since Task 1's own
  headline copy changed from "Where to next?" to the reference's own "What would you like to
  accomplish today?"), the same "fix pre-existing tests after an intentional change" pattern this
  suite has already needed before, not a regression; a narrow (375px) viewport still collapses
  cleanly via the radial-to-grid fallback with no overlap or clipping; Survey and Academic Plan
  Map 1 screenshots confirm zero palette leakage outside the hub, unchanged from before this pass.

## Design tokens

`src/styles/global.css` holds all fonts/colors as CSS custom properties (`--paper`, `--ink`,
`--gold`, `--teal`, `--rust`, `--stone`, etc.) plus the roadmap-specific classes originally
ported from the reference prototype (paper/trail-map palette, Fraunces/IBM Plex fonts). Match
these tokens rather than introducing new colors when building new UI.

**A second, "bloom" palette now exists alongside the original one above — a lighter, more
colorful set (light neutral background, white cards, a green primary accent, plus a 7-color vivid
accent set) first built for the hub redesign, now promoted to shared `:root` tokens and being
rolled out to the rest of the app screen by screen. Welcome and Sign-Up are the first two screens
moved onto it; every other screen still reads the original palette above, unchanged.**
- **`--bloom-bg`/`--bloom-card`/`--bloom-card-border`/`--bloom-ink`/`--bloom-ink-soft`/
  `--bloom-shadow`/`--bloom-shadow-hover`/`--bloom-accent`** (`:root`, `global.css`) are the exact
  same values the hub redesign originally defined locally inside `.app-shell.app-shell-hub` — that
  block now ALIASES its own `--hub-*` custom properties to these (`--hub-bg: var(--bloom-bg)`,
  etc.) instead of redefining the same hex values a second time, so none of the hub's own
  extensive `--hub-*`-reading CSS needed to change when this promotion happened. `--bloom-purple`/
  `--bloom-yellow`/`--bloom-teal`/`--bloom-orange`/`--bloom-pink`/`--bloom-blue`/`--bloom-green`
  are the same 7-color vivid set first built for the hub's own tile icon boxes
  (`TILE_ACCENTS`, `HubScreen.jsx`) — that array now reads `var(--bloom-purple)` etc. directly
  instead of repeating the hex values a second time in JS, now that a second screen (Sign-Up's own
  avatar picker, below) reuses the identical colors.
- **`.app-shell.app-shell-bloom`** (`App.jsx`'s `isBloomScreen` check — `screenKey === 'welcome'
  || screenKey === 'signup'`) scopes shared-chrome color overrides (`.btn-primary`, `.btn-ghost`,
  `.btn-outline`, `.page-sub`, `.field-hint`, `.optional-badge`, `.task-form-field` inputs, the
  header brand/icon buttons) to just these two screens — the same scoping precedent
  `.app-shell-hub`/`.app-shell-plan` already established, so none of this leaks onto any other,
  still-parchment-themed screen. Added ALONGSIDE `.polish` (not instead of it, unlike the hub) —
  neither Welcome nor Sign-Up built its own custom button/card interaction system, so they still
  want the shared press/hover feedback `.polish` already provides everywhere else; this pass is
  colors only, not a second interaction-design pass.
- **`body:has(.app-shell-bloom)`** handles the page-level background/parchment-texture swap
  separately from `.app-shell-bloom` itself — `.app-shell` doesn't span the full viewport on
  these two (non-full-bleed) screens the way `.app-shell-hub`/`.app-shell-plan` do, so recoloring
  just the shell's own box would leave the old parchment texture visible in the surrounding
  gutter/margin area. This is a real, modern CSS `:has()` relational selector, not a JS side
  effect — no `useEffect`/body-classList toggle was needed; the existing `.app-shell-bloom` class
  (already added for the button/text scoping above) is sufficient for the body-level rule to react
  to on its own, confirmed directly via a real rendered screenshot (not just a code read) showing
  the correct flat `--bloom-bg` color filling the entire page, not just the centered content
  column.
- **Welcome (`WelcomeScreen.jsx`)** — the CTA button, trail-drawing path stroke, and the base
  "you are here" marker (fill/stroke, both the SVG circle and its pulse ring) all switched from
  the old `--teal`/`--gold` to `--bloom-accent`. Every `.welcome-*` CSS class was edited directly
  in place (not `.app-shell-bloom`-scoped) since none of those classes are used by any other
  screen — no risk of leaking. **The hero-drawing animation and its mechanics are completely
  untouched**: the double-rAF draw-in sequence, the staggered marker reveal timers, the
  `prefers-reduced-motion` skip-to-settled behavior (`hasPlayedIntro`/`skipIntro`), and the
  `useMediaQuery`-driven reduced-motion CSS — verified directly, not assumed, that markers still
  reveal progressively over time under normal motion and that the reduced-motion context still
  renders the fully-drawn, no-pulse settled state immediately. One accepted, documented side
  effect: this marker used to echo the real Academic Plan roadmap's OWN "You are here" marker
  "exactly (gold filled circle...)" per this screen's own now-partially-stale prior documentation
  — that roadmap screen hasn't been repainted yet, so the two markers now intentionally differ
  (green here, still gold on the Academic Plan) until that screen's own turn in this same
  screen-by-screen rollout.
- **Sign-Up (`SignUpScreen.jsx`)** — `AVATAR_OPTIONS`' 6 icon colors moved from a mix of old
  `--teal`/`--rust`/`--gold`/`--ink` values to 6 of the shared palette's 7 vivid accent colors
  (purple/orange/yellow/blue/pink/teal) — green is deliberately skipped here, since it's the same
  hue as `--bloom-accent` (already used heavily on this same screen for the Continue button and
  focus rings), so including it would make one avatar option read as "the accent color" rather
  than its own distinct pick. `.avatar-grid`/`.avatar-option` (Sign-Up-exclusive classes, like
  `.welcome-*` above) were edited directly rather than `.app-shell-bloom`-scoped. **Functionality
  is completely unchanged** — required username gating Continue, the two optional fields, avatar
  selection state — verified directly (not just code-read) via the existing `test-signup.js`
  Playwright suite, which passes unmodified against the recolored screen.
- Verified after this pass: real rendered screenshots (not just computed-style checks) of both
  screens show the new light/colorful palette; a dedicated Playwright check confirms `:root`'s
  `--bloom-*` tokens resolve to the expected values, both screens' body background/CTA/trail/
  avatar colors resolve to the new palette, Sign-Up's required/optional field behavior is
  untouched (Continue disabled/enabled at the correct times, submission commits the right state),
  and — critically — a third screen (Survey) was independently re-checked and still resolves to
  the OLD palette's exact body background and button color, confirming zero leakage from this
  pass's own scoping. The full pre-existing hub/voice/mascot/signup Playwright suite still passes
  unmodified.

**Bug fix: the hub's radial layout looked visibly different (overlapping cards) on a student's
very first visit — right after sign-up, with almost every tile locked — than it did on every
later visit.** Root cause, confirmed directly via `getBoundingClientRect()` before touching
anything: `.hub-tile` has no fixed height — a LOCKED tile's extra `.hub-tile-lock-reason` line
(the "SELECT AT LEAST ONE PROGRAM FIRST" text) makes it measure a real 193px tall, against 157px
for an unlocked tile with no reason line at all, confirmed uniformly across every real
`lockedReason` string in the app (each one wraps to exactly 2 lines at this card's fixed 232px
width). `.hub-tile-slot` centers each tile on a fixed `{x%, y%}` point via `translate(-50%,
-50%)` with zero awareness of a NEIGHBORING tile's own height — so on a fresh sign-up, where
7 of 8 tiles are locked at once, several adjacent slots' now-taller boxes visibly overlapped each
other (confirmed via screenshot: Related College Majors overlapping Academic Plan, Recommended
Programs overlapping Your School List). Once enough tiles unlock later (shorter, no reason line),
the same fixed slots stop colliding and the layout reads as "corrected" — this was never a
positioning-MATH bug (`RADIAL_POSITIONS` itself, and the angle math in `PointerArrow`, are
unmodified by this fix) or an entrance-animation timing issue, only a per-card height that varied
by lock state while the slots assumed a constant one.
- **The fix has two parts, both in `global.css`, neither touching `HubScreen.jsx`'s own JSX/logic
  at all** (`RADIAL_POSITIONS`, `TILES`, `unlock`/`lockedReason`, `PointerArrow` are byte-for-byte
  unchanged): `.hub-tile` gained `min-height: 194px` (the real, measured locked-tile height,
  rounded up by 1px), so EVERY tile — locked or unlocked — now reserves the same box height; an
  unlocked tile simply carries a little empty padding at the bottom where a locked tile's reason
  line would sit, rather than shrinking to fit its shorter content. On its own this fix is
  necessary but not sufficient — forcing every tile to the taller locked height meant
  `RADIAL_POSITIONS`' original vertical gaps (hand-tuned back when tile height varied, and by
  measured value only ever verified against variable/shorter heights) were no longer wide enough
  to keep same-column NEIGHBORING slots (e.g. index 0 and index 2) from overlapping EACH OTHER —
  confirmed by computing every one of the 10 slots' real bounding box at a uniform 194px height:
  the original `880px` wrap height produces 8 overlapping slot pairs; the first height with
  provably zero overlaps across every pair is `1022px`. `.hub-radial-wrap`'s `height` was raised
  to `1080px` — a real ~58px safety margin above that exact computed threshold, not a
  razor-thin fit, matching the same "pad the collision math, don't cut it exact" posture this
  codebase's own `roadmapLayout.js` (`COLLISION_PADDING`) already favors elsewhere. The narrow-
  viewport fallback (`@media (max-width: 980px)`, where `.hub-radial-wrap` becomes a plain CSS
  grid with `height: auto`) is unaffected by either change — a CSS grid's own row height is
  already driven by its tallest cell per row, so it never had this bug to begin with.
- Verified with a dedicated Playwright suite: reset → view the hub fresh, repeated 3 separate
  times, confirming ZERO tile-to-tile bounding-box overlaps and a uniform tile height (sub-pixel
  tolerance, since real browser subpixel rounding differs by a few thousandths of a pixel between
  otherwise-identical cards) on every attempt, not just once by chance; the after-survey hub
  (several tiles now unlocked) still shows zero overlaps and the same uniform height; the SAME
  radial slot (by index) renders at the identical on-screen position/height on the very first
  visit as it does after the survey — a direct, structural confirmation of the fix's own stated
  goal, not just "no overlaps" as a proxy for it; and, to confirm the fix didn't accidentally
  paper over real, intentional differences, a fresh sign-up state still shows exactly 7 locked
  tiles and the mascot's own survey-first dialogue line, both completely untouched by this pass.
  The full pre-existing hub/voice/mascot suite (`test-hub.js`, `test-hub-locking.js`,
  `test-hub-pointing.js`, `test-hub-radial.js` — which already asserts zero pairwise tile-slot
  overlap and continues to pass unmodified, `test-hub-reset.js`, `test-return-to-hub.js`,
  `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, the
  general `test.js`) all still pass with zero regressions — this was a pure CSS sizing fix, and
  `PointerArrow`'s own live `getBoundingClientRect()` measurement naturally picks up each tile's
  new (taller, but now CONSISTENT) position with no code changes of its own needed.

**Bug fix: "Your Progress" (the hub's conic-gradient stats card, with a "View Roadmap" link)
rendered unconditionally, right after sign-up, before any real Academic Plan exists — clicking
"View Roadmap" that early crashed the app outright, and was a likely contributor to the layout
bug fixed just above.** Confirmed the crash directly before touching anything: the card's own
`taskProgress` stat numbers already had a defensive `isSurveyComplete(state) ? generateRoadmap
(state) : null` guard (falling back to an honest `0/0` rather than crashing), but the SEPARATE
"View Roadmap" button right next to those numbers had no such guard at all — it unconditionally
called `patch({ screen: 'plan' })`, which mounts `AcademicPlanScreen` → `getYearOverview(state)`
→ `STAGE_PLAN[state.educationLevel][...]`, and `state.educationLevel` is still `null` at that
point (the survey hasn't been completed yet) — `STAGE_PLAN[null]` is `undefined`, so indexing
into it throws `Cannot read properties of undefined`, and the whole React tree unmounts with no
error boundary catching it (confirmed via Playwright: `document.body.innerText` reads completely
empty after the click, not just a console error). The OLD "0/0 rather than crashing" framing in
the surrounding comment was only ever true for the STAT NUMBERS shown inside the card, never for
the navigation button beside them — an empty card with a genuinely broken link behind it was
never a real fix, just an untested one.
- **The fix hides the whole card, not just the button, until there's a real plan behind it** —
  matching the exact same real-data threshold the "Academic Plan" tile itself already unlocks on
  (`state.selectedProgramKeys.length > 0`), reused directly (`TILES.find((t) => t.id ===
  'plan').unlock(state, hasPartnerSchool)`) rather than a second, possibly-drifting copy of that
  condition — so "Your Progress" and the "Academic Plan" tile can never disagree about whether a
  real plan exists yet. This is a stricter gate than `isSurveyComplete` alone (a student can
  finish the survey and still have zero programs selected — Careers → Majors → Programs are all
  separate steps after it), so the card stays hidden through that whole in-between stretch too,
  not just the very first moment after sign-up. Before this gate is met, the card is entirely
  ABSENT from the DOM (a plain `{hasRoadmap && (...)}`), not rendered empty or with placeholder
  zeros — `.hub-top-section`'s own `justify-content: space-between` flexbox needed no changes to
  handle a single remaining child gracefully, confirmed directly via screenshot (the header row
  simply occupies the row on its own, no leftover gap or stray empty box). The `roadmap`/
  `taskProgress` `useMemo` calls themselves were left in place unconditionally (React hooks can't
  be called conditionally) — only the JSX render of the card was gated; both memos are cheap and
  harmless to compute even when their result goes unused.
- Verified with a dedicated Playwright suite: the card is completely absent (not just visually
  hidden) on a fresh sign-up, with zero page errors just from viewing the hub in that state; it
  stays absent even after the survey alone is completed, confirming program selection (not survey
  completion) is the real gate; once a program is selected, the card renders with real stat rows;
  and clicking "View Roadmap" at that point produces zero errors, correctly navigates to
  `screen: 'plan'`, and the Academic Plan screen actually renders real UI rather than a blank
  crashed page. The full pre-existing hub suite (including the layout-overlap regression test
  from the fix just above, which incidentally also re-confirms the hub layout reads cleanly
  without this card present) still passes with zero regressions.

**Bug fix: Transcript & GPA / Course Selection used to be FILTERED OUT of `TILES` entirely (never
rendered at all, not even locked) until after the survey revealed whether the student picked a
partner school — inconsistent with every other tile on this hub, which always stays
visible-but-locked rather than disappearing outright.** The real distinction that actually
matters is whether eligibility is still UNKNOWN (survey not done yet — genuinely can't say either
way) vs. KNOWN (survey done, and it turned out no partner school was selected — genuinely doesn't
apply, so hiding really is the correct call there). The old code conflated these two very
different situations into one boolean (`hasPartnerSchool`, which reads `false` in BOTH cases,
since `state.currentSchool` starts as `''` and only ever gets set once the survey's school field
is actually submitted) — so a brand-new user saw these two tiles vanish, not lock, from the very
first hub visit.
- **The fix, `partnerSchoolGate(unlockFn, lockedReasonFn)`** (`HubScreen.jsx`), wraps a tile's own
  REAL Stage 3 `unlock`/`lockedReason` pair with one extra check: `isSurveyComplete(state) &&
  unlockFn(...)` for unlock, and `isSurveyComplete(state) ? lockedReasonFn(...) :
  SURVEY_PENDING_REASON` for the reason shown — `SURVEY_PENDING_REASON` being the one new shared
  string ("Complete the survey to see if this applies to you"), reused by both tiles rather than
  writing it twice. This is a display-only wrapper: once the survey IS complete, both tiles fall
  straight through to their exact original, already-shipped `unlock`/`lockedReason` functions —
  Transcript & GPA still requires `selectedProgramKeys.length > 0`, Course Selection still
  requires `state.transcriptCompleted` — completely unmodified, so the real Stage 3 unlock
  SEQUENCE for a partner-school student is byte-for-byte the same as it always was. The `tiles`
  filter itself (`TILES.filter(...)`) changed from `!t.requiresPartnerSchool || hasPartnerSchool`
  to `!t.requiresPartnerSchool || !isSurveyComplete(state) || hasPartnerSchool` — a tile now only
  ever disappears once the survey is complete AND it's confirmed no partner school applies; before
  that (survey incomplete, meaning genuinely unknown either way), the tile stays in the array and
  simply renders locked via the `partnerSchoolGate`-wrapped functions above. `GUIDED_SEQUENCE` (the
  SEPARATE list the mascot actively points at/walks through, Stage 4) was deliberately left
  completely untouched — it already excludes these two steps for a non-partner-school student via
  its own, unrelated `hasPartnerSchool` filter, and that's still correct: the mascot shouldn't
  actively point at either step until it's known they apply, regardless of how the TILE itself
  renders in the meantime.
- **This adds up to 2 more tiles (10 total, up from 8) rendering pre-survey than before this
  fix — the exact same tile-count/height/overlap math the immediately-preceding "first visit
  looked wrong" bug fix already solved generally (not just for whatever 8-tile count happened to
  exist at the time)**: confirmed directly via the same bounding-box overlap check that fix's own
  regression test already uses, now re-run against the full 10-tile pre-survey set — zero
  overlaps, same as the already-fixed 8/10-tile cases.
- Verified with a dedicated Playwright suite (14 checks) plus updates to 3 pre-existing tests that
  asserted the OLD "hidden entirely" behavior (`test-hub.js`, `test-hub-locking.js`, and this
  session's own `test-hub-firstvisit-layout.js` — each updated to assert the new, intentional
  behavior, the same "fix a pre-existing test after an intentional, expected change" pattern this
  codebase's suite has needed many times before, not a regression in the app itself): before the
  survey, both tiles are present, locked, and show the shared placeholder reason, with zero
  tile-overlap regressions; once the survey is done WITH a partner school (Roslyn), both tiles
  follow their exact original Stage 3 unlock sequence (Transcript & GPA unlocks on a selected
  program, Course Selection stays locked until Transcript & GPA is actually done); once the survey
  is done WITHOUT a partner school (only reachable for Undergraduate/Transfer, since a High School
  survey requires picking Roslyn to complete at all), both tiles correctly disappear and the tile
  count returns to exactly 8, unchanged from before this fix. The full pre-existing hub suite
  (`test-hub-pointing.js`, `test-hub-radial.js`, `test-hub-reset.js`, `test-return-to-hub.js`,
  `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, the
  general `test.js`, and this session's own `test-hub-progress-card-gate.js`) all still pass.

**Removed the Survey's own first-entry mascot intro line ("Let's get to know you! Just a few
quick questions before we build your plan."), now redundant with the hub's own pointing dialogue
(Stage 4) already delivering a similar intro-style line when it points at "Let's Build Your Plan"
before the user ever clicks in.** `SurveyScreen.jsx`'s `SURVEY_MASCOT_SEQUENCE` had this as its
own first entry (`{ key: 'survey-intro', when: () => true }`, no precondition, so it was always
first-in-queue on a genuinely fresh mount) — simply removed from the array, so the sequence now
starts directly at `survey-interests` ("What gets you excited?..."), the first REAL per-question
line, with everything after it (education level, grade/year, school selection) completely
unaffected — none of those entries or their own `when` preconditions were touched.
- **The underlying dialogue TEXT itself (`MASCOT_LINES['survey-intro']`, `mascotDialogue.js`) was
  deliberately left in place, not deleted** — unlike a fully-retired feature (e.g. Admissions
  Overview's own screen+data, deleted outright elsewhere in this app's history), this specific
  string is still genuinely read by a SEPARATE, unrelated consumer: `VoiceSettingsPanel.jsx`'s own
  `PREVIEW_TEXT` constant (`getMascotLine('survey-intro')`), the real sample line every voice's
  own "preview" button speaks in the voice-picker panel. Deleting the MASCOT_LINES entry would
  have silently broken that feature's preview button — confirmed this dependency directly via
  grep before removing anything, rather than assuming "no longer shown on Survey" meant "no longer
  used anywhere."
- Two stale comments in `SurveyScreen.jsx` that specifically cited `'survey-intro'` as a
  worked example of the mount-time cascade-prevention bug (both the original confirmed-bug
  description and the "more than one step eligible at once" illustration) were updated to either
  genericize the reference or fall back to the OTHER, still-accurate example already present
  right below it (picking an interest making `survey-educationLevel` eligible while
  `survey-interests` might still be showing) — so nothing in the surrounding code comments still
  points at a key that no longer exists in the sequence.
- Verified with a dedicated Playwright suite (5 checks): a genuinely fresh Survey entry never
  shows the old intro text, and the very first thing shown instead is the real
  `survey-interests` line; picking an interest tag still reveals the next real per-question line
  (education level) after the usual short delay, and picking an education level still reveals the
  one after that (grade/year) — confirming the rest of the in-flow sequence progresses completely
  normally; and a student returning to an already-in-progress or completed survey (several keys
  already in `mascotSeenKeys`) also never sees the old intro line. The full pre-existing suite —
  `test-stage5-mascot.js` (including its own dedicated no-cascade-on-fresh-mount regression
  check), `test-voice-picker.js` (confirms the voice-preview sample line still works, unaffected
  by this change), `test-voiceover.js`, `test-hub.js`, `test-hub-reset.js`, `test-return-to-hub.js`,
  `test.js`, and `test-signup.js` — all still pass with zero regressions.

**Mascot pointing animation overhaul, plus a real, confirmed fix for a speaking-animation
regression on the hub.** Replaces the old separate arrow indicator (`PointerArrow`, HubScreen.jsx
— a standalone `<ArrowRight>` rotated via inline style to a precisely measured angle) with a real,
full-body wand-based pointing gesture built directly into the mascot's own SVG, and fixes a real
bug where the speaking (mouth/expression) animation could get permanently stuck on, specifically
visible only on the hub.
- **Task 3's regression, root-caused before any of the animation work started** — confirmed via
  direct testing, not assumed: with a real voice available and voice unmuted (the app's own
  default), `speech.js`'s `speak()` returns `true` (a real utterance was successfully queued) but
  the browser can silently never actually fire `onstart`/`onend`/`onerror` for it — confirmed
  directly by observing real `speechSynthesis` behavior in this app's own dev/test environment:
  `speak()` returns `true`, `speechSynthesis.speaking` never becomes `true`, and neither event
  ever fires. Since `useMascotSpeech`'s only path back to `isSpeaking: false` in the real-speech
  branch was that `onEnd` callback, this left the speaking animation stuck ON forever. This is the
  ONE caller that actually surfaces this visually: `MascotWidget` calls the exact same hook but
  never reads its returned `isSpeaking` at all, so the identical stuck state there was silently
  harmless — only `HubScreen.jsx` wires the return value to `MascotIcon`'s `speaking` prop, which
  is why the bug reads as "hub-specific" even though the underlying hook is shared. A first fix
  attempt (a plain, unconditional safety-net `setTimeout` mirroring the muted branch's own
  fallback) turned out to be insufficient on its own — confirmed directly, it STILL left
  `isSpeaking` stuck for 8+ seconds (well past the 6s cap `estimateSpeechDuration` enforces): React
  18 StrictMode's dev-only mount -> cleanup -> remount replay tore the newly-scheduled timer down
  before it could ever fire, and the SECOND (persisting) invocation's own `isNewKey` check read
  `false` (since `lastKeyRef` was already set by the first invocation and the cleanup never resets
  it), so `if (!isNewKey) return;` bailed out before ever rescheduling anything — the EXACT SAME
  race already documented and fixed for the muted branch (`lastKeySetAtRef`'s ~50ms window check),
  just never applied to the real-speech branch too. Fixed by giving the real branch the identical
  recovery structure the muted branch already has: a genuinely new key always (re-)starts
  speaking; an unchanged key within the StrictMode replay window with no timer currently pending
  means the just-issued attempt was torn down before completing, so it's re-issued; an unchanged
  key well outside that window is a genuine later re-render (e.g. unmuting with the same line
  still showing) and does nothing, matching this branch's own original "isNewKey gates everything"
  contract. Both paths now funnel through one small `startSpeaking()` closure to avoid duplicating
  the speak()+timer logic twice.
- **Task 1/2 — `MascotIcon.jsx` gained two new, purely additive props: `pointing` (boolean) and
  `leanDirection` (`'left' | 'right' | null`).** `HubScreen.jsx` passes `pointing={isSpeaking}` —
  deliberately the SAME real signal that already drives the speaking animation, not a second,
  independently-tracked state — so "pointing" and "currently being displayed/spoken" are always
  the identical real thing, and Task 2's own "held pose... while the dialogue/voiceover... is
  playing" / "once the voiceover finishes (or... the dialogue's display duration ends)" behavior
  falls out of `useMascotSpeech`'s already-correct real-audio-or-estimated-duration timing with
  zero new state machine needed. `leanDirection` is measured the same "don't fake it, measure real
  DOM positions" way the old arrow's own angle was (`useLeanDirection`, a direct simplification of
  the old `PointerArrow`'s own measurement effect — same rAF-deferred-first-measurement fix for
  the exact StrictMode ref-population race already documented there, same resize listener — just
  resolving a binary left/right comparison instead of a continuous `atan2` angle, since a lean
  pose doesn't need arrow-level precision).
- **Three new SVG groups, each a deliberately SEPARATE element from the ones that already carry
  their own `transform`** — the exact "don't put two transforms on the same element" landmine this
  codebase has already documented and hit multiple times (WelcomeScreen's markers, Roadmap.jsx's
  node transforms, the hub tile pop-in, MascotIcon's own leaf sway) is exactly why Task 3's own
  "layers correctly on top of" requirement needed real structural care, not just a CSS class
  toggle:
  - `.mascot-pose` (new OUTERMOST wrapper around everything) leans the whole character via a plain
    CSS `transition` (not a keyframe animation) on `transform` — toggling
    `.mascot-pointing`/`.mascot-lean-left`/`.mascot-lean-right` on and off IS the "start-pointing"
    and "end-pointing" transition Task 2 asks for, entirely for free.
  - `.mascot-arm`/`.mascot-wand` are a NEW SIBLING of `.mascot-bob` (the group that already owns
    the idle/speaking bob animation's own `transform`), not a child of it — this sibling
    relationship is what lets the body's bob/speak animation and the arm's raise animation run
    genuinely simultaneously (confirmed directly: sampling computed styles mid-speech-mid-point
    shows `.mascot-bob` actively running `mascot-speak-bob` at the same instant `.mascot-arm`
    shows its real raised rotation matrix and `.mascot-pose` shows its real lean rotation matrix —
    three independent transforms, three independent elements, zero conflicts).
  - `.mascot-arm-mirror` is a THIRD separate wrapper (parent of `.mascot-arm`) — the arm+wand is
    drawn once, on the character's right side, and mirrored via `scaleX(-1)` on this wrapper only
    when `leanDirection === 'left'`, so the mirror-flip and the arm's own raise-rotation don't
    collide with each other either.
  - The wand itself extends via `scaleY` from its own attachment point at the hand, nested INSIDE
    `.mascot-arm` — nested parent-child transforms compose correctly in SVG/CSS (it's only
    MULTIPLE transforms on the SAME single element that don't), so the wand correctly swings along
    with the arm's own rotation while independently animating its own extend/retract.
  - Task 2's own "held pose, not frozen — a slight wand-tip glow/wiggle" is a continuous
    `animation` (not `transition`) on just `.mascot-wand-tip`, driven by `opacity`/`r` rather than
    `transform` specifically so it can run alongside the wand's own transition-driven extend with
    zero property conflicts on that same element — active only while actually raised.
- **`prefers-reduced-motion: reduce` disables every new transition/animation the same way this
  codebase already handles it everywhere else** — the pose still resolves to its correct final
  state instantly (a locked/pointing tile still visually reads as "pointing," just without the
  animated reveal), confirmed directly: `transition-duration` computes to `0s` on all three new
  groups and the wand-tip glow's `animation-name` computes to `none` under a reduced-motion
  context.
- Verified with a dedicated Playwright suite (16 checks): the old arrow element (and its CSS rule)
  is gone entirely; the mascot genuinely leans left for a top-left target and right for a top-right
  one (real, non-identity transform matrices on the body, arm, AND wand, not just a class name);
  the arm mirrors only for a left-side target, never a right-side one; the wand-tip glow animation
  is genuinely active while held; the pointing pose correctly ends (arm lowers, lean returns to
  centered) once the dialogue's display duration finishes; and — the actual regression this batch
  set out to fix — with voice unmuted, the speaking animation activates on the hub, runs
  SIMULTANEOUSLY with the pointing pose (not replacing it), and correctly resolves back to idle
  rather than staying stuck for 6.5+ seconds. The full pre-existing hub/mascot/voice suite
  (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js` — updated in place to check the new
  pose classes instead of the retired arrow, same real behavior otherwise fully re-verified
  unmodified, `test-hub-radial.js`, `test-hub-reset.js`, `test-return-to-hub.js`,
  `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, and the
  general `test.js`) all still pass with zero regressions.

**Bug fix: the pointing gesture built above aimed toward a general LEFT/RIGHT side of the mascot,
not the target tile's actual precise position** — a real, confirmed regression in the pointing
overhaul itself (the `leanDirection: 'left' | 'right' | null` prop from that pass), caught and
fixed the same day. Two different targets sitting on the same general side — one almost directly
overhead, one far off at a shallow angle, or two at genuinely different distances/angles — got the
IDENTICAL fixed lean/raise angle as long as they were both simply "left" or both simply "right" of
the mascot; the gesture never actually tracked where a target really was, only which half of the
mascot it happened to be on.
- **The fix replaces the binary `leanDirection` with a continuous, precisely measured
  `pointAngle`** (`HubScreen.jsx`'s `usePointAngle`, a direct restoration of the SAME real
  `Math.atan2(dy, dx)` measurement the original `PointerArrow` used before the pointing overhaul
  ever simplified it down to a side comparison — same ref-based `getBoundingClientRect()`
  approach, same rAF-deferred-first-measurement StrictMode fix, same resize listener). `pointAngle`
  is the real angle in degrees (0=target directly right, 90=directly below, -90=directly above,
  ±180=directly left) from the mascot's own center to the target tile's own actual center.
- **`MascotIcon.jsx` now computes the arm's rotation and the body's lean directly from this real
  angle, in JS, rather than reading a fixed value off a CSS class**: `dx = cos(angle)`, `dy =
  sin(angle)` give the target's real unit direction; `mirrored = dx < 0` (the target is on the
  left half) decides which shoulder to draw the arm on, exactly as before; the LOCAL angle — always
  expressed as if the target were on the right, via `Math.atan2(dy, Math.abs(dx))`, so it always
  lands within ±90° of straight-right regardless of which real side the target is on — is what
  actually varies continuously between any two targets, even ones on the same side; the arm's
  neutral orientation (drawn pointing straight down, 90° in this convention) is rotated by `local
  angle - 90°` to swing precisely to that local angle; the body's own lean is `dx * MAX_LEAN_DEG`
  (10°), so a target further to the side leans the body more than one nearer to directly overhead
  or underfoot, rather than one fixed lean angle applied to every "left" or every "right" target
  alike. These computed degree values are applied via inline `style={{ transform: 'rotate(...)'
  }}` (React), not a CSS class — the class-driven `.mascot-pose.mascot-pointing.mascot-lean-left {
  transform: rotate(-9deg); }` / `.mascot-arm.mascot-arm-raised { transform: rotate(-115deg); }`
  rules from the original pass were removed entirely, since there's no longer a small fixed set of
  discrete poses to name with classes. The existing CSS `transition: transform ...` declarations on
  `.mascot-pose`/`.mascot-arm-mirror`/`.mascot-arm` needed no changes at all — a CSS transition
  animates between successive INLINE `transform` values exactly the same way it animates between
  class-driven ones, so the "start-pointing"/"end-pointing" smooth transitions from the original
  pass are completely unaffected by this fix.
- **Verified the underlying math is correct, not just "looks about right"**: for four real guided-
  sequence targets at four genuinely different real screen positions, the arm's own resolved
  rotation was checked against an INDEPENDENTLY computed expected value (calculated fresh from real
  `getBoundingClientRect()` data in the test itself, not by re-reading the app's own internal
  numbers) — all four matched to within numerical rounding. Two of the four targets happened to sit
  at near-mirror-image positions in this particular hub layout (`majors` and `programs`), which
  correctly produced the same LOCAL rotation magnitude — by design, since the whole point of the
  mirroring approach is reusing one rotation formula for either side — while still resolving to
  genuinely different REAL angles and opposite mirror directions, confirming the fix tracks true
  position rather than coincidentally repeating a shared value.
- Verified with a dedicated Playwright suite (25 checks total, extending the prior batch's own
  suite): a top-left target leans left (negative rotate) and mirrors the arm to the left shoulder;
  a top-right target leans right (positive rotate) and stays unmirrored; four distinct real targets
  each produce an arm rotation matching their own independently-computed real angle to within 1°;
  all four have genuinely different real `atan2` angles (not just two repeated "left"/"right"
  buckets); and both a mirrored and an unmirrored case are represented among them. The full
  pre-existing hub/mascot/voice suite (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`
  — updated in place to check for a real inline `rotate(...)` transform instead of the now-retired
  `mascot-lean-left`/`-right` classes, `test-hub-radial.js`, `test-hub-reset.js`,
  `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`,
  `test-signup.js`, and the general `test.js`) all still pass with zero regressions.

**Bug fix: the hub's own guided-sequence dialogue replayed its full line in every visit, for as
long as the current step stayed unfinished — it was never actually wired into the `mascotSeenKeys`
"seen once, ever" system Stage 5 already built and every OTHER screen's in-flow dialogue already
respects.** Confirmed directly before touching anything: seeding a fresh hub visit, leaving, and
returning without making any progress showed the byte-identical intro string both times, and
`state.mascotSeenKeys` stayed empty the whole time — `HubScreen.jsx`'s own `nextStepIntro` was
always just `nextStep.intro` (or `nextStep.intro(state)` for the one function-valued entry),
recomputed fresh from `GUIDED_SEQUENCE`/`getNextGuidedStep` on every render with no seen-tracking
of any kind, unlike `SurveyScreen`/`DiscoveryScreen`/etc., which all correctly use
`useMascotIntroThenRevisit`/`useMascotSeenSnapshot` already (confirmed those were NOT broken via
the same direct test, run against Discovery's own careers sub-step before assuming the bug was
universal — the intro/revisit split there already worked exactly as designed).
- **The fix reuses the EXACT same anti-flicker snapshot/mark-seen pair every other screen's
  dialogue already relies on** (`useMascotSeenSnapshot`/`useMarkMascotSeen`, `useMascotSeen.js` —
  no new mechanism invented), keyed per guided-sequence step id: `hub-guided-${nextStep.id}` — a
  deliberately namespaced key so it can never collide with an unrelated one, e.g. `YearOverview.jsx`'s
  own separate `'plan-intro'`/`'plan-revisit'` pair, even though the guided sequence's own endpoint
  step happens to share the literal id `'plan'` with the "Academic Plan" tile (see `ENDPOINT_STEP`).
  Once a given step's real line has been shown once, every later hub visit — for as long as that
  SAME step remains current — now shows one new shared, generic, freely-repeatable acknowledgment
  instead (`'hub-guided-revisit'`, a single new `mascotDialogue.js` entry: "Ready to keep going?
  Pick up where you left off.") rather than the original line again. This is the ONE genuinely new
  piece of dialogue content this fix adds — everything else (every real per-step intro line, every
  other screen's own intro/revisit text) is completely untouched, matching the fix's own explicit
  "purely about playback frequency, not rewriting content" scope; one small shared acknowledgment
  was necessary to implement the fix's own "a much lighter, brief generic acknowledgment" option
  without inventing 9 near-duplicate step-specific revisit lines for content that was only ever
  meant to be a light nudge, not a restatement.
- **The moment the guided step genuinely ADVANCES to a new one** (the survey completes, a career
  gets selected, etc.), that NEW step's own key hasn't been seen yet, so its own real line plays in
  full for the first time — confirmed directly: completing the survey and landing on the "careers"
  step shows careers' own real admissions-context line (not the generic acknowledgment), and only
  a SUBSEQUENT revisit to that same still-unfinished careers step falls back to the shared generic
  line. The voice track needed no separate fix at all — `useMascotSpeech` already speaks whatever
  `nextStepIntro` currently resolves to, so once the displayed text correctly becomes the shorter
  generic line on revisit, the spoken audio automatically follows it for free; there's no second,
  independently-tracked "have I spoken this before" concept to keep in sync.
- Verified with a dedicated Playwright suite (11 checks): a fresh hub visit shows a real line; a
  revisit to the same unfinished step never repeats it, showing the shared generic acknowledgment
  instead; a THIRD visit to that same step shows the identical shared acknowledgment again (not a
  new random variant — the generic line is itself meant to repeat freely, only the ORIGINAL line
  must never play twice); advancing to a new guided step shows that step's own real line for the
  first time, which then also correctly stops repeating on further revisits; and — confirming the
  fix generalizes, not just patches the one broken spot — Discovery's own careers sub-step and
  Opportunity Finder's own intro/revisit dialogue were independently re-checked and confirmed to
  already behave correctly (they were never broken, only the hub's own dialogue was). The full
  pre-existing hub/mascot/voice suite (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`,
  `test-hub-radial.js`, `test-hub-reset.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`,
  `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, `test.js`, and
  `test-mascot-wand-pointing.js`) all still pass with zero regressions.

**Bug fix: every OTHER screen's own "-revisit" dialogue line — not just the hub's — used to
repeat on every fresh re-entry to that screen, forever, per this file's own original Stage 5
design ("a matching -revisit key... freely repeats on every later visit"). That design turned out
to be observably wrong for a screen-specific revisit line, confirmed directly rather than
assumed.** Toggling a selection (a major, a program card) WITHOUT leaving the screen never
re-triggers anything — the resolved dialogue key stays frozen for the mount's own lifetime (see
`useMascotSeenSnapshot`'s own anti-flicker comment) — confirmed via Playwright: clicking through
several major/program selections in one continuous mount produced zero additional `speak()` calls
and zero text changes. But this app's own Return-to-Hub routing means Continue always routes back
to the hub, so "changing selections on Related College Majors multiple times" or "viewing multiple
program cards" in practice REQUIRES leaving and re-entering that screen through the hub to make
each further change — and a revisit line that replays on every fresh mount replays on nearly every
one of those round trips. Confirmed directly with a real hub round-trip loop (leave to hub, come
back to Related College Majors, four times): "More majors worth a look, based on what you've
picked so far." rendered identically on visits 1 through 4, never going quiet.
- **The fix gives a revisit line the exact same "shown once, ever" treatment an intro line
  already had, chained one step later** — `useMascotRevisitOnce(introAlreadySeen, revisitKey)`
  (`useMascotSeen.js`, new) reuses the same `useMascotSeenSnapshot`/`useMarkMascotSeen` anti-
  flicker primitives every intro line already relies on, just applied to the revisit key instead:
  the first-ever mount where the intro is already seen shows the revisit line once and marks it
  seen; every mount after that shows nothing. `useMascotIntroThenRevisit` (the shared convenience
  wrapper `DiscoveryScreen`/`OpportunityFinderScreen`/`YearOverview` already called) now calls
  this internally, so `discovery-careers-revisit`/`discovery-majors-revisit`/
  `discovery-programs-revisit`, `opportunities-revisit`, and `plan-revisit` all got the fix for
  free with zero changes to those 3 screens' own code. The hand-rolled call sites (screens with a
  real precondition beyond plain "have they seen the intro" — a dynamic intro-variant choice, or a
  revisit gated on extra state) were each updated individually to call the same new hook alongside
  their own existing intro logic: `TranscriptScreen.jsx`'s `transcript-revisit` (both the Roslyn
  and UC Davis variants — the dynamic `'transcript-empty'`-vs-`'transcript-intro'` intro choice is
  untouched, only what happens once whichever intro is already seen), `CourseSelectionScreen.jsx`'s
  `courseSelection-revisit` (both variants), `ProjectBuilderScreen.jsx`'s `projectBuilder-revisit`
  (gated on `pbIntroSeen && hasActiveProject` — a revisit line that only becomes eligible once a
  project is genuinely active now shows once total for that whole precondition's lifetime, not
  once per re-entry while it stays true), and `SurveyScreen.jsx`'s `survey-revisit` (previously
  deliberately excluded from `useMarkMascotSeen`, on the same "revisit lines repeat forever" logic
  this whole fix now replaces).
- **Two deliberate, unchanged exceptions, both already validated by their own explicit design
  rationale rather than being screen-specific "you're revisiting this exact content" lines**:
  `HubScreen.jsx`'s own `hub-guided-revisit` (a single SHARED generic acknowledgment reused across
  every different guided step — silencing it forever after its first use anywhere would break its
  whole purpose as a recurring light nudge across many distinct contexts; already explicitly
  validated to repeat freely in the prior fix's own test suite) and `courseSelection-checkpoint`
  (tied to a genuinely NEW, recurring structural event — a fresh checkpoint each future year of
  the plan — not "the same screen re-entered," and CLAUDE.md's own prior documentation already
  states it's "meant to repeat every time a checkpoint is reached," deliberately never marked
  seen). Neither was touched by this fix.
- **A real, confirmed test-harness race — not an app regression — surfaced while regression-
  testing this fix, the same race class already documented and fixed multiple times elsewhere in
  this codebase (`test-hub.js`'s own `seedAndGoto`, several UC Davis test files).** `useMascotRevisitOnce`
  introduces a genuinely NEW mount-time `patch()` call on screens that previously never marked a
  revisit key seen at all (TranscriptScreen, CourseSelectionScreen, OpportunityFinderScreen, ...) —
  a scratch Playwright suite (`test-stage5-mascot.js`) whose own `seed()` helper overwrote
  `localStorage` immediately after `page.goto()` with no settle delay let the PREVIOUS page's own
  in-flight mark-seen effect (from the still-live old mount, reading the REAL, not-yet-overwritten
  localStorage) fire and re-persist a stale marking after the test's own fresh seed — 3 checks
  failed until a 150ms settle delay was added to that helper, after which they passed
  deterministically (confirmed directly: removing the delay reproduced the failure on every run;
  adding it back fixed it on every run, ruling out flakiness). Fixed at the test-harness level
  only, matching this codebase's own established precedent for this exact race class — not in the
  app itself, since the app's own behavior (marking a genuinely-just-shown revisit line seen) is
  correct.
- Verified with a dedicated 22-check Playwright suite covering every screen with a real
  screen-specific revisit line (Discovery's careers/majors/programs, Opportunity Finder,
  Transcript & GPA, Course Selection, Project Builder, Survey, and Academic Plan Map 1/
  YearOverview) via real hub round-trips (not same-mount interaction, which never repeated to
  begin with) — each shows its real revisit line exactly once, then nothing on every later
  re-entry — plus a dedicated regression check confirming the hub's own `hub-guided-revisit` is
  still deliberately exempt and continues to repeat freely across multiple hub revisits, unchanged
  from the prior fix. The prior fix's own 11-check suite and the full pre-existing hub/mascot/voice
  suite (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`, `test-hub-radial.js`,
  `test-hub-reset.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`,
  `test-voice-picker.js`, `test-signup.js`, `test.js`, and `test-mascot-wand-pointing.js`) all
  still pass with zero regressions.

**Palette repaint, Discovery batch — Survey (interests/grade/school) and Discovery (Careers of
Interest / Related College Majors / Recommended Programs) move onto the shared "bloom" tokens too,
plus genuine new visual interest beyond a plain color swap: colored category icon chips, a
bouncy tag-selection animation, and a shared track-badge/track-icon system for career/major cards.**
`App.jsx`'s `isBloomScreen` now also covers `screenKey === 'survey' || screenKey === 'discovery'`
(all 3 Discovery sub-steps share one screenKey) — same `.app-shell-bloom` scoping precedent as
Welcome/Sign-Up, so Opportunity Finder/Course Selection/Project Builder/Program Summary (not yet
repainted) stay completely unaffected. Because several of this batch's own overrides need to win a
same-specificity tie against the pre-existing "Global interaction polish" section's own rules on
the identical selectors (`.tag.selected`'s `animation`, `.card.selected::after`'s `background`),
this batch's entire CSS block is deliberately placed at the very END of `global.css` — CSS
resolves an exact specificity tie by SOURCE ORDER, so appending last is what lets these rules win
without needing `!important` anywhere; `.polish`'s own `prefers-reduced-motion` block (which
already disables `.tag.selected`/`.card.selected` animations via `!important`) transitively covers
this batch's own new keyframes too, for free, since they're set on the exact same selectors.
- **Task 1, Survey — category icon chips.** `interests.js`'s `CATEGORIES` array gained an `icon`
  field per category (a lucide-react icon NAME string — `'Dumbbell'`, `'GraduationCap'`, etc. —
  matching this codebase's standing "data holds icon NAMES, the screen owns the name->component
  map" convention already established by `ProjectBuilderScreen`'s `CATEGORY_ICONS`/Sign-Up's
  `AVATAR_OPTIONS`). `SurveyScreen.jsx` owns the actual `CATEGORY_ICON_MAP` lookup plus
  `CATEGORY_COLORS`, a cycling array of the same 7-color "bloom" accent palette the hub's own
  `TILE_ACCENTS`/Sign-Up's avatar colors already use (9 categories against 7 colors means the last
  2 categories deliberately repeat an earlier color — same "cycle, don't invent extra colors"
  precedent `TILE_ACCENTS` already set for the hub's own 10 tiles). Both the category header
  (`.tag-category-icon`, a small colored icon box next to the label) and every individual tag chip
  inside it (`.tag-icon`, the same icon at a smaller size) read the category's own accent via an
  inline `--tag-accent` custom property set once per category — the same "data/JSX picks the
  value, CSS just reads a custom property" convention this codebase already uses everywhere else
  a small fixed palette gets cycled.
- **Task 1's own "satisfying selection animation — a quick pop/bounce and color-fill, not just a
  static border change"**: `.app-shell-bloom .tag.selected` gets a NEW, bouncier keyframe
  (`bloom-tag-pop`, an overshoot-and-settle scale via `cubic-bezier(0.34, 1.56, 0.64, 1)`) layered
  on top of the color-fill (background/border-color transitioning to the category's own
  `--tag-accent`, which `.tag`'s own pre-existing `transition: all .12s ease` already animates
  smoothly) — both fire together the instant `.selected` is added, with zero extra JS state:
  adding a class with an associated CSS animation is what starts it, and toggling the tag back off
  and on again naturally replays it, since the element stops matching `.tag.selected` in between.
  This REPLACES (doesn't merely supplement) the plain `.polish .tag.selected { animation:
  select-pulse 260ms ease; }` pulse for these two screens specifically — that generic, milder pulse
  still applies everywhere else `.tag` is used (Opportunity Finder's track filter, etc.).
- **Task 1, repainted grade/school pills**: `.pill`/`.pill-group` (shared with several
  not-yet-repainted screens' own pill pickers) and `SchoolSearchField`'s own `.school-search-input`
  got straightforward `.app-shell-bloom`-scoped color overrides — no new visual richness needed
  here beyond matching the palette, since a plain pill selector doesn't have the same "wall of
  text" problem the category tags/career cards do.
- **Task 2 — the shared `TrackBadge`/`TrackIcon` components** (`src/components/TrackVisuals.jsx`,
  new file) replace the plain-text `.career-group-label` with a colored pill (icon + track name,
  `TrackBadge`) for CareersStep's own group headers and MajorsStep's Browse-mode grouped headers,
  plus a small colored icon box (`TrackIcon`) on every individual career/major card so a dense grid
  of text-heavy cards reads as visually distinct by subject area at a glance — directly satisfying
  Task 2's own "add small illustrative icons... e.g., a distinct icon per career type or subject
  area" example. `interests.js` gained a parallel `TRACK_ICON_NAMES` map (one icon name per
  OPPORTUNITY_TRACKS entry, same "data holds names" convention as the category icons above);
  `TrackVisuals.jsx` owns the name->component lookup and cycles the identical 7-color palette by
  each track's own position in `TRACK_LABELS`' key order, so a track always resolves to the same
  color everywhere it's shown, not per-call-site-arbitrary. Deliberately a NEW component/class
  pair, not a restyle of `.career-group-label` in place — that class is also used by
  CourseSelectionScreen's own program-recommendation sections (grouped by major/program-type, not
  track, and not part of this repaint batch), so changing its default rendering would have leaked
  into a screen this batch never touched.
- **MajorsStep's Recommended (flat, ungrouped) mode gets a TrackIcon too, not just Browse mode** —
  a real, deliberate extension, not an oversight. A `major` object (`majors.js`) carries no `track`
  field of its own, so without extra plumbing, only Browse mode (which already groups by track via
  `getMajorGroups`) could show one. `DiscoveryScreen.jsx` now derives `majorTrackMap` (a plain `{
  majorId: track }` lookup) once from its own pre-existing `allMajorGroups`, reusing the EXACT
  "first track that references it" resolution `getMajorGroups` already applies for Browse mode —
  not a second, possibly-drifting copy of that logic — and passes it to `MajorsStep` as a new prop,
  read only when a group's own `track` isn't already known directly (grouped mode still uses
  `group.track`, unchanged).
- **ProgramsStep is deliberately NOT given per-card track icons** — it's grouped by MAJOR (Browse)
  or fully merged/ungrouped (Recommended), neither of which maps cleanly to one subject-area track
  the way a career or major already does; forcing a track icon here would mean guessing, which
  this codebase's own standing "don't guess" rule already forbids elsewhere. Its cards still get
  the full palette repaint (background/border/shadow/hover) and its own group-by-major header
  (Browse mode) is recolored to the accent green, just without an icon.
- **A real, confirmed UX bug was found and fixed while building the per-card TrackIcon/hover
  system**: the first pass gave every unselected card's HOVER border the same fixed
  `--bloom-accent` green `.card.selected` already used for its own border — confirmed directly via
  screenshot that a hovered-but-unselected card and a genuinely selected one looked nearly
  identical in a still frame (both green-bordered, differing only in the small corner checkmark).
  Fixed by also setting `--track-accent` (the same value `TrackIcon` already computes via
  `getTrackColor()`) on the outer `.card` button itself in CareersStep/MajorsStep, and changing the
  hover rule to `border-color: var(--track-accent, var(--bloom-accent))` — an unselected card's
  hover now shows its OWN subject-area color (e.g. blue for a Sports card, purple for Business),
  while `.card.selected` keeps a fixed, universal green border + checkmark badge as the single
  unambiguous "this is picked" signal, distinct from the now-per-track hover highlight. Falls back
  to the plain accent for ProgramsStep's cards, which have no per-card track color to read.
- **Task 2's own explicit "keep Reach/Match/Safety and GPA benchmarks functioning exactly as they
  currently do — visual pass only, no logic changes" — verified, not just asserted.**
  `reachMatchSafetyTag`/`gpaBenchmarkText`/`selectProgramsForGpa` (`programs.js`) were not touched
  at all; only the 3 RMS badges' colors moved to the palette (`rms-safety`→green, `rms-match`→
  yellow with a corrected dark-ink text color since the old fixed white text was illegible against
  the new, lighter yellow, `rms-reach`→orange). A dedicated Playwright check confirms real
  Reach/Match/Safety text still renders from the unmodified scoring function, the "Typical GPA"
  benchmark line still renders, and selecting a program still writes the correct
  `${institution}::${program}` key to `state.selectedProgramKeys`.
- **Task 2's "hover-lift... enhance"** reuses the already-defined `--bloom-shadow-hover` token (the
  same deliberately-deep shadow the hub's own tiles use) for a card's hover state, and
  `--bloom-shadow` for its resting elevation — both replace the old flat, ink-tinted shadow values,
  landing as a genuine depth increase without inventing a new shadow value from scratch.
  `.polish`'s own card rounding/resting-shadow-existence, press-scale feedback, staggered
  entrance (`.polish .grid > *:nth-child(N)`), and selection-pulse+checkmark mechanics are all
  completely untouched — Survey/Discovery already received `.polish` before this batch (unchanged
  from `isBloomScreen`'s own addition), so all of that "already exists, keep it" per Task 2's own
  instruction with zero extra code.
- Verified after this pass: a dedicated Playwright suite (14 checks) confirms all 9 survey
  category icon boxes render with more than one distinct color, selecting a tag both fills it with
  color AND plays a real, measurable scale animation that settles back to neutral (and is fully
  disabled under `prefers-reduced-motion`), multiple track badges/per-card track icons render on
  Careers of Interest, a hovered-but-unselected card's border is confirmed to differ from a
  selected card's border color, Programs' real Reach/Match/Safety badges and GPA benchmark text
  still render correctly and selecting a program still writes the real state key, and — critically
  — Opportunity Finder (not part of this batch) still resolves to the exact old parchment
  background/button color, confirming zero leakage. The full pre-existing regression suite
  (`test.js`, every `test-hub*.js`, `test-signup.js`, `test-return-to-hub.js`,
  `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`) still passes unmodified.

**Palette repaint, Transcript/Course Selection batch — Transcript & GPA and Course Selection
(both Roslyn and UC Davis variants) move onto the shared "bloom" tokens, reusing Batch 1's own
subject/track colors rather than inventing a second color mapping, plus a GPA count-up animation,
a real report-card visual treatment, per-course track icons, and real credit-progress bars.**
`App.jsx`'s `isBloomScreen` now also covers `screenKey === 'transcript' || screenKey ===
'courseSelection'` — same `.app-shell-bloom` scoping precedent as the two batches before it, so
Opportunity Finder/Project Builder/Program Summary (still not repainted) stay unaffected.
- **`src/data/courseTrackMap.js`** (new file) is the one place Roslyn's 11 real course departments
  (courses.js) and UC Davis's 6 real subject areas (`UCDAVIS_AREAS`, ucdavisCourses.js) map onto a
  TRACK — and therefore onto the exact color `getTrackColor` (TrackVisuals.jsx, Batch 1) already
  resolves for that track, satisfying this batch's own explicit "reuse the same colors established
  in Batch 1's survey interest tags" instruction directly (e.g. `Math` courses get the identical
  color the `Mathematics` interest tag already has, since both route through the `stem` track).
  `DEPARTMENT_TRACK_MAP`/`UCDAVIS_AREA_TRACK_MAP` and their `getDepartmentColor`/
  `getUCDavisAreaColor` helpers are the only new mapping — no new colors were invented. **Special
  Education is deliberately left OUT of `DEPARTMENT_TRACK_MAP`** (its IEP-driven courses aren't
  tied to any one subject/interest area) — `getDepartmentColor` returns `null` for it, and every
  consumer falls back to a neutral, uncolored treatment via CSS's own `var(--course-accent,
  ...)` default, rather than forcing an invented mapping onto data that doesn't honestly support
  one, the same "don't guess" posture this app's data layer already holds everywhere else.
- **`src/hooks/useCountUp.js`** (new file) is Task 1's own "a satisfying animation when the GPA
  numbers calculate/update — a count-up effect... rather than an instant static update," shared by
  a new `GpaBox` component (`TranscriptScreen.jsx`) used by all 4 GPA summary boxes (Roslyn's 3,
  UC Davis's 1). Purely a display wrapper — the real GPA value (`calculateUnweightedGpa`/
  `calculateWeightedGpa`/`calculate4ScaleGpa`/`calculateUCDavisGpa`, none of which this pass
  touches) is passed straight in; the hook only decides what number to show on any given animation
  frame while transitioning toward it, easing from the PREVIOUSLY shown value to the new one
  (ease-out cubic, ~700ms). The very first value a student ever sees (an empty transcript's own
  "—" turning into a real number for the first time) intentionally does NOT animate — there's no
  meaningful "count up from nothing." A real, deliberate correctness fix during development: the
  hook tracks whatever's CURRENTLY on screen (a ref updated every animation frame), not just the
  value an animation started FROM — without this, two GPA-changing edits made in quick succession
  (before the first count-up finished) would visibly jump back to the first edit's own start point
  before counting up again, instead of smoothly continuing from wherever the display actually sat
  at that moment. Verified directly (not just read): adding a second transcript course while the
  page stays mounted shows the GPA value pass through multiple distinct intermediate numbers
  before settling, confirmed via repeated `textContent` sampling over the animation's own real
  duration.
- **The transcript table itself gets the "actual transcript/report-card metaphor" Task 1 asked
  for** — a real card frame (background/border/radius/shadow, the same `--bloom-shadow` token
  every other repainted card already uses) instead of a bare `<table>` floating on the page
  background, plus a colored left-edge stripe per row (`--course-accent`, set inline per entry via
  `getDepartmentColor`/`getUCDavisAreaColor`) and a per-row entrance animation
  (`transcript-row-reveal`) that plays only once, the moment a row is genuinely NEW (a fresh
  transcript entry gets a new `key`/DOM node; existing rows aren't remounted when a sibling is
  added or removed, so they never replay it) — satisfying "a nice reveal animation as each course
  is added" with zero extra JS state, the same "new key = new DOM node = animation naturally
  replays only for genuinely new items" pattern this whole repaint series already established
  elsewhere (the hub's own tile pop-in, Course Selection's own section reveal below).
- **Course cards (both `CourseCard`/Roslyn and `UCDavisCourseCard`) gained a small colored
  `TrackIcon`** (Batch 1's own shared component, TrackVisuals.jsx — reused directly, not
  duplicated) atop each card, resolved through the same department/area->track mapping the
  transcript table uses, satisfying Task 2's "color-code course cards by subject/department" with
  the identical visual language Discovery's own career/major cards already established. The course
  detail modal's own eyebrow line (previously a hardcoded `var(--teal)`, an inline style that no
  CSS class override could ever beat) was updated to read the SAME resolved track color directly,
  so opening a course's modal shows its eyebrow in the exact color its card icon already used.
- **Task 2's own "a credit-progress bar per subject area... where that makes sense"** replaces
  ONLY the "Subject Minimums" policy card's plain bullet list (`SUBJECT_CREDIT_REQUIREMENTS`,
  CourseSelectionScreen.jsx) — the one POLICY_SECTIONS entry that's actually a measurable progress
  toward a real number, unlike the other 6 cards' plain facts (graduation requirements, diploma
  types, etc., all left untouched as plain lists). `creditsEarnedFor()` sums real
  `course.credit` values (courses.js) across `state.transcript` for whichever department(s) map to
  each subject bucket — genuinely new, additive derived data, not a change to any existing
  GPA/prerequisite function. PE and Health are deliberately combined into one "PE/Health" bucket
  (2 + 0.5 = 2.5 credits) since both are graded under the exact same real `course.department`
  value in courses.js — splitting them would mean fabricating a distinction the catalog data
  doesn't actually support. Electives (3.5 credits) and the Advanced-Regents-specific variations
  are left as a plain text note below the bars, not forced into a bar of their own, since
  "elective" isn't tied to any one department and there's no honest way to measure progress
  toward it from a transcript entry's own department field. The bar itself is a plain CSS
  track+fill div, no chart library — matching this app's existing "simple CSS shapes over
  dependencies" posture (the hub's own conic-gradient progress ring, etc.).
- **Task 2's "smooth expand/reveal animation... when they appear" for Program-Specific Course
  Recommendations and School-Specific Requirements** — a NEW `program-rec-group` class (alongside
  the existing shared `career-group`) is what this animation hooks into, deliberately NOT a
  bloom-scoped restyle of bare `.career-group` itself, since that class is also shared with
  Discovery's own career/major/program groups (Batch 1), which already have their own different
  entrance treatment (the `.polish`-driven staggered CARD reveal, not a group-wrapper-level one)
  and shouldn't gain a second, redundant animation here. `.school-req-card` needed no new class,
  since it's already exclusive to this one section. Both plays once per section, the moment it's
  actually mounted — a newly-eligible program type or a newly-selected school+program key gets a
  fresh key/DOM node; an already-shown one isn't remounted when a sibling is added, so it never
  replays this.
- **Task 2's own explicit "no functional changes" — verified, not just asserted.**
  `checkPrerequisite` (utils/prerequisites.js), `getSelectedProgramTypes`/`getProgramTypeCourses`
  (programRecommendations.js), and `getSchoolRequirement` (schoolRequirements.js) were not touched
  at all. The pre-existing Course Selection Stage 4 Playwright suite (`test-stage4.js` — real
  prerequisite locking/unlocking through a genuine checkpoint Part 1 → Part 2 flow,
  `test-roslyn-consolidation.js` — the one-task-per-cycle consolidation behavior) was re-run
  against the repainted screen and passes unmodified, confirming the checkpoint mechanism,
  prerequisite gating, and course-request consolidation all still work exactly as before. A
  dedicated new check also confirms the real, previously-verified Cornell Communication
  School-Specific Requirement still renders its exact real text (citing "Introductory Biology")
  inside the newly-animated card, and that a credit-progress bar reflects a REAL transcript entry's
  credit value, not a static/fake number.
- **A real, confirmed pre-existing test-suite bug was found and fixed while regression-testing
  this batch, unrelated to this pass's own changes**: `test-transcript-skip-unlock.js`,
  `test-ucdavis-transcript-skip-unlock.js`, and part of `test-ucdavis.js` still referenced the hub
  tile's own OLD `.card-title` selector from before the hub's radial-layout pass renamed it to
  `.hub-tile-title` (see that pass's own CLAUDE.md section) — these three files were missed during
  that earlier rename's own test-suite cleanup. Fixed the same way that pass already fixed several
  other test files, leaving every OTHER, correctly-scoped `.card-title` reference in these same
  files untouched (Discovery/Opportunity Finder cards still legitimately use that class — only hub
  tiles were ever renamed).
- Verified after this pass: a dedicated Playwright suite (12 checks) confirms a Math transcript
  row's own accent color is byte-for-byte the same `--bloom-yellow` token the Survey's
  "Mathematics" tag/stem track already resolves to (not just visually similar), a Business row
  shows a genuinely different color, the transcript table has a real card frame, the GPA count-up
  passes through multiple distinct intermediate values before settling, a Math course card's own
  `TrackIcon` uses that identical yellow too, real transcript-derived credit-progress numbers are
  honest (0 for a subject with no courses taken, the real credit total for one that has), the
  Program-Specific section's reveal animation is real, and the verified School-Specific
  requirement's actual text is unchanged. The full pre-existing regression suite — including the
  UC Davis Course Selection Stage 2/3/4 suites and the general `test.js`/`test-hub*.js`/
  `test-signup.js` suites — still passes.

**Palette repaint, Opportunity Finder/Project Builder batch — the fourth in this series.
Opportunity Finder and Project Builder move onto the shared "bloom" tokens, reusing Batch 1's own
per-track colors for opportunity cards, a distinct verified-badge treatment for My School, a real
step-by-step timeline for a started Project Builder project, and nicer (still non-functional)
Community Project Examples cards.** `App.jsx`'s `isBloomScreen` now also covers `screenKey ===
'opportunities' || screenKey === 'projectBuilder'` — same `.app-shell-bloom` scoping precedent as
the three batches before it, so Program Summary (the only screen left unpainted now) stays
unaffected.
- **`opportunities.js`'s `getOpportunityPool`/`getSchoolOpportunities` now tag every resolved
  opportunity with `_track`** — the track it was actually found under (first-track-wins for
  anything shared across multiple tracks' arrays, same convention `getMajorGroups` already uses)
  — a purely additive, display-only field added at the point of RESOLUTION rather than editing any
  of the ~6793 lines of real opportunity data itself. `OpportunityFinderScreen.jsx` reads
  `opp._track` to render a small `TrackIcon` (TrackVisuals.jsx, Batch 1 — reused directly, not
  duplicated) and set `--track-accent` inline, satisfying Task 1's own "color-code opportunity
  cards by interest/type, using the established color mapping" with the exact same per-track color
  Survey/Discovery/Course Selection already resolve for that track — confirmed directly: a
  Sports-track opportunity's `--track-accent` is byte-for-byte the same `--bloom-blue` token the
  Survey's "Basketball" tag/sports track already resolves to. Opportunities with no real track
  (the generic fallback list, or an unmapped My School affinity club) simply render no icon and
  fall back to a neutral card — same "don't force a fit" posture this codebase's data layer
  already holds everywhere else.
- **Task 1's own "give the My School tab a distinct visual treatment... so real, verified
  content feels special/trustworthy" is two changes, not one**: the existing `.school-verified-
  badge` (previously plain colored text) is now a solid filled pill (white text on
  `--bloom-accent`, with a `BadgeCheck` icon), and every verified card additionally gets a 4px
  `--bloom-accent` left border — reusing the exact same "green edge = independently verified"
  visual language this app already established elsewhere (a selected card's own checkmark, a
  verified School-Specific Requirement's own left border in Course Selection) rather than
  inventing a third way to signal "verified."
- **Task 1's own "satisfying selection animation... a pop/checkmark animation" needed no new
  code at all** — `.polish`'s pre-existing `select-pulse`/`check-pop` animations (a brief scale
  pulse plus a checkmark badge that pops in via `cubic-bezier` overshoot) already apply to any
  `.card.selected`, Opportunity Finder's cards included; this batch's own bloom override
  (`.card.selected::after { background: var(--bloom-accent); }`) already existed from an earlier
  batch and just recolors that same checkmark to the new palette. Verified directly via
  screenshot, not assumed.
- **A real, confirmed CSS specificity bug was found and fixed while building this — and it
  turned out to be a LATENT bug already present since Batch 1/2, not something newly introduced
  here.** Hovering an already-SELECTED card (e.g. right after clicking it, since the pointer is
  still resting on it) showed the card's own track-color border instead of the universal
  selected-green, because `button.card:hover { border-color: var(--track-accent, ...); }` (element
  + class + pseudo-class specificity) is MORE specific than `.card.selected { border-color:
  var(--bloom-accent); }` (two classes) and so won the simultaneous hover+selected state — caught
  via screenshot, not code review: a just-clicked Sports opportunity card rendered with a visibly
  blue border instead of green, checkmark badge notwithstanding. Traced to the ROOT cause — the
  general `.app-shell.app-shell-bloom button.card:hover` rule from the Discovery/Course-Selection
  batches, which had never carried a `:not(.selected)` exclusion — and fixed there directly
  (`button.card:hover:not(.selected):not(.passed)`), rather than only patching Opportunity
  Finder's own downstream call site, so the fix closes the bug for every `.card`-based screen at
  once (Discovery's career/major cards included, which had silently carried this exact bug the
  whole time without it ever being caught, since no earlier batch's own testing checked hover and
  selected simultaneously). The identical latent issue in Course Selection's own `.course-
  card:hover` rule was fixed the same way — that rule is now removed entirely as a redundant
  duplicate, since `.course-card` also carries the plain `.card` class and the shared root-level
  fix already covers it.
- **Task 1's own "keep the disabled state clearly distinguishable (greyed out, not colorful)"**
  — `.card.passed` (and `button.card.passed:hover`) always forces the neutral `--bloom-card-
  border` and drops any box-shadow/transform, regardless of its own `--track-accent` — a passed
  card's border never reads a track color, at rest or on hover, so "can't select this" still
  reads unambiguously even with per-track coloring now in play elsewhere on the same grid.
- **Task 2's own "give each of the 6 project categories a distinct color and icon"** —
  `ProjectBuilderScreen.jsx`'s `CATEGORY_COLORS` is now 6 of the 7 bloom accent tokens (purple,
  yellow, teal, orange, pink, blue), plain index-cycled via a new shared `getCategoryColor(id)`
  helper so the SAME category shows the SAME color everywhere it appears (the category grid, that
  category's own detail page's icon badge, and a project type's own detail page chip — the latter
  two previously both hardcoded a flat `var(--teal)` regardless of which category was open).
  `--bloom-green` is deliberately excluded from this set — that's the one color already reserved
  app-wide as the universal "selected/verified" signal, so keeping it out of the per-category
  identity avoids a category's own resting color ever being confused with that meaning. Icons
  themselves (`CATEGORY_ICONS`) were already 6 genuinely distinct lucide icons before this batch —
  no changes needed there.
- **Task 2's own "satisfying transition animation each time a new step is revealed" is a
  purely visual, read-only addition — the actual reveal MECHANIC (`Roadmap.jsx`'s `toggleDone`,
  explicitly out of this repaint's scope per this file's own standing rule) was not touched at
  all.** The old single-line "Current step: X (due Y)" text is replaced with a real `<ol
  className="pb-timeline">` rendering EVERY entry in `startedProject.steps` (not just the current
  one), reading the exact same `state.completedNodes[step.id]` that mechanic already writes to
  decide each step's `done`/`current` class — no new completion concept, no new state field.
  Every step renders as its own `<li key={step.id}>`, so a step that's genuinely NEW (appended by
  that mechanic since the last render) mounts as a new DOM node and its `pb-timeline-step-in`
  entrance animation plays automatically — the same "new key = new node = the CSS entrance
  animation just replays" pattern this whole repaint series already uses everywhere else (hub tile
  pop-in, transcript row reveal, Program-Specific section reveal) — zero extra JS state needed to
  detect "which step is new." The completed-step icon swap (`Circle` -> `CheckCircle2`) gets its
  own pop-in for the same reason Roadmap.jsx's own node-icon-pop already documents: swapping to a
  different icon COMPONENT means React unmounts/remounts a genuinely new SVG element at that
  position, so the pop plays the instant a step is actually marked done, with no extra state
  either. The current (only incomplete) step additionally gets a slow, continuous pulse
  (`prefers-reduced-motion`-safe) and its due date rendered in the category's accent-adjacent
  orange, so it reads as "this is what's next" at a glance rather than requiring the reader to
  scan for the one step without a checkmark.
- **Task 2's own "simple avatar-style icons... a nicer like-count display" for Community
  Project Examples — still explicitly non-functional, per this file's own standing "no real
  submission/comment/like system" constraint.** The plain grey-circle initial avatar is now a
  colored circle (`--avatar-accent`, a small fixed `AVATAR_COLORS` set cycled by the post's own
  index within its category — deliberately NOT the category's own single accent color, so the two
  posts in one category still read as two distinct "people" rather than both wearing one color).
  The like count moved from bare `<Heart/> N` text into a small filled `.pb-like-pill` — still a
  plain, non-clickable `<span>`, not a button, and `likes` is still the exact same fixed display
  number from `data/projects.js`, never a real counter. Verified directly: every community card is
  still a plain `<div>` (not a button), the like pill has no click handler, and nothing about the
  submission-flow-doesn't-exist contract changed.
- Verified after this pass: a dedicated Playwright suite (20 checks) confirms a Sports-track
  opportunity card's `--track-accent` is the same `--bloom-blue` token Survey/Discovery already
  use, a just-clicked (still-hovered) card's border resolves to the universal bloom-accent green
  (not its track color — the hover/selected bug fix), a passed/disabled card's border stays the
  neutral card-border color even on hover, every My School card carries the verified badge/left
  border, opportunity selection add/remove still writes real ids to `state.selectedOpportunityIds`
  unchanged, all 6 Project Builder category colors are genuinely distinct AND consistently reused
  across the category grid/category detail/project-type detail, Community Example cards remain
  plain non-interactive divs with a non-clickable like pill, and a started project's timeline
  renders exactly one node per real step with the correct done/current classes and never more than
  one incomplete step at a time. The full pre-existing regression suite — `test.js`, every
  `test-hub*.js`, `test-signup.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`,
  `test-voiceover.js`, `test-voice-picker.js`, `test-bloom-repaint.js`, `test-discovery-repaint.js`,
  `test-transcript-courseselection-repaint.js`, `test-stage4.js`, `test-roslyn-consolidation.js`,
  `test-transcript-skip-unlock.js`, `test-ucdavis-transcript-skip-unlock.js`, and the full UC Davis
  suite — still passes; three of those files (`test-bloom-repaint.js`, `test-discovery-repaint.js`,
  `test-transcript-courseselection-repaint.js`) had their own stale "Opportunity Finder is not yet
  repainted" assertion retargeted to Program Summary (the screen that assertion actually describes
  now), the same "update a pre-existing test after an intentional, expected change" pattern this
  codebase's own test suite has needed before, not a regression in the app itself.

**Palette repaint, Academic Plan batch — the fifth in this series, and the only one that touches
Roadmap.jsx (Map 2)/YearOverview.jsx (Map 1) directly rather than a screen scoped under
`.app-shell-bloom`.** This pass is a strict style-layer overlay, same boundary the Academic Plan's
earlier animation/visual-polish pass already established: `roadmapLayout.js` (the date-to-y
mapping, `PIXELS_PER_DAY`/`MIN_SPINE_GAP`, the branch-slope/collision math) was not opened at all
during this pass, and `npm run verify:spacing`'s 18/18 checks were re-confirmed passing both
before and after every change here, byte-for-byte identical to the pre-batch baseline — the one
thing this batch is NOT allowed to move, and didn't.
- **Map 2 (`Roadmap.jsx`) never carries `.app-shell-bloom`** — it only ever gets `.app-shell-plan`
  (App.jsx's `isPlanDetail` branch), a separate full-bleed system that predates this whole repaint
  series. So unlike every other batch, this one can't lean on the shared `.app-shell.app-shell-
  bloom X` scoping convention for Map 2's own classes at all — instead, every class Roadmap.jsx
  owns exclusively (`.bar-fill`, `.progress-num`, `.roadmap-callout-icon`/`-arrow`, `.roadmap-
  panel-icon-badge`, `.complete-btn.todo`, `.step-chain-progress`, `.win-banner`, `.node-badge:
  hover .node-pop`'s glow) was recolored by editing its BASE rule directly — safe specifically
  because grep confirmed none of these classes are used by any other screen, the same "exclusive
  class, edit in place" precedent the very first Welcome/Sign-Up batch already established (as
  opposed to the newer "scope everything under `.app-shell-bloom` regardless" habit later batches
  drifted toward, which isn't even an option here since Map 2 never carries that class). Two
  classes — `.remove-btn` and `.modal-edit-date` — turned out to be genuinely SHARED with
  TranscriptScreen's own transcript-entry rows (already bloom-repainted in an earlier batch), so
  recoloring their base rule would have leaked into that already-shipped screen; those two instead
  got a `.roadmap-fullscreen-root`-scoped override (Roadmap.jsx's own outer wrapper div, which no
  other screen ever renders) — the same "scope it so it provably can't leak" discipline every
  other batch already follows, just anchored to this component's own wrapper class instead of
  `.app-shell-bloom` since that class was never an option here.
- **Map 1 (`YearOverview.jsx`) is the opposite case — a normal, non-full-bleed screen** (unlike
  Map 2), so it WAS added to `isBloomScreen` (`App.jsx`, a new `isMap1 = screenKey === 'plan' &&
  state.planYearIndex === null` alongside the existing screenKey list) — giving it the exact same
  `.app-shell-bloom` treatment (background/ink/brand/header icons/`.btn-ghost`/`.btn-outline`/
  `p.page-sub`, all already-existing generic overrides from earlier batches) every other repainted
  screen already gets, for free. Its own exclusive `.year-overview-*` classes got a
  `.app-shell.app-shell-bloom .year-overview-*` scoped override block (appended at the very end of
  `global.css`, matching this whole series' "append last so same-specificity ties resolve by
  source order" convention) — consistent with the NEWER scoping habit (Project Builder's `.pb-*`,
  Course Selection's `.course-*`), even though these classes are technically exclusive enough to
  have been edited directly too; scoping them keeps every batch's own overrides organized under
  one clearly-labeled section rather than mixing conventions arbitrarily.
- **Task 1 (ring/node colors) preserves every existing color RELATIONSHIP 1:1, just remapped onto
  bloom tokens — it does not collapse the sub-type variety into one flat "Required" color.**
  `CORE_TYPE_CONFIG`'s per-coreType colors (today/major/final/milestone/procedure/the 4
  course-selection types) already varied under the OLD palette (gold/teal/rust/stone) despite the
  legend showing one representative swatch for "Required" — that was already true before this
  batch, not something this pass introduced. The exact old hex-to-role mapping carries over:
  today+major (old `#C98A2B` gold) -> `var(--bloom-yellow)`; milestone + every course-request/
  checkpoint/ucdavis-enrollment/checkpoint type (old `#2E6E5E` teal) -> `var(--bloom-teal)`; final
  + the branch-deadline step (old `#A6491F` rust) -> `var(--bloom-orange)`; procedure/the generic
  opportunity-fallback/branch-step-fallback/custom/project (old `#6E7F87` stone or the custom
  task's own near-identical `#4B5D54`) -> `var(--bloom-ink-soft)`. The 4 legend swatches (Required/
  Optional/Custom/You are here) were recolored the same way: `var(--bloom-accent)` (green)/
  `var(--bloom-teal)`/`var(--bloom-ink-soft)`/`var(--bloom-yellow)` respectively — same "one
  representative dot, not every real per-type hue" precedent the legend already had. The spine's
  own solid connector line (today through every required core item) moved from `var(--teal)` to
  `var(--bloom-accent)`, matching the Required legend swatch's own new color, same relationship as
  before.
- **Task 2 — opportunity chains are now colored MEANINGFULLY by interest track, not just
  decoratively, reusing Batch 1's exact color mapping (no second color system invented).**
  `roadmapGenerator.js`'s `buildFirstYearChain`/`buildEscalationChain` now set a purely additive
  `track: opp._track || null` field on an opportunity's anchor AND on every one of its steps
  (`opp._track` is the SAME field `opportunities.js`'s `getOpportunityPool`/`getSchoolOpportunities`
  already tag opportunities with, added in the immediately-prior Opportunity Finder/Project Builder
  batch — this pass just reads a field that already existed rather than inventing a new one).
  Setting `track` on every step (not just the anchor) is what lets a DECA/FBLA (Business) chain's
  entire branch — every prep step's ring, the final deadline step, AND the diagonal connector line
  itself — resolve to the identical Business color, not just its starting point. `Roadmap.jsx`'s
  `configFor(node)` was restructured from a plain lookup-table return into a function that computes
  the base cfg first (unchanged label/Icon logic) and then, only if `node.track` is set, overrides
  `color` via `getTrackColor(node.track)` (`TrackVisuals.jsx`, unmodified, the exact same helper
  Survey/Discovery/Course Selection/Opportunity Finder already call) — confirmed directly via
  Playwright: a DECA (Business) chain's anchor ring, every prep step, and its own connector line all
  resolve to `var(--bloom-purple)`, while a Science Olympiad (STEM) chain on the SAME roadmap
  resolves to a genuinely different `var(--bloom-yellow)`, and the two never collide. A generic/
  unmapped opportunity (no real track — e.g. the "Law" fallback list) simply has no `track` field
  and falls through to the plain `var(--bloom-ink-soft)` fallback, same "don't force a fit" posture
  this codebase's data layer already holds everywhere else. This is a purely additive data field —
  it adds zero new logic to date/position computation, and `roadmapLayout.js`'s own spread
  operators (`{ ...step, x, y }` in `layoutBranch`, `{ ...item, x: 0, y, ... }` at the top level)
  already preserve any extra field a caller sets, confirmed directly by reading that file rather
  than assumed.
- **A real, deliberate color-collision fix made DURING this batch, not shipped and found later**:
  the first draft gave `PROJECT_CONFIG` (a started Project Builder chain's own color) its own
  distinct `var(--bloom-purple)`, reasoning that it deserved a visually distinct identity from a
  generic untracked opportunity. This was wrong the moment it was checked against `getTrackColor`'s
  own cycling logic: `TRACK_COLOR_TOKENS` cycles through all 7 bloom colors by track position, so
  EVERY one of the 7 vivid colors is already claimed by some real interest track (business ->
  purple, stem -> yellow, healthcare -> teal, creative -> orange, academic -> pink, sports -> blue,
  culinary -> green, with the remaining 5 tracks wrapping back around) — meaning any single vivid
  color picked for "Project" would necessarily collide with whichever real track happens to share
  that same hue (business's own purple, in the exact case this pass first tried). Confirmed directly
  via screenshot: a roadmap with both a DECA chain and a started project rendered both chains in the
  literal same purple before this was caught. Fixed by giving `PROJECT_CONFIG` the plain
  `var(--bloom-ink-soft)` fallback instead (the same neutral color the OLD palette's `PROJECT_CONFIG`
  already shared with `OPPORTUNITY_CONFIG`'s own fallback, by original design, not by accident) —
  a started project is never tied to a real interest track in the first place, so a neutral,
  non-competing color is the more honest choice, not a downgrade.
- **Task 3 (existing animations, recolored not redesigned)**: the mark-complete ring fill/checkmark
  transition (`fill`/`fillOpacity` on `circle.ring`, `.node-icon-pop`'s swap-in) needed no changes
  at all — it already reads `cfg.color` dynamically, so it automatically picks up every color
  change from Task 1/2 with zero touched code. The node hover glow
  (`.node-badge:hover .node-pop`'s `drop-shadow`) moved from the old teal-based `rgba(46, 110, 94,
  0.45)` to the new green-based `rgba(47, 143, 91, 0.45)` (the literal rgba equivalent of
  `--bloom-accent`, matching the exact same "literal rgba for an alpha-blended glow" approach the
  old rule already used). The entrance spine-drawing animation (`roadmap-draw-line`'s stroke-
  dashoffset reveal, `roadmap-fade-line`'s opacity fade for branches) is completely mechanically
  unchanged — only the `stroke` color feeding into those same animations changed (per Task 1/2
  above), not the keyframes or timing themselves. The modal's step-chain-progress text
  (`selectedIsAnchorOnly`'s "`X / Y` steps complete" line) now reads `configFor(modalNode).color`
  inline instead of a fixed CSS color, so it visually ties back to its own chain's real resolved
  color (track-colored for a real opportunity) rather than a flat, unrelated hue — the exact
  Business-purple example above shows this text in the same purple as the DECA chain's own ring.
- **Task 4 (chrome repaint)**: the bottom panel's progress ring/number (`.progress-num`), progress
  bar fill (`.bar-fill`), and panel icon badge (`.roadmap-panel-icon-badge`) all moved to
  `var(--bloom-accent)`; the first-visit callout icons/arrows (`.roadmap-callout-icon`/`-arrow`)
  did too; "Start Over" (`.btn-outline`) and "Back" (`.btn-ghost`) read their colors from the
  SAME generic `.app-shell-bloom` button overrides already shared by every other repainted screen
  (see Map 1's own bullet above for why Map 2 itself couldn't use that same mechanism and needed
  direct edits instead — Map 2's `.roadmap-panel-actions` buttons are still plain `.btn-ghost`/
  `.btn-outline`/`.btn-primary`, which DO already have bloom overrides from earlier batches, so
  those needed no Map-2-specific work at all, only the Map-2-exclusive classes listed above did).
  The zoom control buttons (`.zoom-btn`) were deliberately left on their existing neutral card/ink
  styling — they're a plain icon-button chrome piece with no strong "theme color" association in
  either palette, so recoloring them wasn't part of this task's real scope. Map 1's own trail/
  ring/pulse/label colors (`.year-overview-path`/`-ring`/`-pulse`/`-current-tag`/`-label`, plus the
  inline `MapPin` icon color in `YearOverview.jsx`) all moved to their Task-1-equivalent bloom
  tokens (`--bloom-accent` for the trail/ring, `--bloom-yellow` for the current-year marker/pulse/
  tag, `--bloom-ink` for label text) — the exact same relationships Map 2's own "You are here"
  marker and required-spine coloring already establish, so the two maps read as visually
  consistent with each other, not two independently-colored systems.
- Verified after this pass: `npm run verify:spacing` passes 18/18 both before and immediately
  after every code change in this batch (not just once at the end) — the hard, non-negotiable
  gate for this pass, since a regression here is exactly the historical bug class this whole
  component has broken from before when a style change got mixed with a logic change. A dedicated
  13-check Playwright suite confirms: Map 1's body background/trail/current-marker resolve to the
  new bloom tokens and clicking a year marker still navigates into Map 2; a Business-track (DECA)
  chain and a STEM-track (Science Olympiad) chain on the same roadmap resolve to genuinely
  different, track-correct colors, and DECA's own anchor ring matches its connector line's color;
  the legend still shows all 4 categories with the new colors, now clarifying "Optional... colored
  by interest area"; zoom-in still changes the canvas's real inline transform, a core node is
  still clickable, and marking it complete still writes to `state.completedNodes`. The full
  pre-existing regression suite — `test.js`, every `test-hub*.js`, `test-signup.js`,
  `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`, `test-voice-picker.js`,
  every `test-bloom-repaint.js`/`test-discovery-repaint.js`/`test-transcript-courseselection-
  repaint.js`/`test-opportunity-project-repaint.js`, `test-stage4.js`, `test-roslyn-
  consolidation.js`, `test-transcript-skip-unlock.js`, `test-ucdavis-transcript-skip-unlock.js`,
  and the full UC Davis suite (including `test-ucdavis-density.js`, the dedicated dense-roadmap
  cross-node-overlap check) — all still pass unmodified, confirming zero regressions to zoom/pan/
  drag, node editing, multi-year Map 1/Map 2 navigation, or label/connector collision-avoidance.

**Global interaction polish (buttons, page transitions, staggered card reveals, selection
feedback, card depth) is scoped under a single `.polish` class, not applied to raw shared
classes directly — this is what keeps it from leaking onto the Academic Plan screen.**
`App.jsx` adds `.polish` to `.app-shell` for every screen except `plan` (`isPlan` check on the
resolved `screenKey`, not the raw `state.screen`, so an invalid/unknown screen value falls back
to `survey`'s behavior rather than accidentally matching `plan`). This exists because most of
the interactive base classes these effects hook into (`.btn`, `.card`, `.tag`, `.pill`) are
literally shared with Roadmap.jsx/AcademicPlanScreen — without the `.polish` ancestor scope,
a rule like `.btn:active { transform: scale(0.965) }` would just as easily fire on the Plan
screen's own buttons. All of `src/styles/global.css`'s "Global interaction polish" section
(press-feedback scale on every button/card/tag/pill, the primary-CTA ripple, card depth/rounding,
the selection pulse + checkmark badge on a selected `.card`, and the staggered card-reveal
animation) lives under that `.polish` prefix; don't add a new polish rule directly to a bare
shared class, or it'll silently apply to the Plan screen too. **Page transitions are a separate,
narrower scope**: `TRANSITION_SCREENS` in `App.jsx` (`signup`, `hub`, `survey`, `discovery`,
`transcript`, `courseSelection`, `programSummary`, `opportunities`, `projectBuilder`) wraps just
those screens in a `.screen-transition` div keyed
by `screenKey`, so changing `state.screen` remounts the wrapper and replays its fade+upward-slide
`screen-enter` keyframe — this is enter-only (no exit-stage animation, no router), which is fine
since screens fully unmount/remount on every navigation anyway. `welcome` is deliberately excluded
from `TRANSITION_SCREENS` (it already has its own bespoke multi-stage entrance, see below) and
`plan` is excluded per the "don't touch Academic Plan" scope of this pass. The staggered card
reveal (Task 3 of that pass) needs no per-screen index bookkeeping — it's pure CSS `:nth-child`
delays applied to the existing shared grid/list container classes (`.grid`, `.tag-list`,
`.pb-category-grid`, `.pb-projecttype-grid`, `.pb-community-grid`, `.step-track`) via one `:is()`
selector group, so any future screen that reuses one of those containers gets the stagger for
free. **`src/components/StepProgress.jsx`** replaces the old plain `<div className="eyebrow">Step
N of 6</div>` text on Survey/Discovery/OpportunityFinder/ProjectBuilder with an
animated dot track (reusing the exact `.step-track`/`.step-dot` classes DiscoveryScreen already
had for its own careers/majors/programs sub-steps) plus that same eyebrow text underneath, via a
`{step, total, label}` prop API — `AcademicPlanScreen.jsx`'s own "Step 6 of 6" is deliberately
left as plain text, not switched to this component, matching the rest of this pass's scope.

**The Academic Plan's own animation/visual-polish pass is a strict style-layer overlay on top of
`roadmapLayout.js`'s positioning and `Roadmap.jsx`'s zoom/pan/drag math — none of that math was
touched.** Every node/segment already has a correct, final x/y (or `d` for connectors) before any
of this runs; the additions below only decide how those already-correct values get *revealed*,
*hovered*, *clicked*, and *dismissed*. If you're tempted to fix a visual glitch here by adjusting
`layoutRoadmap`, `layoutBranch`, `fitView`, or `zoomAt`, stop — that's exactly the mixing of style
and logic changes that broke date-positioning once before (see the file-level warning in a prior
session). Key pieces:
- **Entrance (+ new-chain-step "settle") reuses one mechanism for both.** `Roadmap.jsx` wraps
  every node's ring+icon in an inner `<g className="node-pop">`, nested *inside* the existing
  outer `<g transform="translate(x,y)">` — never applying a CSS `transform` to that outer g
  itself, since a CSS transform on an SVG element replaces its presentation-attribute `transform`
  rather than composing with it (the same landmine WelcomeScreen's animation already documents).
  `.node-pop`'s pop-in keyframe is applied *unconditionally*, every mount — so Task 6 (a freshly
  appended Project Builder step) gets the same "settle" pop for free, with zero extra code,
  purely because React mounts a new DOM node for a new array entry with a new `key`/id. Only the
  *delay* is conditional: a module-level `hasPlayedRoadmapEntrance` flag (same pattern as
  WelcomeScreen's `hasPlayedIntro`) gates whether nodes/connectors get a real staggered delay
  (first load only, capped at `ENTRANCE_MAX_INDEX` steps so a long multi-year plan doesn't take
  forever) or `0` (every later mount, including Task 6's new steps, which should never wait).
  Connector lines split into two techniques: the solid spine draws in via `stroke-dashoffset`
  (`.roadmap-draw-line`, needs a real `--seg-length` computed from the segment's own endpoints —
  straight lines, so just `Math.hypot`, no DOM measurement needed); dashed branch connectors fade
  in via opacity instead (`.roadmap-fade-line`) specifically because they carry a *permanent*
  `strokeDasharray="6 6"` presentation attribute (that's how an optional branch reads as visually
  distinct from the solid required spine) — a dash-offset reveal would fight that pattern, so
  branches get a plainer fade instead.
- **Mark-complete (Task 4) uses `fill-opacity`, not `fill: none <-> color`, for every hollow
  ring.** CSS can't reliably transition to/from the literal value `none`, so those rings now
  always render `fill={cfg.color}` and toggle `fillOpacity={done ? 1 : 0}` instead — solid
  required rings didn't need this (they already toggle between two real colors, `#fff` and
  `cfg.color`, which transitions natively). `.node-badge circle.ring`'s existing `transition: r
  .15s ease` (from the pre-existing hover-grow effect) gained `fill-opacity`/`fill` alongside it.
  The completed-state icon swap (`cfg.Icon` ↔ `CheckCircle2`) gets its own `.node-icon-pop`
  keyframe that plays automatically whenever `done` flips — that's precisely when React mounts a
  different icon component at that JSX position, so no extra state is needed to detect "just
  completed" vs. "just undone."
- **Hover (Task 2) and click (Task 3) are pure CSS**, layered onto `.node-pop` via
  `.node-badge:hover .node-pop` (scale + drop-shadow glow, additive on top of the pre-existing
  `.node-badge:hover circle.ring { r: 22 }`, not replacing it) and `.node-badge:active .node-pop`
  (a quick pulse). No new JS state.
- **Modal entrance/exit (Task 5) needed real state, since React unmounts a conditionally-rendered
  modal instantly — before any CSS could animate it.** `src/hooks/useModalExit.js` keeps a modal
  mounted for a short window after its `isOpen` flips false, exposing `{ rendered, closing }`, so
  the caller can render its `-exit` CSS variant before actually disappearing.
  `AddTaskModal.jsx` now takes an `isOpen` prop instead of being conditionally mounted by its
  caller at all (Roadmap.jsx's three usages — plain "+ Add Task", the guide-suggested step
  prompt, and the open-ended "add another step" — are now *always* rendered, gated by `isOpen`)
  — it snapshots its own display props (`title`/`eyebrow`/etc.) into a ref while open so the
  closing frame still has real text even after the caller has already nulled out whatever
  selection those props were derived from, and re-seeds its form fields on every re-open (since
  it no longer remounts fresh each time). Roadmap.jsx's other two inline modals (the node detail
  panel, the project "guide exhausted" choice) apply the same retain-last-value pattern by hand
  via a plain ref, since they aren't routed through AddTaskModal. `.overlay-exit`/`.modal-exit`
  also set `pointer-events: none`, closing a real edge case: without it, a fast double-click
  could land on a submit/complete button whose backing state (`selected`/`projectPrompt`) had
  already been cleared, mid-fade.
- **Button-triggered zoom/reset easing (Task 7) is a CSS class toggle, not a change to the zoom
  math itself.** `zoomButton`/`handleResetView` call `markSmoothZoom()` first, which adds a
  `view-smooth` class to `.roadmap-canvas-inner` for ~280ms (giving its `transform` a CSS
  transition); `onWheel`, the touch-pinch handler, and the drag-start branch of `onPointerMove`
  all explicitly clear it immediately, so manual wheel/pinch/drag interaction is guaranteed to
  stay instant/1:1 even if a button-triggered transition happens to still be running. `fitView`
  itself is untouched and still runs unmarked (instant) from the auto-fit-on-load/resize
  `useEffect` — only the "Reset view" *button's* own click handler (`handleResetView`) wraps it
  with the smooth marker, so the very first auto-fit on mount was never affected.
- Task 8 (progress bar fill transition) already existed (`.bar-fill { transition: width ... }`)
  before this pass — only its easing curve was refined, nothing structural changed there.
- `src/hooks/useMediaQuery.js` was extracted from WelcomeScreen (identical behavior, just
  shared) so Roadmap.jsx's own `prefers-reduced-motion` check doesn't duplicate it.

**The Academic Plan is a full-viewport, chrome-restructured layout, not a normal scrolling
screen inside `.app-shell` — same "style/layout only, don't touch positioning math" boundary as
the animation pass above.** `App.jsx` gives `.app-shell` a class of `app-shell-plan` (instead of
`polish`) whenever `state.screen === 'plan'`; `.app-shell.app-shell-plan` in `global.css`
overrides the shell's normal centered/padded/scrolling box with a `height: 100vh; display: flex;
flex-direction: column;` full-viewport one — every other screen's `.app-shell` is untouched.
`AcademicPlanScreen.jsx` is now just wiring (`roadmap` + `onBack`/`onReset` handed to `Roadmap`);
the step indicator, title/subtitle, progress, legend, Back, and Start Over all moved from that
screen's own header into `Roadmap.jsx`'s new bottom panel, described below. **Note the legend
already only ever had the real 4 categories (Required/Optional/Custom/You are here) and the ring
rendering never had letter badges** — an earlier AI-generated mockup that prompted this
restructure got both of those wrong, but the actual data/rendering needed no correction, only
repositioning.
- **`.roadmap-fullscreen-root`** (`flex: 1; min-height: 0; position: relative;`) is the single
  positioning context for everything the canvas now shares the screen with: the canvas itself
  (`.roadmap-viewport-wrap`, `position: absolute; inset: 0;`), the floating zoom-control stack,
  the paired first-visit callouts, and the bottom panel — all direct children, all
  `position: absolute`, so the panel and callouts float *over* the canvas rather than pushing it
  (nothing here changes canvas sizing based on panel state, deliberately — see the fitView note
  below for the one place that does matter). `.roadmap-viewport` itself dropped its border/
  card-background/fixed-620px-height entirely — no visible frame, so the parchment/contour
  texture painted on `<body>` shows straight through behind every node, and it now sizes to
  `100%`/`100%` of its full-bleed parent instead of a fixed box. **`.roadmap-fullscreen-root` also
  sets `user-select: none`** (plus vendor prefixes) so a drag-to-pan gesture doesn't trigger the
  browser's default text-selection behavior across the canvas/panel/chrome — a mouse-drag looks
  identical to a text-selection drag unless explicitly disabled. Every modal (the node detail
  modal, the project "guide exhausted" choice modal, and `AddTaskModal`) shares one `.overlay`
  root class, which is a descendant of `.roadmap-fullscreen-root` here — so `user-select: text` is
  explicitly re-enabled on `.roadmap-fullscreen-root .overlay` to carve those back out, keeping
  modal text/inputs (descriptions, resources, the Add Task form's fields) normally
  selectable/editable despite the ancestor rule.
- **The bottom panel (`.roadmap-panel`) is collapsible via a chevron (`.roadmap-panel-toggle`,
  rotates 180° when collapsed) that only animates `.roadmap-panel-content`'s own
  `max-height`/`opacity`/`padding`** — the outer `.roadmap-panel` keeps a fixed `min-height` so
  there's always a legible strip left for the toggle once collapsed, instead of the whole panel
  animating to zero and clipping its own toggle button. Collapse state (`panelCollapsed`) is
  local, unpersisted `useState` — a session-only UI convenience, not data worth surviving a
  reload. The panel's top row (title/subtitle/progress/legend/buttons) is unchanged content,
  just reflowed into `.roadmap-panel-top` (`.roadmap-panel-info` left, `.roadmap-panel-side`
  right) instead of the old `.roadmap-header`/`.add-task-row` (both now dead and removed). Start
  Over is a new `.btn-outline` variant (a real border, not `.btn-ghost`'s plain colored-text
  style) — reuses existing ink/paper tokens, no new color introduced.
- **The floating zoom-control stack is 3 buttons**: zoom in, zoom out, and `Crosshair` for
  "recenter/reset view" (`handleResetView` → `fitView`, unchanged behavior). A 4th button toggling
  real browser fullscreen via the Fullscreen API was tried and then explicitly removed — don't
  re-add a fullscreen toggle here unless asked again. Its `bottom` offset switches between two
  constants (`ZOOM_CONTROLS_BOTTOM_COLLAPSED`/`_EXPANDED`) based on `panelCollapsed` and transitions
  smoothly rather than jumping — these are hand-picked to match the panel's own CSS sizing, not
  derived from a real measurement.
- **The first-visit callouts (`roadmapTooltipsSeen` in `AppContext`, persisted like everything
  else) are a *paired* onboarding moment, not two independently-tracked tooltips** — dismissing
  either one's close button sets the same shared flag and hides both together, matching how the
  spec described them as shown/dismissed as one moment. They reuse `useModalExit` (see above) for
  their own fade in/out rather than a bespoke mechanism, exactly like every modal in this file.
- **`fitView`'s default framing needed one deliberate, isolated adjustment because of this
  restructure — this is the one place layout and positioning code actually touch, so read it
  carefully before changing either.** Since the bottom panel now *floats over* the canvas instead
  of reserving its own space above it, and "today" plus every near-term node render closest to
  the bottom of the canvas (same date-to-y principle as always — nothing about *that* changed),
  the default view used to land with today's own node hidden and unclickable behind the panel.
  The fix is a single constant subtracted from the *already-computed* `panY` — `BOTTOM_PANEL_
  CLEARANCE_EXPANDED`/`_COLLAPSED` (matching current `panelCollapsed` state, both hand-picked to
  clear the panel's real rendered height) — applied *after* `zoom`/`effectiveTop`/`windowHeight`
  are computed exactly as before. It does not change the zoom level, `effectiveTop`'s window
  cap, or `panX` — only shifts the vertical framing up enough to guarantee "today" isn't
  covered by default. `handleResetView`/the crosshair button re-run this (picking up the current
  collapse state); toggling the panel itself does not trigger a re-fit (no `fitView` call on
  `panelCollapsed` change), so the clearance is deliberately generous enough to be correct in
  both states without needing to react to every toggle.

**UC Davis is a partner school for Undergraduate/Transfer only — High School stays Roslyn-only.**
This is the first (and so far only) per-program, per-education-level gate in `programs.js`:
- **`PROGRAMS` entries can carry an optional `levels` array** (e.g. `levels: ['undergraduate',
  'transfer']`). `getPrograms(majorId, educationLevel)` filters on it before the existing
  `transferNote` mapping step; absent means "show for every level that already reaches this
  major" — every pre-existing entry before UC Davis has no `levels` field and is completely
  unaffected. This was the only viable gating point, since `MAJORS`/`PROGRAMS` are flat
  namespaces shared across levels (`transfer` reuses `highschool`'s careers/majors wholesale, and
  the 6 newer tracks alias `undergraduate` to `highschool` too) — there was no existing
  level-aware layer to hook into below this one.
- **UC Davis (`gpaValue: 3.7`, `'Highly Selective'`, real ~44% acceptance rate / 3.79–4.0
  admitted-GPA data) was added as a 6th program** (breaking the "5 per major" convention — the
  second time this pattern's been used, after Cornell/Communications for School-Specific
  Requirements) under `economics`, `computer-science`, `biology-premed`,
  `political-science-prelaw`, and `psychology`.
- **A real, pre-existing reachability gap surfaced while wiring this up**: for the original 5
  tracks (business/stem/healthcare/creative/academic), `CAREERS[track].undergraduate` only ever
  referenced grad-level majors (`mba`, `ms-finance`, `md-do`, `jd-law`, `psyd-clinical-psych`,
  etc.) — never the bachelor's majors above — so an `educationLevel: 'undergraduate'` student
  could never reach `economics`/`computer-science`/`biology-premed`/`political-science-prelaw`/
  `psychology` via Discovery at all, regardless of UC Davis. Fixed by adding each bachelor's major
  as a *supplementary* `relevantMajors` entry on its natural undergraduate-tier counterpart career
  (`management-consultant` → `+economics`, `ml-engineer` → `+computer-science`, `physician-grad`
  → `+biology-premed`, `attorney-jd` → `+political-science-prelaw`, `clinical-psychologist` →
  `+psychology`) — each pairing is a real, common direct pipeline (e.g. an econ bachelor's
  feeding into consulting without necessarily already holding the MBA), and it's additive only:
  the pre-existing grad-level major stays first in each array, untouched.
- **Task 2 (Gardening/Horticulture) broadens the existing cluster rather than adding a new
  track**: UC Davis *replaces* Cornell as the `horticulture` major's flagship program (a
  deliberate swap, not an addition — array stays at 3 entries — since UC Davis is genuinely
  ranked #1 in the US / #2 in the world for Agriculture and Forestry per QS World University
  Rankings, a stronger authentic flagship than Cornell for this specific field; Purdue/Michigan
  State are untouched). A new major, `sustainable-agriculture-food-systems` (one program, UC
  Davis only — deliberately not padded with unresearched schools), and two new careers,
  `environmental-policy-analyst`/`sustainable-agriculture-specialist`, were added. **The new
  major's High-School invisibility needs no major-level gating at all** — it's reachable only
  through those 2 new careers, which were appended *only* to `CAREERS.outdoors.undergraduate`/
  `.transfer` (as an override applied after the existing generic highschool-aliasing loop for the
  6 newer tracks, not by editing `CAREERS.outdoors.highschool` itself), so High School's own
  career pool never references the major in the first place — the existing
  career→major→program traversal (`getCareerPool`/`getMajorGroups`/Discovery routing) needed zero
  changes.

**UC Davis Partner School, Stage 1: a "current school" question and a flow reorder for
Undergraduate/Transfer — mirrors Roslyn's own Stage 1, but with one deliberate asymmetry.**
- **`src/data/schools.js` now exports `COLLEGE_SCHOOLS = ['UC Davis']`** alongside the existing
  `SCHOOLS` (Roslyn's list) — kept separate since the two lists are scoped to different education
  levels and must never cross-contaminate each other's options. `SchoolSearchField` takes a new
  `schools` prop (default `SCHOOLS`, for backward compatibility with every other existing call
  site) rather than hardcoding which list it searches; `SurveyScreen` passes `COLLEGE_SCHOOLS` for
  Undergraduate/Transfer and `SCHOOLS` for High School.
- **`SurveyScreen`'s "What school do you currently attend?" field block now renders for High
  School OR an Undergraduate/Transfer student** (`hasSchoolField = isHighSchool || isCollege`),
  with level-specific hint text ("Only Roslyn High School..." vs. "Only UC Davis..."). Picking a
  new education level resets `currentSchool: ''` (alongside the pre-existing `schoolYear: null`
  reset) so a stale selection from one level's school list can never leak into the other's.
- **The field is mandatory for High School but deliberately OPTIONAL for
  Undergraduate/Transfer** — `canContinue`'s `!!state.currentSchool` requirement stays scoped to
  `isHighSchool` only, unchanged from before this addition. This is intentional, not an oversight:
  Roslyn is the only supported school for the entire High School level, so requiring it is
  reasonable, but the vast majority of Undergraduate/Transfer students don't attend UC Davis —
  forcing them to pick a school that isn't theirs just to continue would break "the existing
  generic flow, completely unaffected" for most college-level users. A student who leaves the
  college field blank (or picks nothing, since UC Davis is the only option) proceeds exactly as
  they did before this feature existed.
- **Downstream routing widens the same `isHighSchool` check used throughout the app to
  `isHighSchool || isCollegeAtUCDavis`** (`isCollegeAtUCDavis = isCollege && state.currentSchool
  === 'UC Davis'`), recomputed independently in each file per this codebase's established
  per-file-recomputed-variable convention (see the High-School-skip note earlier in this section).
  At the time this was written, several screens computed their own routing targets from this
  check directly (`AdmissionsOverviewScreen`'s `afterDiscoverySkip`, `DiscoveryScreen`'s
  `afterDiscovery`, `ProgramSummaryScreen`'s `backTarget`) so a UC-Davis-selecting college student
  was routed through `transcript`/`courseSelection` exactly like a High School student. The
  Return-to-Hub routing restructure (see its own section earlier in this document) later removed
  all of those per-screen routing computations entirely — every screen's Continue/Back goes to `'hub'`
  unconditionally now — but `isCollegeAtUCDavis` itself, and the `hasCourseFlow` gate it feeds
  (below), are unaffected: they still correctly decide WHICH screens exist/render real content for
  this student, just no longer double as a routing target too.
- **`TranscriptScreen`/`CourseSelectionScreen` each gained a `hasCourseFlow = isHighSchool ||
  isCollegeAtUCDavis` gate** (replacing their old bare `isHighSchool` gate) plus a content branch:
  `isHighSchool` still renders the real, full Roslyn content unchanged; a UC-Davis-selecting
  college student instead renders a small dedicated placeholder component
  (`CollegeTranscriptPlaceholder`/`CollegeCourseSelectionPlaceholder`, defined at the bottom of
  each file) — a "Coming soon" notice plus working Back/Continue navigation, deliberately NOT the
  real Roslyn-specific catalog/transcript UI, since UC Davis's real course/GPA data hasn't been
  built yet (a later stage) and reusing Roslyn's 207-course catalog for a UC Davis student would
  be actively wrong, not just incomplete. Both screens' defensive bounce-if-reached-incorrectly
  `useEffect` was widened the same way (`hasCourseFlow` instead of `isHighSchool`). Checkpoints
  (Course Selection Stage 4's per-year "revisit" mechanism) stay High-School-only — untouched —
  since `state.activeCourseCheckpoint`/`courseCheckpoints` are never populated for a college
  student regardless, so `checkpoint` naturally resolves to `null` for them with no extra gating
  needed.
- **UC Davis operates on a quarter system (Fall/Winter/Spring, plus optional Summer Session), not
  semesters like Roslyn.** Stage 2 (below) surfaces this in the transcript entry itself (a
  `quarter` field per entry); Stage 3/4's eventual registration-timing logic (the UC-Davis
  equivalent of `ESTIMATED_COURSE_REQUEST_WINDOW`/course-checkpoint stage dates) still needs to
  reflect quarters rather than reusing Roslyn's semester-shaped assumptions verbatim — not yet
  built, since Course Selection (Stage 3) for UC Davis remains a placeholder.

**UC Davis Partner School, Stage 2: real Transcript & GPA, grounded in real course/requirement
research — replaces Stage 1's "Coming soon" placeholder on `TranscriptScreen` (Course Selection,
Stage 3, is still a placeholder; only Transcript & GPA was rebuilt this stage).** Deliberately
scoped to the same 6 areas/23 subject codes Stage 1's own Task 1/2 named, fetched directly from
`catalog.ucdavis.edu` rather than summarized from general knowledge — not a full 180+
subject-code catalog ingestion, the same "scoped, not exhaustive" posture Roslyn's own 207-course
build already established.
- **`src/data/ucdavisCourses.js`** exports `UCDAVIS_COURSES` (~280 real courses, Lower + Upper
  Division only — this feeds an undergraduate transcript, so 200-level graduate courses are
  excluded), each with a stable `id` (`ucd-<code>`), real `code`/`name`/`units`/`department`/
  `description` parsed from each subject code's own catalog page
  (`catalog.ucdavis.edu/courses-subject-code/<code>/`). Two exclusions applied uniformly while
  parsing every subject code: purely administrative/variable-content catch-alls (Directed Group
  Study, Special/Individual Study, generic Internship placements, Tutoring, Research Group
  Conferences, Honors thesis units, bare untitled seminars) are left out — their catalog text is
  itself just "variable"/"independent study," so including them would mean inventing content, not
  parsing it — and exact-duplicate online/hybrid delivery-mode variants (a plain course plus its
  identical-content "V"/"Y" twin) are collapsed to one entry. **4 of the spec's 23 subject codes
  (ACC, BAX, HRT, ENV) turned out to be graduate-only when fetched** — confirmed directly from
  each one's own page, not assumed — so they contribute zero course entries; this is why Business/
  Economics' real coverage comes from just ECN + MGT, and Horticulture/Ag & Environment's from ESM
  + ESP + SAF + PLB. `UCDAVIS_AREAS` groups the 23 subject codes into the same 6 areas the build
  spec named, each tagged with which `college` (below) governs it. `searchUCDavisCourses(query)` /
  `getCourseById(id)` mirror Roslyn's `searchCourses`/`getCourseById` contract exactly (case-
  insensitive substring match, no free-text entry) — `CourseSearchField.jsx` (shared component) now
  takes an optional `search` prop (default Roslyn's `searchCourses`) instead of hardcoding which
  catalog it searches, the same "caller picks the data source" pattern `SchoolSearchField`'s own
  `schools` prop already established for Stage 1.
- **`src/data/ucdavisRequirements.js`** exports `GENERAL_EDUCATION_REQUIREMENTS` (University-wide
  GE — Topical Breadth 52 units across Arts & Humanities/Science & Engineering/Social Sciences,
  Core Literacies 35 units across Words & Images/Civic & Cultural Literacy/Quantitative/Scientific
  Literacy) and `COLLEGE_REQUIREMENTS` (keyed `letters-science` / `engineering` /
  `biological-sciences` / `agricultural-environmental-sciences` / `gsm`), each a close paraphrase
  of that college's own real requirements page (unit totals, GPA minimums, residency, English
  Composition, catalog rights) — not estimated the way Roslyn's `ESTIMATED_COURSE_REQUEST_WINDOW`
  explicitly is, since every number here came directly from a fetched, real page.
  `MAJOR_TO_UCDAVIS_COLLEGE` maps this app's own 7 UC-Davis-touched major ids to which college
  governs them — **`economics` maps to `gsm`, not `letters-science`**, a real distinction
  surfaced by fetching the Graduate School of Management's own requirements page: this app's
  `economics` major displays as UC Davis's real "Managerial Economics" program (see Stage 1's
  `programs.js` entry), which GSM's page governs directly (real "Business major" terminology,
  distinct unit/GPA language from a general L&S Economics major) — not the College of Letters &
  Science, even though plain ECN course listings are nominally an L&S subject code.
  `getSelectedUCDavisColleges(selectedMajorIds)` resolves every distinct college reached by the
  student's selected majors (first-selected-first order, same convention `getSelectedProgramTypes`/
  `getCareerGroups` already use) — a student spanning two areas sees two separate requirement
  cards, not a merged one; zero UC-Davis-relevant majors selected resolves to `[]`, and the caller
  shows its own honest empty-state prompt rather than a fabricated section, same "don't guess"
  pattern `schoolRequirements.js`'s own empty state already uses.
- **`src/utils/ucdavisGpa.js`** exports the real, standard UC letter-to-4.0 table (`A`=4.0 down to
  `D-`=0.7, `F`=0.0) plus `PASS_NO_PASS_GRADES = ['P', 'NP']`, excluded from GPA entirely per UC
  Davis's own real grading policy (the same "don't count what the institution itself doesn't
  count" rule Roslyn's `isPassFail` exclusion already established in `utils/gpa.js`).
  `calculateUCDavisGpa(transcript)` needs no separate weighted/unweighted split or a 100-to-4.0
  conversion step the way Roslyn's `calculate4ScaleGpa` does — the UC letter scale is already a
  straight 4.0 scale, so the average IS the final number, written to `state.gpa` unconverted.
  Returns `null` (not `0`) for an empty or all-P/NP transcript, the same "don't guess a GPA that
  isn't there" contract every other blank-GPA fallback in this app already follows.
- **`state.ucdavisTranscript`** (`AppContext.jsx`) is a deliberately SEPARATE array from Roslyn's
  own `state.transcript` — `[{ id, courseId, letterGrade, classYear, quarter }]` vs. Roslyn's
  `[{ id, courseId, gradeEarned (0-100), yearTaken (8-12) }]`. The two entry shapes are genuinely
  different (letter grade + UC Davis quarter/class-year vs. a 100-point number + a numeric grade
  level) and mutually exclusive by construction (a student is on exactly one
  educationLevel/currentSchool combination at a time), so keeping them as separate fields avoids
  any risk of shape collision without needing to retrofit Roslyn's own GPA utilities to handle a
  second grading format.
- **`TranscriptScreen.jsx`'s college branch (`!isHighSchool`) now renders a real
  `UCDavisTranscriptScreen` component** (replacing Stage 1's `CollegeTranscriptPlaceholder`,
  which is deleted) instead of a placeholder — same overall shape as Roslyn's own form (course
  search → add-row → table → GPA summary → Skip/Continue) but with UC Davis's own real fields
  throughout: a letter-grade pill row (`LETTER_GRADE_OPTIONS`, including P/NP) instead of a 0-100
  number input, and separate Class Year (Freshman-Senior) + Quarter (Fall/Winter/Spring/Summer)
  pill rows instead of Roslyn's single 8th-12th "year taken." Above the form, the screen renders
  `GENERAL_EDUCATION_REQUIREMENTS` unconditionally (applies to every UC Davis student regardless
  of major) followed by zero or more `COLLEGE_REQUIREMENTS` cards from
  `getSelectedUCDavisColleges(state.selectedMajorIds)` — this same data is reused (not re-fetched)
  on Course Selection (Stage 3, below) too. Continue/Skip both write
  `calculateUCDavisGpa(ucdavisTranscript)` straight to `state.gpa` as a plain string (no
  `.toFixed()` truncation, matching Roslyn's own `String(gpa4Scale)` convention) and advance to
  `'courseSelection'` — this is why the Reach/Match/Safety pipeline, `ProgramsStep`, and every
  other `state.gpa` consumer needed zero changes: they were never told which screen last wrote the
  value, and a UC-letter-derived GPA plugs into the exact same field a Roslyn-derived one always
  did.

**UC Davis Partner School, Stage 3: the real Course Selection page — replaces Stage 1/2's
"Coming soon" placeholder on `CourseSelectionScreen`'s college branch.** Deliberately reuses
Stage 2's own already-researched data wholesale (no re-fetching) and mirrors Roslyn's Course
Selection screen's overall shape (policy summary → Recommended/Browse toggle → filters → course
grid → detail modal → selected-courses chip list → Continue), but every piece is UC-Davis-real
underneath: no checkpoint mode exists here (Stage 4 — wiring these selections into the Academic
Plan — is a future stage, same as Roslyn's own Stage 4 was before it existed), and no prerequisite
checking/locked cards either, since Stage 2's own fetch never captured per-course prerequisite
text for UC Davis in the first place.
- **Task 1 (policy summary) renders `GENERAL_EDUCATION_REQUIREMENTS` plus
  `getSelectedUCDavisColleges(state.selectedMajorIds)`** — the exact same `ucdavisRequirements.js`
  data Stage 2's Transcript screen already renders, just reused here as `.policy-card` grid cells
  (icon + bullet list) instead of that screen's plain field-blocks, matching Roslyn's own
  `POLICY_SECTIONS`-as-visual-cards pattern rather than a wall of text. Zero UC-Davis-relevant
  majors selected shows an honest prompt instead of an empty/misleading grid.
- **Task 2 (course list) adds `src/data/ucdavisCourses.js` exports for its own filter needs**:
  `getAreaForSubjectCode(subjectCode)` (which of the 6 areas a course belongs to, for the Subject
  Area filter), `getTypicalClassStanding(course)` (Freshman/Sophomore for Lower Division numbers
  <100, Junior/Senior for Upper Division ≥100 — a real, standard UC course-numbering convention,
  explicitly a CONVENTION-derived tag rather than literal per-course catalog data, since Stage 2's
  fetch never captured a per-course "typically taken" field), and `isHonorsCourse`/`isLabCourse`
  (regex-derived from the course's own real title — "Honors General Chemistry", "Organic Chemistry
  Laboratory" — the only two "special attributes" honestly derivable from what Stage 2 actually
  parsed; a "GE-fulfilling" attribute was deliberately left out, since that would require
  re-fetching UC Davis's separate GE-certification tool, not something Stage 2 researched). Units
  filter options are collected live from the real `units` values present in `UCDAVIS_COURSES`
  rather than a hardcoded list. `UCDavisCourseCard` mirrors the shared `CourseCard` precedent
  (name, code, units, department, description, badges) but swaps Roslyn's Grade Level meta row for
  "Typically Taken" and never renders a Prerequisite row, honestly, for the same no-data reason.
- **Task 3 (recommendations) adds `src/data/ucdavisCourseRecommendations.js`** —
  `MAJOR_RECOMMENDED_COURSES: { [majorId]: courseId[] }`, the same hand-picked
  `{ [key]: courseId[] }` + merge/dedupe-getter shape `courseRecommendations.js` already
  established, but keyed by this app's own 7 UC-Davis-touched major ids (not interest tracks) —
  Course Selection sits after Discovery for a UC Davis student, so the major they already picked
  there is the natural driver, per the build spec's own framing ("whichever major the student
  selected earlier in Discovery"). Every id is a real `UCDAVIS_COURSES` id from Stage 2's scoped
  catalog. `getRecommendedUCDavisCourses(selectedMajorIds, getCourseById)` merges/dedupes across
  multiple selected majors, same contract as Roslyn's `getRecommendedCourses`. The same "you're
  always free to explore any course you like — these are suggestions, not requirements" copy
  Roslyn's screen uses stays visible whenever Recommended is active; zero majors selected, or
  majors mapping to no recommendations, show their own honest empty-state message.
- **Task 4 (selection) writes to a NEW, separate `state.selectedUCDavisCourseIds` array — not a
  reuse of Roslyn's `state.selectedCourseIds`.** Both are plain string-id arrays with an identical
  shape, so reuse would have "worked" today (`roadmapGenerator.js`'s `buildCourseItems()` already
  only ever reads `selectedCourseIds` when `state.educationLevel === 'highschool'`, so a UC Davis
  student's selections would simply have been ignored there, not corrupted) — but keeping them
  separate follows the same precedent `state.ucdavisTranscript` already set in Stage 2: Stage 4
  (below) has one unambiguous field to read for UC Davis, with zero risk of ever needing to
  distinguish by id prefix or accidentally feeding a `ucd-*` id into Roslyn-scoped roadmap code.
  Selections persist to `localStorage` exactly like every other piece of state.

**UC Davis Partner School, Stage 4: wiring the quarter system into the Academic Plan — the one
stage where UC Davis genuinely diverges from Roslyn's own Stage 4, not just a data-source swap.**
Roslyn's course-checkpoint model assumes ONE registration cycle per year; UC Davis's real quarter
system means registration happens roughly 3x per year, so a literal copy of Roslyn's yearly
cadence would have produced up to ~4x as many checkpoint tasks as Roslyn's own plan. The build
spec's own resolution — decouple "this quarter's enrollment" from "the transcript-update cycle" —
is what's implemented here: one consolidated enrollment task per quarter (not one per year), each
preceded by its own checkpoint.

**Correction: every quarterly checkpoint is a full two-part task, not just Fall.** An earlier
version of this feature made only Fall two-part (transcript + course selection) and treated
Winter/Spring/Summer as a lighter, single-part "just pick courses" step, on the assumption that
grades only change once a year. That assumption was wrong for a real quarter system — final
grades post after every quarter, not just once — so a student's transcript (and the GPA/Reach-
Match-Safety numbers derived from it) would have silently gone stale for 2 of every 3 quarters.
Fixed by dropping the single-part branch entirely: Fall, Winter, Spring, and Summer are now
structurally identical two-part checkpoints (Part 1 — update the transcript with the prior
quarter's final grades; Part 2 — select the upcoming quarter's courses, locked until Part 1 is
done). Summer's only remaining difference is orthogonal — it's still `required: false` (optional
to complete at all, since not every student takes summer courses), which alone is enough to make
it render with the existing hollow/dashed "optional" ring; no new ring-rendering logic was needed
either before or after this fix. This did not add any new spine nodes — each quarter was already
consolidated into one checkpoint task before this fix, and still is; only what that one task does
internally changed (two parts for every quarter instead of just Fall).
- **`src/data/ucdavisQuarters.js` computes real quarter dates using literal calendar-date math,
  NOT this app's usual "relative to whenever you open it" template system** (see `utils/dates.js`'s
  own header comment for that default convention, which every other date in this app still uses
  unchanged). A ~10-week quarter is short enough that pretending "today" is always the start of an
  academic cycle would be visibly wrong to a real student (e.g. being told to enroll in a Fall
  quarter that, in real life, already happened months ago) — the yearly trunk can get away with
  the relative-offset abstraction because a school year is long enough that the exact real month
  barely matters; a quarter can't. `QUARTER_MONTH_DAY` holds real, confirmed UC Davis 2026-27
  instruction-start dates (Fall Sept 21, Winter Jan 4, Spring Mar 29, fetched from the Office of
  the University Registrar) plus a clearly-labeled Summer estimate (UC Davis publishes several
  overlapping Summer Sessions, not one fixed date). `getNextQuarter(today)` finds the real,
  chronologically-next quarter relative to an actual `Date` — a student opening the app mid-
  February is genuinely mid-Winter-quarter, so "next" honestly resolves to Spring, not "whichever
  comes first in the yearly cycle." `buildStageQuarterLists(nextQuarter, nextCalendarYear,
  yearSpan)` groups a continuous real-quarter walk into one array per plan stage (year): stage 0
  starts wherever "next" actually is (a partial year if the app is opened mid-cycle) and every
  later stage gets a full `[Fall, Winter, Spring, Summer]`. **A real bug surfaced and was fixed
  here during testing**: Winter/Spring/Summer of a given academic year always fall in the REAL
  calendar year immediately after that year's own Fall (e.g. Fall 2026 → Winter/Spring/Summer
  2027) — the first version of this function reused the SAME calendar year for every quarter in
  stage 0, which silently duplicated Winter/Spring/Summer on the roadmap: one instance with the
  wrong, already-past year (clamped to "tomorrow" and rendered right next to "today"), and a
  second, correct instance from the following stage's own full-year block. Confirmed via a real
  duplicate-node check (two `.node-badge` elements with identical text at different y-positions)
  before being traced to this root cause and fixed; `ESTIMATED_REGISTRATION_LEAD_DAYS` (21 days
  before a quarter's instruction start) is the clearly-labeled estimate for when enrollment/
  checkpoint tasks are actually due, since UC Davis's real registration passes (Schedule Builder)
  open on a schedule that varies by class level, not one fixed date.
- **`roadmapGenerator.js`'s `buildUCDavisQuarterItems` walks `buildStageQuarterLists`'s output
  and treats the very first quarter slot specially**: it's the quarter Stage 3's onboarding
  selections (`state.selectedUCDavisCourseIds`) are actually FOR, so `buildUCDavisEnrollmentItem`
  turns the WHOLE selected list into ONE real, dated "Select and enroll in your `[Quarter]`
  quarter courses" task — no checkpoint needed, mirroring exactly how Roslyn's own stage-0
  course-request items come straight from `state.selectedCourseIds` with no checkpoint. Every
  OTHER quarter slot (winter/spring/summer of stage 0, and all four quarters of every later stage)
  gets its own `buildUCDavisCheckpointItem` — Fall, Winter, Spring, and Summer are ALL two-part
  (Part 1 transcript update, Part 2 course selection locked until Part 1 is done, GPA refreshed
  feeding Reach/Match/Safety — mirroring Roslyn's course-checkpoint exactly, see the "Correction"
  note above); Summer is additionally `required: false` — which alone is enough to make it render
  with the same hollow/dashed "optional" ring every optional opportunity already uses, confirmed
  via its own `stroke-dasharray` and via removing it with no confirmation dialog (the required-only
  confirm-before-remove check already keys off this same flag) — **zero new ring-rendering logic
  needed**, this is the existing `n.required` branch in `Roadmap.jsx` doing exactly what it
  already did. Once a checkpoint's own Part 2 `selectedCourseIds` is populated, one real enrollment
  task appears alongside it, same "checkpoint produces a dated task" coexistence `buildCourseItems`
  already established for Roslyn.
  **Deliberately does NOT do prerequisite-locking the way Roslyn's Part 2 does** — Stage 2's own
  catalog fetch never captured per-course prerequisite text for UC Davis (see
  `UCDavisCourseCard`'s own comment in `CourseSelectionScreen.jsx`), so there's no real data to
  check against; the GPA-refresh and Reach/Match/Safety parts of "same logic as Roslyn's Part 2"
  are still fully real and honored, but fabricating a prerequisite rule with no source data would
  be exactly the "guess instead of parse" this codebase's standing rule forbids elsewhere.
- **Fix: one spine task per registration cycle, not one per course.** The first version of
  `buildUCDavisEnrollmentItem` (then plural, `buildUCDavisEnrollmentItems`) created a separate
  node per selected course id — since every course selected for the same quarter shares the exact
  same registration date, this was pure visual clutter: several same-dated nodes stacking up and
  crowding/overlapping neighboring opportunity chains on any quarter with more than one or two
  selections, a real, confirmed regression on a dense quarter. Fixed by consolidating to a single
  function producing ONE item per quarter cycle (`ucdavis-enroll-${stageName}-${quarter}` — no
  longer keyed by course id at all). Applied identically wherever enrollment tasks are produced —
  Stage 3's own direct onboarding selections and every checkpoint's own Part 2 selections, every
  quarter alike — so a quarter with 5 selected courses now shows as exactly 1 spine node regardless
  of which path produced the selection.
- **Fix: the course list renders as a real `<ul>`, not a comma-joined sentence baked into
  `desc`.** The consolidated task's own `courseList` field (an array of `${code} — ${name}`
  strings) is a genuinely separate field from `desc` — `Roadmap.jsx` renders it as an actual
  `<ul>`/`<li>` list (`.modal-course-list`, styled to match the pre-existing `.modal-resources`
  block right below it), positioned ABOVE `desc`, which now holds ONLY the estimated-date
  disclaimer sentence, unchanged in substance. **A double-digit course count on one task is not
  itself a sign of a bug — confirmed directly before making this fix**: Course Selection's own
  "Recommended for you" view merges across every selected major with no course-load guardrail (2
  majors alone can surface 15 recommended courses, confirmed by seeding Economics + Computer
  Science and counting the rendered cards), and nothing in Stage 3 frames a selection as "just
  this one quarter" — a student selecting most of a multi-major recommended list genuinely ends up
  with more than a real quarter's ~3-5 courses. Each quarter's own id and its checkpoint's own
  nested `ucdavisQuarterCheckpoints[stageName][quarter]` storage stay fully isolated from every
  other quarter's — there is no merging-across-quarters bug, only a real, legitimately large
  selection that now simply displays as a scannable list instead of a run-on paragraph.
- **`state.ucdavisQuarterCheckpoints`/`state.activeUCDavisCheckpoint`** are the UC Davis analogs
  of Roslyn's `courseCheckpoints`/`activeCourseCheckpoint`, extended with a `quarter` key at every
  level a stage year now has up to 4 checkpoint slots instead of Roslyn's 1
  (`ucdavisQuarterCheckpoints[stageName][quarter] = { part1Done, selectedCourseIds }` — `part1Done`
  is tracked identically for every quarter now, per the "Correction" note above; there is no
  longer a quarter for which it's meaningless). `Roadmap.jsx`'s `startUCDavisCheckpointPart`/
  `selectedIsUCDavisCheckpoint` mirror Roslyn's own `startCheckpointPart`/
  `selectedIsCourseCheckpoint` mechanism exactly (navigate into `TranscriptScreen`/
  `CourseSelectionScreen`'s own checkpoint mode, per the "reuse the exact same entry mechanism"
  instruction that already governed Roslyn's own Stage 4) — the modal renders Part 1/Part 2
  buttons unconditionally for every UC Davis checkpoint (there's no single-part variant left to
  branch on), with `ucdavisCheckpointPart1Done` reading directly off that quarter's own
  `part1Done` flag. `UCDavisTranscriptScreen`/`UCDavisCourseSelectionScreen` (Stage 2/3's own components) each
  gained the identical checkpoint-mode branch Roslyn's `TranscriptScreen`/`CourseSelectionScreen`
  already had — different header copy, hidden policy/GE summary (already seen), writes to the
  quarter-nested checkpoint slot instead of the top-level onboarding field, and returns to `'plan'`
  instead of continuing the normal flow — same reuse principle, just nested one level deeper.
- **Applies identically to Undergraduate and Transfer** (Task 3) — `isCollegeAtUCDavis` is the
  same `(level === 'undergraduate' || level === 'transfer') && state.currentSchool === 'UC Davis'`
  check used throughout every other UC Davis stage; the quarter-checkpoint mechanism reads only
  `stageNames`/`yearSpan` (already level-agnostic) and the student's own selections, never the
  underlying grad-school-vs-transfer trunk content itself, so both levels get byte-identical
  quarter behavior for as long as they remain at UC Davis.
- **Task 4 (editing) needed zero special-casing, confirmed directly**: every enrollment task
  (`coreType: 'ucdavis-enrollment'`) is a plain single-step required core item — same generic
  date-edit/remove/complete-toggle path every other core item already uses, verified by checking
  for the ABSENCE of `.checkpoint-actions` on its modal and the PRESENCE of the generic date input
  and remove button.

**Bug fix: reaching the natural end of the primary guided sequence (through Project Builder, with
Academic Plan as the endpoint) wasn't recognized as its own distinct completed state — the hub
kept treating it like an ordinary mid-sequence step, which produced two real problems: the shared
"Ready to keep going? Pick up where you left off." acknowledgment (from the earlier
dialogue-no-repeat fix) kept showing on every return visit even though there genuinely was nothing
left to keep going TO, and the mascot kept actively pointing/glowing at the Academic Plan tile
forever.** Both bugs traced to the same root cause: `getNextGuidedStep` (`HubScreen.jsx`) returns
the literal `ENDPOINT_STEP` constant (`{ id: 'plan', intro: '...' }`) once every real
`GUIDED_SEQUENCE` step is done — and that constant deliberately reuses the literal id `'plan'`
(the same id `GUIDED_SEQUENCE`'s own doc comment already explains is "deliberately unlocked...
also deliberately NOT part of GUIDED_SEQUENCE... the mascot never force-points at it mid-sequence,
only offers it as the natural endpoint"). Nothing anywhere previously distinguished "the current
guided step happens to be the last real one" from "there is no real step at all, this is the
synthetic endpoint" — both `nextStepIntro`'s own seen-key fallback and `isPointingTarget`/
`pointAngle`'s own target-id comparison treated `ENDPOINT_STEP` exactly like an ordinary step that
happens to share an id with the Academic Plan tile.
- **The fix introduces one new derived boolean, `sequenceComplete = nextStep === ENDPOINT_STEP`**
  — a plain reference-equality check against the same module-level constant `getNextGuidedStep`
  already returns, not a new completion concept invented from scratch. This is safe specifically
  because `ENDPOINT_STEP` is a real, single, stable object identity — `getNextGuidedStep` never
  constructs a new `{ id: 'plan', ... }` object on the fly, it always returns this exact same
  reference — so the check can never produce a false positive for a real GUIDED_SEQUENCE step that
  simply happens to still be `'plan'`-flavored in some other way (there isn't one; `'plan'` is
  never a real sequence-step id).
- **Task 1's dialogue fix**: `nextStepIntro`'s own fallback — previously
  `guidedStepAlreadySeen ? getMascotLine('hub-guided-revisit') : nextStepFullIntro` — is now
  `guidedStepAlreadySeen ? (sequenceComplete ? null : getMascotLine('hub-guided-revisit')) :
  nextStepFullIntro`. The one-time completion acknowledgment itself needed no new tracking
  mechanism at all — it already goes through the same `guidedStepSeenKey`/`guidedStepAlreadySeen`
  pair (`hub-guided-plan`, since `ENDPOINT_STEP.id` is `'plan'`) every other guided step already
  uses, so it plays in full exactly once, the same way any other step's own intro line does; the
  only change is what happens on every subsequent visit AFTER it's been seen — `null` (nothing)
  instead of falling through to the generic "keep going" line. `ENDPOINT_STEP.intro` itself was
  also reworded from "Your plan is really coming together! Come back anytime." to "You've made it
  through the whole guide — your plan is ready! Come back anytime to keep building on it." — a
  small copy change matching the fix's own explicit "you're all set — your plan is ready" framing,
  now that this line is genuinely shown exactly once rather than blending into an ongoing
  encouragement loop. The dialogue `<p>` itself is now conditionally rendered
  (`{nextStepIntro && <p>...</p>}`) rather than always rendering an (occasionally empty) paragraph,
  so a completed sequence's quiet hub genuinely shows no dialogue bubble at all, not an empty one.
- **Task 2's pointing/glow fix, three call sites, all gated the same way**: `usePointAngle`'s own
  target id argument is now `sequenceComplete ? null : nextStep.id` (previously always
  `nextStep.id`) — the hook already returns `null` for an unresolvable target (its own existing
  "don't guess" fallback), which is what puts the mascot back into its centered, non-pointing
  pose. `isPointingTarget` (the per-tile glow class) is now `!sequenceComplete && tile.id ===
  nextStep.id` — without this, the Academic Plan tile specifically would carry `.pointing-target`
  forever once the sequence finished, since it's the one real tile whose id happens to collide
  with `ENDPOINT_STEP`'s borrowed one. `MascotIcon`'s own `pointing` prop — previously always
  `isSpeaking` (deliberately the "pointing and currently-speaking are the same real thing" signal
  from the pointing-animation overhaul) — is now `!sequenceComplete && isSpeaking`, so the mascot's
  MOUTH/body can still animate while it delivers the one-time completion line (the separate
  `speaking` prop is untouched), just without raising its arm/wand toward a target that no longer
  means anything.
- Verified with a dedicated 11-check Playwright suite: a freshly-completed sequence shows a real,
  distinctly-worded completion line (not the generic "keep going" text) and carries NO pointing
  pose and NO tile glow (specifically checked against the Academic Plan tile) even during that
  one-time message; a later revisit shows no dialogue text at all (neither message) and still no
  pointing pose; a third revisit is unchanged; and, confirming the fix doesn't over-suppress, an
  UNFINISHED sequence still shows a real step intro and still glows exactly one tile. The one
  pre-existing test that asserted the OLD, now-intentionally-changed behavior
  (`test-hub-pointing.js`'s own "mascot points at Academic Plan as the endpoint" check) was updated
  to assert the new one instead, plus an added check confirming a later revisit shows neither
  dialogue nor a pointing target — the same "update a pre-existing test after an intentional,
  expected change" pattern this suite has already needed several times before, not a regression.
  The full pre-existing hub/mascot/voice suite (`test-hub.js`, `test-hub-locking.js`,
  `test-hub-radial.js`, `test-hub-reset.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`,
  `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, `test.js`, and
  `test-mascot-wand-pointing.js`) all still pass with zero further regressions.

**Bug fix: skipping Project Builder didn't register as "done" for the hub's own sequence
tracking, so the end-of-sequence fix directly above never actually triggered for anyone who used
the real, fully-supported "Skip for now" path — the mascot kept treating Project Builder as the
pending next step forever, repeatedly pointing back at it and repeating "Ready to keep going?
Pick up where you left off." even though the student had explicitly opted out.** Root cause:
`GUIDED_SEQUENCE`'s own `projectBuilder` entry (`HubScreen.jsx`) was `isDone: (state) =>
state.startedProjects.length > 0` — a real, deliberate design choice at the time (documented
directly above it: "There's no separate 'explicitly skipped' flag anywhere in this app's state to
check instead"), but a real gap once the end-of-sequence fix started depending on this step's own
`isDone` to decide whether the WHOLE sequence was finished. `ProjectBuilderScreen.jsx`'s own "Skip
for now" button (`skip = () => patch({ screen: 'hub' })`) never wrote anything beyond the screen
navigation itself, so a skip and "hasn't gotten here yet" were byte-for-byte indistinguishable in
state.
- **The fix adds the dedicated flag that comment said didn't exist**: `state.projectBuilderSkipped`
  (`AppContext.jsx`, `false` by default) — mirrors the exact same "done OR explicitly skipped"
  shape `state.transcriptCompleted` already established for Transcript & GPA (a real, once-set
  boolean read alongside the step's own "did a real thing happen" signal, never touching that
  other signal's own semantics). `skip` now writes `patch({ screen: 'hub', projectBuilderSkipped:
  true })`; `GUIDED_SEQUENCE`'s own `isDone` is now `state.startedProjects.length > 0 ||
  state.projectBuilderSkipped`. **Deliberately NOT set by `goBack`'s own top-level exit** (Back
  from the category grid, which also returns to the hub) — Back is "leave without deciding,"
  not an explicit choice, so it stays a genuine "hasn't decided yet" state; only the dedicated
  Skip button counts as "the student was asked and chose to skip," the same distinction this
  app's Back/Skip pair already carries everywhere else it appears.
- Verified with a dedicated 9-check Playwright suite: before skipping, the hub confirms Project
  Builder is genuinely the pending step (real dialogue text, real tile glow); clicking "Skip for
  now" sets `projectBuilderSkipped: true` without fabricating a `startedProjects` entry; the very
  next hub visit shows the one-time completion acknowledgment (not the Project Builder intro
  again, not the generic "keep going" line) with zero tile glow anywhere; and a later revisit
  shows neither message and still no pointing — confirming this correctly feeds the exact
  end-of-sequence mechanism the prior fix built, not a separate one. The full pre-existing hub/
  mascot/voice suite (`test-hub.js`, `test-hub-locking.js`, `test-hub-pointing.js`,
  `test-hub-radial.js`, `test-hub-reset.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`,
  `test-voiceover.js`, `test-voice-picker.js`, `test-signup.js`, `test.js`,
  `test-mascot-wand-pointing.js`, and `test-sequence-complete.js`) all still pass with zero
  regressions.

**Palette repaint, Program Summary batch — the sixth and final screen in this rollout, closing
out the "bloom" palette migration entirely.** `App.jsx`'s `isBloomScreen` now also covers
`screenKey === 'programSummary'` — the same `.app-shell-bloom` scoping precedent every prior batch
already established, so no other screen is affected. This was purely a visual-layer pass, per its
own explicit "no functional changes" scope: `reachMatchSafetyTag`/`getMergedPrograms`'s grouping
logic and the count line's own arithmetic were not touched at all.
- **Most of the repaint came for free from already-existing generic bloom rules**, the same way
  every prior batch's own "most of it inherits automatically" pattern already worked: `.card`'s
  background/border/shadow, `.card-desc`/`.card-meta`/`.card-meta strong`/`.card-meta .label`,
  `.rms-badge.rms-safety/.rms-match/.rms-reach` (already bloom-scoped from the Discovery batch,
  since `ProgramsStep.jsx`'s own cards use the identical classes), `.rms-caveat`, `.btn-primary`/
  `.btn-ghost`, and `body:has(.app-shell-bloom)`'s own global text-color override (`.field-hint`,
  `h1.page-title`, etc.) all applied automatically the instant this screen joined
  `isBloomScreen` — zero new CSS needed for any of them.
- **Colored Reach/Match/Safety group headers (Task 3's own explicit ask)**: a new
  `RmsGroupHeader`/`.rms-group-label`/`.rms-group-icon` (ProgramSummaryScreen.jsx/global.css)
  replaces the group section's old bare `.field-label` text with a small colored icon + colored
  label, reusing the EXACT same colors `.rms-badge`'s own bloom override already established for
  these three tags (`--bloom-orange`/`--bloom-yellow`/`--bloom-green`) rather than inventing a
  second color mapping — so a card's own small badge and its group's big section header always
  agree on which color means which tag. One small icon per group (`Flame`/`CheckCircle2`/
  `ShieldCheck`, lucide-react), matching this app's own established "colored label + small icon"
  idiom (`TrackBadge`, the hub's own Quick Actions title) rather than a bare colored text label.
  The "Not Yet Categorized" section gets the same treatment for visual consistency (a neutral
  `--bloom-ink-soft` color + `HelpCircle` icon), even though it wasn't explicitly named in the
  task — a plain, low-risk consistency extension, not a new concept. `--rms-accent` is set inline
  per group (JSX), the same "data/JSX picks the value, CSS just reads a custom property"
  convention `--tile-accent`/`--track-accent`/`--pb-accent` already established elsewhere in this
  codebase. `.rms-group-label`/`.rms-group-icon`/`.rms-summary-line` are all exclusive to this one
  screen (which is now always rendered under `.app-shell-bloom`, no unpainted variant left to
  preserve), so they're styled directly rather than via a separate bloom-scoped override — the
  same "exclusive class, edit/define directly" precedent Welcome/Sign-Up's own `.welcome-*`
  classes already established, rather than the "shared class, scope under `.app-shell-bloom`"
  convention used for classes other screens still read.
- **"A satisfying reveal when the grouped list loads" (Task 3's own animation-polish ask)** reuses
  the EXACT `bloom-section-reveal` keyframe the Transcript/Course Selection batch's own
  Program-Specific/School-Specific sections already established (`.rms-group-reveal`, applied to
  each group's outer `.field-block`), rather than a second, near-identical keyframe — plays once
  per section, the moment it's actually mounted (a group that goes from zero to one program gets a
  fresh key/DOM node and replays this; an already-shown group isn't remounted just because a
  SIBLING group's own count changes), respecting `prefers-reduced-motion` the same way every other
  `bloom-section-reveal` consumer already does.
- **A real, confirmed pre-existing test breakage was found and fixed while regression-testing
  this batch, not a new bug — an intentional markup change, same class this codebase's own test
  suite has needed several times before.** `test-rms-summary.js` (a pre-existing scratch
  Playwright file, functional not visual) located each Reach/Match/Safety group section via
  `.field-label` text matching — since the group header markup moved from a bare `.field-label`
  div to the new `RmsGroupHeader`/`.rms-group-label` component, those 4 selectors were updated to
  match the new class, with zero change to what they actually assert (grouping/count/badge
  correctness, all confirmed still byte-for-byte unchanged). Three other repaint-batch test files
  (`test-bloom-repaint.js`, `test-discovery-repaint.js`, `test-transcript-courseselection-
  repaint.js`) each had their own stale "confirm zero leakage" check, which used to target Program
  Summary as "the one screen still on the old parchment palette" — now that this batch closes out
  the rollout, there's no unpainted screen left to check against, so each was retargeted to Map 2
  (`Roadmap.jsx`), the one screen that deliberately never joins `.app-shell-bloom` at all (its own
  separate `.app-shell-plan` full-bleed system) and so remains a genuine "did this leak somewhere
  it shouldn't" check going forward.
- Verified with a dedicated 9-check Playwright suite: the body background/button colors resolve
  to the bloom palette; the empty-state message still renders correctly with zero programs
  selected; after selecting 2 real programs via real Discovery navigation (not guessed key
  strings), the rendered group header shows a real bloom color and a real icon; the reveal
  animation is genuinely active (non-`none` `animationName`); cards show real bloom background
  colors; and the real Reach/Match/Safety badges and count line still reflect the exact same
  grouping this screen always computed, unchanged. `test-rms-summary.js` (the dedicated, more
  thorough pre-existing functional suite for this screen's own grouping/routing logic) passes in
  full after its selector update, confirming grouping-by-institution+program, the portfolio/
  audition "Not Yet Categorized" bucket, the empty state, and Back/Continue routing are all
  completely unaffected. The full pre-existing regression suite — every `test-hub*.js`,
  `test-signup.js`, `test-return-to-hub.js`, `test-stage5-mascot.js`, `test-voiceover.js`,
  `test-voice-picker.js`, every other `*-repaint.js` file, `test-ucdavis-stage1.js`, and the
  general `test.js` — still passes with zero further regressions.

## Testing changes

There's no automated test suite. To verify a change actually works, run the dev server and
drive it with a headless browser (Playwright works; `chromium-cli` was not available in this
environment — the Chromium binary it installs is cached under `~/Library/Caches/ms-playwright`,
so reinstalling only needs `npm install playwright` in a scratch dir, not a fresh browser
download). Cover at minimum:
- Welcome screen: fresh load (cleared `localStorage`) shows the trail undrawn at t=0, markers
  revealed on their own staggered timers (not all at once — check an early marker's opacity
  mid-sequence against a later one still at 0), hero content settling in only after both resolve.
  Emulate `prefers-reduced-motion: reduce` (Playwright's `reducedMotion: 'reduce'` context option)
  and confirm the whole composition renders in its finished state immediately, with the pulse
  ring absent. Check a narrow (~375px) viewport specifically for label clipping — marker labels
  are positioned in SVG user-space, which scales with the viewBox, so a layout that fits at
  desktop width doesn't automatically fit on a phone. Confirm a returning user with non-`welcome`
  stored state is never bounced back to it.
- One run per built track (Business, STEM, Healthcare, Creative, Academic/Humanities, Sports,
  Culinary Arts, Community & Leadership, Media & Entertainment, Personal Development, Outdoors)
  and one opportunity-only tag (Fitness or Fashion, or "Law"), through all 6 screens.
- Project Builder: browse into a category → a project type → confirm Overview/Time
  Commitment/Steps/Resources all render; start a project and confirm its ONE node on the Academic
  Plan is titled with the project type's actual first guide step (not the raw project name) at
  the chosen Start Date. Mark that step complete and confirm a pre-filled, editable next-step
  prompt opens (suggestion = the project type's next guide step); submit it and confirm exactly
  one new node appears, dated to whatever was picked, while the completed step stays visible.
  Repeat through every guide step to confirm the "Mark project complete" / "+ Add another step"
  choice appears once exhausted, and that choosing to add another step opens a genuinely blank
  form (no stale pre-fill). At every point in this cycle, confirm only one incomplete step exists
  for that project — never multiple future/guessed-date steps at once. Confirm "Skip for now" at
  all 3 browse levels jumps straight to `plan` without starting anything.
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
  exists per active stage. Since Map 2 is single-year-scoped, at most one stage's core items are
  ever visible in a given Map 2 view at once, so this reduces to "exactly one GPA check per year
  opened" in practice — `.stage-label` is no longer a usable DOM signal for this (the divider text
  itself was removed from Map 2's rendering; the underlying `stageLabel` data field is still set,
  if you need to check it directly rather than via the DOM).
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
- Course Selection Stage 4 (highschool only): a 9th-grader with Stage 3 selections shows ONE
  `course-request` node (not one per course) on the CURRENT year's Map 2 view, titled "Request
  your [Target Year] courses," Required/solid-ring, with every selected course listed as its own
  `<li>` inside the modal's `courseList`; a 12th-grader (or any `yearSpan === 1` plan) uses
  "Finalize your course registration" instead. Confirm checkpoints exist on every future stage
  except the last (e.g. 9th grade: sophomore + junior get one each, senior gets none; 11th grade:
  zero checkpoints at all, since senior is the only future stage and it's also the last one).
  Open a checkpoint and confirm Part 2 is disabled/locked until Part 1 is done. Complete Part 1
  (add a real transcript entry with a passing grade for a course another course's `prerequisite`
  text references, e.g. "Precalculus" for "AP Calculus AB") and confirm it returns to `plan` with
  `courseCheckpoints[stageName].part1Done` true and `state.gpa` refreshed. Reopen the checkpoint,
  confirm Part 2 is now enabled, and confirm the prerequisite-satisfying course is selectable
  while an unrelated course whose prerequisite isn't met shows locked (muted card, disabled
  Select button, real prerequisite text still visible). Complete Part 2 and confirm the
  checkpoint node is marked complete AND a new `course-request` node appears on that same stage's
  Map 2 view. Confirm editing the due date and removing a `course-request` task both work through
  the plain generic modal (date input + Remove task, with the real-task confirm dialog for
  required nodes) — no special-casing needed there.
- Dashboard/Guide Stage 5 (mascot in-flow dialogue): walk the full flow (Survey through Academic
  Plan/YearOverview) with a fresh `mascotSeenKeys: []` and confirm each screen/sub-step shows its
  correct, correctly-voiced intro line — most reliably done by seeding `localStorage` directly per
  screen (with the right prerequisite state, e.g. `selectedProgramKeys`/`selectedMajorIds` for
  ProgramSummary/CourseSelection) rather than always clicking through the entire flow live, though
  Survey specifically should be tested via real clicks (`.tag`, education-level/grade pills) since
  its dialogue resolution is field-completion-driven, not just a static per-screen key. Confirm the
  widget is dismissible everywhere (click `.mascot-widget-dismiss`, confirm it disappears and the
  underlying form is still fully clickable — a real regression risk given the containing-block/
  portal bug already documented above) and NEVER blocks a real click on the underlying screen
  (assert the click's actual effect, e.g. a selection count changing, not just that the click
  didn't throw). Confirm revisiting an already-completed screen/sub-step shows the shorter
  revisit line (or nothing, for screens with none defined) instead of replaying the full intro —
  for Discovery specifically, test navigating away from a sub-step and back within the SAME
  mounted screen instance (careers -> majors -> back to careers), not just a fresh reload, since
  that in-session revisit path is what the snapshot-based anti-flicker hook has to get right.
  Regression-test the 3 real bugs found building this stage directly rather than just trusting
  they stay fixed: (1) seed a fresh mount and confirm `mascotSeenKeys` gains at most 1 entry within
  ~400ms (no cascade); (2) confirm `.mascot-widget`'s `getBoundingClientRect()` reports a real
  left-edge x-coordinate (well under 100px at a normal viewport width), not offset by
  `.screen-transition`'s centered shell (the containing-block bug); (3) confirm a screen whose
  intro key was already marked seen actually SHOWS its revisit text (or nothing) rather than
  flickering the full intro for one frame before disappearing (the snapshot-hook flicker bug) —
  isolated per-key checks alone won't catch this, it needs the text read immediately after mount,
  not after an arbitrary wait.
- Transcript & GPA Skip/unlock (real, confirmed bug — see Stage 3's own bug-fix note above): seed
  a fresh incoming-freshman-shaped state (High School, partner school selected, empty
  `transcript`) and confirm Course Selection AND Opportunity Finder are both LOCKED on the hub
  beforehand. Click "Skip — I haven't taken any courses yet" on Transcript & GPA and confirm
  `state.gpa` stays `''` (honestly blank — no courses to average) while `state.transcriptCompleted`
  becomes `true`, and that Course Selection/Opportunity Finder both unlock on the hub immediately
  afterward. Separately confirm a REAL, filled-out transcript (at least one entry, Continue instead
  of Skip) still produces a non-blank `gpa` AND sets `transcriptCompleted`, and still unlocks both
  tiles exactly as before — this fix must not change that path. Repeat for the UC Davis variant
  (`UCDavisTranscriptScreen`'s own Skip button and `ucdavisTranscript`).
- Dashboard/Guide Stage 6 (voiceover): monkey-patch `window.speechSynthesis.speak`/`.cancel` in
  place (don't try to reassign `window.speechSynthesis` wholesale — confirmed non-configurable)
  to record calls, then confirm both the hub's own pointing dialogue and a Stage-5 in-flow
  `MascotWidget` line each trigger exactly one `speak()` call whose text matches what's actually
  visible, with a real picked voice and a rate/pitch off the flat 1.0 default. Dismiss a
  `MascotWidget` line mid-speech and confirm `cancel()` fires immediately. Click the header's
  mute toggle and confirm `state.voiceMuted` flips, no further `speak()` calls happen while muted,
  and the muted state survives navigating to a different screen (the toggle itself stays mounted
  across navigation, so this should be automatic — a genuine regression here would mean something
  broke that assumption). Confirm the toggle is entirely absent when `window.speechSynthesis`/
  `window.SpeechSynthesisUtterance` don't exist at all (`delete` both, a real page reload with
  that init script applied) and that the rest of the app — dialogue text, navigation — is
  completely unaffected. Separately, patch `getVoices()` alone to return `[]` (leaving `speak`/
  `cancel` real) and confirm zero `speak()` calls are attempted while dialogue text still renders
  normally.
- "Show Available Voice Options": open the voice settings panel (the gear icon, distinct from the
  mute toggle right next to it — re-verify these are two independently-clickable elements, not the
  same regression the naming-collision bug above already caused once) and confirm the list shows
  more than one real voice with real names, not a single placeholder entry. Click a preview button
  and confirm (via the same `speechSynthesis.speak`/`.cancel` monkey-patch instrumentation the
  Stage 6 tests use) that it fires a real `speak()` call using that exact row's own voice and the
  real mascot sample line, not placeholder text. Pick a voice and confirm `state.voiceURI` is set,
  exactly one row shows as selected, and — a real, non-obvious behavior worth checking
  specifically — the currently-displayed mascot line re-speaks immediately in the new voice rather
  than waiting for the next natural dialogue change. Reload onto a DIFFERENT screen entirely (e.g.
  Survey) with that same `voiceURI` already in state and confirm its own in-flow mascot dialogue
  speaks using that exact voice too — the pick has to be honored app-wide, not just from within
  the panel that set it. Confirm picking "Default (auto-picked)" clears `state.voiceURI` back to
  `null`.
