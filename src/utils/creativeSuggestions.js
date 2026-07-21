// AI Personalization, Stage 3: The Creative-Leap Layer (see CLAUDE.md) — the client-side half of
// the real API call, same "fire-and-forget fetch to this app's own Vercel proxy, with
// onResult/onError callbacks" shape suggestions.js/speech.js already established. The client never
// talks to a real AI provider directly — only ever this app's own /api/creative-suggest proxy.

// Same reasoning as suggestions.js's own SUGGESTION_ENDPOINT: the Vite dev server has no
// serverless functions of its own, and GitHub Pages can't run one either, so every environment
// calls this project's own live Vercel deployment directly via an absolute cross-origin URL,
// regardless of where the frontend itself happens to be served from.
const CREATIVE_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/creative-suggest';

// Unlike Stage 2's requestSuggestion (which fails silently, since it's an unprompted background
// suggestion the student never explicitly asked for), this IS a direct response to something the
// student just did (clicked a preset or typed a question) — so both `onResult` and `onError` are
// expected to be handled by the caller (CreativeConnectionModal shows a real error state), rather
// than `onError` being optional telemetry only.
export function requestCreativeConnection({ prompt, profileSummary }, { onResult, onError } = {}) {
  fetch(CREATIVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, profileSummary }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Creative connection request failed: ${res.status}`);
      return res.json();
    })
    .then((proposal) => { if (onResult) onResult(proposal); })
    .catch((err) => { if (onError) onError(err); });
}
