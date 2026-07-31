import { useEffect, useState } from 'react';
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
export function buildOnboardingGreeting(username) {
  const name = username || 'there';
  return `Hey ${name}! I'm your MyPath guide, and before we build anything, I want to actually get to know you — what excites you, what you've already done, and help you figure out a direction that's genuinely yours. So — what do you find yourself genuinely excited about, in or out of school?`;
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
      onboardingChatHistory: [{ role: 'assistant', content: buildOnboardingGreeting(state.username) }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared by both a normal send (from the full current history) and an edit-and-resubmit (from
  // history truncated to just before the edited message) — the exact same `sendFrom`/`editMessage`
  // shape `useHubChat.js`/`BuildYourOwnView`/`MilestonePlanningPanel` already established.
  const sendFrom = (baseHistory, trimmed) => {
    const history = baseHistory.map((m) => ({ role: m.role, content: m.content }));
    const afterUser = [...baseHistory, { role: 'user', content: trimmed }];
    patch({ onboardingChatHistory: afterUser });
    setLoading(true);
    const profileSummary = compileStudentProfile(state);
    requestOnboardingChatReply(
      { history, prompt: trimmed, profileSummary },
      {
        onResult: (proposal) => {
          setLoading(false);
          if (!proposal || typeof proposal.reply !== 'string' || !proposal.reply.trim()) {
            patch({ onboardingChatHistory: [...afterUser, { role: 'assistant', content: "Sorry, I couldn't come up with a reply just now — try saying that again?" }] });
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
              thematicKeywords: proposal.thematicKeywords,
              // Bug fix (see CLAUDE.md, api/onboarding-chat.js's own VALID_INTEREST_TAGS comment) —
              // real, validated interest tags proposed alongside the rest of the ready overview,
              // persisted the same way so OnboardingConversationScreen.jsx's own confirmNarrative
              // can restore state.interestTags — the one field nothing else in this whole flow ever
              // writes, which silently broke Discovery/Opportunity Finder/Course Selection's own
              // interest-based recommendations for every real post-conversation student.
              matchedInterestTags: proposal.matchedInterestTags,
            }],
          });
        },
        onError: () => {
          setLoading(false);
          patch({ onboardingChatHistory: [...afterUser, { role: 'assistant', content: 'Sorry, something went wrong on my end — try again in a moment.' }] });
        },
      },
    );
  };

  const sendMessage = (trimmed) => sendFrom(chatHistory, trimmed);
  const editMessage = (index, newContent) => sendFrom(chatHistory.slice(0, index), newContent);

  return { chatHistory, loading, sendMessage, editMessage };
}
