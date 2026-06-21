// api/_session.js — implicit device identity (Tier 0).
// On first contact we mint a random player id (`pid`) and put it in a signed,
// httpOnly, 1st-party cookie. No login, no UI — the player just IS this pid.
// The signature (HMAC over the pid with SESSION_SECRET) stops a browser from
// forging another player's id to read their ledger.
const crypto = require('crypto');

const COOKIE = 'unveil_pid';
const ONE_YEAR = 60 * 60 * 24 * 365;
const SECRET = process.env.SESSION_SECRET || '';

function sign(pid) {
  if (!SECRET) return ''; // unsigned fallback if no secret is configured
  return crypto.createHmac('sha256', SECRET).update(pid).digest('base64url');
}

// constant-time compare so signature checks don't leak via timing
function safeEqual(a, b) {
  const ba = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

// Returns a valid pid from the cookie, or null if missing/tampered.
function readPid(req) {
  const raw = parseCookies(req)[COOKIE];
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot === -1) {
    // unsigned cookie — only honor it when no secret is configured
    return SECRET ? null : raw;
  }
  const pid = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!SECRET) return pid;
  return safeEqual(sig, sign(pid)) ? pid : null;
}

function setPidCookie(res, pid) {
  const value = SECRET ? `${pid}.${sign(pid)}` : pid;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(value)}; Max-Age=${ONE_YEAR}; Path=/; ` +
      `HttpOnly; Secure; SameSite=Lax`
  );
}

// Read the caller's pid, minting + setting a fresh one if absent/invalid.
function ensurePid(req, res) {
  let pid = readPid(req);
  if (!pid) {
    pid = crypto.randomUUID();
    setPidCookie(res, pid);
  }
  return pid;
}

module.exports = { COOKIE, readPid, ensurePid, setPidCookie };
