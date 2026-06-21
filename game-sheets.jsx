// game-sheets.jsx — reward popup, top-up, daily spin, invite, story,
// leaderboard, share card, completion. Exports each to window.
const { Btn, Sheet, fmt$, applyReward } = window;

// ── shared mini view of the painting with covered tiles overlaid ────────────
function MiniReveal({ theme, state, width = 220, showCover = true }) {
  const { cols, rows } = window.GAME;
  const ph = width * (theme.ph / theme.pw); // keep painting aspect
  return (
    <div style={{ width, height: ph, position: 'relative', borderRadius: 12, overflow: 'hidden',
      backgroundImage: `url(${theme.painting})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}>
      {showCover && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
          {[...Array(cols * rows)].map((_, i) => (
            <div key={i} style={{ background: state.revealed[i] ? 'transparent' : 'rgba(8,6,18,.82)',
              backdropFilter: state.revealed[i] ? 'none' : 'blur(1px)', borderRight: '0.5px solid rgba(0,0,0,.15)', borderBottom: '0.5px solid rgba(0,0,0,.15)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── reward popup (after a paid reveal / mystery) ────────────────────────────
function RewardPopup({ theme, payload, onClose }) {
  const Icon = window.Icon;
  const meta = window.REWARD_META[payload.shown];
  const rMeta = window.REWARD_META[payload.resolved];
  const isMystery = payload.shown === 'mystery';
  const [opened, setOpened] = React.useState(!isMystery);
  const shown = opened ? rMeta : meta;
  const big = (opened ? rMeta : meta).tier === 'big';
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)', animation: 'ug-fade .2s ease', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.surface, borderRadius: 24, padding: '30px 24px 24px', width: '100%', maxWidth: 320,
        textAlign: 'center', color: theme.text, boxShadow: '0 30px 70px rgba(0,0,0,.5)', border: `1px solid ${theme.line}`, animation: 'ug-pop .34s cubic-bezier(.2,.9,.3,1.2)', position: 'relative' }}>
        <div style={{ width: 86, height: 86, borderRadius: 24, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: big ? theme.accent : theme.surfaceAlt, boxShadow: big ? theme.accentGlow : 'none',
          animation: big ? 'ug-bob 1.6s ease-in-out infinite' : 'none' }}>
          <Icon name={shown.icon} size={42} color={big ? theme.accentText : theme.accent} sw={1.7} />
        </div>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 26, letterSpacing: theme.displayTracking, marginBottom: 6 }}>{shown.title}</div>
        <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 15, lineHeight: 1.4, marginBottom: 20, padding: '0 6px' }}>{shown.line}</div>
        {isMystery && !opened ? (
          <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={() => setOpened(true)}>Open it</Btn>
        ) : (
          <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={onClose}>Keep revealing</Btn>
        )}
      </div>
    </div>
  );
}

// ── claim box (with sprinkles) — the fun gate that leads into payment ────────
function ClaimBox({ theme, state, set, onClose }) {
  const Icon = window.Icon;
  const info = state.pendingBuy || { count: 1, price: 1 };
  const count = info.count || 1;
  const price = info.price != null ? info.price : count;
  const [lifted, setLifted] = React.useState(false);

  // festive sprinkles scattered around the box
  const sprinkleColors = [theme.accent, theme.accent2 || theme.accent, theme.good || '#37d39b', '#ffd84d', '#ff6db5', '#6db5ff'];
  const sprinkles = React.useMemo(() => [...Array(26)].map((_, i) => ({
    left: Math.random() * 100, top: Math.random() * 100,
    rot: Math.random() * 360, len: 7 + Math.random() * 7,
    color: sprinkleColors[i % sprinkleColors.length], delay: (Math.random() * 1.4).toFixed(2),
  })), []);

  const claim = () => set({ sheet: 'payment' }); // straight into pay

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.58)', backdropFilter: 'blur(3px)', animation: 'ug-fade .2s ease', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.surface, borderRadius: 26, padding: '32px 24px 24px', width: '100%', maxWidth: 330,
        textAlign: 'center', color: theme.text, boxShadow: '0 30px 70px rgba(0,0,0,.5)', border: `1px solid ${theme.line}`,
        animation: 'ug-pop .36s cubic-bezier(.2,.9,.3,1.2)', position: 'relative', overflow: 'hidden' }}>

        {/* sprinkles layer */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {sprinkles.map((s, i) => (
            <span key={i} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.len, height: 3.5, borderRadius: 3,
              background: s.color, transform: `rotate(${s.rot}deg)`, opacity: .9,
              animation: `ug-bob 2.4s ease-in-out ${s.delay}s infinite` }} />
          ))}
        </div>

        {/* gift box */}
        <div onMouseEnter={() => setLifted(true)} onMouseLeave={() => setLifted(false)}
          style={{ position: 'relative', width: 104, height: 104, margin: '6px auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 26, background: theme.accent, boxShadow: theme.accentGlow,
            animation: 'ug-bob 1.8s ease-in-out infinite', transition: 'transform .25s', transform: lifted ? 'translateY(-4px) scale(1.04)' : 'none' }}>
          <Icon name="gift" size={54} color={theme.accentText} sw={1.6} />
        </div>

        <div style={{ fontFamily: theme.fontBody, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.accent, fontWeight: 800, marginBottom: 6 }}>A surprise is inside</div>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 25, letterSpacing: theme.displayTracking, lineHeight: 1.1, marginBottom: 8 }}>
          {count === 1 ? 'Your mystery reveal' : `${count} mystery reveals`}
        </div>
        <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14.5, lineHeight: 1.45, marginBottom: 22, padding: '0 8px' }}>
          Every reveal hides a surprise — coupons, free pixels, even the jackpot. Claim to open yours.
        </div>

        <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={claim}>Claim · pay {fmt$(price)}</Btn>
        <button onClick={onClose} style={{ marginTop: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: theme.faint,
          fontFamily: theme.fontBody, fontWeight: 600, fontSize: 13.5 }}>Maybe later</button>
      </div>
    </div>
  );
}

// ── pixel packs — buy credits in one payment (bundles cover the card fees) ────
// Stripe Payment Links. One link = one fixed price in Stripe, so paste a
// separate link per price as you create them. `default` is used as a fallback.
const PAYMENT_LINKS = {
  default: 'https://buy.stripe.com/5kQdR9gEl9tagHU4gu43S00',
  0.5: 'https://buy.stripe.com/8x2aEX73L48Q77k14i43S03', // half pixel ($0.50)
  1:  'https://buy.stripe.com/5kQdR9gEl9tagHU4gu43S00', // single pixel ($1)
  5:  'https://buy.stripe.com/fZu7sL87P7l29fscN043S01', // 6-pixel pack ($5)
  10: 'https://buy.stripe.com/eVqcN587PbBiezM9AO43S02', // 14-pixel pack ($10)
  20: '', // 30-pixel pack ($20)
};
const paymentLinkFor = (price) => PAYMENT_LINKS[price] || PAYMENT_LINKS.default;

const PIXEL_PACKS = [
  { id: 'p5',  pixels: 5,  bonus: 1, price: 5,  tag: null,            sub: '+1 bonus pixel' },
  { id: 'p12', pixels: 12, bonus: 2, price: 10, tag: 'Most popular',  sub: '+2 bonus pixels' },
  { id: 'p25', pixels: 25, bonus: 5, price: 20, tag: 'Best value',    sub: '+5 bonus pixels' },
];

function BundleSheet({ theme, state, set, onClose }) {
  const Icon = window.Icon;

  const choose = (p) => {
    const credits = p.pixels + p.bonus;
    set({ sheet: 'payment', pendingBuy: {
      kind: 'bundle', packId: p.id, credits, price: p.price,
      label: `${credits} pixels`,
      sub: `${p.pixels} + ${p.bonus} bonus · pack`,
    } });
  };

  return (
    <Sheet theme={theme} title="Get more pixels" onClose={onClose}>
      <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
        Buy a pack once, then tap any square to reveal — no charge per tap. Bundles include bonus pixels and cover the card processing fees.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {PIXEL_PACKS.map((p) => {
          const total = p.pixels + p.bonus;
          const featured = p.tag === 'Most popular';
          const per = (p.price / total);
          return (
            <button key={p.id} onClick={() => choose(p)} style={{ position: 'relative', width: '100%', textAlign: 'left', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', borderRadius: 16,
              background: featured ? theme.surfaceAlt : theme.surface,
              border: `${featured ? 2 : 1}px solid ${featured ? theme.accent : theme.line}`,
              color: theme.text, WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, flexShrink: 0, background: featured ? theme.accent : theme.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: featured ? theme.accentGlow : 'none' }}>
                <Icon name="grid" size={24} color={featured ? theme.accentText : theme.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 19 }}>{total} pixels</span>
                  {p.bonus > 0 && <span style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: 12.5, color: theme.accent }}>+{p.bonus} free</span>}
                </div>
                <div style={{ fontFamily: theme.fontBody, fontSize: 12.5, color: theme.muted, marginTop: 2 }}>{fmt$(per)} per pixel</div>
              </div>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22 }}>{fmt$(p.price)}</div>
              {p.tag && (
                <span style={{ position: 'absolute', top: -9, right: 16, background: featured ? theme.accent : theme.text,
                  color: featured ? theme.accentText : theme.bg, fontFamily: theme.fontBody, fontWeight: 800, fontSize: 10,
                  letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 8 }}>{p.tag}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '11px 14px', borderRadius: 12,
        background: theme.surfaceAlt, color: theme.muted }}>
        <Icon name="bolt" size={16} color={theme.accent} />
        <span style={{ fontFamily: theme.fontBody, fontSize: 12.5, lineHeight: 1.4 }}>Prefer just one? Tap any square to reveal a single pixel for $1.</span>
      </div>
    </Sheet>
  );
}

// ── express payment — pay $1/pixel right away (Apple Pay first, no cart) ──────
function PaymentSheet({ theme, state, set, onClose, toast, onPaid }) {
  const Icon = window.Icon;
  const buyInfo = state.pendingBuy || { count: 1, price: 1 };
  const isBundle = buyInfo.kind === 'bundle';
  const count = buyInfo.count || 1;
  const credits = buyInfo.credits || 0;
  const price = buyInfo.price != null ? buyInfo.price : count;
  const [phase, setPhase] = React.useState('form'); // form | redirect | success
  const label = isBundle ? buyInfo.label || `${credits} pixels` : (count === 1 ? 'Reveal 1 pixel' : `Reveal ${count} pixels`);

  // Which server-side catalog entry to charge. Bundles carry their own packId;
  // a single pixel is full price ($1) or the coupon half-price ($0.50).
  const packId = buyInfo.packId
    || (isBundle ? ({ 5: 'p5', 10: 'p12', 20: 'p25' })[price] : (price < 1 ? 'single_half' : 'single'));

  // Dynamic checkout: ask our Vercel /api/checkout function to build a Stripe
  // Checkout Session for this pack (the SERVER sets the real price), then go
  // there. If the backend isn't reachable — e.g. the in-app preview has no
  // /api — fall back to the matching static Payment Link so the demo still runs.
  const goToStripe = async () => {
    if (phase === 'success' || phase === 'redirect') return;
    setPhase('redirect');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId }),
      });
      const data = await r.json();
      if (data && data.url) { window.location.assign(data.url); return; }
      throw new Error('no url');
    } catch (e) {
      const link = window.paymentLinkFor(price); // static-link fallback
      if (link) { window.location.assign(link); return; }
      setPhase('form');
      toast && toast('Could not start checkout');
    }
  };
  // Demo affordance only — simulates the verified return without a real charge.
  const simulateReturn = () => {
    if (phase === 'success') return;
    setPhase('success');
    const fakeSession = 'demo_' + Date.now();
    setTimeout(() => {
      set((st) => ({ ...st, paidSessions: [...(st.paidSessions || []), fakeSession] }));
      onPaid && onPaid(buyInfo);
      set({ sheet: null, pendingBuy: null });
    }, 950);
  };

  const close = () => set({ sheet: null, pendingBuy: null });

  return (
    <Sheet theme={theme} title={phase === 'success' ? '' : `Pay ${fmt$(price)}`} onClose={close}>
      {phase === 'success' ? (
        <div style={{ textAlign: 'center', padding: '14px 6px 8px' }}>
          <div style={{ width: 88, height: 88, borderRadius: 44, margin: '0 auto 18px', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.accentGlow, animation: 'ug-pop .4s cubic-bezier(.2,.9,.3,1.3)' }}>
            <Icon name="check" size={46} color={theme.accentText} sw={2.4} />
          </div>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 26, marginBottom: 6 }}>Payment complete</div>
          <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 15 }}>{isBundle ? `Adding ${credits} pixels…` : `Revealing ${count} pixel${count === 1 ? '' : 's'}…`}</div>
        </div>
      ) : (
        <>
          {/* order summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: theme.surfaceAlt, borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="grid" size={24} color={theme.accentText} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16 }}>{label}</div>
              <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>{isBundle ? buyInfo.sub || 'Pixel pack' : `“${window.NARRATIVE.piece}” · $1 each`}</div>
            </div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22 }}>{fmt$(price)}</div>
          </div>

          {/* upsell — switch a single $1 buy into a value pack right here */}
          {!isBundle && count === 1 && (() => {
            const p = window.PIXEL_PACKS[0]; const total = p.pixels + p.bonus;
            const switchToPack = () => set({ pendingBuy: { kind: 'bundle', packId: p.id, credits: total, price: p.price, label: `${total} pixels`, sub: `${p.pixels} + ${p.bonus} bonus · pack` } });
            return (
              <button onClick={switchToPack} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                background: theme.surface, border: `1.5px solid ${theme.accent}`, borderRadius: 14, padding: '12px 14px', marginBottom: 18, color: theme.text, WebkitTapHighlightColor: 'transparent' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: theme.accentGlow }}>
                  <Icon name="grid" size={20} color={theme.accentText} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: theme.fontBody, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.accent, fontWeight: 800 }}>Better value</div>
                  <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15.5, lineHeight: 1.15 }}>Get {total} pixels for {fmt$(p.price)}</div>
                  <div style={{ fontFamily: theme.fontBody, fontSize: 12, color: theme.muted }}>That's {fmt$(p.price / total)} each — {Math.round((1 - p.price / total) * 100)}% off · +{p.bonus} free</div>
                </div>
                <Icon name="arrow" size={20} color={theme.accent} />
              </button>
            );
          })()}

          {/* downsell — let bundle buyers drop back to a single pixel */}
          {isBundle && (
            <button onClick={() => set({ pendingBuy: { kind: 'single', packId: 'single', count: 1, price: 1, reward: window.rollReward() } })} style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
              color: theme.faint, fontFamily: theme.fontBody, fontWeight: 600, fontSize: 12.5, marginBottom: 16, WebkitTapHighlightColor: 'transparent' }}>
              ← Just one pixel for $1 instead
            </button>
          )}

          {/* secure checkout via Stripe — same-tab redirect, verified on return */}
          <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={goToStripe} disabled={phase === 'redirect'}>
            {phase === 'redirect' ? 'Starting secure checkout…' : `Pay ${fmt$(price)} securely`}
          </Btn>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, color: theme.faint }}>
            <Icon name="lock" size={14} color={theme.faint} />
            <span style={{ fontFamily: theme.fontBody, fontSize: 11.5 }}>Secure checkout by Stripe · pixels unlock only after a verified return</span>
          </div>
          <button onClick={simulateReturn} style={{ display: 'block', margin: '12px auto 0', border: 'none', background: 'transparent', cursor: 'pointer', color: theme.faint, fontFamily: theme.fontBody, fontWeight: 600, fontSize: 11.5, opacity: .8 }}>Demo: simulate a verified return</button>
        </>
      )}
    </Sheet>
  );
}

// ── daily free spin ─────────────────────────────────────────────────────────
function DailySpinSheet({ theme, state, set, onClose, toast }) {
  const segs = window.SPIN_SEGMENTS;
  const seg = 360 / segs.length;
  const [rot, setRot] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const grad = `conic-gradient(${segs.map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;

  // Daily spin is server-authorized: the server enforces once/day, rolls the
  // wheel, and grants the free pixels. We animate to the segment it returns.
  // Falls back to local spinning only when there's no backend.
  const animateTo = (idx) => {
    const target = 360 * 5 - (idx * seg + seg / 2) + (rot - (rot % 360));
    setRot(target);
  };
  const spin = async () => {
    if (spinning || state.dailyUsed) return;
    setSpinning(true); setResult(null);
    const res = await window.GameSync.spin();
    if (res === null) { localSpin(); return; }   // no backend → local
    if (!res.ok) {
      setSpinning(false);
      if (res.alreadyUsed) { set({ dailyUsed: true }); toast && toast('Already spun today'); }
      else toast && toast('Spin failed — try again');
      return;
    }
    animateTo(res.segmentIndex);
    setTimeout(() => {
      const s = segs[res.segmentIndex];
      const b = res.balances || {};
      setSpinning(false); setResult(s);
      set((st) => ({ ...st, dailyUsed: true,
        freePixels: b.freePixels != null ? b.freePixels : st.freePixels,
        couponPct: b.couponPct != null ? b.couponPct : st.couponPct,
        wallpapers: b.wallpapers != null ? b.wallpapers : st.wallpapers }));
    }, 3400);
  };
  const localSpin = () => {
    // weight toward small/none
    const idx = window.weightedPick(segs.map((s, i) => ({ type: i, weight: s.reward === 'bonus3' ? 1 : s.reward === 'wallpaper' ? 2 : 4 })));
    animateTo(idx);
    setTimeout(() => {
      const s = segs[idx];
      setSpinning(false); setResult(s);
      set((st) => ({ ...st, dailyUsed: true }));
      if (s.reward === 'pixels2') set((st) => ({ ...st, freePixels: st.freePixels + 2 }));
      else if (s.reward === 'bonus3') set((st) => ({ ...st, freePixels: st.freePixels + 3 }));
      else if (s.reward === 'bonus') set((st) => ({ ...st, freePixels: st.freePixels + 1 }));
      else if (s.reward === 'coupon') set((st) => ({ ...st, couponPct: 0.5 }));
      else if (s.reward === 'wallpaper') set((st) => ({ ...st, wallpapers: st.wallpapers + 1 }));
    }, 3400);
  };

  return (
    <Sheet theme={theme} title="Daily spin" onClose={onClose}>
      <div style={{ textAlign: 'center', color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, marginBottom: 18 }}>One free spin every day. Today's is on us.</div>
      <div style={{ position: 'relative', width: 248, height: 248, margin: '0 auto 18px' }}>
        <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
          width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: `18px solid ${theme.text}` }} />
        <div style={{ width: 248, height: 248, borderRadius: '50%', background: grad,
          transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 3.4s cubic-bezier(.17,.67,.16,1)' : 'none',
          boxShadow: `0 0 0 8px ${theme.surfaceAlt}, 0 14px 40px rgba(0,0,0,.4)`, position: 'relative' }}>
          {segs.map((s, i) => (
            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transformOrigin: '0 0',
              transform: `rotate(${i * seg + seg / 2}deg) translate(58px,-7px)`, fontFamily: theme.fontBody, fontWeight: 800, fontSize: 11, color: '#1a1208', whiteSpace: 'nowrap' }}>{s.label}</div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 54, height: 54, borderRadius: '50%',
          background: theme.surface, border: `3px solid ${theme.text}`, zIndex: 2 }} />
      </div>
      {result ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 20, marginBottom: 4, color: result.reward === 'none' ? theme.muted : theme.good }}>
            {result.reward === 'none' ? 'So close! Back tomorrow.' : `You won: ${result.label}`}
          </div>
          <Btn theme={theme} variant="soft" size="md" style={{ marginTop: 10 }} onClick={onClose}>Done</Btn>
        </div>
      ) : state.dailyUsed ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, marginBottom: 12 }}>You've spun today. Come back tomorrow!</div>
          <Btn theme={theme} variant="ghost" size="sm" onClick={() => set({ dailyUsed: false })}>Reset (demo)</Btn>
        </div>
      ) : (
        <Btn theme={theme} size="lg" style={{ width: '100%' }} disabled={spinning} onClick={spin}>{spinning ? 'Spinning…' : 'Spin to win'}</Btn>
      )}
    </Sheet>
  );
}

