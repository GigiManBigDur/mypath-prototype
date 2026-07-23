// Build the Real "Ask MyPath AI Anything" Conversational Chat (see CLAUDE.md) — a THIRD, separate
// Vercel serverless function (alongside api/suggest.js's auto-triggered suggestions and
// api/creative-suggest.js's Project Builder "Build Your Own" ideation), matching this codebase's
// own established "each Vercel function stays standalone, never import from a sibling under
// api/" precedent. This is the general, open-ended, MULTI-TURN conversation behind the Hub's own
// "Ask MyPath AI anything" button — genuinely different from both of the above: it holds real
// conversation history across turns, can answer general questions about how the app itself works,
// and classifies whether the student is asking a plain question, asking to add a task, or asking
// for a project idea (in which case it redirects to Project Builder's "Build Your Own" rather than
// re-implementing that generation here — see Task 3's own explicit "don't duplicate two different
// implementations of the same underlying logic").
//
// Same security/cost/provider patterns every prior stage already established (Task 5-equivalent):
// same CORS allowlist shape, same dual-provider (Anthropic/OpenAI) dispatch via the SAME
// AI_SUGGESTION_PROVIDER env var, same forced-tool-call reliability approach, same server-side-
// enforced (not just prompt-trusted) honesty guardrail.
//
// There is no server-side conversation store (this app has no backend/database at all outside
// these narrow serverless exceptions) — the CLIENT holds the conversation and resends the full
// turn history on every request, which is what "history"/"prompt" below are for.

// Bug fix (see CLAUDE.md, api/build-your-own-chat.js's own detailed comment for the full
// diagnosis) — same latent risk here: no vercel.json/per-function config anywhere in this repo
// meant every AI-calling function ran on whatever short default timeout the deployment applies. A
// real multi-turn conversation with a full profile can legitimately take several seconds; this
// makes the ceiling explicit rather than leaving it to an implicit platform default.
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

// A concise, accurate summary of MyPath's own real features (Task 2 — "using its knowledge of
// MyPath's own real features") — written directly from this app's own real behavior, not
// invented. Kept in the system prompt (static, not sent per-request) so the model can answer
// "how does this work" questions correctly without needing this re-sent on every turn.
const APP_KNOWLEDGE = `MyPath is a student academic/career planning app. Here is how it actually works, so you can answer questions about it accurately:
- The Hub is the home screen. Tiles unlock as the student makes real progress: Survey first, then Careers of Interest, Related College Majors, Recommended Programs, Academic Plan, Your School List, Transcript & GPA / Course Selection (only for students at a real partner school), Opportunity Finder, and Project Builder.
- The Survey collects the student's interests, education level, grade/year, and current school.
- Discovery has 3 steps, each multi-select: Careers of Interest, Related College Majors, and Recommended Programs.
- Each recommended program shows a "Typical GPA" benchmark and a Reach/Match/Safety badge, comparing the student's own GPA to that benchmark: roughly, 0.3 or more above the benchmark is a Safety, within about 0.2 below is a Match, and more than 0.2 below is a Reach. This is a GPA-only estimate and does not account for essays, portfolios, or other real admissions factors.
- Transcript & GPA and Course Selection are only available for students at a real supported partner school, where they can log real grades and pick upcoming courses.
- Opportunity Finder surfaces real extracurricular/competition opportunities matched to the student's interests, each with its own prep steps and deadline.
- Project Builder lets a student start a hands-on project from a curated list of real project types, OR use "Build Your Own" to get a genuinely creative, AI-generated project idea based on their own real profile.
- The Academic Plan is the student's own visual roadmap: a central vertical timeline of required and optional tasks, with some tasks (like an opportunity or a project) branching off into their own diagonal step-by-step chain. Required tasks show as solid rings, optional ones as hollow rings, and AI-suggested tasks carry a small sparkle badge.
- When asked what to do next (or something similar), use the student's own real profile/progress data provided with this request — which steps are already done, what's still locked, what's coming up soon — to give a real, specific answer, not a generic one.`;

