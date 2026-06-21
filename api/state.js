// api/state.js — Vercel serverless function: the player's durable save file.
//
//   GET  → the server's record for this device (so a cleared cache or a return
//          from Stripe restores revealed pixels, rewards, and paid allowance).
//   POST → merge progression UP from the browser. The server ignores any attempt
//          to set paidCredits / creditedSessions here — those are written only by
//          a verified Stripe payment (verify.js / webhook).
//
// Identity comes from the signed httpOnly cookie; there is no account to log in
// to. If KV isn't configured (e.g. local/preview), it degrades quietly so the
// app keeps running on localStorage alone.
const { ensurePid } = require('./_session');
const { kvConfigured, getPlayer, syncProgression, freshPlayer } = require('./_kv');

module.exports = async (req, res) => {
  try {
    const pid = ensurePid(req, res);

    if (!kvConfigured()) {
      // No server store available — tell the client to stay local-only.
      return res.status(200).json({ pid, persisted: false, player: null });
    }

    if (req.method === 'GET') {
      const player = (await getPlayer(pid)) || freshPlayer();
      return res.status(200).json({ pid, persisted: true, player });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      // Strip server-owned fields no matter what the browser sent.
      const { paidCredits, creditedSessions, email, ...progression } = body;
      const player = await syncProgression(pid, progression);
      return res.status(200).json({ pid, persisted: true, player });
    }

    return res.status(405).json({ error: 'GET or POST only' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
