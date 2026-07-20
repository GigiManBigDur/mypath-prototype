// AI Personalization, Stage 2 (see CLAUDE.md) — the client-side half of the real API call, same
// "fire-and-forget fetch to this app's own Vercel proxy, with onResult/onError callbacks" shape
// speech.js already established for ElevenLabs. The client never talks to api.anthropic.com
// directly — only ever this app's own /api/suggest proxy.

// Same reasoning as speech.js's own TTS_ENDPOINT: the Vite dev server has no serverless functions
// of its own, and GitHub Pages can't run one either, so every environment calls this project's own
// live Vercel deployment directly via an absolute cross-origin URL, regardless of where the
// frontend itself happens to be served from.
const SUGGESTION_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/suggest';

// Fails silently on any error (network failure, the endpoint not yet deployed, a missing/invalid
// API key, the model returning something unusable) — matching Task 4/5's own "the AI should never
// ... " posture and this app's already-established ElevenLabs precedent: a failed suggestion
// request should never surface an error to the student, it should just mean no suggestion shows
// up this time. `onError` is still called (for tests/telemetry), but callers are never required to
// do anything with it.
export function requestSuggestion({ today, profileSummary, triggeringTask }, { onResult, onError } = {}) {
  fetch(SUGGESTION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ today, profileSummary, triggeringTask }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Suggestion request failed: ${res.status}`);
      return res.json();
    })
    .then((proposal) => { if (onResult) onResult(proposal); })
    .catch((err) => { if (onError) onError(err); });
}
