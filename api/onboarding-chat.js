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
const ONBOARDING_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Your next line in this ongoing, natural conversation with the student — exactly what gets shown to them. Ask about ONE thing at a time; never stack multiple questions into one reply. Keep it warm, genuinely curious, and concise (a real conversational turn, not an essay).',
    },
    mentionsSpecificFact: {
      type: 'boolean',
      description: 'True ONLY if your reply introduces a genuinely NEW, specific real organization, program, statistic, or outside-world fact that is NOT already confirmed by something the student themselves just told you in this conversation. False otherwise — referencing something the student already shared (even a specific real club/program/experience by name), or purely generic conversation with no new named claim, is NOT a new fact. Only set this true when you introduce a genuinely new, specific claim the student would need to independently verify.',
    },
  },
  required: ['reply', 'mentionsSpecificFact'],
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
function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const { reply, mentionsSpecificFact } = input;
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 1500) return null;
  if (typeof mentionsSpecificFact !== 'boolean') return null;
  return { reply: reply.trim(), mentionsSpecificFact };
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
      max_tokens: 1000,
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
  return { proposal: toolUse?.input };
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
      max_output_tokens: 1000,
      reasoning: { effort: 'medium' },
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => '');
    return { error: { status: 502, body: { error: 'OpenAI request failed', status: openaiRes.status, detail } } };
  }

  const data = await openaiRes.json();
  const call = (data.output || []).find((item) => item.type === 'function_call' && item.name === TOOL_NAME);
  if (!call) return { proposal: null };
  let args = null;
  try { args = JSON.parse(call.arguments); } catch { args = null; }
  return { proposal: args };
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
      res.status(502).json({ error: 'Model did not return a valid response' });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Onboarding chat proxy error', detail: String(err) });
  }
}
