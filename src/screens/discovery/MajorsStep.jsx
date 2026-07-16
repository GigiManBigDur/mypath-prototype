import { MAJORS } from '../../data/majors';
import { TrackBadge, TrackIcon, getTrackColor } from '../../components/TrackVisuals';

function MajorCard({ major, track, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`card${selected ? ' selected' : ''}`}
      onClick={onToggle}
      // `--track-accent` set here too (not just on TrackIcon) so an unselected card's hover
      // border reads as its own subject color, distinct from `.card.selected`'s fixed green — see
      // CareersStep.jsx's own comment for the confirmed ambiguity this fixes. Falls back to the
      // plain bloom accent when no track is known at all (e.g. a browse-mode major somehow
      // reached with no majorTrackMap entry), matching `TrackIcon`'s own fallback.
      style={track ? { '--track-accent': getTrackColor(track) } : undefined}
    >
      {track && <TrackIcon track={track} />}
      <div className="card-title">{major.name}</div>
      <p className="card-desc">{major.overview}</p>
      <div className="card-meta">
        <div>
          <span className="label">Skills developed</span>
          <strong>{major.skills.join(', ')}</strong>
        </div>
        <div>
          <span className="label">Potential careers</span>
          <strong>{major.potentialCareers.join(', ')}</strong>
        </div>
        <div>
          <span className="label">Time to complete</span>
          <strong>{major.timeToComplete}</strong>
        </div>
      </div>
    </button>
  );
}

// Recommended mode (unchanged data-wise): a flat grid of majorIds linked to the selected
// career(s). Browse mode passes majorGroups instead ([{ track, majors }], from getMajorGroups)
// and renders grouped section headers, same visual pattern CareersStep already uses — majorIds is
// ignored when majorGroups is provided.
//
// Palette repaint, Discovery batch (see CLAUDE.md) — `majorTrackMap` (a plain `{ majorId: track
// }` lookup DiscoveryScreen.jsx derives once from its own existing `allMajorGroups`, the same
// "first track that references it" resolution `getMajorGroups` already uses for Browse mode) is
// what lets Recommended mode's own flat majorIds list ALSO show a real, correctly-colored
// TrackIcon per card — a major itself carries no `track` field in majors.js, so without this
// lookup, only Browse mode (which already groups by track) could show one.
export default function MajorsStep({ majorIds, majorGroups, majorTrackMap, selectedMajorIds, onToggle }) {
  if (majorGroups) {
    return (
      <>
        {majorGroups.map((group) => (
          <div key={group.track} className="career-group">
            <TrackBadge track={group.track} />
            <div className="grid grid-3">
              {group.majors.map((major) => (
                <MajorCard
                  key={major.id}
                  major={major}
                  track={group.track}
                  selected={selectedMajorIds.includes(major.id)}
                  onToggle={() => onToggle(major.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="grid grid-3">
      {majorIds.map((id) => (
        <MajorCard
          key={id}
          major={MAJORS[id]}
          track={majorTrackMap?.[id]}
          selected={selectedMajorIds.includes(id)}
          onToggle={() => onToggle(id)}
        />
      ))}
    </div>
  );
}
