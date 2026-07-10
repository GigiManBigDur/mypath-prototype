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
(`welcome → survey → admissions → discovery → opportunities → projectBuilder → plan`). Screens
advance by calling `patch({ screen: 'next' })` — there's no URL routing, back/forward is handled
by explicit "Back" buttons that patch `screen` backwards. `welcome` is `DEFAULT_STATE.screen`
(`AppContext.jsx`), but only ever shown to a genuinely fresh visitor — `loadInitialState()`
spreads any stored state *over* the default, so a returning user whose saved `screen` is
anything else (e.g. `'plan'`) resumes exactly where they left off, never bounced back to the
welcome hero. `App.jsx`'s small persistent "MyPath — prototype" brand bar is hidden specifically
on `welcome` (`state.screen !== 'welcome'`) since that screen has its own large "MyPath" hero
title — showing both stacked would read as duplicated branding. **The `discovery` screen is conditionally
skipped**: `AdmissionsOverviewScreen`'s Continue button routes straight to `opportunities`
when the user has no built-track interest selected, and `OpportunityFinderScreen`'s Back
button routes to `admissions` (not `discovery`) in that same case. `DiscoveryScreen` also
has a defensive `useEffect` that bounces to `opportunities` if it's ever reached with zero
built tracks (e.g. state restored from `localStorage` after interests changed).
`ProjectBuilderScreen` (see below) sits between `opportunities` and `plan` — unlike `discovery`
it's never skipped by routing logic, since it's fully optional in place via its own persistent
"Skip for now" control rather than being bypassed based on user data.

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
(when more than one stage is in play) carries a `stageLabel` that `Roadmap.jsx` renders as a
small "— Sophomore Year —" divider; a 12th-grader/4th-year/non-transfer-2nd-3rd-year student
still gets exactly one stage, so `stageLabel` is never set. Transfer students 2+ years out keep
the single `application` stage as-is (transfer timelines vary too much to model precisely) but
get a `caveatNote` string (`TRANSFER_CAVEAT`) surfaced as a banner near the top of
`Roadmap.jsx` instead of a fabricated multi-year transfer plan.

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
always derived from actual content afterward, never assumed.**

**`MIN_SPINE_GAP` was lowered from 90 to 45 after a real bug: the forward-only minimum-gap pass
can compound.** Every spine item's clamp check compares its own raw date-based y against the
*previous item's actual rendered y* (necessarily — that's the only way to guarantee no visual
overlap), not against the previous item's own true date. When several real gaps in a row each
fall just under the floor (a genuinely common pattern in this app's trunk data — many core
milestones are naturally 2–4 weeks apart), each clamp nudges the next item forward a little, and
that nudge carries into the *next* check too. Confirmed empirically on a real senior-year stretch:
after 5-6 chained clamps, one milestone with a perfectly comfortable true 49-day/147px gap from
its predecessor still got compressed all the way down to the 90px floor, purely because its
predecessor had already drifted 129px off its own true position — i.e. that node's position was
no longer "calculated independently from its own real date," which is exactly the invariant this
file exists to guarantee. This wasn't a stray uniform/index-based formula anywhere (there never
was one — `y = -t * PIXELS_PER_DAY` was always the base case) — it was this compounding making
long stretches of genuinely-varied real dates visually read as evenly spaced. Halving the floor
to 45 (≈15 real days, still comfortably more than the ~44px a node's largest animated hit-target
reaches, so dot-to-dot collision is still prevented) resolved it for realistic data: verified with
the same senior-year stretch that no milestone falsely clamps anymore, gaps now visibly range from
~45px (a couple of weeks apart) up to 585px (Freshman → Sophomore GPA checks), and label overlap
count stayed at zero on a dense multi-opportunity plan. Some compounding across a *long run* of
genuinely sub-15-day real gaps is still mathematically possible (a hard floor for legibility and
perfect date-proportionality can't both hold for an arbitrarily dense cluster) — that's an
inherent trade-off of any minimum-gap system, not a bug, and 45 was chosen specifically so it no
longer bites this app's actual, realistic milestone spacing.

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
~2-year window anchored at "today," not the whole plan** — auto-fitting an entire multi-year plan
(e.g. a 9th-grade 4-year plan) on first load zoomed everything out so far it read as tiny and
cramped. `roadmapLayout.js` positions today a fixed `BOTTOM_MARGIN` above the canvas's bottom
edge and everything else strictly further from today the further in the future it is, so
`roadmap.today.y` (exported alongside `PIXELS_PER_DAY` from `roadmapLayout.js`) is itself
proportional to the plan's total time-span in pixels — `fitView()` computes `effectiveTop =
max(0, today.y - 2 years in px)` and fits the region from `effectiveTop` down to the canvas
bottom, instead of the whole canvas. **This reduces to the exact old full-plan-fit behavior
whenever the plan's real span is already ≤ 2 years** (`effectiveTop` comes out to 0, no branch
needed to special-case it) — a 12th-grade 1-year plan is unaffected. Manual zoom (wheel/pinch/
buttons) and pan are completely untouched by this — a student who wants the full multi-year span
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

## Design tokens

`src/styles/global.css` holds all fonts/colors as CSS custom properties (`--paper`, `--ink`,
`--gold`, `--teal`, `--rust`, `--stone`, etc.) plus the roadmap-specific classes originally
ported from the reference prototype (paper/trail-map palette, Fraunces/IBM Plex fonts). Match
these tokens rather than introducing new colors when building new UI.

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
narrower scope**: `TRANSITION_SCREENS` in `App.jsx` (`survey`, `admissions`, `discovery`,
`opportunities`, `projectBuilder`) wraps just those screens in a `.screen-transition` div keyed
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
N of 6</div>` text on Survey/Admissions/Discovery/OpportunityFinder/ProjectBuilder with an
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
  `100%`/`100%` of its full-bleed parent instead of a fixed box.
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
  are computed exactly as before. It does not change the zoom level, `effectiveTop`'s 2-year-
  window cap, or `panX` — only shifts the vertical framing up enough to guarantee "today" isn't
  covered by default. `handleResetView`/the crosshair button re-run this (picking up the current
  collapse state); toggling the panel itself does not trigger a re-fit (no `fitView` call on
  `panelCollapsed` change), so the clearance is deliberately generous enough to be correct in
  both states without needing to react to every toggle.

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
