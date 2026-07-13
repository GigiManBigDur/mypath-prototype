// PROGRAMS keyed by major id -> array of program cards (5 each: the original 3 flagship-tier
// options plus 2 genuinely more-accessible ones added afterward — not just more names at the
// same selectivity tier, see "Moderately Selective" / "Less Selective" below).
// gpaValue is an illustrative, clearly-approximate threshold (not a real published cutoff) —
// a plain number, or null for programs where admission is audition/portfolio-based and GPA is
// secondary. gpaWeighted ('portfolio' | 'audition') flags programs where the number matters
// less than a submission, so the roadmap can phrase the GPA task accordingly.
//
// selectivity tiers, roughly by gpaValue: Extremely Selective (3.85+) > Highly Selective
// (3.6-3.8) > Selective (3.4) > Moderately Selective (3.2-3.3) > Less Selective (3.0-3.1). The
// two lower tiers exist specifically so GPA entries below ~3.4 still see real, realistic options
// instead of the same top-tier-only list regardless of what they entered.

export const PROGRAMS = {
  // ---- Business: undergraduate ----
  'business-administration': [
    { institution: 'UC Berkeley', program: 'Haas School of Business', overview: 'Public research university in Berkeley, CA — strong in entrepreneurship & finance.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'NYU', program: 'Stern School of Business', overview: 'Private university in New York City — strong in finance & global business.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Pennsylvania', program: 'Wharton School', overview: 'Private Ivy League university in Philadelphia — renowned finance program.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Indiana University', program: 'Kelley School of Business', overview: 'Large public business school with a highly ranked undergraduate program and strong recruiting pipelines.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'University of Arizona', program: 'Eller College of Management', overview: 'Large public business college with accessible admission and solid regional recruiting.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  finance: [
    { institution: 'University of Pennsylvania', program: 'Wharton School — Finance', overview: 'The benchmark undergraduate finance program, deeply tied to Wall Street recruiting.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'NYU', program: 'Stern School of Business — Finance', overview: 'Located steps from the Financial District, with deep industry connections.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Michigan', program: 'Ross School of Business', overview: 'Large public research university with a highly-ranked business program.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Indiana University', program: 'Kelley School of Business — Finance', overview: 'Well-regarded public finance program with strong Midwest recruiting ties.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'University of Arizona', program: 'Eller College of Management — Finance', overview: 'Accessible public finance program with a growing industry network.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  economics: [
    { institution: 'University of Chicago', program: 'Department of Economics', overview: 'Historic home of the "Chicago School" of economics, rigorous and theory-heavy.', selectivity: 'Extremely Selective', location: 'Chicago, IL', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Harvard University', program: 'Department of Economics', overview: 'Ivy League university with one of the most popular economics programs in the country.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'UC Berkeley', program: 'Department of Economics', overview: 'Public research university with a large, well-regarded economics department.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Penn State University', program: 'Department of Economics', overview: 'Large public economics department with flexible course offerings and applied-econ tracks.', selectivity: 'Moderately Selective', location: 'University Park, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'University of Arizona', program: 'Department of Economics', overview: 'Public economics program with accessible admission and strong data-analysis coursework.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  entrepreneurship: [
    { institution: 'Babson College', program: 'Entrepreneurship Program', overview: 'A private college dedicated entirely to entrepreneurship education.', selectivity: 'Highly Selective', location: 'Wellesley, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Southern California', program: 'Marshall School of Business — Lloyd Greif Center', overview: 'Private research university with a well-known entrepreneurship center.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'UC Berkeley', program: 'Haas School of Business — Entrepreneurship', overview: 'Close ties to the Bay Area startup ecosystem.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'Indiana University', program: 'Kelley School of Business — Entrepreneurship', overview: 'Public entrepreneurship program with a strong campus startup incubator.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'University of Arizona', program: 'McGuire Center for Entrepreneurship', overview: 'Accessible entrepreneurship program with hands-on venture experience.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  marketing: [
    { institution: 'Northwestern University', program: 'Medill IMC Program', overview: 'Private university known for integrated marketing communications.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'NYU', program: 'Stern School of Business — Marketing', overview: 'Located in a major media and advertising hub.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Indiana University', program: 'Kelley School of Business — Marketing', overview: 'Large public business school with a well-regarded marketing track.', selectivity: 'Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'University of Alabama', program: 'Culverhouse College of Business — Marketing', overview: 'Large public marketing program with strong regional recruiting.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.1 },
    { institution: 'University of Arizona', program: 'Eller College of Management — Marketing', overview: 'Public marketing program with accessible admission and applied coursework.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  communications: [
    { institution: 'Northwestern University', program: 'Medill School of Journalism', overview: 'One of the most recognized communications/journalism schools in the country.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Southern California', program: 'Annenberg School for Communication', overview: 'Private research university with strong industry ties in LA media.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Texas at Austin', program: 'Moody College of Communication', overview: 'Large public university with a well-rounded communications program.', selectivity: 'Selective', location: 'Austin, TX', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'Ohio University', program: 'E.W. Scripps School of Journalism', overview: 'Well-regarded public journalism/communications program with a strong alumni network.', selectivity: 'Moderately Selective', location: 'Athens, OH', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'University of Arizona', program: 'School of Journalism and Mass Communication', overview: 'Accessible public communications program with hands-on media training.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
    // A 6th card, deliberately breaking this file's usual "5 per major" convention (see the
    // header comment — irregular counts are already expected/tolerated) — added specifically to
    // carry the School-Specific Requirements feature's one verified, real example (see
    // schoolRequirements.js): Cornell's Communication major is housed in CALS (College of
    // Agriculture and Life Sciences), not a standalone communications department, which is
    // exactly the kind of non-obvious structural requirement that feature exists to surface.
    { institution: 'Cornell University', program: 'Communication (CALS)', overview: 'An Ivy League communication program housed within the College of Agriculture and Life Sciences — see this program\'s School-Specific Requirements on Course Selection for why that matters.', selectivity: 'Extremely Selective', location: 'Ithaca, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
  ],

  // ---- Business: graduate ----
  mba: [
    { institution: 'Harvard University', program: 'Harvard Business School — MBA', overview: 'One of the most prestigious MBA programs in the world.', selectivity: 'Extremely Selective', location: 'Boston, MA', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'Stanford University', program: 'Stanford Graduate School of Business — MBA', overview: 'Known for its entrepreneurship focus and Silicon Valley ties.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'University of Pennsylvania', program: 'Wharton School — MBA', overview: 'Deep finance specialization with a large, well-connected alumni network.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'Indiana University', program: 'Kelley School of Business — MBA', overview: 'Well-regarded public MBA program with strong ROI and regional recruiting.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Master's"], gpaValue: 3.3 },
    { institution: 'University of Arizona', program: 'Eller College of Management — MBA', overview: 'Accessible public MBA program with flexible full-time and online formats.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Master's"], gpaValue: 3.1 },
  ],
  'ms-finance': [
    { institution: 'University of Pennsylvania', program: 'Wharton School — MS in Finance', overview: 'Highly technical finance training tied to top Wall Street recruiting.', selectivity: 'Extremely Selective', location: 'Philadelphia, PA', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'MIT', program: 'Sloan School of Management — Master of Finance', overview: 'Quantitative, research-driven finance program.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'Princeton University', program: 'Master in Finance', overview: 'Small, rigorous, quant-focused finance program.', selectivity: 'Extremely Selective', location: 'Princeton, NJ', degreeLevels: ["Master's"], gpaValue: 3.9 },
    { institution: 'Indiana University', program: 'Kelley School of Business — MS Finance', overview: 'Public finance master\'s program with strong placement into corporate finance roles.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Master's"], gpaValue: 3.3 },
    { institution: 'University of Alabama', program: 'Culverhouse College of Business — MS Finance', overview: 'Accessible finance master\'s program with a growing quantitative-finance track.', selectivity: 'Less Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Master's"], gpaValue: 3.0 },
  ],
  'ms-marketing-analytics': [
    { institution: 'Northwestern University', program: 'MS in Marketing Analytics', overview: 'Blends Kellogg marketing strategy with applied data science.', selectivity: 'Highly Selective', location: 'Evanston, IL', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'University of Southern California', program: 'MS in Marketing (Marshall)', overview: 'Data-driven marketing program with strong LA industry ties.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'New York University', program: 'MS in Marketing (Stern)', overview: 'Located in a major advertising and media hub.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'University of Alabama', program: 'MS in Marketing', overview: 'Public marketing analytics program with growing industry ties.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Master's"], gpaValue: 3.2 },
    { institution: 'University of Arizona', program: 'Eller College of Management — MS in Marketing', overview: 'Applied marketing analytics program with accessible admission.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Master's"], gpaValue: 3.0 },
  ],

  // ---- STEM: undergraduate ----
  'computer-science': [
    { institution: 'MIT', program: 'Computer Science (EECS)', overview: 'Private research university in Cambridge, MA — renowned CS/engineering.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Georgia Tech', program: 'College of Computing', overview: 'Public university in Atlanta, GA — highly selective, strong CS/engineering value.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Michigan', program: 'Computer Science & Engineering', overview: 'Public university in Ann Arbor — highly selective, strong engineering/CS.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Utah', program: 'School of Computing', overview: 'Growing public CS program with strong game-development and graphics research.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Computer Science (Ira A. Fulton Schools of Engineering)', overview: 'Large, well-regarded public CS program with accessible admission and strong industry partnerships.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'software-engineering': [
    { institution: 'Carnegie Mellon University', program: 'School of Computer Science', overview: 'One of the most respected computing schools, with dedicated SE coursework.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'University of Waterloo', program: 'Software Engineering', overview: 'Known for its co-op program and deep industry pipeline into tech.', selectivity: 'Highly Selective', location: 'Waterloo, ON', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Rochester Institute of Technology', program: 'Software Engineering', overview: 'One of the first dedicated undergraduate SE programs in the US.', selectivity: 'Selective', location: 'Rochester, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'University of Utah', program: 'School of Computing — Software Engineering', overview: 'Public software engineering track with strong local tech-industry recruiting.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Software Engineering', overview: 'Large public software engineering program with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'computer-engineering': [
    { institution: 'UC Berkeley', program: 'Electrical Engineering & Computer Sciences', overview: 'Public research university with a top-ranked EECS department.', selectivity: 'Extremely Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Georgia Tech', program: 'Computer Engineering', overview: 'Strong hardware/software hybrid curriculum.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Purdue University', program: 'Computer Engineering', overview: 'Large public engineering school with strong industry recruiting.', selectivity: 'Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'University of Utah', program: 'Electrical and Computer Engineering', overview: 'Public ECE program with growing semiconductor-industry ties.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Computer Engineering', overview: 'Large public computer engineering program with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'mechanical-engineering': [
    { institution: 'MIT', program: 'Mechanical Engineering', overview: 'Top-ranked mechanical engineering program with extensive lab resources.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Stanford University', program: 'Mechanical Engineering', overview: 'Strong ties to Silicon Valley product and robotics companies.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Georgia Tech', program: 'Mechanical Engineering', overview: 'One of the largest and most respected ME programs in the US.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Utah', program: 'Mechanical Engineering', overview: 'Public mechanical engineering program with growing aerospace and robotics research.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Mechanical Engineering', overview: 'Large public mechanical engineering program with accessible admission and strong hands-on labs.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'aerospace-engineering': [
    { institution: 'MIT', program: 'Aeronautics and Astronautics', overview: 'One of the oldest and most respected aerospace programs in the world.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Georgia Tech', program: 'Aerospace Engineering', overview: 'Large, well-funded aerospace program with strong industry ties.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Purdue University', program: 'Aeronautics and Astronautics', overview: 'Historic aerospace program (astronaut alma mater) with strong labs.', selectivity: 'Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'University of Alabama', program: 'Aerospace Engineering and Mechanics', overview: 'Public aerospace program located near major aerospace/defense employers.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.1 },
    { institution: 'Arizona State University', program: 'Aerospace Engineering', overview: 'Public aerospace program with accessible admission and strong ties to the Southwest aerospace industry.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'data-science': [
    { institution: 'UC Berkeley', program: 'Data Science', overview: 'One of the first dedicated undergraduate data science programs.', selectivity: 'Extremely Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Carnegie Mellon University', program: 'Statistics & Data Science', overview: 'Rigorous, math-heavy data science curriculum.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'University of Washington', program: 'Data Science', overview: 'Public research university close to major tech employers.', selectivity: 'Highly Selective', location: 'Seattle, WA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Utah', program: 'Data Science', overview: 'Public data science program with growing industry partnerships.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Data Science', overview: 'Large public data science program with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  statistics: [
    { institution: 'Stanford University', program: 'Department of Statistics', overview: 'Strong theoretical foundation with applied research opportunities.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'UC Berkeley', program: 'Department of Statistics', overview: 'One of the top statistics departments in the country.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Michigan', program: 'Department of Statistics', overview: 'Large public program with strong applied statistics track.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Utah', program: 'Department of Mathematics — Statistics', overview: 'Public statistics track with growing applied-research opportunities.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Statistics', overview: 'Public statistics program with accessible admission and applied coursework.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- STEM: graduate ----
  'ms-ai-ml': [
    { institution: 'Stanford University', program: 'MS in Computer Science — AI Track', overview: 'One of the top AI research environments in the world.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.9 },
    { institution: 'Carnegie Mellon University', program: 'MS in Machine Learning', overview: 'Dedicated ML master\'s degree from a top-ranked ML department.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.9 },
    { institution: 'MIT', program: 'MS in Computer Science (EECS) — AI', overview: 'World-renowned AI and robotics labs.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.9 },
    { institution: 'University of Utah', program: 'MS in Computer Science — AI', overview: 'Public AI/ML program with growing research funding.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Master's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'MS in Computer Science — AI', overview: 'Large public AI/ML master\'s program with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Master's"], gpaValue: 3.0 },
  ],
  'ms-robotics': [
    { institution: 'Carnegie Mellon University', program: 'Robotics Institute — MS in Robotics', overview: 'The largest and most established robotics program in the US.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.9 },
    { institution: 'MIT', program: 'MS in Mechanical Engineering — Robotics', overview: 'Deep robotics research tied to MIT CSAIL.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.9 },
    { institution: 'Georgia Tech', program: 'MS in Robotics', overview: 'Large, well-funded robotics program with strong industry partnerships.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Master's", 'PhD'], gpaValue: 3.7 },
    { institution: 'University of Utah', program: 'MS in Robotics', overview: 'Public robotics program with growing lab resources.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Master's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'MS in Robotics and Autonomous Systems', overview: 'Accessible public robotics master\'s program.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Master's"], gpaValue: 3.0 },
  ],
  'ms-data-science': [
    { institution: 'UC Berkeley', program: 'Master of Information and Data Science', overview: 'Applied, industry-oriented data science master\'s program.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'Carnegie Mellon University', program: 'MS in Data Science', overview: 'Rigorous, math-heavy program from a top-ranked statistics department.', selectivity: 'Extremely Selective', location: 'Pittsburgh, PA', degreeLevels: ["Master's"], gpaValue: 3.8 },
    { institution: 'Stanford University', program: 'MS in Statistics — Data Science Track', overview: 'Strong theoretical foundation with applied data science coursework.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Master's"], gpaValue: 3.8 },
    { institution: 'University of Utah', program: 'MS in Data Science', overview: 'Public data science master\'s program with growing industry ties.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Master's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'MS in Data Science, Analytics and Engineering', overview: 'Accessible public data science master\'s program.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Master's"], gpaValue: 3.0 },
  ],

  // ---- Healthcare: undergraduate ----
  nursing: [
    { institution: 'University of Pennsylvania', program: 'School of Nursing', overview: 'Private Ivy League university with a top-ranked nursing school.', selectivity: 'Highly Selective', location: 'Philadelphia, PA', degreeLevels: ["Bachelor's (BSN)"], gpaValue: 3.7 },
    { institution: 'University of Michigan', program: 'School of Nursing', overview: 'Large public university with a well-regarded nursing program.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's (BSN)"], gpaValue: 3.6 },
    { institution: 'Johns Hopkins University', program: 'School of Nursing', overview: 'Research-focused nursing school tied to a leading academic medical center.', selectivity: 'Highly Selective', location: 'Baltimore, MD', degreeLevels: ["Bachelor's (BSN)"], gpaValue: 3.8 },
    { institution: 'University of Utah', program: 'College of Nursing', overview: 'Public nursing program with growing simulation-lab resources.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's (BSN)"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Edson College of Nursing and Health Innovation', overview: 'Large public nursing program with accessible admission and strong clinical placements.', selectivity: 'Less Selective', location: 'Phoenix, AZ', degreeLevels: ["Bachelor's (BSN)"], gpaValue: 3.0 },
  ],
  'biology-premed': [
    { institution: 'Johns Hopkins University', program: 'Biology / Pre-Med Track', overview: 'Private research university renowned for pre-med preparation.', selectivity: 'Extremely Selective', location: 'Baltimore, MD', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'Duke University', program: 'Biology / Pre-Med Track', overview: 'Strong pre-med advising with access to Duke University Medical Center.', selectivity: 'Extremely Selective', location: 'Durham, NC', degreeLevels: ["Bachelor's"], gpaValue: 3.85 },
    { institution: 'UNC Chapel Hill', program: 'Biology / Pre-Med Track', overview: 'Large public university with a strong, well-supported pre-med pipeline.', selectivity: 'Highly Selective', location: 'Chapel Hill, NC', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'University of Alabama', program: 'Biology / Pre-Med Track', overview: 'Public pre-med program with a growing acceptance pipeline into medical school.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Biological Sciences / Pre-Med Track', overview: 'Large public pre-med pipeline with accessible admission and strong advising.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  kinesiology: [
    { institution: 'University of Michigan', program: 'Kinesiology', overview: 'Public research university with a well-established kinesiology department.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'University of Southern California', program: 'Biokinesiology & Physical Therapy', overview: 'Strong biokinesiology program with a direct pathway into USC\'s DPT program.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'University of Florida', program: 'Applied Kinesiology', overview: 'Large public program with strong exercise science research facilities.', selectivity: 'Selective', location: 'Gainesville, FL', degreeLevels: ["Bachelor's"], gpaValue: 3.4 },
    { institution: 'University of Utah', program: 'Health & Kinesiology', overview: 'Public kinesiology program with strong exercise-science labs.', selectivity: 'Moderately Selective', location: 'Salt Lake City, UT', degreeLevels: ["Bachelor's"], gpaValue: 3.1 },
    { institution: 'Arizona State University', program: 'Kinesiology', overview: 'Large public kinesiology program with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- Healthcare: graduate ----
  'md-do': [
    { institution: 'Johns Hopkins University', program: 'School of Medicine', overview: 'One of the most prestigious medical schools in the country.', selectivity: 'Extremely Selective', location: 'Baltimore, MD', degreeLevels: ['MD'], gpaValue: 3.9 },
    { institution: 'Harvard University', program: 'Harvard Medical School', overview: 'World-renowned medical school with extensive research and clinical opportunities.', selectivity: 'Extremely Selective', location: 'Boston, MA', degreeLevels: ['MD'], gpaValue: 3.9 },
    { institution: 'Stanford University', program: 'School of Medicine', overview: 'Strong ties to biomedical research and Silicon Valley health tech.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ['MD'], gpaValue: 3.9 },
    { institution: 'Michigan State University', program: 'College of Osteopathic Medicine', overview: 'Large public osteopathic medical school with a mission-driven, primary-care focus — comparatively more accessible within medical education.', selectivity: 'Moderately Selective', location: 'East Lansing, MI', degreeLevels: ['DO'], gpaValue: 3.5 },
    { institution: 'Ohio University', program: 'Heritage College of Osteopathic Medicine', overview: 'Public osteopathic medical school focused on training physicians for underserved and rural communities.', selectivity: 'Less Selective', location: 'Athens, OH', degreeLevels: ['DO'], gpaValue: 3.4 },
  ],
  'ms-physician-assistant': [
    { institution: 'Duke University', program: 'Physician Assistant Program', overview: 'One of the oldest and most respected PA programs in the country.', selectivity: 'Extremely Selective', location: 'Durham, NC', degreeLevels: ["Master's"], gpaValue: 3.8 },
    { institution: 'University of Iowa', program: 'Physician Assistant Program', overview: 'Well-established public university PA program with strong clinical placements.', selectivity: 'Highly Selective', location: 'Iowa City, IA', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'Emory University', program: 'Physician Assistant Program', overview: 'Private research university tied to a major academic medical center.', selectivity: 'Highly Selective', location: 'Atlanta, GA', degreeLevels: ["Master's"], gpaValue: 3.5 },
    { institution: 'Northern Arizona University', program: 'Physician Assistant Program', overview: 'Public PA program with a growing regional clinical network.', selectivity: 'Moderately Selective', location: 'Flagstaff, AZ', degreeLevels: ["Master's"], gpaValue: 3.3 },
    { institution: 'University of North Dakota', program: 'Physician Assistant Program', overview: 'Public PA program focused on training providers for rural and underserved areas.', selectivity: 'Less Selective', location: 'Grand Forks, ND', degreeLevels: ["Master's"], gpaValue: 3.1 },
  ],
  'msn-np': [
    { institution: 'Johns Hopkins University', program: 'School of Nursing — MSN/DNP', overview: 'Research-driven advanced nursing program at a leading academic medical center.', selectivity: 'Highly Selective', location: 'Baltimore, MD', degreeLevels: ['MSN', 'DNP'], gpaValue: 3.8 },
    { institution: 'University of Pennsylvania', program: 'School of Nursing — MSN/DNP', overview: 'Top-ranked nursing school with strong NP specialization tracks.', selectivity: 'Highly Selective', location: 'Philadelphia, PA', degreeLevels: ['MSN', 'DNP'], gpaValue: 3.8 },
    { institution: 'Duke University', program: 'School of Nursing — MSN/DNP', overview: 'Well-regarded advanced practice nursing program.', selectivity: 'Highly Selective', location: 'Durham, NC', degreeLevels: ['MSN', 'DNP'], gpaValue: 3.8 },
    { institution: 'University of Alabama at Birmingham', program: 'School of Nursing — MSN/DNP', overview: 'Public advanced-practice nursing program with strong online/hybrid options.', selectivity: 'Moderately Selective', location: 'Birmingham, AL', degreeLevels: ['MSN', 'DNP'], gpaValue: 3.3 },
    { institution: 'Frontier Nursing University', program: 'MSN — Nurse Practitioner', overview: 'Distance-accessible advanced nursing program focused on rural and underserved care.', selectivity: 'Less Selective', location: 'Versailles, KY', degreeLevels: ['MSN'], gpaValue: 3.0 },
  ],

  // ---- Creative/Arts: undergraduate ----
  'graphic-design': [
    { institution: 'Rhode Island School of Design (RISD)', program: 'Graphic Design', overview: 'One of the most prestigious art and design schools in the country.', selectivity: 'Extremely Selective', location: 'Providence, RI', degreeLevels: ["Bachelor's"], gpaValue: 3.6, gpaWeighted: 'portfolio' },
    { institution: 'Parsons School of Design (The New School)', program: 'Communication Design', overview: 'Located in NYC with deep ties to the design and fashion industries.', selectivity: 'Highly Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.4, gpaWeighted: 'portfolio' },
    { institution: 'ArtCenter College of Design', program: 'Graphic Design', overview: 'Industry-focused design school with strong professional placement.', selectivity: 'Highly Selective', location: 'Pasadena, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.4, gpaWeighted: 'portfolio' },
    { institution: 'Kansas City Art Institute', program: 'Graphic Design', overview: 'Small, accessible private art school with a hands-on studio culture.', selectivity: 'Moderately Selective', location: 'Kansas City, MO', degreeLevels: ["Bachelor's"], gpaValue: 3.1, gpaWeighted: 'portfolio' },
    { institution: 'University of Arizona', program: 'School of Art — Graphic Design', overview: 'Public design program with accessible academic admission alongside its portfolio review.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0, gpaWeighted: 'portfolio' },
  ],
  'film-production': [
    { institution: 'University of Southern California', program: 'School of Cinematic Arts', overview: 'One of the most established and well-connected film schools in the world.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'New York University', program: 'Tisch School of the Arts', overview: 'Renowned film program located in a major media hub.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'UCLA', program: 'Film, Theater & Television', overview: 'Public university with a highly-ranked film program and strong LA industry access.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Chapman University', program: 'Dodge College of Film and Media Arts', overview: 'Well-resourced film program with strong hands-on production opportunities.', selectivity: 'Moderately Selective', location: 'Orange, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'The Sidney Poitier New American Film School', overview: 'Large public film program with accessible admission and modern production facilities.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  music: [
    { institution: 'Berklee College of Music', program: 'Contemporary Music', overview: 'The leading school for contemporary and popular music performance.', selectivity: 'Highly Selective', location: 'Boston, MA', degreeLevels: ["Bachelor's"], gpaValue: 3.3, gpaWeighted: 'audition' },
    { institution: 'The Juilliard School', program: 'Music Performance', overview: 'One of the most prestigious classical performance conservatories in the world.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ["Bachelor's"], gpaValue: null, gpaWeighted: 'audition' },
    { institution: 'Eastman School of Music', program: 'Music Performance', overview: 'Highly respected conservatory within the University of Rochester.', selectivity: 'Highly Selective', location: 'Rochester, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.5, gpaWeighted: 'audition' },
    { institution: 'University of North Texas', program: 'College of Music', overview: 'One of the largest music schools in the country, known for jazz studies, with accessible academic admission alongside audition.', selectivity: 'Moderately Selective', location: 'Denton, TX', degreeLevels: ["Bachelor's"], gpaValue: 3.2, gpaWeighted: 'audition' },
    { institution: 'Belmont University', program: 'School of Music', overview: 'Nashville-based music program with strong commercial-music industry ties and accessible admission.', selectivity: 'Less Selective', location: 'Nashville, TN', degreeLevels: ["Bachelor's"], gpaValue: 3.0, gpaWeighted: 'audition' },
  ],

  // ---- Creative/Arts: graduate ----
  'mfa-design': [
    { institution: 'Yale University', program: 'School of Art — MFA Graphic Design', overview: 'Small, highly selective MFA program with an outsized industry reputation.', selectivity: 'Extremely Selective', location: 'New Haven, CT', degreeLevels: ['MFA'], gpaValue: 3.6, gpaWeighted: 'portfolio' },
    { institution: 'Rhode Island School of Design (RISD)', program: 'MFA Graphic Design', overview: 'Advanced studio-based design training from a top-ranked art school.', selectivity: 'Highly Selective', location: 'Providence, RI', degreeLevels: ['MFA'], gpaValue: 3.6, gpaWeighted: 'portfolio' },
    { institution: 'School of the Art Institute of Chicago (SAIC)', program: 'MFA Studio', overview: 'Large, well-resourced art school with a flexible interdisciplinary MFA.', selectivity: 'Highly Selective', location: 'Chicago, IL', degreeLevels: ['MFA'], gpaValue: 3.5, gpaWeighted: 'portfolio' },
    { institution: 'University of North Texas', program: 'MFA in Design', overview: 'Public design MFA with accessible admission and strong studio resources.', selectivity: 'Moderately Selective', location: 'Denton, TX', degreeLevels: ['MFA'], gpaValue: 3.3, gpaWeighted: 'portfolio' },
    { institution: 'University of Arizona', program: 'MFA in Studio Art', overview: 'Accessible public MFA program with strong faculty mentorship.', selectivity: 'Less Selective', location: 'Tucson, AZ', degreeLevels: ['MFA'], gpaValue: 3.1, gpaWeighted: 'portfolio' },
  ],
  'mfa-film': [
    { institution: 'American Film Institute (AFI) Conservatory', program: 'MFA Filmmaking', overview: 'Elite, hands-on conservatory with a strong industry alumni network.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ['MFA'], gpaValue: 3.6, gpaWeighted: 'portfolio' },
    { institution: 'University of Southern California', program: 'MFA Film & TV Production', overview: 'Deep industry ties and production resources in Los Angeles.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ['MFA'], gpaValue: 3.7, gpaWeighted: 'portfolio' },
    { institution: 'New York University', program: 'Tisch — MFA Film', overview: 'Renowned graduate film program in a major media hub.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ['MFA'], gpaValue: 3.6, gpaWeighted: 'portfolio' },
    { institution: 'Chapman University', program: 'MFA Film Production', overview: 'Well-resourced private film MFA with strong hands-on production access.', selectivity: 'Moderately Selective', location: 'Orange, CA', degreeLevels: ['MFA'], gpaValue: 3.3, gpaWeighted: 'portfolio' },
    { institution: 'Arizona State University', program: 'MFA in Film and Media Production', overview: 'Accessible public film MFA with modern production facilities.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ['MFA'], gpaValue: 3.0, gpaWeighted: 'portfolio' },
  ],
  'mm-composition': [
    { institution: 'The Juilliard School', program: 'MM Composition', overview: 'One of the most prestigious composition programs in the world.', selectivity: 'Extremely Selective', location: 'New York, NY', degreeLevels: ['MM'], gpaValue: null, gpaWeighted: 'audition' },
    { institution: 'Eastman School of Music', program: 'MM Composition', overview: 'Highly respected composition program within the University of Rochester.', selectivity: 'Highly Selective', location: 'Rochester, NY', degreeLevels: ['MM'], gpaValue: 3.5, gpaWeighted: 'audition' },
    { institution: 'New England Conservatory', program: 'MM Composition', overview: 'Historic conservatory known for rigorous composition training.', selectivity: 'Highly Selective', location: 'Boston, MA', degreeLevels: ['MM'], gpaValue: 3.5, gpaWeighted: 'audition' },
    { institution: 'University of North Texas', program: 'MM Composition', overview: 'Large public music school with a strong composition faculty and accessible academic admission.', selectivity: 'Moderately Selective', location: 'Denton, TX', degreeLevels: ['MM'], gpaValue: 3.2, gpaWeighted: 'audition' },
    { institution: 'Belmont University', program: 'MM Composition', overview: 'Accessible private music program with strong commercial-composition ties.', selectivity: 'Less Selective', location: 'Nashville, TN', degreeLevels: ['MM'], gpaValue: 3.0, gpaWeighted: 'audition' },
  ],

  // ---- Academic/Humanities: undergraduate ----
  'political-science-prelaw': [
    { institution: 'Georgetown University', program: 'Political Science / Government', overview: 'Private university in Washington, DC — renowned for political science given its location.', selectivity: 'Extremely Selective', location: 'Washington, DC', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'University of Michigan', program: 'Political Science', overview: 'Large public university with a well-regarded political science department.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'UC Berkeley', program: 'Political Science', overview: 'Public research university with a renowned political science program.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Alabama', program: 'Department of Political Science', overview: 'Public political science program with a growing pre-law advising pipeline.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'School of Politics and Global Studies', overview: 'Large public political science program with accessible admission and strong pre-law advising.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  history: [
    { institution: 'Yale University', program: 'Department of History', overview: 'Private Ivy League university with a renowned history program.', selectivity: 'Extremely Selective', location: 'New Haven, CT', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'University of Virginia', program: 'Department of History', overview: 'Public university with a well-regarded history department.', selectivity: 'Highly Selective', location: 'Charlottesville, VA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Chicago', program: 'Department of History', overview: 'Private research university renowned for its humanities programs.', selectivity: 'Extremely Selective', location: 'Chicago, IL', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'University of Alabama', program: 'Department of History', overview: 'Public history program with a growing public-history and archives track.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Department of History', overview: 'Large public history department with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  psychology: [
    { institution: 'University of Michigan', program: 'Department of Psychology', overview: 'Large public university with a renowned psychology department.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Stanford University', program: 'Department of Psychology', overview: 'Private research university with a top-ranked psychology program.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.9 },
    { institution: 'UCLA', program: 'Department of Psychology', overview: 'Public university with a strong, research-active psychology program.', selectivity: 'Highly Selective', location: 'Los Angeles, CA', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'University of Alabama', program: 'Department of Psychology', overview: 'Public psychology program with a growing clinical-research track.', selectivity: 'Moderately Selective', location: 'Tuscaloosa, AL', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Department of Psychology', overview: 'One of the largest psychology departments in the country, with accessible admission.', selectivity: 'Less Selective', location: 'Tempe, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- Academic/Humanities: graduate ----
  'jd-law': [
    { institution: 'Yale University', program: 'Yale Law School', overview: 'Widely regarded as the top-ranked law school in the country.', selectivity: 'Extremely Selective', location: 'New Haven, CT', degreeLevels: ['JD'], gpaValue: 3.9 },
    { institution: 'Harvard University', program: 'Harvard Law School', overview: 'One of the largest and most influential law schools in the world.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ['JD'], gpaValue: 3.9 },
    { institution: 'Stanford University', program: 'Stanford Law School', overview: 'Small, highly selective law school with strong Silicon Valley/tech-law ties.', selectivity: 'Extremely Selective', location: 'Stanford, CA', degreeLevels: ['JD'], gpaValue: 3.9 },
    { institution: 'University of Arizona', program: 'James E. Rogers College of Law', overview: 'Public law school with a comparatively accessible admissions profile and strong regional bar-passage rates.', selectivity: 'Moderately Selective', location: 'Tucson, AZ', degreeLevels: ['JD'], gpaValue: 3.4 },
    { institution: 'University of Alabama', program: 'School of Law', overview: 'Public law school known for strong scholarship offers and a solid regional legal network.', selectivity: 'Less Selective', location: 'Tuscaloosa, AL', degreeLevels: ['JD'], gpaValue: 3.2 },
  ],
  'phd-history': [
    { institution: 'Harvard University', program: 'PhD in History', overview: 'One of the most prestigious history doctoral programs in the country.', selectivity: 'Extremely Selective', location: 'Cambridge, MA', degreeLevels: ['PhD'], gpaValue: 3.9 },
    { institution: 'Princeton University', program: 'PhD in History', overview: 'Small, highly selective doctoral program with strong funding.', selectivity: 'Extremely Selective', location: 'Princeton, NJ', degreeLevels: ['PhD'], gpaValue: 3.9 },
    { institution: 'UC Berkeley', program: 'PhD in History', overview: 'Large, well-resourced public university history doctoral program.', selectivity: 'Highly Selective', location: 'Berkeley, CA', degreeLevels: ['PhD'], gpaValue: 3.7 },
    { institution: 'University of Arizona', program: 'PhD in History', overview: 'Public history doctoral program with solid funding and a comparatively accessible admissions profile.', selectivity: 'Moderately Selective', location: 'Tucson, AZ', degreeLevels: ['PhD'], gpaValue: 3.4 },
    { institution: 'Ohio University', program: 'PhD in History', overview: 'Public history doctoral program with a strong public-history focus.', selectivity: 'Less Selective', location: 'Athens, OH', degreeLevels: ['PhD'], gpaValue: 3.2 },
  ],
  'psyd-clinical-psych': [
    { institution: 'Rutgers University', program: 'PsyD — GSAPP', overview: 'One of the oldest and most respected PsyD programs in the country.', selectivity: 'Highly Selective', location: 'Piscataway, NJ', degreeLevels: ['PsyD'], gpaValue: 3.5 },
    { institution: 'University of Michigan', program: 'PhD in Clinical Psychology', overview: 'Research-intensive clinical psychology doctoral program.', selectivity: 'Extremely Selective', location: 'Ann Arbor, MI', degreeLevels: ['PhD'], gpaValue: 3.8 },
    { institution: 'UCLA', program: 'PhD in Clinical Psychology', overview: 'Highly-ranked clinical psychology doctoral program with strong research funding.', selectivity: 'Extremely Selective', location: 'Los Angeles, CA', degreeLevels: ['PhD'], gpaValue: 3.8 },
    { institution: 'Wright State University', program: 'PsyD in Clinical Psychology (School of Professional Psychology)', overview: 'Public PsyD program with accessible admission and practitioner-focused training.', selectivity: 'Moderately Selective', location: 'Dayton, OH', degreeLevels: ['PsyD'], gpaValue: 3.3 },
    { institution: 'University of Indianapolis', program: 'PsyD in Clinical Psychology', overview: 'Private, practitioner-focused PsyD program with a comparatively accessible admissions profile.', selectivity: 'Less Selective', location: 'Indianapolis, IN', degreeLevels: ['PsyD'], gpaValue: 3.0 },
  ],

  // ---- Sports: undergraduate ----
  'sports-management': [
    { institution: 'University of Michigan', program: 'Sports Management', overview: 'Renowned public sports management program in a major college-athletics town.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.7 },
    { institution: 'Ohio State University', program: 'Sports Management', overview: 'Large public program with deep ties to one of the country\'s biggest athletic departments.', selectivity: 'Moderately Selective', location: 'Columbus, OH', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'Indiana University', program: 'Sports Management', overview: 'Well-regarded public program with strong industry placement.', selectivity: 'Moderately Selective', location: 'Bloomington, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
  ],

  // ---- Culinary Arts: undergraduate ----
  'culinary-arts': [
    { institution: 'Culinary Institute of America', program: 'Culinary Arts', overview: 'World-renowned culinary school — admission weighs passion and kitchen readiness alongside academics.', selectivity: 'Highly Selective', location: 'Hyde Park, NY', degreeLevels: ["Associate's", "Bachelor's"], gpaValue: 3.2, gpaWeighted: 'portfolio' },
    { institution: 'Auguste Escoffier School of Culinary Arts', program: 'Culinary Arts', overview: 'Career-focused culinary school with an accessible, hands-on admissions process.', selectivity: 'Less Selective', location: 'Boulder, CO', degreeLevels: ['Certificate', "Associate's"], gpaValue: 2.7, gpaWeighted: 'portfolio' },
    { institution: 'Johnson & Wales University', program: 'Culinary Arts', overview: 'Well-regarded culinary program with strong industry placement and an accessible admissions profile.', selectivity: 'Moderately Selective', location: 'Providence, RI', degreeLevels: ["Associate's", "Bachelor's"], gpaValue: 2.8, gpaWeighted: 'portfolio' },
  ],
  'food-science': [
    { institution: 'Cornell University', program: 'Food Science', overview: 'One of the most renowned food science programs in the country.', selectivity: 'Extremely Selective', location: 'Ithaca, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'Penn State University', program: 'Food Science', overview: 'Strong public food science program with deep industry research ties.', selectivity: 'Moderately Selective', location: 'University Park, PA', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'University of Georgia', program: 'Food Science and Technology', overview: 'Accessible public program backed by a strong agricultural research college.', selectivity: 'Less Selective', location: 'Athens, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'hospitality-management': [
    { institution: 'Cornell University', program: 'School of Hotel Administration', overview: 'The original and most prestigious hospitality management program in the US.', selectivity: 'Extremely Selective', location: 'Ithaca, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'Michigan State University', program: 'School of Hospitality Business', overview: 'One of the oldest and most respected hospitality programs, with strong industry recruiting.', selectivity: 'Moderately Selective', location: 'East Lansing, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'University of Nevada, Las Vegas (UNLV)', program: 'Hospitality Management', overview: 'Accessible public program deeply tied to Las Vegas\'s hospitality and gaming industry.', selectivity: 'Less Selective', location: 'Las Vegas, NV', degreeLevels: ["Bachelor's"], gpaValue: 2.8 },
  ],

  // ---- Community & Leadership: undergraduate ----
  'nonprofit-management': [
    { institution: 'University of Michigan', program: 'Gerald R. Ford School of Public Policy', overview: 'Highly-ranked public policy school with a strong nonprofit/public administration track.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'Indiana University', program: 'Lilly Family School of Philanthropy', overview: 'The first and only school in the world dedicated entirely to the study of philanthropy — a genuinely well-known standalone nonprofit studies program.', selectivity: 'Moderately Selective', location: 'Indianapolis, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'University of Georgia', program: 'Public Administration', overview: 'Accessible public program with a solid nonprofit/public-sector career pipeline.', selectivity: 'Less Selective', location: 'Athens, GA', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'social-work': [
    { institution: 'University of Michigan', program: 'School of Social Work', overview: 'Top-ranked social work program with extensive field-placement partnerships.', selectivity: 'Highly Selective', location: 'Ann Arbor, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'University of Washington', program: 'School of Social Work', overview: 'Well-regarded public social work program with strong community ties.', selectivity: 'Moderately Selective', location: 'Seattle, WA', degreeLevels: ["Bachelor's"], gpaValue: 3.3 },
    { institution: 'Ohio State University', program: 'College of Social Work', overview: 'Large, accessible public social work program with broad field-placement options.', selectivity: 'Less Selective', location: 'Columbus, OH', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- Media & Entertainment: undergraduate ----
  journalism: [
    { institution: 'Northwestern University', program: 'Medill School of Journalism', overview: 'One of the most recognized journalism schools in the country.', selectivity: 'Extremely Selective', location: 'Evanston, IL', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'University of Missouri', program: 'School of Journalism', overview: 'One of the oldest and most respected journalism schools in the US, with real hands-on newsroom experience.', selectivity: 'Moderately Selective', location: 'Columbia, MO', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Arizona State University', program: 'Walter Cronkite School of Journalism and Mass Communication', overview: 'Large, well-regarded public journalism school with accessible admission.', selectivity: 'Less Selective', location: 'Phoenix, AZ', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- Personal Development: undergraduate ----
  'human-resources': [
    { institution: 'Cornell University', program: 'ILR School (Industrial and Labor Relations)', overview: 'The top HR-specific undergraduate program in the US.', selectivity: 'Extremely Selective', location: 'Ithaca, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.8 },
    { institution: 'Michigan State University', program: 'School of Human Resources and Labor Relations', overview: 'Well-regarded public HR program with strong corporate recruiting.', selectivity: 'Moderately Selective', location: 'East Lansing, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Ohio State University', program: 'Human Resources Management', overview: 'Large, accessible public HR program within a well-ranked business school.', selectivity: 'Less Selective', location: 'Columbus, OH', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],

  // ---- Outdoors (Gardening / Travel): undergraduate ----
  horticulture: [
    { institution: 'Cornell University', program: 'Horticulture', overview: 'Renowned horticulture program within a top agricultural sciences college.', selectivity: 'Highly Selective', location: 'Ithaca, NY', degreeLevels: ["Bachelor's"], gpaValue: 3.6 },
    { institution: 'Purdue University', program: 'Horticulture', overview: 'Well-regarded public horticulture program with strong greenhouse and field research facilities.', selectivity: 'Moderately Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'Michigan State University', program: 'Horticulture', overview: 'Strong land-grant agricultural program with accessible admission.', selectivity: 'Less Selective', location: 'East Lansing, MI', degreeLevels: ["Bachelor's"], gpaValue: 3.0 },
  ],
  'tourism-management': [
    { institution: 'George Washington University', program: 'International Tourism and Hospitality Management', overview: 'Strong DC-based tourism and event-management program with real policy/industry ties.', selectivity: 'Highly Selective', location: 'Washington, DC', degreeLevels: ["Bachelor's"], gpaValue: 3.5 },
    { institution: 'Purdue University', program: 'Hospitality and Tourism Management', overview: 'Well-regarded public tourism management program.', selectivity: 'Moderately Selective', location: 'West Lafayette, IN', degreeLevels: ["Bachelor's"], gpaValue: 3.2 },
    { institution: 'University of Central Florida', program: 'Rosen College of Hospitality Management', overview: 'Genuinely well-known tourism/hospitality program given Orlando\'s tourism industry, with accessible admission.', selectivity: 'Less Selective', location: 'Orlando, FL', degreeLevels: ["Bachelor's"], gpaValue: 2.9 },
  ],
};

export function getPrograms(majorId, educationLevel) {
  const list = PROGRAMS[majorId] || [];
  if (educationLevel !== 'transfer') return list;
  return list.map((p) => ({ ...p, transferNote: transferNoteFor(p.selectivity) }));
}

// Merges programs across multiple selected majors into one deduplicated list, keyed by
// institution+program (not majorId) so the same program offered under two selected majors
// shows once, labeled with every major it fits.
export function getMergedPrograms(majorIds, educationLevel) {
  const byKey = new Map();
  for (const majorId of majorIds) {
    for (const p of getPrograms(majorId, educationLevel)) {
      const key = `${p.institution}::${p.program}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.majorIds.includes(majorId)) existing.majorIds.push(majorId);
      } else {
        byKey.set(key, { ...p, key, majorIds: [majorId] });
      }
    }
  }
  return Array.from(byKey.values());
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

// A student can select multiple majors, so how many cards to show scales with how many majors
// are in play — otherwise a 3-major selection would either flood the grid or hide too much.
function maxShownFor(majorCount) {
  return Math.max(4, majorCount * 4);
}

// Evenly spaced sample across an already-sorted array — used both for the no-GPA fallback (a
// representative spread across the full selectivity range) and to spread the "reachable" pool
// across its own range rather than just taking the first N entries.
function evenSample(arr, n) {
  if (n <= 0) return [];
  if (arr.length <= n) return arr;
  if (n === 1) return [arr[Math.floor((arr.length - 1) / 2)]];
  const seen = new Set();
  const result = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (arr.length - 1)) / (n - 1));
    if (!seen.has(idx)) {
      seen.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

// Selects a GPA-connected mix instead of always showing the same fixed list: mostly programs at
// or below the student's entered GPA (so the list actually feels reachable), plus a single
// aspirational reach pick above it for motivation — never a whole list of reach-only schools.
// Programs with gpaValue === null (portfolio/audition-based, where GPA is explicitly secondary)
// are always treated as reachable on the GPA axis. This selection step still does NOT add
// Reach/Match/Safety labels or balancing/sorting logic of its own — see reachMatchSafetyTag()
// below for the (separate, purely cosmetic) per-card label.
//
// If gpaString is blank/unparseable, this returns an evenly-spaced representative sample across
// the full selectivity range instead of guessing — the same "current behavior" fallback the app
// had before GPA-based selection existed, just capped at a sane count instead of dumping every
// program now that each major has 5 instead of 3.
export function selectProgramsForGpa(programs, gpaString, majorCount = 1) {
  const maxShown = maxShownFor(majorCount);
  if (programs.length <= maxShown) return programs;

  const byReachability = [...programs].sort((a, b) => (a.gpaValue ?? -1) - (b.gpaValue ?? -1));

  const gpa = parseFloat(gpaString);
  if (!gpaString || Number.isNaN(gpa)) {
    return evenSample(byReachability, maxShown);
  }

  const reachable = byReachability.filter((p) => p.gpaValue == null || p.gpaValue <= gpa + 0.05);
  const reach = byReachability.filter((p) => p.gpaValue != null && p.gpaValue > gpa + 0.05);

  const reachSlots = reach.length ? 1 : 0;
  const picks = new Set(evenSample(reachable, Math.min(reachable.length, maxShown - reachSlots)));
  if (reachSlots) picks.add(reach[0]); // the single reach option nearest their GPA, for motivation

  // If there weren't enough reachable programs to fill the quota (e.g. a very low entered GPA),
  // backfill from the remaining reach options rather than showing fewer cards than available.
  for (const p of reach) {
    if (picks.size >= maxShown) break;
    picks.add(p);
  }

  // Preserve ascending-selectivity order for a coherent, least-to-most-selective card grid.
  return byReachability.filter((p) => picks.has(p));
}

// Personalized per-card label — distinct from `selectivity` (an objective description of the
// program itself, unaffected by who's looking at it). Purely a display tag: no sorting,
// filtering, or "balance your list" logic lives here or anywhere else. Returns null when there's
// nothing to compare (blank/unparseable GPA, or a program with gpaValue === null — portfolio/
// audition programs where GPA is explicitly secondary, same "don't guess" principle as
// selectProgramsForGpa above) so the caller can simply omit the badge.
export function reachMatchSafetyTag(gpaString, gpaValue) {
  if (gpaValue == null) return null;
  const gpa = parseFloat(gpaString);
  if (!gpaString || Number.isNaN(gpa)) return null;

  // Rounded to avoid floating-point noise (e.g. 3.0 - 3.2 === -0.20000000000000018 in JS)
  // landing an exact boundary GPA on the wrong side of the cutoff.
  const diff = Math.round((gpa - gpaValue) * 100) / 100;
  if (diff >= 0.3) return 'Safety';
  if (diff >= -0.2) return 'Match';
  return 'Reach';
}
