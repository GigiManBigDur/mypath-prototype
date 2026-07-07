import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES, MAX_TAGS } from '../data/interests';
import { useApp } from '../context/AppContext';

const LEVELS = [
  { id: 'highschool', label: 'High School' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'transfer', label: 'Transfer' },
];

export default function SurveyScreen() {
  const { state, patch } = useApp();
  const [openCategory, setOpenCategory] = useState(null);

  const toggleTag = (name) => {
    const has = state.interestTags.includes(name);
    if (has) {
      patch({ interestTags: state.interestTags.filter((t) => t !== name) });
    } else if (state.interestTags.length < MAX_TAGS) {
      patch({ interestTags: [...state.interestTags, name] });
    }
  };

  const canContinue = state.interestTags.length > 0 && !!state.educationLevel;

  return (
    <div>
      <div className="eyebrow">Step 1 of 5</div>
      <h1 className="page-title">Let's build your plan.</h1>
      <p className="page-sub">
        Answer three quick questions and we'll put together a personalized roadmap — no
        account, no guesswork.
      </p>

      <div className="field-block">
        <div className="field-label">What are your biggest passions or interests?</div>
        <p className="field-hint">Pick 1–3 tags across any categories below.</p>
        <div className="selection-count">{state.interestTags.length} / {MAX_TAGS} selected</div>

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
                    const disabled = !selected && state.interestTags.length >= MAX_TAGS;
                    return (
                      <button
                        type="button"
                        key={t.name}
                        className={`tag${selected ? ' selected' : ''}`}
                        disabled={disabled}
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
              onClick={() => patch({ educationLevel: lvl.id })}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <div className="field-label">What are your current grades?</div>
        <p className="field-hint">Optional — GPA on a 0.0–4.0 scale.</p>
        <input
          type="number"
          min="0"
          max="4"
          step="0.01"
          placeholder="3.50"
          className="gpa-input"
          value={state.gpa}
          onChange={(e) => patch({ gpa: e.target.value })}
        />
      </div>

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
