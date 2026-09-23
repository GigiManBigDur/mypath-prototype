import { BLOOM_ACCENT_SWATCHES, getBloomAccentColor } from './TrackVisuals';
import { getOrgInitials } from '../utils/adminOrgProfile';

// Implement New Admin Dashboard, Align Colors With the Menu Screen (see CLAUDE.md), Task 1/2 —
// "Organization Profile & Branding": display name + tagline (both real, admin-editable, persisted
// via `state.adminOrgProfiles`), a logo placeholder (honestly labeled as unavailable in this
// prototype rather than a fake, non-functional "Upload" button — this app has no real file storage
// to back one), and a brand-color picker reading the SAME 7 "bloom" accent swatches this whole
// console already draws from, replacing the attached design's own independently-invented 6-hue
// oklch() picker (Task 2's own explicit instruction). The right column is a real, live "Student
// view" preview — every field here updates it immediately, the same way the event editor's own
// live preview works. Reuses this app's own shared `.page-title`/`.page-sub`/`.task-form-field`/
// `.label`/`.field-label`/`.field-hint` classes throughout (already `.app-shell-bloom`-overridden)
// rather than a second, near-identical set of admin-only form-field classes.
export default function AdminOrgProfileSection({ org, profile, accent, onUpdateProfile, eventCount, resourceCount }) {
  return (
    <div>
      <h1 className="page-title">Organization</h1>
      <p className="page-sub">Your identity across MyPath. Changes apply everywhere students see you.</p>

      <div className="admin-profile-grid">
        <div className="admin-card admin-profile-card">
          <div className="admin-profile-block admin-profile-logo-block">
            <div className="admin-profile-logo-placeholder">{getOrgInitials(profile.name)}</div>
            <div>
              <div className="field-label">Logo</div>
              <p className="field-hint">
                Logo upload isn't available in this prototype yet — your badge uses these initials,
                derived automatically from your display name.
              </p>
            </div>
          </div>

          <div className="admin-profile-block">
            <label className="task-form-field">
              <span className="label">Display name</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => onUpdateProfile({ name: e.target.value })}
              />
            </label>
            <label className="task-form-field">
              <span className="label">Tagline</span>
              <textarea
                rows={3}
                value={profile.tagline}
                onChange={(e) => onUpdateProfile({ tagline: e.target.value })}
              />
            </label>
          </div>

          <div className="admin-profile-block">
            <div className="field-label">Brand color</div>
            <p className="field-hint">
              Used on your events, badges, and throughout this console — one of the same colors
              used across the rest of MyPath.
            </p>
            <div className="admin-swatch-row">
              {BLOOM_ACCENT_SWATCHES.map((s) => {
                const isCurrent = profile.brandColorKey === s.key;
                return (
                  <button
                    type="button"
                    key={s.key}
                    title={s.key}
                    className={`admin-swatch${isCurrent ? ' active' : ''}`}
                    style={{ background: `var(${s.var})` }}
                    onClick={() => onUpdateProfile({ brandColorKey: s.key })}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="admin-preview-col">
          <div className="admin-preview-eyebrow">Student view</div>
          <div className="admin-student-card">
            <div className="admin-student-card-band" style={{ background: accent }} />
            <div className="admin-student-card-body">
              <div className="admin-student-card-avatar" style={{ background: getBloomAccentColor(profile.brandColorKey) }}>
                {getOrgInitials(profile.name)}
              </div>
              <div className="admin-student-card-name">{profile.name}</div>
              <div className="admin-student-card-meta">{org.parent} · {org.kind}</div>
              <p className="admin-student-card-tagline">{profile.tagline}</p>
              <div className="admin-student-card-pills">
                <span className="admin-student-pill" style={{ background: 'color-mix(in srgb, var(--org-accent) 16%, var(--bloom-card))', color: 'var(--org-accent)', '--org-accent': accent }}>
                  {eventCount} upcoming event{eventCount === 1 ? '' : 's'}
                </span>
                <span className="admin-student-pill admin-student-pill-neutral">{resourceCount} resources</span>
              </div>
              <div className="admin-student-card-follow">Follow</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
