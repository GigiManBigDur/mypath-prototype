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
          resources: ['Khan Academy free PSAT prep'],
        },
        {
          id: 'so2', title: 'Take on a leadership role in an activity you enjoy', type: 'milestone', date: { month: 12, day: 1 },
          desc: 'Whether it\'s a club officer position or a team captain role, sophomore year is a good time to start building depth, not just breadth.',
          resources: [],
        },
        {
          id: 'so3', title: 'Start exploring careers and majors that interest you', type: 'milestone', date: { month: 2, day: 1 },
          desc: 'You don\'t need to decide anything yet — just start noticing what subjects and careers genuinely interest you.',
          resources: [],
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
          resources: [],
        },
        {
          id: 'jr2', title: 'Begin SAT/ACT prep', type: 'procedure', date: { month: 11, day: 1 },
          desc: 'Junior year is the standard time to start serious test prep, even if your target schools are test-optional.',
          resources: ['Khan Academy free SAT prep'],
        },
        {
          id: 'jr3', title: 'Take the SAT or ACT', type: 'milestone', date: { month: 3, day: 1 },
          desc: 'Most students take their first official test in the spring of junior year, leaving room for a retake in the fall if needed.',
          resources: [],
        },
        {
          id: 'jr4', title: 'Start building your college list', type: 'milestone', date: { month: 4, day: 1 },
          desc: 'Begin researching schools across Reach, Match, and Safety categories based on your interests and stats so far.',
          resources: [],
        },
        {
          id: 'jr5', title: 'Build strong relationships with 2 teachers for future recommendation letters', type: 'procedure', date: { month: 4, day: 15 },
          desc: 'Recommendation letters are strongest when they come from teachers who know your work well — junior year classes are perfect for this.',
          resources: [],
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
        {
          id: 't1', title: 'Build your college list', type: 'milestone', date: { month: 9, day: 15 },
          desc: (ctx) => ctx.programNames.length
            ? `Your list: ${ctx.programNames.join(', ')} — carried over from the programs you picked in Self-Discovery. Round it out to 8–12 schools across Reach, Match, and Safety.`
            : 'Put together 8–12 schools across Reach, Match, and Safety categories based on your interests and stats.',
          resources: ['Net price calculators for each school', "Your school counselor's list-building worksheet"],
        },
        {
          id: 't2', title: 'Request recommendation letters', type: 'procedure', date: { month: 10, day: 1 },
          desc: 'Ask 2 teachers who know your work well — ideally from junior year, in different subjects.',
          resources: ['Email template for asking teachers', 'Brag sheet template'],
        },
        {
          id: 't3', title: 'Draft your personal statement', type: 'procedure', date: { month: 10, day: 20 },
          desc: (ctx) => ctx.careerName
            ? `First full draft of your Common App essay. Consider weaving in what draws you to ${ctx.careerName.toLowerCase()} — specific stories beat general interest.`
            : 'First full draft of your Common App essay. Focus on getting the story down before polishing.',
          resources: ['Common App essay prompts', '3 example essays that worked'],
        },
        {
          id: 't4', title: 'Submit FAFSA & financial aid forms', type: 'milestone', date: { month: 11, day: 1 },
          desc: 'File as early as possible — some aid is first-come, first-served.',
          resources: ['FAFSA checklist', 'CSS Profile guide'],
        },
        {
          id: 't5', title: 'Submit all college applications', type: 'major', date: { month: 1, day: 5 },
          desc: 'Final proofread, then submit. Double-check every supplement is attached.',
          resources: ['Submission checklist'],
        },
        {
          id: 't6', title: finalGoalTitle, type: 'final', date: { month: 4, day: 15 },
          desc: 'The finish line. Everything on this path was built to get you here.',
          resources: [],
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
          resources: [],
        },
        {
          id: 'ex3', title: 'Identify 1–2 potential faculty mentors', type: 'procedure', date: { month: 4, day: 1 },
          desc: 'A professor who knows your work well can become a strong letter-writer later — start building that relationship now.',
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
          resources: [],
        },
        {
          id: 'pr2', title: 'Begin studying for the GRE/GMAT if required', type: 'procedure', date: { month: 11, day: 1 },
          desc: 'Check whether your target programs require a standardized test — many are test-optional now, but preparation still takes months.',
          resources: [],
        },
        {
          id: 'pr3', title: 'Build relationships for strong letters of recommendation', type: 'procedure', date: { month: 2, day: 1 },
          desc: 'Reconnect with professors or supervisors who can speak in depth about your work — give them plenty of notice before you\'ll need a letter.',
          resources: [],
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
          resources: ['GRE prep overview', 'GMAT prep overview'],
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
          resources: ['Articulation agreement lookup'],
        },
        {
          id: 'cu3', title: 'Connect with a transfer advisor', type: 'procedure', date: { month: 3, day: 1 },
          desc: 'A transfer advisor (at your current school or your target school) can help you map out exactly which credits will count.',
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
          id: 't3', title: 'Submit transfer application', type: 'major', date: { month: 3, day: 1 },
          desc: (ctx) => ctx.programNames.length
            ? `Apply to your list: ${ctx.programNames.join(', ')} — carried over from Self-Discovery.`
            : 'Submit your transfer applications with all required supplements.',
          resources: ['Transfer application checklist'],
        },
        {
          id: 't4', title: 'Submit financial aid forms', type: 'milestone', date: { month: 3, day: 15 },
          desc: 'File FAFSA and/or CSS Profile as a transfer applicant — deadlines can differ from first-year deadlines.',
          resources: ['FAFSA checklist for transfer students'],
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

// Shown on the Academic Plan when a transfer student is 2+ years out — the plan still uses the
// single application-year trunk (transfer timelines vary too much to model precisely), so this
// is an honest caveat rather than a fabricated multi-year transfer timeline.
export const TRANSFER_CAVEAT = "This plan assumes you're applying to transfer this cycle — if you're planning to wait, check back closer to when you're ready to apply.";
