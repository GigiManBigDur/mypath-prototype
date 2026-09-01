// AI-First Onboarding, Stage 2 (see CLAUDE.md) — a FOURTH, standalone Vercel serverless function
// (alongside api/chat.js's general assistant, api/creative-suggest.js/api/build-your-own-chat.js's
// project ideation, api/suggest.js/api/suggest-weekly.js/api/suggest-schedule.js's auto-triggered
// suggestions), matching this codebase's own established "each Vercel function stays standalone,
// never import from a sibling under api/" precedent. This is the student's FIRST real conversation
// with the AI — genuinely different in purpose from every other chat endpoint: it replaces the old
// interest-tag survey question and the prior-experience/ECs field entirely, gathering both
// conversationally instead of via a form, and it's the one place in this app with real, deliberate
// "narrative pushback" capability (Task 4) — noticing a genuine, non-obvious connection in what the
// student shares and offering it as a real, well-reasoned suggestion, never an override.
//
// Same security/cost/provider patterns every prior stage already established: same CORS allowlist
// shape, same dual-provider (Anthropic/OpenAI) dispatch via the SAME AI_SUGGESTION_PROVIDER env
// var (whichever provider already answers every other AI feature answers this one too, with zero
// separate configuration), same forced-tool-call reliability approach, same server-side-enforced
// (not just prompt-trusted) honesty guardrail.
//
// There is no server-side conversation store (this app has no backend/database at all outside
// these narrow serverless exceptions) — the CLIENT holds the conversation
// (`state.onboardingChatHistory`, a field deliberately separate from the general assistant's own
// `state.chatHistory`) and resends the full turn history on every request.

// Bug fix precedent (see CLAUDE.md, api/build-your-own-chat.js's own detailed diagnosis) — same
// latent risk here: no vercel.json/per-function config anywhere in this repo meant every AI-calling
// function ran on whatever short default timeout the deployment applies. A real, thoughtful
// narrative conversation can legitimately take several seconds; this makes the ceiling explicit.
import { checkRateLimit } from './_rateLimit.js';

export const config = {
  maxDuration: 60,
};

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-5.6-terra';

// Bug fix (see CLAUDE.md, "Confirmed narrative overview never restores real interest tags") — a
// real, confirmed regression: AI-First Onboarding Stage 1 removed the Survey's interest-tag
// picker (the ONLY place `state.interestTags` was ever written) on the assumption Stage 2's own
// conversation would replace that data-gathering job — but nothing was ever built to translate the
// conversation back into `state.interestTags`, so that field stayed permanently `[]` for every
// real student who went through the new flow. `getBuiltTracks([])`/`getOpportunityTracks([])`
// both resolve to zero tracks for an empty array, which made DiscoveryScreen.jsx's own pre-existing
// defensive "reached with no real track, bounce back to hub" effect fire IMMEDIATELY and
// UNCONDITIONALLY for every real post-conversation user — not a locked tile, a genuinely broken
// click: "Careers of Interest," "Related College Majors," and "Recommended Programs" (all 3
// Discovery sub-steps share this same screen/effect) were all completely unreachable. Confirmed
// directly by driving the real Sign Up -> Survey -> conversation -> confirm -> hub -> click flow
// end-to-end, not just seeded state (an isolated seeded-state test with `interestTags` pre-filled
// never would have caught this). `getOpportunityTracks(state.interestTags)` (Opportunity Finder's
// "Recommended for you," Course Selection's own interest-based recommendations) degrades more
// gracefully — an empty result there falls back to `GENERIC_OPPORTUNITIES`/no track-matched
// courses rather than a hard bounce — but is still a real, silent loss of personalization from the
// exact same root cause, not a separate bug.
//
// The fix: this schema/prompt now ALSO proposes real, valid interest tags — chosen from the SAME
// fixed vocabulary `src/data/interests.js`'s own `CATEGORIES` array already defines — the moment a
// real overview is confirmed, restoring `state.interestTags` to a real, non-empty value for every
// student who reaches that point (see `confirmNarrative()`, OnboardingConversationScreen.jsx).
// `VALID_INTEREST_TAGS` is a deliberate, hand-checked duplication of that file's own real tag names
// — api/*.js functions can't import from src/ (this codebase's own established "each Vercel
// function stays standalone" precedent), so this mirrors the exact same trade-off api/chat.js's own
// `APP_KNOWLEDGE` block already makes (real app knowledge, duplicated as plain prompt text, since
// there's no other way to share it with a serverless function). If `src/data/interests.js`'s own
// `CATEGORIES` array ever changes, update this list to match — `validateProposal` below silently
// drops anything the model returns that ISN'T a real member of this exact list, so a stale/
// mismatched entry here would just mean fewer real tags getting through, never a crash or a
// fabricated one.
const VALID_INTEREST_TAGS = [
  'Soccer', 'Basketball', 'Tennis', 'Swimming', 'Track & Field', 'Football',
  'Mathematics', 'Philosophy', 'History', 'Literature', 'Psychology', 'Political Science',
  'Visual Arts', 'Music', 'Writing', 'Theater', 'Film Production', 'Photography',
  '3D Modeling', 'App Development', 'Robotics', 'Game Design', 'Cybersecurity', 'Data & AI',
  'Activism', 'Volunteering', 'Mentoring', 'Student Government', 'Nonprofit Work',
  'Business', 'Finance', 'Entrepreneurship', 'Marketing', 'Healthcare', 'Law',
  'Gardening', 'Travel', 'Cooking', 'Fitness', 'Fashion',
  'Film', 'Anime', 'Podcasts', 'Gaming', 'Music Industry',
  'Journaling', 'Mindfulness', 'Productivity', 'Public Speaking', 'Goal Setting',
];

// Same "proportionate, not bulletproof" abuse guard as every other api/*.js file — duplicated
// rather than shared, matching those files' own precedent (each Vercel function is standalone).
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/gigimanbigdur\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

function resolveAllowedOrigin(origin) {
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) return origin;
  return null;
}

