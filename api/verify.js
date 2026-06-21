// api/verify.js — Vercel serverless function.
// Asks Stripe whether a checkout session was ACTUALLY paid. Stripe is the only
// source of truth here (this call uses your secret key, which never touches the
// browser). On a real "paid" answer it also CREDITS the player's server ledger
// — idempotently, keyed to the pid stamped on the session — so the paid pixels
// survive a cleared cache or a switch of device. Returns what was bought so the
// app can reveal exactly that.
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { kvConfigured, creditSession, getPlayer } = require('./_kv');

module.exports = async (req, res) => {
  try {
    const id = req.query.session;
    if (!id) return res.status(400).json({ error: 'missing session' });

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['customer'],
    });
    const paid = session.payment_status === 'paid';
    const meta = session.metadata || {};
    const credits = paid ? Number(meta.credits || 0) : 0;

    // Credit the server-owned ledger using the pid Stripe recorded for this
    // payment (not anything the browser claims). De-duped by session id.
    let player = null;
    if (paid && kvConfigured()) {
      const pid = session.client_reference_id || meta.pid;
      const email =
        (session.customer_details && session.customer_details.email) ||
        session.customer_email ||
        null;
      if (pid) {
        player = await creditSession(pid, id, credits, email);
      }
    }

    res.status(200).json({
      paid,
      kind: meta.kind || null,
      credits,
      // total pixels this player has ever paid for (server truth), when known
      paidCredits: player ? player.paidCredits : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
