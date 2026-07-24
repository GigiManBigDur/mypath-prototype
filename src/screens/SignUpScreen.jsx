import { useState } from 'react';
import { ArrowLeft, Compass, Rocket, Star, BookOpen, Palette, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Dashboard/Guide feature, Stage 1 (see CLAUDE.md) — the first of a multi-stage build (sign-up ->
// hub -> order enforcement -> guided pointing -> in-flow dialogue -> optional voiceover). This
// screen only handles sign-up: collecting a username (required) plus two clearly-optional fields
// (a citizenship, an avatar icon), then handing off to the hub (Stage 2, HubScreen.jsx) — the survey
// itself is now just one of the hub's own tiles, not the direct next screen. Later stages (order
// enforcement, guided pointing, in-flow dialogue, voiceover) are deliberately out of scope here —
// this stage's only job was making sure `state.username`/`citizenship`/`avatarIcon` exist by the time
// the hub needed them, which Stage 2 now does (see HubScreen.jsx's greeting).
//
// Sign-Up: Country field (see CLAUDE.md) — replaced the original optional "Preferred display
// name" field with a country field, ahead of a future (not-yet-built) Global Admission
// Intelligence feature. The old displayName field is gone entirely (not just hidden) — nothing
// else in this app read it besides the hub's own greeting fallback, which now reads
// `state.username` directly (see HubScreen.jsx).
//
// Real International Student Logic: Citizenship + Current Location Together (see CLAUDE.md) —
// that field is now genuinely read by real logic (isInternationalStudent(),
// utils/internationalStudent.js, consumed by roadmapGenerator.js's own international-student task
// set), so it was reworded from "What country are you from?" to "What is your citizenship?" with
// explicit clarifying subtext — a student who already lives/studies in the US but isn't a US
// citizen is exactly the case this reword exists to avoid confusing (the OLD "what country are
// you from" phrasing could easily be answered with "United States" by someone who's simply
// currently living there, which would have silently suppressed real international-student logic
// for them). Singapore was added to `CITIZENSHIP_OPTIONS` per this feature's own explicit ask —
// still a small, fixed list (not every country), so a `.pill-group` single-select (same
// toggle-to-select/toggle-to-deselect shape the avatar picker right below it already uses) still
// fits better than a giant every-country dropdown this prototype has no real use for. There was
// never a separate standalone "Are you an international student?" question anywhere in this app to
// remove — international status has always been meant to derive from this one field alone, per
// `isInternationalStudent()`'s own "citizenship !== United States" rule (this app only supports US
// schools, so any other citizenship implies international status), never a second, potentially
// contradicting yes/no answer.
//
// Deliberately no StepProgress here, matching `welcome`'s own precedent — this is a pre-flow
// screen, not one of the 9 tracked survey-through-plan steps, so it doesn't get a step indicator
// any more than the welcome hero does.
//
// A third optional field, "Mascot voice," sets `state.voiceMuted` (ElevenLabs Voice, see CLAUDE.md)
// before the student ever reaches the hub — the earliest point in the flow it can matter, since the
// hub is where the first real mascot dialogue (and therefore the first real, billed ElevenLabs API
// request) fires. This doesn't add a second mute mechanism — `voiceMuted` and its own real header
// toggle (App.jsx) already existed; this just surfaces the identical field one screen earlier so a
// tester/student who wants zero real API usage from the very start can opt out before the first
// request would otherwise go out. Labeled "For testing purposes" per its own explicit build ask,
// since the practical reason to reach for this pre-emptively (rather than the header toggle after
// the fact) is conserving a real, metered/billed API quota during testing, not a normal end-user
// preference.
const CITIZENSHIP_OPTIONS = ['United States', 'United Kingdom', 'Canada', 'India', 'China', 'Australia', 'Singapore'];
// Palette repaint (see CLAUDE.md) — 6 of the shared 7-color "bloom" accent palette (global.css's
// own `:root` tokens, first established for the hub's colorful tile icons), one per avatar so
// each option stays visually distinct exactly like it already was under the old palette. Green
// (`--bloom-green`) is deliberately left out — it's the same hue as `--bloom-accent`, already used
// heavily elsewhere on this screen (the Continue button, focus rings), so skipping it here avoids
// one avatar option blending into "the accent color" rather than reading as its own distinct pick.
export const AVATAR_OPTIONS = [
  { id: 'compass', label: 'Compass', Icon: Compass, color: 'var(--bloom-purple)' },
  { id: 'rocket', label: 'Rocket', Icon: Rocket, color: 'var(--bloom-orange)' },
  { id: 'star', label: 'Star', Icon: Star, color: 'var(--bloom-yellow)' },
  { id: 'book', label: 'Book', Icon: BookOpen, color: 'var(--bloom-blue)' },
  { id: 'palette', label: 'Palette', Icon: Palette, color: 'var(--bloom-pink)' },
  { id: 'trophy', label: 'Trophy', Icon: Trophy, color: 'var(--bloom-teal)' },
];

export default function SignUpScreen() {
  const { state, patch } = useApp();
  // Local form state, committed to AppContext only on submit — same "buffer locally, commit as
  // one unit" pattern AddTaskModal already established for this codebase's one other real form,
  // rather than patching (and persisting to localStorage) on every keystroke. Seeded from
  // existing state so navigating Back to `welcome` and returning doesn't lose an already-confirmed
  // sign-up (e.g. a returning user whose state was restored mid-flow).
  const [username, setUsername] = useState(state.username);
  const [citizenship, setCitizenship] = useState(state.citizenship);
  const [avatarIcon, setAvatarIcon] = useState(state.avatarIcon);
  // Lets a new sign-up opt out of mascot voice BEFORE ever reaching the hub — the earliest point
  // it can be set, since the hub is where the first real mascot dialogue (and therefore the first
  // real ElevenLabs API request) fires. `state.voiceMuted` already exists and already has a real
  // header toggle (App.jsx) that works from every screen after this one — this doesn't add a new
  // mechanism, it just surfaces that same field one screen earlier so a student who wants to skip
  // real API usage entirely can do so before the very first request would otherwise go out.
  const [voiceMuted, setVoiceMuted] = useState(state.voiceMuted);

  const canContinue = username.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    patch({
      username: username.trim(),
      citizenship,
      avatarIcon,
      voiceMuted,
      // Set once, ever — a defensive re-submit (state restored mid-flow) must not reset the
      // hub's own "Days active" stat back to day 1. See AppContext.jsx's own comment.
      accountCreatedAt: state.accountCreatedAt || new Date().toISOString().slice(0, 10),
      screen: 'hub',
    });
  };

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'welcome' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="page-title">Let's get you set up.</h1>
      <p className="page-sub">
        Just a username to get started — no email, no password, nothing to remember.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field-block">
          <div className="field-label">Choose a username</div>
          <p className="field-hint">This is how MyPath will remember you on this device.</p>
          <div className="task-form-field">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. futuredoc23"
              maxLength={30}
              autoFocus
            />
          </div>
        </div>

        <div className="field-block">
          <div className="field-label">
            What is your citizenship? <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">
            This is about your citizenship, not where you currently live — for example, you might
            live in the US but hold citizenship elsewhere.
          </p>
          <div className="pill-group">
            {CITIZENSHIP_OPTIONS.map((c) => (
              <button
                type="button"
                key={c}
                className={`pill${citizenship === c ? ' selected' : ''}`}
                onClick={() => setCitizenship(citizenship === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <div className="field-label">
            Pick an avatar <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">A small icon to represent you around the app.</p>
          <div className="avatar-grid">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`avatar-option${avatarIcon === opt.id ? ' selected' : ''}`}
                style={{ '--avatar-color': opt.color }}
                aria-label={opt.label}
                aria-pressed={avatarIcon === opt.id}
                onClick={() => setAvatarIcon(avatarIcon === opt.id ? null : opt.id)}
              >
                <opt.Icon size={22} />
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <div className="field-label">
            Mascot voice <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">
            Turn off the mascot's spoken voice. For testing purposes — you can also mute/unmute
            anytime later from the header.
          </p>
          <button
            type="button"
            className={`pill${voiceMuted ? ' selected' : ''}`}
            aria-pressed={voiceMuted}
            onClick={() => setVoiceMuted(!voiceMuted)}
          >
            {voiceMuted ? 'Voice off' : 'Voice on'}
          </button>
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={!canContinue}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
