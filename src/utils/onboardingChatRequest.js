// AI-First Onboarding, Stage 2 (see CLAUDE.md) — the client-side half of the real API call, same
// "fire-and-forget fetch to this app's own Vercel proxy, with onResult/onError callbacks" shape
// chatRequest.js/creativeSuggestions.js/speech.js already established. The client never talks to a
// real AI provider directly — only ever this app's own /api/onboarding-chat proxy.

// Same reasoning as every prior stage's own endpoint constant: neither the Vite dev server nor
// GitHub Pages can run a serverless function, so every environment calls this project's own live
// Vercel deployment directly via an absolute cross-origin URL, regardless of where the frontend
// itself is served from.
const ONBOARDING_CHAT_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/onboarding-chat';

// There is no server-side conversation store — `history` (the prior turns, `[{role, content}]`,
// including the scripted opening greeting) is resent in full on every call, since the client is
// the only place this conversation actually lives. `onError` is expected to be handled by the
// caller with a real, honest error state in the chat — this is a direct response to something the
// student just typed, matching Build Your Own's/the general assistant's own precedent rather than
// Stage 2 (background auto-suggestions)'s own silent-failure one.
//
// Final Alignment-Check Conversation (see CLAUDE.md) — `finalReview` is a new, optional flag,
// forwarded verbatim; `false`/omitted for every ordinary call (the vast majority), `true` only for
// the one automatic, no-typed-text check-in `useOnboardingChat.js`'s own `triggerFinalReview`
// fires — see that file and `api/onboarding-chat.js`'s own handler for what it changes server-side.
//
// Implement the Corrected Flow Order (see CLAUDE.md) — `resumeAfterTranscript` is the mirror-image
// second optional flag, `true` only for the one automatic, no-typed-text turn
// `useOnboardingChat.js`'s own `triggerTranscriptResume` fires once the student has finished (or
// explicitly skipped) the real Transcript & GPA form.
//
// Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — `moduleReaction` is a THIRD
// optional flag, a real module id string (e.g. 'careers') rather than a boolean, since this one
// fires repeatedly — once per module the student completes, via `useOnboardingChat.js`'s own
// `triggerModuleReaction`.
export function requestOnboardingChatReply({ history, prompt, profileSummary, finalReview = false, resumeAfterTranscript = false, moduleReaction = null }, { onResult, onError } = {}) {
  fetch(ONBOARDING_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, prompt, profileSummary, finalReview, resumeAfterTranscript, moduleReaction }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Onboarding chat request failed: ${res.status}`);
      return res.json();
    })
    .then((proposal) => { if (onResult) onResult(proposal); })
    .catch((err) => { if (onError) onError(err); });
}