// ── invite a friend ─────────────────────────────────────────────────────────
function InviteSheet({ theme, state, set, onClose, toast }) {
  const Icon = window.Icon;
  const [copied, setCopied] = React.useState(false);
  const code = 'ENTER-MEI24';
  const claim = async () => {
    if (!state.invited) {
      const res = await window.GameSync.invite();
      if (res === null) { // no backend → local
        set((s) => ({ ...s, invited: true, freePixels: s.freePixels + 1 }));
        toast('Invite sent · +1 free pixel');
      } else if (res.ok) {
        set((s) => ({ ...s, invited: true, freePixels: res.freePixels != null ? res.freePixels : s.freePixels }));
        toast(res.granted ? 'Invite sent · +1 free pixel' : 'Invite sent');
      }
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const channels = [
    { k: 'Messages', c: '#2EC27E' }, { k: 'WhatsApp', c: '#25D366' }, { k: 'Instagram', c: '#E1306C' }, { k: 'Copy link', c: theme.accent2 },
  ];
  return (
    <Sheet theme={theme} title="Invite a friend" onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: theme.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Icon name="users" size={32} color={theme.accent} />
        </div>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 22, lineHeight: 1.2 }}>You both get a free pixel</div>
        <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, marginTop: 6, padding: '0 10px' }}>Share your code. When a friend reveals their first pixel, you each get one free.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1.5px dashed ${theme.line}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 20, letterSpacing: '.08em' }}>{code}</div>
        <button onClick={claim} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none', background: 'transparent', color: theme.accent, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 14 }}>
          <Icon name={copied ? 'check' : 'copy'} size={18} color={theme.accent} />{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {channels.map((c) => (
          <button key={c.k} onClick={claim} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: theme.surfaceAlt, border: 'none', borderRadius: 14, padding: '13px 14px', color: theme.text, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 14, WebkitTapHighlightColor: 'transparent' }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: c.c }} />{c.k}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ── story ───────────────────────────────────────────────────────────────────
function StorySheet({ theme, state, onClose }) {
  const N = window.NARRATIVE;
  return (
    <Sheet theme={theme} title={`“${N.piece}”`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        <MiniReveal theme={theme} state={state} width={108} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div style={{ fontFamily: theme.fontBody, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.faint }}>A painting by</div>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 22, margin: '2px 0 10px' }}>{N.artist}</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted, lineHeight: 1.5 }}>{window.percentRevealed(state)}% uncovered by the community so far.</div>
        </div>
      </div>
      {N.story.map((para, i) => (
        <p key={i} style={{ fontFamily: i === 0 ? theme.fontDisplay : theme.fontBody, fontSize: i === 0 ? 21 : 15.5, fontWeight: i === 0 ? theme.displayWeight : 400,
          lineHeight: i === 0 ? 1.3 : 1.6, color: i === 0 ? theme.text : theme.muted, margin: i === 0 ? '0 0 16px' : '0 0 14px', textWrap: 'pretty' }}>{para}</p>
      ))}
    </Sheet>
  );
}

