import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import MascotIcon from './MascotIcon';
import ChatConversation from './ChatConversation';
import ModuleReviewFooter from './ModuleReviewFooter';
import { stopSpeaking } from '../utils/speech';

// Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — the persistent, per-module
// chat widget every one of the six applicable module screens renders, built on `useModuleReview`'s
// own state. Mirrors `MapChatWidget.jsx`'s exact collapsed-toggle/expanded-panel shape (Task 3's
// own "same chat interface already built, not a new UI pattern") but adds two things that widget
// doesn't need: the reviewing-phase beat, and the Confirm/"keep refining" footer. Uses its OWN
// `position: fixed` classes (`.module-review-*`, global.css) rather than reusing MapChatWidget's
// own `.map-chat-toggle`/`.map-chat-panel` (`position: absolute`, correct only relative to
// `.roadmap-fullscreen-root`, the specific positioned ancestor Map 2 sets up — none of this app's
// six target module screens have an equivalent).
//
// **Rendered via `createPortal(..., document.body)`, not inline — a real, confirmed requirement,
// not a style choice.** Four of the six screens this renders on (Discovery, Course Selection,
// Opportunity Finder, Project Builder — confirmed directly against App.jsx's own
// `TRANSITION_SCREENS` set before writing this) are wrapped in `.screen-transition`, whose
// `screen-enter` keyframe's `animation-fill-mode: both` transform makes that ancestor a containing
// block for `position: fixed` descendants — the exact same landmine already documented and fixed
// for `MascotWidget`, `DateOverrideControl`, and the course detail modal. Without the portal, this
// widget's own fixed positioning would resolve relative to that wrapper's box instead of the real
// viewport.
//
// Task 7 — the toggle bubble renders UNCONDITIONALLY, the entire time the student is on this
// screen (before ever clicking Continue, not just after) — clicking it opens the SAME real
// `onboardingChatHistory` thread `review` is already bound to (via `useOnboardingChat()` inside
// `useModuleReview`), so a message typed here mid-task is a normal, freely-typable continuation of
// the exact same Session 1 conversation, with full narrative context retained, never a separate
// disconnected thread. The panel additionally auto-opens the moment `review.isActive` becomes
// true (Task 1's own trigger), regardless of whether the student had it open already — the
// reactive sequence should never require them to separately go find and click the toggle
// themselves.
// Fix: Confirm/Reconsider Button Appears Before Bot Finishes Speaking — the footer used to render
// the instant `review.isActive` was true, with zero regard for `review.loading` (the "Thinking"
// state) or whether the reply that just arrived was still being read aloud, so it could become
// clickable while the bot's own current message hadn't genuinely finished yet. `responseSettled`
// is the real gate: not still generating a reply, AND (via the new `onPlayingChange` wiring below)
// not actively playing that reply's own audio — both have to be true before the student is offered
// a real decision. `audioPlaying` resets to `false` whenever the review deactivates (Confirm/keep
// refining/close), so a stale "still playing" flag can never linger into the next activation.
export default function ModuleReviewWidget({ review, label }) {
  const [open, setOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    if (review.isActive) setOpen(true);
    else setAudioPlaying(false);
  }, [review.isActive]);

  const handleClose = () => {
    stopSpeaking();
    setAudioPlaying(false);
    setOpen(false);
  };

  const reviewing = review.isActive && review.phase === 'reviewing';
  // `!== 'chat'` (not `=== 'reviewing'`) is deliberate: `useModuleReview`'s own phase-setting
  // effect hasn't run yet on the very first render right after `beginReview()` fires (React flushes
  // passive effects after paint), so `review.phase` can still transiently read its OLD value
  // ('idle', left behind by the previous cycle) for a real, paintable frame while `review.isActive`
  // is already true. Gating on `phase === 'reviewing'` alone would fall through to the ChatConversation
  // branch during that split second — with nothing loading yet — reproducing the exact same
  // premature-footer bug this fix exists to close, just one step earlier. Treating "active but not
  // yet at 'chat'" as the reviewing beat closes that gap regardless of effect-scheduling timing.
  const showReviewingBeat = review.isActive && review.phase !== 'chat';
  const responseSettled = !review.loading && !audioPlaying;

  return createPortal(
    <>
      <button
        type="button"
        className={`module-review-toggle${open ? ' module-review-toggle-hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Ask MyPath AI anything"
        title="Ask MyPath AI anything"
      >
        <MascotIcon size={30} reviewing={reviewing} />
      </button>

      <div className={`module-review-panel${open ? ' module-review-panel-open' : ''}`} aria-hidden={!open}>
        <div className="map-chat-header">
          <MascotIcon size={36} reviewing={reviewing} thinking={!reviewing && review.loading} />
          <div className="map-chat-header-text">
            <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
            <h2 className="map-chat-title">{reviewing ? `Reviewing ${label}…` : 'Our Conversation'}</h2>
          </div>
          <button type="button" className="map-chat-close" onClick={handleClose} aria-label="Close chat">
            <X size={16} />
          </button>
        </div>

        {/* Task 2 — the reviewing beat gets its own small, focused view (not the full message
            list, which would show the SAME reviewing-glass mascot small and buried in the header
            while nothing else has happened yet) — a real, larger rendering of the exact same
            `reviewing` animation state, so it reads as a genuine, deliberate moment rather than a
            flicker. Transitions to the real conversation the instant `phase` becomes 'chat'. */}
        {showReviewingBeat ? (
          <div className="module-review-reviewing">
            <MascotIcon size={64} reviewing />
            <p>Taking a real look at what you picked…</p>
          </div>
        ) : (
          <ChatConversation
            messages={review.chatHistory}
            loading={review.loading}
            onSend={review.sendMessage}
            onEditMessage={review.editMessage}
            onPlayingChange={(index) => setAudioPlaying(index !== null)}
            placeholder="Tell me what's on your mind…"
            emptyHint="Ask about your plan, or anything about MyPath."
            footer={review.isActive && responseSettled && (
              <ModuleReviewFooter onConfirm={review.confirm} onKeepRefining={review.keepRefining} />
            )}
          />
        )}
      </div>
    </>,
    document.body,
  );
}
