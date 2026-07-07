// Each tag maps to a "track" that drives Screens 3 & 4.
// Only 'business' and 'stem' have full content; everything else is 'other' (coming-soon placeholder).

export const CATEGORIES = [
  {
    id: 'sports',
    label: 'Sports',
    tags: tag(['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Track & Field', 'Football'], 'other'),
  },
  {
    id: 'academic',
    label: 'Academic',
    tags: tag(['Philosophy', 'Mathematics', 'History', 'Literature', 'Psychology', 'Political Science'], 'other'),
  },
  {
    id: 'creative',
    label: 'Creative',
    tags: tag(['Visual Arts', 'Music', 'Writing', 'Theater', 'Film Production', 'Photography'], 'other'),
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
      ...tag(['Healthcare', 'Law'], 'other'),
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

// First selected tag determines the primary track — matches how a student would
// naturally lead with their strongest interest.
export function resolvePrimaryTrack(selectedTagNames) {
  if (!selectedTagNames.length) return null;
  const allTags = CATEGORIES.flatMap((c) => c.tags);
  const first = allTags.find((t) => t.name === selectedTagNames[0]);
  return first ? first.track : 'other';
}
