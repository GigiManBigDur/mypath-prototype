import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from '../components/MascotIcon';
import ChatConversation from '../components/ChatConversation';
import { useOnboardingChat, buildOnboardingGreeting } from '../hooks/useOnboardingChat';
import { useMascotSpeech } from '../hooks/useMascotSpeech';
import { useMediaQuery } from '../hooks/useMediaQuery';

// AI Conversation Page: First-Impression Visual Design (see CLAUDE.md) — this is the student's
// first real meeting with the AI, so it gets its own genuine "moment," not just Stage 2's plain
// chat box with a header (which this screen used to be, byte-for-byte). Every piece of the real
// conversation underneath is completely unchanged — the same `useOnboardingChat` hook, the same
// `state.onboardingChatHistory` thread, the same `ChatConversation` UI, the same
// `api/onboarding-chat.js` endpoint — this pass only choreographs HOW that conversation is first
// revealed.
//
// Phase state machine (local, ephemeral — mirrors HubScreen.jsx's own `chatPhase` pattern, not
// persisted to `state`):
//   'entering'  -> Task 1: the page starts nearly empty (a rich, atmospheric gradient background —
//                  see `body:has(.onboarding-meeting-active)`, global.css); the mascot fades AND
//                  scales in from the center, larger/more prominent than its normal hub size.
//   'greeting'  -> Task 2: once fully faded in, the mascot begins its scripted opening greeting
//                  using the EXISTING speaking animation + voiceover (`useMascotSpeech`) — shown in
//                  its own standalone speech bubble, with no chat input/history visible yet. A pure,
//                  focused "meeting" beat.
//   'settling'  -> Task 3: the greeting has finished being "said" — the mascot smoothly shrinks and
//                  repositions (the same grow/shrink transform-transition pattern
//                  `.hub-mascot-figure`/`.chat-grown` already established for the Hub-to-Chat
//                  transition), while the real chat interface (message history + input) fades in
//                  around it with the same staggered entrance style that transition already uses.
//   'chat'      -> the normal, fully-settled conversation layout: a small mascot header + the full
//                  real history + input, exactly like every other real chat surface in this app.
//
// This entire sequence plays ONLY the very first time this conversation is genuinely empty (see
// `freshMeeting` below) — a later revisit (Back then forward again, a reload mid-conversation)
// skips straight to the settled 'chat' layout, the same "don't replay a one-time entrance on a
// return visit" precedent WelcomeScreen's own `hasPlayedIntro` module flag already established,
// just derived here from real conversation data instead of a module-level flag (this conversation
// genuinely only has one "first meeting," unlike Welcome's hero, which could be revisited by
// navigating Back from Sign-Up without ever restarting the app).
const MASCOT_ENTER_MS = 900; // matches (with a little slack) .onboarding-mascot-figure's own CSS transition duration.
const SETTLE_MS = 700; // matches (with a little slack) the stage-collapse + mascot-shrink CSS transition duration.
// A generous safety net only — `useMascotSpeech`'s own internal worst-case (a ~4s fetch-latency
// buffer plus up to a ~6s estimated-reading-time fallback) tops out well under this, so in normal
// operation this timer is never the thing that actually advances the phase.
const GREETING_FALLBACK_MS = 11000;

// Task 4 — small, decorative floating particles, reusing the exact same visual language
// (`hub-particle-float` keyframe) HubScreen.jsx's own `PARTICLES` already established, rather than
// inventing a second decorative system for this one screen. A fresh, slightly denser scatter of
// the same shared bloom accent colors, since this page is meant to read as a bit more special/
// "dreamy" than the standard hub view it's a one-time preface to.
const PARTICLES = [
  { x: 12, y: 16, size: 8, color: 'var(--bloom-purple)' },
  { x: 88, y: 12, size: 7, color: 'var(--bloom-yellow)' },
  { x: 8, y: 42, size: 6, color: 'var(--bloom-teal)' },
  { x: 92, y: 38, size: 8, color: 'var(--bloom-pink)' },
  { x: 20, y: 68, size: 7, color: 'var(--bloom-blue)' },
  { x: 80, y: 70, size: 6, color: 'var(--bloom-orange)' },
  { x: 50, y: 8, size: 6, color: 'var(--bloom-teal)' },
  { x: 35, y: 88, size: 8, color: 'var(--bloom-purple)' },
  { x: 65, y: 90, size: 7, color: 'var(--bloom-yellow)' },
  { x: 6, y: 88, size: 6, color: 'var(--bloom-pink)' },
  { x: 94, y: 86, size: 7, color: 'var(--bloom-blue)' },
];

