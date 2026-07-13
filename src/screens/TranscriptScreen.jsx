import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getBuiltTracks } from '../data/interests';
import { getCourseById } from '../data/courses';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import { calculateUnweightedGpa, calculateWeightedGpa, calculate4ScaleGpa } from '../utils/gpa';
import StepProgress from '../components/StepProgress';
import CourseSearchField from '../components/CourseSearchField';

const YEAR_OPTIONS = [8, 9, 10, 11, 12];
const WEIGHT_LABELS = { ap: 'AP', research_honors: 'Research Honors', honors: 'Honors', standard: 'Standard' };

// Course Selection Stage 2 — real transcript entry, replacing both the Stage 1 placeholder here
// AND (functionally) the original Survey GPA text box: state.gpa is now calculated from this
// screen's entries instead of self-reported. Back mirrors the same built-track skip
// AdmissionsOverviewScreen/DiscoveryScreen already use (see architecture note in CLAUDE.md) —
// unchanged from the Stage 1 placeholder.
export default function TranscriptScreen() {
  const { state, patch } = useApp();
  const hasBuiltTrack = getBuiltTracks(state.interestTags).length > 0;
  const isHighSchool = state.educationLevel === 'highschool';
  // UC Davis partner-school addition, Stage 1 (see CLAUDE.md) — an Undergraduate/Transfer
  // student who selected UC Davis as their current school also gets this screen, same flow
  // position as Roslyn High School. This is placeholder-only for now (no real UC Davis
  // transcript/GPA content yet — that's a later stage, and will need to account for UC Davis's
  // quarter system rather than semesters); everyone else is completely unaffected.
  const isCollegeAtUCDavis = (state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer')
    && state.currentSchool === 'UC Davis';
  const hasCourseFlow = isHighSchool || isCollegeAtUCDavis;

  // Course Selection Stage 4's "revisit" checkpoint (Part 1) reuses this exact screen rather than
  // rebuilding the transcript-entry mechanism — set by Roadmap.jsx right before navigating here.
  // Everything below (course search, grade entry, GPA calculation) is identical either way; only
  // the header copy and where Continue/Back go change. Checkpoints are High-School-only (Course
  // Selection Stage 4 hasn't been built for UC Davis yet), so this is always null for a college
  // student regardless.
  const checkpoint = state.activeCourseCheckpoint?.part === 'transcript' ? state.activeCourseCheckpoint : null;

  // Defensive: this screen only applies to High School or a UC-Davis-selecting Undergraduate/
  // Transfer student — routing already never sends anyone else here, but if state ever ends up
  // here anyway (e.g. restored mid-flow after educationLevel/currentSchool changed), bounce
  // forward instead of rendering a screen that shouldn't apply to them, same pattern
  // DiscoveryScreen's own defensive bounce uses.
  useEffect(() => {
    if (!hasCourseFlow) patch({ screen: 'programSummary' });
  }, [hasCourseFlow]);

  if (!hasCourseFlow) return null;

  if (!isHighSchool) {
    return (
      <CollegeTranscriptPlaceholder
        onBack={() => patch({ screen: hasBuiltTrack ? 'discovery' : 'admissions' })}
        onContinue={() => patch({ screen: 'courseSelection' })}
      />
    );
  }

  // The "add a course" form is a few fields staged locally before becoming one real
  // state.transcript entry — same "build up an entry, then commit it" shape AddTaskModal already
  // uses elsewhere in this app, just inline rather than in a modal.
  const [pendingCourse, setPendingCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [yearTaken, setYearTaken] = useState(null);

  const transcript = state.transcript || [];

  const unweightedGpa = useMemo(() => calculateUnweightedGpa(transcript), [transcript]);
  const weightedGpa = useMemo(() => calculateWeightedGpa(transcript), [transcript]);
  const gpa4Scale = useMemo(() => calculate4ScaleGpa(transcript), [transcript]);

  const grade = Number(gradeInput);
  const canAdd = !!pendingCourse && gradeInput !== '' && grade >= 0 && grade <= 100 && !!yearTaken;

  const addEntry = () => {
    if (!canAdd) return;
    patch({
      transcript: [
        ...transcript,
        { id: makeTaskId('transcript'), courseId: pendingCourse.id, gradeEarned: grade, yearTaken },
      ],
    });
    setPendingCourse(null);
    setGradeInput('');
    setYearTaken(null);
  };

  const removeEntry = (id) => {
    patch({ transcript: transcript.filter((e) => e.id !== id) });
  };

  // Continue and Skip do the exact same thing — advance, saving whatever GPA the current
  // transcript (even an empty one) produces. Skip is just a separate, more prominent affordance
  // for an incoming freshman with genuinely nothing to enter yet (Task 2's "fully supported path,
  // not a workaround"), not a functionally different action from Continue with zero entries.
  //
  // In checkpoint mode, advancing also flips this checkpoint's own part1Done flag and returns to
  // the roadmap instead of continuing the onboarding flow — the refreshed GPA is written to the
  // exact same state.gpa field either way, so every existing GPA-aware consumer (ProgramsStep's
  // curated program list, reachMatchSafetyTag's Reach/Match/Safety badges) picks it up
  // automatically, with zero changes needed anywhere else.
  const advance = () => {
    const newGpa = gpa4Scale != null ? String(gpa4Scale) : '';
    if (checkpoint) {
      const { stageName } = checkpoint;
      patch({
        gpa: newGpa,
        courseCheckpoints: {
          ...state.courseCheckpoints,
          [stageName]: { ...state.courseCheckpoints[stageName], part1Done: true },
        },
        activeCourseCheckpoint: null,
        screen: 'plan',
      });
      return;
    }
    patch({ gpa: newGpa, screen: 'courseSelection' });
  };

  const goBack = () => {
    if (checkpoint) {
      patch({ activeCourseCheckpoint: null, screen: 'plan' });
      return;
    }
    patch({ screen: hasBuiltTrack ? 'discovery' : 'admissions' });
  };

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={goBack}>
        <ArrowLeft size={14} /> Back
      </button>

      {!checkpoint && <StepProgress step={4} total={9} />}
      <h1 className="page-title">{checkpoint ? 'Update Your Transcript' : 'Transcript & GPA'}</h1>
      <p className="page-sub">
        {checkpoint
          ? "Add the courses you've just completed — this refreshes your GPA everywhere it's used, including your program Reach/Match/Safety tags."
          : "Search for the real courses you've taken, enter your grade and the year you took each one — we'll calculate your GPA from it automatically."}
      </p>

      {transcript.length === 0 && (
        <div className="transcript-skip-row">
          <p>Haven't taken any high school courses yet? That's completely fine.</p>
          <button type="button" className="btn btn-outline" onClick={advance}>
            Skip — I haven't taken any high school courses yet
          </button>
        </div>
      )}

      <div className="transcript-form">
        <div className="transcript-form-field" style={{ flex: '1 1 260px' }}>
          <span className="label">Course</span>
          {pendingCourse ? (
            <div className="transcript-selected-course">
              {pendingCourse.name}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: 8, padding: '2px 8px' }}
                onClick={() => setPendingCourse(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <CourseSearchField onSelect={setPendingCourse} />
          )}
        </div>

        <div className="transcript-form-field">
          <span className="label">Grade Earned</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="0-100"
            className="transcript-grade-input"
            value={gradeInput}
            onChange={(e) => setGradeInput(e.target.value)}
          />
        </div>

        <div className="transcript-form-field">
          <span className="label">Year Taken</span>
          <div className="pill-group">
            {YEAR_OPTIONS.map((y) => (
              <button
                type="button"
                key={y}
                className={`pill${yearTaken === y ? ' selected' : ''}`}
                onClick={() => setYearTaken(y)}
              >
                {y === 8 ? '8th' : `${y}th`}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-primary" disabled={!canAdd} onClick={addEntry}>
          Add Course
        </button>
      </div>

      {transcript.length > 0 && (
        <>
          <table className="transcript-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Grade</th>
                <th>Year</th>
                <th>Weight</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transcript.map((entry) => {
                const course = getCourseById(entry.courseId);
                return (
                  <tr key={entry.id}>
                    <td>{course ? course.name : entry.courseId}</td>
                    <td>{entry.gradeEarned}</td>
                    <td>{entry.yearTaken === 8 ? '8th' : `${entry.yearTaken}th`}</td>
                    <td>{course ? WEIGHT_LABELS[course.weightCategory] : '—'}</td>
                    <td>
                      <button type="button" className="remove-btn" onClick={() => removeEntry(entry.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="gpa-summary">
            <div className="gpa-summary-box">
              <div className="gpa-summary-value">{unweightedGpa != null ? unweightedGpa.toFixed(2) : '—'}</div>
              <div className="gpa-summary-label">Unweighted GPA</div>
            </div>
            <div className="gpa-summary-box">
              <div className="gpa-summary-value">{weightedGpa != null ? weightedGpa.toFixed(2) : '—'}</div>
              <div className="gpa-summary-label">Weighted GPA</div>
            </div>
            <div className="gpa-summary-box">
              <div className="gpa-summary-value">{gpa4Scale != null ? gpa4Scale.toFixed(2) : '—'}</div>
              <div className="gpa-summary-label">4.0-Scale Equivalent</div>
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: -12, marginBottom: 18 }}>
            The 4.0-scale equivalent (converted from your unweighted GPA) is what's used for program
            matching and Reach/Match/Safety recommendations later in your plan.
          </p>
        </>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={advance}>
          {checkpoint ? 'Save & Continue to Part 2' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

// UC Davis partner-school addition, Stage 1 (see CLAUDE.md) — confirms the flow/navigation order
// only; real UC Davis transcript/GPA entry (and its quarter-system-aware dates) is a later stage.
// state.gpa is deliberately left untouched here, same as it already was for any Undergraduate/
// Transfer student before this addition (no GPA entry point exists for them yet either way).
function CollegeTranscriptPlaceholder({ onBack, onContinue }) {
  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={4} total={9} />
      <h1 className="page-title">Transcript &amp; GPA</h1>
      <p className="page-sub">
        Coming soon — this is where you'll enter your UC Davis coursework and GPA.
      </p>

      <div className="field-block">
        <p className="field-hint">
          We're still building out UC Davis's real transcript and GPA experience. For now, this
          screen just confirms your plan flows through the right steps in the right order.
        </p>
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
