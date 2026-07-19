// The roadmap "trunk" is built from stages, not one flat list per education level. Each level
// has a final stage (the existing single-year plan, unchanged) and zero or more earlier stages
// prepended depending on how many years of runway the student has (STAGE_PLAN, keyed by
// [level][schoolYear]). roadmapGenerator.js assigns each stage a yearOffset equal to its
// position in that sequence (0 = starts now, 1 = next year, ...) and applies it to every step's
// date — so stage step dates below are written as plain { month, day } within their OWN year,
// exactly like the original single-stage data.
//
// title/desc/resources can be a plain value or a function of
// ctx = { programNames, distinctSchoolNames, majorName, careerName } so steps can reference
// the student's actual selections.
//
// `resources` is intentionally left empty on purely reflective/personal-action steps (e.g. "Check
// your GPA", "Connect with a transfer advisor") — there's no genuine external link for those, and
// forcing one in would be padding, not a real resource. Every step with a concrete, well-known
// resource (test prep, official application platforms, financial aid, etc.) has one attached.

// Names the specific school when the student's list has exactly one distinct school; falls
// back to generic phrasing once it spans two or more (or none were picked yet).
function finalGoalTitle(ctx) {
  return ctx.distinctSchoolNames.length === 1
    ? `Get accepted to ${ctx.distinctSchoolNames[0]}`
    : 'Get accepted to one of your target schools';
}

