import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase, GraduationCap, Landmark, BookOpen, Search, Hammer,
  Map as MapIcon, ListChecks, Lock, ArrowRight, RotateCcw, Leaf, Bell, User, UserCircle2,
  TrendingUp, Zap, Plus, Bug, X, Sparkles, Compass, Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSurveyComplete } from './SurveyScreen';
import { AVATAR_OPTIONS } from './SignUpScreen';
import MascotIcon from '../components/MascotIcon';
import AddTaskModal from '../components/AddTaskModal';
import HubChatPanel from '../components/HubChatPanel';
import SoundSettingsPopover from '../components/SoundSettingsPopover';
import { makeTaskId } from '../utils/ids';
import { generateRoadmap } from '../utils/roadmapGenerator';
import { compileStudentProfile } from '../utils/profileCompiler';
import { startOfToday, parseDateInputValue, realDaysBetween } from '../utils/dates';
import { getMascotLine } from '../data/mascotDialogue';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { stopSpeaking } from '../utils/speech';
import { useMarkMascotSeen, useMascotSeenSnapshot } from '../hooks/useMascotSeen';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { NARRATIVE_OVERVIEW_PROJECT_TYPE_ID, getNarrativeProject } from '../data/projects';
import { useOnboardingChat } from '../hooks/useOnboardingChat';
import { isDevToolsEnabled } from '../utils/devTools';

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

