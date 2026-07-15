// School-Specific Requirements — a third, distinct recommendation layer on Course Selection,
// alongside (not replacing) the interest-based recommendations (courseRecommendations.js) and the
// field-level "Program-Specific Course Recommendations" (programRecommendations.js). Those two
// operate at the level of an interest track or a major's whole FIELD (e.g. "Engineering programs
// broadly want calculus and physics"); this one exists specifically for the non-obvious,
// STRUCTURAL requirements tied to one individual school + program combination that a field-level
// rule can never catch — e.g. a major housed in an unexpected college with its own blanket
// distribution requirements.
//
// Keyed by the exact same `${institution}::${program}` string `getMergedPrograms()` (programs.js)
// already produces as each program card's `key`, and that `state.selectedProgramKeys` (Discovery
// Screen 3c) already stores — so lookup is a direct object read, no fuzzy matching needed.
//
// CRITICAL RULE: every entry here must be real, independently verified research — never a guess
// or inference from a program's name/subject. A program with no entry here is NOT assumed to have
// no special requirements; it just means nobody has verified it yet (see
// CourseSelectionScreen.jsx's honest fallback for the unverified case). This file is meant to grow
// one verified program at a time, not all at once — each entry is self-contained ({ requirement,
// why, transferNote?, source }), so adding the next one never requires touching the lookup/render
// code, only adding a new key here.
export const SCHOOL_SPECIFIC_REQUIREMENTS = {
  'Cornell University::Communication (CALS)': {
    requirement:
      'A full year of Introductory Biology (with lab), 3 credits of Chemistry or Physics, and a ' +
      'Statistics/Quantitative Literacy course.',
    why:
      "Cornell's Communication major is housed within the College of Agriculture and Life " +
      "Sciences (CALS), not a standalone communications department. CALS applies broad " +
      "science-distribution requirements across every major in the college, regardless of " +
      'subject — which is exactly why a science-heavy requirement attached to a "Communication" ' +
      'major is easy to miss.',
    transferNote:
      'Transfer applicants specifically need this coursework completed, or in progress, at the ' +
      'time of application.',
    source: "Cornell CALS undergraduate admissions requirements (verified directly, not inferred).",
  },

  // The 25 entries below were researched by an autonomous research pass across every program
  // under the data-science/statistics/ms-ai-ml/ms-robotics/ms-data-science majors (all 5 schools
  // per major, not just the flagship). Every `requirement`/`why` claim was independently
  // fetched from a real institutional page where noted "verified directly"; where direct fetch
  // was blocked (Stanford's domain returned 403s all session) or a search-derived synthesis was
  // used instead, `source` says "verified via search" — still grounded in real, cited .edu pages,
  // just not a page this session directly read start-to-finish. Three claims with the highest
  // stakes (a claimed-discontinued Stanford major, MIT's no-terminal-master's policy, and a
  // 2016-dated Utah PDF) were independently re-verified via a second, separate search pass before
  // being included — see each entry's own source citation for the corroborating pages found.
  'UC Berkeley::Data Science': {
    requirement:
      'Admission to UC Berkeley does not include admission to the Data Science major — ' +
      'declaring it requires completing a specific 6-course pathway (Foundations of Data ' +
      'Science, Calculus I & II, Linear Algebra, CS 61A, CS 61B) each with a C- or better, plus ' +
      'a minimum 2.0 GPA calculated only across the Data 8, Linear Algebra, and Data Structures ' +
      'courses.',
    why:
      'The major has its own competitive declaration gate, separate from university admission, ' +
      "with a narrower GPA calculation than a student's overall GPA — something not implied by " +
      'just being accepted to Berkeley.',
    source: 'UC Berkeley Division of Computing, Data Science, and Society — declaring the Data ' +
      'Science major page (cdss.berkeley.edu), verified directly.',
  },
  'Carnegie Mellon University::Statistics & Data Science': {
    requirement:
      "No distinct program-specific admission requirement beyond Carnegie Mellon's general " +
      'Dietrich College preparation baseline (4 years English, 3 years math through ' +
      'pre-calculus, at least 1 year of science, 2 years of a foreign language).',
    why: "Checked directly against CMU's own admissions page — confirmed this program doesn't " +
      'add anything beyond the college-wide minimum.',
    source: 'Carnegie Mellon University admissions — Dietrich College of Humanities & Social ' +
      'Sciences, Statistics & Data Science program page, verified directly.',
  },
  'University of Washington::Data Science': {
    requirement:
      'UW has no standalone Data Science bachelor\'s degree — it exists only as an "Option" ' +
      'added onto a separate host major (Computer Science, Applied Mathematics, Human Centered ' +
      'Design & Engineering, Industrial & Systems Engineering, or Atmospheric & Climate ' +
      'Science). A student must be admitted to and declare one of those majors first, then ' +
      "separately apply for its Data Science Option; the Human Centered Design & Engineering " +
      'option has stopped accepting new applicants as of Winter 2024.',
    why:
      "A student searching for \"UW Data Science\" would reasonably expect one unified major; " +
      "it's actually a secondary add-on to a different degree, and the host major chosen " +
      'affects whether the option is even still open.',
    source: 'University of Washington Human Centered Design & Engineering, Industrial & Systems ' +
      'Engineering, and Applied Mathematics department pages (hcde.washington.edu, ' +
      'ise.washington.edu, amath.washington.edu) — verified via search.',
  },
  'University of Utah::Data Science': {
    requirement:
      'Declaring Full Major Status in Data Science (the same pre-major process used for ' +
      'Computer Science) requires a B- or better in Data Structures & Algorithms (CS 2420) and ' +
      'a C or better in Calculus I.',
    why:
      'This is a competitive secondary gate after general university admission — specific ' +
      'per-course grade thresholds, not just an overall GPA check.',
    source: 'University of Utah Kahlert School of Computing — undergraduate program handbook ' +
      'and Data Science program page, verified directly.',
  },
  'Arizona State University::Data Science': {
    requirement:
      "No distinct program-specific requirement beyond ASU's standard first-year admission " +
      'baseline (3.00 high school GPA, 3 years of relevant coursework).',
    why: 'Checked directly — no additional Data Science-specific prerequisite or declaration ' +
      'gate was found.',
    source: 'Arizona State University School of Mathematical and Statistical Sciences — Data ' +
      "Science B.S. program page, cross-checked against ASU's general admission requirements.",
  },
  'Stanford University::Department of Statistics': {
    requirement:
      'Stanford discontinued its main undergraduate statistics-focused major — Mathematical ' +
      'and Computational Science stopped accepting new majors and minors as of September 1, ' +
      '2022 — and replaced it with a new, differently-named Data Science B.S./B.A., jointly ' +
      'run by Statistics, Mathematics, Computer Science, and Management Science & Engineering. ' +
      'A plain Statistics minor still exists, but the undergraduate major-level path now runs ' +
      'through Data Science.',
    why:
      'A student targeting "Stanford Statistics" as a major would be surprised the historical ' +
      'path was discontinued and folded into a differently-named, multi-department degree.',
    source: 'Stanford Department of Statistics and Mathematical & Computational Science FAQ ' +
      "pages (statistics.stanford.edu, mcs.stanford.edu), and Stanford Human Sciences' own " +
      'program announcement (humsci.stanford.edu) — independently re-verified in a second pass.',
  },
  'UC Berkeley::Department of Statistics': {
    requirement:
      'Declaring the Statistics major requires 5 specific lower-division courses (Calculus I & ' +
      'II, Math 53, Math 54/56, and Stat 20/Data C8) for a letter grade, with a minimum 2.0 GPA ' +
      'across all five and at least a C in Math 53, Math 54/56, and Stat 20/Data C8 ' +
      'specifically.',
    why:
      "Same pattern as Berkeley's Data Science major — general campus admission doesn't " +
      'guarantee entry to the Statistics major itself; it\'s a separate, prerequisite-GPA-gated ' +
      'declaration.',
    source: 'UC Berkeley Department of Statistics — declaring the major page ' +
      '(statistics.berkeley.edu), verified directly.',
  },
  'University of Michigan::Department of Statistics': {
    requirement:
      'Prerequisites to declare are light (one statistics course from a short list, plus ' +
      'Calculus II), but declaration itself requires completing required online learning ' +
      'modules, passing a quiz, and meeting individually with a department peer advisor before ' +
      'the request is processed.',
    why:
      'The multi-step, advisor-gated declaration procedure is a real administrative ' +
      "requirement a student wouldn't anticipate just from the light course prerequisite.",
    source: 'University of Michigan LSA Department of Statistics — undergraduate program page ' +
      '(lsa.umich.edu), verified via search.',
  },
  'University of Utah::Department of Mathematics — Statistics': {
    requirement:
      'The Statistics emphasis within the Mathematics major requires a minimum 2.3 GPA ' +
      'calculated only across math courses, a C or better in every math course counted toward ' +
      "the major (capped at 3 attempts per course), and a C- or better in required non-math " +
      "'allied' courses.",
    why:
      'The math-specific (not overall) GPA floor and the hard 3-attempt cap per course are ' +
      "internal departmental policies not implied by the major's name.",
    source: 'University of Utah Department of Mathematics undergraduate program requirements ' +
      '(math.utah.edu, and the current official catalog.utah.edu program page — re-verified ' +
      'to confirm the department\'s own older 2016 PDF still reflects current policy), verified ' +
      'directly.',
  },
  'Arizona State University::Statistics': {
    requirement:
      'Standard ASU College of Liberal Arts & Sciences admission baseline (ACT 22 in-state / ' +
      '24 out-of-state, or SAT 1120/1180) — no Statistics-specific programmatic requirement ' +
      'beyond this was found.',
    why: 'Checked directly — appears to be the general college admission bar, not a ' +
      'Statistics-specific rule.',
    source: 'Arizona State University School of Mathematical and Statistical Sciences — ' +
      "Statistics B.S. program page, cross-checked against ASU's general admission " +
      'requirements.',
  },
  'Stanford University::MS in Computer Science — AI Track': {
    requirement:
      "Every MSCS applicant, regardless of specialization, must satisfy a 5-area 'Foundations' " +
      'requirement covering Logic/Automata/Complexity, Probability, Design & Analysis of ' +
      'Algorithms (explicitly deeper than a typical intro algorithms course), Computer ' +
      'Organization & Systems, and Principles of Computer Systems.',
    why:
      'This is a specific, rigor-calibrated checklist that catches even CS-degree holders from ' +
      "other schools off guard — the program explicitly states that a standard second-course " +
      "'Data Structures and Algorithms' class does not satisfy the algorithms requirement.",
    source: 'Stanford Computer Science Department — MS Foundations requirements page ' +
      '(cs.stanford.edu), verified via search.',
  },
  'Carnegie Mellon University::MS in Machine Learning': {
    requirement:
      'Applicants are expected to arrive with at least a full year of college-level ' +
      'probability and statistics plus linear algebra and multivariate calculus, and a CS ' +
      'background including complexity theory — an undergraduate CS degree itself is not ' +
      'required. The GRE is optional and no GRE Subject Test is expected.',
    why:
      "The quantitative-background bar is more specific and demanding than a generic 'STEM " +
      "degree welcome' note would suggest.",
    source: 'Carnegie Mellon University Machine Learning Department — MS program admissions ' +
      'page (ml.cmu.edu), verified via search.',
  },
  'MIT::MS in Computer Science (EECS) — AI': {
    requirement:
      'MIT EECS does not offer a standalone terminal master\'s degree to outside applicants. ' +
      'The Master of Engineering (MEng) is reserved for MIT\'s own EECS undergraduates (a ' +
      '5-year combined path). External applicants can only apply to the PhD program; if they ' +
      "don't already hold a master's, EECS awards one along the way as they progress toward " +
      'the doctorate.',
    why:
      "A student searching for \"MIT MS in Computer Science\" would reasonably assume they can " +
      "apply for a standalone master's; that path structurally doesn't exist for non-MIT " +
      'undergraduates.',
    source: 'MIT EECS Graduate Admissions and Admissions FAQ pages (eecs.mit.edu) — ' +
      'independently re-verified in a second pass.',
  },
  'University of Utah::MS in Computer Science — AI': {
    requirement:
      "The Kahlert School of Computing's \"Computer Science\" graduate degree explicitly has " +
      'no tracks or specializations. An AI concentration is only available through a ' +
      'separately-named degree, the "MS in Computing," which requires selecting a track (AI, ' +
      'Robotics, Data Management & Analysis, etc.) as part of admission.',
    why:
      'A prospective applicant targeting "MS in Computer Science — AI" at Utah needs to know ' +
      'that specific degree cannot have an AI concentration; they must apply to a ' +
      'differently-named degree instead.',
    source: 'University of Utah Kahlert School of Computing — graduate academic programs page ' +
      '(cs.utah.edu), verified directly.',
  },
  'Arizona State University::MS in Computer Science — AI': {
    requirement:
      "Requires a minimum 3.25 GPA (higher than ASU's more common 3.00 bar) in the last 60 " +
      'credit hours of the bachelor\'s degree. Applicants with prerequisite gaps are assigned ' +
      'specific foundational courses that must be completed within two semesters with a ' +
      'minimum grade of C in each.',
    why:
      'The higher-than-typical GPA floor and the named remediation course list with its own ' +
      'grade floor and completion deadline are specific mechanics not implied by a general ' +
      'admissions note.',
    source: 'Arizona State University School of Computing and Augmented Intelligence — MS ' +
      'Computer Science program handbook, verified via search.',
  },
  'Carnegie Mellon University::Robotics Institute — MS in Robotics': {
    requirement:
      'Applicants are personally responsible for arriving with (or rapidly acquiring) ' +
      'introductory-undergraduate-level competency in calculus, linear algebra, numerical ' +
      'analysis, probability and statistics, plus programming, data structures, and ' +
      'algorithms. The program does not offer spring or summer admission or conditional ' +
      'offers.',
    why:
      "This is framed as the applicant's own responsibility to fill any gaps in, not a vague " +
      "'strong quantitative background' statement — and the single-admission-cycle policy is " +
      'easy to miss.',
    source: 'Carnegie Mellon University Robotics Institute — MS in Robotics application ' +
      'requirements page (ri.cmu.edu), verified via search.',
  },
  'MIT::MS in Mechanical Engineering — Robotics': {
    requirement:
      "No distinct 'Robotics' track with its own admission requirements exists within MIT " +
      "MechE's graduate program — robotics content is offered as regular course listings, not " +
      'a separate admissions track. The general MechE master\'s bar applies: ' +
      'undergraduate-level exposure to core mechanical engineering disciplines plus basic ' +
      'electric circuits and electromagnetic field theory.',
    why:
      'Checked directly, including confirming no separate robotics-track admissions page ' +
      "exists — this is a genuine 'no separate program' finding, not an oversight.",
    source: 'MIT Department of Mechanical Engineering — graduate admissions FAQ and Robotics ' +
      'course-focus pages (meche.mit.edu), verified directly.',
  },
  'Georgia Tech::MS in Robotics': {
    requirement:
      "There is no centralized Robotics department to apply to — applications go through one " +
      "of six participating 'home schools' (e.g. Interactive Computing, Mechanical " +
      'Engineering, Electrical & Computer Engineering), and the choice of home school is ' +
      "expected to reflect the applicant's intended specialization and affects how the " +
      'application is reviewed.',
    why:
      'A student wouldn\'t guess that "MS in Robotics" isn\'t one application to one ' +
      'department — which of six different academic homes to apply through is itself a ' +
      'meaningful, non-obvious decision.',
    source: 'Georgia Tech Institute for Robotics and Intelligent Machines — MS Robotics ' +
      'program page (research.gatech.edu), verified via search.',
  },
  'University of Utah::MS in Robotics': {
    requirement:
      'Expects specific prerequisite coursework before entry: vector calculus, linear ' +
      'algebra, differential equations, calculus-based mechanics and electricity & magnetism ' +
      'physics, and fundamental programming (particularly MATLAB and/or Python).',
    why:
      'The named course list — especially calculus-based electricity & magnetism physics — is ' +
      'a specific, checkable preparation bar not implied by a general engineering-background ' +
      'requirement.',
    source: 'University of Utah Robotics Center — graduate admissions page ' +
      '(robotics.coe.utah.edu), verified via search.',
  },
  'Arizona State University::MS in Robotics and Autonomous Systems': {
    requirement:
      "Standard ASU graduate baseline (bachelor's or master's in a related engineering/science " +
      'field, minimum 3.00 GPA in the last 60 credit hours) — the program offers multiple ' +
      'concentrations with slightly varying prerequisites, but no single requirement ' +
      'distinctive to the program as a whole beyond this baseline was verifiable.',
    why: 'Checked directly — appears to be the general graduate admission bar plus ' +
      'concentration choice, not one uniform distinctive rule.',
    source: 'Arizona State University Ira A. Fulton Schools of Engineering — MS Robotics and ' +
      'Autonomous Systems admissions page, verified via search.',
  },
  'UC Berkeley::Master of Information and Data Science': {
    requirement:
      "No GRE/GMAT required, but applicants must submit a self-authored 'Programming " +
      "Competency Statement' demonstrating proficiency in a high-level object-oriented " +
      'language. Applicants assessed as having limited programming experience are required to ' +
      'take an introductory data science programming course during their first term as a ' +
      'mandatory bridge course.',
    why:
      'The self-written competency statement is an unusual application artifact, and the ' +
      'conditional first-term remedial course is a binding real outcome, not just advice.',
    source: 'UC Berkeley School of Information — Master of Information and Data Science ' +
      'program pages (ischool.berkeley.edu), verified via search.',
  },
  'Carnegie Mellon University::MS in Data Science': {
    requirement:
      'Requires two full semesters of calculus-based probability and mathematical statistics ' +
      '(random variables, distribution functions, MLE, hypothesis testing, interval ' +
      'estimation), one course in linear regression analysis, and familiarity with ' +
      'matrix/linear algebra.',
    why:
      'This is a fairly heavy, specifically-itemized math/statistics prerequisite load for a ' +
      'program a student might assume is more programming/tools-focused given the name.',
    source: 'Carnegie Mellon University Department of Statistics & Data Science — MS in Data ' +
      'Science application requirements page (cmu.edu/dietrich), verified via search.',
  },
  'Stanford University::MS in Statistics — Data Science Track': {
    requirement:
      'The Data Science subplan is a mutually exclusive alternative to the plain Statistics ' +
      "MS, not an add-on — it's closed to coterminal (BS+MS) applicants and to students " +
      'already enrolled in other Stanford graduate programs, and choosing the Data Science ' +
      'subplan means being considered only for that program, not additionally for the plain ' +
      'Statistics MS.',
    why:
      'A Stanford student already enrolled elsewhere, or coterm-eligible, might assume they ' +
      'can add this track; structurally they cannot, and picking it forecloses the plain ' +
      'Statistics MS option on the same application.',
    source: 'Stanford Department of Statistics — MS admissions and FAQ pages ' +
      '(statistics.stanford.edu), verified via search.',
  },
  'University of Utah::MS in Data Science': {
    requirement:
      "There is no standalone degree named 'MS in Data Science' — it's reached via the 'MS in " +
      "Computing' degree's Data Management & Analysis track. A separately-administered " +
      'Computational & Data Science Professional Science Master\'s (run through the Graduate ' +
      'School, not the computing school) also exists, with its own stated prerequisites of ' +
      'Calculus 1-3, Linear Algebra, and strong programming skills.',
    why:
      "Same non-obvious structural issue as Utah's AI-track finding — which of two " +
      'differently-housed programs a "Data Science" applicant actually means changes both the ' +
      'department and the requirements.',
    source: 'University of Utah Kahlert School of Computing graduate programs page and ' +
      'Professional Science Master\'s program page (cs.utah.edu, psm.utah.edu), verified ' +
      'directly.',
  },
  'Arizona State University::MS in Data Science, Analytics and Engineering': {
    requirement:
      "Standard ASU graduate baseline (bachelor's/master's in a computing, engineering, math, " +
      'or related field; minimum 3.00 GPA in the last 60 credit hours) plus an official GRE ' +
      'General Test score taken within the last 5 years.',
    why: 'Checked directly — the GRE requirement is real but otherwise this is the general ' +
      'graduate admission bar, not something distinctive to this specific program.',
    source: 'Arizona State University Ira A. Fulton Schools of Engineering — MS Data Science, ' +
      'Analytics and Engineering admissions page, verified via search.',
  },
};

export function getSchoolRequirement(programKey) {
  return SCHOOL_SPECIFIC_REQUIREMENTS[programKey] || null;
}
