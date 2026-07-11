import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks, getOpportunityTracks, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getOpportunityPool } from '../data/opportunities';
import { anchorDate, formatDate, startOfToday } from '../utils/dates';
import StepProgress from '../components/StepProgress';

export default function OpportunityFinderScreen() {
  const { state, patch } = useApp();
  const builtTracks = getBuiltTracks(state.interestTags);
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const isGeneric = opportunityTracks.length === 0;
  const recommendedOpportunities = getOpportunityPool(opportunityTracks, state.educationLevel);
  const today = startOfToday();

  // Local, unpersisted browse state — same "session-only UI convenience, not data worth
  // surviving a reload" trade Project Builder's own sub-views already make. The actual
  // consequential data (which opportunities got selected) still lives in
  // state.selectedOpportunityIds either way. An empty browseTrackFilter means "no filter
  // applied" (show every track), not "show nothing".
  const [viewMode, setViewMode] = useState('recommended'); // 'recommended' | 'browse'
  const [browseTrackFilter, setBrowseTrackFilter] = useState([]);

  const browseOpportunities = getOpportunityPool(
    browseTrackFilter.length ? browseTrackFilter : OPPORTUNITY_TRACKS,
    state.educationLevel,
  );
  const opportunities = viewMode === 'recommended' ? recommendedOpportunities : browseOpportunities;

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
        onClick={() => patch({ screen: builtTracks.length ? 'discovery' : 'admissions' })}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={4} total={6} />
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
        </div>
      </div>

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