export const TRUNK_STAGES = {
  highschool: {
    freshman: {
      label: 'Freshman Year',
      steps: [
        {
          id: 'fr1', title: 'Explore your interests through clubs and activities', type: 'milestone', date: { month: 9, day: 15 },
          desc: 'Try a few different clubs, sports, or activities — this early exploration helps you figure out what you actually enjoy before you have to commit to anything.',
          resources: [],
        },
        {
          id: 'fr2', title: 'Focus on building strong study habits early', type: 'procedure', date: { month: 11, day: 1 },
          desc: 'Grades from 9th grade on count toward your GPA — building good habits now (a planner, a consistent homework routine) pays off for years.',
          resources: [],
        },
        {
          id: 'fr3', title: 'Check your GPA — end of Freshman year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'A quick end-of-year check-in — freshman year sets the tone, but there\'s plenty of time left to improve if needed.',
          resources: [],
        },
      ],
    },
    sophomore: {
      label: 'Sophomore Year',
      steps: [
        {
          id: 'so1', title: 'Take the PSAT as practice', type: 'procedure', date: { month: 10, day: 15 },
          desc: 'Many schools offer a practice PSAT sophomore year — it\'s low-stakes and gives you an early read on where you stand.',
          resources: ['Khan Academy Official SAT Practice (free, also covers PSAT-style prep)', "College Board's official PSAT/NMSQT info page"],
        },
        {
          id: 'so2', title: 'Take on a leadership role in an activity you enjoy', type: 'milestone', date: { month: 12, day: 1 },
          desc: 'Whether it\'s a club officer position or a team captain role, sophomore year is a good time to start building depth, not just breadth.',
          resources: [],
        },
        {
          id: 'so3', title: 'Start exploring careers and majors that interest you', type: 'milestone', date: { month: 2, day: 1 },
          desc: 'You don\'t need to decide anything yet — just start noticing what subjects and careers genuinely interest you.',
          resources: ['O*NET Interest Profiler (free official career interest quiz)'],
        },
        {
          id: 'so4', title: 'Check your GPA — end of Sophomore year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'Another check-in — sophomore grades start to matter more for college admissions than freshman year did.',
          resources: [],
        },
      ],
    },
    junior: {
      label: 'Junior Year',
      steps: [
        {
          id: 'jr1', title: 'Take the PSAT/NMSQT', type: 'procedure', date: { month: 10, day: 15 },
          desc: 'This is the official PSAT that counts for National Merit recognition — register through your school in the fall.',
          resources: ['Khan Academy Official SAT Practice (free, also covers PSAT-style prep)', "College Board's official PSAT/NMSQT info page"],
        },
        {
          id: 'jr2', title: 'Begin SAT/ACT prep', type: 'procedure', date: { month: 11, day: 1 },
          desc: 'Junior year is the standard time to start serious test prep, even if your target schools are test-optional.',
          resources: ['Khan Academy Official SAT Practice (free)', 'ACT Academy (free official ACT prep)'],
        },
        {
          id: 'jr2b', title: 'Register for the SAT/ACT', type: 'procedure', date: { month: 1, day: 20 },
          desc: 'Registration deadlines typically fall 5–6 weeks before test day — this also applies if you end up registering for a retake in early senior fall instead.',
          resources: ['College Board SAT registration', 'ACT.org registration'],
        },
        {
          id: 'jr3', title: 'Take the SAT or ACT', type: 'milestone', date: { month: 3, day: 1 },
          desc: 'Most students take their first official test in the spring of junior year, leaving room for a retake in the fall if needed.',
          resources: ['College Board SAT registration', 'ACT.org registration'],
        },
        {
          id: 'jr4', title: 'Start building your college list', type: 'milestone', date: { month: 4, day: 1 },
          desc: 'Begin researching schools across Reach, Match, and Safety categories based on your interests and stats so far.',
          resources: ['BigFuture College Search (College Board)'],
        },
        {
          id: 'jr5', title: 'Build strong relationships with 2 teachers for future recommendation letters', type: 'procedure', date: { month: 4, day: 15 },
          desc: 'Recommendation letters are strongest when they come from teachers who know your work well — junior year classes are perfect for this.',
          resources: ['Guide: How to Ask for a Strong Letter of Recommendation'],
        },
        {
          id: 'jr6', title: 'Check your GPA — end of Junior year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'Junior year grades are the last full year colleges see before you apply — this is the most important check-in yet.',
          resources: [],
        },
      ],
    },
    senior: {
      label: 'Senior Year',
      steps: [
        // Fill Out the High School Academic Plan (see CLAUDE.md) — real tester feedback was that
        // Senior Year read as too sparse for how substantial a real college application actually
        // is. Everything below `sr-reflect` through `sr-thankyou` fills the early-fall gap between
        // "build your list" and "submit applications" with the real logistics/reflection work that
        // actually happens there — plain single-step Required tasks, no new mechanism, same as
        // every other trunk step in this file.
        {
          id: 'sr-reflect', title: "Reflect: what's the one thing you want admissions officers to remember about you?", type: 'milestone', date: { month: 9, day: 1 },
          desc: 'Before you start filling out forms, spend a few minutes on this — it\'ll make every essay and interview answer sharper if you already know your own answer.',
          resources: [],
        },
        {
          id: 'sr-commonapp-account', title: 'Create your Common App account', type: 'procedure', date: { month: 9, day: 4 },
          desc: 'The Common App is accepted by the vast majority of schools — setting it up early gives you room to fill it in gradually instead of all at once.',
          resources: ['Common App official site (commonapp.org)'],
        },
        {
          id: 'sr-commonapp-profile', title: 'Fill out your Common App profile and basic info section', type: 'procedure', date: { month: 9, day: 8 },
          desc: 'The straightforward part — contact info, family, education history. Getting it done now clears the way for the parts that actually take thought.',
          resources: ['Common App official site (commonapp.org)'],
        },
        {
          id: 'sr-fee-waiver', title: 'Check your application fee waiver eligibility', type: 'procedure', date: { month: 9, day: 11 },
          desc: 'Application fees add up fast across several schools — most students who qualify don\'t realize it until someone tells them to check.',
          resources: ["Common App's official Fee Waiver eligibility page", 'NACAC Fee Waiver information'],
        },
        {
          id: 't1', title: 'Build your college list', type: 'milestone', date: { month: 9, day: 15 },
          desc: (ctx) => ctx.programNames.length
            ? `Your list: ${ctx.programNames.join(', ')} — carried over from the programs you picked in Self-Discovery. Round it out to 8–12 schools across Reach, Match, and Safety.`
            : 'Put together 8–12 schools across Reach, Match, and Safety categories based on your interests and stats.',
          resources: ['BigFuture College Search (College Board)', 'Net price calculators for each school', "Your school counselor's list-building worksheet"],
        },
        {
          id: 'sr-npc', title: "Research each school's net price calculator", type: 'procedure', date: { month: 9, day: 18 },
          desc: 'Every school is required by federal law to have one — it\'s the most honest early read you\'ll get on what a school will actually cost you, before financial aid offers are even out.',
          resources: ['Net price calculators (required by federal law on every college website)'],
        },
        {
          id: 'sr-counselor', title: 'Meet with your school counselor to review your college list', type: 'procedure', date: { month: 9, day: 22 },
          desc: 'A second set of eyes on your list — your counselor has seen how past students\' Reach/Match/Safety picks actually played out.',
          resources: [],
        },
        {
          id: 'sr-brag-sheet', title: 'Prepare a "brag sheet" for your recommenders', type: 'procedure', date: { month: 9, day: 29 },
          desc: 'A short summary of your activities, strengths, and a few specific moments you\'re proud of — handing this to your teachers before you ask makes their letters far more specific.',
          resources: ['Brag sheet template'],
        },
        {
          id: 't2', title: 'Request recommendation letters', type: 'procedure', date: { month: 10, day: 1 },
          desc: 'Ask 2 teachers who know your work well — ideally from junior year, in different subjects.',
          resources: ['Email template for asking teachers', 'Brag sheet template'],
        },
        {
          id: 'sr-thankyou', title: 'Send a thank-you note to each recommender', type: 'procedure', date: { month: 10, day: 15 },
          desc: 'A short, genuine thank-you now that they\'ve agreed — worth sending a second one later once they\'ve actually submitted your letter.',
          resources: [],
        },
        // `t3` ("Draft your personal statement", one atomic task) was removed here — see
        // CLAUDE.md's "Fill Out the High School Academic Plan" section. It's replaced by a real
        // multi-step chain (Brainstorm -> Draft -> Get feedback -> Revise -> Proofread) built in
        // roadmapGenerator.js's own buildPersonalStatementChain(), using the exact same
        // buildStepsChain() mechanism opportunity prep chains already use — this is the one
        // senior-year step that needed the chain mechanism, everything else here stays plain
        // trunk data.
        {
          id: 't4', title: 'Submit FAFSA & financial aid forms', type: 'milestone', date: { month: 11, day: 1 },
          desc: 'File as early as possible — some aid is first-come, first-served.',
          resources: ['studentaid.gov (official FAFSA site)', 'CSS Profile guide'],
        },
        {
          id: 'sr-css-profile', title: 'Complete the CSS Profile', type: 'milestone', date: { month: 11, day: 5 },
          desc: 'Required by many private schools in addition to FAFSA — it asks for a more detailed financial picture, so start it while your FAFSA numbers are still fresh.',
          resources: ['CSS Profile (official College Board site)'],
        },
        {
          id: 'sr-scholarship-search', title: 'Search for scholarships matching your profile', type: 'procedure', date: { month: 11, day: 10 },
          desc: 'Beyond school-based aid — search broadly, since even small scholarships add up and many go unclaimed each year for lack of applicants.',
          resources: ['Fastweb (free scholarship search)', 'BigFuture Scholarship Search (College Board)'],
        },
        {
          id: 'sr-local-scholarships', title: 'Apply to local/community scholarships', type: 'procedure', required: false, date: { month: 11, day: 20 },
          desc: 'Local and community scholarships (your school, a local business, a community organization) tend to have far less competition than national ones — genuinely optional, but often a strong return on a small amount of effort.',
          resources: [],
        },
        {
          id: 'sr-interview-prep', title: 'Prepare for your admissions interview', type: 'procedure', required: false, date: { month: 12, day: 1 },
          desc: 'Not every school requires or even offers one — check each school\'s own application requirements to see if this applies to you.',
          resources: ['Common admissions interview questions and how to prepare'],
        },
        {
          id: 'sr-gpa', title: 'Check your GPA — before you submit', type: 'milestone', date: { month: 12, day: 20 },
          desc: 'Colleges may see updated grades — make sure your transcript reflects your best work before you hit submit.',
          resources: [],
        },
        // `t5` ("Submit all college applications", one generic task regardless of who was
        // actually selected) was removed here — see CLAUDE.md's "Per-School Application
        // Deadlines & Supplemental Essays" section. It's replaced by real, per-school tasks
        // dynamically generated in roadmapGenerator.js's own buildApplicationItems(), from
        // whichever programs are CURRENTLY in state.selectedProgramKeys, not a single static
        // step — this is the one senior-year step this feature couldn't leave as plain trunk
        // data, since its whole point is to vary per student. That same function now also
        // generates each selected school's own test-score decision, score-report, transcript-
        // request, and status-tracking tasks — see roadmapGenerator.js's own comment.
        {
          id: 't6', title: finalGoalTitle, type: 'final', date: { month: 4, day: 15 },
          desc: 'The finish line. Everything on this path was built to get you here.',
          resources: [],
        },
        // Post-acceptance phase (see CLAUDE.md) — the plan used to just stop at "Get accepted."
        // Real tester feedback was that this left out the entire second half of a real senior
        // year, which is at least as busy as application season itself.
        {
          id: 'pa-compare-offers', title: 'Compare your acceptance offers', type: 'milestone', date: { month: 4, day: 20 },
          desc: 'Once more than one offer is in, weigh them side by side — fit, program strength, and cost together, not any one factor alone.',
          resources: [],
        },
        {
          id: 'pa-compare-aid', title: 'Compare financial aid award letters once they arrive', type: 'milestone', date: { month: 4, day: 22 },
          desc: 'Award letters use inconsistent formats and terms school to school — a real comparison usually means putting every offer\'s actual out-of-pocket cost side by side yourself.',
          resources: ['College Board / NerdWallet financial aid award letter comparison tools'],
        },
        {
          id: 'pa-aid-appeal', title: 'Submit a financial aid appeal, if warranted', type: 'procedure', required: false, date: { month: 4, day: 25 },
          desc: 'If your situation changed, or a competing offer is meaningfully better, many schools have a real appeals process — genuinely optional, worth it only if you have a real case to make.',
          resources: [],
        },
        {
          id: 'pa-waitlist-loci', title: 'If waitlisted anywhere: decide whether to submit a letter of continued interest', type: 'procedure', required: false, date: { month: 4, day: 24 },
          desc: 'A short note reaffirming that a waitlisted school is still your top choice, if it genuinely is — optional, and only relevant if you were actually waitlisted somewhere.',
          resources: [],
        },
        {
          id: 'pa-decide', title: 'Decide: accept or decline each offer', type: 'major', date: { month: 4, day: 28 },
          desc: 'The real decision, made with everything above in front of you — give yourself a few real days to sit with it before National College Decision Day.',
          resources: [],
        },
        {
          id: 'pa-deposit', title: 'Submit your enrollment deposit', type: 'enrollment', date: { month: 5, day: 1 },
          desc: 'National College Decision Day — most schools require your enrollment deposit by May 1 to hold your spot.',
          resources: [],
        },
        {
          id: 'pa-withdraw', title: "Withdraw applications from schools you won't attend", type: 'procedure', date: { month: 5, day: 3 },
          desc: 'A courtesy to the schools and to other students still on their waitlists — takes a few minutes per school once your decision is made.',
          resources: [],
        },
        {
          id: 'pa-housing', title: 'Complete housing forms', type: 'procedure', date: { month: 5, day: 20 },
          desc: 'Housing assignments and roommate matching often run on a first-come basis — check your enrolling school\'s own deadline.',
          resources: [],
        },
        {
          id: 'pa-orientation', title: 'Register for orientation', type: 'procedure', date: { month: 6, day: 10 },
          desc: 'Orientation is usually where course registration, advising, and your first real campus visit as an admitted student all happen — most schools require signing up in advance.',
          resources: [],
        },
        {
          id: 'pa-final-transcript', title: 'Send your final transcript and AP scores to your enrolling school', type: 'procedure', date: { month: 6, day: 25 },
          desc: 'The last official step — schools need your genuinely final transcript (after final grades post) and any AP scores sent directly from the College Board.',
          resources: ['AP score sending (official College Board site)'],
        },
      ],
    },
  },
  undergraduate: {
    exploration: {
      label: 'Exploration Phase',
      steps: [
        {
          id: 'ex1', title: 'Maintain a strong GPA foundation', type: 'milestone', date: { month: 12, day: 15 },
          desc: 'Grad programs weigh your overall GPA heavily — building a strong foundation early gives you room later if a semester doesn\'t go perfectly.',
          resources: [],
        },
        {
          id: 'ex2', title: 'Explore research or internship opportunities in your field', type: 'milestone', date: { month: 2, day: 1 },
          desc: 'Hands-on experience is one of the strongest parts of a graduate application — start looking for opportunities now, even small ones.',
          resources: ['Handshake (widely-used student internship/job platform)'],
        },
        {
          id: 'ex3', title: 'Identify 1–2 potential faculty mentors', type: 'procedure', date: { month: 4, day: 1 },
          desc: 'A professor who knows your work well can become a strong letter-writer later — start building that relationship now.',
          resources: [],
        },
        {
          id: 'ex-gpa', title: 'Check your GPA — end of the year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'A yearly check-in early in your journey — steady grades now keep every future option open.',
          resources: [],
        },
      ],
    },
    prep: {
      label: 'Prep Year',
      steps: [
        {
          id: 'pr1', title: 'Research graduate programs in your field', type: 'milestone', date: { month: 9, day: 15 },
          desc: 'Start narrowing down programs based on fit, faculty, and funding — this groundwork makes application season far less stressful.',
          resources: ["Target program's official department page", 'U.S. News graduate program rankings (starting point)'],
        },
        {
          id: 'pr2', title: 'Begin studying for the GRE/GMAT if required', type: 'procedure', date: { month: 11, day: 1 },
          desc: 'Check whether your target programs require a standardized test — many are test-optional now, but preparation still takes months.',
          resources: ['ETS official GRE prep software (free)', 'GMAC official GMAT prep'],
        },
        {
          id: 'pr3', title: 'Build relationships for strong letters of recommendation', type: 'procedure', date: { month: 2, day: 1 },
          desc: 'Reconnect with professors or supervisors who can speak in depth about your work — give them plenty of notice before you\'ll need a letter.',
          resources: ['Guide: How to Ask for a Strong Letter of Recommendation'],
        },
        {
          id: 'pr4', title: 'Check your GPA — end of Junior year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'One more check-in before application season — this is roughly the GPA graduate programs will see.',
          resources: [],
        },
      ],
    },
    application: {
      label: 'Application Year',
      steps: [
        {
          id: 't1', title: 'Take the GRE/GMAT if relevant to your field', type: 'milestone', date: { month: 9, day: 30 },
          desc: 'Check whether your target programs require or recommend a standardized test — many are test-optional now.',
          resources: ['ETS official GRE prep software (free)', 'GMAC official GMAT prep'],
        },
        {
          id: 't2', title: 'Request letters of recommendation', type: 'procedure', date: { month: 10, day: 15 },
          desc: 'Ask 2–3 professors or supervisors who can speak in depth about your work in this field.',
          resources: ['Email template for asking professors'],
        },
        {
          id: 't3', title: 'Draft your statement of purpose', type: 'procedure', date: { month: 11, day: 5 },
          desc: (ctx) => ctx.careerName
            ? `First full draft explaining your specific goals toward becoming a ${ctx.careerName.toLowerCase()} — be concrete about why this program.`
            : 'First full draft explaining your specific research or career goals and why this program fits them.',
          resources: ['Statement of purpose outline', 'Example SOPs that worked'],
        },
        {
          id: 'ap-gpa', title: 'Check your GPA — before you submit', type: 'milestone', date: { month: 12, day: 1 },
          desc: 'Programs will see your most recent transcript — make sure it reflects your best work before you submit.',
          resources: [],
        },
        {
          id: 't4', title: 'Submit applications', type: 'major', date: { month: 12, day: 15 },
          desc: (ctx) => ctx.programNames.length
            ? `Apply to your list: ${ctx.programNames.join(', ')} — carried over from Self-Discovery.`
            : 'Submit your applications with all required supplements.',
          resources: ['Submission checklist'],
        },
        {
          id: 't5', title: finalGoalTitle, type: 'final', date: { month: 3, day: 15 },
          desc: 'The finish line. Everything on this path was built to get you here.',
          resources: [],
        },
      ],
    },
  },
  transfer: {
    current: {
      label: 'Current Year',
      steps: [
        {
          id: 'cu1', title: 'Maintain strong grades at your current institution', type: 'milestone', date: { month: 12, day: 15 },
          desc: 'Your current college GPA matters more for transfer admissions than almost anything else — consistency counts.',
          resources: [],
        },
        {
          id: 'cu2', title: 'Research transfer requirements and credit policies at target schools', type: 'milestone', date: { month: 2, day: 1 },
          desc: 'Check articulation agreements early so you don\'t take a course that won\'t transfer toward your intended major.',
          resources: ["Target school's transfer credit equivalency page", 'Articulation agreement lookup (e.g. ASSIST for California)'],
        },
        {
          id: 'cu3', title: 'Connect with a transfer advisor', type: 'procedure', date: { month: 3, day: 1 },
          desc: 'A transfer advisor (at your current school or your target school) can help you map out exactly which credits will count.',
          resources: [],
        },
        {
          id: 'cu-gpa', title: 'Check your GPA — end of the year', type: 'milestone', date: { month: 5, day: 15 },
          desc: 'Your GPA at your current school matters most for transfer admissions — check in as the year wraps up.',
          resources: [],
        },
      ],
    },
    application: {
      label: 'Application Year',
      steps: [
        {
          id: 't1', title: 'Complete required transfer coursework', type: 'milestone', date: { month: 12, day: 15 },
          desc: (ctx) => ctx.majorName
            ? `Finish the prerequisite courses that count toward ${ctx.majorName} at your target schools — check each one's articulation agreement.`
            : 'Finish the prerequisite courses your target major requires — check each school\'s articulation agreement.',
          resources: ['Articulation agreement lookup', 'Transfer credit checklist'],
        },
        {
          id: 't2', title: 'Request transcripts', type: 'procedure', date: { month: 1, day: 10 },
          desc: 'Order official transcripts from every college you\'ve attended, sent directly to each target school.',
          resources: ['Transcript request checklist'],
        },
        {
          id: 'ap-gpa', title: 'Check your GPA — before you submit', type: 'milestone', date: { month: 2, day: 15 },
          desc: 'Make sure your most recent transcript reflects your best work before you submit your transfer application.',
          resources: [],
        },
        {
          id: 't3', title: 'Submit transfer application', type: 'major', date: { month: 3, day: 1 },
          desc: (ctx) => ctx.programNames.length
            ? `Apply to your list: ${ctx.programNames.join(', ')} — carried over from Self-Discovery.`
            : 'Submit your transfer applications with all required supplements.',
          resources: ['Common App for Transfer', 'Transfer application checklist'],
        },
        {
          id: 't4', title: 'Submit financial aid forms', type: 'milestone', date: { month: 3, day: 15 },
          desc: 'File FAFSA and/or CSS Profile as a transfer applicant — deadlines can differ from first-year deadlines.',
          resources: ['studentaid.gov (official FAFSA site)', 'FAFSA checklist for transfer students'],
        },
        {
          id: 't5', title: finalGoalTitle, type: 'final', date: { month: 5, day: 15 },
          desc: 'The finish line. Everything on this path was built to get you here.',
          resources: [],
        },
      ],
    },
  },
};