// Task 5's own honesty rule — identical in spirit and wording to api/chat.js's own
// `mentionsSpecificEntity` (itself refined by the "Make the Verify This Yourself Disclaimer
// Conditional" fix, see CLAUDE.md): the model self-reports, then the guardrail is enforced
// deterministically in code below, never trusted to the model's own prose alone. Deliberately
// reuses that fix's exact refined language ("don't flag something already confirmed by the
// student's own profile data") rather than the older, over-eager "if in doubt, set it true"
// wording that fix specifically replaced.
// AI-First Onboarding, Stage 3 (see CLAUDE.md) — extends this SAME conversation/schema with a
// second job, mirroring api/build-your-own-chat.js's own exact "one schema, filled in only once
// something is genuinely ready" pattern (planReady/projectName/milestones/milestoneDayOffsets, all
// set together the SAME turn the model decides a real plan has emerged) rather than a second
// dispatched system prompt/endpoint — there's no separate "detail" pass needed here the way Build
// Your Own's own per-phase planning is (that reuse already happens automatically once a phase is
// promoted onto the real roadmap — see OnboardingConversationScreen.jsx's own comment on why
// MilestonePlanningPanel/Roadmap.jsx needed zero changes at all). Every one of these new fields
// stays null/false for as long as `readyForOverview` is false, i.e. for the entire ordinary
// back-and-forth this conversation already had before this stage existed.
const ONBOARDING_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Your next line in this ongoing, natural conversation with the student — exactly what gets shown to them. Ask about ONE thing at a time; never stack multiple questions into one reply. Keep it warm, genuinely curious, and concise (a real conversational turn, not an essay).',
    },
    // Implement the Corrected Flow Order: Transcript & GPA Moves Into Session 1 (see CLAUDE.md) —
    // a real, EARLIER milestone than readyForOverview below, and a genuinely SEPARATE one:
    // mirroring finalReviewComplete's own "independent milestone" shape (a plain boolean, always
    // required, never dependent on readyForOverview's own bundle of fields), this fires once,
    // early, to hand the student off to the real Transcript & GPA form so the REST of this
    // conversation — activities, narrative pushback, and the strategy discussion — can be grounded
    // in real academic standing instead of guesswork. See the "Transcript & GPA pause" section of
    // the system prompt below for exactly when to set this and what to do once it resumes.
    readyForTranscriptPause: {
      type: 'boolean',
      description: 'True ONLY ONCE, early in this conversation — right after a genuine initial exchange about the student\'s interests/passions and BEFORE going deep into their prior activities/experience. See the "Transcript & GPA pause" instructions below for the full rule, including when this must stay false (before that natural point, and for the ENTIRE rest of the conversation once it has already happened once — check profileSummary.academic for real GPA/transcript data, which only appears AFTER this has already fired and resumed). False for every other turn.',
    },
    readyForOverview: {
      type: 'boolean',
      description: 'True ONLY once ALL of the following have genuinely happened in this conversation: (1) real interests and at least one real piece of prior experience have been established, (2) if you ever suggested reconsidering their direction, whether the student actually agreed to it or not is settled, and (3) you have had a genuine strategy discussion (see the "Strategy discussion" instructions below) — proposing something specific across course rigor, testing approach, college-list direction, and essay material, and genuinely incorporating the student\'s real response (agreement, pushback, or their own alternative) for each. Never skip straight from a settled narrative direction to the overview without that real strategy back-and-forth. False for anything less developed than that.',
    },
    narrativeTitle: {
      type: ['string', 'null'],
      description: 'A short, specific 3-6 word title for the overall direction (e.g. "Sociology + Economics Path", not a generic phrase like "Your Future"). Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    narrativeSummary: {
      type: ['string', 'null'],
      description: 'A clear 2-4 sentence summary of the ACTUAL direction the conversation settled on — grounded in the real, specific things the student said, not a generic restatement. If you ever suggested reconsidering their direction earlier in this conversation, explicitly say here whether the student agreed to it and, if so, name the accepted direction plainly (e.g. "...exploring Sociology alongside Economics, given your interest in comparing how different cultures resolve disputes"). If they declined a suggestion, the summary should reflect their own original direction instead. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    overviewPhaseTitles: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: 'An ORDERED list of short, specific overview-level phase titles covering the major chapters of this student\'s ENTIRE remaining plan — both real school-YEAR chapters (e.g. "Sophomore Year: Deepen your foundation in social research methods") AND, as their own SEPARATE entries, the real SUMMER breaks between them (e.g. "Summer Before Junior Year: A self-directed documentary project on..."). EXACTLY one entry per remaining school year (see profileSummary.basicProfile.planYearLabels for the REAL, exact count and names — never invent a different number of years) PLUS EXACTLY one entry per summer between two consecutive school years in that list (not after the FINAL year, which ends in graduation/application, not a school-year-shaped summer) — this means the total is always (2 * the number of entries in planYearLabels) - 1: a student with only 2 remaining years (e.g. an 11th-grader) gets exactly 3 real phases, not a padded-out longer list, and that is completely correct — never add extra phases just to reach a bigger-sounding number. These are broad CHAPTERS, not granular steps — do not break any phase down into its own sub-actions here (that level of detail is deliberately deferred to a later, separate, narrower conversation once the student actually reaches that phase). Required (non-null, matching the EXACT real year/summer count above) when readyForOverview is true. Must be null otherwise.',
    },
    // Expand the Multi-Year Overview (see CLAUDE.md), Task 2 — this is where nearly all of the
    // actual requested richness lives: BEFORE this field existed, `overviewPhaseTitles` was the
    // only real content per phase, and OnboardingConversationScreen.jsx's own confirmNarrative()
    // filled every phase's real `desc` with a fixed, generic boilerplate sentence ("Part of your
    // [title] direction...") — meaning a phase's own detail modal had NOTHING substantive to show
    // beyond its title. This field is the real substance a student actually reads once a phase
    // unlocks.
    overviewPhaseDescriptions: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: 'One real, substantive 2-4 sentence description per entry in overviewPhaseTitles, in the same order. Each description must EXPLICITLY connect back to the SAME core narrative thread (never read as a generic, disconnected checklist item) and should naturally weave together whichever of these are contextually relevant for that specific chapter: (a) how course rigor/subject choice should progress that year, reflecting what was ACTUALLY agreed in the strategy discussion below rather than invented fresh here (this feeds this app\'s own existing course-recommendation system via thematicKeywords below — do not invent specific course names, since you don\'t have this student\'s real catalog); (b) the student\'s extracurricular/leadership focus that period; (c) for exactly ONE phase across the whole overview, a real, specific, genuinely distinctive CAPSTONE project candidate (see capstoneIdea below — reference it briefly here too, in the one phase where the student would actually be working on it); (d) for a SUMMER phase specifically, real, concrete summer activities (a self-directed project, a relevant internship/research opportunity, structured practice) — never generic "relax and explore" filler; (e) where relevant, a brief note connecting to this app\'s own EXISTING testing timeline (PSAT sophomore/junior year, SAT/ACT prep and testing junior year, retakes senior fall — for a highschool student — or GRE/GMAT and a statement of purpose in the final year for an undergraduate/transfer student) — reference it, do not duplicate or re-schedule it, since those tasks already exist elsewhere on this student\'s plan; (f) where relevant (especially in the final 1-2 phases), a note connecting to building/sharpening the student\'s real college list and to the material their college essays will eventually draw on — framing essays as the EVENTUAL EXPRESSION of everything built in earlier phases, not a separate late-arriving task, and naming what kind of real, lived experience/material from THIS phase specifically will make that later essay genuine and specific. Required (non-null, same length as overviewPhaseTitles) when readyForOverview is true. Must be null otherwise.',
    },
    // A structured tag (not inferred from title text) so this app's own UI can reliably identify a
    // summer phase versus a school-year phase — the same "never guess from a title string, use a
    // real field" posture this codebase already holds for every other structured AI-proposed value.
    phaseDimensions: {
      type: ['array', 'null'],
      items: { type: 'string', enum: ['academic-year', 'summer'] },
      description: 'One tag per entry in overviewPhaseTitles, in the same order: "academic-year" for a real school-year chapter, "summer" for a real summer-break chapter. Required (non-null, same length as overviewPhaseTitles) when readyForOverview is true. Must be null otherwise.',
    },
    overviewPhaseDayOffsets: {
      type: ['array', 'null'],
      items: { type: 'integer' },
      description: 'One integer per entry in overviewPhaseTitles, in the same order: a realistic number of days from today that phase would likely BEGIN. The first should be 0 or close to it. Must be a strictly increasing sequence spanning the REAL number of remaining years (see profileSummary.basicProfile.planYearLabels) — each school-year phase roughly a real year (~300-365 days) after the previous school-year phase, with its own following summer phase landing roughly 300-320 days after that school year begins (i.e. genuinely inside that year\'s own real summer months, not spread evenly across the whole span). Required (matching the length of overviewPhaseTitles) when readyForOverview is true. Must be null otherwise.',
    },
    // Task 1's own explicit "identifying ONE real candidate for a capstone project" — a dedicated,
    // extractable field (not just buried in one phase's own prose) so this app's UI can display it
    // as its own real, distinguishable piece of content, per that task's explicit instruction.
    capstoneIdea: {
      type: ['string', 'null'],
      description: 'A real, specific, genuinely DISTINCTIVE capstone project candidate that reflects THIS student\'s own actual talents/interests in a way that stands out — the same bar as the narrative-pushback framing above (a real, well-reasoned, non-obvious connection, never a generic "do a project about your major" suggestion). 1-3 sentences: what it is, and briefly why it fits this specific student. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    // Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") — a real,
    // confirmed gap: before these 4 fields existed, course/testing/college-list/essay guidance
    // were ONLY soft, "where contextually relevant" bullet points buried inside
    // overviewPhaseDescriptions' own free-text field, with an explicit escape hatch ("not every
    // phase needs every dimension") and zero validation checking they ever actually appeared —
    // unlike capstoneIdea right above (its own dedicated, required field) or the phase COUNT
    // itself (a hard 4-9 bound tied to real planYearLabels). Given a vivid, heavily-reinforced
    // project/capstone narrative was ALSO being explicitly encouraged elsewhere in this same
    // prompt, real generated overviews (confirmed directly) sometimes let that dominate entirely,
    // reducing the whole overview to "the project's own build arc with summers inserted" — exactly
    // the reported symptom. Each of these 4 is now its OWN dedicated, HARD-REQUIRED field (the
    // SAME validation tier as narrativeTitle/narrativeSummary below — NOT the soft-degrade tier
    // overviewPhaseDescriptions/phaseDimensions/capstoneIdea use), so the whole ready state fails
    // validation outright if any of them comes back blank, exactly mirroring the enforcement that
    // already made capstoneIdea/summers reliable.
    // Extend the Conversation to Discuss Strategy (see CLAUDE.md) — before this feature, these 4
    // fields were independently INVENTED at overview-generation time, never actually run past the
    // student first, which broke this app's own "suggest, then confirm" principle (every other AI
    // feature in this app proposes something specific and waits for real agreement before treating
    // it as decided — Stage 2's own task-add flow, the chain-attachment suggestion's manual date
    // pick, Build Your Own's own review-before-commit). Each of these 4 now packages what was
    // ACTUALLY proposed and settled in the real "Strategy discussion" conversation phase below —
    // never independently invented — and, when a dimension genuinely wasn't discussed with real
    // specificity, honestly says so rather than quietly filling the gap with an unconfirmed guess.
    courseGuidanceNote: {
      type: ['string', 'null'],
      description: 'A real 2-4 sentence note summarizing what was ACTUALLY proposed and settled about course rigor/subject choices in the strategy discussion earlier in this conversation — including the student\'s own real final preference if they pushed back or offered an alternative (e.g. if you proposed an independent research course and they said they\'d rather do debate/forensics, this note must reflect debate/forensics, not your original proposal). Never independently invent fresh course guidance that was never actually discussed with the student. If course strategy genuinely wasn\'t discussed with real specificity in this conversation, say so plainly (e.g. "We haven\'t gotten into course specifics yet — worth a follow-up conversation or a chat with a counselor") rather than guessing. Regardless, never invent a specific course name or number (you don\'t have this student\'s real catalog) — describe subject areas/rigor level, not exact courses. This feeds this app\'s own existing course-recommendation system (via thematicKeywords below) but is ALSO shown to the student directly. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    testingTimelineNote: {
      type: ['string', 'null'],
      description: 'A real 1-3 sentence note connecting this app\'s own EXISTING testing timeline (PSAT sophomore/junior year, SAT/ACT prep and testing junior year, retakes senior fall — for a highschool student; the GRE/GMAT and a statement of purpose in the final year — for an undergraduate/transfer student) to whatever testing APPROACH was ACTUALLY discussed and settled with the student in the strategy discussion (e.g. how many attempts they\'re planning, test-optional considerations, timing preferences) — reflecting their own real stated preference if they pushed back on anything you proposed. Reference the existing tasks, don\'t recreate or re-schedule them, and don\'t invent a testing-approach preference the student never actually raised. If testing approach genuinely wasn\'t discussed with real specificity, say so plainly while still naming the existing tasks. If profileSummary.basicProfile.isInternationalStudent is true, naturally include the TOEFL/IELTS alongside the SAT/ACT (a real, separate task this app already generates for international students) — never mention it if the student is not international. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    collegeListNote: {
      type: ['string', 'null'],
      description: 'A real 2-3 sentence note summarizing what was ACTUALLY proposed and settled about college-list direction in the strategy discussion earlier in this conversation — naming real fit criteria tied to the SAME narrative thread that were genuinely discussed, reflecting the student\'s own real final preference if they pushed back or offered an alternative. Never independently invent fresh college-list guidance (fit criteria, program types) that was never actually discussed with the student — never a generic "apply broadly, some reach some safety" statement with no real connection to what was actually said. If college-list direction genuinely wasn\'t discussed with real specificity, say so plainly rather than guessing at criteria that were never actually raised. If profileSummary.basicProfile.isInternationalStudent is true and a genuinely relevant international-student consideration actually came up (e.g. international-student support/aid), it can be reflected here too — but never invent a specific unverified school name/claim, and never mention this at all if the student is not international. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    essayMaterialNote: {
      type: ['string', 'null'],
      description: 'A real 2-3 sentence note summarizing what was ACTUALLY proposed and settled about essay-material-building experiences in the strategy discussion earlier in this conversation — reflecting the student\'s own real final preference if they pushed back or offered an alternative. Never independently invent fresh essay-material guidance (a specific kind of experience/moment to pursue) that was never actually discussed with the student. Frame it as the EVENTUAL EXPRESSION of everything built across the whole overview, not a separate late-arriving task. If this genuinely wasn\'t discussed with real specificity, say so plainly rather than guessing at experiences that were never actually raised. Required (non-null) when readyForOverview is true. Must be null otherwise.',
    },
    thematicKeywords: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: '2 to 5 short, real academic SUBJECT-AREA labels reflecting the thematic direction (e.g. "Sociology", "Economics", "Statistics") — plain subject names only, NOT specific course titles or numbers (you do not have access to this student\'s real course catalog, so naming an exact course would risk fabricating one that does not exist). Required (non-null) when readyForOverview is true — an empty array is fine if nothing specific enough has emerged. Must be null otherwise.',
    },
    // Bug fix (see CLAUDE.md and this file's own VALID_INTEREST_TAGS comment above) — restores
    // state.interestTags, which nothing else in the new onboarding flow writes at all, breaking
    // Discovery/Opportunity Finder/Course Selection's own interest-based recommendations entirely.
    matchedInterestTags: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: `2 to 6 tags chosen EXACTLY from this fixed list, based on what the conversation actually revealed the student is genuinely interested in (never invent a tag not on this list, and never pick one the conversation doesn't actually support): ${VALID_INTEREST_TAGS.join(', ')}. Required (non-null, at least 2 real matches from this exact list) when readyForOverview is true — a real, substantive conversation should always support at least 2. Must be null otherwise.`,
    },
    mentionsSpecificFact: {
      type: 'boolean',
      description: 'True ONLY if your reply introduces a genuinely NEW, specific real organization, program, statistic, or outside-world fact that is NOT already confirmed by something the student themselves just told you in this conversation. False otherwise — referencing something the student already shared (even a specific real club/program/experience by name), or purely generic conversation with no new named claim, is NOT a new fact. Only set this true when you introduce a genuinely new, specific claim the student would need to independently verify.',
    },
    // Final Alignment-Check Conversation (see CLAUDE.md) — a genuinely SEPARATE milestone from
    // readyForOverview above: that field is about whether the NARRATIVE/STRATEGY conversation has
    // earned generating an overview at all; this one is about a LATER, automatically-triggered
    // check-in (see the "Final review" instructions below) that only happens once the student has
    // finished every other step in the app. Stays false for the entire rest of the conversation —
    // including the original narrative/strategy discussion and overview generation — until that
    // separate check-in has genuinely happened AND concluded.
    finalReviewComplete: {
      type: 'boolean',
      description: 'Stays false for the ENTIRE conversation — including the original interests/narrative/strategy discussion and overview generation above — until the SEPARATE, later "Final review" check-in (see instructions below) has genuinely happened and concluded. True only once that specific check-in is done: either everything lined up and was briefly confirmed, or any concerns raised were discussed to a real resolution.',
    },
  },
  required: [
    'reply', 'readyForTranscriptPause', 'readyForOverview', 'narrativeTitle', 'narrativeSummary',
    'overviewPhaseTitles', 'overviewPhaseDescriptions', 'phaseDimensions', 'overviewPhaseDayOffsets',
    'capstoneIdea', 'courseGuidanceNote', 'testingTimelineNote', 'collegeListNote',
    'essayMaterialNote', 'thematicKeywords', 'matchedInterestTags', 'mentionsSpecificFact',
    'finalReviewComplete',
  ],
  additionalProperties: false,
};
const TOOL_NAME = 'respond_in_conversation';
const TOOL_DESCRIPTION = "Respond with your next natural line in this ongoing first conversation with the student.";

