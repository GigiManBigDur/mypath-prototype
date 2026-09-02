import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useOnboardingChat } from './useOnboardingChat';
import { NARRATIVE_OVERVIEW_CATEGORY_ID, NARRATIVE_OVERVIEW_PROJECT_TYPE_ID, getNarrativeProject } from '../data/projects';
import { getEffectiveToday, toDateInputValue, computeMilestoneDueDates } from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import { hasRealTranscriptFlow } from '../utils/transcriptEligibility';

// Multi-Session Chat (see CLAUDE.md) — wraps the existing, untouched `useOnboardingChat()` and
// adds the review/confirm layer that used to live inline in `OnboardingConversationScreen.jsx`
// (the `latestReadyOverview` scan, `confirmNarrative`'s real milestone-preservation merge, and the
// dismiss-by-turn-index bookkeeping). Extracted here, verbatim in behavior, so BOTH the original
// pre-hub first-time screen AND the new "Our Conversation" tab inside "Ask MyPath AI anything"
// (`ChatSessionView.jsx`) render the identical narrative conversation/review UI from one shared
// implementation, rather than two independently-maintained copies.
export function useNarrativeSession() {
  const { state, patch } = useApp();
  const { chatHistory, loading, sendMessage, editMessage, triggerEcResume } = useOnboardingChat();

  // AI-First Onboarding, Stage 3 (see CLAUDE.md) — Task 4's own "reject and keep refining" review,
  // built on the EXACT same precedent BuildYourOwnView's own `latestReadyPlan`/`dismissedReadyIndex`
  // pair already established (see ProjectBuilderScreen.jsx): scan the persisted conversation for
  // the MOST RECENT assistant turn that reported `readyForOverview: true`, so the review always
  // reflects the latest thinking even if the student keeps refining after an earlier turn already
  // reached it.
  //
  // Remove Redundant Narrative Card (see CLAUDE.md) — real, confirmed bug fix: this scan used to
  // stop there, and a SEPARATE, ephemeral `dismissedReadyIndex` (`useState(-1)`) tracked which
  // message's own index had already been confirmed/dismissed. Since `ChatSessionView.jsx` mounts
  // this hook inside a component keyed by `key={sessionId}` (required for the multi-session Rules-
  // of-Hooks fix), that local state resets to `-1` on every remount — closing and reopening the
  // chat panel, switching sessions and back, or (the exact reported trigger) the Final Alignment-
  // Check feature's own `openChat` forcing `activeChatSessionId: 'narrative'` — so an
  // already-resolved review card would silently reappear, since the underlying message's own array
  // POSITION never changed, only the (now-gone) local dismissal state did. Fixed by checking
  // `!m.reviewResolved` directly in the scan itself instead — a real, PERSISTED fact written onto
  // the message object (see `markReviewResolved` below), matching this codebase's own established
  // "store the fact directly on the message" convention (`readyForOverview`/`finalReviewComplete`
  // already work this way) — immune to any remount, reload, or session switch, since it's real data,
  // not component state. A genuinely NEW `readyForOverview: true` turn (e.g. a revision produced by
  // the final-review discussion) still surfaces normally, since it starts with no `reviewResolved`
  // field at all.
  const latestReadyOverview = useMemo(() => {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const m = chatHistory[i];
      if (m.role === 'assistant' && m.readyForOverview && m.overviewPhaseTitles?.length && !m.reviewResolved) {
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

  // Guarantee the Transcript & GPA Trigger (see CLAUDE.md) — this REPLACES the earlier "the model
  // proposes readyForTranscriptPause, and (as a fallback) the client forces it once readyForOverview
  // is reached anyway" mechanism (see the "Course Selection Stuck Locked" fix's own now-superseded
  // history for why that fallback existed) with a genuinely deterministic, code-level trigger — no
  // dependency on anything the model says at all. `readyForTranscriptPause` was removed from
  // api/onboarding-chat.js's own schema entirely, not just left unused: the whole point of this fix
  // is that the AI's conversational judgment is no longer PART of the mechanism, so leaving a
  // vestigial field it could still (usually, not always) set correctly would be exactly the
  // "usually reliable, not genuinely deterministic" shape this fix is meant to close for good.
  //
  // `userTurnCount` is a plain, real, arithmetic fact — how many real messages the STUDENT has
  // actually sent — computed fresh from `chatHistory` on every render, nothing async or model-
  // dependent about it. `TRANSCRIPT_PAUSE_AFTER_USER_TURNS` (1) is the hard-coded trigger point:
  // the moment the student's first real reply has been sent AND answered (gated on `!loading` so
  // this doesn't interrupt mid-request — it waits for that first real exchange to genuinely
  // complete, matching the original design's own "even just one or two real exchanges is enough"
  // framing at its earliest, still-natural point), the pause becomes unconditionally true for any
  // eligible, not-yet-completed student — guaranteed to fire identically every single time,
  // regardless of what the AI's own reply said or didn't say. `hasRealTranscriptFlow(state)` is
  // still the real eligibility gate (a plain Undergraduate not at UC Davis has no real transcript
  // screen to hand off to at all, so this never fires for them, deterministically, either).
  const TRANSCRIPT_PAUSE_AFTER_USER_TURNS = 1;
  const userTurnCount = useMemo(() => chatHistory.filter((m) => m.role === 'user').length, [chatHistory]);
  const transcriptStillNeeded = hasRealTranscriptFlow(state) && !state.transcriptCompleted;
  const showTranscriptPause = transcriptStillNeeded && userTurnCount >= TRANSCRIPT_PAUSE_AFTER_USER_TURNS && !loading;
  // `!transcriptStillNeeded` guards the overview review exactly as before this fix — since the
  // deterministic trigger above now ALWAYS resolves the transcript within the conversation's very
  // first exchange (long before readyForOverview's own, much later preconditions could ever be
  // met), this can never actually need to suppress a real ready overview in practice anymore — kept
  // as cheap, harmless defense in depth rather than removed outright.
  const showReview = !!latestReadyOverview && !transcriptStillNeeded;

  const beginTranscriptPause = () => {
    if (!hasRealTranscriptFlow(state)) return;
    patch({ onboardingTranscriptPauseActive: true, screen: 'transcript' });
  };

  // Guaranteed EC Check-In With Auto-Filing (see CLAUDE.md), Task 2 — supersedes the earlier design
  // this comment used to describe (the check only fired for a student who ALREADY had real
  // `priorExperiences` on file). That was never actually "guaranteed" in the sense Transcript & GPA
  // is — a genuine first-time student with nothing on file yet, and none of Task 1's auto-filing
  // having found anything real to file either, would simply never be asked at all. The check-in is
  // now a plain, deterministic, code-level trigger exactly like the transcript one: a real
  // arithmetic fact about how many turns the student has actually sent
  // (`EC_CHECKIN_AFTER_USER_TURNS`), never conditional on whether anything is already on file.
  // `2` (one more than the transcript trigger's own `1`) is deliberately a LITTLE later — since the
  // transcript resume itself is a silent, no-typed-text turn that never increments `userTurnCount`,
  // this guarantees at least one real interest-discussion exchange happens (post-transcript-resume,
  // for a student that flow applies to; from the very start, for one it doesn't) before this
  // check-in interrupts, matching Task 2's own "after the interest discussion" framing. A student
  // with `hasRealTranscriptFlow(state)` false never has a transcript pause to wait on at all, so for
  // them this simply becomes "after their second real reply," which is equally a genuine, if short,
  // real exchange first. `state.ecHandoffCompleted` is the same one-time-ever flag as before —
  // firing at a fixed turn count (rather than "immediately, since data already exists") is what
  // makes this genuinely comparable to the transcript trigger's own guarantee. `!showTranscriptPause`
  // still gives the transcript hand-off strict priority whenever both could apply at once — the
  // footer can only show one action at a time, and finishing academic data first is the more
  // foundational of the two.
  const EC_CHECKIN_AFTER_USER_TURNS = 2;
  const showEcHandoff = !showTranscriptPause
    && !state.ecHandoffCompleted
    && userTurnCount >= EC_CHECKIN_AFTER_USER_TURNS
    && !loading;
  const beginEcHandoff = () => patch({ onboardingEcHandoffActive: true, screen: 'profile' });
  // Task 3's own second real choice — decline directly in the conversation, no forced page visit,
  // for a student who genuinely has nothing more to add (which may be everyone, or nobody, in any
  // given conversation — Task 1's auto-filing may have already filed everything real there was to
  // catch). Never navigates anywhere: `ecHandoffCompleted` is set (the same permanent, one-time
  // flag `beginEcHandoff`'s own Profile-page path eventually sets too, via ProfileScreen.jsx's own
  // `leaveProfile`), and `triggerEcResume()` — now exposed directly from `useOnboardingChat()` for
  // exactly this — fires the identical resume turn that path fires, immediately, with no need for
  // the navigate-away-and-back `pendingOnboardingEcResume` dance that mechanism exists for.
  const declineEcHandoff = () => {
    patch({ ecHandoffCompleted: true });
    triggerEcResume();
  };

  // Remove Redundant Narrative Card (see CLAUDE.md) — the one place a ready-message's own
  // `reviewResolved` flag is ever written, called by both `confirmNarrative` (below) and
  // `dismissReview` alike, since both represent "we're done evaluating THIS SPECIFIC ready-message"
  // — confirming and "keep refining" are equally permanent resolutions of that one turn, just with
  // different outcomes for the plan itself.
  const markReviewResolved = (index) => {
    patch({ onboardingChatHistory: chatHistory.map((m, i) => (i === index ? { ...m, reviewResolved: true } : m)) });
  };

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
    // Same mechanism "keep refining" uses below — marking this same turn's own message as resolved
    // is what makes the review disappear the moment it's been acted on, permanently (see
    // `markReviewResolved` above), with no separate "confirmed" flag needed.
    markReviewResolved(latestReadyOverview.sourceIndex);
  };

  const dismissReview = () => markReviewResolved(latestReadyOverview.sourceIndex);

  return {
    chatHistory, loading, sendMessage, editMessage, latestReadyOverview, showReview, confirmNarrative, dismissReview,
    showTranscriptPause, beginTranscriptPause, showEcHandoff, beginEcHandoff, declineEcHandoff,
  };
}
