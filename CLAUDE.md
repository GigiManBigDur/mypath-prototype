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
(`welcome → survey → admissions → discovery → transcript → courseSelection → programSummary →
opportunities → projectBuilder → plan`). Screens advance by calling `patch({ screen: 'next' })` — there's no URL
routing, back/forward is handled by explicit "Back" buttons that patch `screen` backwards.
`welcome` is `DEFAULT_STATE.screen` (`AppContext.jsx`), but only ever shown to a genuinely fresh
visitor — `loadInitialState()` spreads any stored state *over* the default, so a returning user
whose saved `screen` is anything else (e.g. `'plan'`) resumes exactly where they left off, never
bounced back to the welcome hero. `App.jsx`'s small persistent "MyPath — prototype" brand bar is
hidden specifically on `welcome` (`state.screen !== 'welcome'`) since that screen has its own
large "MyPath" hero title — showing both stacked would read as duplicated branding.

**`programSummary` (the Reach/Match/Safety Summary — see its own section below) sits right before
`opportunities` for EVERY education level**, which is what the High-School-only skip below
actually resolves *to* now, not `opportunities` directly.

**`transcript`/`courseSelection` (Course Selection Stages 2-3) are High-School-only screens —
Undergraduate/Transfer never see them**, since those levels have no partner college yet and the
whole feature (school selector, transcript entry, course catalog browsing) only makes sense for a
Roslyn High School student. This is a second, independent skip layer on top of the `discovery`
skip below, and both are computed the same way at every routing decision point: a shared
`const afterX = state.educationLevel === 'highschool' ? 'transcript' : 'programSummary'`-style
variable, never an inlined ternary repeated per callsite (this codebase's established pattern for
multi-site conditional routing — see the `getBuiltTracks`-driven skip below for the precedent).
Concretely:
- `SurveyScreen`'s school-selector field block, and the `!!state.currentSchool` clause in
  `canContinue`, are both wrapped in `isHighSchool` — Undergraduate/Transfer see neither the field
  nor the requirement.
- `AdmissionsOverviewScreen`'s Continue button goes to `discovery` if a built track was selected,
  else `afterDiscoverySkip` (`'transcript'` for High School, `'programSummary'` otherwise).
- `DiscoveryScreen`'s defensive zero-built-track bounce, and its own final-substep Continue
  button, both target the same computed `afterDiscovery` (`'transcript'` for High School, else
  `'programSummary'`) — this is a per-file-recomputed variable, not shared code, since each screen
  reads `state.educationLevel` itself.
- `TranscriptScreen` and `CourseSelectionScreen` each carry their own defensive `useEffect` that
  bounces straight to `'programSummary'` if `state.educationLevel !== 'highschool'` (mirroring
  `DiscoveryScreen`'s own zero-built-track defensive bounce) — belt-and-suspenders in case state is
  ever restored mid-flow after `educationLevel` changed, since routing alone already never sends a
  non-High-School student to either screen. `CourseSelectionScreen`'s own real (non-checkpoint)
  Continue button also targets `'programSummary'`, same as every other path into it.
- `ProgramSummaryScreen`'s own Back button computes `backTarget`: `'courseSelection'` for High
  School (always — Course Selection is never itself conditionally skipped for them, so it's always
  the real previous screen), or the exact pre-Course-Selection discovery-skip mirror
  (`hasBuiltTrack ? 'discovery' : 'admissions'`) for Undergraduate/Transfer, who never see the
  Transcript/Course-Selection stretch at all — this is the exact logic `OpportunityFinderScreen`'s
  own Back button used to carry before `programSummary` was inserted in front of it;
  `OpportunityFinderScreen`'s Back button is now unconditionally `'programSummary'` for every
  level, since that's always the real previous screen now regardless of education level or
  Discovery-skip status.

**The `discovery` screen is separately, conditionally skipped** (orthogonal to the High-School
gating above — this skip is about *interests*, not *education level*, and applies to every
level): `AdmissionsOverviewScreen`'s Continue button routes to `afterDiscoverySkip` instead of
`discovery` when the user has no built-track interest selected, and `DiscoveryScreen`'s Back
button routes to `admissions` in that same case. `DiscoveryScreen` also has a defensive `useEffect`
that bounces to `afterDiscovery` if it's ever reached with zero built tracks (e.g. state restored
from `localStorage` after interests changed). `ProjectBuilderScreen` (see below) sits between
`opportunities` and `plan` — unlike `discovery` it's never skipped by routing logic, since it's
fully optional in place via its own persistent "Skip for now" control rather than being bypassed
based on user data. `StepProgress`'s `total` is `9` everywhere now (was `8`) to match
`programSummary` joining the flow — see each screen's own `step={N}` for its position
(Undergraduate/Transfer students simply pass through steps 4-5 without seeing them rendered,
same as they already silently skip step 3's `discovery` substeps when it's skipped).

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
  per-file-recomputed-variable convention (see the High-School-skip note earlier in this section)
  — `AdmissionsOverviewScreen`'s `afterDiscoverySkip`, `DiscoveryScreen`'s `afterDiscovery`, and
  `ProgramSummaryScreen`'s `backTarget` all now route a UC-Davis-selecting college student through
  `transcript`/`courseSelection` exactly like a High School student, while every other
  Undergraduate/Transfer student (no school, or a currently-unsupported one) is routed completely
  unaffected, exactly as before this feature.
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
