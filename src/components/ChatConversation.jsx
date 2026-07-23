import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import MascotIcon from './MascotIcon';

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
export default function ChatConversation({
  messages, loading, onSend, emptyHint, placeholder = 'Type a message…', renderMessageExtra, footer, onInputFocus,
}) {
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputValue('');
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
            {m.content}
            {renderMessageExtra && renderMessageExtra(m)}
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
