import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, GraduationCap, BookOpen, Award, Clock, Scale, Star, FileCheck, X, Check, Plus, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOpportunityTracks, TRACK_LABELS } from '../data/interests';
import { COURSES, getCourseById, WEIGHT_MULTIPLIERS } from '../data/courses';
import { getRecommendedCourses } from '../data/courseRecommendations';
import {
  PROGRAM_TYPE_LABELS,
  PROGRAM_TYPE_NOTES,
  getSelectedProgramTypes,
  getProgramTypeCourses,
} from '../data/programRecommendations';
import { getSchoolRequirement } from '../data/schoolRequirements';
import { checkPrerequisite } from '../utils/prerequisites';
import { STAGE_PLAN, TRUNK_STAGES, DEFAULT_SCHOOL_YEAR } from '../data/trunkSteps';
import StepProgress from '../components/StepProgress';
import { useModalExit } from '../hooks/useModalExit';

// A preview needs to end at a sentence or word boundary, never mid-word — the bug this fixes
// was a card showing "The program is..." because the STORED description itself used to be
// manually cut mid-sentence at parse time (see courses.js's own header comment). Descriptions
// are now always complete; this is the only place truncation happens, purely for card display.
const PREVIEW_MAX = 220;
function courseSummary(description) {
  if (description.length <= PREVIEW_MAX) return description;
  const slice = description.slice(0, PREVIEW_MAX);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (sentenceEnd > PREVIEW_MAX * 0.4) return slice.slice(0, sentenceEnd + 1);
  const wordEnd = slice.lastIndexOf(' ');
  return `${slice.slice(0, wordEnd > 0 ? wordEnd : PREVIEW_MAX).trim()}...`;
}

// Course Selection Stage 3. Reuses the same shared course catalog Transcript & GPA (Stage 2)
// reads from — no duplicated data. Like Transcript, this screen only applies to High School
// students; the defensive bounce below matches TranscriptScreen's own (see CLAUDE.md).
const DEPARTMENTS = [...new Set(COURSES.map((c) => c.department))].sort();
const GRADE_OPTIONS = [9, 10, 11, 12];
const CREDIT_OPTIONS = [0.5, 1, 2, 'none'];
const ATTRIBUTE_OPTIONS = [
  { key: 'ap', label: 'AP' },
  { key: 'honors', label: 'Honors' },
  { key: 'research_honors', label: 'RSH' },
];
const ATTRIBUTE_LABELS = { ap: 'AP', research_honors: 'RSH', honors: 'Honors', standard: 'Standard' };

// Task 1's real Roslyn policy data, as a fixed list of visual summary cards rather than a wall of
// text. Every figure here comes directly from the build spec, not derived/guessed from the course
// catalog itself.
const POLICY_SECTIONS = [
  {
    icon: GraduationCap,
    title: 'Graduation Requirements',
    items: ['Minimum 22 credits total', '40 hours of community service'],
  },
  {
    icon: BookOpen,
    title: 'Subject Minimums',
    items: [
      'English — 4 credits',
      'Social Studies — 4 credits',
      'Math — 3 credits',
      'Science — 3 credits (incl. 1 Life Science)',
      'World Languages — 1 credit (3 for Advanced Regents)',
      'Art/Music — 1 credit',
      'Health — 0.5 credits',
      'PE — 2 credits',
      'Electives — 3.5 credits (1.5 for Advanced Regents)',
    ],
  },
  {
    icon: Award,
    title: 'Diploma Types',
    items: [
      'Local, Regents, and Advanced Regents',
      'Local / Regents — 5 Regents exams',
      'Advanced Regents — 9 Regents exams',
    ],
  },
  {
    icon: Clock,
    title: 'Course Load Per Grade',
    items: ['9th & 10th grade — 8 classes/day', '11th grade — 7 classes/day', '12th grade — 6 classes/day'],
  },
  {
    icon: Scale,
    title: 'GPA Weighting',
    items: [
      `AP — ×${WEIGHT_MULTIPLIERS.ap}`,
      `Research Honors — ×${WEIGHT_MULTIPLIERS.research_honors}`,
      `Honors — ×${WEIGHT_MULTIPLIERS.honors}`,
      `Regents / 100-point / Pass-Fail — ×${WEIGHT_MULTIPLIERS.standard}`,
    ],
  },
  {
    icon: Star,
    title: 'Honors Distinction',
    items: [
      'Overall — required-Regents average 90%+',
      'Math/Science Honors Distinction — 3 exams at 85%+ each',
    ],
  },
  {
    icon: FileCheck,
    title: 'AP Course Policy',
    items: [
      'Available grades 10–12 with prerequisites met',
      'Must sit for the AP Exam in May, or the course reverts to Honors designation on the transcript',
    ],
  },
];

