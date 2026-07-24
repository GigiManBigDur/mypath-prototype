// AI-Generated Weekly Task Suggestions in the Digest View (see CLAUDE.md) — a standalone Vercel
// serverless function, NOT a mode flag on api/suggest.js, matching that file's own established
// "each Vercel function stays standalone" precedent. This is a genuinely different KIND of
// request from Stage 2's own single-task api/suggest.js: it proposes a SMALL SET of tasks at
// once (not one), it's triggered once per real calendar week (not once per completed task with a
// written outcome), and it has no single "triggeringTask" to reference at all — api/suggest.js's
// own handler actually requires one (`!triggeringTask` -> 400), so reusing it here wasn't an
// option even as a mode flag without changing that file's own existing contract.
//
// Mirrors api/suggest.js's structure closely: same CORS allowlist shape (duplicated, not shared,
// matching that file's own "each function is standalone" precedent), same dual-provider
// Anthropic/OpenAI dispatch via the SAME `AI_SUGGESTION_PROVIDER` env var (this feature needs no
// separate provider configuration — whichever provider is already active for Stage 2 suggestions
// answers this too), same forced-tool-call reliability approach, and the same code-enforced
// external-fact guardrail (applied per-task here, since a SET of tasks can each independently
// reference something specific).
export const config = {
  maxDuration: 60,
};

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

// A forced tool call returning an ARRAY of small tasks, not a single one — Task 1's own "generate
// a small set of suggested daily/recurring tasks for that week." Ensure Weekly AI Suggestions
// Cover Every Day, Including Weekends (see CLAUDE.md) — EXACTLY 7 items, one per real calendar day
// of the week (Monday through Sunday, no gaps), not the earlier 2-5-item "small set" this schema
// originally asked for: guaranteeing every single day gets at least one task requires at least 7
// total tasks, so the range was replaced outright rather than merely widened. The model is asked
// to order its 7 tasks Monday-first, but the actual day-to-date mapping is still decided entirely
// by the CLIENT (WeeklyTaskSuggestionPanel.jsx assigns task[i]'s real date as Monday-of-this-week
// + i days, i = 0..6) — the model's own ordering is a courtesy for a sensibly-themed week, not
// something the coverage guarantee depends on; a real per-item `date` from the model is still
// never used, same reasoning api/suggest.js's own header comment already documents. Each item
// keeps the exact same referencesExternalFact shape/meaning api/suggest.js's own TASK_SCHEMA
// already established, applied per-task here since a set can mix a purely generic suggestion
// ("Review your notes from this week") with one that does name something specific ("Look into
// the regional round's own eligibility rules").
const WEEKLY_TASKS_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      minItems: 7,
      maxItems: 7,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short, specific task title (not a full sentence) — a small, routine, recurring/daily-effort action (e.g. studying, practicing, reviewing), not a big milestone.' },
          rationale: { type: 'string', description: 'Exactly one sentence connecting this task to the student\'s own upcoming deadlines, current goals, or recent progress.' },
          referencesExternalFact: {
            type: 'boolean',
            description: 'True ONLY if this task introduces a genuinely NEW, specific, external claim — a real organization, program, award, competition tier, or contact — that is NOT already confirmed by the student\'s own data (an activity/opportunity/club already listed in profileSummary, or their own reported progress). False for a task that only builds on the student\'s own existing data or gives purely generic study/practice advice with no new named entity.',
          },
        },
        required: ['title', 'rationale', 'referencesExternalFact'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
};
const TOOL_NAME = 'propose_weekly_tasks';
const TOOL_DESCRIPTION = 'Propose exactly 7 realistic, routine daily/recurring tasks, one for each day of the student\'s upcoming week (Monday through Sunday).';

