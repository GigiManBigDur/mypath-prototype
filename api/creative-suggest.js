// AI Personalization, Stage 3: The Creative-Leap Layer (see CLAUDE.md) — a SEPARATE Vercel
// serverless function from api/suggest.js, not a mode flag on it (each Vercel function stays
// standalone, matching that file's own established "never import from a sibling under api/"
// precedent). This is genuinely a different kind of request: student-initiated and DELIBERATELY
// creative/exploratory rather than "grounded and conservative" — the exact ambitious, non-obvious
// connection-making api/suggest.js's own SYSTEM_PROMPT explicitly deferred to "a later, separate
// feature." This is that feature.
//
// Move: Build Your Own (see CLAUDE.md) — this endpoint originally sat behind the Hub's own
// general "Ask MyPath AI anything" button; that entry point has been removed entirely (a
// different, separate rebuild is planned for it) and this feature now lives ONLY inside Project
// Builder, as "Build Your Own" within each category. The endpoint itself, its URL, and its
// request/response contract (`{prompt, profileSummary}` in, `{title, response,
// mentionsSpecificEntity}` out) are UNCHANGED — only `SYSTEM_PROMPT`/the tool's own
// name/description were re-scoped from a general "creative connection" to a genuine, actionable
// PROJECT IDEA, since every caller now wants exactly that. The client (ProjectBuilderScreen.jsx)
// embeds which category the student is browsing directly into the `prompt` string it sends,
// rather than this endpoint needing a new dedicated field for it.
//
// Reuses the identical security/cost/provider patterns Stage 2 already established (Task 5): same
// CORS allowlist shape, same dual-provider (Anthropic/OpenAI) dispatch via the SAME
// AI_SUGGESTION_PROVIDER env var — whichever provider is currently active for Stage 2's
// auto-triggered suggestions is also what answers a student's project-idea request, with zero
// separate configuration. Same forced-tool-call reliability approach as Stage 2. Since this is
// student-initiated (not fired automatically on every task completion), no special rate-limiting
// is needed beyond ordinary usage, per the build spec's own Task 5.

// Bug fix (see CLAUDE.md, api/build-your-own-chat.js's own detailed comment for the full
// diagnosis) — same latent risk here: no vercel.json/per-function config anywhere in this repo
// meant every AI-calling function ran on whatever short default timeout the deployment applies.
export const config = {
  maxDuration: 60,
};

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-5.6-terra';

// Same "proportionate, not bulletproof" abuse guard as api/suggest.js/api/tts.js — duplicated
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

// Task 3's honesty rule is stricter than api/suggest.js's own `referencesExternalFact` (which just
// flags a suggestion for a "double-check this" disclaimer) — here the model must NEVER present a
// specific real organization/contact/program as confirmed to exist at all, only ever point toward
// a direction or type of action. `mentionsSpecificEntity` is the model's own self-reported signal
// for the one code-enforced guardrail below (`applyGuardrails`) — the same "ask the model to flag
// it, then enforce deterministically in code, never trust the flag alone" pattern Stage 2 already
// established, not a new posture invented here.
const CONNECTION_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A short, punchy name for this project idea (not a full sentence) — used directly as the project name if the student decides to start it.',
    },
    response: {
      type: 'string',
      description: 'The genuine, non-obvious PROJECT IDEA itself, written directly to the student in 2-4 sentences: name the specific, real parts of THEIR OWN profile it draws from, then describe what the project actually is and a concrete direction or TYPE of action to get started — never a specific named organization, contact, or program presented as if you have confirmed it exists or is reachable.',
    },
    mentionsSpecificEntity: {
      type: 'boolean',
      description: 'True if your own response names or implies a SPECIFIC real organization, program, contact, or opportunity as if it is confirmed to exist/be reachable. False if you kept it at the level of a general direction or type of action. If in doubt, set this true.',
    },
  },
  required: ['title', 'response', 'mentionsSpecificEntity'],
  additionalProperties: false,
};
const TOOL_NAME = 'propose_project_idea';
const TOOL_DESCRIPTION = "Propose one genuine, non-obvious PROJECT IDEA based on the student's own real profile, honestly bounded.";

