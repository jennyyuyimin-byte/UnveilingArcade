// game-sync.jsx — client side of the implicit-identity ledger (Tiers 0–2).
// Exports window.GameSync.
//
// There is no login. On load we hit /api/session (the server mints a signed,
// httpOnly device-pid cookie on first visit), then GET /api/state to restore the
// player's durable save — revealed pixels, rewards, and paid allowance — into the
// local store. As the player plays, push() syncs progression back up (debounced).
//
// Paid credits + which Stripe sessions were credited are written ONLY by the
// server on a verified payment; the browser never gets to grant itself pixels.
// If /api isn't reachable (in-app preview) or KV isn't configured, everything
// degrades to the existing localStorage-only behavior.

const _SYNC = { persisted: {}, timers: {}, ready: {} };

// Merge a server player record into the local store without losing anything
// the player just did locally: union reveals, take the max of counters, OR the
// flags, union the code/session lists.
function _mergeServerIntoLocal(set, player) {
  if (!player) return;
  set((s) => {
    const revealed = { ...(player.revealed || {}), ...(s.revealed || {}) };
    const num = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
    return {
      ...s,
      revealed,
      myPixels: num(s.myPixels, player.myPixels),
      freePixels: num(s.freePixels, player.freePixels),
      wallpapers: num(s.wallpapers, player.wallpapers),
      raffles: num(s.raffles, player.raffles),
      jackpots: num(s.jackpots, player.jackpots),
      streak: num(s.streak, player.streak),
      couponPct: s.couponPct || player.couponPct || 0,
      // daily spin is server-enforced; derive today's state from lastSpinDate
      dailyUsed: Boolean(s.dailyUsed || player.dailyUsed ||
        (player.lastSpinDate && player.lastSpinDate === new Date().toISOString().slice(0, 10))),
      invited: Boolean(s.invited || player.invited),
      completed: Boolean(s.completed || player.completed),
      raffleCodes: Array.from(
        new Set([...(s.raffleCodes || []), ...((player.raffleCodes) || [])])
      ),
      // carry the server's credited sessions into the client's anti-replay set
      // (creditedSessions is a { sessionId: credits } map server-side)
      paidSessions: Array.from(
        new Set([
          ...(s.paidSessions || []),
          ...Object.keys(player.creditedSessions || {}),
        ])
      ),
    };
  });
}

// Pull the durable save for this device and merge it in. Returns the server
// player record (or null if there's no backend) so the caller can reconcile any
// paid-but-not-yet-revealed allowance.
async function init(id, set) {
  let player = null;
  try {
    await fetch('/api/session', { method: 'GET' }); // ensure pid cookie exists
    const r = await fetch('/api/state', { method: 'GET' });
    if (!r.ok) throw new Error('state ' + r.status);
    const data = await r.json();
    _SYNC.persisted[id] = Boolean(data && data.persisted);
    if (data && data.persisted && data.player) {
      player = data.player;
      _mergeServerIntoLocal(set, player);
    }
  } catch (e) {
    _SYNC.persisted[id] = false; // no backend — stay local-only
  }
  _SYNC.ready[id] = true;
  return player;
}

// Push progression up (debounced). Never sends paidCredits/creditedSessions —
// the server owns those and ignores them anyway.
function push(id, state) {
  if (!_SYNC.ready[id] || !_SYNC.persisted[id]) return;
  clearTimeout(_SYNC.timers[id]);
  _SYNC.timers[id] = setTimeout(() => {
    const body = {
      revealed: state.revealed,
      myPixels: state.myPixels,
      freePixels: state.freePixels,
      wallpapers: state.wallpapers,
      raffles: state.raffles,
      raffleCodes: state.raffleCodes,
      jackpots: state.jackpots,
      streak: state.streak,
      dailyUsed: state.dailyUsed,
      couponPct: state.couponPct,
      completed: state.completed,
    };
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, 900);
}

// Merge a player record returned by /api/restore into the local store. The
// restored, paid pixels become revealed locally and persist on the next push.
function applyPlayer(set, player) {
  _mergeServerIntoLocal(set, player);
}

// ── server-authoritative economy calls ───────────────────────────────────────
// Each returns:
//   null            → no backend present (caller should fall back to local play)
//   { ok: true, … } → the authoritative result to render
//   { ok: false, … }→ server refused (out of budget, already spun, error)
const _hasBackend = (id) => {
  if (id != null) return Boolean(_SYNC.ready[id] && _SYNC.persisted[id]);
  // called without an id (e.g. from a sheet): true if any instance is backed
  return Object.keys(_SYNC.ready).some((k) => _SYNC.ready[k] && _SYNC.persisted[k]);
};

async function _post(path, body) {
  const r = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (r.status === 503) return null;     // backend explicitly has no store
  return r.json();
}

async function reveal(id, opts) {
  if (!_hasBackend(id)) return null;
  try { const d = await _post('/api/reveal', opts); return d === null ? null : d; }
  catch (e) { return { ok: false, error: 'network' }; }  // fail closed, don't reveal
}
async function spin(id) {
  if (!_hasBackend(id)) return null;
  try { const d = await _post('/api/spin', {}); return d === null ? null : d; }
  catch (e) { return { ok: false, error: 'network' }; }
}
async function invite(id) {
  if (!_hasBackend(id)) return null;
  try { const d = await _post('/api/invite', {}); return d === null ? null : d; }
  catch (e) { return { ok: false, error: 'network' }; }
}

window.GameSync = { init, push, applyPlayer, reveal, spin, invite };
