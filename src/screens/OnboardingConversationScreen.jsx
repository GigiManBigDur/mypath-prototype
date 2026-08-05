import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Rocket } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from '../components/MascotIcon';
import ChatConversation from '../components/ChatConversation';
import { useOnboardingChat, buildOnboardingGreeting } from '../hooks/useOnboardingChat';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { NARRATIVE_OVERVIEW_CATEGORY_ID, NARRATIVE_OVERVIEW_PROJECT_TYPE_ID, getNarrativeProject } from '../data/projects';
import { getEffectiveToday, toDateInputValue, computeMilestoneDueDates } from '../utils/dates';
import { makeTaskId } from '../utils/ids';

// AI Conversation Page: First-Impression Visual Design (see CLAUDE.md) — this is the student's
// first real meeting with the AI, so it gets its own genuine "moment," not just Stage 2's plain
// chat box with a header (which this screen used to be, byte-for-byte). Every piece of the real
// conversation underneath is completely unchanged — the same `useOnboardingChat` hook, the same
// `state.onboardingChatHistory` thread, the same `ChatConversation` UI, the same
// `api/onboarding-chat.js` endpoint — this pass only choreographs HOW that conversation is first
// revealed.
//
// Phase state machine (local, ephemeral — mirrors HubScreen.jsx's own `chatPhase` pattern, not
// persisted to `state`):
//   'entering'  -> Task 1: the page starts nearly empty (a rich, atmospheric gradient background —
//                  see `body:has(.onboarding-meeting-active)`, global.css); the mascot fades AND
//                  scales in from the center, larger/more prominent than its normal hub size.
//   'greeting'  -> Task 2: once fully faded in, the mascot begins its scripted opening greeting
//                  using the EXISTING speaking animation + voiceover (`useMascotSpeech`) — shown in
//                  its own standalone speech bubble, with no chat input/history visible yet. A pure,
//                  focused "meeting" beat.
//   'settling'  -> Task 3: the greeting has finished being "said" — the mascot smoothly shrinks and
//                  repositions (the same grow/shrink transform-transition pattern
//                  `.hub-mascot-figure`/`.chat-grown` already established for the Hub-to-Chat
//                  transition), while the real chat interface (message history + input) fades in
//                  around it with the same staggered entrance style that transition already uses.
//   'chat'      -> the normal, fully-settled conversation layout: a small mascot header + the full
//                  real history + input, exactly like every other real chat surface in this app.
//
// This entire sequence plays ONLY the very first time this conversation is genuinely empty (see
// `freshMeeting` below) — a later revisit (Back then forward again, a reload mid-conversation)
// skips straight to the settled 'chat' layout, the same "don't replay a one-time entrance on a
// return visit" precedent WelcomeScreen's own `hasPlayedIntro` module flag already established,
// just derived here from real conversation data instead of a module-level flag (this conversation
// genuinely only has one "first meeting," unlike Welcome's hero, which could be revisited by
// navigating Back from Sign-Up without ever restarting the app).
//
// Persist and Allow Continuing the Onboarding Conversation (see CLAUDE.md) — this screen is no
// longer reachable exactly once. Task 1: the conversation already persists via the exact same
// generic `state`-to-`localStorage` mechanism every other field in this app already uses (nothing
// special-cased `onboardingChatHistory` out of that — it's just a normal DEFAULT_STATE field), so
// nothing needed to change here for it to survive a reload/new session. Task 3: a new, always-
// unlocked hub tile ("Our Conversation," HubScreen.jsx) now reopens this SAME screen at any time —
// `freshMeeting` already correctly resolves to `false` the instant real prior history exists, which
// is exactly the condition a hub-triggered reentry meets, so the choreographed "meeting" sequence
// above is automatically skipped for a revisit with zero additional logic needed; only the Back
// button's own target needed a real change (see its own comment below) to route to the hub instead
// of Survey once this is no longer necessarily the original first-time entry.
const MASCOT_ENTER_MS = 900; // matches (with a little slack) .onboarding-mascot-figure's own CSS transition duration.
const SETTLE_MS = 700; // matches (with a little slack) the stage-collapse + mascot-shrink CSS transition duration.
// A generous safety net only — `useMascotSpeech`'s own internal worst-case (a ~4s fetch-latency
// buffer plus up to a ~6s estimated-reading-time fallback) tops out well under this, so in normal
// operation this timer is never the thing that actually advances the phase.
const GREETING_FALLBACK_MS = 11000;

