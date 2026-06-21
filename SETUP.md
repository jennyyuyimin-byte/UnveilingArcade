# UNVEIL — Stripe setup (Vercel)

This app charges and verifies payments with **one** Vercel serverless setup.
No more juggling separate payment links — the server calculates each price and
confirms the money actually arrived before any pixels are revealed.

The functions in `/api`:

- **`api/checkout.js`** — builds a Stripe checkout page on the fly for whatever
  pack the buyer picked (price decided on the server, not the browser).
- **`api/verify.js`** — when the buyer returns, asks Stripe "was this actually
  paid?" The app only reveals pixels if Stripe says yes — and **credits the
  player's server-side save** so the pixels they bought are never lost.
- **`api/session.js`** — gives each device an anonymous, signed player id on its
  first visit (an httpOnly cookie). No login, no sign-up screen.
- **`api/state.js`** — the player's durable save file: restores revealed pixels,
  rewards, and paid allowance on load, and syncs progress as they play.
- **`api/stripe-webhook.js`** — optional safety net so a payment still credits
  even if the buyer closes the tab before returning.
- **`api/restore.js`** — optional "switched phones?" recovery: emails a 6-digit
  code to the address used at checkout and merges that buyer's purchases onto the
  new device. No password, surfaced only in the rewards sheet.
- **`api/reveal.js`** — the only way pixels actually get revealed. The server
  checks the player's real budget (unspent paid credits or free-pixel balance),
  marks the tiles, and rolls each surprise, so reveals can't be faked.
- **`api/spin.js` / `api/invite.js`** — the daily spin and invite reward run on
  the server too (once per day / once ever), since they mint free pixels.

### Player identity & saved progress (no account needed)

Players never see a sign-up. On first load the server quietly issues a random
**device id** in a signed cookie — that *is* the player. Their progress and the
pixels they've paid for are saved server-side against that id, so clearing the
cache or returning from Stripe restores everything. The email Stripe collects at
checkout is stored too, as a recovery anchor for a future "restore on a new
device" flow.

> Paid credits are written **only** by a verified Stripe payment, never by the
> browser — so no one can grant themselves pixels by editing local storage.
> Likewise, **every reveal is hard-capped server-side at paid + earned**: the
> reveal/spin/invite endpoints own the economy and the random rolls, so a tampered
> client can't uncover pixels it didn't pay for or legitimately win. When `/api`
> is unreachable (the in-app preview), the client falls back to local play so the
> demo still runs.

---

## What YOU do (about 10 minutes, no coding)

### 1. Put the project on Vercel
1. Go to **vercel.com** and sign in (free).
2. **Add New → Project**, then upload this project folder (or connect the Git
   repo it lives in).
3. Framework preset: **Other**. No build command needed. Click **Deploy**.

You'll get a live URL like `https://your-app.vercel.app`.

### 2. Add your Stripe secret key
1. In Stripe: **Developers → API keys → Secret key** → copy it (`sk_live_...`).
2. In Vercel: your project → **Settings → Environment Variables**.
3. Add one variable:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** paste your secret key
4. Save, then **Redeploy** (Deployments → ⋯ → Redeploy) so it picks up the key.

> ⚠️ The secret key lives ONLY here, never in the website files. Treat it like a
> password.

### 2b. Turn on saved progress (player ledger)

To make progress + paid pixels survive a cache clear or device, add a free KV
store and one more secret. In Vercel: **Storage → Create → KV** (Upstash) and
attach it to the project — it auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`
(raw Upstash `UPSTASH_REDIS_REST_*` names work too). Then add:

- **Name:** `SESSION_SECRET` — **Value:** any long random string (used to sign the
  device-id cookie so it can't be forged).

Redeploy. Without these the game still runs, just localStorage-only (no
cross-session save). Optionally add a Stripe webhook (Developers → Webhooks →
`checkout.session.completed` → `…/api/stripe-webhook`) and put its signing secret
in `STRIPE_WEBHOOK_SECRET` for extra resilience.

### 2c. (Optional) Restore-on-a-new-device emails

For the "switched phones?" code email, add a free **Resend** key as `RESEND_API_KEY`
(and optionally `RESTORE_EMAIL_FROM`, e.g. `UNVEIL <hi@yourdomain.com>`). Without
it, restore still works but the code is only printed to the server logs.

---

## Test the whole flow locally (no Stripe / KV / email needed)

```
npm install      # once, for the stripe dep used by the deployed functions
npm run dev      # → http://localhost:3000
```

`dev-server.js` runs the **real** identity, ledger, and restore functions against
an in-memory store, with Stripe mocked (checkout bounces straight back as paid).
Play, buy a pack, open your browser's devtools and clear site data, reload — your
progress is gone locally but restored from the server. To try cross-device
restore, the dev "checkout" records the email `dev@unveil.test`; use that in the
**Rewards → "Switched phones?"** flow and read the 6-digit code from the terminal
running the server.

### 3. (Optional) Test it first
Use Stripe **test mode**: copy the *test* secret key (`sk_test_...`) instead,
and pay with card `4242 4242 4242 4242`, any future date, any CVC. When it works,
swap in the live key and redeploy.

That's it. You do **not** need to create or maintain any Payment Links anymore.

---

## How a purchase flows now

1. Buyer taps a pack → app calls `POST /api/checkout` with just the pack name.
2. `checkout.js` looks up the real price in its `CATALOG` and asks Stripe to
   build the checkout page → buyer pays on Stripe.
3. Stripe sends them back to `…/?unveil_session={CHECKOUT_SESSION_ID}`.
4. App calls `GET /api/verify?session=…` → `verify.js` asks Stripe if it's paid.
5. Only on a real **paid** answer does the app reveal the pixels — exactly the
   number Stripe recorded for that pack. A faked URL unlocks nothing.

## Changing prices or adding packs

Edit the `CATALOG` at the top of **`api/checkout.js`**. Amounts are in **cents**
($1.00 = `100`). `credits` = how many pixels that pack reveals. Redeploy. Done —
no Stripe dashboard changes required.

```js
p25: { label: '30 pixels · pack', amount: 2000, credits: 30, kind: 'bundle' },
//                                  $20.00              ^ pixels unlocked
```

## Fallback behavior

If the app can't reach `/api` (for example the in-app design preview, which has
no server), it falls back to the older static Payment Links so the demo still
runs. Once deployed on Vercel with the key set, the secure path is used
automatically.
