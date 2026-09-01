import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { compileStudentProfile } from '../utils/profileCompiler';
import { requestOnboardingChatReply } from '../utils/onboardingChatRequest';

// AI-First Onboarding, Stage 2 (see CLAUDE.md) — the conversation LOGIC for the student's first
// real conversation with the AI, mirroring `useHubChat.js`'s own send/edit shape (the same
// established pattern every real chat surface in this app already uses) but genuinely simpler:
// there's no task-add-confirm/Build-Your-Own-redirect machinery here at all, since this
// conversation has one focused purpose (gathering interests/passions/experience, with real
// narrative-pushback capability — see api/onboarding-chat.js's own system prompt), not general
// app assistance. Reads/writes `state.onboardingChatHistory` — deliberately its OWN field, never
// `state.chatHistory` (the general "Ask MyPath AI anything" conversation), per Task 2's own
// explicit "shouldn't mix" requirement.

// AI Conversation Page: First-Impression Visual Design (see CLAUDE.md) — extracted out of the
// seeding effect below into its own exported function so `OnboardingConversationScreen.jsx`'s own
// choreographed "meeting" sequence can drive this SAME scripted text through the mascot's speaking
// animation/voiceover during its dedicated `'greeting'` phase (shown in a standalone speech bubble,
// before it's technically part of `chatHistory` yet) — one shared source for the string, so the
// two can never independently drift apart.
//
// Connect the AI Conversation's Opening to the Admissions Overview (see CLAUDE.md) — a SECOND
// parameter, `skipped`, picks between two real opening lines depending on whether the student just
// watched the Admissions Overview Presentation all the way through or skipped it:
// - `skipped: true` (Task 1) — the ORIGINAL full introduction, byte-for-byte unchanged. The
//   presentation was never seen, so the mascot still needs to introduce itself and explain why
//   this conversation is happening at all.
// - `skipped: false` (Task 2) — a shorter, connected line that continues from the presentation's
//   own Transition module handoff rather than re-introducing the mascot from scratch — the
//   "who I am and why we're here" part was already covered there, so repeating it here would read
//   as two separate introductions stacked back to back instead of one continuous conversation.
export function buildOnboardingGreeting(username, skipped) {
  const name = username || 'there';
  if (skipped) {
    return `Hey ${name}! I'm your MyPath guide, and before we build anything, I want to actually get to know you — what excites you, what you've already done, and help you figure out a direction that's genuinely yours. So — what do you find yourself genuinely excited about, in or out of school?`;
  }
  return `Now that you've seen how this all works, let's actually talk about you. What do you find yourself genuinely excited about, in or out of school?`;
}

