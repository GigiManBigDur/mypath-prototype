// AI Personalization, Stage 2: Basic Personalized Suggestions (see CLAUDE.md) — a Vercel
// serverless function, the ONLY place the real Anthropic API key ever exists. Read from a
// server-side environment variable (ANTHROPIC_API_KEY, set in the Vercel project's own dashboard/
// CLI — never a `VITE_`-prefixed var, since Vite deliberately inlines every `VITE_*` var into the
// client bundle). Mirrors api/tts.js's own structure exactly (same CORS allowlist shape, same
// "fail honestly, never expose the key" posture) — this is the SECOND deliberate, explicitly-
// requested exception to this app's own standing "no backend, static site only" constraint (see
// the top of CLAUDE.md), not a general backend.
//
// The client never talks to api.anthropic.com directly — it only ever calls this app's own
// /api/suggest proxy, the same "client calls the proxy, proxy calls the real API" shape
// speech.js/api/tts.js already established for ElevenLabs.

const MODEL = 'claude-sonnet-5';

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

// Task 3/5 — the model is asked to propose exactly ONE grounded, conservative task via a forced
// tool call (not free-text JSON parsing) — this is what makes the response structurally reliable
// without needing brittle prompt-based JSON extraction, the "build carefully, this sets the
// pattern Stage 3 builds on" instruction taken literally. `referencesExternalFact` is the model's
// own signal for Task 5's guardrail, enforced deterministically in code below (see
// `applyGuardrails`) rather than trusted to appear correctly in the model's own free-text
// rationale — a real guardrail should not depend on the model remembering to include it.
const PROPOSE_TASK_TOOL = {
  name: 'propose_task',
  description: 'Propose exactly one grounded, realistic next-step task for the student\'s academic/career plan.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'A short, specific task title (not a full sentence).' },
      date: { type: 'string', description: 'A realistic suggested due date, YYYY-MM-DD, relative to the real "today" provided.' },
      rationale: { type: 'string', description: 'Exactly one sentence connecting this suggestion to what the student just reported.' },
      referencesExternalFact: {
        type: 'boolean',
        description: 'True if this suggestion names a specific real organization, program, award, competition tier, or contact the student would need to independently verify. False otherwise.',
      },
    },
    required: ['title', 'date', 'rationale', 'referencesExternalFact'],
  },
};

const SYSTEM_PROMPT = `You are a careful, conservative academic and career planning assistant embedded in a student's personalized roadmap app. A student just marked one task complete and wrote a short note describing what actually happened. Using their overall profile and that specific outcome, propose exactly ONE realistic next-step task.

Rules you must follow:
- Keep the suggestion grounded and conservative: a realistic next step within something the student is ALREADY doing (the same club, competition, subject area, activity, or goal) — not an ambitious creative leap into something new or unrelated. That more ambitious kind of suggestion is a later, separate feature; this stage is deliberately simple and safe.
- The suggested date must be realistic and near-future relative to the real "today" date provided in the input — not vague, not implausibly far out with no reason.
- The rationale must be exactly one sentence, directly connecting the suggestion to what the student just reported (e.g. referencing their outcome note).
- Set referencesExternalFact to true whenever your suggestion names a specific real organization, program, award, competition tier, or contact the student would need to independently verify — otherwise false. Do not guess whether something is "probably fine to skip" — if in doubt, set it true.
- Never propose anything that edits, removes, or replaces an existing task — only ever one new, additional task.
- Call the propose_task tool exactly once with your proposal, and nothing else.`;

// Structural validation only — a real, parseable YYYY-MM-DD date and non-empty strings within a
// sane length. This does not try to police "is this date reasonable" beyond being a real date;
// the prompt itself is what asks for a realistic near-future one.
function validateProposal(input) {
  if (!input || typeof input !== 'object') return null;
  const { title, date, rationale, referencesExternalFact } = input;
  if (typeof title !== 'string' || !title.trim() || title.length > 150) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) return null;
  if (typeof rationale !== 'string' || !rationale.trim() || rationale.length > 500) return null;
  if (typeof referencesExternalFact !== 'boolean') return null;
  return {
    title: title.trim(),
    date,
    rationale: rationale.trim(),
    referencesExternalFact,
  };
}

// Task 5's own guardrail, enforced in code rather than trusted to the model's own prose — any
// suggestion referencing a real external fact ALWAYS carries this note, appended deterministically
// regardless of what the model itself wrote in `rationale`.
function applyGuardrails(proposal) {
  if (!proposal.referencesExternalFact) return proposal;
  return {
    ...proposal,
    rationale: `${proposal.rationale} (Double-check this detail yourself — I can't independently verify external facts.)`,
  };
}

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fails honestly rather than pretending to work — the client's own graceful-fallback path
    // treats any non-200 response as "no suggestion this time," so a missing key never breaks
    // the app, just silently means no AI suggestions until the key is configured.
    res.status(500).json({ error: 'Suggestions are not configured' });
    return;
  }

  const { today, profileSummary, triggeringTask } = req.body || {};
  if (!today || typeof today !== 'string' || !profileSummary || !triggeringTask) {
    res.status(400).json({ error: 'Missing today/profileSummary/triggeringTask' });
    return;
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        tools: [PROPOSE_TASK_TOOL],
        tool_choice: { type: 'tool', name: 'propose_task' },
        messages: [
          { role: 'user', content: JSON.stringify({ today, profileSummary, triggeringTask }) },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text().catch(() => '');
      res.status(502).json({ error: 'Anthropic request failed', status: anthropicRes.status, detail });
      return;
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content || []).find((block) => block.type === 'tool_use' && block.name === 'propose_task');
    const proposal = validateProposal(toolUse?.input);
    if (!proposal) {
      res.status(502).json({ error: 'Model did not return a valid proposal' });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Suggestion proxy error', detail: String(err) });
  }
}
