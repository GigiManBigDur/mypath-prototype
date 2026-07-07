import { getPrograms } from '../../data/programs';

export function programKey(majorId, institution) {
  return `${majorId}::${institution}`;
}

export default function ProgramsStep({ majorId, educationLevel, selectedProgramKeys, onToggle }) {
  const programs = getPrograms(majorId, educationLevel);

  return (
    <div>
      <p className="field-hint" style={{ marginBottom: 18 }}>
        Select as many as you'd like — these become your school list, carried into your Academic Plan.
      </p>
      <div className="grid grid-3">
        {programs.map((p) => {
          const key = programKey(majorId, p.institution);
          const selected = selectedProgramKeys.includes(key);
          return (
            <button
              type="button"
              key={key}
              className={`card${selected ? ' selected' : ''}`}
              onClick={() => onToggle(key)}
            >
              <div className="card-title">{p.institution}</div>
              <p className="card-desc" style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.program}</p>
              <p className="card-desc">{p.overview}</p>
              <div className="card-meta">
                <div>
                  <span className="label">Selectivity</span>
                  <strong>{p.selectivity}</strong>
                </div>
                <div>
                  <span className="label">Location</span>
                  <strong>{p.location}</strong>
                </div>
                <div>
                  <span className="label">Degree levels</span>
                  <strong>{p.degreeLevels.join(', ')}</strong>
                </div>
              </div>
              {p.transferNote && (
                <p className="card-desc" style={{ marginTop: 10, color: 'var(--teal)', fontStyle: 'italic' }}>
                  {p.transferNote}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
