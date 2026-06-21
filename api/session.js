// api/session.js — Vercel serverless function.
// Called once when the app loads: makes sure the browser has a device pid cookie
// (minting one on first visit) so every later request is attributable to a
// player. Returns the pid for debugging; identity travels in the httpOnly cookie.
const { ensurePid } = require('./_session');

module.exports = async (req, res) => {
  try {
    const pid = ensurePid(req, res);
    res.status(200).json({ pid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
