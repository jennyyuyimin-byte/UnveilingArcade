// api/restore.js — Tier 3: optional "restore purchases" for a new device.
//
// Still no password account. The player proves control of the email Stripe
// captured at checkout via a short-lived 6-digit code, then we merge every
// device that bought under that email INTO this device's player record.
//
//   POST { step: 'send',   email }          → emails a code (if that email has any
//                                             purchases). Always responds ok, so it
//                                             can't be used to probe who's a customer.
//   POST { step: 'verify', email, code }    → on match, merges + returns the player.
//
// Identity of "this device" comes from the signed cookie (ensurePid).
const crypto = require('crypto');
const { ensurePid } = require('./_session');
const {
  kvConfigured, kvGet, kvSet, kvDel, kvSMembers,
  mergeIntoPlayer, getPlayer, EMAIL_KEY,
} = require('./_kv');
const { sendRestoreCode } = require('./_email');

const CODE_KEY = (email) => `restore:${String(email).toLowerCase()}`;
const RL_KEY = (email) => `rl:restore:${String(email).toLowerCase()}`;
const TTL = 600;          // code lifetime, seconds (10 min)
const MAX_SENDS = 5;      // per email per TTL window
const MAX_TRIES = 5;      // wrong-code guesses before the code is burned

const validEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const sixDigit = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const eq = (a, b) => {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!kvConfigured()) return res.status(503).json({ error: 'restore unavailable' });

  const pid = ensurePid(req, res);
  const { step, email, code } = req.body || {};
  if (!validEmail(email)) return res.status(400).json({ error: 'invalid email' });

  try {
    if (step === 'send') {
      // rate limit per email
      const sends = Number((await kvGet(RL_KEY(email))) || 0);
      if (sends >= MAX_SENDS) return res.status(429).json({ error: 'too many requests' });
      await kvSet(RL_KEY(email), String(sends + 1), TTL);

      const pids = await kvSMembers(EMAIL_KEY(email));
      const value = sixDigit();
      await kvSet(CODE_KEY(email), JSON.stringify({ code: value, tries: 0 }), TTL);

      // Only actually email when this address has purchases to restore, but
      // respond identically either way (no customer enumeration).
      if (pids.length) await sendRestoreCode(email, value);
      return res.status(200).json({ ok: true });
    }

    if (step === 'verify') {
      const raw = await kvGet(CODE_KEY(email));
      if (!raw) return res.status(400).json({ ok: false, error: 'code expired' });
      const rec = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if ((rec.tries || 0) >= MAX_TRIES) {
        await kvDel(CODE_KEY(email));
        return res.status(429).json({ ok: false, error: 'too many attempts' });
      }
      if (!eq(rec.code, code)) {
        rec.tries = (rec.tries || 0) + 1;
        await kvSet(CODE_KEY(email), JSON.stringify(rec), TTL);
        return res.status(400).json({ ok: false, error: 'wrong code' });
      }

      // Correct → burn the code, merge all the email's devices into this one,
      // and make this device part of that email going forward.
      await kvDel(CODE_KEY(email));
      const pids = await kvSMembers(EMAIL_KEY(email));
      const player = await mergeIntoPlayer(pid, pids);
      if (!player.email) player.email = String(email).toLowerCase();
      const { savePlayer, kvSAdd } = require('./_kv');
      await savePlayer(pid, player);
      await kvSAdd(EMAIL_KEY(email), pid);

      return res.status(200).json({ ok: true, player });
    }

    return res.status(400).json({ error: 'unknown step' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
