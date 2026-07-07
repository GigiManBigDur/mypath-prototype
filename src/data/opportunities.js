// OPPORTUNITIES[track][level] -> 3-4 cards.
// prepWeeks: how many weeks before the deadline the "Prepare for X" roadmap node should sit.

export const OPPORTUNITIES = {
  business: {
    highschool: [
      {
        id: 'deca',
        name: 'DECA',
        type: 'Competition',
        description: 'Business competition covering categories like marketing, finance, and entrepreneurship.',
        deadline: 'Registration opens in fall; competitions run through spring',
        howToApply: "Apply through your school's DECA chapter",
        resource: { label: 'deca.org', note: 'Official prep resources & practice cases' },
        prepWeeks: 3,
      },
      {
        id: 'fbla',
        name: 'FBLA (Future Business Leaders of America)',
        type: 'Competition / Leadership program',
        description: 'Similar business-focused competition and leadership program, school-chapter based.',
        deadline: 'Registration opens in fall; competitions run through spring',
        howToApply: "Apply through your school's FBLA chapter",
        resource: { label: 'fbla.org', note: 'Competitive event guidelines' },
        prepWeeks: 3,
      },
      {
        id: 'boa-leaders',
        name: 'Bank of America Student Leaders Program',
        type: 'Paid summer internship',
        description: 'Paid summer internship plus a leadership development summit for high schoolers.',
        deadline: 'Applications typically due in early winter',
        howToApply: 'Apply through the Bank of America Student Leaders website',
        resource: null,
        prepWeeks: 4,
      },
    ],
    undergraduate: [
      {
        id: 'cfa-challenge',
        name: 'CFA Institute Research Challenge',
        type: 'Team competition',
        description: 'Team-based equity research competition judged by finance professionals.',
        deadline: 'Registration typically opens in fall',
        howToApply: "Apply through your university's finance club or local CFA society",
        resource: null,
        prepWeeks: 4,
      },
      {
        id: 'case-competition',
        name: 'Regional Business Case Competition',
        type: 'Team competition',
        description: 'Teams solve a real business problem and pitch a solution to a judging panel.',
        deadline: 'Varies by host school, usually announced each semester',
        howToApply: "Apply through your business school's events office",
        resource: null,
        prepWeeks: 2,
      },
      {
        id: 'big-four-internship',
        name: 'Big Four Accounting Firm Internship Programs',
        type: 'Summer internship',
        description: 'Summer internships at Deloitte, PwC, EY, or KPMG, often a pipeline to full-time offers.',
        deadline: 'Applications typically due in fall/winter',
        howToApply: 'Apply directly through each firm\'s campus recruiting site',
        resource: null,
        prepWeeks: 5,
      },
    ],
  },
  stem: {
    highschool: [
      {
        id: 'science-olympiad',
        name: 'Science Olympiad',
        type: 'Competition',
        description: 'School-based STEM competition, team-based, runs through the school year.',
        deadline: 'Team registration in fall; competitions through spring',
        howToApply: "Join through your school's Science Olympiad team",
        resource: null,
        prepWeeks: 4,
      },
      {
        id: 'hackathons',
        name: 'Local & Regional Hackathons',
        type: 'Weekend competition',
        description: 'Weekend project-building competitions with peers, various dates throughout the year.',
        deadline: 'Rolling — new events posted throughout the year',
        howToApply: 'Find and register for events via mlh.io',
        resource: { label: 'mlh.io', note: 'Directory of student hackathons' },
        prepWeeks: 1,
      },
      {
        id: 'research-mentorship',
        name: 'University Summer Research Program',
        type: 'Research mentorship',
        description: 'Summer research opportunity paired with a university mentor in your area of interest.',
        deadline: 'Applications typically due in winter/early spring',
        howToApply: "Apply through the host university's summer research office",
        resource: null,
        prepWeeks: 4,
      },
    ],
    undergraduate: [
      {
        id: 'nsf-reu',
        name: 'NSF Research Experiences for Undergraduates (REU)',
        type: 'Funded summer research',
        description: 'NSF-funded summer research placements at host universities across the country.',
        deadline: 'Applications typically due February–March',
        howToApply: 'Browse and apply via the NSF REU site directory',
        resource: { label: 'nsf.gov/crssprgm/reu', note: 'Official REU site search' },
        prepWeeks: 5,
      },
      {
        id: 'mlh-hackathons',
        name: 'Major League Hacking (MLH) Hackathons',
        type: 'Weekend competition',
        description: 'Collegiate hackathons hosted at universities nationwide, rolling schedule.',
        deadline: 'Rolling — new events posted throughout the year',
        howToApply: 'Register for events via mlh.io',
        resource: { label: 'mlh.io', note: 'Directory of collegiate hackathons' },
        prepWeeks: 1,
      },
      {
        id: 'ieee-acm-research',
        name: 'IEEE / ACM Student Research Competition',
        type: 'Research competition',
        description: 'Present original research to a panel at an IEEE or ACM conference.',
        deadline: 'Varies by conference, usually several months ahead',
        howToApply: 'Submit through your university IEEE/ACM student chapter',
        resource: null,
        prepWeeks: 6,
      },
    ],
  },
};

