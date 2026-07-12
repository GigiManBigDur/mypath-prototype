import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GraduationCap, BookOpen, Award, Clock, Scale, Star, FileCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOpportunityTracks, TRACK_LABELS } from '../data/interests';
import { COURSES, getCourseById, WEIGHT_MULTIPLIERS } from '../data/courses';
import { getRecommendedCourses } from '../data/courseRecommendations';
import StepProgress from '../components/StepProgress';

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

export default function CourseSelectionScreen() {
  const { state, patch } = useApp();
  const isHighSchool = state.educationLevel === 'highschool';

  // Defensive: same reasoning as TranscriptScreen's own bounce — Course Selection only applies to
  // High School, and routing already never sends anyone else here, but state restored mid-flow
  // after educationLevel changed shouldn't render this screen anyway.
  useEffect(() => {
    if (!isHighSchool) patch({ screen: 'opportunities' });
  }, [isHighSchool]);

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

  const toggleCourse = (id) => {
    const has = state.selectedCourseIds.includes(id);
    patch({
      selectedCourseIds: has
        ? state.selectedCourseIds.filter((c) => c !== id)
        : [...state.selectedCourseIds, id],
    });
  };

  const toggleInFilter = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const selectedCourses = state.selectedCourseIds.map((id) => getCourseById(id)).filter(Boolean);

  if (!isHighSchool) return null;

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'transcript' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={5} total={8} />
      <h1 className="page-title">Course Selection</h1>
      <p className="page-sub">
        Pick the courses you're planning to take, built around what your school actually offers.
      </p>

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
        {courses.map((course) => {
          const selected = state.selectedCourseIds.includes(course.id);
          return (
            <button
              type="button"
              key={course.id}
              className={`card${selected ? ' selected' : ''}`}
              onClick={() => toggleCourse(course.id)}
            >
              <div className="card-title">{course.name}</div>
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
              <p className="card-desc">{course.description}</p>
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
            </button>
          );
        })}
      </div>

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
        <button type="button" className="btn btn-primary" onClick={() => patch({ screen: 'opportunities' })}>
          Continue
        </button>
      </div>
    </div>
  );
}
