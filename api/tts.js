// ElevenLabs Voice integration (see CLAUDE.md) — a Vercel serverless function, the ONLY place the
// real ElevenLabs API key ever exists. Read from a server-side environment variable
// (ELEVENLABS_API_KEY, set in the Vercel project's own dashboard/CLI — NEVER a `VITE_`-prefixed
// var, since Vite deliberately inlines every `VITE_*` var into the client bundle; a plain
// `ELEVENLABS_API_KEY` is only ever readable from `process.env` inside this server-side function,
// which never ships to the browser). This is the one deliberate, explicitly-requested exception
// to this app's own standing "no backend, static site only" constraint (see the top of
// CLAUDE.md) — every other part of the app stays a pure static site; this single endpoint is the
// sole server-side piece, and exists ONLY to keep a secret key off the client.
//
// The React app itself may be deployed to EITHER GitHub Pages (a purely static host with no
// serverless function support at all) or Vercel — this function lives at whatever URL Vercel
// serves this project from, and the client calls it via a plain cross-origin fetch regardless of
// where the frontend itself happens to be hosted (see src/utils/speech.js's own TTS_ENDPOINT).

// "Karma - Social Media Starlet" — Task 1's own exact, confirmed voice ID. Fixed to this one
// voice for every mascot line in the app; there's no per-request voice selection.
const VOICE_ID = '4BYplVmdmNPw4bhCsabh';

// A light, deliberately proportionate abuse guard, not a full auth system — this endpoint takes
// no credentials and charges real ElevenLabs usage per request, so a wide-open `*` CORS policy
// would let literally any site on the internet spend this project's own quota. Restricting to the
// real known origins this app is actually served from (the local Vite dev server, GitHub Pages,
// and this project's own Vercel domains) raises the bar for casual abuse without requiring a full
// auth system for what's still a prototype — a request forged outside a real browser (no Origin
// header, or a spoofed one) can still get through, which is an accepted, documented limitation
// here, the same "proportionate, not bulletproof" posture this app's other prototype-scoped
// tradeoffs already take (see the Vercel deploy-account issue's own note elsewhere in CLAUDE.md).
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/gigimanbigdur\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
];

function resolveAllowedOrigin(origin) {
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) return origin;
  return null;
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

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Fails honestly rather than pretending to work — the client's own graceful-fallback path
    // (speech.js) treats any non-200 response as "no audio this time," so a missing key never
    // breaks the app, just silently means dialogue text-only until the key is configured.
    res.status(500).json({ error: 'TTS is not configured' });
    return;
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!elevenRes.ok) {
      const detail = await elevenRes.text().catch(() => '');
      res.status(502).json({ error: 'ElevenLabs request failed', status: elevenRes.status, detail });
      return;
    }

    const audioBuffer = Buffer.from(await elevenRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: 'TTS proxy error', detail: String(err) });
  }
}