// Shared card JSX for every place a course grid renders (main recommended/browse grid, and each
// program-type group below) — same "extract once, render identically everywhere" precedent
// ProgramCard already set for Discovery's Programs step (see CLAUDE.md). `ineligibleReason` is
// only ever passed in Course Selection Stage 4's checkpoint mode (Part 2) — a course whose real
// prerequisite isn't yet satisfied by the transcript stays visible (so its `prerequisite` text is
// still readable) but can't be selected, same "inform, don't just hide" reasoning the rest of
// this screen's filters already use.
function CourseCard({ course, selected, onOpenDetail, onToggle, ineligibleReason }) {
  const locked = !!ineligibleReason && !selected;
  return (
    <div
      className={`card course-card${selected ? ' selected' : ''}${locked ? ' ineligible' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(course)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(course); }
      }}
    >
      <button
        type="button"
        className={`course-select-btn${selected ? ' selected' : ''}`}
        disabled={locked}
        onClick={(e) => { e.stopPropagation(); if (!locked) onToggle(course.id); }}
      >
        {selected
          ? <><Check size={12} /> Selected</>
          : locked ? <><Lock size={12} /> Locked</> : <><Plus size={12} /> Select</>}
      </button>
      <div className="card-title">{course.name}</div>
      {locked && <p className="course-ineligible-note">{ineligibleReason}</p>}
      {(course.weightCategory !== 'standard' || course.isPassFail) && (
        <div className="course-badges">
          {course.weightCategory !== 'standard' && (
            <span className={`course-badge course-badge-${course.weightCategory}`}>
              {ATTRIBUTE_LABELS[course.weightCategory]}
            </span>
          )}
          {course.isPassFail && <span className="course-badge course-badge-passfail">Pass/Fail</span>}
        </div>
      )}
      <p className="card-desc">{courseSummary(course.description)}</p>
      <div className="card-meta">
        <div>
          <span className="label">Department</span>
          <strong>{course.department}</strong>
        </div>
        <div>
          <span className="label">Credit</span>
          <strong>{course.credit != null ? course.credit : 'Varies'}</strong>
        </div>
        <div>
          <span className="label">Grade Level</span>
          <strong>{course.gradeLevels.length ? course.gradeLevels.join(', ') : 'Varies'}</strong>
        </div>
        {course.prerequisite && (
          <div>
            <span className="label">Prerequisite</span>
            <strong>{course.prerequisite}</strong>
          </div>
        )}
      </div>
      {course.note && (
        <p className="field-hint" style={{ marginTop: 8, marginBottom: 0 }}>{course.note}</p>
      )}
    </div>
  );
}

export default function CourseSelectionScreen() {
  const { state, patch } = useApp();
  const isHighSchool = state.educationLevel === 'highschool';

  // Course Selection Stage 4's "revisit" checkpoint (Part 2) reuses this exact screen instead of
  // rebuilding the course-selection mechanism — set by Roadmap.jsx right before navigating here.
  // Selections write to state.courseCheckpoints[stageName] instead of the top-level
  // selectedCourseIds (which is reserved for stage 0's onboarding selections), and courses are
  // checked against real prerequisites/the refreshed transcript — see checkPrerequisite below.
  const checkpoint = state.activeCourseCheckpoint?.part === 'courses' ? state.activeCourseCheckpoint : null;
  const checkpointProgress = checkpoint ? state.courseCheckpoints?.[checkpoint.stageName] : null;

  // Defensive: same reasoning as TranscriptScreen's own bounce — Course Selection only applies to
  // High School, and routing already never sends anyone else here, but state restored mid-flow
  // after educationLevel changed shouldn't render this screen anyway. A checkpoint's Part 2 is
  // additionally locked until Part 1 is done for that same stage — Roadmap.jsx's own modal
  // already disables the button that gets here, but state could in principle be reached directly
  // (e.g. browser back), so this bounces the same way rather than trusting the caller.
  useEffect(() => {
    if (!isHighSchool) { patch({ screen: 'programSummary' }); return; }
    if (checkpoint && !checkpointProgress?.part1Done) patch({ activeCourseCheckpoint: null, screen: 'plan' });
  }, [isHighSchool, checkpoint, checkpointProgress?.part1Done]);

  const [viewMode, setViewMode] = useState('recommended'); // 'recommended' | 'browse'
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState([]);
  const [gradeFilter, setGradeFilter] = useState([]);
  const [creditFilter, setCreditFilter] = useState([]);
  const [attrFilter, setAttrFilter] = useState([]);

  const opportunityTracks = getOpportunityTracks(state.interestTags);
  const recommendedCourses = useMemo(
    () => getRecommendedCourses(opportunityTracks, getCourseById),
    [opportunityTracks],
  );
  const selectedProgramTypes = useMemo(
    () => getSelectedProgramTypes(state.selectedMajorIds),
    [state.selectedMajorIds],
  );

  const matchesFilters = (course) => {
    if (deptFilter.length && !deptFilter.includes(course.department)) return false;
    if (gradeFilter.length && !course.gradeLevels.some((g) => gradeFilter.includes(g))) return false;
    if (creditFilter.length) {
      const creditKey = course.credit == null ? 'none' : course.credit;
      if (!creditFilter.includes(creditKey)) return false;
    }
    if (attrFilter.length && !attrFilter.includes(course.weightCategory)) return false;
    if (search.trim() && !course.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  };

  const browseCourses = COURSES.filter(matchesFilters);
  const courses = viewMode === 'recommended' ? recommendedCourses : browseCourses;

  // In checkpoint mode, "selected" reads/writes this stage's own slot in courseCheckpoints
  // instead of the top-level selectedCourseIds — otherwise identical toggle behavior.
  const currentSelectedIds = checkpoint ? (checkpointProgress?.selectedCourseIds || []) : state.selectedCourseIds;
  const isSelected = (id) => currentSelectedIds.includes(id);

  const toggleCourse = (id) => {
    const has = currentSelectedIds.includes(id);
    const newIds = has ? currentSelectedIds.filter((c) => c !== id) : [...currentSelectedIds, id];
    if (checkpoint) {
      patch({
        courseCheckpoints: {
          ...state.courseCheckpoints,
          [checkpoint.stageName]: { ...state.courseCheckpoints[checkpoint.stageName], selectedCourseIds: newIds },
        },
      });
      return;
    }
    patch({ selectedCourseIds: newIds });
  };

  // Real prerequisite check against the (just-refreshed, if this is a checkpoint) transcript —
  // only meaningful/applied in checkpoint mode, since stage 0's onboarding selection happens
  // before most of the catalog has been taken yet. See prerequisites.js for what "checked" means
  // (a parseable course-name reference) vs. left alone (no honest way to verify).
  const ineligibleReasonFor = (course) => {
    if (!checkpoint) return null;
    const result = checkPrerequisite(course, state.transcript);
    return result.checked && !result.satisfied ? result.reason : null;
  };

  const toggleInFilter = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const selectedCourses = currentSelectedIds.map((id) => getCourseById(id)).filter(Boolean);

  // The checkpoint's own target-year label ("Junior Year") for header copy — derived the same
  // way roadmapGenerator.js derives it, from STAGE_PLAN/TRUNK_STAGES, not stored separately.
  const targetStageLabel = (() => {
    if (!checkpoint) return null;
    const stageNames = STAGE_PLAN.highschool[state.schoolYear] ?? STAGE_PLAN.highschool[DEFAULT_SCHOOL_YEAR.highschool];
    const idx = stageNames.indexOf(checkpoint.stageName);
    const targetName = idx >= 0 ? stageNames[idx + 1] : null;
    return targetName ? TRUNK_STAGES.highschool[targetName].label : 'next year';
  })();

  // Same derivation, for the ORIGINAL onboarding screen's own scope-clarifying banner below —
  // this is the year stage 0's selections are actually FOR (the "upcoming registration cycle"),
  // matching the exact wording roadmapGenerator.js's course-request tasks already use ("Request
  // X for next year"). null for a 12th-grader/yearSpan===1 plan, where there's no next Roslyn
  // cycle to name — see the "Finalize" wording used elsewhere for that same case.
  const nextYearLabel = (() => {
    if (checkpoint) return null;
    const stageNames = STAGE_PLAN.highschool[state.schoolYear] ?? STAGE_PLAN.highschool[DEFAULT_SCHOOL_YEAR.highschool];
    return stageNames.length > 1 ? TRUNK_STAGES.highschool[stageNames[1]].label : null;
  })();

  // Course detail modal — same open/close mechanism as Roadmap.jsx's node detail modal
  // (useModalExit for the fade in/out, a ref that retains the last real course so the closing
  // frame still has real content instead of flashing blank), reusing the exact same .overlay/
  // .modal/.modal-close/.modal-eyebrow/.modal-title/.modal-desc classes rather than inventing a
  // new pattern.
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const { rendered: detailRendered, closing: detailClosing } = useModalExit(!!selectedCourseDetail);
  const lastDetailRef = useRef(null);
  if (selectedCourseDetail) lastDetailRef.current = selectedCourseDetail;
  const modalCourse = selectedCourseDetail || lastDetailRef.current;

  if (!isHighSchool) return null;

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => (checkpoint ? patch({ activeCourseCheckpoint: null, screen: 'plan' }) : patch({ screen: 'transcript' }))}
      >
        <ArrowLeft size={14} /> Back
      </button>

      {!checkpoint && <StepProgress step={5} total={9} />}
      <h1 className="page-title">{checkpoint ? `Select Your Courses for ${targetStageLabel}` : 'Course Selection'}</h1>
      <p className="page-sub">
        {checkpoint
          ? `Courses are checked against real prerequisites from your updated transcript — a course you haven't met the prerequisite for yet is shown but locked.`
          : "Pick the courses you're planning to take, built around what your school actually offers."}
      </p>

      {!checkpoint && (
        <div className="caveat-banner course-scope-banner">
          {nextYearLabel
            ? <>This page is for selecting your courses for <strong>{nextYearLabel}</strong> only — not your
                full remaining path. You'll return here to choose courses for each future year as they come
                up.</>
            : <>This page is for finalizing your current-year course registration only.</>}
        </div>
      )}

      {!checkpoint && (
        <div className="field-block">
          <div className="field-label">Roslyn High School academic policies</div>
          <p className="field-hint">A quick-reference summary — not the full course catalog handbook.</p>
          <div className="policy-grid">
            {POLICY_SECTIONS.map((section) => (
              <div className="policy-card" key={section.title}>
                <div className="policy-card-header">
                  <section.icon size={18} />
                  <span>{section.title}</span>
                </div>
                <ul className="policy-card-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

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
            Browse all courses
          </button>
        </div>
      </div>

      {viewMode === 'recommended' && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          Based on your selected interests{opportunityTracks.length > 0 ? ` (${opportunityTracks.map((t) => TRACK_LABELS[t]).join(', ')})` : ''}.
          You're always free to explore any course you like — these are suggestions, not requirements.
        </p>
      )}

      {viewMode === 'recommended' && recommendedCourses.length === 0 && (
        <p className="field-hint" style={{ marginBottom: 18 }}>
          No strong course matches for this interest yet — browse the full catalog below instead.
        </p>
      )}

      {viewMode === 'browse' && (
        <div className="field-block">
          <input
            type="text"
            className="course-filter-search"
            placeholder="Search course names…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="course-filter-row">
            <div className="course-filter-group">
              <span className="course-filter-label">Category</span>
              <div className="pill-group">
                {DEPARTMENTS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`pill${deptFilter.includes(d) ? ' selected' : ''}`}
                    onClick={() => toggleInFilter(deptFilter, setDeptFilter, d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="course-filter-group">
              <span className="course-filter-label">Grade Level</span>
              <div className="pill-group">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    className={`pill${gradeFilter.includes(g) ? ' selected' : ''}`}
                    onClick={() => toggleInFilter(gradeFilter, setGradeFilter, g)}
                  >
                    {g}th
                  </button>
                ))}
              </div>
            </div>
            <div className="course-filter-group">
              <span className="course-filter-label">Credits</span>
              <div className="pill-group">
                {CREDIT_OPTIONS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`pill${creditFilter.includes(c) ? ' selected' : ''}`}
                    onClick={() => toggleInFilter(creditFilter, setCreditFilter, c)}
                  >
                    {c === 'none' ? 'Varies' : c}
                  </button>
                ))}
              </div>
            </div>
            <div className="course-filter-group">
              <span className="course-filter-label">Special Attributes</span>
              <div className="pill-group">
                {ATTRIBUTE_OPTIONS.map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    className={`pill${attrFilter.includes(a.key) ? ' selected' : ''}`}
                    onClick={() => toggleInFilter(attrFilter, setAttrFilter, a.key)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="selection-count">{browseCourses.length} course{browseCourses.length === 1 ? '' : 's'} match</div>
        </div>
      )}

      <div className="grid grid-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={isSelected(course.id)}
            onOpenDetail={setSelectedCourseDetail}
            onToggle={toggleCourse}
            ineligibleReason={ineligibleReasonFor(course)}
          />
        ))}
      </div>

      {/* Task: program-specific recommendations, a second and distinct recommendation layer from
          the interest-based one above — driven by the actual major(s) selected in Discovery
          (state.selectedMajorIds), grounded in real admissions research per program type rather
          than interest tags. See programRecommendations.js's own header comment for the research
          and the honesty framing behind it. */}
      <div className="field-block">
        <div className="field-label">Program-Specific Course Recommendations</div>
        <p className="field-hint">
          Based on real admissions research for the type of program(s) you selected in
          Discovery — these reflect what a field commonly looks for (e.g. Engineering programs
          broadly want the same math/science foundation), not one specific school's individual
          preference. You're always free to explore any course you like — these are suggestions,
          not requirements.
        </p>
        {selectedProgramTypes.length === 0 ? (
          <p className="field-hint">
            {state.selectedMajorIds.length === 0
              ? 'Select majors in Discovery to see program-specific course recommendations here.'
              : "No program-specific research available for your selected major(s) yet."}
          </p>
        ) : (
          selectedProgramTypes.map((type) => {
            const typeCourses = getProgramTypeCourses(type, getCourseById);
            const note = PROGRAM_TYPE_NOTES[type];
            return (
              <div className="career-group" key={type}>
                <div className="career-group-label">
                  Commonly recommended for {PROGRAM_TYPE_LABELS[type]} programs
                </div>
                <div className="grid grid-3">
                  {typeCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      selected={isSelected(course.id)}
                      onOpenDetail={setSelectedCourseDetail}
                      onToggle={toggleCourse}
                      ineligibleReason={ineligibleReasonFor(course)}
                    />
                  ))}
                </div>
                {note && <p className="field-hint" style={{ marginTop: 10 }}>{note}</p>}
              </div>
            );
          })
        )}
      </div>

      {/* A third, even more specific recommendation layer — per individual selected school +
          program (state.selectedProgramKeys), not per field/major. Deliberately separate from the
          Program-Specific Course Recommendations section above: that one is field-wide judgment
          ("Engineering programs broadly want calculus and physics"), this one is only ever a real,
          independently verified structural fact about one specific school ("Cornell's
          Communication major is housed in CALS and inherits CALS's science requirements") — never
          inferred from a program's name/subject. See schoolRequirements.js's own header comment. */}
      <div className="field-block">
        <div className="field-label">School-Specific Requirements</div>
        <p className="field-hint">
          Non-obvious, structural requirements tied to one specific school + major combination —
          the kind of thing field-level recommendations can't catch, since they come from how a
          school happens to organize its departments, not from the subject itself.
        </p>
        {state.selectedProgramKeys.length === 0 ? (
          <p className="field-hint">Select a program in Discovery to see school-specific requirements here.</p>
        ) : (
          state.selectedProgramKeys.map((key) => {
            const [institution, program] = key.split('::');
            const req = getSchoolRequirement(key);
            return (
              <div className={`school-req-card${req ? ' verified' : ' unverified'}`} key={key}>
                <div className="school-req-header">{institution} — {program}</div>
                {req ? (
                  <>
                    <p className="school-req-text"><strong>Requirement:</strong> {req.requirement}</p>
                    <p className="school-req-text"><strong>Why:</strong> {req.why}</p>
                    {req.transferNote && (
                      <p className="school-req-text"><strong>For transfer applicants:</strong> {req.transferNote}</p>
                    )}
                    <p className="school-req-source">Source: {req.source}</p>
                  </>
                ) : (
                  <p className="school-req-fallback">
                    We haven't independently verified school-specific requirements for this program
                    yet. Some schools house majors in unexpected departments/colleges with
                    non-obvious extra requirements — always check the official admissions page for
                    your specific major before finalizing your course plan.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rendered via createPortal to document.body — this screen is wrapped in App.jsx's
          `.screen-transition` div, whose entrance animation leaves a permanent (fill-mode: both)
          transform on the element even after it finishes. Any non-`none` transform on an
          ancestor — including an animation-filled identity transform — makes that ancestor a
          containing block for `position: fixed` descendants, which broke this modal's
          viewport-relative centering (confirmed via getBoundingClientRect: the overlay was
          anchored to .screen-transition's box, not the viewport). Roadmap.jsx's own modals never
          hit this because Map 2 is never wrapped in .screen-transition. */}
      {detailRendered && modalCourse && createPortal(
        <div
          className={`overlay${detailClosing ? ' overlay-exit' : ''}`}
          onClick={() => setSelectedCourseDetail(null)}
        >
          <div className={`modal${detailClosing ? ' modal-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCourseDetail(null)}>
              <X size={18} />
            </button>
            <div className="modal-eyebrow" style={{ color: 'var(--teal)' }}>{modalCourse.department}</div>
            <h2 className="modal-title">{modalCourse.name}</h2>
            {(modalCourse.weightCategory !== 'standard' || modalCourse.isPassFail) && (
              <div className="course-badges">
                {modalCourse.weightCategory !== 'standard' && (
                  <span className={`course-badge course-badge-${modalCourse.weightCategory}`}>
                    {ATTRIBUTE_LABELS[modalCourse.weightCategory]}
                  </span>
                )}
                {modalCourse.isPassFail && <span className="course-badge course-badge-passfail">Pass/Fail</span>}
              </div>
            )}
            <p className="modal-desc">{modalCourse.description}</p>
            <div className="card-meta" style={{ marginBottom: 20 }}>
              <div>
                <span className="label">Credit</span>
                <strong>{modalCourse.credit != null ? modalCourse.credit : 'Varies'}</strong>
              </div>
              <div>
                <span className="label">Grade Level</span>
                <strong>{modalCourse.gradeLevels.length ? modalCourse.gradeLevels.join(', ') : 'Varies'}</strong>
              </div>
              {modalCourse.prerequisite && (
                <div>
                  <span className="label">Prerequisite</span>
                  <strong>{modalCourse.prerequisite}</strong>
                </div>
              )}
            </div>
            {(() => {
              const modalSelected = isSelected(modalCourse.id);
              const modalReason = !modalSelected ? ineligibleReasonFor(modalCourse) : null;
              return (
                <button
                  type="button"
                  className={`btn ${modalSelected ? 'btn-outline' : 'btn-primary'}`}
                  disabled={!!modalReason}
                  onClick={() => { if (!modalReason) toggleCourse(modalCourse.id); }}
                >
                  {modalSelected ? 'Remove from my courses' : modalReason ? 'Locked — prerequisite not met' : 'Add to my courses'}
                </button>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}

      {selectedCourses.length > 0 && (
        <div className="field-block" style={{ marginTop: 32 }}>
          <div className="field-label">Your selected courses ({selectedCourses.length})</div>
          <div className="tag-list" style={{ padding: 0 }}>
            {selectedCourses.map((course) => (
              <button
                type="button"
                key={course.id}
                className="tag selected course-selected-chip"
                onClick={() => toggleCourse(course.id)}
              >
                {course.name} <X size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (checkpoint) {
              const { stageName } = checkpoint;
              const checkpointId = `course-checkpoint-${stageName}`;
              patch({
                courseCheckpoints: {
                  ...state.courseCheckpoints,
                  [stageName]: { ...state.courseCheckpoints[stageName], selectedCourseIds: currentSelectedIds },
                },
                completedNodes: { ...state.completedNodes, [checkpointId]: true },
                activeCourseCheckpoint: null,
                screen: 'plan',
              });
              return;
            }
            patch({ screen: 'programSummary' });
          }}
        >
          {checkpoint ? 'Save & Return to Plan' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