export default function OnboardingConversationScreen() {
  const { state, patch } = useApp();
  const { chatHistory, loading, sendMessage, editMessage } = useOnboardingChat();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Frozen at mount, BEFORE `useOnboardingChat`'s own greeting-seeding effect ever runs (a plain
  // lazy `useState` initializer only reads its function once, on the very first render, ahead of
  // any effect) — this is what correctly distinguishes "the very first time this conversation ever
  // loads" from "revisiting an already-started one," rather than reading a length that's already
  // been seeded by the time this check would otherwise run.
  const [freshMeeting] = useState(() => chatHistory.length === 0);
  const [phase, setPhase] = useState(() => (reducedMotion || !freshMeeting ? 'chat' : 'entering'));
  const [mascotVisible, setMascotVisible] = useState(reducedMotion || !freshMeeting);

  // Task 1 — the same double-`requestAnimationFrame` technique WelcomeScreen's own trail reveal
  // already established: the browser needs to actually paint the hidden starting style on one
  // frame before the transition-triggering class change happens on the next, or both style changes
  // risk landing in the same paint and skipping the animation entirely.
  useEffect(() => {
    if (phase !== 'entering') return undefined;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setMascotVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [phase]);

  // Once the mascot has finished fading/scaling in, move into the 'greeting' phase — this is what
  // starts the mascot actually speaking (below).
  useEffect(() => {
    if (phase !== 'entering' || !mascotVisible) return undefined;
    const t = setTimeout(() => setPhase('greeting'), MASCOT_ENTER_MS);
    return () => clearTimeout(t);
  }, [phase, mascotVisible]);

  // Task 2 — the greeting is only ever "spoken" (auto-played via `useMascotSpeech`) during this one
  // phase; every other phase passes `null`, so it never re-triggers later even though the identical
  // text becomes a real, independently-replayable (opt-in Play button) message inside the chat the
  // moment 'settling' begins.
  const greetingText = buildOnboardingGreeting(state.username);
  const isSpeaking = useMascotSpeech(phase === 'greeting' ? greetingText : null, state.voiceMuted);
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (phase !== 'greeting') { wasSpeakingRef.current = false; return undefined; }
    if (isSpeaking) { wasSpeakingRef.current = true; return undefined; }
    if (wasSpeakingRef.current) {
      // Real speech (or its estimated-duration fallback, if muted/unavailable) just genuinely
      // finished — this is Task 3's own transition trigger.
      setPhase('settling');
      return undefined;
    }
    // Safety net only, in case `isSpeaking` never toggles true at all — shouldn't happen in
    // practice, since `useMascotSpeech`'s own internal fallback timing is designed to always
    // eventually resolve well before this fires.
    const t = setTimeout(() => setPhase('settling'), GREETING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [phase, isSpeaking]);

  useEffect(() => {
    if (phase !== 'settling') return undefined;
    const t = setTimeout(() => setPhase('chat'), SETTLE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const isHeroPhase = phase === 'entering' || phase === 'greeting';
  const mascotModifier = phase === 'entering' && !mascotVisible ? 'hidden' : isHeroPhase ? 'large' : 'small';
  // Task 4 — the atmospheric gradient/particles are the "special, one-time moment" treatment; once
  // truly settled into ongoing chat, the background recedes back to the plain flat bloom color
  // (matching this app's own prior, explicit "colorful glow behind an ongoing utility screen reads
  // as too much — keep the particles, drop the background wash" feedback for the hub's own chat
  // view) so it never competes with the actual conversation for attention long-term.
  const showAtmosphere = phase !== 'chat';
  const showChatCard = phase === 'settling' || phase === 'chat';

  return (
    <div className={`onboarding-meeting-page${showAtmosphere ? ' onboarding-meeting-active' : ''}`}>
      {PARTICLES.map((p, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span
          key={i}
          className="onboarding-particle"
          aria-hidden="true"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, animationDelay: `${(i % 6) * 0.4}s` }}
        />
      ))}

      <button type="button" className="btn btn-ghost onboarding-meeting-back" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className={`onboarding-mascot-stage${isHeroPhase ? ' onboarding-mascot-stage-hero' : ''}`}>
        <div className={`onboarding-mascot-figure onboarding-mascot-figure--${mascotModifier}`}>
          <MascotIcon size={190} speaking={isSpeaking} thinking={phase === 'chat' && loading} />
        </div>

        {(phase === 'greeting' || phase === 'settling') && (
          <p className={`onboarding-meeting-greeting-bubble${phase === 'settling' ? ' onboarding-meeting-greeting-bubble-exit' : ''}`}>
            {greetingText}
          </p>
        )}

        {phase === 'entering' && (
          <p className="page-sub onboarding-meeting-hero-sub">Let's talk about you.</p>
        )}
      </div>

      {showChatCard && (
        <div className="onboarding-chat-card">
          <div className="chat-header onboarding-chat-card-header">
            <div>
              <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
              <h2 className="hub-chat-title">Getting to know you</h2>
            </div>
          </div>

          <div className="onboarding-chat-card-body">
            <ChatConversation
              messages={chatHistory}
              loading={loading}
              onSend={sendMessage}
              onEditMessage={editMessage}
              placeholder="Tell me what's on your mind…"
            />
          </div>

          <div className="btn-row onboarding-chat-card-footer">
            <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
              Continue to my Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