// Final Alignment-Check Conversation (see CLAUDE.md) — the automatic "final review" turn (see
// GUIDED_SEQUENCE's own new 'finalReview' step, HubScreen.jsx) fires with no real student-typed
// text at all. This fixed, server-owned string is what stands in for "the student's message" sent
// to the provider in that one case — NEVER anything client-supplied, so nothing sent from the
// client could ever masquerade as this trigger. The real instructions for what to actually DO once
// this fires live in the "Final review" section of SYSTEM_PROMPT below, not in this string itself
// — this is just the provider-facing stand-in for a user turn, kept short and generic.
const FINAL_REVIEW_TRIGGER_MESSAGE = '(Automatic final review — the student has completed every other step in the app. Review their real, concrete choices in profileSummary against what was originally discussed in this conversation, per your own Final review instructions.)';

// Implement the Corrected Flow Order: Transcript & GPA Moves Into Session 1 (see CLAUDE.md) — the
// mirror-image of FINAL_REVIEW_TRIGGER_MESSAGE above, same reasoning: a fixed, server-owned string
// stands in for "the student's message" on the ONE automatic, no-typed-text turn that fires the
// moment the student has finished (or explicitly skipped) the real Transcript & GPA form the
// conversation just handed them off to — never anything client-supplied. The real instructions for
// what to actually DO once this fires live in the "Transcript & GPA pause" section of SYSTEM_PROMPT
// below, not in this string itself.
const TRANSCRIPT_RESUME_TRIGGER_MESSAGE = '(Automatic resume — the student has just finished, or explicitly skipped, entering their real transcript and GPA. Their real academic record (or an honestly empty one, for a genuine incoming student with nothing yet) is now available in profileSummary.academic for the first time. Briefly and naturally acknowledge it, then continue the conversation into their activities/experience, per your own Transcript & GPA pause instructions.)';

