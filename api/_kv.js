// api/_kv.js — the durable, server-owned player store.
//
// One record per player holds the ledger:
//
//   player:{pid} → {
//     paidCredits,        // pixels paid for (DERIVED from creditedSessions) — server-owned
//     creditedSessions,   // { stripeSessionId: credits } already counted (anti-replay) — server-owned
//     revealed,           // { index: 'me' } — synced progression (best-effort durable)
//     myPixels, freePixels, wallpapers, raffles, raffleCodes, jackpots,
//     streak, dailyUsed, couponPct, completed,
//     email,              // captured silently from Stripe at checkout (recovery anchor)
//     createdAt, updatedAt
//   }
//
// Credits + creditedSessions are written ONLY by a verified Stripe payment
// (verify.js / webhook) or a verified restore — never from a browser sync.
//
// Backend is either real Upstash/Vercel KV (over REST, no extra deps) or, when
// LOCAL_DEV is set, an in-memory map so the whole flow runs offline.

// ── storage backend ──────────────────────────────────────────────────────────
const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const hasUpstash = () => Boolean(KV_URL && KV_TOKEN);
const useMemory = () => !hasUpstash() && Boolean(process.env.LOCAL_DEV);

// `true` whenever the player ledger can actually persist (real KV or local dev).
const kvConfigured = () => hasUpstash() || useMemory();

// In-memory store for local dev: key → { value, expires }
const _mem = new Map();
function _memValid(rec) {
  if (!rec) return null;
  if (rec.expires && Date.now() > rec.expires) return null;
  return rec.value;
}

async function _upstash(...cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd.map(String)),
  });
  if (!r.ok) throw new Error(`KV ${r.status}`);
  const data = await r.json();
  if (data && data.error) throw new Error(`KV ${data.error}`);
  return data ? data.result : null;
}

