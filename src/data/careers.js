// CAREERS[track][level] -> array of 3 career cards.
// 'highschool' and 'transfer' education levels see the same (undergrad-track) careers;
// 'undergraduate' sees more advanced careers that require a graduate degree next.

import { MAJORS } from './majors';

export const CAREERS = {
  business: {
    highschool: [
      {
        id: 'business-analyst',
        name: 'Business Analyst',
        overview: 'Helps companies improve processes and make data-informed decisions.',
        salary: '~$75k–$95k',
        requiredEducation: "Bachelor's in Business or related field",
        relevantMajors: ['business-administration', 'finance', 'economics'],
      },
      {
        id: 'entrepreneur',
        name: 'Entrepreneur / Founder',
        overview: 'Builds and runs a new business or venture from the ground up.',
        salary: 'Highly variable',
        requiredEducation: "Bachelor's common but not required",
        relevantMajors: ['business-administration', 'entrepreneurship', 'marketing'],
      },
      {
        id: 'marketing-manager',
        name: 'Marketing Manager',
        overview: 'Leads campaigns and brand strategy for a company or product.',
        salary: '~$70k–$140k',
        requiredEducation: "Bachelor's in Marketing or Business",
        relevantMajors: ['marketing', 'communications', 'business-administration'],
      },
    ],
    undergraduate: [
      {
        id: 'management-consultant',
        name: 'Management Consultant',
        overview: 'Advises companies on strategy, operations, and organizational change at a senior level.',
        salary: '~$90k–$150k',
        requiredEducation: "Master's (often an MBA)",
        // 'economics' added alongside 'mba' (UC Davis partner-school addition) — not every
        // undergraduate exploring this career already holds the MBA; an econ bachelor's is a real,
        // common direct pipeline into consulting, and without this the 'economics' major (and its
        // programs, including the new UC Davis one) was otherwise unreachable at this education
        // level — 'undergraduate' tier careers in this track only ever referenced grad-level majors
        // before this.
        relevantMajors: ['mba', 'economics'],
      },
      {
        id: 'investment-banker',
        name: 'Investment Banker / Finance Director',
        overview: 'Leads high-stakes financial deals, capital raising, and investment strategy for firms or clients.',
        salary: '~$100k–$200k+',
        requiredEducation: "Master's in Finance or MBA",
        relevantMajors: ['ms-finance', 'mba'],
      },
      {
        id: 'marketing-director',
        name: 'Marketing Director',
        overview: 'Owns brand and growth strategy across an entire product line or company.',
        salary: '~$110k–$180k',
        requiredEducation: "Master's in Marketing Analytics or MBA",
        relevantMajors: ['ms-marketing-analytics', 'mba'],
      },
    ],
  },
  stem: {
    highschool: [
      {
        id: 'software-engineer',
        name: 'Software Engineer',
        overview: 'Designs and builds applications and systems.',
        salary: '~$85k–$130k',
        requiredEducation: "Bachelor's in CS or related",
        relevantMajors: ['computer-science', 'software-engineering', 'computer-engineering'],
      },
      {
        id: 'mechanical-engineer',
        name: 'Mechanical Engineer',
        overview: 'Designs physical systems and mechanical products.',
        salary: '~$70k–$95k',
        requiredEducation: "Bachelor's in Mechanical Engineering",
        relevantMajors: ['mechanical-engineering', 'aerospace-engineering'],
      },
      {
        id: 'data-scientist',
        name: 'Data Scientist',
        overview: 'Analyzes data to find patterns and guide decisions.',
        salary: '~$90k–$140k',
        requiredEducation: "Bachelor's/Master's in a quantitative field",
        relevantMajors: ['data-science', 'statistics', 'computer-science'],
      },
    ],
    undergraduate: [
      {
        id: 'ml-engineer',
        name: 'Machine Learning Engineer / AI Research Scientist',
        overview: 'Builds and researches the models behind modern AI systems.',
        salary: '~$120k–$180k',
        requiredEducation: "Master's or PhD in CS or related",
        // 'computer-science' added alongside 'ms-ai-ml' — same reachability fix as
        // management-consultant above (UC Davis partner-school addition): a CS bachelor's is the
        // direct undergrad pipeline into this career, and this track's undergraduate tier
        // otherwise only referenced grad-level majors.
        relevantMajors: ['ms-ai-ml', 'computer-science'],
      },
      {
        id: 'robotics-engineer',
        name: 'Robotics Engineer',
        overview: 'Designs autonomous systems that combine mechanical, electrical, and software engineering.',
        salary: '~$95k–$150k',
        requiredEducation: "Master's in Robotics or Mechanical Engineering",
        relevantMajors: ['ms-robotics'],
      },
      {
        id: 'senior-data-scientist',
        name: 'Quantitative Researcher / Senior Data Scientist',
        overview: 'Leads advanced modeling and research work, often in finance, tech, or applied science.',
        salary: '~$130k–$200k',
        requiredEducation: "Master's or PhD in Statistics, CS, or Applied Math",
        relevantMajors: ['ms-data-science'],
      },
    ],
  },
  healthcare: {
    highschool: [
      {
        id: 'registered-nurse',
        name: 'Registered Nurse (RN)',
        overview: 'Provides direct patient care and coordinates with doctors across clinical settings.',
        salary: '~$70k–$90k',
        requiredEducation: "BSN (Bachelor of Science in Nursing) or Associate's + NCLEX-RN licensure",
        relevantMajors: ['nursing'],
      },
      {
        id: 'physician',
        name: 'Physician (MD/DO)',
        overview: 'Diagnoses and treats patients; requires the longest training path of any career shown here.',
        salary: 'Highly variable, often $200k+ after full training',
        requiredEducation: "Bachelor's + Medical School + Residency",
        relevantMajors: ['biology-premed'],
      },
      {
        id: 'physical-therapist',
        name: 'Physical Therapist',
        overview: 'Helps patients recover mobility and manage pain after injury or surgery.',
        salary: '~$85k–$100k',
        requiredEducation: "Doctor of Physical Therapy (DPT), ~3 years post-bachelor's",
        relevantMajors: ['kinesiology'],
      },
    ],
    undergraduate: [
      {
        id: 'physician-grad',
        name: 'Physician (MD/DO)',
        overview: 'Diagnoses and treats patients through a hospital or private practice after full medical training.',
        salary: 'Highly variable, often $200k+ after full training',
        requiredEducation: 'Doctor of Medicine (MD) or Doctor of Osteopathic Medicine (DO)',
        // 'biology-premed' added alongside 'md-do' — same reachability fix as above (UC Davis
        // partner-school addition): a bio-premed bachelor's is the direct undergrad pipeline into
        // becoming an MD/DO, and this track's undergraduate tier otherwise only referenced the
        // grad-level major.
        relevantMajors: ['md-do', 'biology-premed'],
      },
      {
        id: 'physician-assistant',
        name: 'Physician Assistant',
        overview: 'Practices medicine under physician supervision — diagnosing, treating, and prescribing.',
        salary: '~$100k–$130k',
        requiredEducation: "Master's in Physician Assistant Studies",
        relevantMajors: ['ms-physician-assistant'],
      },
      {
        id: 'nurse-practitioner',
        name: 'Nurse Practitioner',
        overview: 'Provides advanced clinical care, often with authority to diagnose and prescribe independently.',
        salary: '~$110k–$140k',
        requiredEducation: 'MSN or DNP (Master of/Doctor of Nursing Practice)',
        relevantMajors: ['msn-np'],
      },
    ],
  },
  creative: {
    highschool: [
      {
        id: 'graphic-designer',
        name: 'Graphic Designer',
        overview: 'Creates visual content for brands, media, and products.',
        salary: '~$50k–$75k',
        requiredEducation: "Bachelor's in Design or strong portfolio (degree not always required)",
        relevantMajors: ['graphic-design'],
      },
      {
        id: 'film-producer',
        name: 'Film/Video Producer or Director',
        overview: 'Oversees the creative and logistical process of making film or video content.',
        salary: 'Highly variable',
        requiredEducation: "Bachelor's in Film common, not required",
        relevantMajors: ['film-production'],
      },
      {
        id: 'musician',
        name: 'Musician / Composer',
        overview: 'Performs or writes original music professionally.',
        salary: 'Highly variable',
        requiredEducation: "Bachelor's in Music common for composers, not required for performers",
        relevantMajors: ['music'],
      },
    ],
    undergraduate: [
      {
        id: 'creative-director',
        name: 'Creative Director / Art Director',
        overview: 'Leads the creative vision and team for a brand, agency, or studio.',
        salary: '~$100k–$160k',
        requiredEducation: 'MFA or extensive professional portfolio',
        relevantMajors: ['mfa-design'],
      },
      {
        id: 'film-director-advanced',
        name: 'Film Director',
        overview: 'Directs feature or narrative film projects at a professional level.',
        salary: 'Highly variable',
        requiredEducation: 'MFA in Film common at this level',
        relevantMajors: ['mfa-film'],
      },
      {
        id: 'composer-advanced',
        name: 'Composer / Music Director',
        overview: 'Writes and conducts original music for film, ensembles, or media at a professional level.',
        salary: 'Highly variable',
        requiredEducation: "Master's in Music Composition or Conducting",
        relevantMajors: ['mm-composition'],
      },
    ],
  },
  academic: {
    highschool: [
      {
        id: 'lawyer',
        name: 'Lawyer / Attorney',
        overview: 'Represents clients, interprets law, and argues cases in or out of court.',
        salary: '~$85k–$145k+',
        requiredEducation: "Bachelor's + Law School (JD) + passing the bar exam",
        relevantMajors: ['political-science-prelaw'],
      },
      {
        id: 'historian',
        name: 'Historian / Archivist / Museum Curator',
        overview: 'Researches, preserves, and interprets historical records and artifacts for museums, archives, or educational institutions.',
        salary: '~$55k–$75k',
        requiredEducation: "Bachelor's (Master's often preferred for curator/archivist roles)",
        relevantMajors: ['history'],
      },
      {
        id: 'psychologist',
        name: 'Psychologist',
        overview: 'Studies human behavior and mental processes; works in clinical, counseling, or research settings.',
        salary: '~$85k–$100k (varies significantly by specialty)',
        requiredEducation: "Bachelor's + Doctorate (PhD or PsyD) for licensed clinical practice",
        relevantMajors: ['psychology'],
      },
    ],
    undergraduate: [
      {
        id: 'attorney-jd',
        name: 'Attorney (JD)',
        overview: 'Practices law after completing law school and passing the bar — the direct next step from a pre-law bachelor\'s.',
        salary: '~$85k–$200k+',
        requiredEducation: 'JD (Juris Doctor)',
        // 'political-science-prelaw' added alongside 'jd-law' — same reachability fix as above (UC
        // Davis partner-school addition): a poli-sci/pre-law bachelor's is the direct undergrad
        // pipeline into a JD, and this track's undergraduate tier otherwise only referenced the
        // grad-level major.
        relevantMajors: ['jd-law', 'political-science-prelaw'],
      },
      {
        id: 'research-historian',
        name: 'Professor / Research Historian',
        overview: 'Conducts original historical research and teaches at the university level.',
        salary: '~$60k–$90k',
        requiredEducation: 'PhD in History',
        relevantMajors: ['phd-history'],
      },
      {
        id: 'clinical-psychologist',
        name: 'Clinical Psychologist',
        overview: 'Provides licensed therapy and clinical assessment after doctoral training.',
        salary: '~$90k–$120k',
        requiredEducation: 'PsyD or PhD in Clinical Psychology',
        // 'psychology' added alongside 'psyd-clinical-psych' — same reachability fix as above (UC
        // Davis partner-school addition): a psychology bachelor's is the direct undergrad pipeline
        // into this career, and this track's undergraduate tier otherwise only referenced the
        // grad-level major.
        relevantMajors: ['psyd-clinical-psych', 'psychology'],
      },
    ],
  },
  // ---- Sports, Culinary Arts, Community & Leadership, Media & Entertainment, Personal
  // Development, and Outdoors (Gardening/Travel) don't currently distinguish an "advanced,
  // requires a grad degree next" undergraduate tier the way the original 5 tracks do — the
  // source spec for these gave one career list, not two, so `undergraduate` below is a
  // deliberate direct reuse of `highschool`, not a placeholder waiting to be filled in.
  sports: {
    highschool: [
      {
        id: 'athletic-trainer',
        name: 'Athletic Trainer',
        overview: 'Prevents and treats injuries for athletes, working closely with teams and sports medicine staff.',
        salary: '~$50k–$60k',
        requiredEducation: "Master's in Athletic Training + certification (current entry standard)",
        relevantMajors: ['kinesiology'],
      },
      {
        id: 'sports-management-admin',
        name: 'Sports Management / Athletics Administrator',
        overview: 'Manages operations for sports teams, leagues, or school/college athletic departments.',
        salary: '~$45k–$70k+ (higher at pro level)',
        requiredEducation: "Bachelor's in Sports Management or Business",
        relevantMajors: ['sports-management', 'business-administration'],
      },
      {
        id: 'coach',
        name: 'Coach',
        overview: 'Trains and leads athletes or teams in a specific sport.',
        salary: '~$40k–$60k (varies widely by level)',
        requiredEducation: 'Bachelor\'s often preferred; certification varies by sport',
        relevantMajors: ['kinesiology'],
      },
    ],
  },
  culinary: {
    highschool: [
      {
        id: 'chef',
        name: 'Chef / Culinary Professional',
        overview: 'Prepares food and leads kitchen operations at restaurants or hotels.',
        salary: '~$45k–$65k (executive chefs higher)',
        requiredEducation: 'Culinary degree/certificate or apprenticeship — not always a 4-year degree',
        relevantMajors: ['culinary-arts', 'hospitality-management'],
      },
      {
        id: 'food-scientist',
        name: 'Food Scientist',
        overview: 'Researches and develops food products, safety, and quality processes.',
        salary: '~$65k–$85k',
        requiredEducation: "Bachelor's in Food Science or related field",
        relevantMajors: ['food-science'],
      },
      {
        id: 'restaurant-manager',
        name: 'Restaurant / Hospitality Manager',
        overview: 'Oversees operations of restaurants or hospitality venues.',
        salary: '~$50k–$70k',
        requiredEducation: "Bachelor's in Hospitality Management or Business",
        relevantMajors: ['hospitality-management', 'business-administration'],
      },
    ],
  },
  community: {
    highschool: [
      {
        id: 'nonprofit-program-manager',
        name: 'Nonprofit Program Manager',
        overview: 'Manages programs and operations for nonprofit organizations.',
        salary: '~$50k–$70k',
        requiredEducation: "Bachelor's in Nonprofit Management, Public Administration, or related",
        relevantMajors: ['nonprofit-management'],
      },
      {
        id: 'social-worker',
        name: 'Social Worker',
        overview: 'Helps individuals, families, and communities navigate challenges and access resources.',
        salary: '~$50k–$60k',
        requiredEducation: 'Bachelor\'s (BSW) minimum; Master\'s (MSW) for clinical practice',
        relevantMajors: ['social-work'],
      },
      {
        id: 'community-organizer',
        name: 'Community Organizer / Policy Advocate',
        overview: 'Organizes communities around causes; works with advocacy organizations or campaigns.',
        salary: '~$40k–$65k',
        requiredEducation: "Bachelor's in Political Science, Public Policy, or related",
        relevantMajors: ['political-science-prelaw'],
      },
    ],
  },
  media: {
    highschool: [
      {
        id: 'journalist',
        name: 'Journalist / Content Creator',
        overview: 'Researches, writes, and produces news or media content across platforms.',
        salary: '~$45k–$65k',
        requiredEducation: "Bachelor's in Journalism, Communications, or English",
        relevantMajors: ['journalism'],
      },
      {
        id: 'podcast-producer',
        name: 'Audio/Podcast Producer',
        overview: 'Plans, records, and edits audio content and podcasts.',
        salary: '~$45k–$65k',
        requiredEducation: 'Bachelor\'s in Communications or Media Production helpful, not always required',
        relevantMajors: ['journalism', 'film-production'],
      },
      {
        id: 'film-video-producer',
        name: 'Film/Video Producer or Director',
        overview: 'Oversees the creative and logistical process of making film or video content.',
        salary: 'Highly variable',
        requiredEducation: "Bachelor's in Film common, not required",
        relevantMajors: ['film-production'],
      },
    ],
  },
  personal: {
    highschool: [
      {
        id: 'life-coach',
        name: 'Life / Wellness Coach',
        overview: 'Helps individuals set and achieve personal or professional goals.',
        salary: '~$40k–$60k (highly variable, many self-employed)',
        requiredEducation: 'No formal degree required; certification programs common (e.g., ICF)',
        relevantMajors: ['psychology'],
      },
      {
        id: 'counselor-therapist',
        name: 'Counselor / Therapist',
        overview: 'Helps individuals work through mental health, behavioral, or life challenges.',
        salary: '~$50k–$60k',
        requiredEducation: "Master's in Counseling or related, plus licensure",
        relevantMajors: ['psychology'],
      },
      {
        id: 'hr-od-specialist',
        name: 'HR / Organizational Development Specialist',
        overview: 'Helps organizations build employee wellness, training, and development programs.',
        salary: '~$55k–$70k',
        requiredEducation: "Bachelor's in HR, Psychology, or Business",
        relevantMajors: ['human-resources', 'psychology'],
      },
    ],
  },
  outdoors: {
    highschool: [
      {
        id: 'horticulturist',
        name: 'Horticulturist / Landscape Architect',
        overview: 'Designs, grows, and maintains plants, gardens, and landscapes professionally.',
        salary: '~$50k–$70k (landscape architects often higher)',
        requiredEducation: "Bachelor's in Horticulture or Landscape Architecture",
        relevantMajors: ['horticulture'],
      },
      {
        id: 'travel-tourism-manager',
        name: 'Travel / Tourism Manager',
        overview: 'Plans and manages travel experiences, tourism operations, or destination marketing.',
        salary: '~$45k–$65k',
        requiredEducation: "Bachelor's in Tourism Management, Hospitality, or Business",
        relevantMajors: ['tourism-management'],
      },
    ],
  },
};