export function useOnboardingChat() {
  const { state, patch } = useApp();
  const chatHistory = state.onboardingChatHistory || [];
  const [loading, setLoading] = useState(false);

  // Task 1 — the mascot's own opening greeting is a fixed, scripted line (using the student's
  // real username from Sign Up), not something that needs a live AI call to generate — the same
  // "pre-written first-run dialogue" precedent every other screen's own intro line already
  // establishes (mascotDialogue.js), just for a real, editable/multi-turn conversation instead of
  // a one-shot line. Seeded once, only when the history is genuinely empty (a fresh onboarding —
  // never re-added on a later visit, since by then the conversation already has real content).
  useEffect(() => {
    if (chatHistory.length > 0) return;
    patch({
      onboardingChatHistory: [{ role: 'assistant', content: buildOnboardingGreeting(state.username, state.admissionsPresentationSkipped) }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared by both a normal send (from the full current history) and an edit-and-resubmit (from
  // history truncated to just before the edited message) — the exact same `sendFrom`/`editMessage`
  // shape `useHubChat.js`/`BuildYourOwnView`/`MilestonePlanningPanel` already established.
  //
  // Final Alignment-Check Conversation (see CLAUDE.md) — generalized with an options object so the
  // one new automatic, no-typed-text turn (`triggerFinalReview`, below) can reuse this exact same
  // send/append/error-handling path rather than a second, parallel implementation:
  // `silent: true` skips appending a `role: 'user'` bubble at all (there's no real student message
  // to show — `trimmed` is `null` in that case, never shown, only ever used by `sendMessage`/
  // `editMessage`'s own real calls); `finalReview: true` is forwarded to the backend, which is what
  // actually changes its behavior server-side (see api/onboarding-chat.js). Every existing call site
  // (`sendMessage`/`editMessage`, both still `{ silent: false, finalReview: false }` by default) is
  // byte-for-byte unaffected.
  // Implement the Corrected Flow Order (see CLAUDE.md) — `resumeAfterTranscript` generalizes this
  // the exact same way `finalReview` already did: a third silent, no-typed-text trigger sharing
  // this one send/append/error-handling path rather than a second, parallel implementation.
  //
  // Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — `moduleReaction` (a real
  // module id string, not a boolean — see requestOnboardingChatReply's own comment for why) is a
  // FOURTH option on this same shared path, alongside the existing three.
  const sendFrom = (baseHistory, trimmed, { silent = false, finalReview = false, resumeAfterTranscript = false, moduleReaction = null } = {}) => {
    const history = baseHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = silent ? baseHistory : [...baseHistory, { role: 'user', content: trimmed }];
    if (!silent) patch({ onboardingChatHistory: afterUser });
    setLoading(true);
    const profileSummary = compileStudentProfile(state);
    requestOnboardingChatReply(
      { history, prompt: trimmed, profileSummary, finalReview, resumeAfterTranscript, moduleReaction },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            if (!silent) patch({ onboardingChatHistory: [...afterUser, { role: 'assistant', content: "Sorry, I couldn't come up with a reply just now — try saying that again?" }] });
            return;
          }
          // AI-First Onboarding, Stage 3 (see CLAUDE.md) — the new overview fields are persisted
          // directly on the message object, the SAME "store planReady/projectName/milestones right
          // on the message" convention BuildYourOwnView's own sendFrom already established for the
          // identical reason: OnboardingConversationScreen.jsx's own review UI scans `chatHistory`
          // for the most recent `readyForOverview: true` turn, so this data has to survive exactly
          // like the rest of the conversation does (including a reload) — not a separate,
          // easy-to-desync piece of state.
          patch({
            onboardingChatHistory: [...afterUser, {
              role: 'assistant',
              content: proposal.reply,
              // Implement the Corrected Flow Order (see CLAUDE.md) — persisted the same "store the
              // fact directly on the message" way every other overview field already is (see
              // useNarrativeSession.js's own `latestTranscriptPause` scan for how this is read).
              readyForTranscriptPause: proposal.readyForTranscriptPause,
              readyForOverview: proposal.readyForOverview,
              narrativeTitle: proposal.narrativeTitle,
              narrativeSummary: proposal.narrativeSummary,
              overviewPhaseTitles: proposal.overviewPhaseTitles,
              // Expand the Multi-Year Overview (see CLAUDE.md) — the rich, dimension-connected
              // per-phase description (Task 2) and the academic-year/summer tag (Task 1's own
              // "summer plans as their own distinct category") persisted the same way as every
              // other overview field, so OnboardingConversationScreen.jsx's own confirmNarrative
              // can build real milestone descriptions/tags from them, surviving a reload exactly
              // like the rest of the conversation does.
              overviewPhaseDescriptions: proposal.overviewPhaseDescriptions,
              phaseDimensions: proposal.phaseDimensions,
              overviewPhaseDayOffsets: proposal.overviewPhaseDayOffsets,
              capstoneIdea: proposal.capstoneIdea,
              // Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") —
              // 4 more hard-required overview fields, persisted the same way as every other one.
              courseGuidanceNote: proposal.courseGuidanceNote,
              testingTimelineNote: proposal.testingTimelineNote,
              collegeListNote: proposal.collegeListNote,
              essayMaterialNote: proposal.essayMaterialNote,
              thematicKeywords: proposal.thematicKeywords,
              // Bug fix (see CLAUDE.md, api/onboarding-chat.js's own VALID_INTEREST_TAGS comment) —
              // real, validated interest tags proposed alongside the rest of the ready overview,
              // persisted the same way so OnboardingConversationScreen.jsx's own confirmNarrative
              // can restore state.interestTags — the one field nothing else in this whole flow ever
              // writes, which silently broke Discovery/Opportunity Finder/Course Selection's own
              // interest-based recommendations for every real post-conversation student.
              matchedInterestTags: proposal.matchedInterestTags,
              // Final Alignment-Check Conversation (see CLAUDE.md) — persisted the same way as
              // every other overview field, added HERE (the one shared append path) rather than in
              // a second, bespoke handler, specifically so it's captured correctly whether it
              // arrives on the triggering turn itself or several NORMAL typed turns later (a
              // multi-turn discussion after the AI raises a concern still flows through
              // sendMessage/editMessage -> this same sendFrom).
              finalReviewComplete: proposal.finalReviewComplete,
            }],
          });
        },
        onError: () => {
          setLoading(false);
          // Final Alignment-Check Conversation (see CLAUDE.md) — a silent (auto-triggered) call
          // fails the same way Stage 2's own background auto-suggestions do: no visible error, the
          // student isn't blocked from anything either way (they can always open the conversation
          // and type, which resolves this the normal way), and `state.finalReviewTriggered` is
          // never rolled back — matching the real, established precedent this pattern is modeled
          // on (`suggestionSourceTaskIds`/`weeklyDigestSuggestionWeekOf`, neither of which ever
          // un-sets its own one-shot guard on a failed request).
          if (silent) return;
          patch({ onboardingChatHistory: [...afterUser, { role: 'assistant', content: 'Sorry, something went wrong on my end — try again in a moment.' }] });
        },
      },
    );
  };

  const sendMessage = (trimmed) => sendFrom(chatHistory, trimmed);
  const editMessage = (index, newContent) => sendFrom(chatHistory.slice(0, index), newContent);
  // Final Alignment-Check Conversation (see CLAUDE.md) — fires the one automatic, no-typed-text
  // check-in turn once the student has finished every other guided step (see
  // HubScreen.jsx's own new 'finalReview' GUIDED_SEQUENCE entry and its guarded one-shot effect,
  // which is the only real caller of this function).
  const triggerFinalReview = () => sendFrom(chatHistory, null, { silent: true, finalReview: true });
  // Implement the Corrected Flow Order (see CLAUDE.md) — the mirror-image automatic, no-typed-text
  // turn that resumes this conversation once TranscriptScreen.jsx's own `advance()` (in
  // onboarding-pause mode) has finished/skipped the real transcript form and returned here.
  const triggerTranscriptResume = () => sendFrom(chatHistory, null, { silent: true, resumeAfterTranscript: true });
  // Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — the mirror-image automatic,
  // no-typed-text turn a module's own "done" action fires (via useModuleReview.js). Takes an
  // EXPLICIT `baseHistory` argument (rather than always reading this hook's own `chatHistory`
  // closure) because the caller typically just appended the module's own scripted opening line to
  // history in the SAME synchronous block, via its own separate `patch()` call — `chatHistory`
  // here wouldn't reflect that yet until the next render, the same "pass an effectiveState, don't
  // trust a stale closure" precedent this app's own Stage 2 auto-suggestion trigger already
  // established. Falls back to this hook's own `chatHistory` when the caller has nothing newer.
  const triggerModuleReaction = (moduleId, baseHistory) => sendFrom(baseHistory ?? chatHistory, null, { silent: true, moduleReaction: moduleId });

  // Implement the Corrected Flow Order (see CLAUDE.md) — the auto-fire effect for the resume
  // trigger above, mirroring HubScreen.jsx's own `finalReviewFiredRef`/`finalReviewTriggered`
  // guard shape exactly: a `useRef` checked FIRST (a bare persisted-state check alone races React
  // 18 StrictMode's dev-only mount/remount replay, since `patch()` doesn't re-render
  // synchronously), with both the ref AND the persisted flag cleared synchronously before the
  // async request starts. `state.pendingOnboardingTranscriptResume` is set by TranscriptScreen.jsx
  // itself (both the Roslyn/UC-Davis/Transfer-only variants) right before navigating back to
  // `screen: 'onboardingConversation'` — this hook is what actually notices that flag and fires
  // the real resume turn, regardless of whether it's currently mounted via the original pre-hub
  // screen or (in principle) the "Our Conversation" tab.
  const transcriptResumeFiredRef = useRef(false);
  useEffect(() => {
    if (transcriptResumeFiredRef.current) return;
    if (!state.pendingOnboardingTranscriptResume) return;
    transcriptResumeFiredRef.current = true;
    patch({ pendingOnboardingTranscriptResume: false });
    triggerTranscriptResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingOnboardingTranscriptResume]);

  return { chatHistory, loading, sendMessage, editMessage, triggerFinalReview, triggerModuleReaction };
}
