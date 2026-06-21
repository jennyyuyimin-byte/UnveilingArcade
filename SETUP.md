# UNVEIL — Stripe setup (Vercel)

This app charges and verifies payments with **one** Vercel serverless setup.
No more juggling separate payment links — the server calculates each price and
confirms the money actually arrived before any pixels are revealed.

There are two functions in `/api`:

- **`api/checkout.js`** — builds a Stripe checkout page on the fly for whatever
  pack the buyer picked (price decided on the server, not the browser).
- **`api/verify.js`** — when the buyer returns, asks Stripe "was this actually
  paid?" The app only reveals pixels if Stripe says yes.

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
