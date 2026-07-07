import { getMergedPrograms } from '../../data/programs';
import { MAJORS } from '../../data/majors';

export default function ProgramsStep({ majorIds, educationLevel, selectedProgramKeys, onToggle }) {
  const programs = getMergedPrograms(majorIds, educationLevel);

  return (
    <div>
      <p className="field-hint" style={{ marginBottom: 18 }}>
        Select as many as you'd like — these become your school list, carried into your Academic Plan.
      </p>
      <div className="grid grid-3">
        {programs.map((p) => {
          const selected = selectedProgramKeys.includes(p.key);
          return (
            <button
              type="button"
              key={p.key}
              className={`card${selected ? ' selected' : ''}`}
              onClick={() => onToggle(p.key)}
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
                {p.majorIds.length > 1 && (
                  <div>
                    <span className="label">Fits your selected majors</span>
                    <strong>{p.majorIds.map((id) => MAJORS[id].name).join(', ')}</strong>
                  </div>
                )}
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
