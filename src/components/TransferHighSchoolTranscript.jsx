import { useMemo, useState } from 'react';
import { Trash2, X, FlaskConical } from 'lucide-react';
import { getCourseById } from '../data/courses';
import { getDepartmentColor } from '../data/courseTrackMap';
import { SAMPLE_TRANSCRIPT } from '../data/sampleTranscript';
import { calculateUnweightedGpa, calculateWeightedGpa, calculate4ScaleGpa } from '../utils/gpa';
import { makeTaskId } from '../utils/ids';
import CourseSearchField from './CourseSearchField';
import GpaBox from './GpaBox';

// Add Testing-Only Prefill Buttons for Transcript & Experiences (see CLAUDE.md) — a few plausible
// free-text course names for the "Other" (non-Roslyn) high school path, which has no real catalog
// to sample real courses/grades from in the first place (see that path's own honest "we don't have
// detailed course catalog or grading data for this school yet" note below) — plain, representative
// high-school course names, not placeholder text, plus one plausible self-reported GPA matching the
// same 0-4.0 scale that field's own placeholder already models.
const SAMPLE_OTHER_HS_COURSES = ['AP English Language', 'Algebra II', 'Chemistry', 'U.S. History'];
const SAMPLE_OTHER_HS_GPA = '3.6';

const WEIGHT_LABELS = { ap: 'AP', research_honors: 'Research Honors', honors: 'Honors', standard: 'Standard' };
const YEAR_OPTIONS = [8, 9, 10, 11, 12];

// High School Selection + Transcript for Transfer Students (see CLAUDE.md), Task 2 — the shared
// section rendered on Transcript & GPA for a Transfer student, in ADDITION to (or, for a transfer
// student with no current-college data on file, INSTEAD of) the usual current-school transcript
// content. Reads `state.transferHighSchool` (set once on the Survey, Task 1) to decide which of
// two genuinely different data paths to render — mirroring, at a section level, the same
// "one real catalog-backed path, one honest simplified fallback" shape this app's UC Davis
// partner-school work already established for a school without real data behind it. Renders
// nothing at all if the student left that Survey question blank (an honest "skipped this optional
// info" outcome, not an error state).
export default function TransferHighSchoolTranscript({ state, patch }) {
  if (!state.transferHighSchool) return null;

  return (
    <div className="field-block" style={{ marginTop: 32 }}>
      <div className="field-label">High School Transcript</div>
      <p className="field-hint">
        Transfer admissions typically also considers your high school record, and it gives your
        plan richer context — this is separate from your current school's own transcript above.
      </p>
      {state.transferHighSchool === 'Roslyn High School'
        ? <RoslynHsTranscript state={state} patch={patch} />
        : <OtherHsTranscript state={state} patch={patch} />}
    </div>
  );
}

// Real path: the EXACT same course-search-and-grade-entry mechanism and weighted-GPA math
// TranscriptScreen.jsx's own Roslyn form already uses (same real catalog via CourseSearchField's
// own default `searchCourses`, same calculateUnweightedGpa/calculateWeightedGpa/calculate4ScaleGpa,
// same AP/Research Honors/Honors weight multipliers) — just scoped to the SEPARATE
// `state.transferHsTranscript` array instead of `state.transcript` (see AppContext.jsx's own
// comment for why this stays a distinct field despite the identical entry shape). Year options are
// the full 8th-12th range, unscoped to `state.schoolYear` (which for a Transfer student means their
// CURRENT COLLEGE year, not a high school grade) — a transfer student's high school record is
// already fully in the past by the time they're filling this out, unlike an actual current High
// School student's own in-progress transcript.
function RoslynHsTranscript({ state, patch }) {
  const [pendingCourse, setPendingCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [yearTaken, setYearTaken] = useState(null);

  const transcript = state.transferHsTranscript || [];
  const unweightedGpa = useMemo(() => calculateUnweightedGpa(transcript), [transcript]);
  const weightedGpa = useMemo(() => calculateWeightedGpa(transcript), [transcript]);
  const gpa4Scale = useMemo(() => calculate4ScaleGpa(transcript), [transcript]);

  const grade = Number(gradeInput);
  const canAdd = !!pendingCourse && gradeInput !== '' && grade >= 0 && grade <= 100 && !!yearTaken;

  const addEntry = () => {
    if (!canAdd) return;
    patch({
      transferHsTranscript: [
        ...transcript,
        { id: makeTaskId('transfer-hs-transcript'), courseId: pendingCourse.id, gradeEarned: grade, yearTaken },
      ],
    });
    setPendingCourse(null);
    setGradeInput('');
    setYearTaken(null);
  };

  const removeEntry = (id) => {
    patch({ transferHsTranscript: transcript.filter((e) => e.id !== id) });
  };

  // Add Testing-Only Prefill Buttons for Transcript & Experiences (see CLAUDE.md) — the exact same
  // real, weight-tier-spanning sample list TranscriptScreen.jsx's own onboarding "Fill Sample
  // Transcript" button already uses (see sampleTranscript.js's own header comment for why it's
  // shared rather than duplicated), written into this component's own separate
  // `transferHsTranscript` field. A single whole-array REPLACE, matching the same "reset to a known
  // sample" convention every other testing prefill in this app already follows.
  const fillSampleTranscript = () => {
    patch({
      transferHsTranscript: SAMPLE_TRANSCRIPT.map((entry) => ({ id: makeTaskId('transfer-hs-transcript'), ...entry })),
    });
  };

  return (
    <>
      <div className="testing-fill-row">
        <button type="button" className="testing-fill-btn" onClick={fillSampleTranscript}>
          <FlaskConical size={13} /> Fill Sample Transcript (Testing)
        </button>
      </div>

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
                const accent = course ? getDepartmentColor(course.department) : null;
                return (
                  <tr key={entry.id} style={accent ? { '--course-accent': accent } : undefined}>
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
            <GpaBox value={unweightedGpa} label="Unweighted GPA" />
            <GpaBox value={weightedGpa} label="Weighted GPA" />
            <GpaBox value={gpa4Scale} label="4.0-Scale Equivalent" />
          </div>
        </>
      )}
    </>
  );
}