// Task 1 — the "why this conversation matters" framing, and Task 3 — what it actually needs to
// accomplish (replacing the old interest-tag question and prior-experience field entirely, via
// real dialogue rather than a disguised form). Task 4 — the genuine, deliberately-bounded
// "narrative pushback" capability, with its own two explicit guardrails written in verbatim (the
// Uyghur-soccer/Sociology framing is the reference case for what a REAL, well-reasoned connection
// looks like, not a literal example to reuse on every student). Task 5 — the same honesty rule
// every other AI feature in this app already holds, refined to the same "don't flag what the
// student already told you" wording the earlier disclaimer fix established.
//
// Extend the Conversation to Discuss Strategy (see CLAUDE.md) — real, confirmed gap this closes:
// Stage 3 (below) used to independently GENERATE course/testing/college-list/essay strategy the
// moment readyForOverview flipped true, in the SAME turn as the narrative, with zero real back-
// and-forth on the strategy itself — breaking this app's own "suggest, then confirm" principle
// every other AI surface already holds (Stage 2's task-add flow, the chain-attachment suggestion's
// manual date pick, Build Your Own's own review-before-commit). The new "Strategy discussion"
// section below extends the SAME conversation with a real, dimension-by-dimension propose-and-
// respond phase (course rigor, testing approach, college-list direction, essay material) that
// must genuinely happen — and be genuinely settled, with the student's own real response
// incorporated — before readyForOverview can become true; the 4 corresponding schema fields
// (courseGuidanceNote/testingTimelineNote/collegeListNote/essayMaterialNote) now package what was
// ACTUALLY agreed there, honestly flagging a dimension that wasn't discussed with real specificity
// rather than quietly inventing a guess for it. Narrative pushback itself (the section right
// above) is completely unchanged — this is a NEW phase that follows it, not a replacement.
//
// Factor International Student Status into the Strategy Conversation (see CLAUDE.md) — a real,
// KNOWN fact (`profileSummary.basicProfile.isInternationalStudent`, derived from the student's own
// real citizenship at sign-up — see profileCompiler.js) is now woven into the SAME strategy
// discussion as background context, never a separate topic to interrogate the student about
// (citizenship is a known fact, not a preference to negotiate — this app never asks about it a
// second time). When true, the model naturally mentions the TOEFL/IELTS alongside the SAT/ACT
// while discussing testing approach, and MAY note a genuinely relevant international-student
// consideration while discussing college-list direction (without inventing an unverified specific
// claim — the existing Honesty rule still governs this). When false (or citizenship was never
// provided), nothing international-specific gets mentioned at all. This does NOT touch the
// existing, completely separate rule-based TOEFL/F-1-visa task generation
// (`buildInternationalStudentItems`, roadmapGenerator.js) — that mechanism decides WHAT real tasks
// get generated, tied to citizenship + current school; this only makes the CONVERSATION aware of
// the same real fact, and even references those same real, already-generated tasks the same
// "acknowledge, don't duplicate" way the testing-timeline note already treats the SAT/ACT/PSAT.
const SYSTEM_PROMPT = `You are MyPath's own mascot/assistant, having a real, warm first conversation with a student inside their personalized academic/career planning app. This is an ongoing, multi-turn conversation — use the FULL conversation history for real context, not just the latest message in isolation.

Your purpose in this conversation:
- This REPLACES an old interest-tag checklist and a separate "list your prior experience" form — you are gathering both through genuine dialogue instead, so never ask a rigid, form-style list of questions. Ask about ONE thing at a time, follow up on what they actually say, and let the conversation go wherever it naturally goes.
- Find out what genuinely excites the student — hobbies, passions, things they think about outside of school — and what they've already actually done (activities, clubs, jobs, projects, volunteering, competitions). Real specifics matter far more than broad categories.
- Be genuinely curious and specific in your follow-ups, the way a good conversationalist (not a survey) would.

Transcript & GPA pause (a REQUIRED, ONE-TIME step, early in this conversation):
- This app has a real Transcript & GPA form already built — check profileSummary.basicProfile.educationLevel and currentSchool: it's real and reachable for a High School student, a Transfer student (any current school, or none), or a student at UC Davis specifically (any level). A plain Undergraduate NOT at UC Davis has no real transcript form in this app at all — for THAT student only, skip this whole step entirely (never set readyForTranscriptPause true) and just continue the conversation normally once you've covered interests.
- For every other student: once you've had a genuine initial exchange about what excites the student — even just one or two real exchanges about their interests/passions is enough, this does not need to be exhaustive — but BEFORE going deep into their prior activities/experience, set readyForTranscriptPause to true, exactly once. Your reply in that SAME turn should be a short, warm, natural transition line explaining that you're handing them over to enter their real transcript and GPA now, so the rest of this conversation can be grounded in their actual academic record instead of guesswork — not a cold, abrupt cutoff.
- After this happens, the conversation will automatically continue with a system-generated turn once the student has entered (or explicitly skipped, e.g. a genuine incoming student with nothing yet) their transcript. At that point, profileSummary.academic will show their real GPA/transcript for the very first time — briefly and naturally acknowledge whatever it actually shows (a real GPA and real courses, or an honestly empty transcript) before continuing into their activities/experience, narrative pushback, and the strategy discussion below — all of which should now genuinely be informed by this real academic data, not generic.
- Never set readyForTranscriptPause true a second time in this same conversation — once profileSummary.academic already shows real data (or is honestly empty because the student explicitly skipped), this step is permanently done; do not revisit it.

Narrative pushback (use this rarely, and only when it's real):
- As the conversation continues, listen for anything specific, unusual, or genuinely non-obvious the student shares. If — and only if — a real, well-reasoned connection exists between something specific they've told you and an academic field, major, or direction they haven't mentioned, you may offer it as a genuine suggestion: explain your specific reasoning clearly, and ask if they'd be interested in exploring it, the way a thoughtful consultant would.
- The student always has the final say. Frame this ONLY as a suggestion and a question — never state or assume they should change direction, and never treat a suggestion as already accepted. If they're not interested, respect that immediately and move on.
- Do NOT manufacture this moment. If nothing specific enough has actually surfaced in the conversation to justify a genuine, well-reasoned redirect, do not force one just to seem insightful — a generic-sounding "have you considered X" with no real grounding in what they've actually told you is worse than not suggesting anything at all.

Strategy discussion (once — and only once — the narrative direction above has genuinely settled, and BEFORE generating any overview):
- This app's own "suggest, then confirm" principle applies here too: never independently decide a student's course rigor, testing approach, college-list direction, or essay-material strategy on their behalf. Once the narrative direction is genuinely settled (interests/experience established, and — if you ever offered a narrative-pushback suggestion — whether they accepted it), continue this SAME conversation into a real strategy discussion, one dimension at a time, across exactly these four: (1) course rigor/subject choice, (2) testing approach, (3) college-list direction, and (4) what kind of real experiences might make good essay material later.
- For EACH dimension, propose something SPECIFIC and concrete, tied to their actual narrative — never a vague, generic suggestion. For example: "I think taking AP Government and getting involved in an independent research course would really strengthen this direction — what do you think?" Then genuinely wait for and incorporate their real response: they might agree, push back and share their own preference (e.g. "I'd rather do debate/forensics instead of an independent research course"), or ask for your honest read before deciding. Whatever they actually say is the real, settled decision for that dimension from that point on — never silently keep your own original proposal once they've expressed a genuine preference of their own.
- This is real back-and-forth, not a single proposal accepted by default. Ask about only ONE dimension at a time (the same "one thing at a time" rule this whole conversation already follows) — don't stack all four into one message, and don't move to the next dimension until the current one has reached a real, mutually-settled decision (their agreement, their own alternative, or an explicit "you decide" from them).
- Make a genuine, real effort at each of the four dimensions — but don't force it if the conversation naturally moves on before one is fully settled. If a dimension is never actually discussed with real specificity, that's fine; just say so plainly in that dimension's own overview field later (see below) instead of inventing a decision that was never actually made.
- International status is REAL, KNOWN CONTEXT you should factor in naturally — never a topic to ask about or negotiate. Check profileSummary.basicProfile.isInternationalStudent (derived from the student's real citizenship, already answered at sign-up). If it's true: when discussing testing approach, naturally mention the TOEFL or IELTS alongside the SAT/ACT, since that's a genuine real requirement for most international applicants to US schools — treat it as one more real fact you're aware of, folded into that same proposal, not a separate question. When discussing college-list direction, you MAY note genuinely relevant international-student considerations where they naturally fit (e.g. schools known for strong international-student support or financial aid) — but never invent a specific unverified claim (a specific school name/statistic you aren't genuinely certain of); the Honesty rule below still applies here. If isInternationalStudent is false, or citizenship was never provided, do NOT mention TOEFL/IELTS, visas, or any other international-specific consideration at all — there is nothing here to bring up. Never ask the student about their citizenship directly or treat it as its own dimension to discuss — it's already a known fact, not a preference.

Generating the overview (Stage 3 — do this only once, and only once the conversation has genuinely earned it):
- Once you and the student have covered real interests, at least one real piece of prior experience, (if you ever offered a narrative pushback suggestion above) whether they actually agreed to it, AND a genuine strategy discussion across course rigor, testing approach, college-list direction, and essay material (see "Strategy discussion" above — this is a real precondition, not optional), set readyForOverview to true and fill in ALL of: narrativeTitle, narrativeSummary, overviewPhaseTitles, overviewPhaseDescriptions, phaseDimensions, overviewPhaseDayOffsets, capstoneIdea, courseGuidanceNote, testingTimelineNote, collegeListNote, essayMaterialNote, thematicKeywords, and matchedInterestTags, in that SAME response.
- matchedInterestTags: pick 2-6 tags EXACTLY from the fixed list given in that field's own schema description, based on what the student genuinely revealed in this conversation — never invent a tag not on that list, and never force a match the conversation doesn't actually support.
- Use profileSummary.basicProfile.planYearLabels for the REAL, exact remaining school years (e.g. ["Sophomore Year", "Junior Year", "Senior Year"]) — never guess or invent a different number of years than what's actually there.
- overviewPhaseTitles/overviewPhaseDescriptions/phaseDimensions/overviewPhaseDayOffsets together are a real MULTI-YEAR STRATEGIC PLAN across every real dimension a genuine college consultant would map out — not just project ideas. One "academic-year" phase per entry in planYearLabels, PLUS one "summer" phase for each real summer BETWEEN two consecutive years in that list (not after the final year). The single most important rule: every phase across every dimension must explicitly reinforce the SAME core narrative thread — never generate these as separate, disconnected checklist categories. A phase's own title and description should read as one continuous, connected story, not a template filled in per-category.
- A genuine multi-year strategic overview covers SIX real dimensions, and ALL SIX ARE MANDATORY, NOT OPTIONAL — a strong project/capstone story alone is NOT a complete overview, even if it's compelling. Do not let a vivid project arc crowd out the other five:
  1. **The project/capstone arc** — extracurriculars and leadership tied to the theme, culminating in exactly ONE real, specific, genuinely DISTINCTIVE capstone project candidate (capstoneIdea) — the SAME bar as narrative pushback above (a real, well-reasoned, non-obvious connection to this student's own actual talents, never a generic "do a project about your major" idea, and never an assignment any student in that field could equally do).
  2. **Course rigor progression (courseGuidanceNote, its own REQUIRED field)** — this must reflect what was ACTUALLY proposed and settled in the strategy discussion above, including the student's real final preference if they pushed back or shared their own alternative — do NOT independently invent fresh course-rigor guidance that was never actually discussed with them. If course strategy genuinely wasn't discussed with real specificity in this conversation, say so plainly (e.g. "We haven't gotten into course specifics yet — worth a follow-up conversation or a chat with a counselor") rather than guessing. Never invent a specific course name or number regardless (you don't have this student's real catalog) — describe subject areas and rigor level instead. This also feeds this app's own EXISTING course-recommendation system through thematicKeywords.
  3. **Summer plans (their OWN separate "summer" phases)** — real, concrete, narrative-tied activities (a self-directed project, research, a relevant internship) — never generic "relax and explore" filler, and never folded into a school-year phase.
  4. **College list evolution (collegeListNote, its own REQUIRED field)** — this must reflect what was ACTUALLY proposed and settled in the strategy discussion above, including the student's real final preference if they pushed back or shared their own alternative — do NOT independently invent fresh college-list guidance that was never actually discussed with them. If college-list direction genuinely wasn't discussed with real specificity, say so plainly rather than guessing at fit criteria that were never actually raised. If profileSummary.basicProfile.isInternationalStudent is true and a genuinely relevant international-student consideration actually came up in the strategy discussion, carry it through here too — never add one fresh at this stage that was never actually discussed.
  5. **Essay/narrative-building material (essayMaterialNote, its own REQUIRED field)** — this must reflect what was ACTUALLY proposed and settled in the strategy discussion above, including the student's real final preference if they pushed back or shared their own alternative — do NOT independently invent fresh essay-material guidance that was never actually discussed with them. Frame it as the EVENTUAL EXPRESSION of everything built across the whole overview. If this genuinely wasn't discussed with real specificity, say so plainly rather than guessing at experiences that were never actually raised.
  6. **Testing timeline (testingTimelineNote, its own REQUIRED field)** — this app ALREADY has real testing tasks on the plan (for a highschool student: PSAT practice sophomore year, the real PSAT junior year, SAT/ACT prep beginning junior year, the test itself around spring junior year, retake windows senior fall; for an undergraduate/transfer student: the GRE/GMAT if relevant, a statement of purpose, in the final year). This must reflect what was ACTUALLY discussed in the strategy conversation about testing approach (e.g. how many attempts they're planning, test-optional considerations, timing preferences) alongside referencing these existing tasks — do NOT create new testing tasks or re-schedule them, and do not invent a testing-approach preference that was never actually raised; if testing approach genuinely wasn't discussed, say so plainly while still naming the existing tasks. If profileSummary.basicProfile.isInternationalStudent is true, this note should also naturally mention the TOEFL/IELTS alongside the SAT/ACT (this app already generates a real, separate TOEFL/IELTS task for international students — see the rule-based plan itself — so reference it the same "acknowledge, don't duplicate" way as every other existing task here); never mention it if the student is not international.
- Dimensions 2, 4, 5, and 6 above EACH have their own dedicated, required schema field specifically because burying them only inside phase descriptions is not reliable enough — fill in courseGuidanceNote/collegeListNote/essayMaterialNote/testingTimelineNote as real, substantive, narrative-connected content every single time you generate an overview, reflecting what was ACTUALLY discussed and agreed in the strategy conversation above (honestly flagging any dimension that genuinely wasn't, never inventing fresh guidance the student never heard), in addition to (not instead of) weaving relevant details into individual phase descriptions where it fits naturally.
- narrativeSummary must accurately reflect the REAL settled direction, including explicitly naming any narrative-pushback suggestion the student actually agreed to (or noting they stuck with their own original direction if they declined one).
- Don't rush this — a conversation that's only covered one or two surface-level answers is not ready. But once it genuinely has, generate a real, specific overview rather than continuing to ask more questions than necessary.
- Even after readyForOverview is true, keep talking naturally if the student wants to discuss further — you can set these fields again on a later turn if the direction changes.

Final review (a SEPARATE, LATER moment — this fires automatically, on its own, once the student has finished every OTHER real step in the app, not something you decide to start yourself):
- By the time this happens, the student has already selected real careers/majors/programs, logged a real transcript and GPA, picked real courses, selected real opportunities (some possibly completed), and possibly started a project — all of this is now available to you in profileSummary, reflecting what they ACTUALLY did, not just what was discussed in the abstract earlier in this conversation. This is the first point where you have full visibility into their real, concrete choices.
- Compare these real choices against what was originally discussed and settled earlier in THIS SAME conversation (the narrative direction and the strategy discussion above). If everything genuinely lines up — the selected careers/majors/programs fit the discussed direction, the real GPA doesn't change what's realistic, the selected opportunities/courses/project make sense — briefly and warmly confirm this and let the student know their plan reflects everything you discussed together. Keep it short; this doesn't need to be a long message if there's nothing to raise.
- If something genuinely seems worth reconsidering — a selected program that doesn't quite fit the discussed direction, a real GPA that changes what's realistic, a chosen major/career that drifted from the narrative — raise it as a specific, genuine observation and discuss it with the student. Use the EXACT same principle as narrative pushback and the strategy discussion above: this is a suggestion and a question, never a stated correction or an assumed override. The student always has the final say — if they explain their choice or say they're happy with it, respect that and move on.
- Do NOT manufacture a concern here just to seem thorough — if everything genuinely lines up, say so plainly and don't invent a reason to raise something.
- If this discussion leads to a genuine change in direction, you may set readyForOverview to true again with a revised overview (the same fields, same rules, as "Generating the overview" above) — reflecting the real, updated direction the student actually confirmed.
- Set finalReviewComplete to true only once this SPECIFIC check-in has genuinely concluded — either you confirmed everything lines up with nothing to discuss, or any concern you raised has been discussed to a real resolution (the student responded, and the direction is settled either way, updated or not). Keep finalReviewComplete false while you're still waiting on the student's response to something you just raised — it isn't concluded until they've actually replied.

Honesty rule:
- Never present a specific real organization, program, statistic, or fact about the outside world as confirmed/verified unless you are genuinely certain — if unsure, say so plainly.
- Set mentionsSpecificFact to true ONLY when you introduce a genuinely NEW specific claim not already confirmed by something the student themselves just told you in this conversation — referencing something they already shared (even a real club/program/experience by name) is NOT a new claim and should be set false.

Call the respond_in_conversation tool exactly once with your response, and nothing else.`;

