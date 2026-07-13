// Majors keyed by id. Undergrad-level majors are shared by 'highschool' and 'transfer' education levels;
// grad-level majors are used for 'undergraduate' education level (i.e. the user is choosing their NEXT degree).

export const MAJORS = {
  // ---- Business: undergraduate majors ----
  'business-administration': {
    id: 'business-administration',
    name: 'Business Administration',
    overview: 'A broad foundation in how organizations operate — covering management, operations, finance, and strategy.',
    skills: ['Financial analysis', 'Team leadership', 'Strategic planning', 'Operations management'],
    potentialCareers: ['Business Analyst', 'Entrepreneur / Founder', 'Marketing Manager'],
    timeToComplete: '4 years',
  },
  finance: {
    id: 'finance',
    name: 'Finance',
    overview: 'Focused study of capital markets, investment analysis, and corporate financial decision-making.',
    skills: ['Financial modeling', 'Valuation', 'Risk analysis', 'Data-driven decision making'],
    potentialCareers: ['Business Analyst', 'Marketing Manager'],
    timeToComplete: '4 years',
  },
  economics: {
    id: 'economics',
    name: 'Economics',
    overview: 'The study of how people, companies, and markets make decisions under scarcity — strong quantitative and analytical training.',
    skills: ['Quantitative reasoning', 'Statistical analysis', 'Policy analysis', 'Market forecasting'],
    potentialCareers: ['Business Analyst'],
    timeToComplete: '4 years',
  },
  entrepreneurship: {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    overview: 'Hands-on study of launching and scaling new ventures, from idea validation to fundraising.',
    skills: ['Business model design', 'Pitching & fundraising', 'Product validation', 'Risk-taking under uncertainty'],
    potentialCareers: ['Entrepreneur / Founder'],
    timeToComplete: '4 years',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    overview: 'How companies research audiences, build brands, and design campaigns that drive demand.',
    skills: ['Brand strategy', 'Consumer research', 'Digital campaign design', 'Analytics'],
    potentialCareers: ['Marketing Manager', 'Entrepreneur / Founder'],
    timeToComplete: '4 years',
  },
  communications: {
    id: 'communications',
    name: 'Communications',
    overview: 'The study of messaging, media, and persuasion across written, visual, and digital channels.',
    skills: ['Copywriting', 'Public relations', 'Media strategy', 'Storytelling'],
    potentialCareers: ['Marketing Manager'],
    timeToComplete: '4 years',
  },

  // ---- Business: graduate majors ----
  mba: {
    id: 'mba',
    name: 'MBA (Master of Business Administration)',
    overview: 'A generalist graduate business degree that deepens management, strategy, and leadership skills — usually pursued after a few years of work experience.',
    skills: ['Executive leadership', 'Cross-functional strategy', 'Negotiation', 'Organizational management'],
    potentialCareers: ['Management Consultant', 'Marketing Director'],
    timeToComplete: '2 years (full-time)',
  },
  'ms-finance': {
    id: 'ms-finance',
    name: 'MS in Finance',
    overview: 'An advanced, technical degree in financial theory and markets, aimed at investment and analytical roles.',
    skills: ['Advanced valuation', 'Portfolio theory', 'Financial modeling', 'Derivatives & risk'],
    potentialCareers: ['Investment Banker / Finance Director'],
    timeToComplete: '1–2 years',
  },
  'ms-marketing-analytics': {
    id: 'ms-marketing-analytics',
    name: 'MS in Marketing Analytics',
    overview: 'A data-driven graduate degree blending marketing strategy with statistical and analytical methods.',
    skills: ['Marketing analytics', 'A/B testing', 'Consumer data modeling', 'Campaign ROI measurement'],
    potentialCareers: ['Marketing Director'],
    timeToComplete: '1–2 years',
  },

  // ---- STEM: undergraduate majors ----
  'computer-science': {
    id: 'computer-science',
    name: 'Computer Science',
    overview: 'The study of computation, algorithms, and software systems — the core major behind most tech careers.',
    skills: ['Programming', 'Algorithms & data structures', 'Systems design', 'Problem solving'],
    potentialCareers: ['Software Engineer', 'Data Scientist'],
    timeToComplete: '4 years',
  },
  'software-engineering': {
    id: 'software-engineering',
    name: 'Software Engineering',
    overview: 'A CS-adjacent major focused on the engineering practices behind building large, reliable software systems.',
    skills: ['Software architecture', 'Testing & QA', 'Team-based development', 'Version control workflows'],
    potentialCareers: ['Software Engineer'],
    timeToComplete: '4 years',
  },
  'computer-engineering': {
    id: 'computer-engineering',
    name: 'Computer Engineering',
    overview: 'A hybrid of computer science and electrical engineering, covering both hardware and the software that runs on it.',
    skills: ['Digital logic design', 'Embedded systems', 'Programming', 'Circuit design'],
    potentialCareers: ['Software Engineer'],
    timeToComplete: '4 years',
  },
  'mechanical-engineering': {
    id: 'mechanical-engineering',
    name: 'Mechanical Engineering',
    overview: 'Design and analysis of physical systems and machines — one of the broadest engineering disciplines.',
    skills: ['CAD design', 'Thermodynamics', 'Materials science', 'Prototyping'],
    potentialCareers: ['Mechanical Engineer'],
    timeToComplete: '4 years',
  },
  'aerospace-engineering': {
    id: 'aerospace-engineering',
    name: 'Aerospace Engineering',
    overview: 'Applies mechanical and physics principles to the design of aircraft, spacecraft, and propulsion systems.',
    skills: ['Aerodynamics', 'Propulsion systems', 'Structural analysis', 'CAD & simulation'],
    potentialCareers: ['Mechanical Engineer'],
    timeToComplete: '4 years',
  },
  'data-science': {
    id: 'data-science',
    name: 'Data Science',
    overview: 'An interdisciplinary major combining statistics, programming, and domain knowledge to extract insight from data.',
    skills: ['Statistical modeling', 'Programming (Python/R)', 'Data visualization', 'Machine learning basics'],
    potentialCareers: ['Data Scientist'],
    timeToComplete: '4 years',
  },
  statistics: {
    id: 'statistics',
    name: 'Statistics',
    overview: 'Rigorous study of probability and inference — the mathematical foundation behind data science and research.',
    skills: ['Probability theory', 'Statistical inference', 'Experimental design', 'Data analysis'],
    potentialCareers: ['Data Scientist'],
    timeToComplete: '4 years',
  },

  // ---- STEM: graduate majors ----
  'ms-ai-ml': {
    id: 'ms-ai-ml',
    name: 'MS in Artificial Intelligence / Machine Learning',
    overview: 'A focused technical graduate degree in the theory and application of machine learning systems.',
    skills: ['Deep learning', 'Model deployment', 'Research methodology', 'Advanced mathematics'],
    potentialCareers: ['Machine Learning Engineer / AI Research Scientist'],
    timeToComplete: '1–2 years',
  },
  'ms-robotics': {
    id: 'ms-robotics',
    name: 'MS in Robotics',
    overview: 'Graduate study combining mechanical design, controls, and AI for autonomous systems.',
    skills: ['Robot kinematics & controls', 'Computer vision', 'Sensor fusion', 'Systems integration'],
    potentialCareers: ['Robotics Engineer'],
    timeToComplete: '2 years',
  },
  'ms-data-science': {
    id: 'ms-data-science',
    name: 'MS in Data Science',
    overview: 'An advanced degree building on undergraduate quantitative training with production-grade data and ML skills.',
    skills: ['Advanced statistics', 'Big data tools', 'Machine learning', 'Applied research'],
    potentialCareers: ['Quantitative Researcher / Senior Data Scientist'],
    timeToComplete: '1–2 years',
  },

  // ---- Healthcare: undergraduate majors ----
  nursing: {
    id: 'nursing',
    name: 'Nursing',
    overview: 'Patient care, clinical procedures, anatomy & physiology.',
    skills: ['Clinical assessment', 'Patient communication', 'Critical thinking'],
    potentialCareers: ['Registered Nurse (RN)', 'Nurse Practitioner', 'Nurse Educator'],
    timeToComplete: '2–4 years',
  },
  'biology-premed': {
    id: 'biology-premed',
    name: 'Biology / Pre-Med',
    overview: 'Foundational science for medical and research careers.',
    skills: ['Lab research', 'Scientific reasoning', 'Data analysis'],
    potentialCareers: ['Physician', 'Researcher', 'Physician Assistant'],
    timeToComplete: '4 years (+4 more for MD)',
  },
  kinesiology: {
    id: 'kinesiology',
    name: 'Kinesiology / Exercise Science',
    overview: 'Study of human movement and physical performance.',
    skills: ['Biomechanics', 'Injury prevention', 'Exercise programming'],
    potentialCareers: ['Physical Therapist', 'Athletic Trainer', 'Coach', 'Wellness Coach'],
    timeToComplete: '4 years (+3 for DPT)',
  },

  // ---- Healthcare: graduate majors ----
  'md-do': {
    id: 'md-do',
    name: 'MD/DO (Doctor of Medicine / Osteopathic Medicine)',
    overview: 'Full medical school training to become a licensed, practicing physician.',
    skills: ['Clinical diagnosis', 'Patient care', 'Medical procedures', 'Evidence-based practice'],
    potentialCareers: ['Physician (MD/DO)'],
    timeToComplete: '4 years (+3–7 year residency)',
  },
  'ms-physician-assistant': {
    id: 'ms-physician-assistant',
    name: 'MS in Physician Assistant Studies',
    overview: 'Intensive clinical training to practice medicine under physician supervision.',
    skills: ['Clinical diagnosis', 'Prescribing', 'Patient management'],
    potentialCareers: ['Physician Assistant'],
    timeToComplete: '2–3 years',
  },
  'msn-np': {
    id: 'msn-np',
    name: 'MSN / DNP — Nurse Practitioner',
    overview: 'Advanced nursing degree enabling independent or semi-independent clinical practice.',
    skills: ['Advanced clinical assessment', 'Prescribing', 'Care coordination'],
    potentialCareers: ['Nurse Practitioner'],
    timeToComplete: '2–4 years',
  },

  // ---- Creative/Arts: undergraduate majors ----
  'graphic-design': {
    id: 'graphic-design',
    name: 'Graphic Design',
    overview: 'Visual communication, typography, branding.',
    skills: ['Design software', 'Typography', 'Branding'],
    potentialCareers: ['Graphic Designer', 'Art Director', 'UX Designer'],
    timeToComplete: '2–4 years',
  },
  'film-production': {
    id: 'film-production',
    name: 'Film/Media Production',
    overview: 'Storytelling through video, editing, and cinematography.',
    skills: ['Editing', 'Cinematography', 'Storytelling'],
    potentialCareers: ['Producer', 'Director', 'Editor'],
    timeToComplete: '4 years',
  },
  music: {
    id: 'music',
    name: 'Music',
    overview: 'Performance, composition, and music theory.',
    skills: ['Musicianship', 'Composition', 'Performance'],
    potentialCareers: ['Musician', 'Composer', 'Music Teacher'],
    timeToComplete: '4 years',
  },

  // ---- Creative/Arts: graduate majors ----
  'mfa-design': {
    id: 'mfa-design',
    name: 'MFA in Design',
    overview: 'Advanced studio and theory training for a career leading creative work professionally.',
    skills: ['Advanced visual design', 'Creative direction', 'Portfolio development'],
    potentialCareers: ['Creative Director / Art Director'],
    timeToComplete: '2 years',
  },
  'mfa-film': {
    id: 'mfa-film',
    name: 'MFA in Film',
    overview: 'Graduate-level filmmaking training culminating in a thesis film or portfolio.',
    skills: ['Directing', 'Advanced cinematography', 'Producing'],
    potentialCareers: ['Film Director'],
    timeToComplete: '2–3 years',
  },
  'mm-composition': {
    id: 'mm-composition',
    name: 'MM in Composition',
    overview: 'Graduate music degree focused on advanced composition and conducting.',
    skills: ['Advanced composition', 'Conducting', 'Orchestration'],
    potentialCareers: ['Composer / Music Director'],
    timeToComplete: '2 years',
  },

  // ---- Academic/Humanities: undergraduate majors ----
  'political-science-prelaw': {
    id: 'political-science-prelaw',
    name: 'Political Science / Pre-Law',
    overview: 'Study of government, law, and political systems.',
    skills: ['Critical thinking', 'Argumentation', 'Research', 'Writing'],
    potentialCareers: ['Lawyer', 'Policy Analyst', 'Community Organizer / Policy Advocate', 'Diplomat'],
    timeToComplete: '4 years (+3 for Law School)',
  },
  history: {
    id: 'history',
    name: 'History',
    overview: 'Study of past events, primary sources, and historical methods.',
    skills: ['Research', 'Critical analysis', 'Written communication'],
    potentialCareers: ['Historian', 'Archivist', 'Museum Curator', 'Teacher'],
    timeToComplete: '4 years (+2 for Master\'s)',
  },
  psychology: {
    id: 'psychology',
    name: 'Psychology',
    overview: 'Study of the mind and behavior.',
    skills: ['Research design', 'Statistics', 'Communication/empathy'],
    potentialCareers: ['Psychologist', 'Counselor / Therapist', 'Life / Wellness Coach', 'Researcher'],
    timeToComplete: '4 years (+5–6 for PhD/PsyD)',
  },

  // ---- Academic/Humanities: graduate majors ----
  'jd-law': {
    id: 'jd-law',
    name: 'JD (Juris Doctor)',
    overview: 'Professional law degree required to practice as a licensed attorney.',
    skills: ['Legal research', 'Case analysis', 'Oral advocacy', 'Legal writing'],
    potentialCareers: ['Attorney (JD)'],
    timeToComplete: '3 years',
  },
  'phd-history': {
    id: 'phd-history',
    name: 'PhD in History',
    overview: 'Advanced historical research training culminating in an original dissertation.',
    skills: ['Archival research', 'Historiography', 'Academic writing', 'Teaching'],
    potentialCareers: ['Professor / Research Historian'],
    timeToComplete: '5–7 years',
  },
  'psyd-clinical-psych': {
    id: 'psyd-clinical-psych',
    name: 'PsyD / PhD in Clinical Psychology',
    overview: 'Doctoral training in clinical assessment and therapy, required for licensure.',
    skills: ['Clinical assessment', 'Psychotherapy', 'Research methods', 'Ethics'],
    potentialCareers: ['Clinical Psychologist'],
    timeToComplete: '5–6 years',
  },

  // ---- Sports majors ----
  'sports-management': {
    id: 'sports-management',
    name: 'Sports Management',
    overview: 'The business side of athletics — operations, marketing, and event management for teams, leagues, and departments.',
    skills: ['Event planning', 'Sports marketing', 'Operations management', 'Budget management'],
    potentialCareers: ['Sports Management / Athletics Administrator', 'Sports Agent'],
    timeToComplete: '4 years',
  },

  // ---- Culinary Arts majors ----
  'culinary-arts': {
    id: 'culinary-arts',
    name: 'Culinary Arts',
    overview: 'Hands-on training in cooking techniques, kitchen management, and menu design.',
    skills: ['Knife skills', 'Menu planning', 'Kitchen management', 'Food safety'],
    potentialCareers: ['Chef / Culinary Professional', 'Restaurant Owner'],
    timeToComplete: '1–4 years depending on program (certificate, Associate\'s, or Bachelor\'s)',
  },
  'food-science': {
    id: 'food-science',
    name: 'Food Science',
    overview: 'The science behind food production, safety, and quality processes.',
    skills: ['Lab research', 'Food chemistry', 'Quality control', 'Regulatory compliance'],
    potentialCareers: ['Food Scientist', 'QA Manager'],
    timeToComplete: '4 years',
  },
  'hospitality-management': {
    id: 'hospitality-management',
    name: 'Hospitality Management',
    overview: 'Business operations for restaurants, hotels, and event venues.',
    skills: ['Operations management', 'Customer service', 'Business finance', 'Event coordination'],
    potentialCareers: ['Restaurant / Hotel Manager', 'Event Planner'],
    timeToComplete: '4 years',
  },

  // ---- Community & Leadership majors ----
  'nonprofit-management': {
    id: 'nonprofit-management',
    name: 'Nonprofit Management / Public Administration',
    overview: 'Running nonprofit and government organizations effectively — programs, funding, and policy.',
    skills: ['Program management', 'Grant writing', 'Budgeting', 'Stakeholder communication'],
    potentialCareers: ['Nonprofit Program Manager', 'Policy Analyst'],
    timeToComplete: '4 years (+2 for MPA)',
  },
  'social-work': {
    id: 'social-work',
    name: 'Social Work',
    overview: 'Helping individuals and communities access resources and navigate challenges.',
    skills: ['Casework', 'Counseling basics', 'Advocacy', 'Crisis intervention'],
    potentialCareers: ['Social Worker', 'Case Manager'],
    timeToComplete: '4 years (+2 for MSW)',
  },

  // ---- Media & Entertainment majors ----
  journalism: {
    id: 'journalism',
    name: 'Journalism / Communications',
    overview: 'Researching, writing, and producing media content across platforms.',
    skills: ['Writing', 'Interviewing', 'Research', 'Digital media production'],
    potentialCareers: ['Journalist / Content Creator', 'PR Specialist'],
    timeToComplete: '4 years',
  },

  // ---- Personal Development majors ----
  'human-resources': {
    id: 'human-resources',
    name: 'Human Resources / Organizational Development',
    overview: 'Helping organizations manage and develop their people.',
    skills: ['Communication', 'Training design', 'Conflict resolution', 'Employment law basics'],
    potentialCareers: ['HR Specialist', 'Organizational Development Consultant'],
    timeToComplete: '4 years',
  },

  // ---- Outdoors (Gardening / Travel) majors ----
  horticulture: {
    id: 'horticulture',
    name: 'Horticulture / Landscape Architecture',
    overview: 'The science and design of growing plants and landscapes.',
    skills: ['Plant science', 'Landscape design', 'Sustainability practices', 'Site planning'],
    potentialCareers: ['Horticulturist', 'Landscape Architect'],
    timeToComplete: '4 years',
  },
  'tourism-management': {
    id: 'tourism-management',
    name: 'Tourism Management',
    overview: 'Planning and managing travel and tourism experiences.',
    skills: ['Destination marketing', 'Logistics', 'Customer service', 'Event coordination'],
    potentialCareers: ['Travel Manager', 'Tourism Director'],
    timeToComplete: '4 years',
  },
  // UC Davis partner-school addition (Undergraduate/Transfer only — see careers.js's
  // CAREERS.outdoors override for how this stays unreachable from the High School flow, and
  // programs.js's own PROGRAMS['sustainable-agriculture-food-systems'] for the one real program
  // behind it).
  'sustainable-agriculture-food-systems': {
    id: 'sustainable-agriculture-food-systems',
    name: 'Sustainable Agriculture & Food Systems',
    overview: 'Studies food security, food policy, and sustainable crop and animal production systems.',
    skills: ['Sustainable farming practices', 'Food policy analysis', 'Food systems research', 'Environmental stewardship'],
    potentialCareers: ['Sustainable Agriculture Specialist', 'Environmental Policy Analyst / Scientist'],
    timeToComplete: '4 years',
  },
};
