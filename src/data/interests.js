// Each tag maps to a "track". BUILT_TRACKS have full career/major/program data (Screen 3
// discovery chain runs for these). OPPORTUNITY_TRACKS is broader — every track in it has real,
// tailored content in Screen 4 (Opportunity Finder) even if it has no career/major/program data
// of its own. A tag whose track is 'other' (currently just "Law") falls back to the fully
// generic opportunity list — see getOpportunityTracks below.
//
// 'lifestyle' is the one remaining opportunity-only track: it now covers only Fitness/Fashion
// (Gardening/Travel moved to the built 'outdoors' track, Cooking moved to the built 'culinary'
// track — see the Lifestyle & Hobbies category below). Fitness/Fashion stay parked on generic
// opportunity content until they come up, same as "Law" — don't route them into a built track
// just because 'lifestyle' shares a name with the category.

export const BUILT_TRACKS = [
  'business', 'stem', 'healthcare', 'creative', 'academic',
  'sports', 'culinary', 'community', 'media', 'personal', 'outdoors',
];

export const OPPORTUNITY_TRACKS = [
  ...BUILT_TRACKS,
  'lifestyle',
];

// Human-readable track names — used to group the merged Careers of Interest pool by source track
// once the interest-tag cap was removed (Screen 3a can now realistically show cards from many
// tracks at once). Matches the track names already used in CLAUDE.md's testing checklist. Covers
// all of OPPORTUNITY_TRACKS (BUILT_TRACKS + 'lifestyle'), not just BUILT_TRACKS, since Opportunity
// Finder's "Browse all opportunities" track filter needs a label for every one of them, including
// the opportunity-only 'lifestyle' track (Fitness/Fashion) that has no career/major/program data.
export const TRACK_LABELS = {
  business: 'Business',
  stem: 'STEM',
  healthcare: 'Healthcare',
  creative: 'Creative',
  academic: 'Academic/Humanities',
  sports: 'Sports',
  culinary: 'Culinary Arts',
  community: 'Community & Leadership',
  media: 'Media & Entertainment',
  personal: 'Personal Development',
  outdoors: 'Outdoors',
  lifestyle: 'Lifestyle & Hobbies',
};

// Palette repaint, Discovery batch (see CLAUDE.md) — a lucide-react icon NAME per category, not a
// component reference, matching this codebase's standing "data holds icon NAMES, the screen owns
// the name->component map" convention (ProjectBuilderScreen's own CATEGORY_ICONS, SignUpScreen's
// AVATAR_OPTIONS). SurveyScreen.jsx owns the actual name->component lookup.
export const CATEGORIES = [
  {
    id: 'sports',
    label: 'Sports',
    icon: 'Dumbbell',
    tags: tag(['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Track & Field', 'Football'], 'sports'),
  },
  {
    id: 'academic',
    label: 'Academic',
    icon: 'GraduationCap',
    tags: [
      ...tag(['Mathematics'], 'stem'),
      ...tag(['Philosophy', 'History', 'Literature', 'Psychology', 'Political Science'], 'academic'),
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    icon: 'Palette',
    tags: tag(['Visual Arts', 'Music', 'Writing', 'Theater', 'Film Production', 'Photography'], 'creative'),
  },
  {
    id: 'tech',
    label: 'Technology & Digital',
    icon: 'Cpu',
    tags: tag(['3D Modeling', 'App Development', 'Robotics', 'Game Design', 'Cybersecurity', 'Data & AI'], 'stem'),
  },
  {
    id: 'community',
    label: 'Community & Leadership',
    icon: 'Users',
    tags: tag(['Activism', 'Volunteering', 'Mentoring', 'Student Government', 'Nonprofit Work'], 'community'),
  },
  {
    id: 'career',
    label: 'Career & Professional',
    icon: 'Briefcase',
    tags: [
      ...tag(['Business', 'Finance', 'Entrepreneurship', 'Marketing'], 'business'),
      ...tag(['Healthcare'], 'healthcare'),
      ...tag(['Law'], 'other'),
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & Hobbies',
    icon: 'Heart',
    tags: [
      ...tag(['Gardening', 'Travel'], 'outdoors'),
      ...tag(['Cooking'], 'culinary'),
      ...tag(['Fitness', 'Fashion'], 'lifestyle'),
    ],
  },
  {
    id: 'media',
    label: 'Media & Entertainment',
    icon: 'Film',
    tags: tag(['Film', 'Anime', 'Podcasts', 'Gaming', 'Music Industry'], 'media'),
  },
  {
    id: 'personal',
    label: 'Personal Development',
    icon: 'Sparkles',
    tags: tag(['Journaling', 'Mindfulness', 'Productivity', 'Public Speaking', 'Goal Setting'], 'personal'),
  },
];

// Palette repaint, Discovery batch (see CLAUDE.md) — one lucide-react icon name per TRACK (not
// per survey category above — tracks and categories are different concepts here, see this file's
// own top-of-file note on `academic` alone routing to two different tracks), used by the shared
// `TrackBadge`/`TrackIcon` components (`src/components/TrackVisuals.jsx`) so CareersStep/
// MajorsStep's own group headers and individual cards get a distinct, recognizable icon per
// subject area instead of a flat wall of text. Covers every OPPORTUNITY_TRACKS entry (BUILT_TRACKS
// + 'lifestyle') for the same reason `TRACK_LABELS` already does — Browse mode can reach any of
// them. Colors are assigned separately, by cycling the shared 7-color "bloom" accent palette in
// this same object's own key order — see TrackVisuals.jsx.
export const TRACK_ICON_NAMES = {
  business: 'Briefcase',
  stem: 'Cpu',
  healthcare: 'Stethoscope',
  creative: 'Palette',
  academic: 'GraduationCap',
  sports: 'Dumbbell',
  culinary: 'ChefHat',
  community: 'Users',
  media: 'Film',
  personal: 'Sparkles',
  outdoors: 'Mountain',
  lifestyle: 'Heart',
};

function tag(names, track) {
  return names.map((name) => ({ name, track }));
}

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