// Honest fallback path: we don't have real course-catalog or grading-system data for any school
// beyond Roslyn, so — same "don't force a fit, don't invent data" posture this app's own data
// layer already holds everywhere else (e.g. programRecommendations.js's culinary-arts exclusion,
// schoolRequirements.js's honest-fallback entries) — this is a genuinely simpler form: free-text
// course NAMES only (no per-course grade, since there's no real weighting/grading-scale data to
// apply), plus one plain self-reported GPA field, the same "simple text box" shape the Survey's
// own GPA field used before the real Transcript & GPA feature replaced it for Roslyn/UC Davis.
function OtherHsTranscript({ state, patch }) {
  const [draftName, setDraftName] = useState('');
  const courses = state.transferHsOtherCourses || [];

  const addCourse = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    patch({ transferHsOtherCourses: [...courses, { id: makeTaskId('transfer-hs-other-course'), name: trimmed }] });
    setDraftName('');
  };

  const removeCourse = (id) => {
    patch({ transferHsOtherCourses: courses.filter((c) => c.id !== id) });
  };

  // Add Testing-Only Prefill Buttons for Transcript & Experiences (see CLAUDE.md) — this path has
  // no real per-course catalog to sample from (see the honest note right below), so this is plain
  // free-text course names plus a plausible self-reported GPA, exactly the same kind of data a real
  // student would type into these same two fields — not fabricated catalog data, just a fast way to
  // populate this form while testing. A whole-array REPLACE for the course chips, matching every
  // other testing prefill in this app.
  const fillSampleOther = () => {
    patch({
      transferHsOtherCourses: SAMPLE_OTHER_HS_COURSES.map((name) => ({ id: makeTaskId('transfer-hs-other-course'), name })),
      transferHsOtherGpa: SAMPLE_OTHER_HS_GPA,
    });
  };

  return (
    <>
      <div className="testing-fill-row">
        <button type="button" className="testing-fill-btn" onClick={fillSampleOther}>
          <FlaskConical size={13} /> Fill Sample Transcript (Testing)
        </button>
      </div>

      <p className="field-hint" style={{ fontStyle: 'italic' }}>
        We don't have detailed course catalog or grading data for this school yet, so this is a
        simplified version — just list your main courses and your GPA if you know it.
      </p>

      <div className="transcript-form">
        <div className="transcript-form-field" style={{ flex: '1 1 260px' }}>
          <span className="label">Course name</span>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g. AP Biology"
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={!draftName.trim()} onClick={addCourse}>
          Add Course
        </button>
      </div>

      {courses.length > 0 && (
        <div className="tag-list" style={{ padding: 0, marginTop: 12 }}>
          {courses.map((c) => (
            <button
              type="button"
              key={c.id}
              className="tag selected course-selected-chip"
              onClick={() => removeCourse(c.id)}
            >
              {c.name} <X size={12} />
            </button>
          ))}
        </div>
      )}

      <label className="task-form-field" style={{ marginTop: 18, maxWidth: 240 }}>
        <span className="label">GPA (self-reported)</span>
        <input
          type="text"
          key={state.transferHsOtherGpa}
          defaultValue={state.transferHsOtherGpa}
          onBlur={(e) => patch({ transferHsOtherGpa: e.target.value.trim() })}
          placeholder="e.g. 3.7"
        />
      </label>
    </>
  );
}
