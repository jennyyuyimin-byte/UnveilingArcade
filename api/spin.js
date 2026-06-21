// api/spin.js — authoritative daily spin.
// The server enforces once per UTC day and rolls the wheel here, so the free
// pixels it grants are real budget (not something the browser can self-award).
// Returns the winning segment index for the client to animate the wheel to.
const { ensurePid } = require('./_session');
const { kvConfigured, getPlayer, savePlayer, freshPlayer } = require('./_kv');
const { SPIN_SEGMENTS, pickSpinIndex, applySpinSegment, utcDay } = require('./_economy');

function balances(p) {
  return {
    freePixels: p.freePixels, couponPct: p.couponPct, wallpapers: p.wallpapers,
    raffles: p.raffles, jackpots: p.jackpots,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!kvConfigured()) return res.status(503).json({ error: 'spin unavailable' });

  try {
    const pid = ensurePid(req, res);
    const player = (await getPlayer(pid)) || freshPlayer();
    const today = utcDay();

    if (player.lastSpinDate === today) {
      return res.status(200).json({ ok: false, alreadyUsed: true, balances: balances(player) });
    }

    const segmentIndex = pickSpinIndex();
    const seg = SPIN_SEGMENTS[segmentIndex];
    applySpinSegment(player, seg);
    player.lastSpinDate = today;
    await savePlayer(pid, player);

    return res.status(200).json({
      ok: true, segmentIndex, reward: seg.reward, label: seg.label, balances: balances(player),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