OPPORTUNITIES.healthcare = {
  highschool: [
    {
      id: 'hosa',
      name: 'HOSA (Health Occupations Students of America)',
      type: 'Competition / Leadership program',
      description: 'Health-science competition and leadership organization, school-chapter based.',
      deadline: 'Registration in fall; competitions through spring',
      howToApply: "Apply through your school's HOSA chapter",
      resource: { label: 'hosa.org', note: 'Competitive event guidelines' },
      prepWeeks: 3,
    },
    {
      id: 'cna-training',
      name: 'CNA (Certified Nursing Assistant) Training Program',
      type: 'Certification program',
      description: 'Local community college or vocational program offering early hands-on clinical exposure.',
      deadline: 'Rolling start dates',
      howToApply: 'Enroll through your local community college or vocational school',
      resource: null,
      prepWeeks: 2,
    },
    {
      id: 'hospital-junior-volunteer',
      name: 'Hospital Junior Volunteer Program',
      type: 'Volunteering',
      description: 'Many hospitals offer teen volunteer programs for early clinical/administrative exposure.',
      deadline: 'Applications often due before summer',
      howToApply: "Apply through your local hospital's volunteer services office",
      resource: null,
      prepWeeks: 4,
    },
  ],
  undergraduate: [
    {
      id: 'shpep',
      name: 'AAMC Summer Health Professions Education Program (SHPEP)',
      type: 'Funded summer program',
      description: 'Free summer program preparing students for health professions school.',
      deadline: 'Applications typically due in February',
      howToApply: 'Apply via the SHPEP website',
      resource: { label: 'shpep.org', note: 'Official program application' },
      prepWeeks: 5,
    },
    {
      id: 'clinical-research-internship',
      name: 'Clinical Research Internship',
      type: 'Research internship',
      description: 'Hands-on clinical research experience at a teaching hospital or academic medical center.',
      deadline: 'Varies by host institution',
      howToApply: "Apply through the hospital's research office or your university's pre-health advising",
      resource: null,
      prepWeeks: 4,
    },
    {
      id: 'emt-certification',
      name: 'EMT Certification',
      type: 'Certification program',
      description: 'Practical, widely-recognized clinical credential that strengthens medical/PA/nursing applications.',
      deadline: 'Rolling — courses run year-round',
      howToApply: 'Enroll through a local community college or EMS training center',
      resource: null,
      prepWeeks: 2,
    },
  ],
};

