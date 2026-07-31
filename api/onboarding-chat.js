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
    readyForOverview: {
      type: 'boolean',
      description: 'True ONLY once the conversation has genuinely surfaced enough to generate a real, specific multi-year overview: real interests, at least one real piece of prior experience, and — if you ever suggested reconsidering their direction — whether the student actually agreed to it or not. False for anything less developed than that.',
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
      description: 'An ORDERED list of 4 to 9 short, specific overview-level phase titles covering the major chapters of this student\'s ENTIRE remaining plan — both real school-YEAR chapters (e.g. "Sophomore Year: Deepen your foundation in social research methods") AND, as their own SEPARATE entries, the real SUMMER breaks between them (e.g. "Summer Before Junior Year: A self-directed documentary project on..."). One entry per remaining school year (see profileSummary.basicProfile.planYearLabels for the REAL, exact count and names — never invent a different number of years) PLUS one entry per summer between two consecutive school years in that list (not after the FINAL year, which ends in graduation/application, not a school-year-shaped summer). These are broad CHAPTERS, not granular steps — do not break any phase down into its own sub-actions here (that level of detail is deliberately deferred to a later, separate, narrower conversation once the student actually reaches that phase). Required (non-null, 4-9 items, matching the real year/summer structure above) when readyForOverview is true. Must be null otherwise.',
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
      description: 'One real, substantive 2-4 sentence description per entry in overviewPhaseTitles, in the same order. Each description must EXPLICITLY connect back to the SAME core narrative thread (never read as a generic, disconnected checklist item) and should naturally weave together whichever of these are contextually relevant for that specific chapter: (a) how course rigor/subject choice should progress that year, reinforcing the narrative (this feeds this app\'s own existing course-recommendation system via thematicKeywords below — do not invent specific course names, since you don\'t have this student\'s real catalog); (b) the student\'s extracurricular/leadership focus that period; (c) for exactly ONE phase across the whole overview, a real, specific, genuinely distinctive CAPSTONE project candidate (see capstoneIdea below — reference it briefly here too, in the one phase where the student would actually be working on it); (d) for a SUMMER phase specifically, real, concrete summer activities (a self-directed project, a relevant internship/research opportunity, structured practice) — never generic "relax and explore" filler; (e) where relevant, a brief note connecting to this app\'s own EXISTING testing timeline (PSAT sophomore/junior year, SAT/ACT prep and testing junior year, retakes senior fall — for a highschool student — or GRE/GMAT and a statement of purpose in the final year for an undergraduate/transfer student) — reference it, do not duplicate or re-schedule it, since those tasks already exist elsewhere on this student\'s plan; (f) where relevant (especially in the final 1-2 phases), a note connecting to building/sharpening the student\'s real college list and to the material their college essays will eventually draw on — framing essays as the EVENTUAL EXPRESSION of everything built in earlier phases, not a separate late-arriving task, and naming what kind of real, lived experience/material from THIS phase specifically will make that later essay genuine and specific. Required (non-null, same length as overviewPhaseTitles) when readyForOverview is true. Must be null otherwise.',
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
  },
  required: [
    'reply', 'readyForOverview', 'narrativeTitle', 'narrativeSummary',
    'overviewPhaseTitles', 'overviewPhaseDescriptions', 'phaseDimensions', 'overviewPhaseDayOffsets',
    'capstoneIdea', 'thematicKeywords', 'matchedInterestTags', 'mentionsSpecificFact',
  ],
  additionalProperties: false,
};
const TOOL_NAME = 'respond_in_conversation';
const TOOL_DESCRIPTION = "Respond with your next natural line in this ongoing first conversation with the student.";

