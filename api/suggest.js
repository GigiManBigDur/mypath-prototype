// AI Personalization, Stage 2 (see CLAUDE.md) — a Vercel serverless function, the ONLY place a
// real AI provider API key ever exists. Mirrors api/tts.js's own structure (same CORS allowlist
// shape, same "fail honestly, never expose the key" posture) — this is one of the deliberate,
// explicitly-requested exceptions to this app's own standing "no backend, static site only"
// constraint (see the top of CLAUDE.md), not a general backend.
//
// The client never talks to a real AI provider directly — it only ever calls this app's own
// /api/suggest proxy, the same "client calls the proxy, proxy calls the real API" shape
// speech.js/api/tts.js already established for ElevenLabs.
//
// Prepare OpenAI Integration in Advance (see CLAUDE.md) — TWO providers are implemented side by
// side in this ONE file (Anthropic's Claude Sonnet 5, and OpenAI's GPT-5.6 Terra), switched via a
// single env var, `AI_SUGGESTION_PROVIDER` ('anthropic' | 'openai', defaulting to 'anthropic' so
// the currently-working configuration is completely unaffected until someone deliberately opts
// in). This is a real, working alternate implementation, not a stub — every part of it (the
// request shape, the response parsing, the model id) was individually verified against OpenAI's
// own current docs before being written, the same rigor the original Anthropic version got. Both
// providers share the exact same TASK_SCHEMA/SYSTEM_PROMPT/validateProposal/applyGuardrails
// pipeline, so the CLIENT-FACING request/response contract is byte-for-byte identical regardless
// of which provider answered — nothing in Roadmap.jsx, MascotWidget.jsx, or profileCompiler.js
// needs to know or care which one is active.
//
// What's needed to actually switch to OpenAI, and nothing more: set `OPENAI_API_KEY` (a real key)
// and `AI_SUGGESTION_PROVIDER=openai` in this project's Vercel environment variables, then
// redeploy. No code changes. Switching back to Anthropic is just removing/changing that one env
// var back (or deleting it, since 'anthropic' is the default).

const ANTHROPIC_MODEL = 'claude-sonnet-5';
// GPT-5.6 Terra's own real API model id, confirmed directly against OpenAI's own docs — the plain
// "gpt-5.6" alias actually routes to Sol (a different tier), not Terra, so this exact string
// matters.
const OPENAI_MODEL = 'gpt-5.6-terra';

// Same "proportionate, not bulletproof" abuse guard as api/tts.js — duplicated rather than
// shared, matching that file's own precedent (each Vercel function file is standalone).
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/gigimanbigdur\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

function resolveAllowedOrigin(origin) {
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) return origin;
  return null;
}

// Task 3/5 (Stage 2's own build spec) — the model is asked to propose exactly ONE grounded,
// conservative task via a forced tool/function call (not free-text JSON parsing), for BOTH
// providers — this is what makes the response structurally reliable without needing brittle
// prompt-based JSON extraction. `referencesExternalFact` is the model's own signal for the
// external-fact guardrail, enforced deterministically in code below (see `applyGuardrails`)
// rather than trusted to appear correctly in the model's own free-text rationale.
//
// Shared between both providers — Anthropic's tool schema nests this under `input_schema`,
// OpenAI's Responses API keeps it flat under `parameters` (confirmed directly against OpenAI's
// own docs: unlike the older Chat Completions API's nested `{"type":"function","function":{...}}`
// wrapper, the Responses API's tool entries put name/description/parameters directly on the tool
// object) — but the actual JSON Schema describing the fields is identical either way.
//
// Fix: Replace Automatic Date Computation with a Manual, Constrained Date Step (see CLAUDE.md) —
// the model no longer picks a date OR a relative insert position at all; the student now picks
// their own date afterward (MascotWidget's date-picker step), constrained client-side to fall
// after the triggering task's own real date (the one rule this feature enforces). This
// drastically simplifies what the model needs to return: just enough to phrase the suggestion and
// detect whether it belongs to an existing opportunity chain by id — everything about WHEN and
// WHERE within that chain is decided by the student, not computed. `relatedOpportunityId` is
// still required in the schema (nullable) so chain-attachment (Task 3) keeps working — the app
// still needs to know whether to attach this as a branch step of an existing chain or, if no
// chain is identified, fall back to its own standalone spine task (Task 4, unchanged).
const TASK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A short, specific task title (not a full sentence).' },
    rationale: { type: 'string', description: 'Exactly one sentence connecting this suggestion to what the student just reported.' },
    referencesExternalFact: {
      type: 'boolean',
      description: 'True if this suggestion names a specific real organization, program, award, competition tier, or contact the student would need to independently verify. False otherwise.',
    },
    relatedOpportunityId: {
      type: ['string', 'null'],
      description: 'If this suggestion is a natural next step within one of the student\'s EXISTING opportunities/chains listed in profileSummary.activities.opportunities (e.g. it clearly follows up on the same club or competition by name), set this to that opportunity\'s exact "id" field from that list. Otherwise null.',
    },
  },
  required: ['title', 'rationale', 'referencesExternalFact', 'relatedOpportunityId'],
  additionalProperties: false,
};
const TOOL_NAME = 'propose_task';
const TOOL_DESCRIPTION = 'Propose exactly one grounded, realistic next-step task for the student\'s academic/career plan.';