// AI-First Onboarding, Stage 1 (see CLAUDE.md) — the survey/minimal-form step is no longer a hub
// tile at all. It's now a mandatory PRE-hub step (Sign Up -> Survey -> the Stage 2 AI conversation
// placeholder -> Hub), so by the time a student ever reaches the hub, `isSurveyComplete(state)` is
// always already true — there's no real "go build your plan" destination left to point at from
// here, the same way there's no "go sign up" hub tile either. `isSurveyComplete` is still imported
// and used below (partnerSchoolGate, the Academic Plan progress-card gate, etc.), just no longer
// as a hub-tile unlock condition for a tile that no longer exists.
// Hub redesign, Stage 2 (see CLAUDE.md) — `dependsOn` is new, purely display-only metadata: which
// real hub target a locked tile's own already-existing `lockedReason` string is actually ABOUT, so
// clicking a locked tile can point the mascot's spotlight beam at the real prerequisite instead of
// just leaving it aimed wherever it already was. `'askAi'` is the same synthetic target id the
// pointing system already uses for the "Ask MyPath AI anything" button (Transcript & GPA and the
// student's own overview both happen inside that conversation now, not on a dedicated tile). Never
// invents new copy — the note shown is always the tile's own real `lockedReason(state,
// hasPartnerSchool)` text, `dependsOn` only decides where the beam points while showing it.
const TILES = [
  {
    id: 'careers', screen: 'discovery', discoveryEntryStep: 'careers', Icon: Briefcase,
    title: 'Careers of Interest',
    desc: 'Explore careers that match what excites you.',
    // Defensive only — `isSurveyComplete(state)` is guaranteed true by the time the hub is ever
    // reached now that the survey is a mandatory pre-hub step, so this tile is never actually
    // locked in practice; kept as a real fallback in case state is ever somehow restored
    // mid-onboarding rather than assuming that can't happen.
    unlock: (state) => isSurveyComplete(state),
    lockedReason: () => 'Complete the onboarding steps first',
    dependsOn: () => null,
  },
  {
    id: 'majors', screen: 'discovery', discoveryEntryStep: 'majors', Icon: GraduationCap,
    title: 'Related College Majors',
    desc: 'See majors that lead toward your chosen careers.',
    unlock: (state) => state.selectedCareerIds.length > 0,
    lockedReason: () => 'Select at least one career first',
    dependsOn: () => 'careers',
  },
  {
    id: 'programs', screen: 'discovery', discoveryEntryStep: 'programs', Icon: Landmark,
    title: 'Recommended Programs',
    desc: 'Browse real schools known for your selected majors.',
    unlock: (state) => state.selectedMajorIds.length > 0,
    lockedReason: () => 'Select at least one major first',
    dependsOn: () => 'majors',
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
    dependsOn: () => 'programs',
  },
  {
    // AI-First Onboarding, Stage 4 (see CLAUDE.md), Task 1 — "similar in role to Your School
    // List" (right below): its own destination, not a tab nested inside the Academic Plan.
    // Unlocks as soon as Stage 3's overview is generated AND confirmed — often the very first
    // hub visit, since that conversation happens before the hub is ever reached at all. Also
    // deliberately NOT part of GUIDED_SEQUENCE below (Stage 4) — same "real tile, but not part of
    // the mascot's primary walkthrough" treatment Academic Plan/Your School List already get.
    id: 'myNarrative', screen: 'myNarrative', Icon: Compass,
    title: 'My Narrative',
    desc: 'The direction from your first conversation, and your multi-year path.',
    unlock: (state) => !!getNarrativeProject(state),
    lockedReason: () => 'Confirm your overview in your first conversation to see this',
    dependsOn: () => 'askAi',
  },
  {
    id: 'programSummary', screen: 'programSummary', Icon: ListChecks,
    title: 'Your School List',
    desc: 'Your selected programs, grouped by Reach, Match, and Safety.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
    dependsOn: () => 'programs',
  },
  // Implement the Corrected Flow Order: Transcript & GPA Moves Into Session 1 (see CLAUDE.md),
  // Task 3 — the standalone "Transcript & GPA" tile that used to live here (unlocked once a
  // program was selected, reached via TranscriptScreen.jsx directly) is REMOVED entirely, not just
  // locked/hidden: that step now happens mid-way through "Our Conversation" itself, well before the
  // hub is ever reached for the first time — see useNarrativeSession.js's own
  // `beginTranscriptPause`/`showTranscriptPause` and TranscriptScreen.jsx's own new
  // `onboardingPause` mode. `courseSelection`'s own tile right below is untouched — it still reads
  // `state.transcriptCompleted` directly (now set during the conversation instead of via this
  // tile), so its own unlock timing is completely unaffected by this removal.
  {
    id: 'courseSelection', screen: 'courseSelection', Icon: BookOpen,
    title: 'Course Selection',
    desc: "Pick next year's courses from your school's real catalog.",
    requiresPartnerSchool: true,
    dependsOn: () => 'askAi',
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
    dependsOn: (state, hasPartnerSchool) => (hasPartnerSchool ? 'askAi' : 'programs'),
  },
  {
    id: 'projectBuilder', screen: 'projectBuilder', Icon: Hammer,
    title: 'Project Builder',
    desc: 'Start a hands-on project to build your portfolio.',
    unlock: (state) => state.selectedProgramKeys.length > 0,
    lockedReason: () => 'Select at least one program first',
    dependsOn: () => 'programs',
  },
  {
    // Prior Experience Collection + New Profile Page (see CLAUDE.md), Task 3 — always unlocked,
    // like "Let's Build Your Plan": this is personal data entry (prior experiences/ECs), not a
    // step gated behind survey/discovery progress, so there's no real precondition to wait on.
    // Deliberately NOT part of GUIDED_SEQUENCE below — same "real tile, but not part of the
    // mascot's primary walkthrough" treatment Academic Plan/Your School List already get, since
    // this is an optional, revisit-anytime utility, not a step in the core funnel.
    id: 'profile', screen: 'profile', Icon: UserCircle2,
    title: 'Profile',
    desc: 'Add or edit clubs, jobs, and other experiences you\'ve already done.',
    unlock: () => true,
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
// AI-First Onboarding, Stage 1 (see CLAUDE.md) — the old first step here ('survey') is gone: the
// survey is now a mandatory pre-hub step (see TILES's own comment above), always already done by
// the time a student can ever reach the hub, so it never had a real "next thing to do" state left
// to guide toward here either.
// AI-First Onboarding, Stage 5 (Task 2, see CLAUDE.md) — 'myNarrative' is now the genuine first
// step: the natural payoff moment right after the onboarding conversation is "here's what we just
// figured out together," not "let's pick some careers" — pointing the student at their freshly
// generated multi-year overview before anything else. `requiresNarrative` (checked by
// `getNextGuidedStep`/`getGuidedProgress` below, alongside the existing `requiresPartnerSchool`
// filter) drops this step out of the sequence entirely for the one real edge case where it doesn't
// apply: a student who reached the hub via OnboardingConversationScreen's own "Continue to my Hub"
// button WITHOUT ever confirming an overview (that button has no hard confirm-first gate) — for
// them, the sequence correctly starts at 'careers' instead, same as before this stage existed.
const GUIDED_SEQUENCE = [
  {
    id: 'myNarrative', requiresPartnerSchool: false, requiresNarrative: true,
    isDone: (state) => state.narrativeViewed,
    // Task 4 — this line IS "the hub's first greeting" referencing the conversation: it's the
    // very first thing shown in the mascot's speech bubble on a student's first-ever hub visit
    // (right after confirming an overview), rather than a generic/disconnected opener.
    intro: (state) => {
      const themesText = state.narrativeThemes?.length ? state.narrativeThemes.join(' and ') : null;
      return themesText
        ? `We just talked about ${themesText} — here's the full, multi-year direction we built together. Take a look!`
        : "Here's the direction we just built together in our first conversation — take a look!";
    },
  },
  {
    id: 'careers', requiresPartnerSchool: false,
    isDone: (state) => state.selectedCareerIds.length > 0,
    // Admissions Overview Presentation, Stage 1 (see CLAUDE.md) — the condensed "Quick context:
    // ..." admissions-context blurb this entry used to open with (ADMISSIONS_CONTEXT_LINES,
    // mascotDialogue.js) is gone; that real context is now delivered up front by the new
    // presentation screen itself (Sign Up -> Survey -> presentation -> the AI conversation -> Hub),
    // so this entry no longer needs to repeat a condensed version of it here. Still a function of
    // `state`, though — the tail reads as confirming/reviewing the direction the conversation
    // already found, not "figure out what excites you" from scratch, whenever a real narrative was
    // actually confirmed (`state.narrativeSummary`); falls back to the original from-scratch
    // framing for the one case where none exists (see `requiresNarrative`'s own comment above for
    // why that's still a real, reachable state).
    intro: (state) => (state.narrativeSummary
      ? "Now let's confirm the direction we found — here are some careers worth a closer look."
      : 'Now, let\'s figure out what excites you.'),
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
  // Implement the Corrected Flow Order (see CLAUDE.md), Task 3 — the 'transcript' guided step that
  // used to live here is gone too, same reasoning as the TILES removal above: Transcript & GPA now
  // happens mid-conversation, before the hub's own guided walkthrough ever starts, so
  // `state.transcriptCompleted` is already true (or the student has no real transcript flow at
  // all, see hasRealTranscriptFlow) by the time this sequence begins — there's no "next thing to
  // do" left here for the mascot to point at.
  {
    id: 'courseSelection', requiresPartnerSchool: true,
    // UC Davis and Roslyn track selected courses in two deliberately separate fields (see
    // AppContext.jsx) — check whichever one applies to this student's own partner school.
    // Bug fix (see CLAUDE.md, "Course Selection stuck locked" follow-up) — Course Selection's own
    // Continue has never required a selection to proceed (see CourseSelectionScreen.jsx's own
    // "Course Selection Stage 3" comment), so a real student who genuinely finishes this screen
    // without picking a course — a fully legitimate path — used to leave this step permanently
    // stuck "not done," since `selectedCourseIds`/`selectedUCDavisCourseIds` could never become
    // non-empty. `moduleReviewsConfirmed.courseSelection` (set the moment the reactive module
    // review is genuinely Confirmed, see useModuleReview.js) is the real, current "the student
    // finished this screen" signal — confirmed live via a real walkthrough where selecting a
    // course too, or the module review being confirmed alone, both correctly unstick this step.
    isDone: (state) => (state.currentSchool === 'UC Davis'
      ? state.selectedUCDavisCourseIds.length > 0
      : state.selectedCourseIds.length > 0) || !!state.moduleReviewsConfirmed?.courseSelection,
    intro: "Let's pick out next year's courses.",
  },
  {
    id: 'opportunities', requiresPartnerSchool: false,
    // Bug fix (see CLAUDE.md, "Course Selection stuck locked" follow-up) — the exact same gap as
    // courseSelection right above: Opportunity Finder's own Continue also never requires a real
    // selection, so `moduleReviewsConfirmed.opportunities` is the same real fallback.
    isDone: (state) => state.selectedOpportunityIds.length > 0 || !!state.moduleReviewsConfirmed?.opportunities,
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
    // AI-First Onboarding, Stage 3 bug fix (see CLAUDE.md) — `state.startedProjects` can now ALSO
    // contain the auto-generated narrative-overview project (NARRATIVE_OVERVIEW_PROJECT_TYPE_ID),
    // created the moment the Stage 2/3 conversation is confirmed, typically well before the student
    // ever reaches this step in the guided sequence. Without filtering it out here, confirming a
    // narrative overview would silently mark "Project Builder" done too, even though the student
    // never actually visited or interacted with Project Builder itself — the exact same class of
    // bug this file's own "explicitly skipped" fix above already had to correct once (a real
    // interaction being conflated with an unrelated one). Only a REAL Project-Builder-originated
    // project (any other projectTypeId, including Build Your Own's own sentinel) should count.
    isDone: (state) => state.startedProjects.some((p) => p.projectTypeId !== NARRATIVE_OVERVIEW_PROJECT_TYPE_ID)
      || state.projectBuilderSkipped,
    intro: 'Ready to start a hands-on project?',
  },
  {
    // Final Alignment-Check Conversation (see CLAUDE.md) — a genuinely new, LAST real step: once
    // every other step above is done, the AI hasn't yet actually looked at what the student did —
    // only what was discussed in the abstract back in the original conversation. This step's own
    // `isDone` (below) is what makes ENDPOINT_STEP's own "your plan is ready" completion message/
    // pointing gesture wait for that automatic check-in to genuinely conclude, rather than firing
    // the instant every OTHER step finishes as it used to. Deliberately does NOT add any new gate
    // to the Academic Plan tile itself (TILES above) — that tile stays reachable exactly as it
    // always has, per its own explicit "revisit constantly, never gate behind later steps"
    // philosophy; only WHEN the guided sequence itself declares "done" changes.
    // `requiresNarrative: true` mirrors `myNarrative`'s own flag — this step only makes sense once
    // a real narrative project actually exists to check the student's real choices against.
    id: 'finalReview', requiresPartnerSchool: false, requiresNarrative: true,
    // Gated on `finalReviewTriggered` FIRST (not just scanning history for `finalReviewComplete`)
    // specifically so a stray, premature `true` from the model — before the client has ever
    // actually fired the real automatic check-in (see the guarded one-shot effect below) — stays
    // inert rather than silently short-circuiting this whole step. `.some()`, not "most recent":
    // once ANY turn ever reports the check-in concluded, it stays done forever, matching "never
    // re-trigger this specific automatic check-in again."
    isDone: (state) => state.finalReviewTriggered
      && (state.onboardingChatHistory || []).some((m) => m.finalReviewComplete),
    intro: "One last thing before your plan is ready — let's do a quick check-in on everything you've built. Continue our conversation to review it together.",
  },
];

// Bug fix (see CLAUDE.md) — reworded slightly toward a clearer one-time "you're all set" framing
// (was "Your plan is really coming together! Come back anytime."), now that this line is
// genuinely shown exactly once rather than blending into the ongoing generic "keep going"
// acknowledgment it used to fall through to afterward.
const ENDPOINT_STEP = { id: 'plan', intro: "You've made it through the whole guide — your plan is ready! Come back anytime to keep building on it." };

// AI-First Onboarding, Stage 5 (see CLAUDE.md) — extracted once `requiresNarrative` needed to join
// `requiresPartnerSchool`/`visibleForTransfer` as a THIRD filter condition both `getNextGuidedStep`
// and `getGuidedProgress` already applied identically (previously duplicated inline in both) —
// the same "extract once, every caller reads the identical filter" precedent this codebase already
// follows elsewhere, so the two can never independently drift on which steps are "relevant."
function relevantGuidedSteps(state, hasPartnerSchool) {
  return GUIDED_SEQUENCE.filter((s) => (!s.requiresPartnerSchool || hasPartnerSchool
    || (s.visibleForTransfer && state.educationLevel === 'transfer'))
    && (!s.requiresNarrative || !!getNarrativeProject(state)));
}

// Re-evaluated fresh from `state` on every render — nothing here is cached from a previous visit,
// so returning to the hub after finishing a step always reflects the CURRENT next incomplete step,
// per this stage's own explicit requirement.
function getNextGuidedStep(state, hasPartnerSchool) {
  const relevant = relevantGuidedSteps(state, hasPartnerSchool);
  return relevant.find((s) => !s.isDone(state)) || ENDPOINT_STEP;
}

// Hub redesign (see CLAUDE.md) — the reference image's own "1/6" step-position indicator, rebuilt
// here from REAL guided-sequence data rather than invented: `relevant.length` and the current
// step's own 1-based position within it (the endpoint counts as the final, completed position, not
// a synthetic extra step). No "AI" framing anywhere in this — it's a plain progress readout over
// GUIDED_SEQUENCE, the same real data `getNextGuidedStep` already derives. Also reused as-is by
// the radial-layout pass's "Your Progress" card for the real "Milestones reached" stat below.
function getGuidedProgress(state, hasPartnerSchool) {
  const relevant = relevantGuidedSteps(state, hasPartnerSchool);
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
// cycling already established — not a new pattern invented for this redesign. Locked
// tiles never read this palette at all (global.css's own `.hub-tile.locked .hub-tile-icon-box`
// override wins) — they stay muted/grey regardless of a tile's own accent index.
//
// Adapt Claude Design's Output Into the Existing Radial Hub Layout (see CLAUDE.md) — these now
// reference the hub's own dedicated `--hub-tile-*` tokens (global.css, `.app-shell.app-shell-hub`)
// instead of the shared `--bloom-*` set every other repainted screen still reads — the attached
// design's own tile-accent hues (a slightly different, more Apple-esque purple/blue/gold/teal/
// orange/pink/green than the bloom palette's own), scoped so this reskin never changes what
// Sign-Up's avatar picker or any other bloom screen looks like.
const TILE_ACCENTS = [
  { bg: 'var(--hub-tile-purple)', fg: '#ffffff' },
  { bg: 'var(--hub-tile-gold)', fg: '#20241C' },
  { bg: 'var(--hub-tile-teal)', fg: '#ffffff' },
  { bg: 'var(--hub-tile-orange)', fg: '#ffffff' },
  { bg: 'var(--hub-tile-pink)', fg: '#ffffff' },
  { bg: 'var(--hub-tile-blue)', fg: '#ffffff' },
  { bg: 'var(--hub-tile-green)', fg: '#ffffff' },
];

// Glassmorphism redesign, Stage 1 (see CLAUDE.md) — the hand-tuned `RADIAL_POSITIONS` scatter
// slots and the decorative `PARTICLES` array (both tuned around a centered mascot in an
// absolutely-positioned radial wrap) are gone for good: the tile grid stays a clean, responsive
// glass-card grid (`.hub-tile-grid`, global.css) using the real tile array/order below directly,
// with no per-tile position data of its own to maintain — real tile count varies with
// `hasPartnerSchool`, which never mapped cleanly onto a fixed scatter composition anyway. Stage 2
// (see CLAUDE.md) brings the mascot itself back, as its own hero element above the guide panel
// (`.hub-mascot-hero`, below) rather than scattered among the tiles — the real, measured
// spotlight-pointing beam works identically either way, since it's computed from live DOM
// positions, not fixed coordinates.

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
  // High School Selection + Transcript for Transfer Students (see CLAUDE.md) — `visibleForTransfer`
  // keeps the Transcript & GPA tile visible for any Transfer student too, alongside the existing
  // `hasPartnerSchool` case — see that tile's own comment in TILES above for why (real, reachable
  // content now exists for them). No other `requiresPartnerSchool` tile carries this flag.
  const tiles = TILES.filter((t) => !t.requiresPartnerSchool || !isSurveyComplete(state) || hasPartnerSchool
    || (t.visibleForTransfer && state.educationLevel === 'transfer'));
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
  // Hub redesign, Stage 2 (see CLAUDE.md) — the mascot returns, using the exact real, measured
  // spotlight-pointing system this screen used before the Glassmorphism redesign removed it
  // (recovered from git history, commit 8a8d2fb, not reinvented). `mascotRef` is the character's
  // own real DOM center; `tileRefs` is a plain id->element `Map` covering every real tile button
  // PLUS the "Ask MyPath AI anything" button (registered under the synthetic id `'askAi'`, the
  // same convention this app already established for that button once Transcript & GPA/the
  // student's own overview moved into the AI conversation instead of a dedicated tile) — so the
  // beam can aim at either kind of real target through one identical mechanism. `usePointAngle`
  // (defined at the bottom of this file) is untouched from the recovered version: a real `atan2`
  // angle in degrees, `null` until a genuine measurement exists (never guessed), recomputed on
  // resize and whenever the target itself changes.
  const mascotRef = useRef(null);
  const tileRefs = useRef(new Map());

  // A manual, opt-in walkthrough through the REAL tiles (their own real title/desc, no invented
  // copy) — `null` means no tour is active. A short-lived `transientNote` (its own real text plus,
  // optionally, a real dependency id to point the beam at) covers two honest, non-modal
  // interruptions: clicking a locked tile (reuses that tile's own already-shown `lockedReason` text
  // verbatim, never new copy) and the decorative notification bell. Both are session-only UI
  // state, matching this app's own established "a browse toggle/local view choice doesn't need to
  // survive a reload" convention elsewhere.
  const [tourIndex, setTourIndex] = useState(null);
  const [transientNote, setTransientNote] = useState(null); // { text, targetId } | null
  const transientNoteTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(transientNoteTimerRef.current), []);

  const showTransientNote = (text, targetId = null) => {
    clearTimeout(transientNoteTimerRef.current);
    setTransientNote({ text, targetId });
    transientNoteTimerRef.current = setTimeout(() => setTransientNote(null), 3200);
  };
  // Locked-tile clicks are informative now, not inert — the note is always the tile's own real
  // `lockedReason` string (never a second, invented phrasing), and `dependsOn` (TILES, above) only
  // decides where the beam points while it's showing.
  const noteLockedTile = (tile) => showTransientNote(
    tile.lockedReason(state, hasPartnerSchool),
    tile.dependsOn ? tile.dependsOn(state, hasPartnerSchool) : null,
  );

  const activeTourTile = tourIndex !== null ? tiles[tourIndex] : null;
  const startTour = () => { setTransientNote(null); setTourIndex(0); };
  const tourNext = () => setTourIndex((i) => (i + 1 < tiles.length ? i + 1 : null));
  const skipTour = () => setTourIndex(null);

  // The guide panel's own eyebrow/text and the beam's own target all read from ONE priority order
  // — a transient note first, then a manual tour step, then the real live guided-sequence state —
  // never more than one of these three active at once.
  const guideEyebrow = transientNote ? 'Heads up' : (activeTourTile ? 'Taking the tour' : 'Your guide');
  const guideText = transientNote
    ? transientNote.text
    : activeTourTile
      ? `${activeTourTile.title}: ${activeTourTile.desc}`
      : (nextStepIntro || "You're all caught up for now — explore any unlocked tool below, or revisit your Academic Plan anytime.");
  // A transient note only redirects the beam when it's genuinely ABOUT a real dependency (a locked
  // tile click) — the bell's own note has no `targetId`, so the beam simply keeps pointing at
  // whatever it already was rather than going aimless over a purely decorative interruption.
  const pointingTargetId = (transientNote && transientNote.targetId)
    || (activeTourTile ? activeTourTile.id : (nextStep.id === 'finalReview' ? 'askAi' : nextStep.id));
  // Dashboard/Guide feature, Stage 6 (see CLAUDE.md) — the hub's own guide message still speaks
  // aloud too, same shared mechanism MascotWidget uses for every other screen's in-flow dialogue,
  // now also driving the returned mascot's own speaking/pointing animation (Stage 2) instead of
  // running with no visible character at all. Speaks whatever `guideText` currently resolves to —
  // the live guided-sequence line, a tour step, or a transient note — and stops on unmount, both
  // handled inside the hook.
  const isSpeaking = useMascotSpeech(guideText, state.voiceMuted);
  const pointAngle = usePointAngle(mascotRef, tileRefs, pointingTargetId, tiles.length);

  // Final Alignment-Check Conversation (see CLAUDE.md) — fires the one automatic, no-typed-text
  // check-in turn the moment `finalReview` genuinely becomes the current guided step (i.e. every
  // OTHER step is already done). Guarded the same way `WeeklyTaskSuggestionPanel.jsx`'s own weekly-
  // suggestion trigger already is: a local `useRef`, checked FIRST, in addition to the persisted
  // `state.finalReviewTriggered` flag — the ref is what actually prevents a double-fire under React
  // 18 StrictMode's dev-only mount/remount replay, since a `patch()` call doesn't re-render
  // synchronously, so the persisted flag alone wouldn't be set in time to stop a second invocation
  // within the same tick. Both the ref AND the persisted flag are set synchronously, before the
  // async request even starts.
  const { triggerFinalReview } = useOnboardingChat();
  const finalReviewFiredRef = useRef(false);
  useEffect(() => {
    if (finalReviewFiredRef.current) return;
    if (nextStep.id !== 'finalReview' || state.finalReviewTriggered) return;
    finalReviewFiredRef.current = true;
    patch({ finalReviewTriggered: true });
    triggerFinalReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextStep.id, state.finalReviewTriggered]);

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
  // greeting used to prefer over `username` was removed (replaced by what's now `state.citizenship`
  // — see "Real International Student Logic," CLAUDE.md, for why that field was later reworded/
  // renamed from a plain "country" question into a real, logic-consuming citizenship one), so the
  // greeting now just reads `username` directly — it's guaranteed non-blank by the time a user can
  // ever reach the hub (SignUpScreen's own `canContinue` gate), so there's no "not set yet" case to
  // handle here either way.
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
  // + portaled overlay modal entirely. The "Ask MyPath AI anything" trigger lives right under the
  // mascot's own dialogue bubble (rendered further down).
  //
  // Make "Ask MyPath AI anything" available before the tutorial finishes (see CLAUDE.md) — this
  // button used to be GATED on `sequenceComplete && guidedStepAlreadySeen` (only once the guided
  // sequence's one-time completion message had already been delivered), REPLACING the dialogue
  // bubble's own text rather than sitting alongside it. It now renders unconditionally, underneath
  // whatever real dialogue text is currently showing (or alone, once that text has genuinely gone
  // quiet) — a student can ask the general assistant something at any point during the tutorial,
  // not only after finishing it.
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
    // Final Alignment-Check Conversation (see CLAUDE.md) — when the current guided step is
    // specifically the final review, land directly on "Our Conversation" (the pinned narrative
    // session), where the fresh check-in message is already waiting, even if the student had last
    // been using a different general session. Deliberately conditional, not applied on every click
    // of this same button — forcing the session at every other point in the walkthrough would
    // clobber a student's own deliberate choice to stay on an unrelated general session.
    if (nextStep.id === 'finalReview') patch({ activeChatSessionId: 'narrative' });
    // Hub redesign, Stage 2 — a manual tour or a transient note has nothing left to point at once
    // the tile grid unmounts for the chat panel, so both are cleared on the way in rather than
    // left stale for whenever the student comes back.
    setTourIndex(null);
    setTransientNote(null);
    setChatPhase('tiles-exiting');
    chatTransitionTimer.current = setTimeout(() => setChatPhase('chat'), TILE_EXIT_MS);
  };
  const closeChat = () => {
    // Opt-In Voice Per Message in Chat (see CLAUDE.md) — chat audio is no longer driven by
    // HubScreen's own useMascotSpeech call (there's no more auto-triggered "current reply" text to
    // clear); a per-message Play button's own audio now lives entirely inside `ChatConversation`,
    // which stops it on its own unmount. Calling the shared `stopSpeaking()` primitive directly
    // here still stops any in-progress playback the INSTANT "Back to Hub" is clicked, rather than
    // waiting the full exit-transition duration for that unmount to actually happen — the same
    // "don't let it keep talking" posture this app already holds everywhere else, just reached via
    // the underlying function instead of a React-state change now that there's no shared state left
    // to clear for this.
    stopSpeaking();
    setChatPhase('chat-exiting');
    chatTransitionTimer.current = setTimeout(() => setChatPhase('hidden'), CHAT_EXIT_MS);
  };

  const avatarOption = AVATAR_OPTIONS.find((a) => a.id === state.avatarIcon);

  // Hub redesign, Stage 2 — the topbar search is now genuinely functional, not a "Coming soon"
  // placeholder: it filters/opens REAL, already-existing tiles (title + description substring
  // match), so it needed no fabricated data or a second search concept to build. Typing dims any
  // non-matching tile (below, in the tile grid); Enter opens the first UNLOCKED match, if any —
  // a real, honest "no matches" note otherwise (cleared the instant the query is edited again).
  const [searchValue, setSearchValue] = useState('');
  const [searchNoMatch, setSearchNoMatch] = useState(false);
  const searchQuery = searchValue.trim().toLowerCase();
  const tileMatchesSearch = (tile) => !searchQuery || `${tile.title} ${tile.desc}`.toLowerCase().includes(searchQuery);
  const submitSearch = (e) => {
    e.preventDefault();
    if (!searchQuery) { setSearchNoMatch(false); return; }
    const match = tiles.find((t) => tileMatchesSearch(t) && t.unlock(state, hasPartnerSchool));
    if (match) { setSearchNoMatch(false); goTo(match); } else setSearchNoMatch(true);
  };

  // Glassmorphism redesign, Stage 1's own footer "Keep going" CTA (see CLAUDE.md) — points at the
  // real next incomplete/unlocked module, reading the exact same `nextStep` (GUIDED_SEQUENCE) data
  // the guide panel above already resolves, never a second, invented "what's next" concept.
  // `finalReview` has no hub tile of its own (that conversation lives behind "Ask MyPath AI
  // anything," not a tile) — every other real step id corresponds to a real tile, including the
  // synthetic `ENDPOINT_STEP`'s own 'plan' id once the sequence is complete.
  const keepGoingTile = nextStep.id === 'finalReview' ? null : TILES.find((t) => t.id === nextStep.id);
  const keepGoingTarget = nextStep.id === 'finalReview'
    ? { label: 'Continue our conversation', onClick: openChat }
    : (keepGoingTile ? { label: keepGoingTile.title, onClick: () => goTo(keepGoingTile) } : null);

  return (
    <div className="hub-screen">
      {/* Glassmorphism redesign, Stage 1 (see CLAUDE.md) — a fixed, low-opacity gradient wash plus
          a few slow-drifting ambient color blobs (periwinkle/pink/mint), reading the new shared
          `--glass-*` tokens (global.css) rather than one-off hub-scoped values, since this same
          background layer is meant to apply to Chat/Roadmap/Welcome once those get their own,
          separately-scoped pass. Purely decorative. */}
      <div className="hub-glass-bg" aria-hidden="true">
        <span className="hub-glass-blob hub-glass-blob-periwinkle" />
        <span className="hub-glass-blob hub-glass-blob-pink" />
        <span className="hub-glass-blob hub-glass-blob-mint" />
        {/* Hub redesign, Stage 2 — 2 small floating glass bubbles, on top of Stage 1's own 3-blob
            wash, for a bit more of the reference design's iridescent depth. */}
        <span className="hub-glass-bubble hub-glass-bubble-a" />
        <span className="hub-glass-bubble hub-glass-bubble-b" />
      </div>

      <div className="hub-topbar">
        <div className="hub-topbar-logo">
          <Leaf size={22} color="var(--hub-accent)" />
          MyPath
        </div>
        <form className="hub-topbar-search" onSubmit={submitSearch}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              // A fresh edit clears any previously-shown "no matches" note — re-submitting (even
              // the same text) is what reveals it again, not leaving a stale note up while typing.
              setSearchNoMatch(false);
            }}
          />
          {searchNoMatch && <span className="hub-topbar-search-note">No open tool matches that yet.</span>}
        </form>
        <div className="hub-topbar-actions">
          {/* The bell itself stays decorative — this app has no real notifications feature to back
              a live badge count with, and inventing one would be exactly the kind of fabricated
              number this codebase's data layer never allows itself elsewhere — but it's no longer
              a pure no-op: it shows a real, honest static note in the guide panel, the same
              harmless "small transient message" convention this screen's own locked-tile feedback
              now uses too. */}
          <button
            type="button"
            className="hub-icon-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => showTransientNote("No new notifications — you're all caught up.")}
          >
            <Bell size={16} />
          </button>
          {/* ElevenLabs Voice integration (see CLAUDE.md) — always renders now (no more
              `isSpeechAvailable()` client feature-detection gate, and no more separate "Choose
              mascot voice" gear — see App.jsx's own matching comment for why).
              Independent Toggle Controls for AI Voice and Background Music (see CLAUDE.md) — the
              old single-click mute button is now the shared SoundSettingsPopover (also used by
              App.jsx's own generic header), exposing two genuinely independent controls. Stage 1's
              own "voice-toggle button can render visually but should no-op or defer to whatever
              the app already does" is exactly what this already does — untouched. */}
          <SoundSettingsPopover buttonClassName="hub-icon-btn" />
          {/* Glassmorphism redesign, Stage 1 — a real, clickable gradient profile button (was a
              plain decorative div) now navigating to the always-unlocked Profile tile, matching
              the mockup's own "gradient profile button" recipe with a genuine destination behind
              it, not pure decoration. */}
          <button type="button" className="hub-avatar" aria-label="Open your profile" onClick={() => patch({ screen: 'profile' })}>
            {avatarOption ? <avatarOption.Icon size={17} /> : <User size={17} />}
          </button>
        </div>
      </div>

      <div className="hub-top-section">
        <div className="hub-header-row">
          {greetingName && <p className="hub-welcome-line">Welcome back, {greetingName}! 👋</p>}
          {/* Adapt Claude Design's Output (see CLAUDE.md) — the headline's second clause gets the
              attached design's own gradient-text treatment (a plain <span>, no logic involved);
              the first clause stays plain ink, matching the reference's own "lead-in, then
              gradient payoff" split. Untouched by the Stage 1 glassmorphism pass — already a real
              gradient headline over an eyebrow + supporting copy, exactly what Stage 1's own intro
              column calls for. */}
          <h1 className="page-title hub-title">What would you like <span className="hub-title-gradient">to accomplish today?</span></h1>
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

      {/* Hub redesign, Stage 2 (see CLAUDE.md) — the mascot's own hero block, directly above the
          guide panel (its speech-bubble partner). `mascotRef` is what `usePointAngle` measures
          FROM; a small decorative glass halo + a slow orbit ring (two small dot accents) echo the
          reference design's own iridescent glass look without forking `MascotIcon`'s real
          geometry — the same illustration used everywhere else in the app, just given new
          Hub-only surrounding chrome. `chat-grown` reuses the exact existing (previously dormant)
          grow/shrink transition this class already carries from the Hub-to-Chat transition work,
          so the mascot still visibly grows while the chat panel opens and shrinks back on close. */}
      <div className="hub-mascot-hero">
        <span className="hub-mascot-orbit" aria-hidden="true">
          <span className="hub-mascot-orbit-dot hub-mascot-orbit-dot-a" />
          <span className="hub-mascot-orbit-dot hub-mascot-orbit-dot-b" />
        </span>
        <div
          className={`hub-mascot-figure${(chatPhase === 'tiles-exiting' || chatPhase === 'chat') ? ' chat-grown' : ''}`}
          ref={mascotRef}
        >
          <MascotIcon size={150} speaking={isSpeaking} pointing={isSpeaking} pointAngle={pointAngle} />
        </div>
      </div>

      {/* The guide panel — the real current hub-guide message (`guideText`, resolved above from
          whichever of a transient note / manual tour step / the live GUIDED_SEQUENCE state is
          currently active). A neutral, non-invented placeholder shows whenever there's genuinely
          no active message left (the sequence is complete and its one-time completion line has
          already been shown once). */}
      <div className="hub-guide-panel">
        <div className="hub-guide-panel-icon" aria-hidden="true"><Sparkles size={18} /></div>
        <div className="hub-guide-panel-body">
          <p className="hub-guide-panel-eyebrow">{guideEyebrow}</p>
          {/* `key` forces a fresh DOM node whenever the message text itself changes, the same
              "new key = new node = the entrance animation replays" pattern this file already used
              for `.mascot-dialogue` before this stage. */}
          <p key={guideText} className="hub-guide-panel-text">{guideText}</p>
          <div className="hub-guide-panel-actions">
            {activeTourTile ? (
              // A real, honest walkthrough — the real `tiles` array in order, own real title/desc,
              // no fabricated tour copy. Ends back on the live guided-sequence state either way.
              <>
                <button type="button" className="hub-tour-btn hub-tour-btn-ghost" onClick={skipTour}>Skip tour</button>
                <span className="hub-tour-counter">{tourIndex + 1} / {tiles.length}</span>
                <button type="button" className="hub-tour-btn hub-tour-btn-primary" onClick={tourNext}>
                  {tourIndex + 1 >= tiles.length ? 'Done' : 'Next'} <ArrowRight size={13} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  ref={(el) => { if (el) tileRefs.current.set('askAi', el); else tileRefs.current.delete('askAi'); }}
                  className={`hub-ask-ai-bubble-btn${pointingTargetId === 'askAi' ? ' pointing-target' : ''}`}
                  onClick={openChat}
                >
                  <Sparkles size={14} /> Ask MyPath AI anything
                </button>
                {chatPhase === 'hidden' && (
                  <button type="button" className="hub-tour-btn hub-tour-btn-ghost" onClick={startTour}>
                    Take the tour
                  </button>
                )}
                {/* The reference image's own "1/6" indicator, built from real GUIDED_SEQUENCE data
                    (getGuidedProgress above) rather than invented — no "AI" branding anywhere here. */}
                <div className="hub-progress-dots">
                  {Array.from({ length: guidedProgress.total }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={i} className={`hub-progress-dot${i < guidedProgress.doneCount ? ' done' : ''}${i === guidedProgress.currentIndex ? ' current' : ''}`} />
                  ))}
                  <span className="hub-progress-count">{Math.min(guidedProgress.currentIndex + 1, guidedProgress.total)}/{guidedProgress.total}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {(chatPhase === 'hidden' || chatPhase === 'tiles-exiting') && (
        // Glassmorphism redesign, Stage 1 (see CLAUDE.md) — a clean, responsive glass-card grid
        // using the real tile array/order directly, replacing the old scattered radial layout
        // (which existed only to scatter tiles around a centered mascot — with no mascot in this
        // stage, there's nothing left to scatter around). Per the user's own confirmed
        // interpretation: a real tile count like this app's own doesn't map cleanly to a fixed
        // scatter composition anyway, so a grid is the honest, robust choice here.
        <div className="hub-tile-grid">
          {tiles.map((tile, i) => {
            const unlocked = tile.unlock(state, hasPartnerSchool);
            // A tile's real "completed" state, where one honestly exists: the same GUIDED_SEQUENCE
            // step this tile corresponds to (careers/majors/programs/courseSelection/opportunities/
            // projectBuilder/myNarrative) already tracks real completion via `isDone` — reused
            // directly here rather than inventing a second concept. Tiles with no matching guided
            // step (Academic Plan, Your School List, Profile) have no "done" state at all, by
            // design — they're meant to be revisited, not finished.
            const guidedStep = GUIDED_SEQUENCE.find((s) => s.id === tile.id);
            const done = unlocked && !!guidedStep?.isDone(state);
            const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
            const isExiting = chatPhase === 'tiles-exiting';
            // Hub redesign, Stage 2 — a locked tile is no longer HTML `disabled`: clicking it now
            // shows its own real `lockedReason` in the guide panel and retargets the beam at its
            // real dependency (`noteLockedTile`) instead of being a silent no-op. Real navigation
            // still requires `unlocked` either way. `aria-disabled` keeps the semantics honest for
            // assistive tech even though the element stays natively clickable/focusable.
            const isPointingTarget = pointingTargetId === tile.id;
            const matchesSearch = tileMatchesSearch(tile);
            return (
              <button
                type="button"
                key={tile.id}
                ref={(el) => { if (el) tileRefs.current.set(tile.id, el); else tileRefs.current.delete(tile.id); }}
                className={`hub-tile${unlocked ? '' : ' locked'}${done ? ' completed' : ''}${isExiting ? ' hub-tile-exiting' : ''}${isPointingTarget ? ' pointing-target' : ''}${matchesSearch ? '' : ' hub-tile-search-dim'}`}
                aria-disabled={!unlocked}
                onClick={() => (unlocked ? goTo(tile) : noteLockedTile(tile))}
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
                <div className="hub-tile-top-row">
                  <div className="hub-tile-icon-box">
                    {unlocked
                      ? <tile.Icon size={22} />
                      : <Lock className="hub-tile-lock-icon" size={20} />}
                  </div>
                  {unlocked && (
                    <span className={`hub-tile-status${done ? ' done' : ''}`}>
                      {done ? (<><Check size={11} /> Done</>) : 'OPEN'}
                    </span>
                  )}
                </div>
                <div className="hub-tile-title">{tile.title}</div>
                <p className="hub-tile-desc">{tile.desc}</p>
                {!unlocked && (
                  <p className="hub-tile-lock-reason">{tile.lockedReason(state, hasPartnerSchool)}</p>
                )}
                {unlocked && <ArrowRight className="hub-tile-arrow" size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {(chatPhase === 'chat' || chatPhase === 'chat-exiting') && (
        <HubChatPanel
          exiting={chatPhase === 'chat-exiting'}
          onBack={closeChat}
        />
      )}

      {/* Glassmorphism redesign, Stage 1's own footer "Keep going" CTA (see CLAUDE.md) — see
          `keepGoingTarget` above; hidden while the chat is open/transitioning, matching the rest
          of this row's own visibility. */}
      {chatPhase === 'hidden' && keepGoingTarget && (
        <button type="button" className="hub-keepgoing-btn" onClick={keepGoingTarget.onClick}>
          Keep going: {keepGoingTarget.label} <ArrowRight size={14} />
        </button>
      )}

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

      {isDevToolsEnabled() && (
        <div className="hub-debug-row">
          <button type="button" className="hub-reset-btn" onClick={handleReset}>
            <RotateCcw size={12} /> Reset
          </button>
          <button type="button" className="hub-debug-profile-btn" onClick={openProfileDebug}>
            <Bug size={12} /> View AI Profile (Testing)
          </button>
        </div>
      )}

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

// Hub redesign, Stage 2 (see CLAUDE.md) — measures the REAL angle from the mascot's own center to
// the current target's actual center (a real tile, or the "Ask MyPath AI anything" button under
// the synthetic id `'askAi'`), same "don't fake it, measure real DOM positions" posture
// WelcomeScreen's own marker placement already established. Recovered verbatim from this screen's
// own pre-glassmorphism implementation (git history, commit `8a8d2fb`) rather than reinvented —
// that version already fixed the one real bug this hook had (an earlier pass reduced the
// measurement down to a binary left/right comparison, aiming every target on a given side at the
// identical fixed angle regardless of exactly where it sat). Returns `null` (mascot stays
// centered, no pointing pose applied) until a real measurement is available.
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
    // A plain synchronous call here would race React StrictMode's dev-only double-mount: the ref
    // callbacks that populate `tileRefs` haven't landed yet the instant this specific layout
    // effect fires (confirmed directly the first time this hook existed). A single
    // `requestAnimationFrame` defers the first measurement to after the browser's next paint, by
    // which point StrictMode's mount/remount cycle has settled and every ref is reliably attached
    // — same "don't trust synchronous-at-mount DOM state, wait a frame" lesson WelcomeScreen's own
    // double-rAF trail reveal already established for this codebase, just one rAF instead of two
    // since there's no CSS transition being raced here, only a DOM read.
    const raf = requestAnimationFrame(recompute);
    // Tile positions genuinely reflow on resize (a real CSS grid, not a fixed-viewBox SVG) and
    // whenever the number of rendered tiles changes (`hasPartnerSchool` toggling, or the pointing
    // target itself moving to a different tile). These later calls need no rAF wrapper of their
    // own — by resize time the DOM is already settled, this only mattered for the very first
    // measurement racing mount.
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, tileCount]);

  return angle;
}
