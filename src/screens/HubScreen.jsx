import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, Briefcase, GraduationCap, Landmark, FileText, BookOpen, Search, Hammer,
  Map as MapIcon, ListChecks, Lock, ArrowRight, RotateCcw, Leaf, Bell, User,
  Volume2, VolumeX, TrendingUp, Zap, Plus, Bug, X, Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSurveyComplete } from './SurveyScreen';
import { AVATAR_OPTIONS } from './SignUpScreen';
import MascotIcon from '../components/MascotIcon';
import AddTaskModal from '../components/AddTaskModal';
import HubChatPanel from '../components/HubChatPanel';
import { makeTaskId } from '../utils/ids';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { compileStudentProfile } from '../utils/profileCompiler';
import { startOfToday, parseDateInputValue, realDaysBetween } from '../utils/dates';
import { ADMISSIONS_CONTEXT_LINES, getMascotLine } from '../data/mascotDialogue';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { useMarkMascotSeen, useMascotSeenSnapshot } from '../hooks/useMascotSeen';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Dashboard/Guide feature, Stage 2/3 (see CLAUDE.md) — the central hub, now the landing screen
// after sign-up (replacing the old direct-to-survey entry). Stage 2 was layout + mascot + working
// navigation only, with no order enforcement at all. Stage 3 adds real lock/unlock: every tile
// still navigates to a real, already-built screen (no new screens here), but a locked tile is
// disabled and shows why, instead of just quietly doing nothing when clicked. `unlock` and
// `lockedReason` are both `(state, hasPartnerSchool) => value` for a uniform shape even though
// most tiles ignore `hasPartnerSchool` — only Opportunity Finder's condition actually depends on
// it. `state.transcriptCompleted` is "Transcript & GPA is done or was explicitly skipped" — set
// by TranscriptScreen's own `advance()` (Continue AND Skip both call it) the moment either one is
// submitted. This used to be `state.gpa !== ''` instead, which broke for a genuine incoming
// freshman with zero prior courses: Skip calls the same `advance()` Continue does, and an empty
// transcript's own GPA is honestly blank (nothing to average), so `gpa !== ''` stayed false even
// after a real, deliberate skip — the hub read that as "never visited," not "done." The dedicated
// flag fixes this without touching `state.gpa`'s own "don't guess" semantics, which every other
// GPA-aware consumer in this app (ProgramsStep, reachMatchSafetyTag) still depends on unchanged.
// Bug fix: Transcript & GPA / Course Selection used to be filtered out of `TILES` entirely
// (never rendered at all, not even locked) until AFTER the survey revealed whether the student
// picked a partner school — inconsistent with every other tile on this hub, which always stays
// visible-but-locked rather than disappearing. The real distinction that matters is whether
// eligibility is still UNKNOWN (survey not done yet — genuinely can't say either way) vs. KNOWN
// (survey done, and no partner school was selected — genuinely doesn't apply, so hiding really is
// correct there). `partnerSchoolGate` wraps a tile's own real Stage 3 `unlock`/`lockedReason` pair
// so both tiles keep their EXACT existing unlock rules once eligibility is known, while showing a
// single shared, honest placeholder reason before it is — this is a display-only wrapper, it
// doesn't change what "unlocked" means for either tile once the real check can run.
const SURVEY_PENDING_REASON = 'Complete the survey to see if this applies to you';
function partnerSchoolGate(unlockFn, lockedReasonFn) {
  return {
    unlock: (state, hasPartnerSchool) => isSurveyComplete(state) && unlockFn(state, hasPartnerSchool),
    lockedReason: (state, hasPartnerSchool) => (isSurveyComplete(state) ? lockedReasonFn(state, hasPartnerSchool) : SURVEY_PENDING_REASON),
  };
}

