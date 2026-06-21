// dev-server.js — local end-to-end harness (no Vercel, no Stripe, no Upstash).
//
//   node dev-server.js   →   http://localhost:3000
//
// It serves the static game and runs the REAL ledger/restore functions against
// an in-memory KV (LOCAL_DEV=1). Stripe is mocked: "checkout" bounces straight
// back as a paid return, and "verify" credits the ledger — so you can play, pay,
// clear the cache, and restore by email without any external accounts.
//
// The restore code is printed to THIS console (no email provider needed).
process.env.LOCAL_DEV = '1';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-do-not-ship';

const http = require('http');
const fs = require('fs');
const path = require('path');

const { ensurePid } = require('./api/_session');
const { creditSession } = require('./api/_kv');

// Real serverless handlers (these don't import stripe, so they load fine here).
const handlers = {
  '/api/session': require('./api/session'),
  '/api/state': require('./api/state'),
  '/api/restore': require('./api/restore'),
  '/api/reveal': require('./api/reveal'),
  '/api/spin': require('./api/spin'),
  '/api/invite': require('./api/invite'),
};

// Mocked Stripe: same catalog the real checkout.js uses.
const CATALOG = {
  single:      { credits: 1,  kind: 'single' },
  single_half: { credits: 1,  kind: 'single' },
  p5:          { credits: 6,  kind: 'bundle' },
  p12:         { credits: 14, kind: 'bundle' },
  p25:         { credits: 30, kind: 'bundle' },
};
const fakeSessions = new Map();
const DEV_EMAIL = 'dev@unveil.test';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

// Give the Node res a Vercel-style .status().json()
function shim(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ── API ────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    shim(res);
    req.query = Object.fromEntries(url.searchParams.entries());
    if (req.method === 'POST') req.body = await readBody(req);

    if (pathname === '/api/checkout') {
      const pack = (req.body || {}).pack;
      const item = CATALOG[pack];
      if (!item) return res.status(400).json({ error: 'unknown pack' });
      const pid = ensurePid(req, res); // sets the device cookie
      const sid = 'demo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      fakeSessions.set(sid, { pid, credits: item.credits, kind: item.kind });
      // jump to the confirmation page as if Stripe approved the payment
      return res.status(200).json({ url: `/paid.html?unveil_session=${sid}` });
    }

    if (pathname === '/api/verify') {
      const sid = req.query.session;
      const s = fakeSessions.get(sid);
      if (!s) return res.status(200).json({ paid: false });
      const player = await creditSession(s.pid, sid, s.credits, DEV_EMAIL);
      return res.status(200).json({ paid: true, kind: s.kind, credits: s.credits, paidCredits: player.paidCredits });
    }

    const handler = handlers[pathname];
    if (handler) return handler(req, res);
    return res.status(404).json({ error: 'not found' });
  }

  // ── static files ─────────────────────────────────────────────────────────────
  let rel = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(__dirname, decodeURIComponent(rel));
  if (!file.startsWith(__dirname)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`UNVEIL dev server → http://localhost:${PORT}`);
  console.log(`(in-memory ledger; restore email/codes print here; dev checkout email = ${DEV_EMAIL})`);
});
