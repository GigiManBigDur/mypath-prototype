import { useState } from 'react';
import { SCHOOLS } from '../data/schools';

// A search/select field, not a plain dropdown — SCHOOLS only has one real entry right now, but
// the UI is built to filter a list so more schools can be added later without changing this
// component. `value` is the confirmed selection (or ''); typing something that no longer matches
// the current selection clears it, so `canContinue` on the caller's side can't stay true against
// stale text the user has since edited away from. `schools` defaults to SCHOOLS (Roslyn's own
// list) but SurveyScreen passes COLLEGE_SCHOOLS (UC Davis) for Undergraduate/Transfer students —
// the component itself has no opinion on which list it's searching.
export default function SchoolSearchField({ value, onChange, schools = SCHOOLS }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);

  const matches = schools.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()));

  const selectSchool = (school) => {
    onChange(school);
    setQuery(school);
    setOpen(false);
  };

  const handleChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (value && next !== value) onChange('');
  };

  return (
    <div className="school-search">
      <input
        type="text"
        className="school-search-input"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search for your school..."
      />
      {open && (
        <div className="school-search-results">
          {matches.length > 0 ? matches.map((s) => (
            <button
              type="button"
              key={s}
              className="school-search-option"
              // onMouseDown (not onClick) fires before the input's onBlur closes this dropdown,
              // so the selection still registers instead of the option vanishing first.
              onMouseDown={() => selectSchool(s)}
            >
              {s}
            </button>
          )) : (
            <div className="school-search-empty">No matching schools yet — more coming soon.</div>
          )}
        </div>
      )}
    </div>
  );
}