const SYSTEM_PROMPT = `You are a careful, conservative academic and career planning assistant embedded in a student's personalized roadmap app. This student's plan already tracks big milestones (application deadlines, competitions, exams) — your job is different: fill the gap between those milestones with a small, routine, day-to-day task for EVERY day of their upcoming week, including weekends (studying, practicing, reviewing, working steadily toward something already in progress).

Rules you must follow:
- Propose EXACTLY 7 tasks — one for each day of the week, Monday through Sunday, in that order (task 1 = Monday, task 2 = Tuesday, ..., task 7 = Sunday). Every single day needs its own task, with no gaps — Saturday and Sunday get real tasks too, not just weekdays (a lighter or more flexible task is fine for weekends, but never skip them).
- Each task should be a small, concrete, routine action — the kind of ongoing effort a student should be doing regularly, not another big milestone (those are already tracked elsewhere in the plan; don't duplicate them).
- Ground every task in the student's own real profile: reference their upcoming deadlines, current goals/activities, or recent progress from profileSummary. Don't invent generic advice disconnected from what's actually in their profile.
- Each task needs a short, specific title (not a full sentence) and exactly one sentence of rationale connecting it to something real in their profile.
- Do NOT propose a date for any task — the app assigns each of your 7 tasks to its own real calendar day (Monday through Sunday) based on your ordering alone.
- Set referencesExternalFact to true ONLY when a task introduces a genuinely NEW, specific, external claim — a real organization, program, award, competition tier, or contact — that isn't already confirmed by the student's own data. Referencing something already listed in profileSummary.activities (even by its real name) is NOT a new unverified claim — set this false in those cases. Only set it true when you name something specific the student would genuinely need to go verify themselves.
- Never propose anything that edits, removes, or replaces an existing task — only ever new, additional tasks.
- Call the propose_weekly_tasks tool exactly once with your full set of 7, and nothing else.`;

// Structural validation, shared by both providers — runs AFTER either one returns its own raw
// proposal, the one place the two implementations converge back onto a single code path.
function validateProposal(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.tasks)) return null;
  if (input.tasks.length !== 7) return null;

  const tasks = [];
  for (const task of input.tasks) {
    if (!task || typeof task !== 'object') return null;
    const { title, rationale, referencesExternalFact } = task;
    if (typeof title !== 'string' || !title.trim() || title.length > 150) return null;
    if (typeof rationale !== 'string' || !rationale.trim() || rationale.length > 500) return null;
    if (typeof referencesExternalFact !== 'boolean') return null;
    tasks.push({ title: title.trim(), rationale: rationale.trim(), referencesExternalFact });
  }
  return { tasks };
}

// Same external-fact guardrail as api/suggest.js, applied PER TASK — a set can mix a purely
// generic task with one that does name something specific, so each task's own rationale is
// independently checked/amended rather than gating the whole set on one flag.
function applyGuardrails(proposal) {
  return {
    tasks: proposal.tasks.map((task) => (task.referencesExternalFact
      ? { ...task, rationale: `${task.rationale} (Double-check this detail yourself — I can't independently verify external facts.)` }
      : task)),
  };
}

async function callAnthropic(apiKey, today, profileSummary) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      // Raised from 900 once the schema went from a 2-5-item "small set" to a fixed 7 items (see
      // WEEKLY_TASKS_SCHEMA's own comment) — real headroom for 7 titles+rationales in one
      // response, matching this app's own established "don't risk truncation, give it real room"
      // precedent from a prior, similar token-budget bug fix elsewhere in this file's sibling
      // functions.
      max_tokens: 1400,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: WEEKLY_TASKS_SCHEMA }],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [
        { role: 'user', content: JSON.stringify({ today, profileSummary }) },
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

async function callOpenAI(apiKey, today, profileSummary) {
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: JSON.stringify({ today, profileSummary }),
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: WEEKLY_TASKS_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      max_output_tokens: 1400,
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
    res.status(500).json({ error: 'Suggestions are not configured' });
    return;
  }

  const { today, profileSummary } = req.body || {};
  if (!today || typeof today !== 'string' || !profileSummary) {
    res.status(400).json({ error: 'Missing today/profileSummary' });
    return;
  }

  try {
    const result = await provider.call(apiKey, today, profileSummary);
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
