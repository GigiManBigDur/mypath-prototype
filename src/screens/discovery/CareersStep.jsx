import { MAJORS } from '../../data/majors';
import { TrackBadge, TrackIcon, getTrackColor } from '../../components/TrackVisuals';

export default function CareersStep({ careerGroups, selectedCareerIds, onToggle }) {
  return (
    <>
      {careerGroups.map((group) => (
        <div key={group.track} className="career-group">
          <TrackBadge track={group.track} />
          <div className="grid grid-3">
            {group.careers.map((career) => (
              <button
                type="button"
                key={career.id}
                className={`card${selectedCareerIds.includes(career.id) ? ' selected' : ''}`}
                onClick={() => onToggle(career.id)}
                // `--track-accent` set here too (not just on TrackIcon) so an unselected card's
                // HOVER border reads as "this card's own subject color", not the same fixed green
                // `.card.selected` already uses — the two would otherwise be visually ambiguous in
                // a still frame (confirmed directly via screenshot before this fix: a hovered,
                // unselected card and a genuinely selected one looked nearly identical, since both
                // read the same --bloom-accent green).
                style={{ '--track-accent': getTrackColor(group.track) }}
              >
                <TrackIcon track={group.track} />
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
        </div>
      ))}
    </>
  );
}