// String get/set (with optional TTL in seconds).
async function kvGet(key) {
  if (useMemory()) return _memValid(_mem.get(key));
  return _upstash('GET', key);
}
async function kvSet(key, value, ttlSec) {
  if (useMemory()) {
    _mem.set(key, { value, expires: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
    return;
  }
  if (ttlSec) await _upstash('SET', key, value, 'EX', ttlSec);
  else await _upstash('SET', key, value);
}
async function kvDel(key) {
  if (useMemory()) { _mem.delete(key); return; }
  await _upstash('DEL', key);
}
// Set (collection) add / read — used for the email → pids index.
async function kvSAdd(key, member) {
  if (useMemory()) {
    const cur = _memValid(_mem.get(key)) || [];
    if (!cur.includes(member)) cur.push(member);
    _mem.set(key, { value: cur, expires: 0 });
    return;
  }
  await _upstash('SADD', key, member);
}
async function kvSMembers(key) {
  if (useMemory()) return _memValid(_mem.get(key)) || [];
  return (await _upstash('SMEMBERS', key)) || [];
}

// ── player record helpers ────────────────────────────────────────────────────
const PLAYER_KEY = (pid) => `player:${pid}`;
const EMAIL_KEY = (email) => `pids:${String(email).toLowerCase()}`;

function freshPlayer() {
  const now = Date.now();
  return {
    paidCredits: 0,         // lifetime pixels bought (server-owned, from Stripe)
    paidRevealsUsed: 0,     // paid reveals consumed so far (cap: <= paidCredits)
    creditedSessions: {},
    revealed: {},           // server-owned 'me' reveals (community tiles stay client-only)
    myPixels: 0,
    freePixels: 0,          // spendable free-pixel balance (server-owned)
    wallpapers: 0,
    raffles: 0,
    raffleCodes: [],
    jackpots: 0,
    streak: 0,
    lastSpinDate: null,     // UTC day of last daily spin (server-enforced once/day)
    invited: false,         // one-time invite free pixel claimed
    couponPct: 0,
    completed: false,
    email: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Normalize older/partial records so callers can assume the shape above.
function normalize(p) {
  const f = freshPlayer();
  const out = { ...f, ...p };
  out.creditedSessions = out.creditedSessions || {};
  out.revealed = out.revealed || {};
  out.raffleCodes = out.raffleCodes || [];
  out.paidCredits = sumCredits(out.creditedSessions);
  return out;
}
function sumCredits(map) {
  return Object.values(map || {}).reduce((a, n) => a + (Number(n) || 0), 0);
}

async function getPlayer(pid) {
  if (!pid) return null;
  try {
    const raw = await kvGet(PLAYER_KEY(pid));
    if (!raw) return null;
    return normalize(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch (e) {
    return null;
  }
}

async function savePlayer(pid, player) {
  player.paidCredits = sumCredits(player.creditedSessions);
  player.updatedAt = Date.now();
  await kvSet(PLAYER_KEY(pid), JSON.stringify(player));
  return player;
}

const maxNum = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

// Sync the few cosmetic, non-economy flags the browser is allowed to set.
// Everything that affects the reveal budget — revealed, freePixels, credits,
// coupons, rewards — is server-owned and written only by /api/reveal, /api/spin,
// /api/invite, or a verified Stripe payment. The browser cannot grant itself
// pixels here.
async function syncProgression(pid, incoming) {
  const cur = (await getPlayer(pid)) || freshPlayer();
  const o = incoming || {};
  const merged = {
    ...cur,
    streak: maxNum(cur.streak, o.streak),
    completed: Boolean(cur.completed || o.completed),
  };
  return savePlayer(pid, merged);
}

// Idempotently credit a verified Stripe purchase. Safe to call from BOTH
// verify.js (on return) and the webhook — the session id de-dupes.
async function creditSession(pid, sessionId, credits, email) {
  if (!pid || !sessionId) return null;
  const player = (await getPlayer(pid)) || freshPlayer();
  if (!(sessionId in player.creditedSessions)) {
    player.creditedSessions[sessionId] = Number(credits) || 0;
  }
  if (email && !player.email) player.email = String(email).toLowerCase();
  await savePlayer(pid, player);

  // Maintain email → pids index so "restore purchases" can find every device
  // that bought under this email.
  if (email) {
    try { await kvSAdd(EMAIL_KEY(email), pid); } catch (e) {}
  }
  return player;
}

// Fold one or more source players INTO the target device's record. Unions the
// credited sessions (so paidCredits can't double-count), unions reveals, takes
// the best of every counter. Used by the restore flow.
async function mergeIntoPlayer(targetPid, sourcePids) {
  const target = (await getPlayer(targetPid)) || freshPlayer();
  for (const sid of sourcePids) {
    if (sid === targetPid) continue;
    const src = await getPlayer(sid);
    if (!src) continue;
    target.creditedSessions = { ...src.creditedSessions, ...target.creditedSessions };
    target.revealed = { ...src.revealed, ...target.revealed };
    target.myPixels = maxNum(target.myPixels, src.myPixels);
    target.freePixels = maxNum(target.freePixels, src.freePixels);
    target.wallpapers = maxNum(target.wallpapers, src.wallpapers);
    target.raffles = maxNum(target.raffles, src.raffles);
    target.jackpots = maxNum(target.jackpots, src.jackpots);
    target.streak = maxNum(target.streak, src.streak);
    target.completed = Boolean(target.completed || src.completed);
    target.raffleCodes = Array.from(
      new Set([...(target.raffleCodes || []), ...(src.raffleCodes || [])])
    );
    if (src.email && !target.email) target.email = src.email;
  }
  return savePlayer(targetPid, target);
}

module.exports = {
  kvConfigured,
  kvGet,
  kvSet,
  kvDel,
  kvSAdd,
  kvSMembers,
  freshPlayer,
  getPlayer,
  savePlayer,
  syncProgression,
  creditSession,
  mergeIntoPlayer,
  EMAIL_KEY,
};
