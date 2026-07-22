// Build the Real "Ask MyPath AI Anything" Conversational Chat (see CLAUDE.md) — the client-side
// half of the real API call, same "fire-and-forget fetch to this app's own Vercel proxy, with
// onResult/onError callbacks" shape suggestions.js/creativeSuggestions.js/speech.js already
// established. The client never talks to a real AI provider directly — only ever this app's own
// /api/chat proxy.

// Same reasoning as every prior stage's own endpoint constant: neither the Vite dev server nor
// GitHub Pages can run a serverless function, so every environment calls this project's own live
// Vercel deployment directly via an absolute cross-origin URL, regardless of where the frontend
// itself is served from.
const CHAT_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/chat';

// There is no server-side conversation store — `history` (the prior turns, `[{role, content}]`)
// is resent in full on every call, since the client is the only place this conversation actually
// lives. `onError` is expected to be handled by the caller (a real, honest error state in the
// chat), matching Build Your Own's own precedent rather than Stage 2's own silent-failure one —
// this is a direct response to something the student just typed, not a background suggestion.
export function requestChatReply({ history, prompt, profileSummary }, { onResult, onError } = {}) {
  fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, prompt, profileSummary }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
      return res.json();
    })
    .then((proposal) => { if (onResult) onResult(proposal); })
    .catch((err) => { if (onError) onError(err); });
}
