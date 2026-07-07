import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBuiltTracks, getOpportunityTracks } from '../data/interests';
import { getOpportunityPool } from '../data/opportunities';

export default function OpportunityFinderScreen() {
  const { state, patch } = useApp();
  const builtTracks = getBuiltTracks(state.interestTags);
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const isGeneric = opportunityTracks.length === 0;
  const opportunities = getOpportunityPool(opportunityTracks, state.educationLevel);

  const toggleOpportunity = (id) => {
    const has = state.selectedOpportunityIds.includes(id);
    patch({
      selectedOpportunityIds: has
        ? state.selectedOpportunityIds.filter((o) => o !== id)
        : [...state.selectedOpportunityIds, id],
    });
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

      <div className="eyebrow">Step 4 of 5</div>
      <h1 className="page-title">Opportunity Finder</h1>
      <p className="page-sub">
        Real programs and competitions worth pursuing alongside your coursework. Select any that
        interest you — they'll be scheduled right into your Academic Plan.
      </p>

      {isGeneric && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          More opportunities for this interest are coming soon — here are a few broadly useful
          ones in the meantime.
        </p>
      )}

      <div className="grid grid-2">
        {opportunities.map((opp) => {
          const selected = state.selectedOpportunityIds.includes(opp.id);
          return (
            <button
              type="button"
              key={opp.id}
              className={`card${selected ? ' selected' : ''}`}
              onClick={() => toggleOpportunity(opp.id)}
            >
              <div className="card-title">{opp.name}</div>
              <p className="card-desc" style={{ fontStyle: 'italic', marginBottom: 8 }}>{opp.type}</p>
              <p className="card-desc">{opp.description}</p>
              <div className="card-meta">
                <div>
                  <span className="label">Deadline / start</span>
                  <strong>{opp.deadline}</strong>
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
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'plan' })}>
          Build my Academic Plan
        </button>
      </div>
    </div>
  );
}
