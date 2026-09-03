import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BadgeCheck, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOpportunityTracks, OPPORTUNITY_TRACKS, TRACK_LABELS } from '../data/interests';
import { getOpportunityPool, getSchoolOpportunities, findOpportunity } from '../data/opportunities';
import { anchorDate, formatDate, getEffectiveToday } from '../utils/dates';
import { getThematicOpportunityMatches } from '../utils/thematicMatch';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import ModuleReviewWidget from '../components/ModuleReviewWidget';
import SelectedItemsPanel from '../components/SelectedItemsPanel';
import { useModalExit } from '../hooks/useModalExit';
import { useMascotIntroThenRevisit } from '../hooks/useMascotSeen';
import { useModuleReview } from '../hooks/useModuleReview';
import { TrackIcon, getTrackColor } from '../components/TrackVisuals';

// Bring Selection List, Auto-Pick, Delete-All, and Descriptions to Opportunity Finder (see
// CLAUDE.md), Task 2 — a deliberately SMALL, focused cap, not Course Selection's own per-grade
// course-load numbers (a "how many classes fit in a school year" constraint has no honest analog
// here at all). Grounded directly in this app's own real "spike" research (see
// admissionsPresentation.js's own Extracurriculars & the Spike module: "Selective schools favor
// real depth in one or two areas over a long, shallow list") — 3 is a direct, deliberate
// translation of "one or two focused areas" into a real opportunity count, allowing slightly more
// than a literal 1-2 since a single real "spike" area often naturally includes more than one
// activity (e.g. a competition club plus a related summer program, both genuinely part of the same
// focused direction) — never a number meant to accommodate "everything remotely related."
export const OPPORTUNITY_AUTO_PICK_CAP = 3;

// Task 2.1/2.3/2.4 — the one shared eligibility gate every auto-pick candidate (from either tier,
// below) has to clear: not already selected, not already picked earlier in this same run, not
// already past its own real deadline (Task 2.3 — the exact same `anchorDate`/`today` comparison
// this screen's own card grid already uses for its "Deadline passed" badge, reused here rather
// than a second date check), and — Task 2.4's own "obvious date conflict... where that's
// determinable from real data" — never landing on the EXACT same real calendar day as an
// already-picked opportunity. This is the one genuinely determinable conflict signal opportunity
// data actually supports (there's no time-of-day/duration field the way a Daily Schedule block
// has); it's deliberately narrower than perfect scheduling awareness, since inventing a stricter
// rule with no real data behind it would be exactly the kind of guess this app's own "don't guess"
// posture forbids elsewhere.
export function isOpportunityAutoPickCandidate(opp, today, currentSelectedIds, picked) {
  if (currentSelectedIds.includes(opp.id) || picked.has(opp.id)) return false;
  const deadline = anchorDate(opp.date, today);
  if (deadline < today) return false;
  const conflict = [...picked.values()].some((p) => (
    anchorDate(p.date, today).getTime() === deadline.getTime()
  ));
  return !conflict;
}

// Task 2 as a whole — two ordered tiers, stopping the instant the real remaining cap room
// (`cap - currentSelectedIds.length`) is used up, mirroring the exact "required tier first, then
// electives only for whatever room is left" priority-order shape Course Selection's own Auto-Pick
// already established (see CLAUDE.md's "Fix Auto-Pick with Real Constraints" section) — here
// applied to "narrative alignment" instead of "graduation requirements," since opportunities have
// no requirement concept at all.
//
// Tier 1 — real, AI-confirmed narrative-theme alignment (`state.narrativeThemes`, populated only
// once a narrative overview has actually been confirmed — see AI-First Onboarding, Stage 3), the
// single most direct, most specific "established direction" signal this app has. Searched across
// the FULL cross-track pool (every real track, the same one "Browse all opportunities" already
// shows) — not narrowed to the student's own interest-tag-derived Recommended pool — because a
// narrative theme can honestly surface something the original Survey tags never captured, the
// same "widen to every track, don't trust a narrower pool" precedent this app's own
// roadmapGenerator.js/My-School-opportunity-selection bugs already established (see CLAUDE.md).
//
// Tier 2 — only for whatever cap room Tier 1 didn't use: whatever this screen's own "Recommended
// for you" view already resolves to for this student — normally the interest-tag/track-based
// pool, or, for a student whose only tags map to no real built track at all (e.g. "Law"), the
// same small, already-curated generic fallback list "Recommended for you" itself falls back to in
// that one case (per this screen's own pre-existing `isGeneric` framing — a handful of "broadly
// useful" entries, never the FULL generic catalog). Reusing whatever "Recommended for you" already
// resolves to — rather than a second, independently-scoped pool — is what satisfies Task 1's own
// "not grab everything remotely related" requirement either way: a student with a very broad
// Recommended pool still only gets picked from up to the cap, in priority order, never the whole
// pool at once.
// Named-exported (alongside `OPPORTUNITY_AUTO_PICK_CAP`/`isOpportunityAutoPickCandidate` above) —
// the default export stays a plain React component either way, so this is a purely additive
// surface — specifically so Task 2.4's own date-conflict rule can be verified directly against
// this REAL, shipped function via a Node-level test (the same `ssrLoadModule` technique this
// codebase's own `scripts/verify-spacing.mjs` already established for `roadmapLayout.js`), since
// this app's own real opportunity dates are deliberately well-spread enough (confirmed directly:
// a full-catalog scan found zero naturally-occurring same-day collisions within any single track's
// real recommended pool) that end-to-end UI testing alone can't exercise this specific rule against
// real data — a synthetic collision is needed to prove the mechanism, not because the rule is
// otherwise unverifiable.
export function computeAutoPickedOpportunityIds({
  narrativeThemes, allOpportunities, recommendedOpportunities, today, currentSelectedIds,
}) {
  const remainingSlots = Math.max(0, OPPORTUNITY_AUTO_PICK_CAP - currentSelectedIds.length);
  const picked = new Map();
  if (remainingSlots === 0) return [];

  const themeMatches = getThematicOpportunityMatches(narrativeThemes, allOpportunities);
  for (const opp of themeMatches) {
    if (picked.size >= remainingSlots) break;
    if (!isOpportunityAutoPickCandidate(opp, today, currentSelectedIds, picked)) continue;
    picked.set(opp.id, opp);
  }

  if (picked.size < remainingSlots) {
    for (const opp of recommendedOpportunities) {
      if (picked.size >= remainingSlots) break;
      if (!isOpportunityAutoPickCandidate(opp, today, currentSelectedIds, picked)) continue;
      picked.set(opp.id, opp);
    }
  }

  return [...picked.keys()];
}

