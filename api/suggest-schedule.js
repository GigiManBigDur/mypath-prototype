// Add a Daily Schedule Feature (AI-Assisted + Fully Manual) (see CLAUDE.md) — a standalone Vercel
// serverless function, NOT a mode flag on api/suggest.js or api/suggest-weekly.js, matching this
// app's own established "each Vercel function stays standalone" precedent. Genuinely different
// from both: it proposes a full DAY's time-blocked schedule (start/end times, not just dates), is
// entirely student-initiated (Task 2's own explicit "not automatic" — there's no once-per-day
// trigger the way the weekly suggestion feature has), and has no single "triggeringTask" either.
//
// Mirrors api/suggest-weekly.js's structure closely: same CORS allowlist shape (duplicated, not
// shared, matching every sibling function's own precedent), same dual-provider Anthropic/OpenAI
// dispatch via the SAME `AI_SUGGESTION_PROVIDER` env var (no separate provider configuration
// needed), same forced-tool-call reliability approach, and the same code-enforced external-fact
// guardrail (applied per-block, since a full day's worth of blocks could mix purely routine ones
// with one that does name something specific).
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
function dayNameFor(dateStr) {
  return DAY_NAMES[new Date(`${dateStr}T00:00:00`).getDay()];
}

// A forced tool call returning a full day's worth of time blocks. `linkedTaskId` is the real
// connection to Task 4's own linkage requirement: the client sends the student's REAL tasks/
// opportunities due that specific day (each with its own real spine-item `id`), and the model is
// asked to set this to that exact `id` whenever a block IS one of those real items — never
// inventing a new id, never guessing one that wasn't provided. Time fields are plain 24-hour
// `HH:MM` strings — the exact format `<input type="time">` (this app's own manual block-editing
// UI) already produces/accepts, so no separate time-parsing layer was needed on either side.
const SCHEDULE_SCHEMA = {
  type: 'object',
  properties: {
    blocks: {
      type: 'array',
      minItems: 4,
      maxItems: 14,
      items: {
        type: 'object',
        properties: {
          startTime: { type: 'string', description: '24-hour time in HH:MM format, e.g. "08:00".' },
          endTime: { type: 'string', description: '24-hour time in HH:MM format, e.g. "15:00". Must be later than startTime.' },
          title: { type: 'string', description: 'A short label for this time block, e.g. "School" or "Robotics Club practice".' },
          linkedTaskId: {
            type: ['string', 'null'],
            description: 'If this block corresponds to one of the real tasks/opportunities listed in dueTasks, set this to that task\'s exact "id" field. Otherwise null — never invent an id that wasn\'t provided.',
          },
          referencesExternalFact: {
            type: 'boolean',
            description: 'True ONLY if this block introduces a genuinely NEW, specific, external claim — a real organization, program, or specific detail — that is NOT already confirmed by the student\'s own data (profileSummary or the provided dueTasks list). False for a routine block (school, meals, homework, free time) or one that only reflects something already in the student\'s own data.',
          },
        },
        required: ['startTime', 'endTime', 'title', 'linkedTaskId', 'referencesExternalFact'],
        additionalProperties: false,
      },
    },
  },
  required: ['blocks'],
  additionalProperties: false,
};
const TOOL_NAME = 'propose_daily_schedule';
const TOOL_DESCRIPTION = 'Propose a realistic, full time-blocked schedule for one specific day.';

function buildSystemPrompt(dayName, hasDueTasks) {
  return `You are a careful, conservative academic and career planning assistant embedded in a student's personalized roadmap app. Propose a realistic, time-blocked schedule for a single day (${dayName}) — a list of time blocks covering a normal day from roughly wake-up to a reasonable bedtime, in the same spirit as "8:00 AM-3:00 PM: School" or "3:15-4:30 PM: Robotics Club".

Rules you must follow:
- This app does NOT collect the student's real school start/end times or a real daily routine — you don't have that specific data. Use a common-sense, realistic DEFAULT school day (roughly 8:00 AM-3:00 PM) as a block unless the student's own profile clearly suggests otherwise (e.g. they're not in high school). This is a reasonable general assumption, not a fabricated specific fact about THIS student, so it does not need the external-fact guardrail.
- ${hasDueTasks ? 'The dueTasks list contains REAL tasks/opportunities actually due this day — work each one into the schedule as its own realistic block (e.g. dedicated time to work on it), and set that block\'s linkedTaskId to the task\'s own exact "id" from that list.' : 'No specific tasks are due this particular day — build a reasonable, routine day around school/activities/homework/free time without inventing specific deadlines that don\'t exist.'}
- Fill out a genuinely full day: school (or the student's equivalent), any due tasks, homework/study time, meals, and reasonable free time or downtime — not just 2-3 sparse blocks.
- Every block needs a start time and end time (24-hour HH:MM), a short specific title, and times that make sense in sequence (no overlapping blocks).
- Set referencesExternalFact to true ONLY when a block introduces a genuinely NEW, specific, external claim not already confirmed by the student's own data. Set linkedTaskId to null for any block that is NOT one of the exact real tasks provided.
- Never propose anything that edits, removes, or replaces an existing task — this is only a proposed SCHEDULE (when things happen), not a change to the plan's own task list.
- Call the propose_daily_schedule tool exactly once with your full day's blocks, and nothing else.`;
}

