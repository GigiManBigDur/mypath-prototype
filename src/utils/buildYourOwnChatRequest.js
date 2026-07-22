// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md) — the client-side half
// of the real API call, same "fire-and-forget fetch to this app's own Vercel proxy, with
// onResult/onError callbacks" shape chatRequest.js/suggestions.js/creativeSuggestions.js already
// established. The client never talks to a real AI provider directly — only ever this app's own
// /api/build-your-own-chat proxy.

const BUILD_YOUR_OWN_CHAT_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/build-your-own-chat';

// Same "no server-side conversation store, resend history in full every call" shape
// chatRequest.js already established — `onError` is expected to be handled by the caller (a real,
// honest error state in the conversation), since this is a direct response to something the
// student just typed, not a background suggestion.
export function requestBuildYourOwnChatReply({ history, prompt, profileSummary }, { onResult, onError } = {}) {
  fetch(BUILD_YOUR_OWN_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, prompt, profileSummary }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Build Your Own chat request failed: ${res.status}`);
      return res.json();
    })
    .then((proposal) => { if (onResult) onResult(proposal); })
    .catch((err) => { if (onError) onError(err); });
}
