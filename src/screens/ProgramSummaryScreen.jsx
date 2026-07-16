import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMergedPrograms, reachMatchSafetyTag, gpaBenchmarkText } from '../data/programs';
import { MAJORS } from '../data/majors';
import StepProgress from '../components/StepProgress';
import MascotWidget from '../components/MascotWidget';
import { useMascotIntroOnce } from '../hooks/useMascotSeen';

// Reach/Match/Safety Summary — sits right after Course Selection (High School) / right after
// Discovery (Undergraduate/Transfer, who skip Course Selection entirely) and before Opportunity
// Finder, for every education level. Deliberately does NOT compute anything new: every program's
// tag comes from the exact same `reachMatchSafetyTag(gpa, program.gpaValue)` call
// ProgramsStep.jsx's own ProgramCard already uses — this screen just re-runs that same pure
// function over the student's full selected-program list and groups the results into one
// consolidated view. No acceptance rate, extracurricular strength, or other invented "factor" —
// this app doesn't collect that data, and building a fancier-sounding formula around data that
// doesn't exist would be less honest than the plain GPA-vs-benchmark comparison already in use
// everywhere else.
const GROUP_ORDER = ['Reach', 'Match', 'Safety'];
const GROUP_COPY = {
  Reach: 'Your GPA is meaningfully below the typical benchmark here — competitive, but worth keeping on the list.',
  Match: "Your GPA lines up well with this program's typical benchmark.",
  Safety: 'Your GPA is comfortably above the typical benchmark here.',
};

function SummaryProgramCard({ p, tag }) {
  return (
    <div className="card">
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
      <div className="card-meta">
        <div>
          <span className="label">Selectivity</span>
          <strong>{p.selectivity}</strong>
        </div>
        <div>
          <span className="label">Typical GPA</span>
          <strong>{gpaBenchmarkText(p)}</strong>
        </div>
        {p.majorIds && p.majorIds.length > 1 && (
          <div>
            <span className="label">Fits your selected majors</span>
            <strong>{p.majorIds.map((id) => MAJORS[id].name).join(', ')}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgramSummaryScreen() {
  const { state, patch } = useApp();

  const mergedPrograms = getMergedPrograms(state.selectedMajorIds, state.educationLevel);
  const selectedPrograms = mergedPrograms.filter((p) => state.selectedProgramKeys.includes(p.key));

  const groups = { Reach: [], Match: [], Safety: [] };
  const uncategorized = [];
  selectedPrograms.forEach((p) => {
    const tag = reachMatchSafetyTag(state.gpa, p.gpaValue);
    if (tag) groups[tag].push(p);
    else uncategorized.push(p);
  });

  // Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — no revisit line was written for this
  // screen (nothing new to say on a later visit that the summary itself doesn't already show), so
  // this stays a plain intro-once-then-quiet. Which of the two real intro variants applies
  // depends on whether any programs are currently selected — same
  // mutually-exclusive-by-current-state pattern TranscriptScreen's own intro/empty split uses.
  const mascotIntroKey = selectedPrograms.length === 0 ? 'programSummary-empty' : 'programSummary-intro';
  const mascotText = useMascotIntroOnce(mascotIntroKey);

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'hub' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={5} total={8} />
      <h1 className="page-title">Your Reach, Match &amp; Safety List</h1>
      <p className="page-sub">
        Every program you selected in Discovery, grouped by how your current GPA compares to its
        typical benchmark — the same comparison used throughout your plan, pulled into one view.
      </p>

      {selectedPrograms.length === 0 ? (
        <p className="field-hint">
          You haven't selected any programs yet — head back to Discovery to pick some, or continue on.
        </p>
      ) : (
        <>
          <div className="rms-summary-line">
            You have {groups.Reach.length} Reach, {groups.Match.length} Match, and {groups.Safety.length} Safety
            schools selected{uncategorized.length > 0 ? ` (plus ${uncategorized.length} not yet categorized — see below)` : ''}.
          </div>

          {GROUP_ORDER.map((tag) => groups[tag].length > 0 && (
            <div className="field-block" key={tag}>
              <div className="field-label">{tag} ({groups[tag].length})</div>
              <p className="field-hint">{GROUP_COPY[tag]}</p>
              <div className="grid grid-3">
                {groups[tag].map((p) => <SummaryProgramCard key={p.key} p={p} tag={tag} />)}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div className="field-block">
              <div className="field-label">Not Yet Categorized ({uncategorized.length})</div>
              <p className="field-hint">
                Either there's no GPA on file yet, or these specific programs are portfolio/audition-based
                (GPA secondary) — see each card's own benchmark line for which applies.
              </p>
              <div className="grid grid-3">
                {uncategorized.map((p) => <SummaryProgramCard key={p.key} p={p} tag={null} />)}
              </div>
            </div>
          )}
        </>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'hub' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