function validateProposal(input, validTaskIds) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.blocks)) return null;
  if (input.blocks.length < 4 || input.blocks.length > 14) return null;

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const blocks = [];
  for (const block of input.blocks) {
    if (!block || typeof block !== 'object') return null;
    const { startTime, endTime, title, linkedTaskId, referencesExternalFact } = block;
    if (typeof startTime !== 'string' || !timePattern.test(startTime)) return null;
    if (typeof endTime !== 'string' || !timePattern.test(endTime)) return null;
    if (endTime <= startTime) return null;
    if (typeof title !== 'string' || !title.trim() || title.length > 150) return null;
    if (typeof referencesExternalFact !== 'boolean') return null;
    const hasLinkedId = typeof linkedTaskId === 'string' && linkedTaskId.trim().length > 0;
    // A linkedTaskId that doesn't match one of the REAL ids provided this request is treated as
    // unlinked rather than rejecting the whole proposal — the same "don't guess, fall back to the
    // honest option" posture this app's other AI-linkage features already established.
    const resolvedLinkedId = hasLinkedId && validTaskIds.has(linkedTaskId.trim()) ? linkedTaskId.trim() : null;
    blocks.push({
      startTime, endTime, title: title.trim(), referencesExternalFact, linkedTaskId: resolvedLinkedId,
    });
  }
  blocks.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  return { blocks };
}

// Same external-fact guardrail as every sibling AI-suggestion function, applied PER BLOCK. Blocks
// have no natural "rationale" sentence the way a task suggestion does, so the guardrail lands in
// its own dedicated `note` field (only ever present when actually needed) rather than being
// crammed into the short block title — the client renders it as a small caveat under the block
// instead.
function applyGuardrails(proposal) {
  return {
    blocks: proposal.blocks.map((block) => (block.referencesExternalFact
      ? { ...block, note: "Double-check this detail yourself — I can't independently verify external facts." }
      : block)),
  };
}

async function callAnthropic(apiKey, date, dueTasks, profileSummary, systemPrompt) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1800,
      temperature: 0.5,
      system: systemPrompt,
      tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, input_schema: SCHEDULE_SCHEMA }],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [
        { role: 'user', content: JSON.stringify({ date, dueTasks, profileSummary }) },
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

async function callOpenAI(apiKey, date, dueTasks, profileSummary, systemPrompt) {
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: systemPrompt,
      input: JSON.stringify({ date, dueTasks, profileSummary }),
      tools: [{ type: 'function', name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: SCHEDULE_SCHEMA, strict: true }],
      tool_choice: { type: 'function', name: TOOL_NAME },
      max_output_tokens: 1800,
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

  const { date, dueTasks, profileSummary } = req.body || {};
  if (!date || typeof date !== 'string' || !profileSummary || !Array.isArray(dueTasks)) {
    res.status(400).json({ error: 'Missing date/dueTasks/profileSummary' });
    return;
  }

  const validTaskIds = new Set(dueTasks.map((t) => t && t.id).filter(Boolean));
  const systemPrompt = buildSystemPrompt(dayNameFor(date), dueTasks.length > 0);

  try {
    const result = await provider.call(apiKey, date, dueTasks, profileSummary, systemPrompt);
    if (result.error) {
      res.status(result.error.status).json(result.error.body);
      return;
    }

    const proposal = validateProposal(result.proposal, validTaskIds);
    if (!proposal) {
      res.status(502).json({ error: 'Model did not return a valid proposal' });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Suggestion proxy error', detail: String(err) });
  }
}