// Task 4 — small, decorative floating particles, reusing the exact same visual language
// (`hub-particle-float` keyframe) HubScreen.jsx's own `PARTICLES` already established, rather than
// inventing a second decorative system for this one screen. A fresh, slightly denser scatter of
// the same shared bloom accent colors, since this page is meant to read as a bit more special/
// "dreamy" than the standard hub view it's a one-time preface to.
const PARTICLES = [
  { x: 12, y: 16, size: 8, color: 'var(--bloom-purple)' },
  { x: 88, y: 12, size: 7, color: 'var(--bloom-yellow)' },
  { x: 8, y: 42, size: 6, color: 'var(--bloom-teal)' },
  { x: 92, y: 38, size: 8, color: 'var(--bloom-pink)' },
  { x: 20, y: 68, size: 7, color: 'var(--bloom-blue)' },
  { x: 80, y: 70, size: 6, color: 'var(--bloom-orange)' },
  { x: 50, y: 8, size: 6, color: 'var(--bloom-teal)' },
  { x: 35, y: 88, size: 8, color: 'var(--bloom-purple)' },
  { x: 65, y: 90, size: 7, color: 'var(--bloom-yellow)' },
  { x: 6, y: 88, size: 6, color: 'var(--bloom-pink)' },
  { x: 94, y: 86, size: 7, color: 'var(--bloom-blue)' },
];

