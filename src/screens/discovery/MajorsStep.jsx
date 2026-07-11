import { MAJORS } from '../../data/majors';
import { TRACK_LABELS } from '../../data/interests';

function MajorCard({ major, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`card${selected ? ' selected' : ''}`}
      onClick={onToggle}
    >
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

// Recommended mode (unchanged): a flat grid of majorIds linked to the selected career(s). Browse
// mode passes majorGroups instead ([{ track, majors }], from getMajorGroups) and renders grouped
// section headers, same visual pattern CareersStep already uses — majorIds is ignored when
// majorGroups is provided.
export default function MajorsStep({ majorIds, majorGroups, selectedMajorIds, onToggle }) {
  if (majorGroups) {
    return (
      <>
        {majorGroups.map((group) => (
          <div key={group.track} className="career-group">
            <div className="career-group-label">{TRACK_LABELS[group.track] || group.track}</div>
            <div className="grid grid-3">
              {group.majors.map((major) => (
                <MajorCard
                  key={major.id}
                  major={major}
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
          selected={selectedMajorIds.includes(id)}
          onToggle={() => onToggle(id)}
        />
      ))}
    </div>
  );
}