OPPORTUNITIES.creative = {
  highschool: [
    {
      id: 'scholastic-art-writing',
      name: 'Scholastic Art & Writing Awards',
      type: 'Competition',
      description: 'National recognition program for teen artists and writers.',
      deadline: 'Regional deadlines typically in fall/winter',
      howToApply: 'Submit through the Scholastic Art & Writing Awards website',
      resource: { label: 'artandwriting.org', note: 'Submission guidelines' },
      prepWeeks: 4,
    },
    {
      id: 'youngarts',
      name: 'YoungArts',
      type: 'Competition / scholarship',
      description: 'National arts competition and scholarship across visual, performing, and literary arts.',
      deadline: 'Applications typically due in fall',
      howToApply: 'Apply via the YoungArts website',
      resource: { label: 'youngarts.org', note: 'Official application' },
      prepWeeks: 5,
    },
    {
      id: 'community-gallery-internship',
      name: 'Local Community Theater or Gallery Internship',
      type: 'Internship',
      description: 'Hands-on experience at a local theater, gallery, or arts organization.',
      deadline: 'Varies by location, often rolling/ongoing',
      howToApply: 'Contact local theaters and galleries directly about internship openings',
      resource: null,
      prepWeeks: 2,
    },
  ],
  undergraduate: [
    {
      id: 'studio-internship',
      name: 'Design/Production Studio Internship',
      type: 'Internship',
      description: 'Hands-on professional experience at a design, production, or media studio.',
      deadline: 'Varies by studio, often posted each semester',
      howToApply: "Apply through your program's career office or studio job boards",
      resource: null,
      prepWeeks: 3,
    },
    {
      id: 'student-film-festival',
      name: 'Student Film Festival Submission',
      type: 'Competition',
      description: 'Submit original work to a juried student film festival for exposure and feedback.',
      deadline: 'Varies by festival, typically several months ahead',
      howToApply: 'Submit via the festival\'s official submission platform',
      resource: null,
      prepWeeks: 4,
    },
    {
      id: 'gallery-open-call',
      name: 'Gallery/Exhibition Open Call',
      type: 'Exhibition opportunity',
      description: 'Open submission opportunities to exhibit work at a gallery or juried show.',
      deadline: 'Varies by gallery',
      howToApply: "Submit via the gallery's open call portal or curator contact",
      resource: null,
      prepWeeks: 3,
    },
  ],
};

// Transfer students see track-appropriate options with community-college-relevant framing.
OPPORTUNITIES.business.transfer = [
  {
    id: 'ptk-business',
    name: 'Phi Theta Kappa Honor Society',
    type: 'Honor society / scholarships',
    description: 'Community college honor society offering business-relevant leadership programs and transfer scholarships.',
    deadline: 'Ongoing — chapter induction each term',
    howToApply: 'Apply through your community college PTK chapter',
    resource: { label: 'ptk.org', note: 'Scholarship directory' },
    prepWeeks: 2,
  },
  {
    id: 'collegiate-deca',
    name: 'Collegiate DECA',
    type: 'Competition',
    description: 'Business competition open to community college and four-year students alike.',
    deadline: 'Registration opens each fall',
    howToApply: 'Apply through your college DECA chapter',
    resource: { label: 'collegiatedeca.org', note: 'Competitive event guidelines' },
    prepWeeks: 3,
  },
  {
    id: 'jkc-transfer-scholarship',
    name: 'Jack Kent Cooke Undergraduate Transfer Scholarship',
    type: 'Scholarship',
    description: 'Major scholarship supporting high-achieving community college students transferring to four-year schools.',
    deadline: 'Applications typically due in November',
    howToApply: 'Apply via jkcf.org',
    resource: { label: 'jkcf.org', note: 'Official scholarship application' },
    prepWeeks: 6,
  },
];

OPPORTUNITIES.stem.transfer = [
  {
    id: 'ptk-stem',
    name: 'Phi Theta Kappa STEM Scholarships',
    type: 'Honor society / scholarships',
    description: 'Community college honor society with STEM-specific scholarship and research opportunities.',
    deadline: 'Ongoing — chapter induction each term',
    howToApply: 'Apply through your community college PTK chapter',
    resource: { label: 'ptk.org', note: 'Scholarship directory' },
    prepWeeks: 2,
  },
  {
    id: 'nsf-reu-transfer',
    name: 'NSF Research Experiences for Undergraduates (REU)',
    type: 'Funded summer research',
    description: 'Many REU sites welcome transfer and rising-junior applicants — a strong way to build research experience.',
    deadline: 'Applications typically due February–March',
    howToApply: 'Browse and apply via the NSF REU site directory',
    resource: { label: 'nsf.gov/crssprgm/reu', note: 'Official REU site search' },
    prepWeeks: 5,
  },
  {
    id: 'jkc-transfer-scholarship-stem',
    name: 'Jack Kent Cooke Undergraduate Transfer Scholarship',
    type: 'Scholarship',
    description: 'Major scholarship supporting high-achieving community college students transferring to four-year schools.',
    deadline: 'Applications typically due in November',
    howToApply: 'Apply via jkcf.org',
    resource: { label: 'jkcf.org', note: 'Official scholarship application' },
    prepWeeks: 6,
  },
];