// Task 3's own honesty rule (identical in spirit to api/suggest.js's `referencesExternalFact` and
// api/creative-suggest.js's `mentionsSpecificEntity`) — the model self-reports, then the guardrail
// is enforced deterministically in code below, never trusted to the model's own prose alone.
const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Your natural, conversational reply to the student — this is exactly what gets shown and spoken aloud. Keep it warm, concise, and directly responsive to what they just said.',
    },
    intent: {
      type: 'string',
      enum: ['chat', 'propose_task', 'redirect_build_your_own'],
      description: '"chat" for a normal conversational answer (general questions, explaining how MyPath works, what to do next, or anything else). "propose_task" ONLY when the student is explicitly asking you to add/create a task or reminder on their plan — your reply must clearly PROPOSE it (e.g. "Want me to add this to your plan?") and never claim you already added it; the student confirms separately. "redirect_build_your_own" ONLY when the student is asking for a project idea or creative brainstorming — your reply should point them to Project Builder\'s "Build Your Own" feature rather than inventing a project idea yourself here.',
    },
    taskTitle: {
      type: ['string', 'null'],
      description: 'Required (non-null), a short specific task title, ONLY when intent is "propose_task". Must be null in every other case.',
    },
    mentionsSpecificEntity: {
      type: 'boolean',
      description: 'True ONLY if your reply introduces a genuinely NEW, specific real organization, program, contact, statistic, or outside-world fact that is NOT already confirmed by the student\'s own profile data (their own reported activities/opportunities, or something they themselves just told you). False otherwise — accurate statements about how MyPath itself works are NOT external facts; neither is referencing something already listed in the student\'s own profile (even a real club/program by name), or purely generic advice with no new named entity. Only set this true when you introduce a genuinely new, specific claim the student would need to independently verify.',
    },
  },
  required: ['reply', 'intent', 'taskTitle', 'mentionsSpecificEntity'],
  additionalProperties: false,
};
const TOOL_NAME = 'respond_to_student';
const TOOL_DESCRIPTION = "Respond to the student's message in an ongoing conversation, classifying whether it's a normal chat reply, a task-add proposal, or a redirect to Build Your Own.";

const SYSTEM_PROMPT = `You are MyPath's own in-app assistant, talking directly with a student inside their personalized academic/career planning app. This is an ongoing, multi-turn conversation — use the FULL conversation history for real context, not just the latest message in isolation.

${APP_KNOWLEDGE}

Rules you must follow:
- Answer general questions about how MyPath works accurately, using the real feature knowledge above.
- When asked what to do next (or similar), use the student's own real profile/progress data (provided with this request) to give a specific, real answer.
- If the student is explicitly asking you to add/create a task or reminder to their plan, set intent to "propose_task", set taskTitle to a short specific title, and phrase your reply as a clear proposal — never claim you've already added it.
- If the student is asking for a project idea or creative brainstorming, set intent to "redirect_build_your_own" and point them to Project Builder's "Build Your Own" feature in your reply, rather than inventing a project idea yourself.
- For everything else, set intent to "chat" and just answer naturally and helpfully.
- CRITICAL HONESTY RULE: never present a specific real external organization, contact, program, statistic, or fact about the outside world as confirmed/verified unless you are genuinely certain — if unsure, say so plainly. Set mentionsSpecificEntity to true ONLY when you introduce a genuinely NEW specific claim not already confirmed by the student's own profile data — referencing the student's own reported activities/opportunities (even by real name), or giving purely generic advice, is NOT a new claim and should be set false.
- Call the respond_to_student tool exactly once with your response, and nothing else.`;

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
  const { reply, intent, taskTitle, mentionsSpecificEntity } = input;
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 1500) return null;
  if (!['chat', 'propose_task', 'redirect_build_your_own'].includes(intent)) return null;
  if (intent === 'propose_task' && (typeof taskTitle !== 'string' || !taskTitle.trim() || taskTitle.length > 150)) return null;
  if (typeof mentionsSpecificEntity !== 'boolean') return null;
  return {
    reply: reply.trim(),
    intent,
    taskTitle: intent === 'propose_task' ? taskTitle.trim() : null,
    mentionsSpecificEntity,
  };
}

// The one code-enforced guardrail — never trusted to the model's own prose alone.
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
      max_tokens: 800,
      // Between Stage 2's grounded 0.4 and Build Your Own's creative 0.9 — this needs to be
      // accurate/helpful (general app help, real progress data) but still read as a natural,
      // conversational reply, not a rigid one.
      temperature: 0.6,
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

// Same OpenAI Responses API shape every prior stage already established (flat, non-nested tool
// entries; `output` array parsing; `reasoning.effort` instead of `temperature`, since GPT-5.6
// Terra is a reasoning model and rejects `temperature` outright). `input` here is an ARRAY of
// role/content turns (the Responses API accepts this, not just a plain string) — this is what
// actually carries real multi-turn context, not a single opaque JSON blob.
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
      max_output_tokens: 800,
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
    res.status(500).json({ error: 'Chat is not configured' });
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
    res.status(500).json({ error: 'Chat proxy error', detail: String(err) });
  }
}
