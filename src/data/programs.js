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
