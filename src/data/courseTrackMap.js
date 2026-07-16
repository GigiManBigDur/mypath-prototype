import { getTrackColor } from '../components/TrackVisuals';

// Palette repaint, Transcript/Course Selection batch (see CLAUDE.md) — reuses the EXACT same
// track colors Batch 1 already established for Survey's interest tags and Discovery's career/
// major cards (getTrackColor, TrackVisuals.jsx), rather than inventing a second, independent
// color mapping for courses. Roslyn's 11 real course departments (courses.js) map onto whichever
// track a student would reach the same subject through on Survey/Discovery — e.g. 'Math' courses
// get the same color 'Mathematics' (which routes to the 'stem' track) already has there.
//
// 'Special Education' is deliberately OMITTED, not mapped to a fallback track — its courses are
// IEP-driven placements, not tied to any one subject/interest area, so forcing a track color onto
// them would be exactly the kind of invented mapping this codebase's "don't guess" rule already
// forbids elsewhere (see courses.js's own note on why these 9 courses carry no fixed
// credit/gradeLevels either). `getDepartmentColor` returns `null` for it, and callers fall back to
// a neutral, uncolored treatment.
export const DEPARTMENT_TRACK_MAP = {
  Art: 'creative',
  Business: 'business',
  English: 'academic',
  Math: 'stem',
  'Music & Theater': 'creative',
  'Physical Education & Health': 'sports',
  Science: 'stem',
  'Social Studies': 'academic',
  'World Languages': 'academic',
  // Per courses.js's own header comment, this department covers "Robotics/AI/Computer Science/
  // Media & Communication/PLTW Engineering" — predominantly STEM content, so it's grouped there
  // rather than split by individual course (its own Media & Communication slice is a real, if
  // smaller, overlap with the 'media' track, but forcing a per-course split here isn't worth the
  // added complexity for a handful of courses).
  '21st Century Learning': 'stem',
};

export function getDepartmentColor(department) {
  const track = DEPARTMENT_TRACK_MAP[department];
  return track ? getTrackColor(track) : null;
}

// UC Davis's own 6 real subject areas (UCDAVIS_AREAS, ucdavisCourses.js) mapped the same way —
// Biology/Pre-Med -> 'healthcare' (not 'stem'), matching how "Healthcare" itself is a distinct
// track from STEM elsewhere in this app; Horticulture/Ag & Environment -> 'outdoors', matching
// Gardening's own track (see interests.js's Lifestyle & Hobbies category and the Gardening/
// Horticulture UC Davis section in CLAUDE.md).
export const UCDAVIS_AREA_TRACK_MAP = {
  psychology: 'academic',
  'political-science': 'academic',
  'cs-engineering': 'stem',
  'business-economics': 'business',
  'biology-premed': 'healthcare',
  'horticulture-ag': 'outdoors',
};

export function getUCDavisAreaColor(areaId) {
  const track = UCDAVIS_AREA_TRACK_MAP[areaId];
  return track ? getTrackColor(track) : null;
}
