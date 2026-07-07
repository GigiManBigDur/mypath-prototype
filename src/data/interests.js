// Each tag maps to a "track" that drives Screens 3 & 4.
// 'business', 'stem', 'healthcare', and 'creative' have full content; everything else is
// 'other' (generic fallback — see getBuiltTracks below).

export const BUILT_TRACKS = ['business', 'stem', 'healthcare', 'creative'];

export const CATEGORIES = [
  {
    id: 'sports',
    label: 'Sports',
    tags: tag(['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Track & Field', 'Football'], 'other'),
  },
  {
    id: 'academic',
    label: 'Academic',
    tags: [
      ...tag(['Mathematics'], 'stem'),
      ...tag(['Philosophy', 'History', 'Literature', 'Psychology', 'Political Science'], 'other'),
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    tags: tag(['Visual Arts', 'Music', 'Writing', 'Theater', 'Film Production', 'Photography'], 'creative'),
  },
  {
    id: 'tech',
    label: 'Technology & Digital',
    tags: tag(['3D Modeling', 'App Development', 'Robotics', 'Game Design', 'Cybersecurity', 'Data & AI'], 'stem'),
  },
  {
    id: 'community',
    label: 'Community & Leadership',
    tags: tag(['Activism', 'Volunteering', 'Mentoring', 'Student Government', 'Nonprofit Work'], 'other'),
  },
  {
    id: 'career',
    label: 'Career & Professional',
    tags: [
      ...tag(['Business', 'Finance', 'Entrepreneurship', 'Marketing'], 'business'),
      ...tag(['Healthcare'], 'healthcare'),
      ...tag(['Law'], 'other'),
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & Hobbies',
    tags: tag(['Gardening', 'Travel', 'Cooking', 'Fitness', 'Fashion'], 'other'),
  },
  {
    id: 'media',
    label: 'Media & Entertainment',
    tags: tag(['Film', 'Anime', 'Podcasts', 'Gaming', 'Music Industry'], 'other'),
  },
  {
    id: 'personal',
    label: 'Personal Development',
    tags: tag(['Journaling', 'Mindfulness', 'Productivity', 'Public Speaking', 'Goal Setting'], 'other'),
  },
];

function tag(names, track) {
  return names.map((name) => ({ name, track }));
}

export const MAX_TAGS = 3;

const ALL_TAGS = CATEGORIES.flatMap((c) => c.tags);

// Unique built tracks (business/stem/healthcare/creative) among the selected tags,
// in the order the student picked them. Tags that map to 'other' are dropped —
// callers treat an empty result as "fully unbuilt, use the generic fallback".
export function getBuiltTracks(selectedTagNames) {
  const tracks = [];
  for (const name of selectedTagNames) {
    const found = ALL_TAGS.find((t) => t.name === name);
    const track = found?.track;
    if (track && BUILT_TRACKS.includes(track) && !tracks.includes(track)) {
      tracks.push(track);
    }
  }
  return tracks;
}
