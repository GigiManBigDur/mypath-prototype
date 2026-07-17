import { useState } from 'react';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOpportunityTracks, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getOpportunityPool, getSchoolOpportunities } from '../data/opportunities';
import { anchorDate, formatDate, getEffectiveToday } from '../utils/dates';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';
import { TrackIcon, getTrackColor } from '../components/TrackVisuals';

export default function OpportunityFinderScreen() {
  const { state, patch } = useApp();
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const isGeneric = opportunityTracks.length === 0;
  const recommendedOpportunities = getOpportunityPool(opportunityTracks, state.educationLevel);
  // Real-Time Tracking feature (see CLAUDE.md) — resolves the tester-set override when one is
  // active, so "deadline passed" reads consistently with the same "today" the roadmap itself uses.
  const today = getEffectiveToday(state.dateOverride);

  // "My School" — real, independently-fetched club data for the student's actual school, a third
  // lens alongside Recommended/Browse rather than a filter within them. Scoped to High School +
  // Roslyn, or Undergraduate/Transfer + UC Davis specifically (the only two real `currentSchool`
  // values right now — src/data/schools.js), same `isCollegeAtUCDavis` boundary every other
  // partner-school feature (Transcript & GPA, Course Selection) already uses, recomputed here per
  // this codebase's own per-file convention. Any other education-level/school combination never
  // sees this tab at all.
  const isHighSchool = state.educationLevel === 'highschool';
  const isCollegeAtUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';
  const showMySchoolTab = (isHighSchool && state.currentSchool === 'Roslyn High School') || isCollegeAtUCDavis;
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

  const mascotText = useMascotIntroThenRevisit('opportunities-intro', 'opportunities-revisit');

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => patch({ screen: 'hub' })}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={6} total={8} />
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
          {state.currentSchool === 'Roslyn High School'
            ? "Real clubs from Roslyn High School's own club list — independently verified, not "
              + 'generic national copy. Some (like DECA, Key Club, or Science Olympiad) match a '
              + "national program you'd see elsewhere in this app; those are enriched with "
              + "Roslyn's real details rather than shown twice."
            : "Real clubs from UC Davis's own AggieLife directory — independently verified, not "
              + 'generic national copy. This is a curated selection spanning UC Davis\'s major '
              + 'club categories, not the full 800+ group directory.'}
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
          // Task 1's own "color-code opportunity cards by interest/type, using the established
          // color mapping" — `_track` (opportunities.js, tagged at merge/collect time) resolves
          // to the exact same color Survey/Discovery/Course Selection already use for that same
          // track. Opportunities with no real track (the generic fallback list, or an unmapped
          // "My School" affinity club) simply render no icon and fall back to a neutral card,
          // same "don't force a fit" posture this codebase's data layer already holds elsewhere.
          const track = opp._track;
          return (
            <button
              type="button"
              key={opp.id}
              className={`card${selected ? ' selected' : ''}${passed ? ' passed' : ''}${opp.schoolVerified ? ' school-verified' : ''}`}
              disabled={passed}
              onClick={() => toggleOpportunity(opp.id)}
              style={track ? { '--track-accent': getTrackColor(track) } : undefined}
            >
              {opp.schoolVerified && (
                <div className="school-verified-badge">
                  <BadgeCheck size={12} /> Verified — {opp.schoolName}
                </div>
              )}
              {track && <TrackIcon track={track} />}
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
                {opp.website && (
                  <div>
                    <span className="label">Website</span>
                    <strong>{opp.website.replace(/^https?:\/\//, '')}</strong>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