// Client-controlled input, sanitized defensively (this is a real system boundary, unlike internal
// app code) — keeps only well-formed {role, content} turns, dropping anything malformed rather
// than letting it reach either provider's own stricter message-shape requirements.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim())
    .map((h) => ({ role: h.role, content: h.content }));
}

// Structural validation only, shared by both providers — the one place the two implementations
// converge back onto a single code path, matching every prior stage's own precedent.
//
// AI-First Onboarding, Stage 3 (see CLAUDE.md) — `reply`/`readyForOverview`/`mentionsSpecificFact`
// are always required to be well-typed (a genuine structural failure there still fails the whole
// request, unchanged from before this stage). The "ready" payload (narrativeTitle/narrativeSummary/
// overviewPhaseTitles/overviewPhaseDayOffsets/thematicKeywords) is validated only when
// readyForOverview is true — but if THAT specific payload doesn't hold together (missing a field,
// or the phase count isn't genuinely 3-5 after cleaning), this coerces readyForOverview back to
// false and keeps the otherwise-valid `reply` rather than failing the whole request — the same
// "never let a malformed bonus field block the ordinary conversation" resilience principle
// api/build-your-own-chat.js's own `milestoneDayOffsets` sanitization already established (there,
// a malformed array degrades to `null` rather than a hard reject; here, a malformed overview
// degrades the WHOLE bundle to "not ready yet" rather than showing the student an error over a
// field they never see directly).
// Bug fix (see CLAUDE.md, "stuck loop" bug) — a real, confirmed root cause found via a temporary
// raw-proposal diagnostic, not guessed at: the model was CORRECTLY generating a well-formed,
// genuinely ready overview on every turn from the moment the conversation earned it, but this
// function's own OLD fixed `cleanPhases.length < 4` check silently rejected it every single time,
// because a student with only 2 real remaining years (e.g. an 11th-grader — planYearLabels =
// ['Junior Year', 'Senior Year']) can only ever produce 3 real phases (2 school-year phases + the
// ONE real summer between them), which is mathematically below that hard-coded floor of 4 — a
// requirement no response for that student could ever satisfy, producing an infinite "silently
// coerced back to not-ready" loop with no way out. Every earlier live test (a 9th-grader with 4
// remaining years -> 7 phases; a 10th-grader with 3 -> 5 phases) happened to clear the old [4,9]
// range by coincidence, since neither had few enough years left to expose this. The real, exact
// expected count is `2N - 1` (N = the real number of entries in planYearLabels — see
// overviewPhaseTitles' own schema description for why: one school-year phase per remaining year,
// plus one summer phase for each real summer BETWEEN two consecutive years, never after the
// final one) — computed here from `profileSummary`, not the model's own say-so, and validated as
// an EXACT match rather than a loose range, so a wrong count for THIS student's real year-span is
// caught precisely instead of merely falling inside a generic band. Falls back to the old,
// looser [1, 9] range only if `profileSummary` genuinely doesn't carry a usable
// `planYearLabels` (defensive only — this conversation only happens post-survey, when that field
// is always a real, non-empty array; the fallback is never expected to trigger in practice, but a
// real fallback is safer than assuming the shape can never be missing).
function expectedPhaseCount(profileSummary) {
  const n = profileSummary?.basicProfile?.planYearLabels?.length;
  return Number.isInteger(n) && n > 0 ? 2 * n - 1 : null;
}

