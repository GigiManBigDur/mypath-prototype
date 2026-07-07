// PROGRAMS keyed by major id -> array of 3 program cards.
// gpaTarget is an illustrative, clearly-approximate threshold (not a real published cutoff).

const HIGHLY_SELECTIVE_GPA = 'Aim for a 3.7+ unweighted GPA';
const EXTREMELY_SELECTIVE_GPA = 'Aim for a 3.9+ unweighted GPA';
const SELECTIVE_GPA = 'Aim for a 3.4+ unweighted GPA';
const GRAD_STRONG_GPA = 'Aim for a 3.5+ GPA in your major coursework';
const GRAD_TOP_GPA = 'Aim for a 3.7+ GPA in your major coursework, plus strong test scores';

export const PROGRAMS = {
  // ---- Business: undergraduate ----
  'business-administration': [
    { institution: 'UC Berkeley', program: 'Haas School of Business', overview: 'Public research university in Berkeley, CA — strong in entrepreneurship & finance.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'NYU', program: 'Stern School of Business', overview: 'Private university in New York City — strong in finance & global business.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Pennsylvania', program: 'Wharton School', overview: 'Private Ivy League university in Philadelphia — renowned finance program.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
  ],
  finance: [
    { institution: 'University of Pennsylvania', program: 'Wharton School — Finance', overview: 'The benchmark undergraduate finance program, deeply tied to Wall Street recruiting.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'NYU', program: 'Stern School of Business — Finance', overview: 'Located steps from the Financial District, with deep industry connections.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Michigan', program: 'Ross School of Business', overview: 'Large public research university with a highly-ranked business program.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  economics: [
    { institution: 'University of Chicago', program: 'Department of Economics', overview: 'Historic home of the "Chicago School" of economics, rigorous and theory-heavy.', selectivity: 'Extremely Selective', location: 'Chicago, IL', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Harvard University', program: 'Department of Economics', overview: 'Ivy League university with one of the most popular economics programs in the country.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'UC Berkeley', program: 'Department of Economics', overview: 'Public research university with a large, well-regarded economics department.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  entrepreneurship: [
    { institution: 'Babson College', program: 'Entrepreneurship Program', overview: 'A private college dedicated entirely to entrepreneurship education.', selectivity: 'Highly Selective', location: 'Wellesley, MA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Southern California', program: 'Marshall School of Business — Lloyd Greif Center', overview: 'Private research university with a well-known entrepreneurship center.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'UC Berkeley', program: 'Haas School of Business — Entrepreneurship', overview: 'Close ties to the Bay Area startup ecosystem.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  marketing: [
    { institution: 'Northwestern University', program: 'Medill IMC Program', overview: 'Private university known for integrated marketing communications.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'NYU', program: 'Stern School of Business — Marketing', overview: 'Located in a major media and advertising hub.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'Indiana University', program: 'Kelley School of Business — Marketing', overview: 'Large public business school with a well-regarded marketing track.', selectivity: 'Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],
  communications: [
    { institution: 'Northwestern University', program: 'Medill School of Journalism', overview: 'One of the most recognized communications/journalism schools in the country.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Southern California', program: 'Annenberg School for Communication', overview: 'Private research university with strong industry ties in LA media.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Texas at Austin', program: 'Moody College of Communication', overview: 'Large public university with a well-rounded communications program.', selectivity: 'Selective', location: 'Austin, TX', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],

  // ---- Business: graduate ----
  mba: [
    { institution: 'Harvard University', program: 'Harvard Business School — MBA', overview: 'One of the most prestigious MBA programs in the world.', selectivity: 'Extremely Selective', location: 'Boston, MA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Stanford University', program: 'Stanford Graduate School of Business — MBA', overview: 'Known for its entrepreneurship focus and Silicon Valley ties.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'University of Pennsylvania', program: 'Wharton School — MBA', overview: 'Deep finance specialization with a large, well-connected alumni network.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
  ],
  'ms-finance': [
    { institution: 'University of Pennsylvania', program: 'Wharton School — MS in Finance', overview: 'Highly technical finance training tied to top Wall Street recruiting.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'MIT', program: 'Sloan School of Management — Master of Finance', overview: 'Quantitative, research-driven finance program.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Princeton University', program: 'Master in Finance', overview: 'Small, rigorous, quant-focused finance program.', selectivity: 'Extremely Selective', location: 'Princeton, NJ', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
  ],
  'ms-marketing-analytics': [
    { institution: 'Northwestern University', program: 'MS in Marketing Analytics', overview: 'Blends Kellogg marketing strategy with applied data science.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'University of Southern California', program: 'MS in Marketing (Marshall)', overview: 'Data-driven marketing program with strong LA industry ties.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'New York University', program: 'MS in Marketing (Stern)', overview: 'Located in a major advertising and media hub.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
  ],

  // ---- STEM: undergraduate ----
  'computer-science': [
    { institution: 'MIT', program: 'Computer Science (EECS)', overview: 'Private research university in Cambridge, MA — renowned CS/engineering.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Georgia Tech', program: 'College of Computing', overview: 'Public university in Atlanta, GA — highly selective, strong CS/engineering value.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Michigan', program: 'Computer Science & Engineering', overview: 'Public university in Ann Arbor — highly selective, strong engineering/CS.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  'software-engineering': [
    { institution: 'Carnegie Mellon University', program: 'School of Computer Science', overview: 'One of the most respected computing schools, with dedicated SE coursework.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'University of Waterloo', program: 'Software Engineering', overview: 'Known for its co-op program and deep industry pipeline into tech.', selectivity: 'Highly Selective', location: 'Waterloo, ON', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'Rochester Institute of Technology', program: 'Software Engineering', overview: 'One of the first dedicated undergraduate SE programs in the US.', selectivity: 'Selective', location: 'Rochester, NY', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],
  'computer-engineering': [
    { institution: 'UC Berkeley', program: 'Electrical Engineering & Computer Sciences', overview: 'Public research university with a top-ranked EECS department.', selectivity: 'Extremely Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Georgia Tech', program: 'Computer Engineering', overview: 'Strong hardware/software hybrid curriculum.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'Purdue University', program: 'Computer Engineering', overview: 'Large public engineering school with strong industry recruiting.', selectivity: 'Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],
  'mechanical-engineering': [
    { institution: 'MIT', program: 'Mechanical Engineering', overview: 'Top-ranked mechanical engineering program with extensive lab resources.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Stanford University', program: 'Mechanical Engineering', overview: 'Strong ties to Silicon Valley product and robotics companies.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Georgia Tech', program: 'Mechanical Engineering', overview: 'One of the largest and most respected ME programs in the US.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  'aerospace-engineering': [
    { institution: 'MIT', program: 'Aeronautics and Astronautics', overview: 'One of the oldest and most respected aerospace programs in the world.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Georgia Tech', program: 'Aerospace Engineering', overview: 'Large, well-funded aerospace program with strong industry ties.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'Purdue University', program: 'Aeronautics and Astronautics', overview: 'Historic aerospace program (astronaut alma mater) with strong labs.', selectivity: 'Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],
  'data-science': [
    { institution: 'UC Berkeley', program: 'Data Science', overview: 'One of the first dedicated undergraduate data science programs.', selectivity: 'Extremely Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Carnegie Mellon University', program: 'Statistics & Data Science', overview: 'Rigorous, math-heavy data science curriculum.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'University of Washington', program: 'Data Science', overview: 'Public research university close to major tech employers.', selectivity: 'Highly Selective', location: 'Seattle, WA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  statistics: [
    { institution: 'Stanford University', program: 'Department of Statistics', overview: 'Strong theoretical foundation with applied research opportunities.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'UC Berkeley', program: 'Department of Statistics', overview: 'One of the top statistics departments in the country.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Michigan', program: 'Department of Statistics', overview: 'Large public program with strong applied statistics track.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],

  // ---- STEM: graduate ----
  'ms-ai-ml': [
    { institution: 'Stanford University', program: 'MS in Computer Science — AI Track', overview: 'One of the top AI research environments in the world.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Carnegie Mellon University', program: 'MS in Machine Learning', overview: 'Dedicated ML master\'s degree from a top-ranked ML department.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'MIT', program: 'MS in Computer Science (EECS) — AI', overview: 'World-renowned AI and robotics labs.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_TOP_GPA },
  ],
  'ms-robotics': [
    { institution: 'Carnegie Mellon University', program: 'Robotics Institute — MS in Robotics', overview: 'The largest and most established robotics program in the US.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'MIT', program: 'MS in Mechanical Engineering — Robotics', overview: 'Deep robotics research tied to MIT CSAIL.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Georgia Tech', program: 'MS in Robotics', overview: 'Large, well-funded robotics program with strong industry partnerships.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Master's", 'PhD'], gpaTarget: GRAD_STRONG_GPA },
  ],
  'ms-data-science': [
    { institution: 'UC Berkeley', program: 'Master of Information and Data Science', overview: 'Applied, industry-oriented data science master\'s program.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'Carnegie Mellon University', program: 'MS in Data Science', overview: 'Rigorous, math-heavy program from a top-ranked statistics department.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Stanford University', program: 'MS in Statistics — Data Science Track', overview: 'Strong theoretical foundation with applied data science coursework.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
  ],

  // ---- Healthcare: undergraduate ----
  nursing: [
    { institution: 'University of Pennsylvania', program: 'School of Nursing', overview: 'Private Ivy League university with a top-ranked nursing school.', selectivity: 'Highly Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's (BSN)"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Michigan', program: 'School of Nursing', overview: 'Large public university with a well-regarded nursing program.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's (BSN)"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'Johns Hopkins University', program: 'School of Nursing', overview: 'Research-focused nursing school tied to a leading academic medical center.', selectivity: 'Highly Selective', location: 'Baltimore, MD', degreeLevels: ["Bachelor's (BSN)"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  'biology-premed': [
    { institution: 'Johns Hopkins University', program: 'Biology / Pre-Med Track', overview: 'Private research university renowned for pre-med preparation.', selectivity: 'Extremely Selective', location: 'Baltimore, MD', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Duke University', program: 'Biology / Pre-Med Track', overview: 'Strong pre-med advising with access to Duke University Medical Center.', selectivity: 'Extremely Selective', location: 'Durham, NC', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'UNC Chapel Hill', program: 'Biology / Pre-Med Track', overview: 'Large public university with a strong, well-supported pre-med pipeline.', selectivity: 'Highly Selective', location: 'Chapel Hill, NC', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  kinesiology: [
    { institution: 'University of Michigan', program: 'Kinesiology', overview: 'Public research university with a well-established kinesiology department.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Southern California', program: 'Biokinesiology & Physical Therapy', overview: 'Strong biokinesiology program with a direct pathway into USC\'s DPT program.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'University of Florida', program: 'Applied Kinesiology', overview: 'Large public program with strong exercise science research facilities.', selectivity: 'Selective', location: 'Gainesville, FL', degreeLevels: ["Bachelor's"], gpaTarget: SELECTIVE_GPA },
  ],

  // ---- Healthcare: graduate ----
  'md-do': [
    { institution: 'Johns Hopkins University', program: 'School of Medicine', overview: 'One of the most prestigious medical schools in the country.', selectivity: 'Extremely Selective', location: 'Baltimore, MD', degreeLevels: ['MD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Harvard University', program: 'Harvard Medical School', overview: 'World-renowned medical school with extensive research and clinical opportunities.', selectivity: 'Extremely Selective', location: 'Boston, MA', degreeLevels: ['MD'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Stanford University', program: 'School of Medicine', overview: 'Strong ties to biomedical research and Silicon Valley health tech.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ['MD'], gpaTarget: GRAD_TOP_GPA },
  ],
  'ms-physician-assistant': [
    { institution: 'Duke University', program: 'Physician Assistant Program', overview: 'One of the oldest and most respected PA programs in the country.', selectivity: 'Extremely Selective', location: 'Durham, NC', degreeLevels: ["Master's"], gpaTarget: GRAD_TOP_GPA },
    { institution: 'University of Iowa', program: 'Physician Assistant Program', overview: 'Well-established public university PA program with strong clinical placements.', selectivity: 'Highly Selective', location: 'Iowa City, IA', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'Emory University', program: 'Physician Assistant Program', overview: 'Private research university tied to a major academic medical center.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Master's"], gpaTarget: GRAD_STRONG_GPA },
  ],
  'msn-np': [
    { institution: 'Johns Hopkins University', program: 'School of Nursing — MSN/DNP', overview: 'Research-driven advanced nursing program at a leading academic medical center.', selectivity: 'Highly Selective', location: 'Baltimore, MD', degreeLevels: ['MSN', 'DNP'], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'University of Pennsylvania', program: 'School of Nursing — MSN/DNP', overview: 'Top-ranked nursing school with strong NP specialization tracks.', selectivity: 'Highly Selective', location: 'Philadelphia, PA', degreeLevels: ['MSN', 'DNP'], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'Duke University', program: 'School of Nursing — MSN/DNP', overview: 'Well-regarded advanced practice nursing program.', selectivity: 'Highly Selective', location: 'Durham, NC', degreeLevels: ['MSN', 'DNP'], gpaTarget: GRAD_STRONG_GPA },
  ],

  // ---- Creative/Arts: undergraduate ----
  'graphic-design': [
    { institution: 'Rhode Island School of Design (RISD)', program: 'Graphic Design', overview: 'One of the most prestigious art and design schools in the country.', selectivity: 'Extremely Selective', location: 'Providence, RI', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Parsons School of Design (The New School)', program: 'Communication Design', overview: 'Located in NYC with deep ties to the design and fashion industries.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'ArtCenter College of Design', program: 'Graphic Design', overview: 'Industry-focused design school with strong professional placement.', selectivity: 'Highly Selective', location: 'Pasadena, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  'film-production': [
    { institution: 'University of Southern California', program: 'School of Cinematic Arts', overview: 'One of the most established and well-connected film schools in the world.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'New York University', program: 'Tisch School of the Arts', overview: 'Renowned film program located in a major media hub.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'UCLA', program: 'Film, Theater & Television', overview: 'Public university with a highly-ranked film program and strong LA industry access.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],
  music: [
    { institution: 'Berklee College of Music', program: 'Contemporary Music', overview: 'The leading school for contemporary and popular music performance.', selectivity: 'Highly Selective', location: 'Boston, MA', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
    { institution: 'The Juilliard School', program: 'Music Performance', overview: 'One of the most prestigious classical performance conservatories in the world.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaTarget: EXTREMELY_SELECTIVE_GPA },
    { institution: 'Eastman School of Music', program: 'Music Performance', overview: 'Highly respected conservatory within the University of Rochester.', selectivity: 'Highly Selective', location: 'Rochester, NY', degreeLevels: ["Bachelor's"], gpaTarget: HIGHLY_SELECTIVE_GPA },
  ],

  // ---- Creative/Arts: graduate ----
  'mfa-design': [
    { institution: 'Yale University', program: 'School of Art — MFA Graphic Design', overview: 'Small, highly selective MFA program with an outsized industry reputation.', selectivity: 'Extremely Selective', location: 'New Haven, CT', degreeLevels: ['MFA'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Rhode Island School of Design (RISD)', program: 'MFA Graphic Design', overview: 'Advanced studio-based design training from a top-ranked art school.', selectivity: 'Highly Selective', location: 'Providence, RI', degreeLevels: ['MFA'], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'School of the Art Institute of Chicago (SAIC)', program: 'MFA Studio', overview: 'Large, well-resourced art school with a flexible interdisciplinary MFA.', selectivity: 'Highly Selective', location: 'Chicago, IL', degreeLevels: ['MFA'], gpaTarget: GRAD_STRONG_GPA },
  ],
  'mfa-film': [
    { institution: 'American Film Institute (AFI) Conservatory', program: 'MFA Filmmaking', overview: 'Elite, hands-on conservatory with a strong industry alumni network.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ['MFA'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'University of Southern California', program: 'MFA Film & TV Production', overview: 'Deep industry ties and production resources in Los Angeles.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ['MFA'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'New York University', program: 'Tisch — MFA Film', overview: 'Renowned graduate film program in a major media hub.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ['MFA'], gpaTarget: GRAD_TOP_GPA },
  ],
  'mm-composition': [
    { institution: 'The Juilliard School', program: 'MM Composition', overview: 'One of the most prestigious composition programs in the world.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ['MM'], gpaTarget: GRAD_TOP_GPA },
    { institution: 'Eastman School of Music', program: 'MM Composition', overview: 'Highly respected composition program within the University of Rochester.', selectivity: 'Highly Selective', location: 'Rochester, NY', degreeLevels: ['MM'], gpaTarget: GRAD_STRONG_GPA },
    { institution: 'New England Conservatory', program: 'MM Composition', overview: 'Historic conservatory known for rigorous composition training.', selectivity: 'Highly Selective', location: 'Boston, MA', degreeLevels: ['MM'], gpaTarget: GRAD_STRONG_GPA },
  ],
};

export function getPrograms(majorId, educationLevel) {
  const list = PROGRAMS[majorId] || [];
  if (educationLevel !== 'transfer') return list;
  return list.map((p) => ({ ...p, transferNote: transferNoteFor(p.selectivity) }));
}

function transferNoteFor(selectivity) {
  if (selectivity === 'Extremely Selective') {
    return 'Transfer admission is highly competitive here — strongest for students who complete rigorous prerequisite coursework with a top GPA.';
  }
  if (selectivity === 'Highly Selective') {
    return 'Has a real transfer acceptance pathway, especially from partner community colleges — check articulation agreements early.';
  }
  return 'Generally has a strong transfer acceptance pathway for students who meet the prerequisite coursework.';
}
