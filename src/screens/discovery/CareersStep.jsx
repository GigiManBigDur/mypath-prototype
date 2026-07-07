import { MAJORS } from '../../data/majors';

export default function CareersStep({ careers, selectedCareerIds, onToggle }) {
  return (
    <div className="grid grid-3">
      {careers.map((career) => (
        <button
          type="button"
          key={career.id}
          className={`card${selectedCareerIds.includes(career.id) ? ' selected' : ''}`}
          onClick={() => onToggle(career.id)}
        >
          <div className="card-title">{career.name}</div>
          <p className="card-desc">{career.overview}</p>
          <div className="card-meta">
            <div>
              <span className="label">Avg. salary (illustrative)</span>
              <strong>{career.salary}</strong>
            </div>
            <div>
              <span className="label">Required education</span>
              <strong>{career.requiredEducation}</strong>
            </div>
            <div>
              <span className="label">Relevant majors</span>
              <strong>{career.relevantMajors.map((id) => MAJORS[id].name).join(', ')}</strong>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
