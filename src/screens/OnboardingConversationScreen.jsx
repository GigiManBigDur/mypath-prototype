import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MascotIcon from '../components/MascotIcon';
import ChatConversation from '../components/ChatConversation';
import { useOnboardingChat } from '../hooks/useOnboardingChat';

// AI-First Onboarding, Stage 2 (see CLAUDE.md) — replaces Stage 1's own minimal placeholder with
// the real conversation page: the student's first genuine dialogue with the AI, gathering what
// used to come from the interest-tag survey question and the prior-experience/ECs field
// conversationally instead. Sits in the exact same place in the flow Stage 1 already established
// (Sign Up -> Survey -> this screen -> Hub) — only this screen's own body changed, not its
// position, its screen key, or its App.jsx registration (already wired up in Stage 1).
//
// Task 2 — reuses the SAME chat infrastructure every other real conversation in this app already
// uses (`ChatConversation`'s own message list/input row, its per-message Play/Stop button, its
// thinking indicator) via its own dedicated hook (`useOnboardingChat`) and its own dedicated
// `state.onboardingChatHistory` field — deliberately separate from `state.chatHistory` (the
// general "Ask MyPath AI anything" conversation elsewhere in the app), matching this app's own
// established "each real conversation gets its own thread" precedent (Build Your Own's
// `buildYourOwnChatHistory`, a milestone's own scoped `chatHistory` are both already separate from
// the general assistant's history the same way).
//
// This screen is registered under `isBloomScreen` in App.jsx (from Stage 1), so the plain,
// unscoped `.chat-messages`/`.chat-bubble`/`.chat-input-row` classes `ChatConversation` renders
// already resolve to the same bloom-palette colors Build Your Own's own identical chat markup
// already gets there — no new CSS needed for this screen's own chat area.
export default function OnboardingConversationScreen() {
  const { patch } = useApp();
  const { chatHistory, loading, sendMessage, editMessage } = useOnboardingChat();

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'survey' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">Let's talk about you.</h1>
      <p className="page-sub">
        Before we build anything, I want to actually get to know you — what excites you, what
        you've already done, and help you figure out a direction that's genuinely yours.
      </p>

      <div className="chat-header" style={{ marginBottom: 16 }}>
        <MascotIcon size={44} thinking={loading} />
        <div>
          <div className="modal-eyebrow" style={{ color: 'var(--bloom-ai)', margin: 0 }}>MyPath AI</div>
          <h2 className="hub-chat-title" style={{ fontSize: 16 }}>Getting to know you</h2>
        </div>
      </div>

      <ChatConversation
        messages={chatHistory}
        loading={loading}
        onSend={sendMessage}
        onEditMessage={editMessage}
        placeholder="Tell me what's on your mind…"
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue to my Hub
        </button>
      </div>
    </div>
  );
}
