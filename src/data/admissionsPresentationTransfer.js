// Admissions Overview Presentation for Transfer students, Stage 1 (see CLAUDE.md) — real,
// researched narration for a beat-by-beat presentation shown to Transfer-track students
// specifically, covering TRANSFER admissions instead of either the High School script's own
// first-year college-admissions content (`admissionsPresentation.js`) or the Undergrad script's
// own graduate-school-admissions content (`admissionsPresentationGrad.js`). Same infrastructure,
// same 10-module/beat-by-beat rhythm, same "script only, visuals are a later stage" scope both
// prior scripts' own Stage 1 already established — every module id here is deliberately
// namespaced (`transfer-*`) rather than reusing either other script's own ids, so a lookup against
// AdmissionsBeatVisuals.jsx's `BEAT_VISUALS` (currently built only for the HS script) correctly
// finds nothing and falls through to the same honest placeholder-note rendering that screen
// already uses for any beat with no real visual yet — never an accidental, thematically mismatched
// illustration bleeding through just because two ids happened to collide.
//
// Grounded in real, well-established transfer-admissions practice: transfer review evaluates
// DEMONSTRATED college performance rather than first-year readiness, so the college record (not
// the high-school one) becomes the primary story; college GPA as the primary credential, with real
// illustrative benchmarks (3.5+ generally advisable, 3.7+ to be competitive at more selective
// schools); testing policy varying genuinely school by school for transfer applicants specifically;
// the transfer essay's own real standard of focusing on academic growth and real transfer
// motivation, explicitly NOT a reused high-school personal statement; real credit-transfer
// mechanics (course-to-course articulation agreements, program/"2+2" articulation agreements, state
// transfer equivalency databases), illustrated with a real, concrete example — California's TAG
// program guaranteeing UC admission for community-college students meeting published GPA
// requirements; the critical, real rule that transfer recommendation letters must come from COLLEGE
// professors who've seen actual college-level work, never high school teachers; and the real,
// common admissions-file pitfall of a missing transcript from one of several attended institutions,
// against the real Jan-March transfer application window most four-year schools use for fall entry.
// Plain data, no logic — matches this codebase's own "data files stay free of logic" convention
// (courses.js, mascotDialogue.js, admissionsPresentation.js, admissionsPresentationGrad.js, etc.).
// `visualConcept` is a DESCRIPTION only for this stage — real illustration/animation work, if
// pursued, would be its own later, separate stage, exactly mirroring both prior scripts' own
// Stage 1 → Stage 2 split.
export const ADMISSIONS_MODULES_TRANSFER = [
  {
    id: 'transfer-introduction',
    title: 'Introduction',
    beats: [
      {
        narration: "Before we dive in, let's walk through how transfer admissions actually works.",
        visualConcept: 'The mascot waving/greeting warmly.',
      },
      {
        narration:
          "Transfer admissions is a genuinely different process than the one you went through for your first college — it's judged through a different lens entirely.",
        visualConcept: 'Two labeled silhouettes side by side — "First-Year" and "Transfer" — facing different directions.',
      },
      {
        narration:
          "We'll walk through the big picture, your academic record, testing, your transfer essay, how credits actually move between schools, letters, your target list, and the real timeline ahead.",
        visualConcept: 'A simple stop-by-stop map/table-of-contents, each stop lighting up as it’s named.',
      },
    ],
  },
  {
    id: 'transfer-big-picture',
    title: 'The Big Picture',
    beats: [
      {
        narration: 'Transfer admissions asks a genuinely different question than first-year admissions does.',
        visualConcept: 'Two open doors, each labeled differently.',
      },
      {
        narration:
          "First-year admissions evaluates your readiness to START college. Transfer admissions evaluates how successfully you've already performed once you got there.",
        visualConcept: 'A "before" icon and an "after" icon side by side, the "after" one glowing.',
      },
      {
        narration: "That means your college record becomes the primary story now — not your high school one.",
        visualConcept: 'A high-school transcript fading into the background as a college transcript steps forward.',
      },
      {
        narration:
          "Everything from here is about proving you're ready for the next, more advanced step — based on real, demonstrated college performance.",
        visualConcept: 'A staircase with a "You are here" marker partway up.',
      },
    ],
  },
  {
    id: 'transfer-academic-record',
    title: 'Academic Record',
    beats: [
      {
        narration: 'Your college GPA is now your primary credential.',
        visualConcept: 'A large, glowing GPA number.',
      },
      {
        narration:
          'As a rough guide, 3.5+ is generally considered advisable, and 3.7+ is where you become genuinely competitive at more selective schools.',
        visualConcept: 'A gauge/meter with two marked thresholds.',
      },
      {
        narration: "Completed credits matter too — schools want to see you've built real momentum, not just a handful of scattered courses.",
        visualConcept: 'A stack of course-credit blocks building upward.',
      },
      {
        narration:
          "And they're watching the trend — an upward trajectory across your terms reads as real growth, even if an early term wasn't your strongest.",
        visualConcept: 'A line graph trending upward despite one early dip.',
      },
    ],
  },
  {
    id: 'transfer-testing',
    title: 'Testing',
    beats: [
      {
        narration: 'Testing for transfer students is genuinely inconsistent from school to school.',
        visualConcept: 'Several test-icon doors, some open, some shut.',
      },
      {
        narration:
          'Some schools still require or accept self-reported SAT or ACT scores, even for transfer applicants — others don’t ask for scores at all.',
        visualConcept: 'One door open with a test icon inside, one door shut with an X over it.',
      },
      {
        narration: "This is worth checking directly on each target school's own transfer requirements page — don't assume it's the same everywhere.",
        visualConcept: "A magnifying glass over one specific school's own requirements page.",
      },
    ],
  },
  {
    id: 'transfer-essay',
    title: 'The Transfer Essay',
    beats: [
      {
        narration: 'Your transfer essay is one of the most important pieces of this entire application.',
        visualConcept: 'The mascot pointing at a glowing, central document.',
      },
      {
        narration: "It's not a rehash of the personal statement you wrote for your first college — reusing that essay here is a real mistake.",
        visualConcept: 'An old, faded essay being crossed out, replaced by a fresh document.',
      },
      {
        narration: 'This essay needs to focus on your real academic growth, and your genuine reasons for transferring now.',
        visualConcept: 'A new document with "Growth" and "Why Now" sections highlighted.',
      },
      {
        narration: 'Be specific and honest — vague reasons read as uncertain, but a real, well-reasoned story reads as intentional.',
        visualConcept: 'Two speech bubbles — one flat and gray, one colorful and distinct.',
      },
    ],
  },
  {
    id: 'transfer-credit-articulation',
    title: 'Credit Transfer & Articulation',
    beats: [
      {
        narration: 'One thing makes transfer applications genuinely different: figuring out what actually transfers.',
        visualConcept: 'A bridge connecting two separate school icons.',
      },
      {
        narration: 'Course-to-course articulation agreements spell out exactly which of your current classes count at a specific target school.',
        visualConcept: 'Two course icons linking together with a checkmark.',
      },
      {
        narration:
          'Program articulation agreements — sometimes called "2+2" agreements — go further, mapping a full two-year plan directly into a specific four-year program.',
        visualConcept: 'A 2-step path merging with another 2-step path, forming one continuous 4-step path.',
      },
      {
        narration: 'Many states keep public transfer equivalency databases specifically so you can check this before you apply, not after.',
        visualConcept: 'A database/search icon with course codes flowing through it.',
      },
      {
        narration:
          "A real example: California's TAG program guarantees admission to specific UC campuses for community college students who meet clear, published GPA requirements — a concrete illustration of how these agreements actually work.",
        visualConcept: 'A "TAG" badge connecting a community-college icon directly to a UC icon.',
      },
    ],
  },
  {
    id: 'transfer-recommendation-letters',
    title: 'Recommendation Letters',
    beats: [
      {
        narration: 'Recommendation letters work differently here than they did the first time around.',
        visualConcept: 'Two envelopes — one labeled "High School," one labeled "College."',
      },
      {
        narration: 'The critical rule: these need to come from college professors, not high school teachers.',
        visualConcept: 'A high-school-teacher icon fading out as a college-professor icon steps forward.',
      },
      {
        narration: "Target schools want to know one specific thing: how you've actually performed in real college-level work.",
        visualConcept: 'A professor and student in a real conversation over a real assignment.',
      },
      {
        narration: "Ask a professor who's seen your work directly — in a class, a project, office hours — not just one whose class you happened to do well in.",
        visualConcept: 'A highlighted "worked directly with" connection beside a faded "just took the class" one.',
      },
    ],
  },
  {
    id: 'transfer-building-your-list',
    title: 'Building Your Target List',
    beats: [
      {
        narration: "Your target list isn't just about picking schools you like — it's about picking schools where you're a realistic fit right now.",
        visualConcept: 'A target/bullseye icon with several school icons scattered around it, at varying distances.',
      },
      {
        narration: "That means matching your current GPA and completed coursework against what each target school's transfer requirements actually ask for.",
        visualConcept: 'A GPA icon and a coursework icon both being checked against a requirements checklist.',
      },
      {
        narration: 'Articulation agreements with your current school can make some targets a much smoother, more certain path than others.',
        visualConcept: 'A short, direct bridge next to a longer, dotted, uncertain path — each leading to a different school icon.',
      },
      {
        narration: 'This app already helps you track your target programs and how your record lines up, in your Academic Plan.',
        visualConcept: "MyPath's own roadmap/plan icon.",
      },
    ],
  },
  {
    id: 'transfer-timeline',
    title: 'The Timeline',
    beats: [
      {
        narration: 'Transfer applications run on their own real calendar — most four-year schools accept applications January through March for fall entry.',
        visualConcept: 'A calendar with January through March highlighted.',
      },
      {
        narration: 'One of the most common reasons a transfer file gets marked incomplete: a missing transcript.',
        visualConcept: 'A folder with a red "missing" flag on one document.',
      },
      {
        narration: 'You need official transcripts from every institution you\'ve attended — not just your current school.',
        visualConcept: 'Several distinct school icons, each sending a transcript into one shared folder.',
      },
      {
        narration: "Missing even one — a summer course somewhere else, an earlier school you transferred from before — can hold up your entire file.",
        visualConcept: 'One small, easy-to-overlook school icon highlighted among several larger ones.',
      },
    ],
  },
  {
    id: 'transfer-transition',
    title: 'Transition',
    beats: [
      {
        narration: "That's the real shape of transfer admissions — now let's make it yours.",
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
