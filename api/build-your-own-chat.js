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

// Bug fix (see CLAUDE.md) — "Sorry, something went wrong" firing when asked for the project's
// milestones. Root-caused by direct measurement against the LIVE endpoint (not guessed): a
// realistic request (a developed multi-turn conversation, a real-sized profile, and — after
// Improve Build Your Own's own Task 2 — a genuinely granular 30-40+ item milestones response)
// regularly took 8-11 real seconds end to end, with several individual attempts measured PAST 10
// seconds. This repo had no `vercel.json` and no per-function `config` anywhere, so every
// serverless function ran on whatever short default timeout the deployment's own plan/runtime
// applies — a request that legitimately takes this long is exactly the kind Vercel kills mid-flight
// on a default that short, which surfaces to the client as an ordinary failed fetch (indistinguishable
// from any other network error) → `onError` → the generic "something went wrong" message. This
// export is the standard, explicit way to raise a Vercel Node serverless function's own timeout
// without a vercel.json — 60s (the Hobby-plan ceiling, so this is safe regardless of which plan
// this project is actually on) is comfortably above every measured real duration with real margin,
// not a razor-thin fit.
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
      description: 'An ORDERED list of short, specific milestone titles capturing the REAL arc of the project as actually discussed (from kickoff through to completion) — not a generic template, and GENUINELY GRANULAR, not broad phases. Scale the count to the real complexity described: a small, narrow project might only need a handful, but a substantial, multi-month organizational project (e.g. founding an official chapter, running a competition, building a multi-person team) should produce 15-25+ distinct, concrete, operational milestones — one per real action (e.g. applying for official recognition, recruiting each individual leadership role separately, securing a specific partnership, planning actual event logistics, recruiting judges/participants), matching the level of specificity this app\'s own real opportunity chains already use (e.g. Register -> Prepare -> Practice -> Compete) as the reference point. Required (non-null, non-empty) when planReady is true. Must be null otherwise. Do not include dates or timing — just the titles, in the order they\'d happen.',
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
- DON'T DEFAULT TO ASSUMING INDEPENDENT IS MORE IMPRESSIVE: when the idea could plausibly be built either as a fully independent, unaffiliated project OR as an official chapter/campus affiliate of an established, well-structured external program (e.g. Hult Prize, DECA, Model UN, and similar), weigh BOTH paths fairly and explicitly raise the question with the student — do not steer them toward "independent" as if it were automatically the stronger or more impressive option. For a genuinely well-established, competitive, structured program, official affiliation is FREQUENTLY THE STRONGER choice, not the weaker one: it provides real organizational structure, external credibility, and (for competitive programs) a genuine path to real competition/recognition that a from-scratch independent project usually can't replicate on its own. Reason about this case by case, based on what the student is actually describing — never apply a blanket bias toward either path.
- PROACTIVELY SUGGEST CONCRETE DIFFERENTIATORS: don't just wait to be asked. Actively pitch specific ideas that would make the project more distinctive and evidenced — for example, a particular type of partnership (a relevant course, department, or organization) that would create a real, checkable outcome. Bring these up yourself as part of the natural conversation, not only in response to a direct question about it.
- The goal is a COMPLETE project concept, not just a one-line idea: a real sense of how it would start, what it would actually involve as it progresses through a few concrete stages, and how it would conclude.
- Only once that's genuinely been developed together, set planReady to true, and in that SAME response set projectName (a short, specific name) and milestones (see the milestones field's own description for how granular this needs to be — a substantial, multi-month project needs many distinct, concrete milestones, not a handful of broad phases). Don't set planReady prematurely — a single idea with no real arc yet is not ready.
- Even after planReady is true, keep talking naturally if the student wants to keep refining — you can update projectName/milestones again on a later turn if the plan changes.
- CRITICAL HONESTY RULE: never present a specific real external organization, contact, program, statistic, or fact about the outside world as confirmed/verified unless you are genuinely certain — if unsure, say so plainly. This applies equally to anything you proactively suggest under the "concrete differentiators" rule above, not just to things the student asks about directly. Set mentionsSpecificEntity to true ONLY when you introduce a genuinely NEW specific claim not already confirmed by the student's own profile data — referencing something already in their profile (even by real name), or giving purely generic advice, is NOT a new claim and should be false.
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
  // Bug fix (see CLAUDE.md) — a real, confirmed bug: this cap was 1500, copied from api/chat.js's
  // own general-assistant conversation, but a real brainstorming/consulting reply here (weighing
  // several project directions, explaining WHY one fits a college application better than
  // another) routinely runs longer — confirmed directly: a real live reply that legitimately
  // answered "which is strongest for my profile" came back at 1446 characters, just under the old
  // cap, while other genuinely equivalent replies on the same question ran past it and were
  // silently rejected here, surfacing to the student as a bare "Sorry, something went wrong" with
  // no indication why. Raised generously so a real, substantive reply is never rejected by this
  // check in ordinary use.
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 4000) return null;
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
      // Raised from 900, then again from 1600 (see the reply-length cap's own bug-fix comment
      // above, and Improve Build Your Own's own Task 2 — CLAUDE.md) — a longer, substantive reply
      // PLUS a genuinely granular milestones list (now scaled up to 15-25+ items for a substantial
      // project, not the original 3-7) needs real headroom; a tighter budget risks the tool call's
      // closing JSON getting cut off mid-array on exactly the dense, multi-month projects this
      // fix was meant to serve better.
      max_tokens: 2600,
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
  return { proposal: toolUse?.input, stopReason: data.stop_reason };
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
      // Raised from 900, then again from 1600 (see the Anthropic call's own comment above — same
      // reasoning, now also covering Improve Build Your Own's own Task 2 granular-milestones
      // scale-up). Reasoning tokens for a reasoning-tuned model are drawn from this SAME budget,
      // invisibly, before any visible output — 'low' effort (down from 'medium') leaves more of
      // this larger budget available for the actual reply/milestones, further reducing truncation
      // risk, at the cost of somewhat less deep reasoning per turn (an acceptable trade — a
      // truncated, failed response is strictly worse than a slightly less deeply-reasoned one).
      max_output_tokens: 2600,
      reasoning: { effort: 'low' },
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
      // `stopReason` (captured but not otherwise used) is worth keeping in the error body — a
      // genuinely truncated response (a real 'max_tokens'/'length' stop reason) is a different,
      // more useful signal than a bare "invalid" if this needs debugging again, and it carries no
      // sensitive information (just the provider's own completion-status string).
      res.status(502).json({ error: 'Model did not return a valid response', stopReason: result.stopReason ?? null });
      return;
    }

    res.status(200).json(applyGuardrails(proposal));
  } catch (err) {
    res.status(500).json({ error: 'Build Your Own chat proxy error', detail: String(err) });
  }
}