export default function OnboardingConversationScreen() {
  const { state, patch } = useApp();
  const { chatHistory, loading, sendMessage, editMessage } = useOnboardingChat();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Frozen at mount, BEFORE `useOnboardingChat`'s own greeting-seeding effect ever runs (a plain
  // lazy `useState` initializer only reads its function once, on the very first render, ahead of
  // any effect) — this is what correctly distinguishes "the very first time this conversation ever
  // loads" from "revisiting an already-started one," rather than reading a length that's already
  // been seeded by the time this check would otherwise run.
  const [freshMeeting] = useState(() => chatHistory.length === 0);
  const [phase, setPhase] = useState(() => (reducedMotion || !freshMeeting ? 'chat' : 'entering'));
  const [mascotVisible, setMascotVisible] = useState(reducedMotion || !freshMeeting);

  // Task 1 — the same double-`requestAnimationFrame` technique WelcomeScreen's own trail reveal
  // already established: the browser needs to actually paint the hidden starting style on one
  // frame before the transition-triggering class change happens on the next, or both style changes
  // risk landing in the same paint and skipping the animation entirely.
  useEffect(() => {
    if (phase !== 'entering') return undefined;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setMascotVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [phase]);

  // Once the mascot has finished fading/scaling in, move into the 'greeting' phase — this is what
  // starts the mascot actually speaking (below).
  useEffect(() => {
    if (phase !== 'entering' || !mascotVisible) return undefined;
    const t = setTimeout(() => setPhase('greeting'), MASCOT_ENTER_MS);
    return () => clearTimeout(t);
  }, [phase, mascotVisible]);

  // Task 2 — the greeting is only ever "spoken" (auto-played via `useMascotSpeech`) during this one
  // phase; every other phase passes `null`, so it never re-triggers later even though the identical
  // text becomes a real, independently-replayable (opt-in Play button) message inside the chat the
  // moment 'settling' begins.
  const greetingText = buildOnboardingGreeting(state.username);
  const isSpeaking = useMascotSpeech(phase === 'greeting' ? greetingText : null, state.voiceMuted);
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (phase !== 'greeting') { wasSpeakingRef.current = false; return undefined; }
    if (isSpeaking) { wasSpeakingRef.current = true; return undefined; }
    if (wasSpeakingRef.current) {
      // Real speech (or its estimated-duration fallback, if muted/unavailable) just genuinely
      // finished — this is Task 3's own transition trigger.
      setPhase('settling');
      return undefined;
    }
    // Safety net only, in case `isSpeaking` never toggles true at all — shouldn't happen in
    // practice, since `useMascotSpeech`'s own internal fallback timing is designed to always
    // eventually resolve well before this fires.
    const t = setTimeout(() => setPhase('settling'), GREETING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [phase, isSpeaking]);

  useEffect(() => {
    if (phase !== 'settling') return undefined;
    const t = setTimeout(() => setPhase('chat'), SETTLE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const isHeroPhase = phase === 'entering' || phase === 'greeting';
  const mascotModifier = phase === 'entering' && !mascotVisible ? 'hidden' : isHeroPhase ? 'large' : 'small';
  // Task 4 — the atmospheric gradient/particles are the "special, one-time moment" treatment; once
  // truly settled into ongoing chat, the background recedes back to the plain flat bloom color
  // (matching this app's own prior, explicit "colorful glow behind an ongoing utility screen reads
  // as too much — keep the particles, drop the background wash" feedback for the hub's own chat
  // view) so it never competes with the actual conversation for attention long-term.
  const showAtmosphere = phase !== 'chat';
  const showChatCard = phase === 'settling' || phase === 'chat';

  // AI-First Onboarding, Stage 3 (see CLAUDE.md) — Task 4's own "reject and keep refining" review,
  // built on the EXACT same precedent BuildYourOwnView's own `latestReadyPlan`/`dismissedReadyIndex`
  // pair already established (see ProjectBuilderScreen.jsx): scan the persisted conversation for
  // the MOST RECENT assistant turn that reported `readyForOverview: true`, so the review always
  // reflects the latest thinking even if the student keeps refining after an earlier turn already
  // reached it. `dismissedReadyIndex` tracks by the ready message's own INDEX (not a plain boolean)
  // for the identical reason that precedent already documents: dismissing THIS turn's review must
  // never suppress a LATER, genuinely new one if the student keeps talking and the model reaches
  // readyForOverview again.
  const latestReadyOverview = useMemo(() => {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const m = chatHistory[i];
      if (m.role === 'assistant' && m.readyForOverview && m.overviewPhaseTitles?.length) {
        return {
          narrativeTitle: m.narrativeTitle,
          narrativeSummary: m.narrativeSummary,
          overviewPhaseTitles: m.overviewPhaseTitles,
          // Expand the Multi-Year Overview (see CLAUDE.md) — read the same defensive "|| null"/
          // "|| []" way every other optional overview field already is, since a response from
          // before this feature shipped simply won't have these fields at all.
          overviewPhaseDescriptions: m.overviewPhaseDescriptions || null,
          phaseDimensions: m.phaseDimensions || null,
          overviewPhaseDayOffsets: m.overviewPhaseDayOffsets,
          capstoneIdea: m.capstoneIdea || null,
          // Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") — the
          // 4 newly hard-required overview dimensions, read the same defensive "|| null" way.
          courseGuidanceNote: m.courseGuidanceNote || null,
          testingTimelineNote: m.testingTimelineNote || null,
          collegeListNote: m.collegeListNote || null,
          essayMaterialNote: m.essayMaterialNote || null,
          thematicKeywords: m.thematicKeywords || [],
          // Bug fix (see CLAUDE.md) — real, server-validated interest tags, read the same
          // defensive "|| []" way thematicKeywords already is (a response from before this fix
          // shipped simply won't have this field at all).
          matchedInterestTags: m.matchedInterestTags || [],
          sourceIndex: i,
        };
      }
    }
    return null;
  }, [chatHistory]);
  const [dismissedReadyIndex, setDismissedReadyIndex] = useState(-1);
  const showReview = !!latestReadyOverview && latestReadyOverview.sourceIndex !== dismissedReadyIndex;

  // Task 1 — reuses the SAME shared `computeMilestoneDueDates` Build Your Own's own project-
  // confirmation flow already established (extracted to utils/dates.js specifically so both
  // callers share one implementation) — every phase after the first gets a real, explicit `dueDate`
  // from the model's own proposed `overviewPhaseDayOffsets`; phase 0 always anchors to the real
  // start date below. Once THIS is written into a `startedProjects` entry shaped exactly like a
  // Build Your Own project's own `overviewMilestones`, the "provisional-then-corrected" date
  // behavior Task 1 asks for is completely automatic — `buildOverviewMilestoneChains`
  // (roadmapGenerator.js) already prefers the max of a phase's real subSteps' dates over this
  // initial guess the MOMENT that phase's own granular detail is generated later (via the exact
  // same, already-existing `MilestonePlanningPanel`/`Roadmap.jsx` mechanism Build Your Own's own
  // phases already use — see below for why that needed zero code changes here).
  //
  // Task 4's own "once confirmed, this becomes the real data Stage 4's 'My Narrative' view will
  // display" — `state.narrativeSummary`/`state.narrativeThemes` are that real, durable data (Task
  // 2/3); the generated PHASES themselves live as a real `startedProjects` entry, reusing
  // `NARRATIVE_OVERVIEW_CATEGORY_ID`/`NARRATIVE_OVERVIEW_PROJECT_TYPE_ID` (data/projects.js) — a
  // SEPARATE sentinel pair from Build Your Own's own (see that file's own comment for why they must
  // stay distinct: HubScreen.jsx's own guided-sequence "has the student done something in Project
  // Builder" check has to be able to tell the two apart). `Roadmap.jsx`'s existing `milestoneMeta`-
  // keyed modal handling, `MilestonePlanningPanel`, and `roadmapGenerator.js`'s own
  // `buildOverviewMilestoneChains`/`applyOverviewLocking` are ALL already fully generic over ANY
  // `startedProjects` entry with `overviewMilestones` — confirmed directly by reading each one
  // before writing this — so creating this entry here is the ENTIRE integration; none of those
  // files needed a single line changed for a narrative-overview project to render, lock/unlock,
  // and support its own per-phase planning chat exactly like a Build-Your-Own one already does.
  //
  // Persist and Allow Continuing the Onboarding Conversation (see CLAUDE.md), Task 2 — confirming
  // a SECOND (or later) time no longer wholesale REPLACES the existing narrative project the way
  // it originally did ("this does not try to preserve/merge whatever progress existed on the old
  // phases" — the OLD claim this comment used to make, now superseded). Real, already-built
  // progress must survive a direction update: a phase the student has already completed, or has
  // already engaged with (real subSteps or a real scoped planning chat), is a genuine, permanent
  // fact about the plan now — it should never quietly vanish just because a later conversation
  // moved the FORWARD-LOOKING direction. `preservedCount` walks the OLD project's own milestones
  // from index 0 and stops at the first one with zero real engagement — since
  // `applyOverviewLocking` (roadmapGenerator.js) already guarantees phase N+1 can never be touched
  // before phase N is done, this "leading engaged run" is well-defined and monotonic: everything
  // before it is real, permanent history; everything from it onward is still forward-looking and
  // fair game to regenerate. Those PRESERVED milestones are carried over completely verbatim (same
  // id/desc/dueDate/subSteps/chatHistory) — their ids are what `completedNodes`/`taskOutcomes`
  // already key off of, so keeping them stable is what keeps that real completion/outcome data
  // meaningfully attached rather than orphaned. Only the milestones AT OR AFTER `preservedCount`
  // are replaced with the model's own freshly regenerated ones (slicing its own
  // overviewPhaseTitles/overviewPhaseDescriptions/phaseDimensions/overviewPhaseDayOffsets arrays
  // the same way, so a preserved phase's own real content is never second-guessed by a newer
  // generation that was never asked to replace it) — `computeMilestoneDueDates` is called ONLY
  // over that suffix, anchored to TODAY (the real day of this re-confirm, not the project's
  // original start date), which is exactly right: the next thing the student will actually work on
  // should start from where they genuinely are now, not from a stale original anchor. The project's
  // own `id`/`startDate` are preserved too when a narrative project already exists — this is
  // genuinely the SAME evolving plan continuing, not a new one superseding it. When no narrative
  // project exists yet (a first-time confirm), `preservedCount` is naturally 0 and every phase
  // comes from the model's own regeneration — byte-for-byte the same behavior a first confirm
  // already had before this change.
  const confirmNarrative = () => {
    if (!latestReadyOverview) return;
    const todayStr = toDateInputValue(getEffectiveToday(state.dateOverride));
    const existingProject = getNarrativeProject(state);
    const oldMilestones = existingProject?.overviewMilestones || [];

    let preservedCount = 0;
    for (const m of oldMilestones) {
      const engaged = !!state.completedNodes[m.id] || (m.subSteps || []).length > 0 || (m.chatHistory || []).length > 0;
      if (!engaged) break;
      preservedCount += 1;
    }
    const preservedMilestones = oldMilestones.slice(0, preservedCount);

    const newTitles = latestReadyOverview.overviewPhaseTitles.slice(preservedCount);
    const newDescriptions = (latestReadyOverview.overviewPhaseDescriptions || []).slice(preservedCount);
    const newDimensions = (latestReadyOverview.phaseDimensions || []).slice(preservedCount);
    const newDayOffsets = (latestReadyOverview.overviewPhaseDayOffsets || []).slice(preservedCount);
    const newDueDates = computeMilestoneDueDates(todayStr, newTitles, newDayOffsets);

    const freshMilestones = newTitles.map((title, i) => ({
      id: makeTaskId('milestone'),
      title,
      // Expand the Multi-Year Overview (see CLAUDE.md), Task 2 — this is the REAL, rich,
      // dimension-connected content a student now actually reads once a phase unlocks, replacing
      // the old fixed boilerplate sentence ("Part of your [title] direction, developed through
      // your first conversation with MyPath AI.") — kept ONLY as a safety-net fallback for the
      // rare case `overviewPhaseDescriptions` came back null/mismatched (see api/onboarding-
      // chat.js's own validateProposal comment for why that degrades rather than blocking the
      // whole overview).
      desc: newDescriptions[i]
        || `Part of your ${latestReadyOverview.narrativeTitle} direction, developed through your conversation with MyPath AI.`,
      // Task 1's own "summer plans, as their own distinct category" — a real, structured tag
      // (never inferred from the title text) so MyNarrativeScreen.jsx can identify a summer
      // phase reliably. Defaults to 'academic-year' when the array came back null/mismatched —
      // the safe, more common case.
      phaseType: newDimensions[i] || 'academic-year',
      dueDate: newDueDates[i],
      targetDate: null,
      subSteps: [],
      chatHistory: [],
    }));

    const newProject = {
      id: existingProject?.id || makeTaskId('project'),
      categoryId: NARRATIVE_OVERVIEW_CATEGORY_ID,
      projectTypeId: NARRATIVE_OVERVIEW_PROJECT_TYPE_ID,
      projectName: latestReadyOverview.narrativeTitle,
      status: 'active',
      aiSuggested: true,
      startDate: existingProject?.startDate || todayStr,
      overviewMilestones: [...preservedMilestones, ...freshMilestones],
    };
    const withoutOldNarrative = (state.startedProjects || [])
      .filter((p) => p.projectTypeId !== NARRATIVE_OVERVIEW_PROJECT_TYPE_ID);
    patch({
      startedProjects: [...withoutOldNarrative, newProject],
      narrativeSummary: latestReadyOverview.narrativeSummary,
      narrativeThemes: latestReadyOverview.thematicKeywords,
      // Expand the Multi-Year Overview (see CLAUDE.md), Task 1 — the one distinctive capstone idea
      // the overview identified, alongside narrativeSummary/narrativeThemes above. `null` (not
      // overwritten with a stale value) if this specific generation didn't produce a valid one.
      narrativeCapstoneIdea: latestReadyOverview.capstoneIdea,
      // Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") — the 4
      // newly hard-required dimensions, alongside the fields above.
      narrativeCourseGuidance: latestReadyOverview.courseGuidanceNote,
      narrativeTestingNote: latestReadyOverview.testingTimelineNote,
      narrativeCollegeListNote: latestReadyOverview.collegeListNote,
      narrativeEssayMaterialNote: latestReadyOverview.essayMaterialNote,
      // Bug fix (see CLAUDE.md) — this is the ONE real fix for the reported "Careers of Interest
      // won't click" bug: state.interestTags was left permanently empty by Stage 1's own removal
      // of the Survey's interest-tag picker, which made DiscoveryScreen.jsx's own defensive
      // "reached with zero real tracks, bounce back to hub" effect fire unconditionally for every
      // real post-conversation student — not a locked tile, a genuinely broken click, for ALL
      // THREE Discovery sub-steps (Careers/Majors/Programs), not just Careers specifically.
      // Merged into whatever's already there (deduped), not a flat overwrite — a LATER
      // re-confirmation whose own matchedInterestTags happens to come back thinner should never
      // regress a real, already-working set of tags.
      interestTags: [...new Set([...(state.interestTags || []), ...latestReadyOverview.matchedInterestTags])],
    });
    // Same footer-hiding mechanism "keep refining" already uses — marking this same turn's own
    // index as dismissed is what makes the review disappear the moment it's been acted on, with no
    // separate "confirmed" flag needed.
    setDismissedReadyIndex(latestReadyOverview.sourceIndex);
  };

  return (
    <div className={`onboarding-meeting-page${showAtmosphere ? ' onboarding-meeting-active' : ''}`}>
      {PARTICLES.map((p, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span
          key={i}
          className="onboarding-particle"
          aria-hidden="true"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, animationDelay: `${(i % 6) * 0.4}s` }}
        />
      ))}

      {/* Persist and Allow Continuing the Onboarding Conversation (see CLAUDE.md), Task 3 — this
          screen is now reachable a SECOND way, directly from a hub tile, not just once from Survey
          during the original first-time flow. `freshMeeting` (already computed above, frozen at
          mount from whether the conversation was genuinely empty) is exactly the right signal to
          tell the two apart: true means this really is that one-time original entry (Survey just
          completed, nothing said yet), so Back still returns to Survey exactly as before; false
          means real prior conversation content already existed at mount — either a later hub
          reentry, or a moment mid-conversation during the original sitting — where returning to
          Hub reads far more sensibly than looping back to a Survey the student has no reason to
          revisit. */}
      <button type="button" className="btn btn-ghost onboarding-meeting-back" onClick={() => patch({ screen: freshMeeting ? 'survey' : 'hub' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className={`onboarding-mascot-stage${isHeroPhase ? ' onboarding-mascot-stage-hero' : ''}`}>
        <div className={`onboarding-mascot-figure onboarding-mascot-figure--${mascotModifier}`}>
          <MascotIcon size={190} speaking={isSpeaking} thinking={phase === 'chat' && loading} />
        </div>

        {(phase === 'greeting' || phase === 'settling') && (
          <p className={`onboarding-meeting-greeting-bubble${phase === 'settling' ? ' onboarding-meeting-greeting-bubble-exit' : ''}`}>
            {greetingText}
          </p>
        )}

        {phase === 'entering' && (
          <p className="page-sub onboarding-meeting-hero-sub">Let's talk about you.</p>
        )}
      </div>

      {showChatCard && (
        <div className="onboarding-chat-card">
          <div className="chat-header onboarding-chat-card-header">
            <div>
              <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
              <h2 className="hub-chat-title">Getting to know you</h2>
            </div>
          </div>

          <div className="onboarding-chat-card-body">
            <ChatConversation
              messages={chatHistory}
              loading={loading}
              onSend={sendMessage}
              onEditMessage={editMessage}
              placeholder="Tell me what's on your mind…"
              footer={showReview && (
                <div className="chat-task-confirm">
                  <p>
                    <strong>{latestReadyOverview.narrativeTitle}</strong> — {latestReadyOverview.overviewPhaseTitles.length} phases developed
                    from your conversation so far.
                  </p>
                  <p>{latestReadyOverview.narrativeSummary}</p>
                  <ol className="chat-task-confirm-list">
                    {latestReadyOverview.overviewPhaseTitles.map((title, i) => (
                      <li key={title}>
                        {latestReadyOverview.phaseDimensions?.[i] === 'summer' && <span className="onboarding-phase-summer-tag">Summer</span>}
                        {title}
                      </li>
                    ))}
                  </ol>
                  {/* Expand the Multi-Year Overview (see CLAUDE.md), Task 1 — shown here too, not
                      just on the later My Narrative screen, so the student sees this real,
                      distinctive candidate at the moment they confirm the whole plan. */}
                  {latestReadyOverview.capstoneIdea && (
                    <p className="onboarding-capstone-preview">
                      <strong>Capstone idea:</strong> {latestReadyOverview.capstoneIdea}
                    </p>
                  )}
                  {/* Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project
                      Arc") — a compact confirmation that the 4 newly-mandatory dimensions are
                      genuinely present, not just the project arc/summers — full text for each
                      lives on the spacious My Narrative screen once confirmed, not crammed into
                      this already-dense review card. */}
                  {(latestReadyOverview.courseGuidanceNote || latestReadyOverview.testingTimelineNote
                    || latestReadyOverview.collegeListNote || latestReadyOverview.essayMaterialNote) && (
                    <p className="onboarding-dimensions-covered">
                      Also covers: course rigor, testing timeline, college list, and essay material —
                      all tied to this same direction.
                    </p>
                  )}
                  <div className="task-form-actions">
                    <button type="button" className="btn btn-primary" onClick={confirmNarrative}>
                      <Rocket size={14} /> Confirm My Plan
                    </button>
                    {/* Task 4's own "reject and keep refining" option, the same real, visible
                        second action Build Your Own's identical review footer already offers
                        (see BuildYourOwnView, ProjectBuilderScreen.jsx) — only hides THIS review
                        (dismissedReadyIndex, above); nothing in chatHistory/readyForOverview/the
                        proposed phases is touched, so the conversation (and its input, already
                        always visible) is immediately ready for more discussion. */}
                    <button type="button" className="btn btn-ghost" onClick={() => setDismissedReadyIndex(latestReadyOverview.sourceIndex)}>
                      Not quite right — keep refining
                    </button>
                  </div>
                </div>
              )}
            />
          </div>

          <div className="btn-row onboarding-chat-card-footer">
            <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
              Continue to my Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
