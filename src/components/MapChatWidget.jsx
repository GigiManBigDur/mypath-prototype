import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from './MascotIcon';
import ChatConversation from './ChatConversation';
import ChatTaskConfirmFooter from './ChatTaskConfirmFooter';
import { useHubChat } from '../hooks/useHubChat';
import { useMascotSpeech } from '../hooks/useMascotSpeech';

// Add a Small Embedded AI Chat Widget to Map 2 (see CLAUDE.md) — a compact, collapsed-by-default
// entry point into the SAME conversation the hub's own "Ask MyPath AI anything" feature already
// holds (`state.chatHistory`, via the shared `useHubChat` hook — see that file's own header
// comment), so a message sent here shows up in the hub's chat afterward and vice versa. Rendered
// as a sibling of the roadmap canvas/zoom-controls/bottom-panel inside `.roadmap-fullscreen-root`
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
export default function MapChatWidget() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  // The latest reply's text, fed to useMascotSpeech below — kept separate from `chatHistory` so
  // speech only ever triggers on a genuinely NEW reply arriving, the same convention
  // HubChatPanel/BuildYourOwnView's own mascot-speech wiring already established. `open ? ... :
  // null` stops the audio immediately the instant the widget is collapsed — the same "dismissing
  // is just an ordinary 'the current line went away' change" contract every other caller of this
  // hook already relies on.
  const [speakingText, setSpeakingText] = useState(null);
  const isSpeaking = useMascotSpeech(open ? speakingText : null, state.voiceMuted);

  const {
    chatHistory, loading, sendMessage, goToBuildYourOwn,
    pendingTask, pickingDate, dateInput, dateError,
    startPickingDate, updateDateInput, dismissPendingTask, finalizeAddTask,
  } = useHubChat(setSpeakingText);

  return (
    <>
      <button
        type="button"
        className={`map-chat-toggle${open ? ' map-chat-toggle-hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Ask MyPath AI anything"
        title="Ask MyPath AI anything"
      >
        <MascotIcon size={30} speaking={isSpeaking} />
      </button>

      <div className={`map-chat-panel${open ? ' map-chat-panel-open' : ''}`} aria-hidden={!open}>
        <div className="map-chat-header">
          <MascotIcon size={36} speaking={isSpeaking} />
          <div className="map-chat-header-text">
            <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
            <h2 className="map-chat-title">Ask me anything</h2>
          </div>
          <button type="button" className="map-chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={16} />
          </button>
        </div>

        <ChatConversation
          messages={chatHistory}
          loading={loading}
          onSend={sendMessage}
          emptyHint="Ask about your plan, or anything about MyPath."
          renderMessageExtra={(m) => m.intent === 'redirect_build_your_own' && (
            <div className="chat-redirect-action">
              <button type="button" className="btn btn-primary" onClick={goToBuildYourOwn}>Go to Project Builder</button>
            </div>
          )}
          footer={(
            <ChatTaskConfirmFooter
              pendingTask={pendingTask}
              pickingDate={pickingDate}
              dateInput={dateInput}
              dateError={dateError}
              onStartPickingDate={startPickingDate}
              onDateChange={updateDateInput}
              onDismiss={dismissPendingTask}
              onConfirm={finalizeAddTask}
            />
          )}
        />
      </div>
    </>
  );
}
