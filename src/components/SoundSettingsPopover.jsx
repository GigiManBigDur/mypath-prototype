import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModalExit } from '../hooks/useModalExit';

// Independent Toggle Controls for AI Voice and Background Music (see CLAUDE.md) — replaces the
// old single-click "mute everything" sound button with a small popover exposing two genuinely
// independent controls: AI Voice (`state.voiceMuted`, unchanged — still governs every mascot
// narration line app-wide exactly as it always has) and Background Music (`state.musicMuted`, new
// — currently governs only the Admissions Overview Presentation's own track). Muting one never
// touches the other.
//
// Shared by BOTH real render sites — App.jsx's generic persistent header (shown on every screen
// except welcome/hub) and HubScreen.jsx's own dedicated top bar (the hub renders its own top bar
// instead of the generic header, so this component was extracted once rather than duplicating the
// popover/positioning logic twice, matching this codebase's own established "extract once, every
// caller reads the identical behavior" convention). `buttonClassName` lets each caller keep its
// own icon-button base class (`header-icon-btn` / `hub-icon-btn`) for visual consistency with its
// own surrounding header, while the shared `voice-mute-toggle` class stays on the trigger button
// itself so pre-existing Playwright coverage (test-voiceover.js, test-voice-picker.js) keeps
// resolving it unmodified — this component still IS "the sound button," just with a richer
// interaction now that there are two independent things to control instead of one.
export default function SoundSettingsPopover({ buttonClassName }) {
  const { state, patch } = useApp();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);
  const { rendered, closing } = useModalExit(open, 160);

  // Positioned via a real, measured `getBoundingClientRect()` on whichever button triggered it
  // (the same "don't hardcode a fixed screen corner, measure the real DOM position" approach this
  // app's own DateOverrideControl/PointerArrow already establish) rather than a fixed screen
  // corner — necessary here specifically because this component renders from two structurally
  // different headers, not just one.
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [open]);

  // Click-outside / Escape closes the popover — a real, if lightweight, expectation for any
  // trigger-based popover, not just a full modal.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (popoverRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // The trigger's own icon reads as "sound off" only once BOTH channels are muted — if either is
  // still on, there's genuinely still sound coming from this app, so the icon should say so.
  const bothMuted = state.voiceMuted && state.musicMuted;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClassName} voice-mute-toggle`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Sound settings"
        aria-pressed={open}
        aria-expanded={open}
        title="Sound settings"
      >
        {bothMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      {rendered && pos && createPortal(
        <div
          ref={popoverRef}
          className={`sound-settings-popover${closing ? ' sound-settings-popover-exit' : ''}`}
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="sound-settings-row">
            <span className="sound-settings-label">AI Voice</span>
            <button
              type="button"
              className={`pill sound-settings-pill${!state.voiceMuted ? ' selected' : ''}`}
              aria-pressed={!state.voiceMuted}
              aria-label={state.voiceMuted ? 'Turn AI voice on' : 'Turn AI voice off'}
              onClick={() => patch({ voiceMuted: !state.voiceMuted })}
            >
              {state.voiceMuted ? 'Off' : 'On'}
            </button>
          </div>
          <div className="sound-settings-row">
            <span className="sound-settings-label">Background Music</span>
            <button
              type="button"
              className={`pill sound-settings-pill${!state.musicMuted ? ' selected' : ''}`}
              aria-pressed={!state.musicMuted}
              aria-label={state.musicMuted ? 'Turn background music on' : 'Turn background music off'}
              onClick={() => patch({ musicMuted: !state.musicMuted })}
            >
              {state.musicMuted ? 'Off' : 'On'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
