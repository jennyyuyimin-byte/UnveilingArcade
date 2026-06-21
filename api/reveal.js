// api/reveal.js — the ONE authoritative way to reveal pixels.
// The server decides whether the player may reveal (paid credits not yet spent,
// or a free-pixel balance), marks the pixels, and rolls each surprise here so a
// tampered browser can't mint reveals or free pixels. Returns the rewards + the
// new server-owned balances for the client to render.
//
//   POST { mode: 'free' | 'paid', indices?: number[], n?: number, covered: number[] }
//
// `covered` is the client's current set of still-covered tiles (excludes the
// cosmetic community tiles, which the server doesn't track). When `indices` is
// given (a tapped tile) those are revealed; otherwise the server picks `n` at
// random from `covered`. Either way it's clamped to the player's real budget.
const { ensurePid } = require('./_session');
const { kvConfigured, getPlayer, savePlayer, freshPlayer } = require('./_kv');
const { rollReward, applyResolved } = require('./_economy');

function balances(p) {
  return {
    freePixels: p.freePixels, couponPct: p.couponPct, wallpapers: p.wallpapers,
    raffles: p.raffles, raffleCodes: p.raffleCodes, jackpots: p.jackpots,
    myPixels: p.myPixels, paidCredits: p.paidCredits, paidRevealsUsed: p.paidRevealsUsed,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  // No backend store → tell the client to fall back to local reveal.
  if (!kvConfigured()) return res.status(503).json({ error: 'reveal unavailable' });

  try {
    const pid = ensurePid(req, res);
    const { mode = 'paid', indices, n = 1, covered = [] } = req.body || {};
    const player = (await getPlayer(pid)) || freshPlayer();

    // candidate tiles: client-covered and not already revealed server-side
    const cand = (Array.isArray(covered) ? covered : [])
      .map(Number)
      .filter((i) => Number.isInteger(i) && i >= 0 && !(i in player.revealed));

    const avail = mode === 'free'
      ? player.freePixels
      : Math.max(0, player.paidCredits - player.paidRevealsUsed);
    if (avail <= 0) {
      return res.status(200).json({ ok: false, error: 'no budget', mode, balances: balances(player) });
    }

    // choose which tiles to reveal
    let picks;
    if (Array.isArray(indices) && indices.length) {
      picks = indices.map(Number).filter((i) => cand.includes(i)).slice(0, avail);
    } else {
      const pool = cand.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
      picks = pool.slice(0, Math.min(Number(n) || 1, avail));
    }
    if (!picks.length) {
      return res.status(200).json({ ok: false, error: 'nothing to reveal', mode, balances: balances(player) });
    }

    // spend budget
    if (mode === 'free') player.freePixels -= picks.length;
    else { player.paidRevealsUsed += picks.length; player.couponPct = 0; }

    // reveal + roll each surprise server-side
    const rewards = [];
    for (const idx of picks) {
      player.revealed[idx] = 'me';
      player.myPixels += 1;
      const r = rollReward();
      applyResolved(player, r.resolved);
      rewards.push({ index: idx, shown: r.shown, resolved: r.resolved });
    }

    await savePlayer(pid, player);
    return res.status(200).json({ ok: true, mode, rewards, balances: balances(player) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
