// Force-Disable and Lock Voice on the Production/Submission Deployment (see CLAUDE.md) — the
// ElevenLabs subscription behind api/tts.js was cancelled, but real audio was still confirmed
// coming back on requests (leftover credits or a billing-cycle delay). This locks AI voice
// narration off, with no way for a viewer to turn it back on, on every PRODUCTION build (any
// `vite build` output — the Vercel deployment, GitHub Pages, or a local `npm run preview` of that
// same bundle alike, since that IS the production bundle, just sanity-checked locally) while
// leaving `npm run dev` completely untouched. Background music (backgroundMusic.js) and click
// sounds (clickSound.js) are unrelated — neither ever calls ElevenLabs, so neither reads this.
//
// `import.meta.env.PROD` is Vite's own build-time flag, statically inlined as a literal `true`/
// `false` at build time (the exact inverse of the `import.meta.env.DEV` check
// `utils/devTools.js`'s own `isDevToolsEnabled()` already established for the opposite case).
// Unlike that dev-tools gate, this one is DELIBERATELY given no runtime override of any kind —
// Task 2's own explicit "must not be able to re-enable voice no matter what they click" is the
// whole point, so there's no query-param/localStorage escape hatch to build in here.
export function isVoiceLockedOff() {
  return !!import.meta.env.PROD;
}
