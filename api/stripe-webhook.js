// api/stripe-webhook.js — Vercel serverless function.
// Secondary, server-to-server credit path: Stripe calls this on
// `checkout.session.completed` even if the buyer closed the tab before being
// redirected back. It credits the same server ledger as verify.js, de-duped by
// session id, so a payment is never lost or double-counted.
//
// Setup (optional but recommended): in Stripe → Developers → Webhooks, add an
// endpoint pointing at https://<your-app>/api/stripe-webhook for the
// `checkout.session.completed` event, then put the signing secret in the
// STRIPE_WEBHOOK_SECRET env var on Vercel. Without it, verify.js still credits
// on return; this just adds resilience.
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { kvConfigured, creditSession } = require('./_kv');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(200).json({ ok: true, note: 'webhook disabled' });

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
  } catch (e) {
    return res.status(400).json({ error: `signature: ${e.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed' && kvConfigured()) {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const meta = session.metadata || {};
        const pid = session.client_reference_id || meta.pid;
        const email =
          (session.customer_details && session.customer_details.email) ||
          session.customer_email ||
          null;
        if (pid) await creditSession(pid, session.id, Number(meta.credits || 0), email);
      }
    }
    res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = handler;
// Stripe signature checks need the exact raw bytes, so turn off the platform's
// automatic body parsing for this function (set after the export so it sticks).
module.exports.config = { api: { bodyParser: false } };
