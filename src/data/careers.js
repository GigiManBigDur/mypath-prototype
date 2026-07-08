// CAREERS[track][level] -> array of 3 career cards.
// 'highschool' and 'transfer' education levels see the same (undergrad-track) careers;
// 'undergraduate' sees more advanced careers that require a graduate degree next.

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
        relevantMajors: ['mba'],
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
        relevantMajors: ['ms-ai-ml'],
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
        relevantMajors: ['md-do'],
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
        relevantMajors: ['jd-law'],
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
        relevantMajors: ['psyd-clinical-psych'],
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

// Merged career list across the given built tracks for one education level — the pool that
// Screen 3a (multi-select) renders, and that callers filter by selectedCareerIds against.
export function getCareerPool(tracks, level) {
  return tracks.flatMap((t) => CAREERS[t]?.[level] || []);
}
