// Core admissions steps (the roadmap "trunk"), by education level.
// desc/resources can be a plain value or a function of ctx = { programNames, majorName, careerName }
// so the first milestone can reference the student's actual selections.

export const TRUNK_STEPS = {
  highschool: [
    {
      id: 't1', title: 'Build your college list', type: 'milestone', due: 'Sep 15',
      desc: (ctx) => ctx.programNames.length
        ? `Your list: ${ctx.programNames.join(', ')} — carried over from the programs you picked in Self-Discovery. Round it out to 8–12 schools across Reach, Match, and Safety.`
        : 'Put together 8–12 schools across Reach, Match, and Safety categories based on your interests and stats.',
      resources: ['Net price calculators for each school', "Your school counselor's list-building worksheet"],
    },
    {
      id: 't2', title: 'Request recommendation letters', type: 'procedure', due: 'Oct 1',
      desc: 'Ask 2 teachers who know your work well — ideally from junior year, in different subjects.',
      resources: ['Email template for asking teachers', 'Brag sheet template'],
    },
    {
      id: 't3', title: 'Draft your personal statement', type: 'procedure', due: 'Oct 20',
      desc: (ctx) => ctx.careerName
        ? `First full draft of your Common App essay. Consider weaving in what draws you to ${ctx.careerName.toLowerCase()} — specific stories beat general interest.`
        : 'First full draft of your Common App essay. Focus on getting the story down before polishing.',
      resources: ['Common App essay prompts', '3 example essays that worked'],
    },
    {
      id: 't4', title: 'Submit FAFSA & financial aid forms', type: 'milestone', due: 'Nov 1',
      desc: 'File as early as possible — some aid is first-come, first-served.',
      resources: ['FAFSA checklist', 'CSS Profile guide'],
    },
    {
      id: 't5', title: 'Submit all college applications', type: 'major', due: 'Jan 5',
      desc: 'Final proofread, then submit. Double-check every supplement is attached.',
      resources: ['Submission checklist'],
    },
    {
      id: 't6', title: 'Get accepted to your top-choice school', type: 'final', due: 'Apr',
      desc: 'The finish line. Everything on this path was built to get you here.',
      resources: [],
    },
  ],
  transfer: [
    {
      id: 't1', title: 'Complete required transfer coursework', type: 'milestone', due: 'Dec 15',
      desc: (ctx) => ctx.majorName
        ? `Finish the prerequisite courses that count toward ${ctx.majorName} at your target schools — check each one's articulation agreement.`
        : 'Finish the prerequisite courses your target major requires — check each school\'s articulation agreement.',
      resources: ['Articulation agreement lookup', 'Transfer credit checklist'],
    },
    {
      id: 't2', title: 'Request transcripts', type: 'procedure', due: 'Jan 10',
      desc: 'Order official transcripts from every college you\'ve attended, sent directly to each target school.',
      resources: ['Transcript request checklist'],
    },
    {
      id: 't3', title: 'Submit transfer application', type: 'major', due: 'Mar 1',
      desc: (ctx) => ctx.programNames.length
        ? `Apply to your list: ${ctx.programNames.join(', ')} — carried over from Self-Discovery.`
        : 'Submit your transfer applications with all required supplements.',
      resources: ['Transfer application checklist'],
    },
    {
      id: 't4', title: 'Submit financial aid forms', type: 'milestone', due: 'Mar 15',
      desc: 'File FAFSA and/or CSS Profile as a transfer applicant — deadlines can differ from first-year deadlines.',
      resources: ['FAFSA checklist for transfer students'],
    },
    {
      id: 't5', title: 'Get accepted', type: 'final', due: 'May',
      desc: 'The finish line. Everything on this path was built to get you here.',
      resources: [],
    },
  ],
  undergraduate: [
    {
      id: 't1', title: 'Take the GRE/GMAT if relevant to your field', type: 'milestone', due: 'Sep 30',
      desc: 'Check whether your target programs require or recommend a standardized test — many are test-optional now.',
      resources: ['GRE prep overview', 'GMAT prep overview'],
    },
    {
      id: 't2', title: 'Request letters of recommendation', type: 'procedure', due: 'Oct 15',
      desc: 'Ask 2–3 professors or supervisors who can speak in depth about your work in this field.',
      resources: ['Email template for asking professors'],
    },
    {
      id: 't3', title: 'Draft your statement of purpose', type: 'procedure', due: 'Nov 5',
      desc: (ctx) => ctx.careerName
        ? `First full draft explaining your specific goals toward becoming a ${ctx.careerName.toLowerCase()} — be concrete about why this program.`
        : 'First full draft explaining your specific research or career goals and why this program fits them.',
      resources: ['Statement of purpose outline', 'Example SOPs that worked'],
    },
    {
      id: 't4', title: 'Submit applications', type: 'major', due: 'Dec 15',
      desc: (ctx) => ctx.programNames.length
        ? `Apply to your list: ${ctx.programNames.join(', ')} — carried over from Self-Discovery.`
        : 'Submit your applications with all required supplements.',
      resources: ['Submission checklist'],
    },
    {
      id: 't5', title: 'Get accepted', type: 'final', due: 'Mar',
      desc: 'The finish line. Everything on this path was built to get you here.',
      resources: [],
    },
  ],
};