export default function OpportunityFinderScreen() {
  const { state, patch } = useApp();
  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const isGeneric = opportunityTracks.length === 0;
  const recommendedOpportunities = getOpportunityPool(opportunityTracks, state.educationLevel);
  // The full, cross-track pool — independent of whatever local Browse filter happens to be active
  // — is what Task 2's own Tier 1 (real narrative-theme matching) searches across; it's the exact
  // same pool "Browse all opportunities" shows with no filter applied.
  const allOpportunities = getOpportunityPool(OPPORTUNITY_TRACKS, state.educationLevel);
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
  const [autoPickMessage, setAutoPickMessage] = useState(null);

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

  // Bring Selection List, Auto-Pick, Delete-All, and Descriptions to Opportunity Finder (see
  // CLAUDE.md), Task 1 — resolved via `findOpportunity(id, OPPORTUNITY_TRACKS, level)`, widened to
  // EVERY real track (not just `opportunityTracks`, the student's own narrower interest-derived
  // set) so a selection made from Browse or My School — genuinely outside the student's own
  // interest tags — still resolves correctly here instead of silently vanishing from the panel,
  // the same widening this exact function's own header comment documents fixing for
  // roadmapGenerator.js once before.
  const selectedOpportunities = state.selectedOpportunityIds
    .map((id) => findOpportunity(id, OPPORTUNITY_TRACKS, state.educationLevel))
    .filter(Boolean);

  const handleAutoPick = () => {
    const newIds = computeAutoPickedOpportunityIds({
      narrativeThemes: state.narrativeThemes,
      allOpportunities,
      recommendedOpportunities,
      today,
      currentSelectedIds: state.selectedOpportunityIds,
    });
    const merged = [...new Set([...state.selectedOpportunityIds, ...newIds])];
    const addedCount = merged.length - state.selectedOpportunityIds.length;
    patch({ selectedOpportunityIds: merged });
    const capNote = merged.length >= OPPORTUNITY_AUTO_PICK_CAP
      ? ' Your list is now at a small, focused set — remove something first if you want room for anything else.'
      : '';
    const narrativeNote = (state.narrativeThemes || []).length > 0
      ? 'closely aligned with the direction from your first conversation'
      : 'aligned with your stated interests';
    setAutoPickMessage(addedCount > 0
      ? `Added ${addedCount} opportunit${addedCount === 1 ? 'y' : 'ies'} ${narrativeNote}, favoring real depth over a scattered list, and skipping anything already past its deadline.${capNote}`
      : 'Your current selections already cover everything this can honestly suggest right now (or you\'re already at a small, focused set).');
  };

  // Task 3 — the same real, window.confirm-gated clearing action Course Selection's own
  // `clearAllCourses` already established, via `SelectedItemsPanel`'s own shared `onClearAll`.
  const clearAllOpportunities = () => {
    patch({ selectedOpportunityIds: [] });
  };

  // Task 4 — a small detail modal reusing the EXACT fields Opportunity Finder's own main browsing
  // card already shows in full (name/type/description/deadline/how-to-apply/website) — unlike
  // Course Selection's own cards, this screen's cards never truncate their description at all, so
  // there's no separate "expanded" view to build beyond this one: the card body already IS the
  // real detail display, this just makes that same content reachable from a compact list row too.
  const [selectedOpportunityDetail, setSelectedOpportunityDetail] = useState(null);
  const { rendered: detailRendered, closing: detailClosing } = useModalExit(!!selectedOpportunityDetail);
  const lastDetailRef = useRef(null);
  if (selectedOpportunityDetail) lastDetailRef.current = selectedOpportunityDetail;
  const modalOpp = selectedOpportunityDetail || lastDetailRef.current;
  const modalDeadline = modalOpp ? anchorDate(modalOpp.date, today) : null;
  const modalPassed = modalDeadline ? modalDeadline < today : false;

  // AI-First Onboarding, Stage 1 (see CLAUDE.md) — the one-time "have you already done anything
  // like this?" prior-experience prompt that used to gate entry to this screen is gone; that
  // gathering will be absorbed into Stage 2's AI conversation instead. `state.priorExperiences`
  // itself, and the Profile screen's own always-available editor for it, are untouched — only
  // this screen's own one-time gate for collecting it is removed.
  const mascotText = useMascotIntroThenRevisit('opportunities-intro', 'opportunities-revisit');

  // Reactive Conversation Layer for Tutorial Modules (see CLAUDE.md) — 'opportunities' matches
  // api/onboarding-chat.js's own MODULE_LABELS key; 'opportunities-intro' is the exact scripted
  // line MascotWidget already shows above (Task 5), reused verbatim as the opening line.
  const moduleReview = useModuleReview('opportunities', 'opportunities-intro', () => patch({ screen: 'hub' }));

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
        Real programs and competitions worth pursuing alongside your coursework. Select any
        that interest you — they'll be scheduled right into your Academic Plan.
      </p>

      <div className="auto-pick-row">
        <button type="button" className="btn btn-outline" onClick={handleAutoPick}>
          <ShoppingBag size={14} /> Auto-pick for me
        </button>
        {autoPickMessage && <p className="auto-pick-confirm">{autoPickMessage}</p>}
      </div>

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
          // Task 1's own "color-code opportunity cards by interest/type, using the
          // established color mapping" — `_track` (opportunities.js, tagged at merge/collect
          // time) resolves to the exact same color Survey/Discovery/Course Selection already
          // use for that same track. Opportunities with no real track (the generic fallback
          // list, or an unmapped "My School" affinity club) simply render no icon and fall
          // back to a neutral card, same "don't force a fit" posture this codebase's data
          // layer already holds elsewhere.
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

      {/* Task 1 — the same always-visible, position:fixed "shopping list" panel Course Selection's
          own SelectedItemsPanel already established, shared verbatim (see that component's own
          header comment for why it was generalized) rather than a second, near-identical
          implementation. Task 2/3 — `onClearAll`/`onOpenDetail` wire the panel's own real "Clear
          all" confirmation and click-to-view-description straight into this screen's own real
          state/detail-modal, the same wiring shape Course Selection's own two variants already
          use. */}
      <SelectedItemsPanel
        items={selectedOpportunities}
        onRemove={toggleOpportunity}
        onClearAll={clearAllOpportunities}
        onOpenDetail={setSelectedOpportunityDetail}
        itemLabel="Opportunities"
        confirmMessage="Are you sure you want to remove all selected opportunities?"
      />

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={moduleReview.beginReview}>
          Continue
        </button>
      </div>

      <ModuleReviewWidget review={moduleReview} label="Opportunity Finder" />

      {/* Task 4 — rendered via createPortal to document.body, same reason every other modal on a
          `.screen-transition`-wrapped screen in this app already needs it (see SelectedItemsPanel's
          own header comment, or Course Selection's identical detail modal, for the full landmine
          this works around). Reuses the exact same fields/classes the main grid's own card already
          renders (`.card-meta`, `.school-verified-badge`, `TrackIcon`) rather than a second,
          differently-shaped detail layout — this genuinely IS the same detail display, just
          reachable from a compact list row instead of the full card. */}
      {detailRendered && modalOpp && createPortal(
        <div
          className={`overlay${detailClosing ? ' overlay-exit' : ''}`}
          onClick={() => setSelectedOpportunityDetail(null)}
        >
          <div className={`modal${detailClosing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOpportunityDetail(null)}>
              <X size={18} />
            </button>
            {modalOpp.schoolVerified && (
              <div className="school-verified-badge" style={{ marginBottom: 10 }}>
                <BadgeCheck size={12} /> Verified — {modalOpp.schoolName}
              </div>
            )}
            <div className="modal-eyebrow" style={{ color: modalOpp._track ? getTrackColor(modalOpp._track) : 'var(--bloom-accent)' }}>
              {modalOpp.type}
            </div>
            <h2 className="modal-title">{modalOpp.name}</h2>
            <p className="modal-desc">{modalOpp.description}</p>
            <div className="card-meta" style={{ marginBottom: 0 }}>
              <div>
                <span className="label">Deadline / start</span>
                <strong>{modalPassed ? 'Deadline passed' : formatDate(modalDeadline)}</strong>
              </div>
              <div>
                <span className="label">How to apply</span>
                <strong>{modalOpp.howToApply}</strong>
              </div>
              {modalOpp.website && (
                <div>
                  <span className="label">Website</span>
                  <strong>{modalOpp.website.replace(/^https?:\/\//, '')}</strong>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