// Which stages to prepend, in chronological order, for a given (level, schoolYear) selection.
// The last entry in every list is that level's original single-year plan, unchanged.
export const STAGE_PLAN = {
  highschool: {
    9: ['freshman', 'sophomore', 'junior', 'senior'],
    10: ['sophomore', 'junior', 'senior'],
    11: ['junior', 'senior'],
    12: ['senior'],
  },
  undergraduate: {
    1: ['exploration', 'prep', 'application'],
    2: ['exploration', 'prep', 'application'],
    3: ['prep', 'application'],
    4: ['application'],
  },
  transfer: {
    1: ['current', 'application'],
    2: ['application'],
    3: ['application'],
  },
};

// Fallback school year per level if state.schoolYear is somehow unset (defensive only — the
// survey requires an answer, this just prevents a crash on stale/incomplete localStorage state).
export const DEFAULT_SCHOOL_YEAR = { highschool: 12, undergraduate: 4, transfer: 2 };

// Stage 0's own "what year is Course Selection actually FOR" label (e.g. "Freshman Year") — the
// single shared source for both roadmapGenerator.js's course-request task title AND
// CourseSelectionScreen.jsx's own on-screen scope-clarifying banner, so the two can never drift
// out of sync again. They already had drifted once, in fact: when the off-by-one bug that made
// stage 0 target stageNames[1] (next year) instead of stageNames[0] (the current, actually-
// selected year) was fixed in roadmapGenerator.js, CourseSelectionScreen.jsx's own separate,
// duplicate `nextYearLabel` computation was missed and kept reading stageNames[1] — so the
// roadmap's task title said "Freshman Year" while the on-screen banner still said "Sophomore
// Year" for the exact same student. Same "extract once, both callers read the identical value"
// precedent `gpaBenchmarkText()` already established in programs.js for this exact class of bug.
// Returns null when there's no meaningful current-stage label to show (a single-stage plan, e.g.
// a 12th grader) — every consumer already falls back to "Finalize"-style wording in that case.
export function getStage0TargetLabel(stageNames) {
  return stageNames.length > 1 ? TRUNK_STAGES.highschool[stageNames[0]].label : null;
}

// Shown on the Academic Plan when a transfer student is 2+ years out — the plan still uses the
// single application-year trunk (transfer timelines vary too much to model precisely), so this
// is an honest caveat rather than a fabricated multi-year transfer timeline.
export const TRANSFER_CAVEAT = "This plan assumes you're applying to transfer this cycle — if you're planning to wait, check back closer to when you're ready to apply.";