const SYSTEM_PROMPT = `You are a thoughtful, imaginative project mentor embedded in a student's personalized roadmap app, helping them find a genuinely creative, non-obvious PROJECT IDEA based on their OWN real profile — not a generic idea that could apply to anyone.

Rules you must follow:
- Actually use the student's real profile: reference specific real interests, careers/majors, activities, projects, and (especially) any outcome notes they wrote about completed tasks. A project idea that could apply to any random student is a failure — it must be clearly rooted in THIS student's own specific combination of things.
- Aim for a genuinely "less obvious angle" for the project — the kind of connection a thoughtful mentor points out that the student might not have considered themselves. For example: "you're into soccer and exploring business — here's a less obvious project idea: build a mini business case study or budget guide for a youth soccer league, combining your soccer knowledge with real business/operations thinking."
- The prompt may tell you which project CATEGORY the student is currently browsing (e.g. STEM, Entrepreneurship, Nonprofit/Community Impact) — if so, make sure your idea genuinely fits that category, while still connecting to their own specific profile. If no category is given, propose whatever genuinely fits their profile best.
- CRITICAL HONESTY RULE: you may suggest a direction or TYPE of action/resource (e.g. "look into how local youth sports leagues handle their budgets and sponsorships") but you must NEVER claim to have found or verified that a SPECIFIC real organization, contact, or program exists or is reachable. Point toward what the student should go find and verify themselves — never invent or imply a specific confirmed name.
- Set mentionsSpecificEntity to true if your own response names or implies anything specific enough that the student might mistake it for something you've actually verified — otherwise false. If in doubt, set it true.
- Call the propose_project_idea tool exactly once with your proposal, and nothing else.`;

// Structural validation only, shared by both providers — the one place the two implementations
// converge back onto a single code path, matching api/suggest.js's own precedent.
function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const { title, response, mentionsSpecificEntity } = input;
  if (typeof title !== 'string' || !title.trim() || title.length > 150) return null;
  if (typeof response !== 'string' || !response.trim() || response.length > 1200) return null;
  if (typeof mentionsSpecificEntity !== 'boolean') return null;
  return { title: title.trim(), response: response.trim(), mentionsSpecificEntity };
}

// The one code-enforced guardrail — never trusted to the model's own prose alone. The client ALSO
// renders its own standing, always-visible honesty note regardless of this flag (Task 4); this
// server-side addition is the stronger, explicit correction for the specific case the model itself
// flagged as risking an implied-verified specific.
function applyGuardrails(proposal) {
  if (!proposal.mentionsSpecificEntity) return proposal;
  return {
    ...proposal,
    response: `${proposal.response} (If this names anything specific, treat it only as an example of the type of thing to look for — I haven't verified that it exists or is reachable.)`,
  };
}

async function callAnthropic(apiKey, prompt, profileSummary) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      // Deliberately higher than Stage 2's 0.4 (grounded/conservative) — this feature's whole
      // point is a genuine creative leap, not a safe, predictable next step.
      temperature: 0.9,
      system: SYSTEM_PROMPT,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: CONNECTION_SCHEMA }],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [
        { role: 'user', content: JSON.stringify({ prompt, profileSummary }) },
      ],
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

// Same OpenAI Responses API shape api/suggest.js already established (flat, non-nested tool
// entries; `output` array parsing; `reasoning.effort` instead of `temperature`, since GPT-5.6
// Terra is a reasoning model and rejects `temperature` outright). `effort: 'medium'` (up from
// Stage 2's 'low') — a genuine creative connection benefits from more real reasoning than a
// simple grounded next-step suggestion does, and Task 5's "no special rate-limiting" framing
// already accepts this is a costlier, less-frequent, student-initiated request.
async function callOpenAI(apiKey, prompt, profileSummary) {
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: JSON.stringify({ prompt, profileSummary }),
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: CONNECTION_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      max_output_tokens: 700,
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

// Same env var as api/suggest.js — whichever provider is active for Stage 2's auto-triggered
// suggestions answers this feature too, with zero separate configuration (Task 5).
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
    // Fails honestly rather than pretending to work — the client's own graceful-fallback path
    // treats any non-200 response as "no response this time," matching the ElevenLabs/Stage 2
    // precedent this app already established.
    res.status(500).json({ error: 'Creative connections are not configured' });
    return;
  }

  const { prompt, profileSummary } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !profileSummary) {
    res.status(400).json({ error: 'Missing prompt/profileSummary' });
    return;
  }

  try {
    const result = await provider.call(apiKey, prompt, profileSummary);
    if (result.error) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    const proposal = validateProposal(result.proposal);
    if (!proposal) {
      res.status(502).json({ error: 'Model did not return a valid proposal' });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Creative connection proxy error', detail: String(err) });
  }
}