// Task 1 — the "why this conversation matters" framing, and Task 3 — what it actually needs to
// accomplish (replacing the old interest-tag question and prior-experience field entirely, via
// real dialogue rather than a disguised form). Task 4 — the genuine, deliberately-bounded
// "narrative pushback" capability, with its own two explicit guardrails written in verbatim (the
// Uyghur-soccer/Sociology framing is the reference case for what a REAL, well-reasoned connection
// looks like, not a literal example to reuse on every student). Task 5 — the same honesty rule
// every other AI feature in this app already holds, refined to the same "don't flag what the
// student already told you" wording the earlier disclaimer fix established.
const SYSTEM_PROMPT = `You are MyPath's own mascot/assistant, having a real, warm first conversation with a student inside their personalized academic/career planning app. This is an ongoing, multi-turn conversation — use the FULL conversation history for real context, not just the latest message in isolation.

Your purpose in this conversation:
- This REPLACES an old interest-tag checklist and a separate "list your prior experience" form — you are gathering both through genuine dialogue instead, so never ask a rigid, form-style list of questions. Ask about ONE thing at a time, follow up on what they actually say, and let the conversation go wherever it naturally goes.
- Find out what genuinely excites the student — hobbies, passions, things they think about outside of school — and what they've already actually done (activities, clubs, jobs, projects, volunteering, competitions). Real specifics matter far more than broad categories.
- Be genuinely curious and specific in your follow-ups, the way a good conversationalist (not a survey) would.

Narrative pushback (use this rarely, and only when it's real):
- As the conversation continues, listen for anything specific, unusual, or genuinely non-obvious the student shares. If — and only if — a real, well-reasoned connection exists between something specific they've told you and an academic field, major, or direction they haven't mentioned, you may offer it as a genuine suggestion: explain your specific reasoning clearly, and ask if they'd be interested in exploring it, the way a thoughtful consultant would.
- The student always has the final say. Frame this ONLY as a suggestion and a question — never state or assume they should change direction, and never treat a suggestion as already accepted. If they're not interested, respect that immediately and move on.
- Do NOT manufacture this moment. If nothing specific enough has actually surfaced in the conversation to justify a genuine, well-reasoned redirect, do not force one just to seem insightful — a generic-sounding "have you considered X" with no real grounding in what they've actually told you is worse than not suggesting anything at all.

Generating the overview (Stage 3 — do this only once, and only once the conversation has genuinely earned it):
- Once you and the student have covered real interests, at least one real piece of prior experience, and (if you ever offered a narrative pushback suggestion above) whether they actually agreed to it, set readyForOverview to true and fill in ALL of: narrativeTitle, narrativeSummary, overviewPhaseTitles, overviewPhaseDescriptions, phaseDimensions, overviewPhaseDayOffsets, capstoneIdea, thematicKeywords, and matchedInterestTags, in that SAME response.
- matchedInterestTags: pick 2-6 tags EXACTLY from the fixed list given in that field's own schema description, based on what the student genuinely revealed in this conversation — never invent a tag not on that list, and never force a match the conversation doesn't actually support.
- Use profileSummary.basicProfile.planYearLabels for the REAL, exact remaining school years (e.g. ["Sophomore Year", "Junior Year", "Senior Year"]) — never guess or invent a different number of years than what's actually there.
- overviewPhaseTitles/overviewPhaseDescriptions/phaseDimensions/overviewPhaseDayOffsets together are a real MULTI-YEAR STRATEGIC PLAN across every real dimension a genuine college consultant would map out — not just project ideas. One "academic-year" phase per entry in planYearLabels, PLUS one "summer" phase for each real summer BETWEEN two consecutive years in that list (not after the final year). The single most important rule: every phase across every dimension must explicitly reinforce the SAME core narrative thread — never generate these as separate, disconnected checklist categories. A phase's own title and description should read as one continuous, connected story, not a template filled in per-category.
- What each phase should actually cover (all tied to the same thread, distributed naturally across phases as contextually appropriate — not every phase needs every dimension, but the whole overview together should touch all of them):
  * Course rigor progression: how course choices should get more advanced/specialized over time in a way that reinforces the narrative. This feeds this app's own EXISTING course-recommendation system through thematicKeywords — never invent a specific course name or number (you don't have this student's real catalog).
  * Extracurriculars and leadership tied to the theme, including — in exactly ONE phase across the whole overview — a real, specific, genuinely DISTINCTIVE capstone project candidate (see capstoneIdea below).
  * Summer plans as their OWN separate "summer" phases with real, concrete, narrative-tied activities (a self-directed project, research, a relevant internship) — never generic "relax and explore" filler, and never folded into a school-year phase.
  * College list evolution: how the target list should develop and sharpen as the narrative becomes clearer, especially in later phases.
  * Essay/narrative-building material: frame essays as the EVENTUAL EXPRESSION of everything built in earlier phases, not a late, separate task — name what kind of real, lived experience/material a given phase should be accumulating that will make a later essay genuine and specific.
  * Testing timeline: this app ALREADY has real testing tasks on the plan (for a highschool student: PSAT practice sophomore year, the real PSAT junior year, SAT/ACT prep beginning junior year, the test itself around spring junior year, retake windows senior fall; for an undergraduate/transfer student: the GRE/GMAT if relevant, a statement of purpose, in the final year). Reference these where relevant so the narrative acknowledges them — do NOT create new testing tasks or re-schedule them; they already exist elsewhere on this student's real plan.
- capstoneIdea: the SAME bar as narrative pushback above — a real, well-reasoned, non-obvious connection to this specific student's own actual talents/interests, never a generic "do a project about your major" idea. This is a project a student's own talents could make genuinely distinctive, not an assignment any student in that field could equally do.
- narrativeSummary must accurately reflect the REAL settled direction, including explicitly naming any narrative-pushback suggestion the student actually agreed to (or noting they stuck with their own original direction if they declined one).
- Don't rush this — a conversation that's only covered one or two surface-level answers is not ready. But once it genuinely has, generate a real, specific overview rather than continuing to ask more questions than necessary.
- Even after readyForOverview is true, keep talking naturally if the student wants to discuss further — you can set these fields again on a later turn if the direction changes.

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
function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const {
    reply, readyForOverview, narrativeTitle, narrativeSummary,
    overviewPhaseTitles, overviewPhaseDescriptions, phaseDimensions, overviewPhaseDayOffsets,
    capstoneIdea, thematicKeywords, matchedInterestTags, mentionsSpecificFact,
  } = input;
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 4000) return null;
  if (typeof readyForOverview !== 'boolean') return null;
  if (typeof mentionsSpecificFact !== 'boolean') return null;

  const notReady = {
    reply: reply.trim(),
    readyForOverview: false,
    narrativeTitle: null,
    narrativeSummary: null,
    overviewPhaseTitles: null,
    overviewPhaseDescriptions: null,
    phaseDimensions: null,
    overviewPhaseDayOffsets: null,
    capstoneIdea: null,
    thematicKeywords: null,
    matchedInterestTags: null,
    mentionsSpecificFact,
  };
  if (!readyForOverview) return notReady;

  if (typeof narrativeTitle !== 'string' || !narrativeTitle.trim() || narrativeTitle.length > 150) return notReady;
  if (typeof narrativeSummary !== 'string' || !narrativeSummary.trim() || narrativeSummary.length > 2000) return notReady;
  if (!Array.isArray(overviewPhaseTitles)) return notReady;
  const cleanPhases = overviewPhaseTitles.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  // Expand the Multi-Year Overview (see CLAUDE.md) — widened from the old 3-5 bound now that a
  // real multi-year plan needs one "academic-year" phase per remaining school year PLUS one
  // "summer" phase for each real summer between them.
  if (cleanPhases.length < 4 || cleanPhases.length > 9) return notReady;
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
    readyForOverview: true,
    narrativeTitle: narrativeTitle.trim(),
    narrativeSummary: narrativeSummary.trim(),
    overviewPhaseTitles: cleanPhases,
    overviewPhaseDescriptions: cleanDescriptions,
    phaseDimensions: cleanDimensions,
    overviewPhaseDayOffsets: cleanDayOffsets,
    capstoneIdea: cleanCapstone,
    thematicKeywords: cleanThemes,
    matchedInterestTags: cleanInterestTags,
    mentionsSpecificFact,
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
      // Raised again, from 2600 to 4500, when the overview grew from a plain phase-titles list
      // (Stage 3) to a full multi-dimensional plan (Expand the Multi-Year Overview, see CLAUDE.md)
      // — up to 9 phases, each with a real 2-4 sentence description, plus a capstone idea, is
      // genuinely more content than the original budget was sized for. Matching
      // api/build-your-own-chat.js's own repeated bug-fix precedent: a truncated response here is
      // strictly worse than a generously-budgeted one.
      max_tokens: 4500,
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
      // Same 4500 bump as the Anthropic call above, same reasoning — a real multi-dimensional
      // overview response needs real headroom past what the original phase-titles-only shape did.
      max_output_tokens: 4500,
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

  const { history, prompt, profileSummary } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !profileSummary || !Array.isArray(history)) {
    res.status(400).json({ error: 'Missing prompt/profileSummary/history' });
    return;
  }

  try {
    const result = await provider.call(apiKey, history, prompt, profileSummary);
    if (result.error) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    const proposal = validateProposal(result.proposal);
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
