import { getPrograms, getMergedPrograms, selectProgramsForGpa, reachMatchSafetyTag, gpaBenchmarkText } from '../../data/programs';
import { MAJORS } from '../../data/majors';

// Shared by both Recommended (merged across selected majors) and Browse (one major at a time) —
// same GPA-aware Reach/Match/Safety badge and benchmark display either way, since both call sites
// run their programs through the exact same selectProgramsForGpa/reachMatchSafetyTag functions,
// just with a different input list.
function ProgramCard({ p, gpa, selected, onToggle }) {
  const tag = reachMatchSafetyTag(gpa, p.gpaValue);
  return (
    <button
      type="button"
      className={`card${selected ? ' selected' : ''}`}
      onClick={onToggle}
    >
      {tag && (
        <div className="rms-row">
          <span className={`rms-badge rms-${tag.toLowerCase()}`}>{tag}</span>
          {p.gpaWeighted && (
            <span className="rms-caveat">Based on GPA alone — {p.gpaWeighted} also weighed</span>
          )}
        </div>
      )}
      <div className="card-title">{p.institution}</div>
      <p className="card-desc" style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.program}</p>
      <p className="card-desc">{p.overview}</p>
      <div className="card-meta">
        <div>
          <span className="label">Selectivity</span>
          <strong>{p.selectivity}</strong>
        </div>
        <div>
          <span className="label">Typical GPA</span>
          <strong>{gpaBenchmarkText(p)}</strong>
        </div>
        <div>
          <span className="label">Location</span>
          <strong>{p.location}</strong>
        </div>
        <div>
          <span className="label">Degree levels</span>
          <strong>{p.degreeLevels.join(', ')}</strong>
        </div>
        {p.majorIds && p.majorIds.length > 1 && (
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
}

// Recommended mode (unchanged): programs merged across the selected major(s) into one
// deduplicated, GPA-curated list. Browse mode passes browseMajorIds instead (every major
// reachable across all tracks at this level) and groups programs by major with section headers —
// majorIds/getMergedPrograms is ignored when browseMajorIds is provided. Each major's own section
// runs getPrograms -> selectProgramsForGpa independently (majorCount=1, i.e. the same "4 cards"
// quota a single selected major would get in Recommended mode) rather than merging across majors,
// since Browse is exploring by major, not building one combined school list yet — the same
// program can legitimately appear under more than one major's section here.
export default function ProgramsStep({ majorIds, browseMajorIds, educationLevel, selectedProgramKeys, onToggle, gpa }) {
  if (browseMajorIds) {
    return (
      <div>
        <p className="field-hint" style={{ marginBottom: 18 }}>
          Select as many as you'd like — these become your school list, carried into your Academic Plan.
        </p>
        {browseMajorIds.map((majorId) => {
          const programs = selectProgramsForGpa(getPrograms(majorId, educationLevel), gpa, 1);
          if (!programs.length) return null;
          return (
            <div key={majorId} className="career-group">
              <div className="career-group-label">{MAJORS[majorId].name}</div>
              <div className="grid grid-3">
                {programs.map((p) => (
                  <ProgramCard
                    key={p.key ?? `${p.institution}::${p.program}`}
                    p={p}
                    gpa={gpa}
                    selected={selectedProgramKeys.includes(p.key ?? `${p.institution}::${p.program}`)}
                    onToggle={() => onToggle(p.key ?? `${p.institution}::${p.program}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const allPrograms = getMergedPrograms(majorIds, educationLevel);
  const programs = selectProgramsForGpa(allPrograms, gpa, majorIds.length);

  return (
    <div>
      <p className="field-hint" style={{ marginBottom: 18 }}>
        Select as many as you'd like — these become your school list, carried into your Academic Plan.
      </p>
      <div className="grid grid-3">
        {programs.map((p) => (
          <ProgramCard
            key={p.key}
            p={p}
            gpa={gpa}
            selected={selectedProgramKeys.includes(p.key)}
            onToggle={() => onToggle(p.key)}
          />
        ))}
      </div>
    </div>
  );
}