// ── leaderboard ─────────────────────────────────────────────────────────────
function LeaderboardSheet({ theme, state, onClose }) {
  const rows = [...window.LEADERBOARD, { name: 'You', px: state.myPixels, me: true }].sort((a, b) => b.px - a.px);
  return (
    <Sheet theme={theme} title="Top revealers" onClose={onClose}>
      <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 13, marginBottom: 14 }}>Ranked by pixels personally uncovered. Reveal more to climb.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={r.name + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14,
            background: r.me ? theme.accent : theme.surfaceAlt, color: r.me ? theme.accentText : theme.text,
            boxShadow: r.me ? theme.accentGlow : 'none' }}>
            <div style={{ width: 22, textAlign: 'center', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, opacity: r.me ? 1 : .7 }}>{i + 1}</div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: r.me ? 'rgba(255,255,255,.25)' : theme.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15 }}>{r.name[0].toUpperCase()}</div>
            <div style={{ flex: 1, fontFamily: theme.fontBody, fontWeight: r.me ? 800 : 600, fontSize: 15 }}>{r.name}{i === 0 ? '  🏆' : ''}</div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 17 }}>{r.px}</div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ── share card ──────────────────────────────────────────────────────────────
function ShareSheet({ theme, state, onClose }) {
  const Icon = window.Icon;
  const pct = window.percentRevealed(state);
  const channels = ['Instagram', 'Stories', 'Messages', 'Copy link'];
  return (
    <Sheet theme={theme} title="Share your reveal" onClose={onClose}>
      <div style={{ borderRadius: 20, overflow: 'hidden', background: '#08060f', position: 'relative', margin: '0 auto 18px', width: 230, boxShadow: '0 16px 44px rgba(0,0,0,.5)' }}>
        <MiniReveal theme={theme} state={state} width={230} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '34px 16px 14px', background: 'linear-gradient(to top, rgba(0,0,0,.82), transparent)' }}>
          <div style={{ fontFamily: theme.fontBody, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>{window.NARRATIVE.brand}</div>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22, color: '#fff', lineHeight: 1.15, marginTop: 2 }}>I've revealed {pct}% of “{window.NARRATIVE.piece}”</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 12.5, color: 'rgba(255,255,255,.78)', marginTop: 4 }}>Help me uncover the rest →</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {channels.map((c) => (
          <Btn key={c} theme={theme} variant={c === 'Instagram' ? 'primary' : 'soft'} size="md" style={{ flex: '1 1 44%' }} onClick={onClose}>
            <Icon name="share" size={16} color={c === 'Instagram' ? theme.accentText : theme.text} />{c}
          </Btn>
        ))}
      </div>
    </Sheet>
  );
}