const TILES = [
  {
    id: 'survey', screen: 'survey', Icon: ClipboardList,
    title: "Let's Build Your Plan",
    desc: 'Tell us your interests, grade, and school to get started.',
    unlock: () => true,
  },
  {
    id: 'careers', screen: 'discovery', discoveryEntryStep: 'careers', Icon: Briefcase,
    title: 'Careers of Interest',
    desc: 'Explore careers that match what excites you.',
    unlock: (state) => isSurveyComplete(state),
    lockedReason: () => "Complete Let's Build Your Plan first",
  },
  {
    id: 'majors', screen: 'discovery', discoveryEntryStep: 'majors', Icon: GraduationCap,
    title: 'Related College Majors',
    desc: 'See majors that lead toward your chosen careers.',
    unlock: (state) => state.selectedCareerIds.length > 0,
    lockedReason: () => 'Select at least one career first',
  },
  {
    id: 'programs', screen: 'discovery', discoveryEntryStep: 'programs', Icon: Landmark,
    title: 'Recommended Programs',
    desc: 'Browse real schools known for your selected majors.',
    unlock: (state) => state.selectedMajorIds.length > 0,
    lockedReason: () => 'Select at least one major first',
  },
  {
    // Deliberately unlocked as soon as a program is selected, same gate as Your School List
    // right below it — not gated behind Transcript & GPA/Course Selection/Opportunities, since
    // the Academic Plan is meant to be revisited constantly as more gets added to it, not
    // something only reachable once every later step is done. Also deliberately NOT part of
    // GUIDED_SEQUENCE below (Stage 4) — the mascot never force-points at it mid-sequence, only
    // offers it as the natural endpoint once the real sequence is finished.
    id: 'plan', screen: 'plan', Icon: MapIcon,
    title: 'Academic Plan',
    desc: 'Your personalized roadmap, task by task.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
  {
    id: 'programSummary', screen: 'programSummary', Icon: ListChecks,
    title: 'Your School List',
    desc: 'Your selected programs, grouped by Reach, Match, and Safety.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
  {
    // Always visible, from the very first hub view — before the survey, eligibility is genuinely
    // unknown, so this stays locked with a shared placeholder reason (`partnerSchoolGate`) rather
    // than disappearing; only once the survey reveals NO partner school was selected does it get
    // filtered out below (the one case where hiding, not locking, is actually correct — the
    // answer is known for certain by then). `requiresPartnerSchool` is read by that same filter,
    // and ONLY applies post-survey — see the `tiles` filter in HubScreen() itself.
    id: 'transcript', screen: 'transcript', Icon: FileText,
    title: 'Transcript & GPA',
    desc: 'Log your grades and see your calculated GPA.',
    requiresPartnerSchool: true,
    ...partnerSchoolGate(
      (state) => state.selectedProgramKeys.length > 0,
      () => 'Select at least one program first',
    ),
  },
  {
    id: 'courseSelection', screen: 'courseSelection', Icon: BookOpen,
    title: 'Course Selection',
    desc: "Pick next year's courses from your school's real catalog.",
    requiresPartnerSchool: true,
    ...partnerSchoolGate(
      (state) => state.transcriptCompleted,
      () => 'Complete or skip Transcript & GPA first',
    ),
  },
  {
    // Partner-school users follow the real screen-flow order (transcript -> courseSelection ->
    // opportunities), so this unlocks at the same point Course Selection itself does, not a step
    // later — Course Selection has no hard completion gate of its own in the real flow either
    // (its own Continue always advances regardless of whether any courses were picked). Everyone
    // else has no Transcript & GPA/Course Selection step to wait on at all, so it falls back to
    // the same "at least one program selected" gate most other tiles use.
    id: 'opportunities', screen: 'opportunities', Icon: Search,
    title: 'Opportunity Finder',
    desc: 'Find real competitions, clubs, and programs worth pursuing.',
    unlock: (state, hasPartnerSchool) => (hasPartnerSchool ? state.transcriptCompleted : state.selectedProgramKeys.length > 0),
    lockedReason: (state, hasPartnerSchool) => (hasPartnerSchool ? 'Complete or skip Transcript & GPA first' : 'Select at least one program first'),
  },
  {
    id: 'projectBuilder', screen: 'projectBuilder', Icon: Hammer,
    title: 'Project Builder',
    desc: 'Start a hands-on project to build your portfolio.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
  },
];

// Dashboard/Guide feature, Stage 4 (see CLAUDE.md) — the PRIMARY sequence the mascot actively
// guides the user through, deliberately distinct from each tile's own Stage 3 `unlock` condition
// above. Unlock controls what's clickable; this controls what the mascot points at as "the next
// thing to do." Academic Plan and Your School List are excluded on purpose — they unlock early
// per Stage 3 and stay available the whole time, but the mascot never force-points at them
// mid-sequence, only offers Academic Plan as the natural endpoint once every step here is done
// (see `getNextGuidedStep` below). `isDone` for each step reuses the exact same real state signal
// that step's own tile (or the NEXT tile's `unlock`) already checks — e.g. "Careers of Interest is
// done" is the same `selectedCareerIds.length > 0` check that unlocks Related College Majors —
// not a new completion concept invented just for the mascot. Dialogue lines are short/generic
// placeholders per this stage's own explicit scope; real varied dialogue is Stage 5.
const GUIDED_SEQUENCE = [
  {
    id: 'survey', requiresPartnerSchool: false,
    isDone: (state) => isSurveyComplete(state),
    intro: "Let's start by building your plan!",
  },
  {
    id: 'careers', requiresPartnerSchool: false,
    isDone: (state) => state.selectedCareerIds.length > 0,
    // "Return to Hub" routing restructure (see CLAUDE.md) — Admissions Overview was retired as
    // its own standalone screen; this is the ONE dialogue entry in this whole sequence that's a
    // function of `state` rather than a plain string, since the condensed admissions-context
    // blurb it opens with varies by `state.educationLevel` (see ADMISSIONS_CONTEXT_LINES,
    // mascotDialogue.js). Falls back to the High School line for the (unreachable in practice,
    // since Survey requires picking a level to ever reach here) case of a missing/unrecognized
    // level, rather than rendering nothing.
    intro: (state) => `Quick context: ${ADMISSIONS_CONTEXT_LINES[state.educationLevel] || ADMISSIONS_CONTEXT_LINES.highschool} Now, let's figure out what excites you.`,
  },
  {
    id: 'majors', requiresPartnerSchool: false,
    isDone: (state) => state.selectedMajorIds.length > 0,
    intro: "Let's see which majors fit those careers.",
  },
  {
    id: 'programs', requiresPartnerSchool: false,
    isDone: (state) => state.selectedProgramKeys.length > 0,
    intro: 'Time to browse some real programs!',
  },
  {
    id: 'transcript', requiresPartnerSchool: true,
    isDone: (state) => state.transcriptCompleted,
    intro: "Let's log your grades and calculate your GPA.",
  },
  {
    id: 'courseSelection', requiresPartnerSchool: true,
    // UC Davis and Roslyn track selected courses in two deliberately separate fields (see
    // AppContext.jsx) — check whichever one applies to this student's own partner school.
    isDone: (state) => (state.currentSchool === 'UC Davis'
      ? state.selectedUCDavisCourseIds.length > 0
      : state.selectedCourseIds.length > 0),
    intro: "Let's pick out next year's courses.",
  },
  {
    id: 'opportunities', requiresPartnerSchool: false,
    isDone: (state) => state.selectedOpportunityIds.length > 0,
    intro: "Let's find some real opportunities worth pursuing.",
  },
  {
    id: 'projectBuilder', requiresPartnerSchool: false,
    // Project Builder is explicitly optional/skippable content (its own screen has a persistent
    // "Skip for now" control) — "done" here means the student actually started a project, a real
    // trackable action, same "did they do something real" shape every earlier step's isDone
    // already uses (select a career/major/program, log a GPA, pick a course, save an
    // opportunity).
    // Bug fix (see CLAUDE.md) — there used to be no separate "explicitly skipped" flag to check
    // instead, so a student who deliberately skipped this step was indistinguishable from one who
    // simply hadn't reached it yet: the hub kept treating the sequence as unfinished, repeatedly
    // pointing back at Project Builder and never recognizing Academic Plan as the natural
    // endpoint. `state.projectBuilderSkipped` (set by ProjectBuilderScreen's own "Skip for now"
    // button) is that dedicated flag — mirrors `transcriptCompleted`'s own "done OR explicitly
    // skipped" shape for the Transcript & GPA step.
    isDone: (state) => state.startedProjects.length > 0 || state.projectBuilderSkipped,
    intro: 'Ready to start a hands-on project?',
  },
];

// Bug fix (see CLAUDE.md) — reworded slightly toward a clearer one-time "you're all set" framing
// (was "Your plan is really coming together! Come back anytime."), now that this line is
// genuinely shown exactly once rather than blending into the ongoing generic "keep going"
// acknowledgment it used to fall through to afterward.
const ENDPOINT_STEP = { id: 'plan', intro: "You've made it through the whole guide — your plan is ready! Come back anytime to keep building on it." };

// Re-evaluated fresh from `state` on every render — nothing here is cached from a previous visit,
// so returning to the hub after finishing a step always reflects the CURRENT next incomplete step,
// per this stage's own explicit requirement.
function getNextGuidedStep(state, hasPartnerSchool) {
  const relevant = GUIDED_SEQUENCE.filter((s) => !s.requiresPartnerSchool || hasPartnerSchool);
  return relevant.find((s) => !s.isDone(state)) || ENDPOINT_STEP;
}

// Hub redesign (see CLAUDE.md) — the reference image's own "1/6" step-position indicator, rebuilt
// here from REAL guided-sequence data rather than invented: `relevant.length` and the current
// step's own 1-based position within it (the endpoint counts as the final, completed position, not
// a synthetic extra step). No "AI" framing anywhere in this — it's a plain progress readout over
// GUIDED_SEQUENCE, the same real data `getNextGuidedStep` already derives. Also reused as-is by
// the radial-layout pass's "Your Progress" card for the real "Milestones reached" stat below.
function getGuidedProgress(state, hasPartnerSchool) {
  const relevant = GUIDED_SEQUENCE.filter((s) => !s.requiresPartnerSchool || hasPartnerSchool);
  const doneCount = relevant.filter((s) => s.isDone(state)).length;
  const currentIndex = Math.min(doneCount, relevant.length - 1);
  return { total: relevant.length, currentIndex, doneCount };
}

// Radial-layout pass, Task 3's "Your Progress" card (see CLAUDE.md) — "Tasks completed" is a real
// count over the FULL multi-year Academic Plan (generateRoadmap(state) with no yearWindow returns
// the whole unfiltered spine, the same one AcademicPlanScreen.jsx's own useMemo pattern calls),
// not just whatever single year Map 2 happens to be scoped to. A spine item with `branchSteps`
// (an opportunity or a started project) has its real completable units spread across those steps
// PLUS the item's own anchor — since the "Remove Anchor Node, Promote First Step to the Spine"
// restructure (see CLAUDE.md), an opportunity's own anchor IS one of its real steps (the first
// one, individually toggled via completedNodes exactly like any other core item; see
// roadmapGenerator.js's buildFirstYearChain/buildEscalationChain comments), the same way a
// project's own anchor already was (buildProjectChain). Both are counted here uniformly — there's
// no more "derived, no real completedNodes entry" anchor of any kind left to exclude.
function countPlanTasks(roadmap, completedNodes) {
  let total = 0;
  let completed = 0;
  const countOne = (id) => {
    total += 1;
    if (completedNodes[id]) completed += 1;
  };
  roadmap.spine.forEach((item) => {
    countOne(item.id);
    if (item.hasBranch) (item.branchSteps || []).forEach((step) => countOne(step.id));
  });
  return { completed, total };
}

// Hub redesign (see CLAUDE.md) — a small fixed VIVID palette cycled per tile via inline
// `--tile-accent-bg`/`--tile-accent-fg` custom properties, the same "data/JSX picks the value,
// CSS just reads a custom property" convention ProjectBuilderScreen.jsx's own `--pb-accent`
// cycling already established — not a new pattern invented for this redesign. Task 2's own named
// color list (purple, yellow, teal, orange, pink, blue, green), each paired with whichever icon
// color (white, or dark ink for the lighter yellow) actually reads clearly on top of it. Locked
// tiles never read this palette at all (global.css's own `.hub-tile.locked .hub-tile-icon-box`
// override wins) — they stay muted/grey regardless of a tile's own accent index.
//
// Palette repaint (see CLAUDE.md) — these reference the shared `--bloom-*` tokens (global.css's
// own `:root` block) rather than repeating the same hex values a second time here, now that a
// second screen (Sign-Up's own avatar picker) reuses the identical 6 of these 7 colors.
const TILE_ACCENTS = [
  { bg: 'var(--bloom-purple)', fg: '#ffffff' },
  { bg: 'var(--bloom-yellow)', fg: '#20241C' },
  { bg: 'var(--bloom-teal)', fg: '#ffffff' },
  { bg: 'var(--bloom-orange)', fg: '#ffffff' },
  { bg: 'var(--bloom-pink)', fg: '#ffffff' },
  { bg: 'var(--bloom-blue)', fg: '#ffffff' },
  { bg: 'var(--bloom-green)', fg: '#ffffff' },
];

// Radial-layout pass, Task 1 (see CLAUDE.md) — hand-tuned percentage slots (of `.hub-radial-wrap`'s
// own box) forming a loose ring of up to 10 tiles around the centered mascot, scattered left/right
// of the vertical center column the mascot + its dialogue bubble occupy so nothing ever overlaps
// them. Assigned by plain tile INDEX (`tiles[i]` -> `RADIAL_POSITIONS[i]`), not tile identity —
// which real tile lands in which visual slot can shift a little when `hasPartnerSchool` toggles
// (Transcript & GPA/Course Selection insert into the middle of the array), the same acceptable
// trade the old grid's own CSS auto-flow already made. A real physics/collision layout was
// considered and rejected for a purely decorative composition like this one — fixed, hand-checked
// slots are simpler and can't drift into overlap the way a runtime algorithm tuned for only 8-10
// items could.
const RADIAL_POSITIONS = [
  { x: 22, y: 8 },
  { x: 78, y: 8 },
  { x: 8, y: 27 },
  { x: 92, y: 27 },
  { x: 4, y: 48 },
  { x: 96, y: 48 },
  { x: 10, y: 69 },
  { x: 90, y: 69 },
  { x: 26, y: 88 },
  { x: 74, y: 88 },
];

// Radial-layout pass, Task 1's "small decorative floating dots/particles" — purely visual flavor,
// fixed positions/colors/sizes (reusing TILE_ACCENTS's own vivid palette for cohesion), no data
// behind any of it. Deliberately kept out of the center column the mascot/dialogue occupy, same
// as the tile slots above.
const PARTICLES = [
  { x: 34, y: 12, size: 7, color: '#8B5CF6' },
  { x: 66, y: 10, size: 6, color: '#F0B429' },
  { x: 16, y: 34, size: 8, color: '#14B8A6' },
  { x: 84, y: 32, size: 6, color: '#F0923B' },
  { x: 30, y: 46, size: 5, color: '#EC6FA0' },
  { x: 70, y: 44, size: 7, color: '#3B82F6' },
  { x: 20, y: 62, size: 6, color: '#22C55E' },
  { x: 80, y: 60, size: 8, color: '#8B5CF6' },
  { x: 38, y: 80, size: 5, color: '#F0B429' },
  { x: 62, y: 82, size: 6, color: '#14B8A6' },
  { x: 46, y: 18, size: 5, color: '#F0923B' },
  { x: 54, y: 96, size: 6, color: '#EC6FA0' },
];

// Task 3's own decorative quote card, shown purely as visual flavor — same "this app never
// fabricates a source" posture the rest of this codebase already holds for any quoted/cited text,
// this one's just an inspirational quote with a real, correctly-attributed author, not a stat.
const QUOTE = { text: 'A goal without a plan is just a wish.', author: 'Antoine de Saint-Exupéry' };

export default function HubScreen() {
  const { state, patch, reset } = useApp();

  const hasPartnerSchool = state.currentSchool === 'Roslyn High School' || state.currentSchool === 'UC Davis';
  // Bug fix — `requiresPartnerSchool` now only ever hides a tile once eligibility is actually
  // KNOWN (survey complete) and turned out to be "no partner school." Before the survey, it's
  // simply unknown, so the tile stays visible-but-locked instead of disappearing — see
  // `partnerSchoolGate` above for the matching `unlock`/`lockedReason` half of this fix.
  const tiles = TILES.filter((t) => !t.requiresPartnerSchool || !isSurveyComplete(state) || hasPartnerSchool);
  const nextStep = getNextGuidedStep(state, hasPartnerSchool);
  // Bug fix (see CLAUDE.md) — `getNextGuidedStep` returns the literal `ENDPOINT_STEP` constant
  // once every real GUIDED_SEQUENCE step is done, rather than a step actually IN that sequence —
  // a reference-equality check against that same constant is what distinguishes "the primary
  // sequence is genuinely finished" from "there's a real next step, and it happens to be the last
  // one," since `ENDPOINT_STEP.id` ('plan') isn't a step id any real sequence entry ever uses.
  const sequenceComplete = nextStep === ENDPOINT_STEP;
  // Every other step's `intro` is a plain string; the 'careers' step's own is a function of
  // `state` (see GUIDED_SEQUENCE above) since its condensed admissions-context blurb varies by
  // education level — resolved once here rather than inline in the JSX below.
  const nextStepFullIntro = typeof nextStep.intro === 'function' ? nextStep.intro(state) : nextStep.intro;
  // Bug fix (see CLAUDE.md) — the hub's own guided-sequence dialogue used to replay this full
  // line on every single hub visit, for as long as the current step stayed unfinished, since it
  // was never wired into the mascotSeenKeys "seen once, ever" system every OTHER screen's
  // in-flow dialogue already respects (Stage 5's `useMascotIntroThenRevisit`, etc.). Reuses the
  // EXACT same anti-flicker snapshot/mark-seen pair those screens use, keyed per guided-sequence
  // step id (`hub-guided-${nextStep.id}` — namespaced so it can never collide with an unrelated
  // key, e.g. YearOverview.jsx's own separate `'plan-intro'`/`'plan-revisit'`, even though the
  // guided sequence's own endpoint step happens to share the literal id `'plan'` with the
  // Academic Plan tile). Once a given step's real line has been shown once, every later hub visit
  // — for as long as that SAME step remains the current one — shows one shared, generic,
  // freely-repeatable acknowledgment instead (`hub-guided-revisit`, mascotDialogue.js), never the
  // original full line again. The moment the guided step actually ADVANCES to a new one, its own
  // real line plays in full for the first time, exactly as before.
  //
  // Bug fix (see CLAUDE.md) — that shared "keep going" acknowledgment is exactly wrong once
  // `sequenceComplete` is true: there IS no next step to keep going to. The one-time completion
  // message (ENDPOINT_STEP's own real text) still plays in full the first time this state is
  // reached — it goes through the SAME `guidedStepSeenKey`/`guidedStepAlreadySeen` mechanism every
  // other step already uses, so nothing new was needed to make that part "once, ever" — but once
  // it's been seen, this now falls through to `null` (nothing shown) instead of the generic
  // hub-guided-revisit line, matching the fix's own explicit "after that single acknowledgment,
  // don't show either message again" requirement.
  const guidedStepSeenKey = `hub-guided-${nextStep.id}`;
  const guidedStepAlreadySeen = useMascotSeenSnapshot(guidedStepSeenKey);
  useMarkMascotSeen(guidedStepAlreadySeen ? null : guidedStepSeenKey);
  const nextStepIntro = guidedStepAlreadySeen
    ? (sequenceComplete ? null : getMascotLine('hub-guided-revisit'))
    : nextStepFullIntro;
  // Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — the hub's own pointing dialogue speaks
  // aloud too, same shared mechanism MascotWidget uses for every other screen's in-flow dialogue.
  // There's no "dismiss" concept for this always-visible bubble, so it just speaks whenever
  // `nextStepIntro` changes (advancing to a new guided step, or the seen-state flipping to the
  // generic revisit line) and stops on unmount (navigating away from the hub) — both handled
  // inside the hook itself. Radial-layout pass, Task 4 — the hook's own returned boolean now also
  // drives the mascot's distinct "speaking" animation state.
  const isSpeaking = useMascotSpeech(nextStepIntro, state.voiceMuted);

  // Polished Hub-to-Chat Transition (see CLAUDE.md) — the chat's own replies also speak through
  // the SAME single mascot instance (it "stays anchored," never duplicated), via a second,
  // independent useMascotSpeech call fed by whatever HubChatPanel reports up through
  // `onAssistantReply`. The two never fire at once in practice — guided-sequence dialogue only
  // ever renders while `chatPhase === 'hidden'`, chat replies only ever arrive while in chat mode
  // — so ORing their two `isSpeaking` booleans together for MascotIcon's own `speaking` prop below
  // is safe, not a race.
  const [chatSpeakingText, setChatSpeakingText] = useState(null);
  const isChatSpeaking = useMascotSpeech(chatSpeakingText, state.voiceMuted);

  const goTo = (tile) => {
    // `discoveryEntryStep` is a one-shot signal, not a durable field — DiscoveryScreen reads it
    // once (as its initial subStep) and clears it right back to null on mount, the same
    // read-once-then-clear shape `activeCourseCheckpoint`/`activeUCDavisCheckpoint` already use
    // elsewhere in this app, so a LATER hub click into Discovery is never left starting on a
    // stale sub-step from an earlier visit.
    patch({ screen: tile.screen, ...(tile.discoveryEntryStep ? { discoveryEntryStep: tile.discoveryEntryStep } : {}) });
  };

  // A testing convenience, not a primary user-facing feature — see CLAUDE.md — so it's
  // deliberately small/muted (`.hub-reset-btn`, styled dimmer than `.btn-ghost`'s already-quiet
  // default) rather than sitting alongside the tile grid's own real actions. `window.confirm` is
  // the same lightweight, synchronous confirmation pattern this codebase already uses for another
  // real "are you sure" moment (Roadmap.jsx's own required-task removal) — no need for a bespoke
  // modal just for this. `reset()` (AppContext.jsx) already clears every field back to
  // DEFAULT_STATE — including `screen: 'welcome'` — and wipes localStorage, so returning to the
  // welcome screen with zero leftover state is just what calling it already does; nothing else
  // needs to happen here. Radial-layout pass — Quick Actions' own "Start Over" wires to this exact
  // same handler, per Task 3's own instruction, rather than duplicating the confirm/reset logic.
  const handleReset = () => {
    if (window.confirm('Are you sure? This will erase all progress.')) reset();
  };

  // Sign-Up: Country field (see CLAUDE.md) — the optional "preferred display name" field this
  // greeting used to prefer over `username` was removed (replaced by `state.country`, plain data
  // collection with no logic of its own yet), so the greeting now just reads `username` directly
  // — it's guaranteed non-blank by the time a user can ever reach the hub (SignUpScreen's own
  // `canContinue` gate), so there's no "not set yet" case to handle here either way.
  const greetingName = state.username;
  const guidedProgress = getGuidedProgress(state, hasPartnerSchool);

  // Bug fix: "Your Progress" (and its "View Roadmap" link) used to render unconditionally, right
  // after sign-up, before any real Academic Plan exists — clicking "View Roadmap" that early
  // navigated to `screen: 'plan'` regardless, which crashed outright (confirmed directly:
  // AcademicPlanScreen -> getYearOverview -> `STAGE_PLAN[state.educationLevel]` throws when
  // `educationLevel` is still `null`, since the survey hasn't been completed yet). The OLD
  // "0/0 rather than crashing" comment here was only ever true for the STAT NUMBERS shown inside
  // the card, not for the separate "View Roadmap" navigation button sitting right next to them —
  // an empty card with a genuinely broken link was never a real fix. The real fix is to not show
  // the card at all until there's a real plan behind it: reuses the exact same `unlock` function
  // the "Academic Plan" tile itself already gates on (`state.selectedProgramKeys.length > 0`) —
  // the same real-data threshold, not a second, possibly-drifting copy of that condition — so
  // "Your Progress" and the "Academic Plan" tile can never disagree about whether a real plan
  // exists yet.
  const hasRoadmap = TILES.find((t) => t.id === 'plan').unlock(state, hasPartnerSchool);
  const roadmap = useMemo(
    () => (isSurveyComplete(state) ? generateRoadmap(state) : null),
    [state],
  );
  const taskProgress = useMemo(
    () => (roadmap ? countPlanTasks(roadmap, state.completedNodes) : { completed: 0, total: 0 }),
    [roadmap, state.completedNodes],
  );
  const percentComplete = taskProgress.total > 0 ? Math.round((taskProgress.completed / taskProgress.total) * 100) : 0;
  // "Days active" — the number of calendar days since this student's own real sign-up date
  // (state.accountCreatedAt, set once by SignUpScreen and never overwritten), inclusive of today.
  // A genuine, if simple, real metric rather than an invented placeholder number.
  const daysActive = state.accountCreatedAt
    ? Math.max(1, realDaysBetween(startOfToday(), parseDateInputValue(state.accountCreatedAt)) + 1)
    : 1;

  const mascotRef = useRef(null);
  const tileRefs = useRef(new Map());
  // Pointing-animation overhaul (see CLAUDE.md) — the real, precisely measured angle from the
  // mascot to the current target tile (bug fix: an earlier version only measured a binary left/
  // right side, aiming every target on a given side at the same fixed angle regardless of exactly
  // where it actually sat — see the hook's own comment below).
  //
  // Adjustment (see CLAUDE.md) — the end-of-sequence fix originally suppressed pointing entirely
  // once `sequenceComplete`, but the one-time completion message deserves ONE paired pointing
  // gesture at Academic Plan (`ENDPOINT_STEP.id`, 'plan') — the natural last thing to direct the
  // student toward — not silence forever. `guidedStepAlreadySeen` (already the exact signal that
  // gates whether the completion TEXT itself is still the fresh, first-time line or has already
  // been shown) does double duty here: while it's still `false` (this is genuinely the first
  // visit where the sequence just completed), `pointingTargetId` stays `nextStep.id` — which is
  // 'plan' in this state, same as ENDPOINT_STEP's own id — so the mascot points at Academic Plan
  // for exactly that one visit, alongside the completion line. The moment that line has been
  // shown once (`guidedStepAlreadySeen` flips true on the next fresh mount), `pointingTargetId`
  // becomes `null` — back to the neutral idle pose with no active target, matching "a single,
  // one-time gesture only." Every non-complete state is completely unaffected: `nextStep.id` is
  // used exactly as before.
  const pointingTargetId = (sequenceComplete && guidedStepAlreadySeen) ? null : nextStep.id;
  const pointAngle = usePointAngle(mascotRef, tileRefs, pointingTargetId, tiles.length);

  // Radial-layout pass, Task 3 — Quick Actions' "Add a Task" wires to this app's existing custom-
  // task feature (the same `state.customTasks` array/shape Roadmap.jsx's own "+ Add Task" writes
  // to), reusing the shared AddTaskModal rather than a new form.
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const addTask = (task) => {
    patch({ customTasks: [...(state.customTasks || []), { id: makeTaskId('custom'), ...task }] });
    setAddTaskOpen(false);
  };

  // AI Personalization, Stage 1 (see CLAUDE.md), Task 3 — a testing-only way to inspect the
  // compiled profile before Stage 2's future AI layer ever reads it. Recomputed fresh every time
  // the panel is opened (stored, not re-derived on every render) since this is explicitly a
  // low-frequency debug tool, not something that needs to track live state changes while open.
  // Logged to the console too, so it can be copied/inspected there without fighting the modal's
  // own scroll area.
  const [profileDebugData, setProfileDebugData] = useState(null);
  const openProfileDebug = () => {
    const profile = compileStudentProfile(state);
    console.log('[AI Personalization Stage 1] Compiled student profile:', profile);
    setProfileDebugData(profile);
  };

  // Polished Hub-to-Chat Transition (see CLAUDE.md) — replaces the old bottom-of-screen input bar
  // + portaled overlay modal entirely. The "Ask MyPath AI anything" trigger now lives where the
  // mascot's own dialogue bubble sits (rendered further down, gated on `sequenceComplete &&
  // guidedStepAlreadySeen` — i.e. only once the guided sequence's one-time completion message has
  // already been delivered, matching the spec's own "once the mascot has delivered its final
  // completion dialogue, replace that dialogue bubble's position with the button" instruction
  // literally: `guidedStepAlreadySeen` is exactly "has this hub visit's ENDPOINT_STEP message
  // already played in a PRIOR visit" — see its own derivation above — so the very visit where the
  // completion line is genuinely new still shows that line in full, and the button only takes its
  // place starting the next visit, never flickering mid-read within the same one thanks to the
  // snapshot hook's own anti-flicker freeze).
  //
  // `chatPhase` drives a same-screen state transition, not a navigation — no route/screen change:
  //   'hidden'        — normal hub (tiles + mascot bubble), the default and end state either way.
  //   'tiles-exiting' — tiles play their staggered fade/scale-out; mascot NEVER moves/unmounts.
  //   'chat'          — tiles unmounted, HubChatPanel mounted (plays its own staggered entrance).
  //   'chat-exiting'  — HubChatPanel plays its own staggered exit; tiles still unmounted.
  // Returning to 'hidden' remounts the tile block fresh, which is what makes the EXISTING
  // `hub-tile-pop-in` entrance keyframe (already unconditional on `.hub-tile`) replay for free —
  // "reversing the same transition" (Task 5) needs no separate re-entrance animation of its own.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const TILE_EXIT_MS = reducedMotion ? 0 : 560;
  const CHAT_EXIT_MS = reducedMotion ? 0 : 380;
  const [chatPhase, setChatPhase] = useState('hidden');
  const chatTransitionTimer = useRef(null);
  useEffect(() => () => {
    if (chatTransitionTimer.current) clearTimeout(chatTransitionTimer.current);
  }, []);
  const openChat = () => {
    setChatPhase('tiles-exiting');
    chatTransitionTimer.current = setTimeout(() => setChatPhase('chat'), TILE_EXIT_MS);
  };
  const closeChat = () => {
    // Stopping speech the instant the reverse transition starts — the same "dismissing is just an
    // ordinary 'the current line went away' change" contract useMascotSpeech already relies on
    // everywhere else in this app.
    setChatSpeakingText(null);
    setChatPhase('chat-exiting');
    chatTransitionTimer.current = setTimeout(() => setChatPhase('hidden'), CHAT_EXIT_MS);
  };

  const avatarOption = AVATAR_OPTIONS.find((a) => a.id === state.avatarIcon);

  return (
    <div className="hub-screen">
      <div className="hub-topbar">
        <div className="hub-topbar-logo">
          <Leaf size={22} color="var(--hub-accent)" />
          MyPath
        </div>
        <div className="hub-topbar-search">
          <Search size={15} />
          {/* Explicitly non-functional/placeholder, per this pass's own scope — no real search
              feature exists behind this app's own content yet. */}
          <input type="text" placeholder="Search anything..." readOnly />
        </div>
        <div className="hub-topbar-actions">
          {/* Purely decorative, matching the search field's own "placeholder is fine" scope — this
              app has no real notifications feature to back a live badge count with, and inventing
              one would be exactly the kind of fabricated number this codebase's data layer never
              allows itself elsewhere. */}
          <button type="button" className="hub-icon-btn" aria-label="Notifications" title="Notifications">
            <Bell size={16} />
          </button>
          {/* ElevenLabs Voice integration (see CLAUDE.md) — always renders now (no more
              `isSpeechAvailable()` client feature-detection gate, and no more separate "Choose
              mascot voice" gear — see App.jsx's own matching comment for why). */}
          <button
            type="button"
            className="hub-icon-btn voice-mute-toggle"
            onClick={() => patch({ voiceMuted: !state.voiceMuted })}
            aria-label={state.voiceMuted ? 'Unmute mascot voiceover' : 'Mute mascot voiceover'}
            aria-pressed={state.voiceMuted}
            title={state.voiceMuted ? 'Unmute mascot voiceover' : 'Mute mascot voiceover'}
          >
            {state.voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="hub-avatar" aria-hidden="true">
            {avatarOption ? <avatarOption.Icon size={17} /> : <User size={17} />}
          </div>
        </div>
      </div>

      <div className="hub-top-section">
        <div className="hub-header-row">
          {greetingName && <p className="hub-welcome-line">Welcome back, {greetingName}! 👋</p>}
          <h1 className="page-title hub-title">What would you like to accomplish today?</h1>
          <p className="page-sub">All the tools you need for your academic journey, in one place.</p>
        </div>

        {hasRoadmap && (
          <div className="hub-progress-card">
            <div className="hub-progress-ring" style={{ background: `conic-gradient(var(--hub-accent) ${percentComplete}%, var(--hub-card-border) 0)` }}>
              <div className="hub-progress-ring-hole">
                <span className="hub-progress-ring-pct">{percentComplete}%</span>
                <span className="hub-progress-ring-label">Complete</span>
              </div>
            </div>
            <div className="hub-progress-stats">
              <p className="hub-progress-card-title"><TrendingUp size={13} /> Your Progress</p>
              <div className="hub-progress-stat-row">Tasks completed <strong>{taskProgress.completed} / {taskProgress.total}</strong></div>
              <div className="hub-progress-stat-row">Milestones reached <strong>{guidedProgress.doneCount} / {guidedProgress.total}</strong></div>
              <div className="hub-progress-stat-row">Days active <strong>{daysActive}</strong></div>
              <button type="button" className="hub-progress-view-link" onClick={() => patch({ screen: 'plan' })}>
                View Roadmap <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`hub-radial-wrap${chatPhase !== 'hidden' ? ' chat-mode' : ''}`}>
        {chatPhase === 'hidden' && PARTICLES.map((p, i) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="hub-particle"
            aria-hidden="true"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
              background: p.color, animationDelay: `${(i % 6) * 0.35}s`,
            }}
          />
        ))}

        <div className="hub-mascot-area">
          {/* A dedicated wrapper around just the mascot SVG, sized tightly to it — NOT the whole
              .hub-mascot-area (which also contains the greeting bubble stacked below). `pointAngle`
              (below) measures against THIS ref, so it's computed from the mascot's real center, not
              from further down past the bubble. Polished Hub-to-Chat Transition (see CLAUDE.md) —
              this element (and its containing `.hub-mascot-area`) renders completely unconditionally
              across every `chatPhase` value: the mascot never moves, never unmounts, never
              re-measures — it's the one visual anchor the whole transition reads as continuous
              around. */}
          <div className="hub-mascot-figure" ref={mascotRef}>
            {/* Adjustment (see CLAUDE.md) — `pointing` reads `pointingTargetId` (above) rather
                than a plain `!sequenceComplete` gate now, so the ONE visit where the completion
                line is genuinely new still gets a real paired pointing gesture at Academic Plan;
                every visit after that (once `pointingTargetId` is `null`) keeps the mascot's
                mouth/body animating (the SEPARATE `speaking` prop, untouched) without raising the
                arm/wand toward a target that no longer means anything. Polished Hub-to-Chat
                Transition — `speaking` now also ORs in `isChatSpeaking`, so the SAME mascot
                instance animates for a chat reply too, without a second icon ever being rendered. */}
            <MascotIcon size={150} speaking={isSpeaking || isChatSpeaking} pointing={pointingTargetId !== null && isSpeaking} pointAngle={pointAngle} />
          </div>
          {/* Bug fix, found while building the Polished Hub-to-Chat Transition (see CLAUDE.md):
              conditionally NOT rendering this bubble at all while in chat mode (an earlier version
              of this code) shrank `.hub-mascot-area`'s own flex column height — and since that
              area is positioned via `top: 40%; transform: translate(-50%, -50%)`, a shorter box
              shifts WHERE that -50% vertical center lands, moving the mascot by a few real pixels
              the instant chat mode was entered, confirmed directly via
              `getBoundingClientRect()` before/after — a real, if small, violation of "the mascot
              stays anchored... doesn't move." Fixed by always mounting this bubble (so its own
              real height never changes across `chatPhase` values) and hiding it via
              `visibility: hidden` (which reserves its layout space, unlike `display: none`) rather
              than conditional rendering. */}
          <div className={`mascot-greeting${chatPhase !== 'hidden' ? ' mascot-greeting-hidden' : ''}`}>
              {/* `key` forces a fresh DOM node whenever the dialogue text itself changes (advancing
                  to a new guided step), which is what makes .mascot-dialogue's CSS entrance
                  animation replay on every new line instead of only once ever — see global.css's
                  own comment. Bug fix (see CLAUDE.md) — `nextStepIntro` is now genuinely `null`
                  once the one-time completion acknowledgment has already been shown. Polished
                  Hub-to-Chat Transition (Task 1) — that's exactly when this bubble's own spot now
                  hosts the "Ask MyPath AI anything" button instead of sitting empty: `guidedStepAlreadySeen`
                  is precisely "has this ENDPOINT_STEP message already played in a PRIOR visit," so
                  the very visit the completion line is genuinely new still shows the real text in
                  full (the snapshot hook freezes that read for the whole visit — see its own
                  comment), and only a LATER visit shows the button here instead. */}
              {sequenceComplete && guidedStepAlreadySeen ? (
                <button type="button" className="hub-ask-ai-bubble-btn" onClick={openChat}>
                  <Sparkles size={14} /> Ask MyPath AI anything
                </button>
              ) : (
                nextStepIntro && <p key={nextStepIntro} className="mascot-dialogue">{nextStepIntro}</p>
              )}
              {/* The reference image's own "1/6" indicator, rebuilt from real GUIDED_SEQUENCE data
                  (getGuidedProgress above) rather than invented — no "AI" branding anywhere here. */}
              <div className="hub-progress-dots">
                {Array.from({ length: guidedProgress.total }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className={`hub-progress-dot${i < guidedProgress.doneCount ? ' done' : ''}${i === guidedProgress.currentIndex ? ' current' : ''}`} />
                ))}
                <span className="hub-progress-count">{Math.min(guidedProgress.currentIndex + 1, guidedProgress.total)}/{guidedProgress.total}</span>
              </div>
          </div>
        </div>

        {(chatPhase === 'hidden' || chatPhase === 'tiles-exiting') && tiles.map((tile, i) => {
          const unlocked = tile.unlock(state, hasPartnerSchool);
          // Adjustment (see CLAUDE.md) — reads `pointingTargetId` (above) instead of a plain
          // `!sequenceComplete` gate, so the Academic Plan tile correctly glows for the one visit
          // where the completion line is genuinely new (pairing the tile-glow with that one-time
          // pointing gesture), then stops glowing on every visit after — never a persistent,
          // ongoing highlight.
          const isPointingTarget = tile.id === pointingTargetId;
          const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
          const pos = RADIAL_POSITIONS[i % RADIAL_POSITIONS.length];
          const isExiting = chatPhase === 'tiles-exiting';
          return (
            // `.hub-tile-slot` is a plain, never-animated wrapper doing only the {x%, y%}
            // centering (translate(-50%, -50%)) — kept on a SEPARATE element from `.hub-tile`
            // itself on purpose, since `.hub-tile`'s own entrance/hover/press animations each set
            // `transform` too, and a CSS transform replaces (rather than composes with) another
            // rule's transform on the SAME element — see global.css's own comment on this exact
            // bug for the full story.
            <div key={tile.id} className="hub-tile-slot" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <button
                type="button"
                ref={(el) => {
                  if (el) tileRefs.current.set(tile.id, el);
                  else tileRefs.current.delete(tile.id);
                }}
                className={`hub-tile${unlocked ? '' : ' locked'}${isPointingTarget ? ' pointing-target' : ''}${isExiting ? ' hub-tile-exiting' : ''}`}
                disabled={!unlocked}
                onClick={() => goTo(tile)}
                style={{
                  '--tile-accent-bg': accent.bg, '--tile-accent-fg': accent.fg,
                  // Polished Hub-to-Chat Transition (Task 2) — the SAME per-tile stagger the
                  // entrance already uses, reused for the exit too (a slightly tighter interval,
                  // since exiting reads better a touch faster than the original settle-in pace),
                  // so tiles cascade away with a natural, non-simultaneous feel rather than all
                  // vanishing at once.
                  animationDelay: `${i * (isExiting ? 30 : 40)}ms`,
                }}
              >
                <div className="hub-tile-icon-box">
                  {unlocked
                    ? <tile.Icon size={22} />
                    : <Lock className="hub-tile-lock-icon" size={20} />}
                </div>
                <div className="hub-tile-title">{tile.title}</div>
                <p className="hub-tile-desc">{tile.desc}</p>
                {!unlocked && (
                  <p className="hub-tile-lock-reason">{tile.lockedReason(state, hasPartnerSchool)}</p>
                )}
              </button>
            </div>
          );
        })}

        {(chatPhase === 'chat' || chatPhase === 'chat-exiting') && (
          <HubChatPanel
            exiting={chatPhase === 'chat-exiting'}
            onBack={closeChat}
            onAssistantReply={setChatSpeakingText}
          />
        )}
      </div>

      <div className="hub-bottom-row">
        <div className="hub-quote-card">
          <p className="hub-quote-mark">&ldquo;</p>
          <p className="hub-quote-text">{QUOTE.text}</p>
          <p className="hub-quote-author">— {QUOTE.author}</p>
        </div>

        <div className="hub-quick-actions">
          <p className="hub-quick-actions-title"><Zap size={13} /> Quick Actions</p>
          <button type="button" className="hub-quick-action-btn" onClick={() => setAddTaskOpen(true)}>
            <Plus size={16} /> Add a Task
          </button>
          <button type="button" className="hub-quick-action-btn" onClick={handleReset}>
            <RotateCcw size={16} /> Start Over
          </button>
        </div>
      </div>

      <AddTaskModal isOpen={addTaskOpen} onCancel={() => setAddTaskOpen(false)} onSubmit={addTask} />

      <div className="hub-debug-row">
        <button type="button" className="hub-reset-btn" onClick={handleReset}>
          <RotateCcw size={12} /> Reset
        </button>
        <button type="button" className="hub-debug-profile-btn" onClick={openProfileDebug}>
          <Bug size={12} /> View AI Profile (Testing)
        </button>
      </div>

      {profileDebugData && createPortal(
        <div className="overlay" onClick={() => setProfileDebugData(null)}>
          <div className="modal profile-debug-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setProfileDebugData(null)}><X size={18} /></button>
            <div className="modal-eyebrow">AI Personalization — Testing Only</div>
            <h2 className="modal-title">Compiled Student Profile</h2>
            <p className="modal-desc">
              Also logged to the browser console. This is the exact structured object Stage 2's
              future AI layer would read — nothing here is sent anywhere.
            </p>
            <pre className="profile-debug-json">{JSON.stringify(profileDebugData, null, 2)}</pre>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Pointing-animation overhaul (see CLAUDE.md) — measures the REAL angle from the mascot's own
// center to the current target tile's actual center, same "don't fake it, measure real DOM
// positions" posture WelcomeScreen's own marker placement already established (getPointAtLength
// there, getBoundingClientRect here) and the same measurement this replaced (the old
// `PointerArrow`'s own angle math, before that) already held. Bug fix: an intermediate version of
// this reduced the real measurement down to a binary left/right comparison, which aimed every
// target on a given side at the identical fixed lean/raise angle regardless of exactly where it
// sat — a tile almost directly overhead got the same gesture as one far off at a shallow angle.
// This version keeps the full `atan2` angle (degrees, standard convention: 0=target directly
// right, 90=directly below, -90=directly above, ±180=directly left) so MascotIcon.jsx can aim the
// lean/arm/wand precisely along it. Returns `null` (mascot stays centered, no pointing pose
// applied) until a real measurement is available, same "don't guess" fallback the old arrow's own
// `angle === null` check already held.
function usePointAngle(mascotRef, tileRefs, targetId, tileCount) {
  const [angle, setAngle] = useState(null);

  useLayoutEffect(() => {
    function recompute() {
      const mascotEl = mascotRef.current;
      const targetEl = tileRefs.current.get(targetId);
      if (!mascotEl || !targetEl) { setAngle(null); return; }
      const mascotRect = mascotEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const mx = mascotRect.left + mascotRect.width / 2;
      const my = mascotRect.top + mascotRect.height / 2;
      const tx = targetRect.left + targetRect.width / 2;
      const ty = targetRect.top + targetRect.height / 2;
      setAngle(Math.atan2(ty - my, tx - mx) * (180 / Math.PI));
    }
    // A plain synchronous call here raced React StrictMode's dev-only double-mount: the ref
    // callbacks that populate `tileRefs` hadn't landed yet the instant this specific layout
    // effect fired (confirmed directly, back when this same measurement drove the old arrow's own
    // angle instead — both `mascotRef.current` and every `tileRefs` entry read as unset at that
    // exact point, then were populated a moment later), so nothing ever appeared at all. A single
    // `requestAnimationFrame` defers the first measurement to after the browser's next paint, by
    // which point StrictMode's mount/remount cycle has settled and every ref is reliably attached
    // — same "don't trust synchronous-at-mount DOM state, wait a frame" lesson WelcomeScreen's own
    // double-rAF trail reveal already established for this codebase, just one rAF instead of two
    // since there's no CSS transition being raced here, only a DOM read.
    const raf = requestAnimationFrame(recompute);
    // Tile positions genuinely reflow on resize (a real CSS grid, not a fixed-viewBox SVG like
    // WelcomeScreen's trail) and whenever the number of rendered tiles changes (hasPartnerSchool
    // toggling, or the pointing target itself moving to a different tile). These later calls need
    // no rAF wrapper of their own — by resize time the DOM is already settled, this only mattered
    // for the very first measurement racing mount.
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, tileCount]);

  return angle;
}

// The mascot illustration itself now lives in ../components/MascotIcon.jsx, shared with Stage 5's
// in-flow MascotWidget (see CLAUDE.md) — was a local, hub-only component before that stage
// existed.
