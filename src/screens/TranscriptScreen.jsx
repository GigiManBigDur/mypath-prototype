import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getCourseById } from '../data/courses';
import { getCourseById as getUCDavisCourseById, searchUCDavisCourses, getAreaForSubjectCode } from '../data/ucdavisCourses';
import { GENERAL_EDUCATION_REQUIREMENTS, getSelectedUCDavisColleges } from '../data/ucdavisRequirements';
import { getDepartmentColor, getUCDavisAreaColor } from '../data/courseTrackMap';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import { calculateUnweightedGpa, calculateWeightedGpa, calculate4ScaleGpa } from '../utils/gpa';
import { LETTER_GRADE_OPTIONS, calculateUCDavisGpa } from '../utils/ucdavisGpa';
import StepProgress from '../components/StepProgress';
import CourseSearchField from '../components/CourseSearchField';
import MascotWidget from '../components/MascotWidget';
import { useMarkMascotSeen, useMascotSeenSnapshot, useMascotRevisitOnce } from '../hooks/useMascotSeen';
import { getMascotLine } from '../data/mascotDialogue';
import { useCountUp } from '../hooks/useCountUp';

// Palette repaint, Transcript/Course Selection batch (see CLAUDE.md) — Task 1's own "count-up
// effect... rather than an instant static update" for the GPA summary boxes, shared by both the
// Roslyn (3 boxes) and UC Davis (1 box) variants below. Purely a display wrapper around
// `useCountUp` — the REAL value (already computed by calculateUnweightedGpa/calculateWeightedGpa/
// calculate4ScaleGpa/calculateUCDavisGpa, none of which this pass touches) is what's passed in;
// this only decides how the transition to a new value is shown, never recomputes anything.
function GpaBox({ value, label }) {
  const displayed = useCountUp(value);
  return (
    <div className="gpa-summary-box">
      <div className="gpa-summary-value">{displayed != null ? displayed.toFixed(2) : '—'}</div>
      <div className="gpa-summary-label">{label}</div>
    </div>
  );
}

const YEAR_OPTIONS = [8, 9, 10, 11, 12];
const WEIGHT_LABELS = { ap: 'AP', research_honors: 'Research Honors', honors: 'Honors', standard: 'Standard' };
const CLASS_YEAR_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const QUARTER_OPTIONS = ['Fall', 'Winter', 'Spring', 'Summer'];

