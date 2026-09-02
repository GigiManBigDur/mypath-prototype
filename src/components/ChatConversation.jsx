import { useEffect, useRef, useState } from 'react';
import { Send, Volume2, Square, Pencil, Check, X } from 'lucide-react';
import MascotIcon from './MascotIcon';
import { useApp } from '../context/AppContext';
import { speak, stopSpeaking } from '../utils/speech';

// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md), Task 4 — the one
// shared chat UI implementation this app now has, extracted out of `HubChatPanel.jsx` so Project
// Builder's own "Build Your Own" conversation can reuse it too instead of a second, near-identical
// copy (which the build spec's own "do not build a third, separate chat implementation" explicitly
// rules out). Purely presentational: message list + input row, nothing about WHAT a message means
// or how a reply gets fetched — every caller supplies its own `messages`/`onSend`/`loading` and
// decides what its own messages/history mean (a hub general-assistant turn, a project-brainstorm
// turn, etc.). `renderMessageExtra`/`footer` are the two extension points each caller uses for its
// own per-feature UI (the hub's redirect-to-Build-Your-Own button; a "Start This Project" button
// once a plan is ready) without this component needing to know anything about either one.
// Make the Overview-Task Chat More Obviously Interactive (see CLAUDE.md), Task 2 — `onInputFocus`
// is a new, purely optional prop (undefined/no-op for every existing caller that doesn't pass it)
// firing on the input's own real `onFocus` — the literal moment a student is "about to start
// typing," which is what MilestonePlanningPanel uses to fade its own first-time glow/hint. No
// other caller needed to change at all.
//
// Opt-In Voice Per Message in Chat + Editable Messages (see CLAUDE.md) — this is where BOTH new
// features actually live, since every open-ended chat surface (Hub chat, the Map 2 widget, Build
// Your Own, the milestone-scoped chat) already renders its messages through this one shared
// component. Adding them here once, rather than in each of the 4 callers, is what guarantees they
// behave identically everywhere and never touches the guided-tutorial dialogue at all (Task 2 of
// that fix) — the tutorial's own mascot lines never pass through `ChatConversation` in the first
// place; they're rendered by `MascotWidget.jsx`/`HubScreen.jsx` directly, a completely separate
// code path this component doesn't touch.
// - Per-message Play/Stop (Task 1): a real per-message toggle button, using `speech.js`'s own
//   `speak`/`stopSpeaking` DIRECTLY rather than the `useMascotSpeech` hook — that hook is purpose-
//   built for "a dialogue line arrived, auto-speak it once," keyed on the TEXT actually changing;
//   a manual replay button needs to re-trigger the SAME text on a second click after being
//   stopped, which `useMascotSpeech`'s own new-key detection would silently ignore. `playingIndex`
//   (local state — safe since at most one `ChatConversation` is ever mounted at a time in this
//   app's single-screen architecture) tracks which message's audio is current; clicking a
//   DIFFERENT message's Play button while one is already playing works for free, since `speak()`
//   already stops whatever was playing before starting the new one — the UI's own `playingIndex`
//   switching to the new index is what makes the OLD button visually revert to "Play" without
//   needing that old message's own `onEnd` to ever fire (which it may not, since a manual
//   `audio.pause()` never dispatches a real `ended` event). Disabled (not hidden) while
//   `state.voiceMuted` — a real, honest reflection that the global mute is "a full on/off for all
//   audio anywhere," per that fix's own Task 3, not a second, independent mute concept.
// - Editable messages (Task 4): only ever offered on `role === 'user'` messages, and only when the
//   caller actually supplies `onEditMessage` (every real chat surface does; omitting it just means
//   no edit button renders, a safe default for any future caller that doesn't need this). Saving an
//   edit hands `(index, newContent)` up to the caller, which is expected to truncate its own
//   history at that index and regenerate a fresh reply for the corrected message — this component
//   has no opinion on how that regeneration happens, only that it's the caller's job.
//
// Fix: Confirm/Reconsider Button Appears Before Bot Finishes Speaking — `onPlayingChange` is a new,
// purely optional prop (undefined/no-op for every existing caller, matching `onInputFocus`'s own
// precedent) firing whenever `playingIndex` changes. `ModuleReviewWidget.jsx` uses this to know
// when a message's audio is actively playing, so it can hold its own confirm/reconsider footer back
// until playback (not just the reply's arrival) has genuinely finished — this component itself has
// no opinion on what a caller does with that signal.
export default function ChatConversation({
  messages, loading, onSend, emptyHint, placeholder = 'Type a message…', renderMessageExtra, footer, onInputFocus,
  onEditMessage, onPlayingChange,
}) {
  const { state } = useApp();
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef(null);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loading]);

  useEffect(() => {
    onPlayingChange?.(playingIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingIndex]);

  // Navigating away mid-playback (this component unmounting) shouldn't leave audio running over
  // whatever's rendered next — the same "don't let it keep talking past its own screen" contract
  // every other real speech consumer in this app already honors.
  useEffect(() => () => stopSpeaking(), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputValue('');
  };

  // A real, confirmed bug caught while testing this: `playingIndex` must only become `index` once
  // real playback GENUINELY begins (`onStart`, tied to the audio element's own `playing` event) —
  // not optimistically the instant the button is clicked. Setting it eagerly (the first draft of
  // this function) meant the button showed "Stop" even when the underlying audio silently failed
  // to start (a bad/unplayable clip, a network error, an autoplay-policy block) — misleading, since
  // a "Stop" button implies something is actually audible right now. This mirrors the exact lesson
  // `useMascotSpeech.js` already documents for its own `isSpeaking` state ("unlike the old
  // SpeechSynthesis version's own approach... optimistically flipping this the instant speak() is
  // CALLED... would desync the mouth/expression animation from when the student can actually hear
  // anything") — the same principle applies here, just never applied to this new per-message
  // control the first time it was written.
  const togglePlay = (index, text) => {
    if (playingIndex === index) {
      stopSpeaking();
      setPlayingIndex(null);
      return;
    }
    stopSpeaking();
    speak(text, {
      onStart: () => setPlayingIndex(index),
      onEnd: () => setPlayingIndex((current) => (current === index ? null : current)),
    });
  };

  const startEdit = (index, content) => {
    if (playingIndex !== null) { stopSpeaking(); setPlayingIndex(null); }
    setEditingIndex(index);
    setEditValue(content);
  };
  const cancelEdit = () => { setEditingIndex(null); setEditValue(''); };
  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed || !onEditMessage) return;
    onEditMessage(editingIndex, trimmed);
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && !loading && emptyHint && (
          <p className="chat-empty-hint">{emptyHint}</p>
        )}
        {messages.map((m, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
            {editingIndex === i ? (
              <div className="chat-edit-row">
                <input
                  type="text"
                  className="chat-edit-input"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <div className="chat-edit-actions">
                  <button type="button" onClick={saveEdit} disabled={!editValue.trim() || loading} aria-label="Save edit">
                    <Check size={14} />
                  </button>
                  <button type="button" onClick={cancelEdit} aria-label="Cancel edit">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {m.content}
                {renderMessageExtra && renderMessageExtra(m)}
                <div className="chat-bubble-actions">
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      className={`chat-play-btn${playingIndex === i ? ' playing' : ''}`}
                      onClick={() => togglePlay(i, m.content)}
                      disabled={state.voiceMuted}
                      aria-label={playingIndex === i ? 'Stop audio' : 'Play audio'}
                      title={state.voiceMuted ? 'Unmute (top-right) to play audio' : undefined}
                    >
                      {playingIndex === i ? <Square size={11} /> : <Volume2 size={11} />}
                      {playingIndex === i ? 'Stop' : 'Play'}
                    </button>
                  )}
                  {m.role === 'user' && onEditMessage && (
                    <button
                      type="button"
                      className="chat-edit-btn"
                      onClick={() => startEdit(i, m.content)}
                      disabled={loading}
                      aria-label="Edit message"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {/* Improve the AI "Thinking" Indicator (see CLAUDE.md) — replaces the old plain italic
            "Thinking…" text with the mascot's own dedicated thinking animation (a contemplative
            tilt-bob, soft squint-and-hold eyes, a slower chest-light glow, plus a small bouncing
            "..." thought bubble — see MascotIcon.jsx's own `thinking` prop), shown wherever ANY
            caller of this shared component is waiting on a reply — the general chat, Build Your
            Own, and the milestone-scoped chat all route through this one component's own `loading`
            prop, so this single change covers all of them consistently with no per-caller wiring. */}
        {loading && (
          <div className="chat-bubble chat-bubble-assistant chat-bubble-loading chat-bubble-thinking">
            <MascotIcon size={28} thinking />
            <span className="chat-bubble-thinking-label">Thinking&hellip;</span>
          </div>
        )}
        {footer}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={onInputFocus}
          placeholder={placeholder}
        />
        <button type="submit" className="chat-send-btn" disabled={!inputValue.trim() || loading} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
