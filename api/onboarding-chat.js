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
      description: 'An ORDERED list of exactly 3 to 5 short, specific overview-level phase titles representing the major chapters of this student\'s own path over the next few years — e.g. "Deepen your foundation in statistics and social research methods," "Complete a signature research project," "Build leadership in a relevant club or organization." These are broad CHAPTERS, not granular steps — do not break any phase down into its own sub-actions here (that level of detail is deliberately deferred to a later, separate, narrower conversation once the student actually reaches that phase). Required (non-null, 3-5 items) when readyForOverview is true. Must be null otherwise.',
    },
    overviewPhaseDayOffsets: {
      type: ['array', 'null'],
      items: { type: 'integer' },
      description: 'One integer per entry in overviewPhaseTitles, in the same order: a realistic number of days from today that phase would likely BEGIN. The first should be 0 or close to it. Must be a strictly increasing sequence, spaced out realistically (a phase spanning a school year needs real months, not days) rather than evenly. Required (matching the length of overviewPhaseTitles) when readyForOverview is true. Must be null otherwise.',
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
    'overviewPhaseTitles', 'overviewPhaseDayOffsets', 'thematicKeywords', 'matchedInterestTags',
    'mentionsSpecificFact',
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
- Once you and the student have covered real interests, at least one real piece of prior experience, and (if you ever offered a narrative pushback suggestion above) whether they actually agreed to it, set readyForOverview to true and fill in ALL of: narrativeTitle, narrativeSummary, overviewPhaseTitles, overviewPhaseDayOffsets, thematicKeywords, and matchedInterestTags, in that SAME response.
- matchedInterestTags: pick 2-6 tags EXACTLY from the fixed list given in that field's own schema description, based on what the student genuinely revealed in this conversation — never invent a tag not on that list, and never force a match the conversation doesn't actually support.
- overviewPhaseTitles should be 3 to 5 REAL, SPECIFIC overview-level phases grounded in what this particular student actually told you — never a generic template. Think of them as the major chapters of the next few years (e.g. "Deepen your foundation in X," "Complete a signature project," "Build leadership in Y" are the SHAPE these should take, not literal text to copy) — broad chapters, not granular steps; granular detail for any one phase is planned separately, later, once the student actually reaches it.
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
    overviewPhaseTitles, overviewPhaseDayOffsets, thematicKeywords, matchedInterestTags,
    mentionsSpecificFact,
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
    overviewPhaseDayOffsets: null,
    thematicKeywords: null,
    matchedInterestTags: null,
    mentionsSpecificFact,
  };
  if (!readyForOverview) return notReady;

  if (typeof narrativeTitle !== 'string' || !narrativeTitle.trim() || narrativeTitle.length > 150) return notReady;
  if (typeof narrativeSummary !== 'string' || !narrativeSummary.trim() || narrativeSummary.length > 2000) return notReady;
  if (!Array.isArray(overviewPhaseTitles)) return notReady;
  const cleanPhases = overviewPhaseTitles.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  if (cleanPhases.length < 3 || cleanPhases.length > 5) return notReady;
  const cleanDayOffsets = Array.isArray(overviewPhaseDayOffsets)
    && overviewPhaseDayOffsets.length === cleanPhases.length
    && overviewPhaseDayOffsets.every((n) => Number.isFinite(n))
    ? overviewPhaseDayOffsets.map((n) => Math.round(n))
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
    overviewPhaseDayOffsets: cleanDayOffsets,
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
      // Raised from the original 1000 to 2600 (matching api/build-your-own-chat.js's own bug-fix
      // precedent, see CLAUDE.md's "Fix Build Your Own milestones request intermittently timing
      // out") — a real overview response (reply + narrativeSummary + 3-5 phase titles) needs real
      // headroom past what a plain conversational turn alone required, and a truncated response
      // here is strictly worse than a generously-budgeted one.
      max_tokens: 2600,
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
      // Same 2600 bump as the Anthropic call above, same reasoning — a real overview response
      // needs real headroom past what a plain conversational turn alone required.
      max_output_tokens: 2600,
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