// Transfer students see the same undergraduate-level careers as high schoolers.
CAREERS.business.transfer = CAREERS.business.highschool;
CAREERS.stem.transfer = CAREERS.stem.highschool;
CAREERS.healthcare.transfer = CAREERS.healthcare.highschool;
CAREERS.creative.transfer = CAREERS.creative.highschool;
CAREERS.academic.transfer = CAREERS.academic.highschool;

// These 6 tracks use one career list for every education level (see the comment above) — wire
// undergraduate/transfer to the same array reference rather than duplicating it.
for (const t of ['sports', 'culinary', 'community', 'media', 'personal', 'outdoors']) {
  CAREERS[t].undergraduate = CAREERS[t].highschool;
  CAREERS[t].transfer = CAREERS[t].highschool;
}

// UC Davis partner-school addition (Undergraduate/Transfer only — High School stays Roslyn-only,
// same boundary Course Selection/"My School" already established). These 2 careers exist
// specifically because of UC Davis's genuine strength in Horticulture/Sustainable Agriculture (see
// programs.js's own comments), so they override the generic alias above just for Outdoors —
// appended on top of the existing 2 careers, not replacing them, and only for these two levels.
// High School's own CAREERS.outdoors.highschool array (set above) is untouched, which is what
// actually keeps 'sustainable-agriculture-food-systems' unreachable from that flow — it's only
// ever referenced by these 2 careers, and High School never sees them.
const outdoorsCollegeOnlyCareers = [
  {
    id: 'environmental-policy-analyst',
    name: 'Environmental Policy Analyst / Scientist',
    overview: 'Studies environmental issues and helps shape policy around sustainability, conservation, and climate.',
    salary: '~$55k–$80k',
    requiredEducation: "Bachelor's in Environmental Science, Policy, or a related field",
    relevantMajors: ['sustainable-agriculture-food-systems', 'horticulture'],
  },
  {
    id: 'sustainable-agriculture-specialist',
    name: 'Sustainable Agriculture Specialist',
    overview: 'Works on sustainable farming and food-system practices for farms, agribusinesses, or government agencies.',
    salary: '~$45k–$65k',
    requiredEducation: "Bachelor's in Sustainable Agriculture, Food Systems, or a related field",
    relevantMajors: ['sustainable-agriculture-food-systems'],
  },
];
CAREERS.outdoors.undergraduate = [...CAREERS.outdoors.highschool, ...outdoorsCollegeOnlyCareers];
CAREERS.outdoors.transfer = [...CAREERS.outdoors.highschool, ...outdoorsCollegeOnlyCareers];