// ── completion ──────────────────────────────────────────────────────────────
function CompletionOverlay({ theme, state, set, onClose, hostRef }) {
  const Icon = window.Icon;
  React.useEffect(() => { if (theme.celebrate === 'confetti') window.fireConfetti(hostRef.current, theme); }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: theme.bg, color: theme.text, overflowY: 'auto', animation: 'ug-fade .4s ease' }}>
      <div style={{ padding: '64px 22px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: theme.fontBody, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>Fully revealed</div>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 34, lineHeight: 1.05, marginBottom: 18, letterSpacing: theme.displayTracking }}>“{window.NARRATIVE.piece}” is whole.</div>
        <MiniReveal theme={theme} state={state} width={250} showCover={false} />
        <p style={{ fontFamily: theme.fontBody, fontSize: 15.5, color: theme.muted, lineHeight: 1.6, maxWidth: 320, margin: '20px 0 22px', textWrap: 'pretty' }}>
          You helped uncover the whole journey. The picture now belongs to everyone who revealed it.
        </p>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
          {[['frame', `${state.raffles} raffle`], ['image', `${state.wallpapers} wallpaper`]].map(([ic, t], i) => (
            <div key={i} style={{ flex: 1, background: theme.surface, borderRadius: 16, padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: `1px solid ${theme.line}` }}>
              <Icon name={ic} size={24} color={theme.accent} />
              <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>{t}{ +t.split(' ')[0] === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
        <Btn theme={theme} size="lg" style={{ width: '100%', maxWidth: 320, marginTop: 18 }} onClick={() => set({ sheet: 'share', completed: true })}>Share the final piece</Btn>
        <Btn theme={theme} variant="ghost" size="md" style={{ marginTop: 10 }} onClick={() => set(window.makeInitialState())}>Restart demo</Btn>
      </div>
    </div>
  );
}

// ── rewards hub — everything you've collected in one place ───────────────────
function RewardsSheet({ theme, state, set, onClose }) {
  const Icon = window.Icon;
  const rows = [
    { icon: 'gift',  label: 'Free pixels',    value: state.freePixels, sub: 'Tap any square to spend them — no charge' },
    { icon: 'tag',   label: 'Coupon',         value: state.couponPct ? '50% off' : '—', sub: state.couponPct ? 'Applies to your next paid pixel' : 'Win one from a reveal or the daily spin' },
    { icon: 'image', label: 'Wallpapers',     value: state.wallpapers, sub: 'Save the artwork to your phone', go: 'wallpapers' },
    { icon: 'frame', label: 'Raffle entries', value: state.raffles,    sub: 'In the draw for a signed physical print', go: 'raffle' },
    { icon: 'crown', label: 'Golden pixels',  value: state.jackpots,   sub: 'Jackpot reveals you\u2019ve hit' },
  ];
  return (
    <Sheet theme={theme} title="Your rewards" onClose={onClose}>
      <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
        Everything you\u2019ve unlocked by revealing pixels, spinning and inviting friends.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => {
          const interactive = !!r.go;
          const inner = (
            <>
              <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: theme.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={r.icon} size={24} color={theme.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16 }}>{r.label}</div>
                <div style={{ fontFamily: theme.fontBody, fontSize: 12.5, color: theme.muted, marginTop: 2 }}>{r.sub}</div>
              </div>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22 }}>{r.value}</div>
              {interactive && <Icon name="arrow" size={20} color={theme.accent} />}
            </>
          );
          const baseStyle = { display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', borderRadius: 16,
            background: theme.surface, border: `1px solid ${theme.line}`, color: theme.text, textAlign: 'left', width: '100%' };
          return interactive ? (
            <button key={r.label} onClick={() => set({ sheet: r.go })} style={{ ...baseStyle, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{inner}</button>
          ) : (
            <div key={r.label} style={baseStyle}>{inner}</div>
          );
        })}
      </div>
      {/* Quiet recovery path — only matters on a new phone or after a cache wipe */}
      <button onClick={() => set({ sheet: 'restore' })} style={{ display: 'block', margin: '18px auto 2px',
        border: 'none', background: 'transparent', cursor: 'pointer', color: theme.faint,
        fontFamily: theme.fontBody, fontSize: 12.5, textDecoration: 'underline' }}>
        Switched phones? Restore your pixels
      </button>
    </Sheet>
  );
}

// ── restore on a new device — verify the email Stripe captured, no password ──
function RestoreSheet({ theme, set, toast, onClose }) {
  const [phase, setPhase] = React.useState('email'); // email | code | done
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const post = async (body) => {
    const r = await fetch('/api/restore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  };

  const sendCode = async () => {
    if (busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast && toast('Enter a valid email'); return; }
    setBusy(true);
    const { ok, data } = await post({ step: 'send', email });
    setBusy(false);
    if (!ok) { toast && toast(data.error || 'Could not send code'); return; }
    setPhase('code');
    toast && toast('Check your email for a code');
  };

  const verify = async () => {
    if (busy || code.length < 6) return;
    setBusy(true);
    const { ok, data } = await post({ step: 'verify', email, code });
    setBusy(false);
    if (!ok || !data.ok) { toast && toast(data.error || 'Wrong code'); return; }
    window.GameSync && window.GameSync.applyPlayer(set, data.player);
    setPhase('done');
    toast && toast('Restored ✓');
    setTimeout(() => set({ sheet: null }), 1100);
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14,
    border: `1px solid ${theme.line}`, background: theme.surfaceAlt, color: theme.text,
    fontFamily: theme.fontBody, fontSize: 16, marginBottom: 12, outline: 'none' };

  return (
    <Sheet theme={theme} title="Restore your pixels" onClose={onClose}>
      <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
        {phase === 'done'
          ? 'All your pixels and rewards are back on this device.'
          : 'Enter the email you used at checkout. We’ll send a 6-digit code to bring your purchases to this device — no password needed.'}
      </div>

      {phase === 'email' && (
        <>
          <input style={inputStyle} type="email" inputMode="email" autoComplete="email"
            placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value.trim())} />
          <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={sendCode} disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </Btn>
        </>
      )}

      {phase === 'code' && (
        <>
          <input style={{ ...inputStyle, letterSpacing: 8, textAlign: 'center', fontWeight: 700 }}
            type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={verify} disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Restore'}
          </Btn>
          <button onClick={sendCode} disabled={busy} style={{ display: 'block', margin: '12px auto 0',
            border: 'none', background: 'transparent', cursor: 'pointer', color: theme.faint,
            fontFamily: theme.fontBody, fontSize: 12.5, textDecoration: 'underline' }}>
            Resend code
          </button>
        </>
      )}

      {phase === 'done' && (
        <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={() => set({ sheet: null })}>Keep revealing</Btn>
      )}
    </Sheet>
  );
}

// ── wallpapers — view & actually download the art, sized for a phone ─────────
function WallpaperSheet({ theme, state, onClose }) {
  const Icon = window.Icon;
  const variants = window.WALLPAPER_VARIANTS;
  const unlocked = Math.min(state.wallpapers, variants.length);
  const [saving, setSaving] = React.useState(null);

  const downloadWallpaper = (v) => {
    setSaving(v.id);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = 1179, H = 2556; // iPhone-ish portrait
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      const scale = Math.max(W / img.width, H / img.height) * (v.zoom || 1);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (W - dw) * (v.fx ?? 0.5), (H - dh) * (v.fy ?? 0.5), dw, dh);
      // subtle bottom wordmark
      const g = ctx.createLinearGradient(0, H - 360, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 360, W, 360);
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'center';
      ctx.font = '600 64px Fredoka, system-ui, sans-serif';
      ctx.fillText('\u201cHolding Light\u201d', W / 2, H - 150);
      ctx.font = '500 38px Fredoka, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillText('UNVEIL', W / 2, H - 92);
      c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `holding-light-${v.id}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        setSaving(null);
      }, 'image/png');
    };
    img.onerror = () => setSaving(null);
    img.src = theme.painting;
  };

  return (
    <Sheet theme={theme} title="Wallpapers" onClose={onClose}>
      <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
        {unlocked > 0
          ? `You\u2019ve unlocked ${unlocked} of ${variants.length} framings of \u201cHolding Light.\u201d Save any to your phone.`
          : 'Reveal a \u201cWallpaper\u201d reward to unlock a digital piece of the painting for your phone.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {variants.map((v, i) => {
          const isUnlocked = i < unlocked;
          return (
            <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 19.5', borderRadius: 14, overflow: 'hidden',
                backgroundImage: `url(${theme.painting})`, backgroundSize: 'cover',
                backgroundPosition: `${(v.fx ?? 0.5) * 100}% ${(v.fy ?? 0.5) * 100}%`,
                border: `1px solid ${theme.line}`, boxShadow: '0 8px 22px rgba(0,0,0,.3)',
                filter: isUnlocked ? 'none' : 'grayscale(.7) brightness(.55)' }}>
                {!isUnlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="lock" size={22} color="#fff" />
                  </div>
                )}
              </div>
              <div style={{ fontFamily: theme.fontBody, fontSize: 11.5, fontWeight: 700, color: theme.text, textAlign: 'center' }}>{v.label}</div>
              {isUnlocked ? (
                <button onClick={() => downloadWallpaper(v)} disabled={saving === v.id} style={{ border: 'none', cursor: 'pointer',
                  background: theme.accent, color: theme.accentText, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 12,
                  padding: '8px 0', borderRadius: 10, WebkitTapHighlightColor: 'transparent' }}>
                  {saving === v.id ? 'Saving…' : 'Save'}
                </button>
              ) : (
                <div style={{ fontFamily: theme.fontBody, fontSize: 10.5, color: theme.faint, textAlign: 'center', padding: '6px 0' }}>Locked</div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

// ── raffle — the signed-print draw, your entries & live odds ─────────────────
function RaffleSheet({ theme, state, set, onClose }) {
  const Icon = window.Icon;
  const R = window.RAFFLE;
  const mine = state.raffles || 0;
  const codes = state.raffleCodes || [];
  const totalPot = R.communityEntries + mine;
  const oddsPct = mine > 0 ? (mine / totalPot) * 100 : 0;
  const oddsLabel = mine > 0 ? (oddsPct >= 0.1 ? `${oddsPct.toFixed(1)}%` : '<0.1%') : '—';

  return (
    <Sheet theme={theme} title="Print raffle" onClose={onClose}>
      {/* prize hero */}
      <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${theme.line}`, marginBottom: 16, background: theme.surfaceAlt }}>
        <div style={{ display: 'flex', gap: 14, padding: 16 }}>
          <MiniReveal theme={theme} state={state} width={84} showCover={false} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: theme.fontBody, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.accent, fontWeight: 800, marginBottom: 4 }}>The prize</div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 18, lineHeight: 1.2 }}>{R.prize}</div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 12.5, color: theme.muted, lineHeight: 1.45, marginTop: 6 }}>{R.detail}</div>
          </div>
        </div>
      </div>

      {/* your standing */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[['Your entries', mine], ['Win odds', oddsLabel], ['Total in pot', totalPot.toLocaleString()]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: theme.surface, borderRadius: 14, padding: '13px 12px', border: `1px solid ${theme.line}` }}>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{v}</div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 11, color: theme.muted, marginTop: 4 }}>{k}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, background: theme.surfaceAlt, color: theme.muted, marginBottom: codes.length ? 14 : 4 }}>
        <Icon name="clock" size={16} color={theme.accent} />
        <span style={{ fontFamily: theme.fontBody, fontSize: 12.5, lineHeight: 1.4 }}>Winner drawn <b style={{ color: theme.text }}>{R.drawDate}</b>, once the painting is fully revealed.</span>
      </div>

      {codes.length > 0 ? (
        <>
          <div style={{ fontFamily: theme.fontBody, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.faint, margin: '4px 0 8px' }}>Your entry numbers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {codes.map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: theme.surface, border: `1px solid ${theme.line}` }}>
                <Icon name="frame" size={16} color={theme.accent} />
                <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, letterSpacing: '.06em' }}>{c}</span>
                <span style={{ marginLeft: 'auto', fontFamily: theme.fontBody, fontSize: 11.5, color: theme.faint }}>Entry #{i + 1}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>
            No entries yet. Every \u201cPrint raffle\u201d reward you reveal adds an entry. Keep revealing to get in the draw.
          </div>
          <Btn theme={theme} size="md" style={{ width: '100%' }} onClick={onClose}>Reveal more pixels</Btn>
        </div>
      )}
    </Sheet>
  );
}

