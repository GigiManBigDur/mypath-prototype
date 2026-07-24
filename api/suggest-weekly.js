// AI-Generated Weekly Task Suggestions in the Digest View (see CLAUDE.md) — a standalone Vercel
// serverless function, NOT a mode flag on api/suggest.js, matching that file's own established
// "each Vercel function stays standalone" precedent. This is a genuinely different KIND of
// request from Stage 2's own single-task api/suggest.js: it proposes a SET of tasks at once (not
// one), it's triggered once per real calendar week (not once per completed task with a written
// outcome), and it has no single "triggeringTask" to reference at all — api/suggest.js's own
// handler actually requires one (`!triggeringTask` -> 400), so reusing it here wasn't an option
// even as a mode flag without changing that file's own existing contract.
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Fix: Weekly Suggestions Generating Already-Passed Days (see CLAUDE.md) — the previous version
// always asked for 7 tasks spanning the WHOLE week regardless of what day "today" actually is, so
// a student opening this mid-week saw tasks dated earlier in the week already marked overdue on
// first sight. The real fix is to only ever generate tasks for days that are still AHEAD of
// today — this pair of functions is the one place that's computed, from the exact same `today`
// string the client already sends (parsed as local midnight, matching every other 'YYYY-MM-DD'
// parse in this app's own client-side date utilities).
//
// Anchor Weekly Task Generation to Sunday (see CLAUDE.md) — the week itself is now Sunday-through-
// Saturday (matching utils/dates.js's own `startOfWeekSunday()` on the client, which the trigger's
// own "which week is this" identity check reads), not the earlier Monday-through-Sunday framing.
// `getDay()`: 0=Sunday, 1=Monday, ..., 6=Saturday — Sunday is now the FIRST day of the week, not
// the last, so "days remaining" (today through this week's own Saturday, inclusive) is simply
// `7 - day`: Sunday -> 7 (the whole week — Sunday itself is where a fresh week's generation
// naturally happens), Tuesday -> 5, Saturday -> 1 (just today — the last possible day of that
// week). No special-casing needed for either endpoint, unlike the old Monday-anchored version.
function daysUntilEndOfWeek(todayStr) {
  const day = new Date(`${todayStr}T00:00:00`).getDay();
  return 7 - day;
}
function remainingDayNames(todayStr, count) {
  const startDay = new Date(`${todayStr}T00:00:00`).getDay();
  return Array.from({ length: count }, (_, i) => DAY_NAMES[(startDay + i) % 7]);
}

