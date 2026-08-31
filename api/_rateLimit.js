// Pre-Public-Sharing Confidentiality Check (see CLAUDE.md), Task 5 — a lightweight, honest per-IP
// rate limiter shared by every real AI/voice function under api/. A deliberate, proportionate
// deterrent against casual/accidental abuse (a link shared further than intended getting hit
// repeatedly), not a bulletproof distributed rate limiter — its real, known limitations are
// documented below rather than glossed over. `_rateLimit.js` (leading underscore) is Vercel's
// own convention for a helper module under api/ that never becomes its own routable endpoint.
//
// Implementation: a plain in-memory Map, scoped to whichever function's own module imports it.
// Each api/*.js file is bundled and deployed as its own INDEPENDENT serverless function, so
// importing this helper into all 8 of them naturally gives each one its own separate counters —
// a burst of TTS calls (fired on nearly every mascot dialogue line) never eats into a visitor's
// budget for /api/chat, and vice versa.
//
// Real, known limitations, honestly documented rather than overstated as a real fix:
//   - Resets on a cold start (a fresh function instance starts with an empty Map). Fluid Compute
//     reuses warm instances across requests, so this holds up reasonably well in the common case,
//     but a cold start — or Vercel scaling this function out to a genuinely new instance under
//     real concurrent load — resets that ONE instance's own counters.
//   - NOT shared across multiple concurrent instances — under a real burst of concurrent traffic,
//     each instance tracks its own counters independently, so the effective ceiling under heavy
//     concurrent load is higher than `maxRequests` alone would suggest.
//   - Trivially defeated by an attacker rotating IPs or spoofing X-Forwarded-For.
// None of this makes it worthless — it stops the realistic case this was actually built for (one
// link, shared further than intended, hit repeatedly from a small number of real sources) — it
// just isn't a substitute for real spend caps set directly in the Anthropic/OpenAI/ElevenLabs
// account dashboards, which is where the actual, unbounded financial exposure lives regardless of
// anything app-side.
const buckets = new Map();

// Sweeps stale entries out of the Map occasionally so a long-lived warm instance can't grow this
// without bound — cheap, since it only runs once every CLEANUP_INTERVAL_MS, not on every request.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > CLEANUP_INTERVAL_MS) buckets.delete(key);
  }
}

function resolveClientIp(req) {
  // Vercel sets this on every request; a comma-separated list when there's a proxy chain, with
  // the real client first.
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// checkRateLimit(req, { windowMs, maxRequests }) -> { allowed, retryAfterSeconds }
// Fixed-window counter, not a sliding one — simpler, and precise enough for a deterrent rather
// than a strict quota. Each call increments the current window's count for this IP; once that
// count exceeds `maxRequests` for the rest of the window, every further call from that IP is
// rejected until the window rolls over.
export function checkRateLimit(req, { windowMs = 5 * 60 * 1000, maxRequests = 30 } = {}) {
  const now = Date.now();
  cleanup(now);

  const ip = resolveClientIp(req);
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;

  if (bucket.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
