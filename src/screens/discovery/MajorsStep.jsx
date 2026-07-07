import { MAJORS } from '../../data/majors';

export default function MajorsStep({ majorIds, selectedMajorIds, onToggle }) {
  return (
    <div className="grid grid-3">
      {majorIds.map((id) => {
        const major = MAJORS[id];
        return (
          <button
            type="button"
            key={id}
            className={`card${selectedMajorIds.includes(id) ? ' selected' : ''}`}
            onClick={() => onToggle(id)}
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
      })}
    </div>
  );
}
