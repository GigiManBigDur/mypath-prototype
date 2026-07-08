// Each tag maps to a "track". BUILT_TRACKS have full career/major/program data (Screen 3
// discovery chain runs for these). OPPORTUNITY_TRACKS is broader — every track in it has real,
// tailored content in Screen 4 (Opportunity Finder) even if it has no career/major/program data
// of its own. A tag whose track is 'other' (currently just "Law") falls back to the fully
// generic opportunity list — see getOpportunityTracks below.

export const BUILT_TRACKS = ['business', 'stem', 'healthcare', 'creative', 'academic'];

export const OPPORTUNITY_TRACKS = [
  ...BUILT_TRACKS,
  'sports',
  'community',
  'media',
  'lifestyle',
  'personal',
];

export const CATEGORIES = [
  {
    id: 'sports',
    label: 'Sports',
    tags: tag(['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Track & Field', 'Football'], 'sports'),
  },
  {
    id: 'academic',
    label: 'Academic',
    tags: [
      ...tag(['Mathematics'], 'stem'),
      ...tag(['Philosophy', 'History', 'Literature', 'Psychology', 'Political Science'], 'academic'),
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
    tags: tag(['Activism', 'Volunteering', 'Mentoring', 'Student Government', 'Nonprofit Work'], 'community'),
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
    tags: tag(['Gardening', 'Travel', 'Cooking', 'Fitness', 'Fashion'], 'lifestyle'),
  },
  {
    id: 'media',
    label: 'Media & Entertainment',
    tags: tag(['Film', 'Anime', 'Podcasts', 'Gaming', 'Music Industry'], 'media'),
  },
  {
    id: 'personal',
    label: 'Personal Development',
    tags: tag(['Journaling', 'Mindfulness', 'Productivity', 'Public Speaking', 'Goal Setting'], 'personal'),
  },
];

function tag(names, track) {
  return names.map((name) => ({ name, track }));
}

export const MAX_TAGS = 3;

const ALL_TAGS = CATEGORIES.flatMap((c) => c.tags);

function uniqueTracksFromTags(selectedTagNames, allowedTracks) {
  const tracks = [];
  for (const name of selectedTagNames) {
    const found = ALL_TAGS.find((t) => t.name === name);
    const track = found?.track;
    if (track && allowedTracks.includes(track) && !tracks.includes(track)) {
      tracks.push(track);
    }
  }
  return tracks;
}

// Unique built tracks (business/stem/healthcare/creative/academic) among the selected tags, in
// the order the student picked them. Drives the Screen 3 discovery chain — an empty result
// means Discovery is skipped entirely.
export function getBuiltTracks(selectedTagNames) {
  return uniqueTracksFromTags(selectedTagNames, BUILT_TRACKS);
}

// Unique tracks with real Opportunity Finder content among the selected tags. Broader than
// getBuiltTracks — includes tracks with no career/major/program data of their own. An empty
// result means every selected tag is truly unbuilt (currently only "Law"), so Screen 4 falls
// back to GENERIC_OPPORTUNITIES.
export function getOpportunityTracks(selectedTagNames) {
  return uniqueTracksFromTags(selectedTagNames, OPPORTUNITY_TRACKS);
}