OPPORTUNITIES.healthcare.transfer = [
  {
    id: 'ptk-healthcare',
    name: 'Phi Theta Kappa Healthcare Scholarships',
    type: 'Honor society / scholarships',
    description: 'Community college honor society with healthcare-focused scholarship opportunities.',
    deadline: 'Ongoing — chapter induction each term',
    howToApply: 'Apply through your community college PTK chapter',
    resource: { label: 'ptk.org', note: 'Scholarship directory' },
    prepWeeks: 2,
  },
  {
    id: 'cna-emt-transfer',
    name: 'CNA/EMT Certification Program',
    type: 'Certification program',
    description: 'Community-college-based clinical certification that strengthens nursing/pre-health transfer applications.',
    deadline: 'Rolling start dates',
    howToApply: 'Enroll through your community college',
    resource: null,
    prepWeeks: 2,
  },
  {
    id: 'jkc-transfer-scholarship-healthcare',
    name: 'Jack Kent Cooke Undergraduate Transfer Scholarship',
    type: 'Scholarship',
    description: 'Major scholarship supporting high-achieving community college students transferring to four-year schools.',
    deadline: 'Applications typically due in November',
    howToApply: 'Apply via jkcf.org',
    resource: { label: 'jkcf.org', note: 'Official scholarship application' },
    prepWeeks: 6,
  },
];

OPPORTUNITIES.creative.transfer = [
  {
    id: 'ptk-creative',
    name: 'Phi Theta Kappa Creative Arts Scholarships',
    type: 'Honor society / scholarships',
    description: 'Community college honor society with arts-focused scholarship opportunities.',
    deadline: 'Ongoing — chapter induction each term',
    howToApply: 'Apply through your community college PTK chapter',
    resource: { label: 'ptk.org', note: 'Scholarship directory' },
    prepWeeks: 2,
  },
  {
    id: 'community-gallery-internship-transfer',
    name: 'Local Community Theater or Gallery Internship',
    type: 'Internship',
    description: 'Hands-on experience at a local theater, gallery, or arts organization — open to transfer students.',
    deadline: 'Varies by location, often rolling/ongoing',
    howToApply: 'Contact local theaters and galleries directly about internship openings',
    resource: null,
    prepWeeks: 2,
  },
  {
    id: 'jkc-transfer-scholarship-creative',
    name: 'Jack Kent Cooke Undergraduate Transfer Scholarship',
    type: 'Scholarship',
    description: 'Major scholarship supporting high-achieving community college students transferring to four-year schools.',
    deadline: 'Applications typically due in November',
    howToApply: 'Apply via jkcf.org',
    resource: { label: 'jkcf.org', note: 'Official scholarship application' },
    prepWeeks: 6,
  },
];

