// Passion Field + Enhanced Conversational "Build Your Own" (see CLAUDE.md), Tasks 4-6 — a real,
// ongoing brainstorming conversation for Project Builder's "Build Your Own" feature, replacing the
// old single-question/single-answer flow entirely. A standalone Vercel serverless function,
// mirroring api/chat.js's own structure closely (same CORS allowlist shape, same dual-provider
// Anthropic/OpenAI dispatch via the SAME AI_SUGGESTION_PROVIDER env var — this feature needs zero
// separate provider configuration — same forced-tool-call reliability, same code-enforced honesty
// guardrail) — a standalone file, not imported from api/chat.js, matching this app's own
// established "each Vercel function file is standalone" precedent (api/suggest.js,
// api/creative-suggest.js, api/chat.js already each duplicate this same boilerplate rather than
// share it).
//
// Genuinely distinct from api/chat.js's own general-assistant conversation: this one has ONE job —
// act like a real creative brainstorming partner developing ONE project idea over multiple turns
// (asking follow-up questions, building on the student's answers), then, once a genuinely complete
// concept has emerged (a real sense of how it starts, progresses, and concludes — not just a
// one-line idea), translate that developed plan into an ordered list of milestone titles in the
// SAME response that reports it's ready. This is why `planReady`/`projectName`/`milestones` are
// schema fields here and `intent`/`taskTitle` are not — a fundamentally different job, hence a
// fundamentally different (but structurally parallel) schema, not the same one reused.

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-5.6-terra';

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/gigimanbigdur\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

function resolveAllowedOrigin(origin) {
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) return origin;
  return null;
}

// Task 5/6's own honesty rule (identical in spirit to api/suggest.js's `referencesExternalFact`,
// api/chat.js's/api/creative-suggest.js's `mentionsSpecificEntity`, and sharpened the same way the
// "Make the Verify This Yourself Disclaimer Conditional" fix already corrected those two: only a
// genuinely NEW, specific, external claim not already backed by the student's own profile data
// needs the flag — not anything that merely builds on what's already in their profile).
const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Your natural, conversational reply to the student — this is exactly what gets shown and spoken aloud. Ask genuine follow-up questions and build on what they say, like a real brainstorming partner — do not deliver a single static idea and stop.',
    },
    planReady: {
      type: 'boolean',
      description: 'True ONLY once you and the student have developed a genuinely complete, concrete project concept together — a real sense of how it would start, progress through a few real stages, and conclude. False for anything less developed than that, including a single one-line idea with no real arc yet.',
    },
    projectName: {
      type: ['string', 'null'],
      description: 'A short, specific project name. Required (non-null) when planReady is true. Must be null otherwise.',
    },
    milestones: {
      type: ['array', 'null'],
      items: { type: 'string' },
      description: 'An ORDERED list of 3-7 short, specific milestone titles capturing the REAL arc of the project as actually discussed (from kickoff through to completion) — not a generic template. Required (non-null, non-empty) when planReady is true. Must be null otherwise. Do not include dates or timing — just the titles, in the order they\'d happen.',
    },
    mentionsSpecificEntity: {
      type: 'boolean',
      description: 'True ONLY if your reply introduces a genuinely NEW, specific real organization, program, contact, statistic, or outside-world fact that is NOT already confirmed by the student\'s own profile data (their own reported interests/passion text, or an activity/opportunity already listed in their profile). False otherwise — referencing something already in the student\'s own profile (even by real name), or purely generic project-building advice, is NOT a new claim.',
    },
  },
  required: ['reply', 'planReady', 'projectName', 'milestones', 'mentionsSpecificEntity'],
  additionalProperties: false,
};
const TOOL_NAME = 'respond_to_brainstorm';
const TOOL_DESCRIPTION = 'Respond to the student in an ongoing project-brainstorming conversation, reporting whether a complete plan has been developed yet.';

const SYSTEM_PROMPT = `You are a genuinely creative, collaborative brainstorming partner helping a student develop a real, hands-on personal project idea from scratch, through real back-and-forth conversation — this is an ongoing, multi-turn conversation, not a single response. Use the FULL conversation history for real context, not just the latest message in isolation.

Rules you must follow:
- Act like a thoughtful consultant: ask genuine follow-up questions to understand what actually interests the student, and build on their answers rather than jumping straight to a final idea (for example: "Are you interested in that?" then developing the idea further based on their answer). Keep the conversation going across multiple turns.
- Ground ideas in the student's own real profile (their interests, passion text if provided, courses, activities) — connect to something genuinely personal, not a generic suggestion anyone could get.
- The goal is a COMPLETE project concept, not just a one-line idea: a real sense of how it would start, what it would actually involve as it progresses through a few concrete stages, and how it would conclude.
- Only once that's genuinely been developed together, set planReady to true, and in that SAME response set projectName (a short, specific name) and milestones (an ordered list of 3-7 short, specific milestone titles reflecting EXACTLY what was actually discussed — not a generic template, and not tied to any specific dates). Don't set planReady prematurely — a single idea with no real arc yet is not ready.
- Even after planReady is true, keep talking naturally if the student wants to keep refining — you can update projectName/milestones again on a later turn if the plan changes.
- CRITICAL HONESTY RULE: never present a specific real external organization, contact, program, statistic, or fact about the outside world as confirmed/verified unless you are genuinely certain — if unsure, say so plainly. Set mentionsSpecificEntity to true ONLY when you introduce a genuinely NEW specific claim not already confirmed by the student's own profile data — referencing something already in their profile (even by real name), or giving purely generic advice, is NOT a new claim and should be false.
- Call the respond_to_brainstorm tool exactly once with your response, and nothing else.`;

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim())
    .map((h) => ({ role: h.role, content: h.content }));
}

function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const {
    reply, planReady, projectName, milestones, mentionsSpecificEntity,
  } = input;
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 1500) return null;
  if (typeof planReady !== 'boolean') return null;
  if (typeof mentionsSpecificEntity !== 'boolean') return null;

  if (planReady) {
    if (typeof projectName !== 'string' || !projectName.trim() || projectName.length > 150) return null;
    if (!Array.isArray(milestones) || milestones.length < 1) return null;
    const cleanMilestones = milestones
      .filter((m) => typeof m === 'string' && m.trim())
      .map((m) => m.trim());
    if (cleanMilestones.length === 0) return null;
    return {
      reply: reply.trim(),
      planReady: true,
      projectName: projectName.trim(),
      milestones: cleanMilestones,
      mentionsSpecificEntity,
    };
  }

  return {
    reply: reply.trim(),
    planReady: false,
    projectName: null,
    milestones: null,
    mentionsSpecificEntity,
  };
}

function applyGuardrails(proposal) {
  if (!proposal.mentionsSpecificEntity) return proposal;
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
      max_tokens: 900,
      // Higher than api/chat.js's own 0.6 (general help) — closer to Build Your Own's own
      // original single-shot 0.9 — since a real creative-leap brainstorm benefits from genuine
      // variety, not a safe/predictable completion.
      temperature: 0.85,
      system: SYSTEM_PROMPT,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: CHAT_SCHEMA }],
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
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: CHAT_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      max_output_tokens: 900,
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
    res.status(500).json({ error: 'Build Your Own chat is not configured' });
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
    res.status(500).json({ error: 'Build Your Own chat proxy error', detail: String(err) });
  }
}
