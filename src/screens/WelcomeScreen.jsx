import { useApp } from '../context/AppContext';

// Replace Welcome Page With New Apple-Style Design (see CLAUDE.md) — the entire winding-trail/
// ghost-milestone hero this screen used to have is gone, replaced with the attached Claude Design
// export's own "Turn 4 — Desktop app welcome screen" artboard (from the "MyPath Welcome.dc.html"
// canvas, imported live via the DesignSync tool once /design-login was run — that canvas is a
// multi-turn design-exploration history, not a single bootable page; Turn 4 is the one turn whose
// actual copy ("Welcome to MyPath" / the "One honest conversation..." subline / "Get Started" /
// "Free for students. Takes about a minute.") matches what the user asked for verbatim). The
// design wrapped its own hero in a fake "Mac / PC / iPad app window" frame (traffic-light dots, a
// floating window shadow on a background canvas) purely as a Claude Design mockup device to show
// how it'd look running as a native desktop app — that chrome is deliberately NOT reproduced here,
// since this already runs inside a real browser window with its own real chrome; only the window's
// actual INTERIOR content (the ambient glow, the mark, the headline/subline/CTA/caption) becomes
// the real page.
//
// Two real, deliberate adaptations beyond a literal port, both confirmed with the user directly
// rather than guessed:
// 1. The mark is Turn 4's own dome/visor icon (the user picked this over the canvas's own later
//    "de-Redditing" logo redesigns and over reusing the app's existing MascotIcon character) —
//    but RECOLORED, not copied verbatim: Turn 4's own version used a warm orange/terracotta accent
//    (#C9501F/#E4622E) that doesn't exist anywhere else in this now-mostly-repainted app. The
//    user chose to keep the app's existing green identity (--bloom-accent, already on Sign-Up,
//    Survey, the just-redone Hub) instead of introducing a second, competing accent color for one
//    screen alone — so the mark's own eyes/eyebrow-highlight recolor to that green, and its dark
//    inset face recolors to the same near-black-green (`#161F1B`-family) MascotIcon.jsx's own face
//    gradient already established, deliberately bridging this NEW mark to the app's EXISTING
//    mascot's own established palette rather than picking an arbitrary third dark tone.
// 2. The raw mockup's own fixed pixel sizes (an 88px headline, a 150px mark, all measured against
//    a fixed 1512px desktop artboard) are replaced with real `clamp()`-based fluid sizing — the
//    static export never had to handle a real, resizable browser viewport or a real phone width,
//    so this is genuinely new work needed to satisfy full responsiveness (Task 2), not something
//    to copy from the source file.
//
// `prefers-reduced-motion` is handled entirely in CSS (global.css's own `@media` block) — unlike
// the old trail, none of this needs JS-measured SVG geometry or staged reveal timers, so a plain
// CSS opt-out (every entrance/floaty/blink animation simply turns off, landing directly on its
// final, fully-visible state) is enough on its own, matching this codebase's own simpler
// entrance-polish convention elsewhere (the hub's own tile pop-in, etc.) rather than reproducing
// the old screen's own more elaborate orchestration for a hero that no longer needs it.
export default function WelcomeScreen() {
  const { patch } = useApp();

  return (
    <div className="welcome-screen">
      <div className="welcome-glow" aria-hidden="true" />

      <div className="welcome-hero">
        <div className="welcome-mark-wrap">
          <svg className="welcome-mark" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M5 21 A19 19 0 0 1 43 21 L43 31 A7 7 0 0 1 36 38 L12 38 A7 7 0 0 1 5 31 Z" fill="#F8F6EF" />
            <path d="M7.5 17.5 A17.5 17.5 0 0 1 40.5 17.5 A19 19 0 0 0 7.5 17.5 Z" fill="#F1EEE1" />
            <path d="M9.5 20.5 A14.5 14.5 0 0 1 38.5 20.5 L38.5 28 A4 4 0 0 1 34.5 32 L13.5 32 A4 4 0 0 1 9.5 28 Z" fill="#161F1B" />
            <g className="welcome-mark-eyes">
              <rect x="14.5" y="22.3" width="7" height="5.4" rx="2.7" fill="#5CE6A5" />
              <rect x="26.5" y="22.3" width="7" height="5.4" rx="2.7" fill="#5CE6A5" />
            </g>
            <path d="M11.5 16.5 A15 15 0 0 1 20 11.4" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="welcome-mark-shadow" aria-hidden="true" />
        </div>

        <h1 className="welcome-title">
          Welcome to <span className="welcome-title-accent">MyPath</span>
        </h1>

        <p className="welcome-tagline">
          One honest conversation, and your plan for college and career starts drawing itself —
          step by step, in the order you need it.
        </p>

        <button
          type="button"
          className="btn btn-primary welcome-cta"
          onClick={() => patch({ screen: 'signup' })}
        >
          Get Started
        </button>

        <p className="welcome-caption">Free for students. Takes about a minute.</p>
      </div>
    </div>
  );
}