// Fallback for students whose selected interests are all unbuilt tracks (Task 3):
// broadly-applicable opportunities that aren't tied to any specific interest.
export const GENERIC_OPPORTUNITIES = {
  highschool: [
    {
      id: 'nhs',
      name: 'National Honor Society',
      type: 'Honor society',
      description: 'Recognizes academic excellence, leadership, service, and character — most high schools have a chapter.',
      deadline: 'Induction typically in fall/spring, GPA-based eligibility',
      howToApply: "Ask your school counselor about your school's NHS chapter",
      resource: null,
      prepWeeks: 2,
    },
    {
      id: 'general-community-service',
      name: 'General Community Service',
      type: 'Volunteering',
      description: 'Consistent volunteering with one cause looks stronger than scattered one-off events.',
      deadline: 'Ongoing',
      howToApply: "Find local opportunities via VolunteerMatch or your school's service office",
      resource: { label: 'volunteermatch.org', note: 'Directory of local volunteer opportunities' },
      prepWeeks: 1,
    },
    {
      id: 'sat-act-prep',
      name: 'SAT/ACT Prep Timeline',
      type: 'Test prep',
      description: 'A general standardized testing plan — most students take the SAT/ACT at least twice, starting junior year.',
      deadline: 'First sitting typically fall/winter of junior year',
      howToApply: 'Register at collegeboard.org (SAT) or act.org (ACT)',
      resource: { label: 'Khan Academy', note: 'Free official SAT prep' },
      prepWeeks: 6,
    },
  ],
  undergraduate: [
    {
      id: 'gre-prep-timeline',
      name: 'GRE Prep Timeline',
      type: 'Test prep',
      description: 'A general standardized testing plan for graduate school — most students test 3–6 months before applying.',
      deadline: 'Typically taken in the spring/summer before applications are due',
      howToApply: 'Register at ets.org/gre',
      resource: { label: 'ETS GRE prep', note: 'Official free practice tests' },
      prepWeeks: 8,
    },
    {
      id: 'volunteer-leadership',
      name: 'Community Service / Volunteer Leadership',
      type: 'Volunteering',
      description: 'Taking on a leadership role in an ongoing volunteer commitment strengthens graduate applications.',
      deadline: 'Ongoing',
      howToApply: 'Find local opportunities via VolunteerMatch or your university\'s service office',
      resource: { label: 'volunteermatch.org', note: 'Directory of local volunteer opportunities' },
      prepWeeks: 1,
    },
    {
      id: 'professional-conference',
      name: 'Professional Conference Attendance',
      type: 'Professional development',
      description: 'Attending a conference in your field builds network and context for your statement of purpose.',
      deadline: 'Varies by conference',
      howToApply: "Check your department or professional association's event calendar",
      resource: null,
      prepWeeks: 3,
    },
  ],
  transfer: [
    {
      id: 'ptk-generic',
      name: 'Phi Theta Kappa Honor Society',
      type: 'Honor society / scholarships',
      description: 'Community college honor society offering leadership programs and transfer scholarships.',
      deadline: 'Ongoing — chapter induction each term',
      howToApply: 'Apply through your community college PTK chapter',
      resource: { label: 'ptk.org', note: 'Scholarship directory' },
      prepWeeks: 2,
    },
    {
      id: 'general-community-service-transfer',
      name: 'General Community Service',
      type: 'Volunteering',
      description: 'Consistent volunteering with one cause looks stronger than scattered one-off events.',
      deadline: 'Ongoing',
      howToApply: 'Find local opportunities via VolunteerMatch or your college\'s service office',
      resource: { label: 'volunteermatch.org', note: 'Directory of local volunteer opportunities' },
      prepWeeks: 1,
    },
    {
      id: 'jkc-transfer-scholarship-generic',
      name: 'Jack Kent Cooke Undergraduate Transfer Scholarship',
      type: 'Scholarship',
      description: 'Major scholarship supporting high-achieving community college students transferring to four-year schools.',
      deadline: 'Applications typically due in November',
      howToApply: 'Apply via jkcf.org',
      resource: { label: 'jkcf.org', note: 'Official scholarship application' },
      prepWeeks: 6,
    },
  ],
};

// Merged, de-duplicated opportunity list for the given built tracks + education level.
// Falls back to the generic list when no built track is selected.
export function getOpportunityPool(tracks, level) {
  if (!tracks.length) return GENERIC_OPPORTUNITIES[level] || [];
  const seen = new Set();
  const merged = [];
  for (const t of tracks) {
    for (const o of OPPORTUNITIES[t]?.[level] || []) {
      if (!seen.has(o.id)) {
        seen.add(o.id);
        merged.push(o);
      }
    }
  }
  return merged;
}

export function findOpportunity(id, tracks, level) {
  return getOpportunityPool(tracks, level).find((o) => o.id === id) || null;
}
