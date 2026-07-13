import { useState } from 'react';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOpportunityTracks, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getOpportunityPool, getSchoolOpportunities } from '../data/opportunities';
import { anchorDate, formatDate, startOfToday } from '../utils/dates';
import StepProgress from '../components/StepProgress';

export default function OpportunityFinderScreen() {
  const { state, patch } = useApp();
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const isGeneric = opportunityTracks.length === 0;
  const recommendedOpportunities = getOpportunityPool(opportunityTracks, state.educationLevel);
  const today = startOfToday();

  // "My School" — real, independently-fetched club data for the student's actual school, a third
  // lens alongside Recommended/Browse rather than a filter within them. Scoped to High School +
  // Roslyn specifically (the only real `currentSchool` value right now — src/data/schools.js), same
  // boundary every other partner-school feature (Transcript & GPA, Course Selection) already uses.
  // Undergraduate/Transfer never see this tab at all, matching that same scoping.
  const isHighSchool = state.educationLevel === 'highschool';
  const showMySchoolTab = isHighSchool && state.currentSchool === 'Roslyn High School';
  const mySchoolOpportunities = showMySchoolTab
    ? getSchoolOpportunities(state.currentSchool, state.educationLevel)
    : [];

  // Local, unpersisted browse state — same "session-only UI convenience, not data worth
  // surviving a reload" trade Project Builder's own sub-views already make. The actual
  // consequential data (which opportunities got selected) still lives in
  // state.selectedOpportunityIds either way. An empty browseTrackFilter means "no filter
  // applied" (show every track), not "show nothing".
  const [viewMode, setViewMode] = useState('recommended'); // 'recommended' | 'browse' | 'mySchool'
  const [browseTrackFilter, setBrowseTrackFilter] = useState([]);

  const browseOpportunities = getOpportunityPool(
    browseTrackFilter.length ? browseTrackFilter : OPPORTUNITY_TRACKS,
    state.educationLevel,
  );
  const opportunities = viewMode === 'recommended' ? recommendedOpportunities
    : viewMode === 'mySchool' ? mySchoolOpportunities
      : browseOpportunities;

  const toggleOpportunity = (id) => {
    const has = state.selectedOpportunityIds.includes(id);
    patch({
      selectedOpportunityIds: has
        ? state.selectedOpportunityIds.filter((o) => o !== id)
        : [...state.selectedOpportunityIds, id],
    });
  };

  const toggleTrackFilter = (track) => {
    setBrowseTrackFilter((prev) => (prev.includes(track)
      ? prev.filter((t) => t !== track)
      : [...prev, track]));
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => patch({ screen: 'programSummary' })}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={7} total={9} />
      <h1 className="page-title">Opportunity Finder</h1>
      <p className="page-sub">
        Real programs and competitions worth pursuing alongside your coursework. Select any that
        interest you — they'll be scheduled right into your Academic Plan.
      </p>

      <div className="field-block">
        <div className="pill-group">
          <button
            type="button"
            className={`pill${viewMode === 'recommended' ? ' selected' : ''}`}
            onClick={() => setViewMode('recommended')}
          >
            Recommended for you
          </button>
          <button
            type="button"
            className={`pill${viewMode === 'browse' ? ' selected' : ''}`}
            onClick={() => setViewMode('browse')}
          >
            Browse all opportunities
          </button>
          {showMySchoolTab && (
            <button
              type="button"
              className={`pill${viewMode === 'mySchool' ? ' selected' : ''}`}
              onClick={() => setViewMode('mySchool')}
            >
              My School
            </button>
          )}
        </div>
      </div>

      {viewMode === 'mySchool' && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          Real clubs from {state.currentSchool}'s own club list — independently verified, not
          generic national copy. Some (like DECA, Key Club, or Science Olympiad) match a national
          program you'd see elsewhere in this app; those are enriched with Roslyn's real details
          rather than shown twice.
        </p>
      )}

      {viewMode === 'browse' && (
        <div className="field-block">
          <div className="field-label">Filter by interest</div>
          <p className="field-hint">Leave everything unchecked to see opportunities from every track.</p>
          <div className="pill-group">
            {OPPORTUNITY_TRACKS.map((track) => (
              <button
                type="button"
                key={track}
                className={`pill${browseTrackFilter.includes(track) ? ' selected' : ''}`}
                onClick={() => toggleTrackFilter(track)}
              >
                {TRACK_LABELS[track]}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'recommended' && isGeneric && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          More opportunities for this interest are coming soon — here are a few broadly useful
          ones in the meantime.
        </p>
      )}

      <div className="grid grid-2">
        {opportunities.map((opp) => {
          const selected = state.selectedOpportunityIds.includes(opp.id);
          const deadline = anchorDate(opp.date, today);
          const passed = deadline < today;
          return (
            <button
              type="button"
              key={opp.id}
              className={`card${selected ? ' selected' : ''}${passed ? ' passed' : ''}`}
              disabled={passed}
              onClick={() => toggleOpportunity(opp.id)}
            >
              {opp.schoolVerified && (
                <div className="school-verified-badge">
                  <BadgeCheck size={12} /> Verified — {opp.schoolName}
                </div>
              )}
              <div className="card-title">{opp.name}</div>
              <p className="card-desc" style={{ fontStyle: 'italic', marginBottom: 8 }}>{opp.type}</p>
              <p className="card-desc">{opp.description}</p>
              <div className="card-meta">
                <div>
                  <span className="label">Deadline / start</span>
                  <strong>{passed ? 'Deadline passed' : formatDate(deadline)}</strong>
                </div>
                <div>
                  <span className="label">How to apply</span>
                  <strong>{opp.howToApply}</strong>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'projectBuilder' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