// A forced tool call returning an ARRAY of small tasks, not a single one — Task 1's own "generate
// a small set of suggested daily/recurring tasks for that week." Ensure Weekly AI Suggestions
// Cover Every Day, Including Weekends (see CLAUDE.md) established "exactly one task per day, no
// gaps" as the real requirement; the fix above narrows WHICH days that applies to (today through
// the end of this week, never a day that's already passed), so the exact task count is no longer
// a fixed 7 — it's `daysUntilEndOfWeek(today)`, computed fresh per request and built into the
// schema/prompt dynamically (see buildWeeklyTasksSchema/buildSystemPrompt below) rather than a
// static module-level constant. The model is still asked to order its tasks starting from today,
// but the actual day-to-date mapping is decided entirely by the CLIENT
// (WeeklyTaskSuggestionPanel.jsx assigns task[i]'s real date as today + i days) — the model's own
// ordering is a courtesy for a sensibly-themed remaining week, not something the coverage
// guarantee depends on; a real per-item `date` from the model is still never used, same reasoning
// api/suggest.js's own header comment already documents. Each item keeps the exact same
// referencesExternalFact shape/meaning api/suggest.js's own TASK_SCHEMA already established.
function buildWeeklyTasksSchema(count) {
  return {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        minItems: count,
        maxItems: count,
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
}
const TOOL_NAME = 'propose_weekly_tasks';
function buildToolDescription(count) {
  return `Propose exactly ${count} realistic, routine daily/recurring tasks, one for each remaining day of the student's current week (today through Saturday).`;
}

function buildSystemPrompt(count, dayNames) {
  const dayList = dayNames.join(', ');
  return `You are a careful, conservative academic and career planning assistant embedded in a student's personalized roadmap app. This student's plan already tracks big milestones (application deadlines, competitions, exams) — your job is different: fill the gap between those milestones with a small, routine, day-to-day task for each REMAINING day of their current week (studying, practicing, reviewing, working steadily toward something already in progress).

Rules you must follow:
- Propose EXACTLY ${count} tasks — one for each of these remaining days, in this exact order: ${dayList}. Do NOT generate tasks for any day that has already passed this week — only today and the days still ahead of it, through Saturday. Every one of these remaining days needs its own task, with no gaps — if a weekend day (Saturday or Sunday) is in this list, it needs a real task too (a lighter or more flexible one is fine, but never skip it).
- Each task should be a small, concrete, routine action — the kind of ongoing effort a student should be doing regularly, not another big milestone (those are already tracked elsewhere in the plan; don't duplicate them).
- Ground every task in the student's own real profile: reference their upcoming deadlines, current goals/activities, or recent progress from profileSummary. Don't invent generic advice disconnected from what's actually in their profile.
- Each task needs a short, specific title (not a full sentence) and exactly one sentence of rationale connecting it to something real in their profile.
- Do NOT propose a date for any task — the app assigns each of your ${count} tasks to its own real remaining calendar day, in the order listed above, based on your ordering alone.
- Set referencesExternalFact to true ONLY when a task introduces a genuinely NEW, specific, external claim — a real organization, program, award, competition tier, or contact — that isn't already confirmed by the student's own data. Referencing something already listed in profileSummary.activities (even by its real name) is NOT a new unverified claim — set this false in those cases. Only set it true when you name something specific the student would genuinely need to go verify themselves.
- Never propose anything that edits, removes, or replaces an existing task — only ever new, additional tasks.
- Call the propose_weekly_tasks tool exactly once with your full set of ${count}, and nothing else.`;
}

// Structural validation, shared by both providers — runs AFTER either one returns its own raw
// proposal, the one place the two implementations converge back onto a single code path.
// `expectedCount` is now a per-request value (days remaining in the current week), not a fixed 7.
function validateProposal(input, expectedCount) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.tasks)) return null;
  if (input.tasks.length !== expectedCount) return null;

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

async function callAnthropic(apiKey, today, profileSummary, schema, toolDescription, systemPrompt) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      // Real headroom for up to 7 titles+rationales in one response, matching this app's own
      // established "don't risk truncation, give it real room" precedent from a prior, similar
      // token-budget fix elsewhere in this file's sibling functions — kept at this same size even
      // now that the count can be smaller than 7 (a shorter request never needs MORE room).
      max_tokens: 1400,
      temperature: 0.5,
      system: systemPrompt,
      tools: [{ name: TOOL_NAME, description: toolDescription, input_schema: schema }],
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

async function callOpenAI(apiKey, today, profileSummary, schema, toolDescription, systemPrompt) {
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: systemPrompt,
      input: JSON.stringify({ today, profileSummary }),
      tools: [{ type: 'function', name: TOOL_NAME, description: toolDescription, parameters: schema, strict: true }],
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

  const daysRemaining = daysUntilEndOfWeek(today);
  const dayNames = remainingDayNames(today, daysRemaining);
  const schema = buildWeeklyTasksSchema(daysRemaining);
  const toolDescription = buildToolDescription(daysRemaining);
  const systemPrompt = buildSystemPrompt(daysRemaining, dayNames);

  try {
    const result = await provider.call(apiKey, today, profileSummary, schema, toolDescription, systemPrompt);
    if (result.error) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    const proposal = validateProposal(result.proposal, daysRemaining);
    if (!proposal) {
      res.status(502).json({ error: 'Model did not return a valid proposal' });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Suggestion proxy error', detail: String(err) });
  }
}