function validateProposal(input, profileSummary) {
  if (!input || typeof input !== 'object') return null;
  const {
    reply, readyForTranscriptPause, readyForOverview, narrativeTitle, narrativeSummary,
    overviewPhaseTitles, overviewPhaseDescriptions, phaseDimensions, overviewPhaseDayOffsets,
    capstoneIdea, courseGuidanceNote, testingTimelineNote, collegeListNote, essayMaterialNote,
    thematicKeywords, matchedInterestTags, mentionsSpecificFact, finalReviewComplete,
  } = input;
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 4000) return null;
  // Implement the Corrected Flow Order (see CLAUDE.md) — hard-rejected at the same tier as
  // mentionsSpecificFact/finalReviewComplete below, and always carried through unchanged (never
  // nulled) — a genuinely independent, earlier milestone from readyForOverview's own bundle.
  if (typeof readyForTranscriptPause !== 'boolean') return null;
  if (typeof readyForOverview !== 'boolean') return null;
  if (typeof mentionsSpecificFact !== 'boolean') return null;
  // Final Alignment-Check Conversation (see CLAUDE.md) — hard-rejected at the same tier as
  // mentionsSpecificFact, and always carried through unchanged below (never nulled) — its truth
  // doesn't depend on readyForOverview at all; these are two genuinely independent milestones.
  if (typeof finalReviewComplete !== 'boolean') return null;

  const notReady = {
    reply: reply.trim(),
    readyForTranscriptPause,
    readyForOverview: false,
    narrativeTitle: null,
    narrativeSummary: null,
    overviewPhaseTitles: null,
    overviewPhaseDescriptions: null,
    phaseDimensions: null,
    overviewPhaseDayOffsets: null,
    capstoneIdea: null,
    courseGuidanceNote: null,
    testingTimelineNote: null,
    collegeListNote: null,
    essayMaterialNote: null,
    thematicKeywords: null,
    matchedInterestTags: null,
    mentionsSpecificFact,
    finalReviewComplete,
  };
  if (!readyForOverview) return notReady;

  if (typeof narrativeTitle !== 'string' || !narrativeTitle.trim() || narrativeTitle.length > 150) return notReady;
  if (typeof narrativeSummary !== 'string' || !narrativeSummary.trim() || narrativeSummary.length > 2000) return notReady;
  // Bug fix (see CLAUDE.md, "Fix: Overview Only Generating Summers + Project Arc") — these 4 are
  // now HARD-REQUIRED, the SAME validation tier as narrativeTitle/narrativeSummary right above
  // (deliberately NOT the soft-degrade-to-null tier overviewPhaseDescriptions/phaseDimensions/
  // capstoneIdea use below) — a real overview genuinely isn't ready if any of these 4 dimensions
  // came back blank, since the whole point of promoting them to dedicated fields was to guarantee
  // they can never be silently skipped the way they previously were as soft prose mentions.
  if (typeof courseGuidanceNote !== 'string' || !courseGuidanceNote.trim() || courseGuidanceNote.length > 800) return notReady;
  if (typeof testingTimelineNote !== 'string' || !testingTimelineNote.trim() || testingTimelineNote.length > 800) return notReady;
  if (typeof collegeListNote !== 'string' || !collegeListNote.trim() || collegeListNote.length > 800) return notReady;
  if (typeof essayMaterialNote !== 'string' || !essayMaterialNote.trim() || essayMaterialNote.length > 800) return notReady;
  if (!Array.isArray(overviewPhaseTitles)) return notReady;
  const cleanPhases = overviewPhaseTitles.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  // Expand the Multi-Year Overview (see CLAUDE.md) — widened from the old 3-5 bound now that a
  // real multi-year plan needs one "academic-year" phase per remaining school year PLUS one
  // "summer" phase for each real summer between them. Bug fix (see this file's own
  // `expectedPhaseCount` comment above) — now validated as the EXACT real count for THIS
  // student's remaining years whenever that's computable, not a generic [4,9] band that a
  // student with few remaining years can never satisfy; the old range is kept only as a genuinely
  // defensive fallback for the (in practice unreachable) case profileSummary lacks planYearLabels.
  const exactCount = expectedPhaseCount(profileSummary);
  if (exactCount !== null) {
    if (cleanPhases.length !== exactCount) return notReady;
  } else if (cleanPhases.length < 1 || cleanPhases.length > 9) {
    return notReady;
  }
  const cleanDayOffsets = Array.isArray(overviewPhaseDayOffsets)
    && overviewPhaseDayOffsets.length === cleanPhases.length
    && overviewPhaseDayOffsets.every((n) => Number.isFinite(n))
    ? overviewPhaseDayOffsets.map((n) => Math.round(n))
    : null;
  // Both degrade to `null` on any mismatch (missing, wrong length, wrong type) rather than
  // failing the whole ready state, the same "never let a malformed bonus field block the ordinary
  // conversation" resilience principle overviewPhaseDayOffsets itself already established — the
  // client (OnboardingConversationScreen.jsx's confirmNarrative) falls back to a generic
  // description / no dimension tag for that one generation rather than losing the overview
  // entirely. In practice, a forced tool call with an exact parallel-array schema reliably
  // produces matching lengths, so this is a safety net, not the expected path.
  const cleanDescriptions = Array.isArray(overviewPhaseDescriptions)
    && overviewPhaseDescriptions.length === cleanPhases.length
    && overviewPhaseDescriptions.every((d) => typeof d === 'string' && d.trim())
    ? overviewPhaseDescriptions.map((d) => d.trim())
    : null;
  const cleanDimensions = Array.isArray(phaseDimensions)
    && phaseDimensions.length === cleanPhases.length
    && phaseDimensions.every((d) => d === 'academic-year' || d === 'summer')
    ? phaseDimensions
    : null;
  const cleanCapstone = typeof capstoneIdea === 'string' && capstoneIdea.trim() && capstoneIdea.length <= 1000
    ? capstoneIdea.trim()
    : null;
  const cleanThemes = Array.isArray(thematicKeywords)
    ? thematicKeywords.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()).slice(0, 5)
    : [];
  // Bug fix (see this file's own VALID_INTEREST_TAGS comment above) — never trust the model's own
  // tag choices directly; silently drop anything that isn't a REAL, exact member of the known
  // vocabulary (a hallucinated/mismatched tag would otherwise never resolve to any real track via
  // getBuiltTracks/getOpportunityTracks anyway, so dropping it here is strictly more honest than
  // passing it through). Deduplicated and capped at 6, mirroring thematicKeywords' own cap shape.
  const cleanInterestTags = Array.isArray(matchedInterestTags)
    ? [...new Set(matchedInterestTags.filter((t) => typeof t === 'string' && VALID_INTEREST_TAGS.includes(t)))].slice(0, 6)
    : [];

  return {
    reply: reply.trim(),
    readyForTranscriptPause,
    readyForOverview: true,
    narrativeTitle: narrativeTitle.trim(),
    narrativeSummary: narrativeSummary.trim(),
    overviewPhaseTitles: cleanPhases,
    overviewPhaseDescriptions: cleanDescriptions,
    phaseDimensions: cleanDimensions,
    overviewPhaseDayOffsets: cleanDayOffsets,
    capstoneIdea: cleanCapstone,
    courseGuidanceNote: courseGuidanceNote.trim(),
    testingTimelineNote: testingTimelineNote.trim(),
    collegeListNote: collegeListNote.trim(),
    essayMaterialNote: essayMaterialNote.trim(),
    thematicKeywords: cleanThemes,
    matchedInterestTags: cleanInterestTags,
    mentionsSpecificFact,
    finalReviewComplete,
  };
}

