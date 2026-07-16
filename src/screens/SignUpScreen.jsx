import { useState } from 'react';
import { ArrowLeft, Compass, Rocket, Star, BookOpen, Palette, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Dashboard/Guide feature, Stage 1 (see CLAUDE.md) — the first of a multi-stage build (sign-up ->
// hub -> order enforcement -> guided pointing -> in-flow dialogue -> optional voiceover). This
// screen only handles sign-up: collecting a username (required) plus two clearly-optional fields
// (a preferred display name, an avatar icon), then handing off to the hub (Stage 2, HubScreen.jsx)
// — the survey itself is now just one of the hub's own tiles, not the direct next screen. Later
// stages (order enforcement, guided pointing, in-flow dialogue, voiceover) are deliberately out of
// scope here — this stage's only job was making sure `state.username`/`displayName`/`avatarIcon`
// exist by the time the hub needed them, which Stage 2 now does (see HubScreen.jsx's greeting).
//
// Deliberately no StepProgress here, matching `welcome`'s own precedent — this is a pre-flow
// screen, not one of the 9 tracked survey-through-plan steps, so it doesn't get a step indicator
// any more than the welcome hero does.
export const AVATAR_OPTIONS = [
  { id: 'compass', label: 'Compass', Icon: Compass, color: 'var(--teal)' },
  { id: 'rocket', label: 'Rocket', Icon: Rocket, color: 'var(--rust)' },
  { id: 'star', label: 'Star', Icon: Star, color: 'var(--gold)' },
  { id: 'book', label: 'Book', Icon: BookOpen, color: 'var(--ink)' },
  { id: 'palette', label: 'Palette', Icon: Palette, color: 'var(--teal)' },
  { id: 'trophy', label: 'Trophy', Icon: Trophy, color: 'var(--gold)' },
];

export default function SignUpScreen() {
  const { state, patch } = useApp();
  // Local form state, committed to AppContext only on submit — same "buffer locally, commit as
  // one unit" pattern AddTaskModal already established for this codebase's one other real form,
  // rather than patching (and persisting to localStorage) on every keystroke. Seeded from
  // existing state so navigating Back to `welcome` and returning doesn't lose an already-confirmed
  // sign-up (e.g. a returning user whose state was restored mid-flow).
  const [username, setUsername] = useState(state.username);
  const [displayName, setDisplayName] = useState(state.displayName);
  const [avatarIcon, setAvatarIcon] = useState(state.avatarIcon);

  const canContinue = username.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    patch({
      username: username.trim(),
      displayName: displayName.trim(),
      avatarIcon,
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
            Preferred display name <span className="optional-badge">Optional</span>
          </div>
          <p className="field-hint">
            If you'd rather be greeted by a different name than your username, add it here.
          </p>
          <div className="task-form-field">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={30}
            />
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

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={!canContinue}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
