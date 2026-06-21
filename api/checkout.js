// api/checkout.js — Vercel serverless function.
// Creates a Stripe Checkout Session with the price decided HERE on the server
// (never trusted from the browser) and returns { url } for the app to redirect
// to. One function replaces every static Payment Link.
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { ensurePid } = require('./_session');

// The ONLY prices that can ever be charged. The browser sends a pack id; the
// server looks up the real amount (in cents) and how many pixels it unlocks.
// Add a new pack here and it just works — no new Stripe links to create.
const CATALOG = {
  single:      { label: 'Reveal 1 pixel',           amount: 100,  credits: 1,  kind: 'single' },
  single_half: { label: 'Reveal 1 pixel (50% off)', amount: 50,   credits: 1,  kind: 'single' },
  p5:          { label: '6 pixels · pack',          amount: 500,  credits: 6,  kind: 'bundle' },
  p12:         { label: '14 pixels · pack',         amount: 1000, credits: 14, kind: 'bundle' },
  p25:         { label: '30 pixels · pack',         amount: 2000, credits: 30, kind: 'bundle' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { pack } = req.body || {};
    const item = CATALOG[pack];
    if (!item) return res.status(400).json({ error: 'unknown pack' });

    // Make sure this buyer has a device pid (mints + sets the cookie if needed)
    // and tie the payment to it, so the credit lands on the right player even if
    // they close the tab before the redirect back.
    const pid = ensurePid(req, res);

    const origin = `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: { name: item.label + ' — Holding Light' },
          unit_amount: item.amount, // cents; Stripe shows the total
        },
      }],
      client_reference_id: pid,          // which player this payment belongs to
      customer_creation: 'always',       // capture an email = silent recovery anchor
      // stamp what was bought (and who bought it) onto the session so
      // /api/verify and the webhook can read it back
      metadata: { pack, credits: String(item.credits), kind: item.kind, pid },
      success_url: `${origin}/?unveil_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?unveil_cancel=1`,
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
