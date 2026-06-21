// api/invite.js — authoritative one-time invite reward.
// Grants the "+1 free pixel" for sharing exactly once, server-side, so it can't
// be claimed repeatedly by re-tapping. (Friend-side rewards would hook in here
// too once invite codes are tracked.)
const { ensurePid } = require('./_session');
const { kvConfigured, getPlayer, savePlayer, freshPlayer } = require('./_kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!kvConfigured()) return res.status(503).json({ error: 'invite unavailable' });

  try {
    const pid = ensurePid(req, res);
    const player = (await getPlayer(pid)) || freshPlayer();
    let granted = 0;
    if (!player.invited) {
      player.invited = true;
      player.freePixels += 1;
      granted = 1;
      await savePlayer(pid, player);
    }
    return res.status(200).json({ ok: true, granted, freePixels: player.freePixels, invited: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