const SYSTEM_PROMPT = `You are a careful, conservative academic and career planning assistant embedded in a student's personalized roadmap app. A student just marked one task complete and wrote a short note describing what actually happened. Using their overall profile and that specific outcome, propose exactly ONE realistic next-step task.

Rules you must follow:
- Keep the suggestion grounded and conservative: a realistic next step within something the student is ALREADY doing (the same club, competition, subject area, activity, or goal) — not an ambitious creative leap into something new or unrelated. That more ambitious kind of suggestion is a later, separate feature; this stage is deliberately simple and safe.
- Check profileSummary.activities.opportunities first. If your suggestion is clearly a natural next step within one of the opportunities/chains already listed there (it references the same club, competition, or activity by name), set relatedOpportunityId to that opportunity's exact "id" field. Otherwise leave it null.
- Do NOT propose a date for this task, and do not reason about timing or scheduling at all — the student picks their own date for it afterward, in the app.
- The rationale must be exactly one sentence, directly connecting the suggestion to what the student just reported (e.g. referencing their outcome note).
- Set referencesExternalFact to true whenever your suggestion names a specific real organization, program, award, competition tier, or contact the student would need to independently verify — otherwise false. Do not guess whether something is "probably fine to skip" — if in doubt, set it true.
- Never propose anything that edits, removes, or replaces an existing task — only ever one new, additional task.
- Call the propose_task tool exactly once with your proposal, and nothing else.`;

// Structural validation only — Shared by both providers, run AFTER either one returns its own raw
// proposal — this is the one place the two implementations converge back onto a single code path,
// which is what guarantees the client-facing contract stays identical regardless of provider.
function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const { title, rationale, referencesExternalFact, relatedOpportunityId } = input;
  if (typeof title !== 'string' || !title.trim() || title.length > 150) return null;
  if (typeof rationale !== 'string' || !rationale.trim() || rationale.length > 500) return null;
  if (typeof referencesExternalFact !== 'boolean') return null;

  const hasRelatedChain = typeof relatedOpportunityId === 'string' && relatedOpportunityId.trim().length > 0;
  return {
    title: title.trim(),
    rationale: rationale.trim(),
    referencesExternalFact,
    relatedOpportunityId: hasRelatedChain ? relatedOpportunityId.trim() : null,
  };
}

// The external-fact guardrail, enforced in code rather than trusted to the model's own prose — any
// suggestion referencing a real external fact ALWAYS carries this note, appended deterministically
// regardless of what the model itself wrote in `rationale`, and regardless of which provider
// produced it (this runs on the already-normalized `proposal`, after either provider's own
// response has already been parsed into the shared shape).
function applyGuardrails(proposal) {
  if (!proposal.referencesExternalFact) return proposal;
  return {
    ...proposal,
    rationale: `${proposal.rationale} (Double-check this detail yourself — I can't independently verify external facts.)`,
  };
}

