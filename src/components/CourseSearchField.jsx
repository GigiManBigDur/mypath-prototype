import { useState } from 'react';
import { searchCourses } from '../data/courses';

// A search/select over a real course catalog — no free-text course entry, matching Task 2's
// requirement. Unlike SchoolSearchField this doesn't track a persistent "current value" of its
// own; it's a pure "search, pick one, hand it to the caller, reset" input, since the caller
// (TranscriptScreen) treats a selection as one step in a larger multi-field "add a course" form,
// not the field's own final state. `search` defaults to Roslyn's searchCourses, but the UC Davis
// Transcript & GPA screen passes searchUCDavisCourses (ucdavisCourses.js) instead — same "caller
// picks the data source, component stays data-agnostic" pattern SchoolSearchField's own `schools`
// prop already established.
export default function CourseSearchField({ onSelect, placeholder, search = searchCourses }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = query.trim().length >= 2 ? search(query).slice(0, 8) : [];

  const selectCourse = (course) => {
    onSelect(course);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="course-search">
      <input
        type="text"
        className="school-search-input"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Search for a course...'}
      />
      {open && query.trim().length >= 2 && (
        <div className="school-search-results">
          {matches.length > 0 ? matches.map((c) => (
            <button
              type="button"
              key={c.id}
              className="school-search-option course-search-option"
              // onMouseDown (not onClick) fires before the input's onBlur closes this dropdown —
              // same reasoning as SchoolSearchField.
              onMouseDown={() => selectCourse(c)}
            >
              <span className="course-search-name">{c.name}</span>
              <span className="course-search-dept">{c.department}</span>
            </button>
          )) : (
            <div className="school-search-empty">No matching courses found.</div>
          )}
        </div>
      )}
    </div>
  );
}