// Course Selection Stage 2 — real transcript entry, replacing both the Stage 1 placeholder here
// AND (functionally) the original Survey GPA text box: state.gpa is now calculated from this
// screen's entries instead of self-reported.
export default function TranscriptScreen() {
  const { state, patch } = useApp();
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
  // here anyway (e.g. restored mid-flow after educationLevel/currentSchool changed), bounce back
  // to the hub, the single consistent return point for every screen (see the "Return to Hub"
  // routing restructure in CLAUDE.md), same pattern DiscoveryScreen's own defensive bounce uses.
  useEffect(() => {
    if (!hasCourseFlow) patch({ screen: 'hub' });
  }, [hasCourseFlow]);

  if (!hasCourseFlow) return null;

  if (!isHighSchool) {
    return <UCDavisTranscriptScreen state={state} patch={patch} />;
  }

  // The "add a course" form is a few fields staged locally before becoming one real
  // state.transcript entry — same "build up an entry, then commit it" shape AddTaskModal already
  // uses elsewhere in this app, just inline rather than in a modal.
  const [pendingCourse, setPendingCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [yearTaken, setYearTaken] = useState(null);

  const transcript = state.transcript || [];

  // Dashboard/Guide feature, Stage 5 (see CLAUDE.md) — checkpoint mode reuses the same
  // "courseSelection-checkpoint" line Course Selection's own Part 2 uses, since it already covers
  // both halves of the checkpoint ("update your grades first, then pick your next courses") and
  // is meant to repeat every time, so it's never tracked via useMarkMascotSeen. Onboarding mode
  // picks between two real first-time intro lines depending on whether the transcript is
  // currently empty (matching the visible skip-row messaging right below) or already has entries
  // — whichever was shown first is the one that gets marked seen; after that, every visit shows
  // the short revisit line instead.
  const transcriptIntroKey = transcript.length === 0 ? 'transcript-empty' : 'transcript-intro';
  // Snapshotted (not a live `state.mascotSeenKeys.includes(...)` check) — see
  // useMascotSeen.js's own comment: reading live would flip this true the instant
  // useMarkMascotSeen's effect below marks the key seen, making the intro vanish within
  // milliseconds of ever showing.
  const transcriptIntroSeen = useMascotSeenSnapshot(checkpoint ? null : transcriptIntroKey);
  useMarkMascotSeen(!checkpoint && !transcriptIntroSeen ? transcriptIntroKey : null);
  // Bug fix (see CLAUDE.md) — 'transcript-revisit' used to repeat on every fresh re-entry to this
  // screen once the intro had been seen; useMascotRevisitOnce gives it the same "shown once,
  // ever" treatment the intro already has, chained one step later, so it plays exactly once (the
  // first real revisit) and then goes quiet, matching every other per-screen revisit line.
  const transcriptRevisitText = useMascotRevisitOnce(!checkpoint && transcriptIntroSeen, 'transcript-revisit');
  const mascotText = checkpoint
    ? getMascotLine('courseSelection-checkpoint')
    : (transcriptIntroSeen ? transcriptRevisitText : getMascotLine(transcriptIntroKey));

  // Off-by-one fix (see roadmapGenerator.js's buildCourseItems for the matching Course Selection
  // fix): the onboarding transcript's own "Year Taken" options are now limited to grades the
  // student has actually already completed, per their own Survey answer (now "What grade are you
  // entering / about to start?") — a 9th-grader (entering freshman year) has only 8th grade
  // behind them, a 10th-grader has 8th+9th, and so on. Checkpoint mode (revisiting a LATER year
  // mid-plan) keeps the full range — scoping that to the checkpoint's own real current grade is a
  // separate, unreported concern this fix doesn't touch.
  const availableYearOptions = checkpoint ? YEAR_OPTIONS : YEAR_OPTIONS.filter((y) => y < (state.schoolYear ?? 12));

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
  // Non-checkpoint advancing also sets `transcriptCompleted: true` (AppContext.jsx) — a real,
  // confirmed bug fix: an empty transcript's own `gpa` is honestly blank (`calculate4ScaleGpa`
  // has nothing to average), which used to be the ONLY signal the hub read for "is Transcript &
  // GPA done or skipped," so a genuine incoming-freshman skip left the hub thinking this screen
  // had never been visited at all. `transcriptCompleted` is a dedicated completion flag,
  // decoupled from the actual GPA value, so `gpa` itself keeps meaning exactly what it always
  // has everywhere else (blank = don't guess) — see its own DEFAULT_STATE comment.
  //
  // In checkpoint mode, advancing also flips this checkpoint's own part1Done flag and returns to
  // the roadmap instead of continuing the onboarding flow — the refreshed GPA is written to the
  // exact same state.gpa field either way, so every existing GPA-aware consumer (ProgramsStep's
  // curated program list, reachMatchSafetyTag's Reach/Match/Safety badges) picks it up
  // automatically, with zero changes needed anywhere else. Checkpoint mode deliberately does NOT
  // touch `transcriptCompleted` — that flag tracks only the one-time onboarding submission, not
  // a later per-year/per-quarter revisit.
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
    patch({ gpa: newGpa, transcriptCompleted: true, screen: 'hub' });
  };

  const goBack = () => {
    if (checkpoint) {
      patch({ activeCourseCheckpoint: null, screen: 'plan' });
      return;
    }
    patch({ screen: 'hub' });
  };

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button type="button" className="btn btn-ghost" onClick={goBack}>
        <ArrowLeft size={14} /> Back
      </button>

      {!checkpoint && <StepProgress step={3} total={8} />}
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
            {availableYearOptions.map((y) => (
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
                // Task 1's own "color-code each entered course by subject/department, using the
                // same colors established in Batch 1" — reuses the identical track color a
                // student would already see for the matching Survey interest tag/Discovery card
                // (getDepartmentColor, courseTrackMap.js), not a separately-invented mapping.
                // `null` for Special Education (no honest track fit) falls back to a plain,
                // uncolored row via CSS's own `var(--course-accent, ...)` default.
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

// UC Davis partner-school addition, Stage 2 (see CLAUDE.md) — real transcript entry against the
// real, scoped UC Davis course catalog (ucdavisCourses.js), a real GE + college-specific
// requirements summary (ucdavisRequirements.js, parsed directly from the real catalog pages, not
// summarized from general knowledge), and a real letter-grade GPA calculation
// (utils/ucdavisGpa.js). Mirrors TranscriptScreen's own Roslyn form shape (search field, add-row,
// table, skip option, GPA feeding state.gpa) but with UC Davis's own real fields throughout —
// letter grade instead of a 0-100 number, class year + quarter instead of a single grade level —
// since forcing Roslyn's shape onto a genuinely different grading system would be a worse fit
// than building this screen's own small form.
function UCDavisTranscriptScreen({ state, patch }) {
  const [pendingCourse, setPendingCourse] = useState(null);
  const [letterGrade, setLetterGrade] = useState('');
  const [classYear, setClassYear] = useState(null);
  const [quarter, setQuarter] = useState(null);

  // UC Davis Course Selection Stage 4's own two-part checkpoint (see CLAUDE.md) reuses this exact
  // screen for its Part 1, same reuse principle Roslyn's own checkpoint already established. Every
  // quarter (Fall/Winter/Spring/Summer) is two-part now, so this is reachable for any of them.
  const checkpoint = state.activeUCDavisCheckpoint?.part === 'transcript' ? state.activeUCDavisCheckpoint : null;

  const ucdavisTranscript = state.ucdavisTranscript || [];
  const gpa = useMemo(() => calculateUCDavisGpa(ucdavisTranscript), [ucdavisTranscript]);
  const selectedColleges = useMemo(
    () => getSelectedUCDavisColleges(state.selectedMajorIds),
    [state.selectedMajorIds],
  );

  // Same pattern as the Roslyn TranscriptScreen above — no UC-Davis-specific dialogue text was
  // written separately, since the content ("search for real courses, enter real grades") applies
  // just as well here; reusing the same keys means a student who somehow encounters both a Roslyn
  // and a UC Davis transcript (not a real path today, but harmless either way) doesn't see the
  // intro line twice under two different names.
  const transcriptIntroKey = ucdavisTranscript.length === 0 ? 'transcript-empty' : 'transcript-intro';
  const transcriptIntroSeen = useMascotSeenSnapshot(checkpoint ? null : transcriptIntroKey);
  useMarkMascotSeen(!checkpoint && !transcriptIntroSeen ? transcriptIntroKey : null);
  // Bug fix (see CLAUDE.md) — same "shown once, ever" fix as the Roslyn variant above.
  const transcriptRevisitText = useMascotRevisitOnce(!checkpoint && transcriptIntroSeen, 'transcript-revisit');
  const mascotText = checkpoint
    ? getMascotLine('courseSelection-checkpoint')
    : (transcriptIntroSeen ? transcriptRevisitText : getMascotLine(transcriptIntroKey));

  // Same real, analogous gap the Roslyn off-by-one fix already closed for its own transcript
  // (YEAR_OPTIONS scoped to state.schoolYear) — the UC Davis onboarding transcript's own "Class
  // Year" pill row always offered all 4 of CLASS_YEAR_OPTIONS regardless of state.schoolYear
  // (1st-4th year at UC Davis), letting a genuine incoming 1st-year student log "Senior"-level
  // coursework that couldn't possibly exist yet. CLASS_YEAR_OPTIONS[i] represents "year i+1 at UC
  // Davis" (Freshman = 1st year, ... Senior = 4th year), so only years STRICTLY BEFORE the
  // student's own entering year have actually been completed —
  // `CLASS_YEAR_OPTIONS.slice(0, schoolYear - 1)`. A 1st-year student (schoolYear 1) gets an
  // EMPTY array — a true incoming first-year has no UC Davis coursework at all yet, unlike
  // Roslyn's freshman who still had one real prior option (8th grade); the form below hides
  // itself entirely in that case rather than rendering a permanently-unusable "Add Course" button
  // (see the JSX below). Checkpoint mode (a separate, later-firing screen for a DIFFERENT, future
  // stage) keeps the full range, same exception Roslyn's own fix already carved out.
  const availableClassYearOptions = checkpoint ? CLASS_YEAR_OPTIONS : CLASS_YEAR_OPTIONS.slice(0, (state.schoolYear ?? 4) - 1);

  const canAdd = !!pendingCourse && !!letterGrade && !!classYear && !!quarter;

  const addEntry = () => {
    if (!canAdd) return;
    patch({
      ucdavisTranscript: [
        ...ucdavisTranscript,
        { id: makeTaskId('ucdavis-transcript'), courseId: pendingCourse.id, letterGrade, classYear, quarter },
      ],
    });
    setPendingCourse(null);
    setLetterGrade('');
    setClassYear(null);
    setQuarter(null);
  };

  const removeEntry = (id) => {
    patch({ ucdavisTranscript: ucdavisTranscript.filter((e) => e.id !== id) });
  };

  // Same "Continue and Skip do the exact same thing" contract Roslyn's own advance() uses — GPA
  // is written directly, no conversion step needed (the UC letter scale is already 4.0-based).
  // In checkpoint mode, also flips this checkpoint's own part1Done flag (nested under the
  // quarter, unlike Roslyn's stage-only key) and returns to the roadmap instead of continuing
  // onboarding.
  const advance = () => {
    const newGpa = gpa != null ? String(gpa) : '';
    if (checkpoint) {
      const { stageName, quarter: checkpointQuarter } = checkpoint;
      const stageRecord = state.ucdavisQuarterCheckpoints[stageName] || {};
      patch({
        gpa: newGpa,
        ucdavisQuarterCheckpoints: {
          ...state.ucdavisQuarterCheckpoints,
          [stageName]: { ...stageRecord, [checkpointQuarter]: { ...stageRecord[checkpointQuarter], part1Done: true } },
        },
        activeUCDavisCheckpoint: null,
        screen: 'plan',
      });
      return;
    }
    patch({ gpa: newGpa, transcriptCompleted: true, screen: 'hub' });
  };

  const goBack = () => {
    if (checkpoint) {
      patch({ activeUCDavisCheckpoint: null, screen: 'plan' });
      return;
    }
    patch({ screen: 'hub' });
  };

  return (
    <div>
      <MascotWidget text={mascotText} />
      <button type="button" className="btn btn-ghost" onClick={goBack}>
        <ArrowLeft size={14} /> Back
      </button>

      {!checkpoint && <StepProgress step={3} total={8} />}
      <h1 className="page-title">{checkpoint ? 'Update Your Transcript' : 'UC Davis Transcript & GPA'}</h1>
      <p className="page-sub">
        {checkpoint
          ? "Add the courses you've just completed — this refreshes your GPA everywhere it's used, including your program Reach/Match/Safety tags."
          : "Search for the real UC Davis courses you've taken, enter your letter grade and when you took each one — we'll calculate your GPA from it automatically."}
      </p>

      {!checkpoint && (
      <div className="field-block">
        <div className="field-label">{GENERAL_EDUCATION_REQUIREMENTS.label}</div>
        <p className="field-hint">Applies to every UC Davis undergraduate, regardless of major.</p>
        {GENERAL_EDUCATION_REQUIREMENTS.sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 10 }}>
            <strong>{section.title}</strong>
            <ul>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
        <p className="field-hint">{GENERAL_EDUCATION_REQUIREMENTS.totalNote}</p>
      </div>
      )}

      {!checkpoint && (selectedColleges.length === 0 ? (
        <p className="field-hint">
          Select a major in Discovery from one of our researched UC Davis areas (Psychology,
          Political Science, Computer Science/Engineering, Business/Economics, Biology/Pre-Med, or
          Horticulture/Agriculture &amp; Environment) to see its specific college requirements here.
        </p>
      ) : (
        selectedColleges.map((college) => (
          <div className="field-block" key={college.id}>
            <div className="field-label">{college.label}</div>
            <ul>
              {college.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))
      ))}

      {ucdavisTranscript.length === 0 && (
        <div className="transcript-skip-row">
          <p>
            {!checkpoint && availableClassYearOptions.length === 0
              ? "You're just starting at UC Davis — there's nothing to add yet."
              : 'Haven\'t taken any UC Davis courses yet? That\'s completely fine.'}
          </p>
          <button type="button" className="btn btn-outline" onClick={advance}>
            Skip — I haven't taken any UC Davis courses yet
          </button>
        </div>
      )}

      {/* A true incoming 1st-year student has genuinely NO prior UC Davis coursework to log —
          unlike Roslyn's freshman case (which still had one real prior option, 8th grade), there
          is no equivalent partial case here, so the add-course form itself is hidden rather than
          rendered as a permanently-unusable "Add Course" button with an empty Class Year row. */}
      {(checkpoint || availableClassYearOptions.length > 0) && (
      <div className="transcript-form">
        <div className="transcript-form-field" style={{ flex: '1 1 260px' }}>
          <span className="label">Course</span>
          {pendingCourse ? (
            <div className="transcript-selected-course">
              {pendingCourse.code} — {pendingCourse.name}
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
            <CourseSearchField onSelect={setPendingCourse} search={searchUCDavisCourses} placeholder="Search for a UC Davis course..." />
          )}
        </div>

        <div className="transcript-form-field">
          <span className="label">Grade</span>
          <div className="pill-group">
            {LETTER_GRADE_OPTIONS.map((g) => (
              <button
                type="button"
                key={g}
                className={`pill${letterGrade === g ? ' selected' : ''}`}
                onClick={() => setLetterGrade(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="transcript-form-field">
          <span className="label">Class Year</span>
          <div className="pill-group">
            {availableClassYearOptions.map((y) => (
              <button
                type="button"
                key={y}
                className={`pill${classYear === y ? ' selected' : ''}`}
                onClick={() => setClassYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="transcript-form-field">
          <span className="label">Quarter</span>
          <div className="pill-group">
            {QUARTER_OPTIONS.map((q) => (
              <button
                type="button"
                key={q}
                className={`pill${quarter === q ? ' selected' : ''}`}
                onClick={() => setQuarter(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-primary" disabled={!canAdd} onClick={addEntry}>
          Add Course
        </button>
      </div>
      )}

      {ucdavisTranscript.length > 0 && (
        <>
          <table className="transcript-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Grade</th>
                <th>Term</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ucdavisTranscript.map((entry) => {
                const course = getUCDavisCourseById(entry.courseId);
                // Same "reuse Batch 1's colors" treatment as the Roslyn table above, resolved via
                // UC Davis's own 6 subject areas instead of Roslyn's 11 departments.
                const area = course ? getAreaForSubjectCode(course.subjectCode) : null;
                const accent = area ? getUCDavisAreaColor(area.id) : null;
                return (
                  <tr key={entry.id} style={accent ? { '--course-accent': accent } : undefined}>
                    <td>{course ? `${course.code} — ${course.name}` : entry.courseId}</td>
                    <td>{entry.letterGrade}</td>
                    <td>{entry.quarter} · {entry.classYear}</td>
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
            <GpaBox value={gpa} label="GPA (4.0 scale)" />
          </div>
          <p className="field-hint" style={{ marginTop: -12, marginBottom: 18 }}>
            P/NP courses are excluded from this GPA, same as UC Davis's own policy. This number is
            what's used for program matching and Reach/Match/Safety recommendations later in your
            plan.
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