// Each provider function returns `{ proposal }` (a raw, not-yet-validated object matching
// TASK_SCHEMA's shape) on success, or `{ error: { status, body } }` on any failure it can identify
// specifically (a non-2xx HTTP response) — anything else (a network exception, a malformed
// response body) is left to the caller's own try/catch, same as the original single-provider
// version already did.

async function callAnthropic(apiKey, today, profileSummary, triggeringTask) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: TASK_SCHEMA }],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [
        { role: 'user', content: JSON.stringify({ today, profileSummary, triggeringTask }) },
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

// OpenAI's Responses API (POST /v1/responses, the current, non-legacy API surface — confirmed
// directly against OpenAI's own docs rather than assumed) — key differences from Anthropic's shape
// that were each individually verified before writing this, not guessed:
//   - `instructions` is a dedicated top-level field for the system-level prompt (simpler than
//     Anthropic's own `system` + a `messages` array — no need to construct a message list at all
//     here, since this is always a single-turn request).
//   - `input` can be a plain string for a single-turn request (used here for the same JSON-
//     serialized payload Anthropic's own `messages[0].content` already carries).
//   - Tool entries are FLAT (`type`/`name`/`description`/`parameters` directly on the tool object)
//     — NOT nested under a `function` key the way the older Chat Completions API requires.
//   - `tool_choice: { type: 'function', name: ... }` forces one specific tool, mirroring
//     Anthropic's own `{ type: 'tool', name: ... }`.
//   - The response's tool call lives in a top-level `output` array as an item with
//     `type: 'function_call'`, carrying `name` and a JSON-ENCODED STRING `arguments` field (not an
//     already-parsed object — this needs its own `JSON.parse`, unlike Anthropic's `tool_use.input`
//     which arrives pre-parsed).
//   - GPT-5.6 Terra is a reasoning-tuned model and does NOT accept `temperature` at all (confirmed
//     directly — reasoning models disable external sampling controls to protect their own internal
//     calibration; sending it produces a real 400 error, not a silently-ignored parameter). The
//     equivalent dial is `reasoning: { effort: ... }` (`none|low|medium|high|xhigh|max`) — a real,
//     confirmed correction: a flat top-level `reasoning_effort` field (what secondary write-ups of
//     this API described) is REJECTED by the live Responses API with an explicit "this parameter
//     has moved to 'reasoning.effort'" error — caught immediately via a real end-to-end test call
//     against the deployed function, not left for the next real user to hit. `'low'` is used here
//     since this is a simple, bounded, structured-output decision that doesn't benefit from deep
//     multi-step reasoning; it's also the cheaper/faster setting, fitting Stage 2's own "keep cost
//     roughly constant" framing from its original build spec.
async function callOpenAI(apiKey, today, profileSummary, triggeringTask) {
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: JSON.stringify({ today, profileSummary, triggeringTask }),
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: TASK_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      max_output_tokens: 500,
      reasoning: { effort: 'low' },
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

// Prepare OpenAI Integration in Advance, Task 2 — the one switch. 'anthropic' is the default
// (matches `PROVIDERS[undefined]` being falsy, so an unset env var falls through to it below) so
// deploying this file changes NOTHING about current behavior unless AI_SUGGESTION_PROVIDER is
// deliberately set. Neither provider is deleted or altered when the other is active — flipping
// this one value (and having that provider's own API key configured) is the entire "switch."
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
    // treats any non-200 response as "no suggestion this time," so a missing key never breaks
    // the app, just silently means no AI suggestions until the active provider's key is
    // configured.
    res.status(500).json({ error: 'Suggestions are not configured' });
    return;
  }

  const { today, profileSummary, triggeringTask } = req.body || {};
  if (!today || typeof today !== 'string' || !profileSummary || !triggeringTask) {
    res.status(400).json({ error: 'Missing today/profileSummary/triggeringTask' });
    return;
  }

  try {
    const result = await provider.call(apiKey, today, profileSummary, triggeringTask);
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
    res.status(500).json({ error: 'Suggestion proxy error', detail: String(err) });
  }
}
