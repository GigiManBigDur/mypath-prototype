import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '../data/interests';
import { useApp } from '../context/AppContext';
import StepProgress from '../components/StepProgress';
import SchoolSearchField from '../components/SchoolSearchField';
import { SCHOOLS, COLLEGE_SCHOOLS } from '../data/schools';

const LEVELS = [
  { id: 'highschool', label: 'High School' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'transfer', label: 'Transfer' },
];

const YEAR_OPTIONS = {
  highschool: [
    { id: 9, label: '9th (Freshman)' },
    { id: 10, label: '10th (Sophomore)' },
    { id: 11, label: '11th (Junior)' },
    { id: 12, label: '12th (Senior)' },
  ],
  undergraduate: [
    { id: 1, label: '1st year' },
    { id: 2, label: '2nd year' },
    { id: 3, label: '3rd year' },
    { id: 4, label: '4th year' },
  ],
  transfer: [
    { id: 1, label: '1st year' },
    { id: 2, label: '2nd year' },
    { id: 3, label: '3rd year' },
  ],
};

export default function SurveyScreen() {
  const { state, patch } = useApp();
  const [openCategory, setOpenCategory] = useState(null);

  const toggleTag = (name) => {
    const has = state.interestTags.includes(name);
    patch({
      interestTags: has
        ? state.interestTags.filter((t) => t !== name)
        : [...state.interestTags, name],
    });
  };

  // The school selector (and, downstream, Transcript & GPA / Course Selection) applies to High
  // School (Roslyn) and, as of the UC Davis partner-school addition, to Undergraduate/Transfer
  // too (UC Davis) — see CLAUDE.md's "UC Davis Partner School" sections. Unlike High School
  // (where Roslyn is the only supported school and picking it is mandatory to continue), the
  // college field is deliberately OPTIONAL — most Undergraduate/Transfer students don't attend
  // UC Davis, and requiring them to pick it anyway would break "the existing generic flow,
  // completely unaffected" for the vast majority of college-level users. Only High School keeps
  // the hard requirement.
  const isHighSchool = state.educationLevel === 'highschool';
  const isCollege = state.educationLevel === 'undergraduate' || state.educationLevel === 'transfer';
  const hasSchoolField = isHighSchool || isCollege;
  const canContinue = state.interestTags.length > 0 && !!state.educationLevel && !!state.schoolYear
    && (!isHighSchool || !!state.currentSchool);

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => patch({ screen: 'welcome' })}>
        <ArrowLeft size={14} /> Back
      </button>

      <StepProgress step={1} total={9} />
      <h1 className="page-title">Let's build your plan.</h1>
      <p className="page-sub">
        Answer a few quick questions and we'll put together a personalized roadmap — no
        account, no guesswork.
      </p>

      <div className="field-block">
        <div className="field-label">What are your biggest passions or interests?</div>
        <p className="field-hint">Pick as many as you'd like, across any categories below.</p>
        <div className="selection-count">{state.interestTags.length} selected</div>

        {CATEGORIES.map((cat) => {
          const isOpen = openCategory === cat.id;
          const selectedInCat = cat.tags.filter((t) => state.interestTags.includes(t.name)).length;
          return (
            <div className="tag-category" key={cat.id}>
              <button
                type="button"
                className="tag-category-header"
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
              >
                <span>{cat.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedInCat > 0 && <span className="tag-category-count">{selectedInCat} selected</span>}
                  {isOpen ? <ChevronUp size={18} color="#4B5D54" /> : <ChevronDown size={18} color="#4B5D54" />}
                </span>
              </button>
              {isOpen && (
                <div className="tag-list">
                  {cat.tags.map((t) => {
                    const selected = state.interestTags.includes(t.name);
                    return (
                      <button
                        type="button"
                        key={t.name}
                        className={`tag${selected ? ' selected' : ''}`}
                        onClick={() => toggleTag(t.name)}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="field-block">
        <div className="field-label">What is your current education level?</div>
        <p className="field-hint">This shapes everything else in your plan.</p>
        <div className="pill-group">
          {LEVELS.map((lvl) => (
            <button
              type="button"
              key={lvl.id}
              className={`pill${state.educationLevel === lvl.id ? ' selected' : ''}`}
              onClick={() => patch({ educationLevel: lvl.id, schoolYear: null, currentSchool: '' })}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {state.educationLevel && (
        <div className="field-block">
          <div className="field-label">What year are you in?</div>
          <p className="field-hint">This scales your plan to how much time you actually have.</p>
          <div className="pill-group">
            {YEAR_OPTIONS[state.educationLevel].map((y) => (
              <button
                type="button"
                key={y.id}
                className={`pill${state.schoolYear === y.id ? ' selected' : ''}`}
                onClick={() => patch({ schoolYear: y.id })}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSchoolField && (
        <div className="field-block">
          <div className="field-label">What school do you currently attend?</div>
          <p className="field-hint">
            {isHighSchool
              ? 'Only Roslyn High School is available right now — more schools are coming soon.'
              : 'Only UC Davis is available right now — more schools are coming soon.'}
          </p>
          <SchoolSearchField
            schools={isHighSchool ? SCHOOLS : COLLEGE_SCHOOLS}
            value={state.currentSchool}
            onChange={(school) => patch({ currentSchool: school })}
          />
        </div>
      )}

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={() => patch({ screen: 'admissions' })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
