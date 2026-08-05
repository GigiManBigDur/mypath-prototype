import { useState } from 'react';
import { X } from 'lucide-react';
import MascotIcon from './MascotIcon';
import ChatSessionView from './ChatSessionView';
import { useChatSessions } from '../hooks/useChatSessions';
import { stopSpeaking } from '../utils/speech';

// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md) — a compact, collapsed-by-default
// entry point into the SAME conversation the hub's own "Ask MyPath AI anything" feature already
// holds, so a message sent here shows up in the hub's chat afterward and vice versa. Rendered as a
// sibling of the roadmap canvas/zoom-controls/bottom-panel inside `.roadmap-fullscreen-root`
// (Roadmap.jsx) — Task 3's own explicit boundary: this is a new element added ALONGSIDE the
// roadmap, not a modification to it, so it touches none of `roadmapLayout.js`'s date-to-y
// positioning, connector-line rendering, or the zoom/pan/drag mechanics.
//
// `open` is local, unpersisted UI state (matching this app's own established "session-only
// convenience" trade for browse/collapse state elsewhere — Project Builder's sub-views, the
// Academic Plan panel's own `panelCollapsed`) — always starts collapsed on a fresh mount/reload,
// which is the correct default for "small and unobtrusive" (Task 2). Both the collapsed toggle
// and the expanded panel stay mounted the whole time; only a CSS class toggles opacity/transform/
// pointer-events, giving a smooth expand-from-the-corner/collapse-back-down animation without
// needing an unmount-after-fade mechanism (`useModalExit`) — there's nothing here that needs to
// stop existing between opens, unlike a portaled overlay.
//
// Multi-Session Chat (see CLAUDE.md) — this widget deliberately has NO session switcher of its
// own (matching its own documented "small, not a primary surface" scope); it just mirrors
// whatever session the hub panel currently has active (`useChatSessions()`'s `activeSessionId`,
// including the reserved `'narrative'` pseudo-session if that's what's active) via the shared
// `ChatSessionView` — the same component the hub's own panel renders, so this preserves the
// "same conversation, two entry points" property exactly, for either kind of session, at zero
// extra cost.
export default function MapChatWidget() {
  const [open, setOpen] = useState(false);
  const { activeSessionId } = useChatSessions();

  const handleClose = () => {
    stopSpeaking();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`map-chat-toggle${open ? ' map-chat-toggle-hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Ask MyPath AI anything"
        title="Ask MyPath AI anything"
      >
        <MascotIcon size={30} />
      </button>

      <div className={`map-chat-panel${open ? ' map-chat-panel-open' : ''}`} aria-hidden={!open}>
        <div className="map-chat-header">
          <MascotIcon size={36} />
          <div className="map-chat-header-text">
            <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
            <h2 className="map-chat-title">Ask me anything</h2>
          </div>
          <button type="button" className="map-chat-close" onClick={handleClose} aria-label="Close chat">
            <X size={16} />
          </button>
        </div>

        <ChatSessionView
          key={activeSessionId}
          sessionId={activeSessionId}
          emptyHint="Ask about your plan, or anything about MyPath."
        />
      </div>
    </>
  );
}