// The one code-enforced guardrail — never trusted to the model's own prose alone.
function applyGuardrails(proposal) {
  if (!proposal.mentionsSpecificFact) return proposal;
  return {
    ...proposal,
    reply: `${proposal.reply} (If I named anything specific there, please double-check it yourself — I can't independently verify external facts.)`,
  };
}

async function callAnthropic(apiKey, history, prompt, profileSummary) {
  const messages = [
    ...sanitizeHistory(history),
    { role: 'user', content: JSON.stringify({ profileSummary, message: prompt }) },
  ];
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      // Raised again, from 4500 to 5500, now that 4 more real, hard-required fields
      // (courseGuidanceNote/testingTimelineNote/collegeListNote/essayMaterialNote — see "Fix:
      // Overview Only Generating Summers + Project Arc," CLAUDE.md) add genuinely more mandatory
      // content on top of up to 9 phases each with a real description plus a capstone idea.
      // Matching api/build-your-own-chat.js's own repeated bug-fix precedent: a truncated response
      // here is strictly worse than a generously-budgeted one.
      max_tokens: 5500,
      // Between api/chat.js's grounded 0.6 and Build Your Own's creative 0.9 — this needs to read
      // as a real, warm conversation AND occasionally make a genuinely creative connection (Task
      // 4's own narrative pushback), so it leans a bit warmer/more creative than the plain
      // general-assistant chat.
      temperature: 0.75,
      system: SYSTEM_PROMPT,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: ONBOARDING_SCHEMA }],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages,
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text().catch(() => '');
    return { error: { status: 502, body: { error: 'Anthropic request failed', status: anthropicRes.status, detail } } };
  }

  const data = await anthropicRes.json();
  const toolUse = (data.content || []).find((block) => block.type === 'tool_use' && block.name === TOOL_NAME);
  return { proposal: toolUse?.input, stopReason: data.stop_reason };
}

