import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModalExit } from '../hooks/useModalExit';
import { getAvailableVoices, speak } from '../utils/speech';
import { getMascotLine } from '../data/mascotDialogue';

// "Show Available Voice Options" feature (see CLAUDE.md) — a small, temporary settings panel
// (Task 1/2 of that feature's own spec: list every real voice this device/browser offers, let a
// preview button speak an actual mascot line in each one, and let the student pick one to
// replace speech.js's own auto-pick heuristic everywhere the mascot speaks). Deliberately reuses
// this codebase's existing modal conventions wholesale (`.overlay`/`.modal`/`.modal-close`/
// `.modal-eyebrow`/`.modal-title`, `useModalExit` for the fade in/out, `createPortal(...,
// document.body)`) rather than inventing new UI language for what's explicitly a temporary,
// testing-oriented panel — the app's own real modals already establish exactly what a "small
// overlay with a close button" should look like here.
const PREVIEW_TEXT = getMascotLine('survey-intro');

export default function VoiceSettingsPanel({ isOpen, onClose }) {
  const { state, patch } = useApp();
  const { rendered, closing } = useModalExit(isOpen);
  // Voices load asynchronously on many browsers (see speech.js's own comment on `primeVoices`) —
  // re-reading the live list every time this panel actually opens (not just once on module load)
  // means it reflects whatever's ACTUALLY available by now, not a stale empty snapshot from
  // before the browser finished populating it.
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (isOpen) setVoices(getAvailableVoices());
  }, [isOpen]);

  if (!rendered) return null;

  return createPortal(
    <div className={`overlay${closing ? ' overlay-exit' : ''}`} onClick={onClose}>
      <div className={`modal voice-settings-modal${closing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="modal-eyebrow" style={{ color: 'var(--teal)' }}>Testing convenience</div>
        <h2 className="modal-title">Mascot Voice</h2>
        <p className="modal-desc">
          Free browser voices vary a lot by device — preview a few below and pick whichever
          sounds best. Your pick is used everywhere the mascot speaks, right away.
        </p>

        {voices.length === 0 ? (
          <p className="field-hint">
            No voices were found on this browser/device — the mascot's voiceover will stay silent
            here regardless of what's picked (text dialogue still works normally).
          </p>
        ) : (
          <>
            <button
              type="button"
              className={`voice-option${!state.voiceURI ? ' selected' : ''}`}
              onClick={() => patch({ voiceURI: null })}
            >
              <span className="voice-option-name">Default (auto-picked)</span>
              {!state.voiceURI && <Check size={15} className="voice-option-check" />}
            </button>
            <div className="voice-option-list">
              {voices.map((voice) => {
                const selected = state.voiceURI === voice.voiceURI;
                return (
                  <div className={`voice-option${selected ? ' selected' : ''}`} key={voice.voiceURI}>
                    <button
                      type="button"
                      className="voice-option-preview"
                      onClick={() => speak(PREVIEW_TEXT, voice.voiceURI)}
                      aria-label={`Preview ${voice.name}`}
                      title="Preview this voice"
                    >
                      <Play size={13} />
                    </button>
                    <button
                      type="button"
                      className="voice-option-pick"
                      onClick={() => patch({ voiceURI: voice.voiceURI })}
                    >
                      <span className="voice-option-name">{voice.name}</span>
                      <span className="voice-option-lang">{voice.lang}</span>
                    </button>
                    {selected && <Check size={15} className="voice-option-check" />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
