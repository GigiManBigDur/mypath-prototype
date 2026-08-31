// Pre-Public-Sharing Confidentiality Check (see CLAUDE.md) — the one shared gate every
// testing-only control in this app now reads before rendering itself: the sample-transcript and
// sample-experience prefill buttons, the "Change Date (Testing)" override tool, the small muted
// "Reset" link on the Hub (NOT the polished Quick Actions "Start Over" button, which is a real,
// deliberately-kept, user-facing duplicate wired to the same `handleReset` — see HubScreen.jsx's
// own comment on it; a public evaluator resetting their own demo progress is normal UX, not a
// confidentiality concern), and the "View AI Profile (Testing)" debug panel. None of these ever
// exposed a real secret on their own — this app has no backend/database to leak into (every real
// API key already lives only in a server-side Vercel function, see the api/*.js audit) — this
// gate exists purely so a public evaluator never sees or triggers internal dev/testing tooling.
//
// Two ways in, both intentionally simple for a low-stakes prototype: `import.meta.env.DEV` (true
// only for `npm run dev`/localhost — Vite inlines this as a literal `false` at build time, so it
// can never be true in a shipped production bundle regardless of which host serves it), or a
// plain, undocumented `?devtools=1` URL query param — the "something only I can trigger" the
// task asked for. Since this app has no client-side router (App.jsx's own screen-state machine
// never touches `window.location` — see CLAUDE.md's Architecture section, "Screen flow is a
// single-page state machine, not a router"), the query string present on first load stays in the
// address bar for the rest of that page's session, so this only needs to be read once at module
// load, never re-checked on every in-app navigation.
const DEV_TOOLS_ENABLED = (() => {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('devtools') === '1';
  } catch {
    return false;
  }
})();

export function isDevToolsEnabled() {
  return DEV_TOOLS_ENABLED;
}