// Merged career list across the given built tracks for one education level — the pool that
// callers filter by selectedCareerIds against (roadmapGenerator.js, DiscoveryScreen's own
// toggle/id logic). Flat and un-grouped, since those consumers only care about ids.
export function getCareerPool(tracks, level) {
  return tracks.flatMap((t) => CAREERS[t]?.[level] || []);
}

// Same pool, grouped by source track instead of flattened — what CareersStep.jsx actually
// renders. Removing the interest-tag cap means a student can realistically select tags across
// many tracks at once, so Screen 3a groups results under a header per track (in the order the
// student's tags produced them, via `tracks` — see getBuiltTracks) rather than one flat,
// undifferentiated list. Tracks with no careers for this level are simply omitted, same as they
// always were in the flat pool.
export function getCareerGroups(tracks, level) {
  return tracks
    .map((t) => ({ track: t, careers: CAREERS[t]?.[level] || [] }))
    .filter((g) => g.careers.length > 0);
}

// Every major reachable via ANY of the given tracks' own careers at this level, grouped by
// source track — the "Browse all majors" analog of getCareerGroups above (MAJORS itself has no
// per-major track field; a major's track is only ever derived through whichever career(s)
// reference it). A major reachable from more than one track's careers (e.g.
// 'business-administration', deliberately reused by 'sports'/'culinary' since those newer tracks
// don't have their own dedicated business-type major — see CLAUDE.md) is grouped under the FIRST
// track that references it, in `tracks` order, and not repeated in a later group — same
// first-track-wins merge precedent getOpportunityPool already uses for opportunities sharing an
// id across tracks. Tracks that reference no majors at this level are omitted, same as
// getCareerGroups.
export function getMajorGroups(tracks, level) {
  const seen = new Set();
  const groups = [];
  for (const track of tracks) {
    const majorIds = [...new Set(getCareerPool([track], level).flatMap((c) => c.relevantMajors))]
      .filter((id) => !seen.has(id));
    majorIds.forEach((id) => seen.add(id));
    if (majorIds.length) groups.push({ track, majors: majorIds.map((id) => MAJORS[id]) });
  }
  return groups;
}
