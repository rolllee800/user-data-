const ALLOWED_FIELDS = [
  'rawUa', 'os', 'device', 'model', 'browser', 'browserVersion',
  'deviceType', 'platformVersion', 'screenWidth', 'screenHeight',
  'language', 'timestamp'
];

const MAX_PAYLOAD_SIZE = 2048; // 2 KB
const RATE_LIMIT_WINDOW = 10000; // 10 seconds

// In-memory store for rate limiting (per session - resets on cold start)
const recentRequests = new Map();

function validatePayload(body) {
  if (!body || typeof body !== 'object') return false;

  // Check size
  const jsonString = JSON.stringify(body);
  if (jsonString.length > MAX_PAYLOAD_SIZE) return false;

  // Check only allowed fields
  const keys = Object.keys(body);
  for (const key of keys) {
    if (!ALLOWED_FIELDS.includes(key)) return false;
  }

  // Validate required fields exist and are strings/numbers
  if (typeof body.rawUa !== 'string') return false;
  if (typeof body.os !== 'string') return false;
  if (typeof body.device !== 'string') return false;
  if (typeof body.model !== 'string') return false;
  if (typeof body.browser !== 'string') return false;
  if (typeof body.browserVersion !== 'string') return false;
  if (typeof body.deviceType !== 'string') return false;
  if (body.platformVersion !== null && typeof body.platformVersion !== 'string') return false;
  if (typeof body.screenWidth !== 'number') return false;
  if (typeof body.screenHeight !== 'number') return false;
  if (typeof body.language !== 'string') return false;
  if (typeof body.timestamp !== 'string') return false;

  return true;
}

function sanitizePayload(body) {
  const clean = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      clean[field] = body[field];
    }
  }
  return clean;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const lastRequest = recentRequests.get(ip);
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return false;
  }
  recentRequests.set(ip, now);
  // Cleanup old entries
  for (const [key, time] of recentRequests.entries()) {
    if (now - time > RATE_LIMIT_WINDOW * 2) {
      recentRequests.delete(key);
    }
  }
  return true;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting (but don't store it)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limited' });
  }

  let body;
  try {
    body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!validatePayload(body)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const clean = sanitizePayload(body);

  // Log to console for Supabase (or other storage)
  console.log('UA_LOG:', JSON.stringify(clean));

  return res.status(200).json({ ok: true });
}