// ── batch reveal summary — shown after revealing a pack all at once ───────────
function RevealSummary({ theme, payload, onClose }) {
  const Icon = window.Icon;
  const tally = payload.tally || {};
  const lines = [
    { key: 'bonus',     icon: 'plus',  label: 'Free pixels' },
    { key: 'coupon',    icon: 'tag',   label: '50%-off coupons' },
    { key: 'wallpaper', icon: 'image', label: 'Wallpapers' },
    { key: 'raffle',    icon: 'frame', label: 'Raffle entries' },
    { key: 'jackpot',   icon: 'crown', label: 'Golden pixels' },
  ].filter((l) => tally[l.key]);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)', animation: 'ug-fade .2s ease', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.surface, borderRadius: 24, padding: '28px 24px 22px', width: '100%', maxWidth: 330,
        textAlign: 'center', color: theme.text, boxShadow: '0 30px 70px rgba(0,0,0,.5)', border: `1px solid ${theme.line}`, animation: 'ug-pop .34s cubic-bezier(.2,.9,.3,1.2)' }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.accent, boxShadow: theme.accentGlow }}>
          <Icon name="grid" size={40} color={theme.accentText} sw={1.7} />
        </div>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 26, marginBottom: 6 }}>{payload.count} pixels revealed!</div>
        <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 14.5, lineHeight: 1.4, marginBottom: lines.length ? 18 : 22 }}>
          {lines.length ? 'And here\u2019s what came with them:' : 'A big chunk of the painting just came into view.'}
        </div>
        {lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {lines.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderRadius: 12, background: theme.surfaceAlt }}>
                <Icon name={l.icon} size={18} color={theme.accent} />
                <span style={{ fontFamily: theme.fontBody, fontWeight: 600, fontSize: 14 }}>{l.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16 }}>+{tally[l.key]}</span>
              </div>
            ))}
          </div>
        )}
        <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={onClose}>Keep going</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { PIXEL_PACKS, PAYMENT_LINKS, paymentLinkFor, MiniReveal, RewardPopup, ClaimBox, BundleSheet, PaymentSheet, DailySpinSheet, InviteSheet, StorySheet, LeaderboardSheet, ShareSheet, CompletionOverlay, RewardsSheet, RestoreSheet, WallpaperSheet, RaffleSheet, RevealSummary });