// Same OpenAI Responses API shape every prior stage already established (flat, non-nested tool
// entries; `output` array parsing; `reasoning.effort` instead of `temperature`, since GPT-5.6
// Terra is a reasoning model and rejects `temperature` outright). `reasoning.effort` is 'medium'
// (not api/chat.js's 'low') — matching Build Your Own's own precedent for a conversation that
// genuinely benefits from real reasoning (spotting a non-obvious narrative connection), not just a
// simple bounded classification.
async function callOpenAI(apiKey, history, prompt, profileSummary) {
  const input = [
    ...sanitizeHistory(history),
    { role: 'user', content: JSON.stringify({ profileSummary, message: prompt }) },
  ];
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input,
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: ONBOARDING_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      // Same 5500 bump as the Anthropic call above, same reasoning — 4 more mandatory fields need
      // real headroom past the original phase-titles-only shape.
      max_output_tokens: 5500,
      reasoning: { effort: 'medium' },
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => '');
    return { error: { status: 502, body: { error: 'OpenAI request failed', status: openaiRes.status, detail } } };
  }

  const data = await openaiRes.json();
  const call = (data.output || []).find((item) => item.type === 'function_call' && item.name === TOOL_NAME);
  if (!call) return { proposal: null, stopReason: data.status || data.incomplete_details?.reason };
  let args = null;
  try { args = JSON.parse(call.arguments); } catch { args = null; }
  return { proposal: args, stopReason: data.status || data.incomplete_details?.reason };
}

// Same env var as every prior stage — whichever provider is active answers this conversation too,
// with zero separate configuration.
const PROVIDERS = {
  anthropic: { envKey: 'ANTHROPIC_API_KEY', call: callAnthropic },
  openai: { envKey: 'OPENAI_API_KEY', call: callOpenAI },
};

export default async function handler(req, res) {
  const allowedOrigin = resolveAllowedOrigin(req.headers.origin);
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Pre-Public-Sharing Confidentiality Check (see CLAUDE.md), Task 5 — this is the app's first,
  // primary onboarding conversation (potentially the longest real one a student has), so a
  // generous but real per-IP window (see _rateLimit.js's own header for what this does and
  // doesn't protect against).
  const rl = checkRateLimit(req, { windowMs: 5 * 60 * 1000, maxRequests: 30 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests — please wait a bit and try again.' });
    return;
  }

  const providerName = (process.env.AI_SUGGESTION_PROVIDER || 'anthropic').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    res.status(500).json({ error: `Unknown AI_SUGGESTION_PROVIDER: "${providerName}"` });
    return;
  }

  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    res.status(500).json({ error: 'Onboarding chat is not configured' });
    return;
  }

  // Final Alignment-Check Conversation (see CLAUDE.md) — `finalReview: true` marks the one
  // automatic, no-typed-text turn: `prompt` becomes optional in that case, since there's no real
  // student message to require. Every other request (the entire ordinary conversation lifecycle)
  // is completely unaffected — `finalReview` is simply absent/false, and `prompt` is required
  // exactly as before.
  //
  // Implement the Corrected Flow Order (see CLAUDE.md) — `resumeAfterTranscript: true` is the
  // mirror-image second automatic, no-typed-text turn: fires once the student has finished (or
  // explicitly skipped) the real Transcript & GPA form the conversation just handed them off to.
  const { history, prompt, profileSummary, finalReview, resumeAfterTranscript } = req.body || {};
  if ((!finalReview && !resumeAfterTranscript && (!prompt || typeof prompt !== 'string')) || !profileSummary || !Array.isArray(history)) {
    res.status(400).json({ error: 'Missing prompt/profileSummary/history' });
    return;
  }
  const effectivePrompt = finalReview === true
    ? FINAL_REVIEW_TRIGGER_MESSAGE
    : resumeAfterTranscript === true
      ? TRANSCRIPT_RESUME_TRIGGER_MESSAGE
      : prompt;

  try {
    const result = await provider.call(apiKey, history, effectivePrompt, profileSummary);
    if (result.error) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    // Bug fix (see this file's own `expectedPhaseCount` comment above) — profileSummary is now
    // threaded through so the real per-student expected phase count can be validated exactly.
    const proposal = validateProposal(result.proposal, profileSummary);
    if (!proposal) {
      // `stopReason` (see the two `call*` functions above) is worth keeping in the error body — a
      // genuinely truncated response (a real 'max_tokens'/'length' stop reason) is a more useful
      // debugging signal than a bare "invalid," matching api/build-your-own-chat.js's own
      // precedent — and carries no sensitive information either way.
      res.status(502).json({ error: 'Model did not return a valid response', stopReason: result.stopReason ?? null });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Onboarding chat proxy error', detail: String(err) });
  }
}
