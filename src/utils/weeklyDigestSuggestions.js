// AI-Generated Weekly Task Suggestions in the Digest View (see CLAUDE.md) — the client-side half
// of the real API call, same "fire-and-forget fetch to this app's own Vercel proxy, with
// onResult/onError callbacks" shape suggestions.js/speech.js already established. The client
// never talks to a real AI provider directly — only ever this app's own /api/suggest-weekly
// proxy.

// Same reasoning as suggestions.js's own SUGGESTION_ENDPOINT: the Vite dev server has no
// serverless functions of its own, and GitHub Pages can't run one either, so every environment
// calls this project's own live Vercel deployment directly via an absolute cross-origin URL,
// regardless of where the frontend itself happens to be served from.
const WEEKLY_SUGGESTION_ENDPOINT = 'https://mypath-prototype-seven.vercel.app/api/suggest-weekly';

// Fails silently on any error (network failure, the endpoint not yet deployed, a missing/invalid
// API key, the model returning something unusable) — matching this app's own established AI-
// suggestion precedent: a failed request should never surface an error to the student, it should
// just mean no suggestions show up this week. `onError` is still called (for tests/telemetry),
// but callers are never required to do anything with it.
export function requestWeeklySuggestions({ today, profileSummary }, { onResult, onError } = {}) {
  fetch(WEEKLY_SUGGESTION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ today, profileSummary }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Weekly suggestion request failed: ${res.status}`);
      return res.json();
    })
    .then((result) => { if (onResult) onResult(result); })
    .catch((err) => { if (onError) onError(err); });
}
