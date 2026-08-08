// Admissions Overview Presentation, Stage 1 (see CLAUDE.md) — real, researched narration for a
// beat-by-beat presentation shown once, pre-hub, replacing the old one-line "Quick context: ..."
// hub dialogue (`ADMISSIONS_CONTEXT_LINES`). Every beat below is grounded directly in real
// research about (1) what a professional college consultant's services actually cover, (2) the
// "spike" concept (selective schools favor depth over breadth in extracurriculars), and (3) the
// real year-by-year shape of a high-school student's admissions timeline — not invented.
//
// Plain data, no logic — matches this codebase's own "data files stay free of logic" convention
// (courses.js, mascotDialogue.js, etc.). `visualConcept` is a DESCRIPTION only for Stage 1 — the
// real illustration/animation work is Stage 2 (a separate, later, smaller-batched task, given the
// larger ~38-beat scope here).
export const ADMISSIONS_MODULES = [
  {
    id: 'introduction',
    title: 'Introduction',
    beats: [
      {
        narration: "Before we dive in, let's walk through how college admissions actually works.",
        visualConcept: 'The mascot waving/greeting warmly.',
      },
      {
        narration:
          'Families who work with professional college consultants get one real thing out of it: a clear, coordinated plan instead of guesswork.',
        visualConcept: 'A scattered, tangled set of icons resolving into one organized checklist.',
      },
      {
        narration:
          "We'll walk through the big picture, then academics, testing, essays, activities, recommendations, your college list, the four years ahead, and how it all wraps up.",
        visualConcept: 'A simple 10-stop map/table-of-contents, each stop lighting up as it’s named.',
      },
    ],
  },
  {
    id: 'big-picture',
    title: 'The Big Picture',
    beats: [
      {
        narration: "Admissions offices don't grade you box by box.",
        visualConcept: 'A checklist with boxes being crossed out one by one.',
      },
      {
        narration:
          "They're reading for one coherent story — how your grades, activities, and essays all fit together.",
        visualConcept: 'Separate puzzle pieces sliding together into one picture.',
      },
      {
        narration:
          "That's why the next few minutes matter — every part of your application should point in the same direction.",
        visualConcept: 'Several arrows from different icons converging on one target.',
      },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    beats: [
      {
        narration: 'Your transcript is the foundation everything else sits on.',
        visualConcept: 'A building resting on a transcript-shaped base.',
      },
      {
        narration:
          "Grades matter, but so does rigor — admissions officers want to see you challenging yourself, not just earning easy A's.",
        visualConcept: 'Two paths: one flat and easy, one uphill with a flag at the top.',
      },
      {
        narration:
          "The real strategy: add honors or AP courses in subjects where you've already shown you can do well.",
        visualConcept: 'A course list with a couple of entries leveling up and gaining a star.',
      },
      {
        narration: 'By junior year, admissions expects your most rigorous course load yet.',
        visualConcept: 'A bar chart of course difficulty climbing year over year.',
      },
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    beats: [
      {
        narration: 'Testing starts low-stakes, on purpose.',
        visualConcept: 'A practice target labeled "no pressure."',
      },
      {
        narration: 'The PSAT in sophomore year is real practice, not a score that follows you.',
        visualConcept: 'A practice exam page stamped "PRACTICE."',
      },
      {
        narration:
          "By junior year, it's the real SAT or ACT — and deciding whether and when to retake matters as much as the first attempt.",
        visualConcept: 'A calendar with a highlighted retake date.',
      },
      {
        narration: "Some schools don't require scores at all — that's a real, strategic decision, not a shortcut.",
        visualConcept: 'Two doors: one labeled "Submit Scores," one labeled "Test-Optional."',
      },
    ],
  },
  {
    id: 'essays',
    title: 'Essays',
    beats: [
      {
        narration: 'One of the most important pieces is your college essays.',
        visualConcept: 'The mascot pointing at an essay/document.',
      },
      {
        narration:
          "And there isn't just one — there's a personal statement, plus a separate essay for nearly every school.",
        visualConcept: 'A book opening to reveal many labeled essay-section tabs.',
      },
      {
        narration: 'The personal statement usually goes through several real drafts before it’s ready.',
        visualConcept: 'A page with visible draft numbers stacking up: "Draft 1 → 2 → 3."',
      },
      {
        narration: "The goal in every draft is the same: sound like you, not like what you think they want to hear.",
        visualConcept: 'Two speech bubbles — one flat and gray, one colorful and distinct.',
      },
    ],
  },
  {
    id: 'extracurriculars-spike',
    title: 'Extracurriculars & the Spike',
    beats: [
      {
        narration: "It's tempting to join everything — but that's not actually what stands out.",
        visualConcept: 'A long, cluttered list of club icons, mostly grayed out.',
      },
      {
        narration: 'Selective schools favor real depth in one or two areas over a long, shallow list.',
        visualConcept: 'One tall peak rising above a row of small, flat hills.',
      },
      {
        narration: "That's the idea of a 'spike' — going deep enough in something that it becomes genuinely yours.",
        visualConcept: 'A single activity icon glowing/highlighted while the others around it fade.',
      },
      {
        narration:
          "It has to start early and grow naturally — a spike that suddenly appears junior year reads as manufactured, not real.",
        visualConcept:
          "A plant growing gradually across several seasons, next to one that's simply placed fully-grown.",
      },
    ],
  },
  {
    id: 'recommendation-letters',
    title: 'Recommendation Letters',
    beats: [
      {
        narration: 'Your recommendation letters carry real weight — but only if they’re specific.',
        visualConcept: 'A generic form letter next to one with real, specific details highlighted.',
      },
      {
        narration: 'The best letters come from teachers who genuinely know your work, not just your grade.',
        visualConcept: 'A teacher and student in a real conversation, versus a name on a roster.',
      },
      {
        narration:
          'Ask early — junior year, not the fall of senior year — so they have real time to write something thoughtful.',
        visualConcept: 'A calendar with "junior year" highlighted, far ahead of a rushed "senior fall" deadline.',
      },
      {
        narration: "Give them something to work with — a resume or a few real examples of what you're proud of.",
        visualConcept: 'A folder being handed over, its contents visibly highlighted.',
      },
    ],
  },
  {
    id: 'building-your-list',
    title: 'Building Your List',
    beats: [
      {
        narration: "Your college list isn't just a ranking — it's a balance of Reach, Match, and Safety schools.",
        visualConcept: 'Three labeled baskets, each holding a few school icons.',
      },
      {
        narration: "Fit isn't only academic — it's social and financial too.",
        visualConcept: 'Three overlapping circles labeled Academic, Social, Financial.',
      },
      {
        narration: "A 'Safety' school should still be somewhere you'd genuinely be happy to attend.",
        visualConcept: 'A school icon with a real, genuine checkmark, not a shrug.',
      },
      {
        narration: 'This app already helps you build that balanced list as you go, in your Academic Plan.',
        visualConcept: "MyPath's own roadmap/plan icon.",
      },
    ],
  },
  {
    id: 'four-year-arc',
    title: 'The Four-Year Arc',
    beats: [
      {
        narration:
          'Freshman year is about building real habits — strong grades, and 2 or 3 activities you actually care about, not a long list.',
        visualConcept: 'A timeline with "Freshman: Habits + Focus" highlighted.',
      },
      {
        narration:
          'Sophomore year, you start adding rigor where you’ve already shown strength, and take the PSAT just for practice.',
        visualConcept: 'The timeline advancing, "Sophomore: Add Rigor" highlighted.',
      },
      {
        narration:
          'Junior year is the most demanding — your hardest courses, the real SAT or ACT, real leadership, and asking for recommendation letters.',
        visualConcept: 'The timeline’s tallest peak, "Junior: The Big Push."',
      },
      {
        narration:
          'The summer before senior year is often called the most critical summer — finalize testing, visit schools, and start your essays.',
        visualConcept: 'A highlighted "Summer" stop between Junior and Senior.',
      },
      {
        narration: 'Senior year is execution — submit on real deadlines, keep your grades up, and finish strong.',
        visualConcept: 'The timeline reaching a finish line/flag.',
      },
    ],
  },
  {
    id: 'transition',
    title: 'Transition',
    beats: [
      {
        narration: "That's the real shape of the process — now let's make it yours.",
        visualConcept: 'The same 10-stop map from the Introduction, now fully lit up.',
      },
      {
        narration: 'Next, I want to actually get to know you — what excites you, and what you’ve already done.',
        visualConcept: 'The mascot leaning in, listening.',
      },
      {
        narration: 'Everything we build together from here will fit into this same big picture.',
        visualConcept: 'A single puzzle piece labeled "You" fitting into the picture from module 2.',
      },
    ],
  },
];
