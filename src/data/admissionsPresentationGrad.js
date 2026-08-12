// Admissions Overview Presentation for Undergrad (Grad School), Stage 1 (see CLAUDE.md) — real,
// researched narration for a beat-by-beat presentation shown to Undergraduate-track students
// specifically, covering graduate/professional school admissions instead of the original
// (`admissionsPresentation.js`) High School script's own college-admissions content. Same
// infrastructure, same 10-module/beat-by-beat rhythm, same "script only, visuals are a later
// stage" scope the HS version's own Stage 1 already established — every module id here is
// deliberately namespaced (`grad-*`) rather than reusing the HS script's own ids, so a lookup
// against AdmissionsBeatVisuals.jsx's `BEAT_VISUALS` (currently built only for the HS script)
// correctly finds nothing and falls through to the same honest placeholder-note rendering that
// screen already uses for any beat with no real visual yet — never an accidental, thematically
// mismatched HS illustration bleeding through just because two ids happened to collide.
//
// Grounded in real, well-established, non-controversial graduate/professional admissions
// practice: holistic-but-differently-weighted review; the Statement of Purpose's own real
// standard of program/faculty-specific narrative writing over a generic resume recap; research
// depth and faculty fit as the field's own equivalent of the HS "spike" concept; recommendation
// letters needing to come from people who can speak to real research/work, not general character;
// the real, current test-optional trend in many fields; and the real fall/winter admissions cycle
// most programs run on. Plain data, no logic — matches this codebase's own "data files stay free
// of logic" convention (courses.js, mascotDialogue.js, admissionsPresentation.js, etc.).
// `visualConcept` is a DESCRIPTION only for this stage — real illustration/animation work, if
// pursued, would be its own later, separate stage, exactly mirroring the HS script's own
// Stage 1 → Stage 2 split.
export const ADMISSIONS_MODULES_GRAD = [
  {
    id: 'grad-introduction',
    title: 'Introduction',
    beats: [
      {
        narration: "Before we dive in, let's walk through how graduate admissions actually works.",
        visualConcept: 'The mascot waving/greeting warmly.',
      },
      {
        narration:
          "Grad admissions is a genuinely different game than college admissions — it's less about a broad, well-rounded profile and more about a focused, well-argued fit.",
        visualConcept: 'Two silhouettes side by side: one wide and shallow, one narrow and deep.',
      },
      {
        narration:
          "We'll walk through the big picture, your academic record, testing, the Statement of Purpose, research fit, letters, your program list, and the real timeline ahead.",
        visualConcept: 'A simple stop-by-stop map/table-of-contents, each stop lighting up as it’s named.',
      },
    ],
  },
  {
    id: 'grad-big-picture',
    title: 'The Big Picture',
    beats: [
      {
        narration: 'Grad admissions is holistic too — but the weighting is different.',
        visualConcept: 'A scale, subtly different in shape from a college-admissions scale.',
      },
      {
        narration: 'Your Statement of Purpose, transcript and coursework, letters, and sometimes test scores are all read together.',
        visualConcept: 'Four documents converging into one folder.',
      },
      {
        narration:
          'But one thing matters here more than almost anywhere else: fit — does your specific background and interest genuinely align with this specific program and its faculty?',
        visualConcept: 'A puzzle piece rotating to match one uniquely-shaped slot, not just any slot.',
      },
      {
        narration:
          "A strong GPA alone doesn't make the case — the whole application has to argue the same thing: 'I belong in this exact program, doing this exact kind of work.'",
        visualConcept: 'Several documents all pointing/aligning toward one single target.',
      },
    ],
  },
  {
    id: 'grad-academic-record',
    title: 'Academic Record',
    beats: [
      {
        narration: 'Your undergraduate GPA still matters — but not as a single number in isolation.',
        visualConcept: 'A magnifying glass zooming past an overall GPA number toward specific course grades.',
      },
      {
        narration: 'Programs look closely at your grades in courses relevant to their field — a strong major GPA can matter more than your overall one.',
        visualConcept: 'A transcript with major-relevant courses highlighted, others dimmed.',
      },
      {
        narration: 'Any research experience already on your record — a thesis, a lab role, an independent study — becomes part of this same story.',
        visualConcept: 'A research-paper icon sliding into the same folder as the transcript.',
      },
      {
        narration: "A rough grade or two isn't disqualifying if the rest of your record shows real growth and direction.",
        visualConcept: 'A line graph trending upward despite one dip.',
      },
    ],
  },
  {
    id: 'grad-testing',
    title: 'Testing',
    beats: [
      {
        narration: 'Depending on your field, you may need the GRE, GMAT, LSAT, or MCAT.',
        visualConcept: 'Four labeled test-icon doors, one lit up based on field.',
      },
      {
        narration: 'Each exam maps to a different kind of program — business, law, medicine, or general graduate study.',
        visualConcept: 'The same four doors, each now leading to a distinct building icon.',
      },
      {
        narration:
          'Here’s a real, current shift: many programs — especially in the sciences and humanities — have gone test-optional or dropped the requirement entirely.',
        visualConcept: 'One of the four doors shown propped open, no test icon required.',
      },
      {
        narration: 'Always check the specific program’s own current policy — this varies field by field, and even program by program.',
        visualConcept: "A magnifying glass over one specific program's own requirements page.",
      },
    ],
  },
  {
    id: 'grad-statement-of-purpose',
    title: 'The Statement of Purpose',
    beats: [
      {
        narration: "If one document carries the most weight in your entire application, it's the Statement of Purpose.",
        visualConcept: 'The mascot pointing at a glowing, central document.',
      },
      {
        narration: "It's not a recap of your resume — admissions committees already have that.",
        visualConcept: 'A resume being crossed out, replaced by a different document.',
      },
      {
        narration: 'A strong SOP is a narrative — connecting your specific background to why THIS program, THIS faculty, and THIS research, specifically.',
        visualConcept: 'A line drawing connecting a "You" icon to a specific faculty/research icon.',
      },
      {
        narration: "That means naming real faculty whose work genuinely aligns with yours, and being specific about labs, projects, or features that drew you in.",
        visualConcept: 'A document with a highlighted faculty name and a specific lab name.',
      },
      {
        narration: "Generic language — 'I've always been passionate about this field' — reads as a real weakness, not a strength.",
        visualConcept: 'A red flag rising next to a vague, faded sentence.',
      },
    ],
  },
  {
    id: 'grad-research-fit',
    title: 'Research Experience & Fit',
    beats: [
      {
        narration: "If high school has a 'spike,' grad school has something even more specific: research fit.",
        visualConcept: 'One tall peak, paired with a magnifying glass zoomed in tight on it.',
      },
      {
        narration: "It's real depth in one focused area — not broad involvement across many labs or projects.",
        visualConcept: 'One glowing research icon, versus several dim, scattered ones.',
      },
      {
        narration: 'Ideally, that depth points toward specific faculty at your target programs whose own research genuinely overlaps with yours.',
        visualConcept: 'A line connecting a research icon directly to a named faculty icon.',
      },
      {
        narration: 'This is why starting research early and following it consistently matters more than chasing a long list of experiences.',
        visualConcept: 'A single winding path deepening over time, versus several short, disconnected ones.',
      },
    ],
  },
  {
    id: 'grad-recommendation-letters',
    title: 'Recommendation Letters',
    beats: [
      {
        narration: 'Your letters carry real weight here too — but grad programs read them differently than college ones do.',
        visualConcept: 'Two envelopes: one labeled generic, one labeled specific.',
      },
      {
        narration: 'They need to come from people who know your actual work — a research supervisor, a professor you’ve done real work with.',
        visualConcept: 'Two people in a real conversation over a shared project, not just a name on a roster.',
      },
      {
        narration: 'A general character reference — even a glowing one — carries far less weight than someone who can speak to your specific research ability.',
        visualConcept: 'A generic "great student!" letter fading, replaced by a specific, detailed one.',
      },
      {
        narration: 'Ask early, and give them something concrete to work with — your CV, your research summary, even your draft SOP.',
        visualConcept: 'A folder being handed over, its contents visibly highlighted.',
      },
    ],
  },
  {
    id: 'grad-building-your-list',
    title: 'Building Your Program List',
    beats: [
      {
        narration: "Your program list isn't a prestige ranking — it's a fit list.",
        visualConcept: 'Three labeled baskets, "Fit" front and center above them.',
      },
      {
        narration: "Targeting programs means targeting the faculty and research inside them — not just the school's overall name.",
        visualConcept: 'Zooming past a university logo into a specific department/lab icon.',
      },
      {
        narration: 'A lower-ranked program with a perfect faculty match can be a stronger choice than a prestigious one with no one doing your kind of work.',
        visualConcept: 'Two program icons: one small but glowing (matched), one large but dim (mismatched).',
      },
      {
        narration: 'This app already helps you track programs and their real fit as you go, in your Academic Plan.',
        visualConcept: "MyPath's own roadmap/plan icon.",
      },
    ],
  },
  {
    id: 'grad-timeline',
    title: 'The Timeline',
    beats: [
      {
        narration: 'Grad school applications run on their own real clock — most due in the fall and winter before you’d start the following year.',
        visualConcept: 'A calendar with application deadlines clustered in fall/winter.',
      },
      {
        narration:
          'Faculty outreach — reaching out to potential advisors directly — often starts months before the application itself, especially in research-heavy fields.',
        visualConcept: 'An email icon reaching toward a faculty icon, well ahead of a deadline marker on the same timeline.',
      },
      {
        narration: 'Your Statement of Purpose usually goes through several real drafts, so starting it early gives it room to actually get specific.',
        visualConcept: 'A page with visible draft numbers stacking up: "Draft 1 → 2 → 3."',
      },
      {
        narration: 'Wherever you are right now in your undergrad years, the earlier you start this groundwork, the stronger your eventual application gets.',
        visualConcept: 'A timeline with "now" marked partway along, an arrow pointing forward toward "applications open."',
      },
    ],
  },
  {
    id: 'grad-transition',
    title: 'Transition',
    beats: [
      {
        narration: "That's the real shape of graduate admissions — now let's make it yours.",
        visualConcept: 'The same stop-by-stop map from the Introduction, now fully lit up.',
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
