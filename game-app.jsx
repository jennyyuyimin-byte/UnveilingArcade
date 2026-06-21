// game-app.jsx — GameApp: the full screen. Exports window.GameApp
const { Btn: UBtn, fmt$: ufmt } = window;

function GameApp({ themeId = 'cosmic', instanceId }) {
  const theme = window.THEMES[themeId];
  const id = instanceId || themeId;
  const [state, set] = window.useGameStore(id);
  const Icon = window.Icon;
  const hostRef = React.useRef(null);
  const [doneSeen, setDoneSeen] = React.useState(false);

  const { cols, rows, basePrice } = window.GAME;
  const TOTAL = window.GAME_TOTAL;
  const revealedCount = Object.keys(state.revealed).length;
  const pct = Math.round((revealedCount / TOTAL) * 100);
  const priceNow = state.couponPct ? +(basePrice * (1 - state.couponPct)).toFixed(2) : basePrice;

  const toast = (msg) => { set({ toast: msg }); clearTimeout(window['_t' + id]); window['_t' + id] = setTimeout(() => set({ toast: null }), 1700); };
  const flashIdx = (i) => { set({ flash: i }); setTimeout(() => set((s) => (s.flash === i ? { ...s, flash: null } : s)), 650); };

  // reveal a pixel — free if you have free pixels, otherwise pay $1 right away
  const buy = (indexArg) => {
    const cur = peekState();
    const index = indexArg != null ? indexArg : window.randomCovered(cur);
    if (index == null || cur.revealed[index]) return;
    if (cur.freePixels > 0) {
      set((st) => ({ ...st, revealed: { ...st.revealed, [index]: 'me' }, myPixels: st.myPixels + 1, freePixels: st.freePixels - 1 }));
      flashIdx(index);
      toast('Free pixel ✓');
      if (theme.celebrate === 'confetti') window.fireConfetti(hostRef.current, theme);
      const r = window.rollReward(); window.applyReward(set, r.resolved); set({ reward: r });
      return;
    }
    // payment required → show the claim box (with sprinkles) first, then pay
    const price = cur.couponPct ? +(basePrice * (1 - cur.couponPct)).toFixed(2) : basePrice;
    const reward = window.rollReward();
    set({ sheet: 'claim', pendingBuy: { count: 1, price, index, reward, packId: price < 1 ? 'single_half' : 'single' } });
  };

  // open the "Get more pixels" bundle sheet (credit packs)
  const openBundles = () => set({ sheet: 'bundles' });

  // called by PaymentSheet after a successful payment
  const revealPaid = (info) => {
    // bundle / pixel-pack purchase — reveal all the pack's pixels at random in
    // one go (no tapping one by one), surfacing every reward they carried
    // (raffle entries, wallpapers, coupons, free pixels…) in the recap.
    if (info.kind === 'bundle') {
      revealRandomBatch(info.credits || 0);
      return;
    }
    const cur = peekState();
    const covered = [];
    for (let i = 0; i < TOTAL; i++) if (!cur.revealed[i]) covered.push(i);
    if (!covered.length) return;
    const picks = [];
    if (info.index != null && !cur.revealed[info.index]) picks.push(info.index);
    const rest = covered.filter((i) => !picks.includes(i));
    for (let i = rest.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
    while (picks.length < (info.count || 1) && rest.length) picks.push(rest.pop());
    set((st) => { const rev = { ...st.revealed }; picks.forEach((i) => (rev[i] = 'me')); return { ...st, revealed: rev, myPixels: st.myPixels + picks.length, couponPct: 0 }; });
    flashIdx(picks[0]);
    if (theme.celebrate === 'confetti') window.fireConfetti(hostRef.current, theme);
    // original reveal style — surface the surprise in the "Open it" popup after paying
    const r = info.reward || window.rollReward();
    window.applyReward(set, r.resolved);
    set({ reward: r });
  };

  // read latest store synchronously
  const stateRef = React.useRef(state); stateRef.current = state;
  function peekState() { return stateRef.current; }

  // reveal N random covered pixels in one shot, applying + tallying each pixel's
  // surprise. Used by pixel-pack purchases so 6 / 12 packs unlock instantly
  // instead of forcing the buyer to tap each square.
  const revealRandomBatch = (n) => {
    const cur = peekState();
    const covered = [];
    for (let i = 0; i < TOTAL; i++) if (!cur.revealed[i]) covered.push(i);
    if (!covered.length) return;
    for (let i = covered.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [covered[i], covered[j]] = [covered[j], covered[i]]; }
    const take = Math.min(n, covered.length);
    const picks = covered.slice(0, take);
    const tally = {};
    picks.forEach(() => {
      const r = window.rollReward();
      window.applyReward(set, r.resolved);
      tally[r.resolved] = (tally[r.resolved] || 0) + 1;
    });
    set((st) => {
      const rev = { ...st.revealed };
      picks.forEach((i) => (rev[i] = 'me'));
      return { ...st, revealed: rev, myPixels: st.myPixels + picks.length };
    });
    picks.forEach((idx, k) => setTimeout(() => flashIdx(idx), k * 70));
    if (theme.celebrate === 'confetti') window.fireConfetti(hostRef.current, theme);
    set({ revealSummary: { count: picks.length, tally } });
  };

  // reveal a batch of pixels at once (used by pixel packs — no tapping one by one)
  const revealMany = (n) => {
    const cur = peekState();
    if (cur.freePixels <= 0) return;
    const covered = [];
    for (let i = 0; i < TOTAL; i++) if (!cur.revealed[i]) covered.push(i);
    if (!covered.length) return;
    for (let i = covered.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [covered[i], covered[j]] = [covered[j], covered[i]]; }
    const take = Math.min(n, cur.freePixels, covered.length);
    const picks = covered.slice(0, take);
    const tally = {};
    picks.forEach((idx) => {
      const r = window.rollReward();
      window.applyReward(set, r.resolved);
      tally[r.resolved] = (tally[r.resolved] || 0) + 1;
    });
    set((st) => {
      const rev = { ...st.revealed };
      picks.forEach((i) => (rev[i] = 'me'));
      return { ...st, revealed: rev, myPixels: st.myPixels + picks.length, freePixels: st.freePixels - picks.length };
    });
    picks.forEach((idx, k) => setTimeout(() => flashIdx(idx), k * 70));
    if (theme.celebrate === 'confetti') window.fireConfetti(hostRef.current, theme);
    set({ revealSummary: { count: picks.length, tally } });
  };

  // ── Stripe return verification (server-authoritative) ────────────────────
  // On return from Stripe we ask our Vercel /api/verify function whether this
  // checkout session was ACTUALLY paid. Only then do we reveal — and we reveal
  // exactly what Stripe says was bought (credits read from the session
  // metadata), so a forged URL can't unlock pixels. If the backend isn't
  // deployed yet (e.g. the in-app preview has no /api), we fall back to a
  // best-effort format check so the demo still runs.
  React.useEffect(() => {
    let session = null;
    try {
      const qs = new URLSearchParams(window.location.search);
      session = qs.get('unveil_session') || qs.get('session_id') || qs.get('checkout_session_id');
    } catch (e) {}
    if (!session) return;
    const cleanUrl = () => { try { history.replaceState({}, '', window.location.pathname); } catch (e) {} };
    if ((peekState().paidSessions || []).includes(session)) { cleanUrl(); return; }

    const reconstruct = (v) => v.kind === 'bundle'
      ? { kind: 'bundle', credits: v.credits }
      : { count: v.credits || 1 };

    let cancelled = false;
    (async () => {
      let v = null;
      try {
        const r = await fetch('/api/verify?session=' + encodeURIComponent(session));
        if (r.ok) v = await r.json();
      } catch (e) {}
      if (cancelled) return;

      // backend answered authoritatively
      if (v && typeof v.paid === 'boolean') {
        if (!v.paid) { toast('Payment not verified'); cleanUrl(); return; }
        set((st) => ({ ...st, paidSessions: [...(st.paidSessions || []), session] }));
        const cur = peekState();
        revealPaid(cur.pendingBuy && cur.pendingBuy.packId ? cur.pendingBuy : reconstruct(v));
        set({ sheet: null, pendingBuy: null });
        cleanUrl();
        return;
      }

      // no backend reachable (preview) → best-effort format fallback
      const looksValid = /^cs_(test|live)_[A-Za-z0-9]+$/.test(session) || /^demo_\d+$/.test(session);
      if (!looksValid) { toast('Couldn’t verify that payment'); cleanUrl(); return; }
      set((st) => ({ ...st, paidSessions: [...(st.paidSessions || []), session] }));
      const cur = peekState();
      if (cur.pendingBuy) revealPaid(cur.pendingBuy);
      set({ sheet: null, pendingBuy: null });
      cleanUrl();
    })();
    return () => { cancelled = true; };
  }, []);

  const showCompletion = revealedCount === TOTAL && !state.reward && state.sheet !== 'share' && !doneSeen;

  // ── small presentational bits ──
  const chip = (icon, label, sheet, badge) => (
    <button onClick={() => set({ sheet })} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
      background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 999, padding: '9px 14px', cursor: 'pointer',
      color: theme.text, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 13.5, WebkitTapHighlightColor: 'transparent' }}>
      <Icon name={icon} size={17} color={theme.accent} />{label}
      {badge && <span style={{ background: theme.accent, color: theme.accentText, fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 8, letterSpacing: '.03em' }}>{badge}</span>}
    </button>
  );

  const cellSize = 100 / cols;

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, background: themeId === 'cosmic'
      ? `radial-gradient(120% 80% at 50% 0%, ${theme.bg2} 0%, ${theme.bg} 60%)` : theme.bg,
      color: theme.text, fontFamily: theme.fontBody, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── header ── */}
      <div style={{ padding: '52px 16px 12px', flexShrink: 0, position: 'relative', zIndex: 6, background: themeId === 'arcade' ? theme.bg2 : 'transparent',
        borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: theme.faint }}>{window.NARRATIVE.brand}</div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 22, letterSpacing: theme.displayTracking, lineHeight: 1 }}>“{window.NARRATIVE.piece}”</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7,
            background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 999, padding: '8px 14px', color: theme.text }}>
            <Icon name={state.freePixels > 0 ? 'gift' : 'bolt'} size={17} color={theme.accent} />
            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15 }}>{state.freePixels > 0 ? `${state.freePixels} free` : '$1 / pixel'}</span>
          </div>
        </div>
        {/* progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 8, background: theme.progressTrack, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 8, background: theme.accent, boxShadow: theme.accentGlow, transition: 'width .5s cubic-bezier(.2,.8,.3,1)' }} />
          </div>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
        </div>
        <div style={{ fontFamily: theme.fontBody, fontSize: 11.5, color: theme.faint, marginTop: 5 }}>{revealedCount} of {TOTAL} pixels revealed · {state.freePixels > 0 ? `${state.freePixels} free` : `${ufmt(priceNow)} each`}{state.couponPct ? ' (50% off!)' : ''}</div>
      </div>

      {/* ── scroll content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* action chips */}
        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '14px 16px 4px', scrollbarWidth: 'none' }}>
          {chip('spin', 'Daily spin', 'spin', state.dailyUsed ? null : 'FREE')}
          {chip('gift', 'Rewards', 'rewards', (state.freePixels + state.wallpapers + state.raffles) || null)}
          {chip('users', 'Invite +1', 'invite')}
          {chip('trophy', 'Leaderboard', 'leaderboard')}
          {chip('share', 'Share', 'share')}
          {chip('info', 'Story', 'story')}
        </div>

        {/* painting grid */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: `${theme.pw} / ${theme.ph}`, borderRadius: 16, overflow: 'hidden',
            backgroundImage: `url(${theme.painting})`, backgroundSize: 'cover', backgroundPosition: 'center',
            boxShadow: '0 18px 50px rgba(0,0,0,.4)', border: `1px solid ${theme.line}` }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
              {[...Array(TOTAL)].map((_, i) => {
                const rev = state.revealed[i];
                if (rev) return (
                  <div key={i} style={{ position: 'relative' }}>
                    {state.flash === i && <div style={{ position: 'absolute', inset: 0, background: theme.accent, animation: 'ug-reveal .6s ease forwards' }} />}
                  </div>
                );
                return (
                  <button key={i} onClick={() => buy(i)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.tile.hover; e.currentTarget.firstChild.style.opacity = 1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = theme.tile.fill; e.currentTarget.firstChild.style.opacity = 0; }}
                    style={{ border: `0.5px solid ${theme.tile.line}`, background: theme.tile.fill, cursor: 'pointer', padding: 0,
                      position: 'relative', WebkitTapHighlightColor: 'transparent', transition: 'background .12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ opacity: 0, transition: 'opacity .12s', fontSize: Math.max(8, cellSize * 0.7), fontWeight: 800, color: theme.accentText,
                      fontFamily: theme.fontBody, pointerEvents: 'none' }}>$</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontFamily: theme.fontBody, fontSize: 12, color: theme.faint, marginTop: 9 }}>Tap any covered square to reveal it — or hit the button below.</div>
        </div>

        {/* stats strip */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 16px 4px' }}>
          {[['My pixels', state.myPixels], ['Revealed', `${pct}%`], ['Rewards', state.wallpapers + state.raffles + state.jackpots]].map(([k, v], i) => (
            <div key={i} style={{ flex: 1, background: theme.surface, borderRadius: 14, padding: '13px 12px', border: `1px solid ${theme.line}` }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 24, lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: theme.fontBody, fontSize: 11.5, color: theme.muted, marginTop: 4 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* deal card */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: theme.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="grid" size={26} color={theme.accent} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 17 }}>Get more pixels</div>
              <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>Packs from $5 · bonus pixels included</div>
            </div>
            <Btn theme={theme} size="md" onClick={openBundles}>View packs</Btn>
          </div>
        </div>

        {/* daily spin card */}
        <div style={{ padding: '12px 16px 0' }}>
          <button onClick={() => set({ sheet: 'spin' })} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 16, color: theme.text, WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: theme.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="spin" size={26} color={theme.accent} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 17 }}>Daily free spin</div>
              <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>{state.dailyUsed ? 'Come back tomorrow' : 'One spin on us — win pixels & coupons'}</div>
            </div>
            {!state.dailyUsed && <span style={{ background: theme.accent, color: theme.accentText, fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 10 }}>FREE</span>}
          </button>
        </div>

        {/* story teaser */}
        <div style={{ padding: '12px 16px 0' }}>
          <button onClick={() => set({ sheet: 'story' })} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
            background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 16, color: theme.text, WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: theme.fontBody, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.faint, marginBottom: 4 }}>The story</div>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 18, lineHeight: 1.2 }}>Why this painting is hidden</div>
            </div>
            <Icon name="arrow" size={22} color={theme.accent} />
          </button>
        </div>

        {/* leaderboard preview */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: 18, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16 }}>Top revealers</div>
              <button onClick={() => set({ sheet: 'leaderboard' })} style={{ border: 'none', background: 'transparent', color: theme.accent, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>See all</button>
            </div>
            {[...window.LEADERBOARD.slice(0, 3)].map((r, i) => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <div style={{ width: 18, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted }}>{i + 1}</div>
                <div style={{ flex: 1, fontFamily: theme.fontBody, fontWeight: 600, fontSize: 14.5 }}>{r.name}{i === 0 ? '  🏆' : ''}</div>
                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700 }}>{r.px}</div>
              </div>
            ))}
          </div>
        </div>

        {/* invite card */}
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{ background: theme.accent, borderRadius: 18, padding: 18, color: theme.accentText, boxShadow: theme.accentGlow }}>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 19, lineHeight: 1.15 }}>Invite a friend, you both get a free pixel</div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 13.5, opacity: .85, margin: '6px 0 14px' }}>The fastest way to reveal more without spending.</div>
            <button onClick={() => set({ sheet: 'invite' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
              background: theme.accentText, color: theme.accent, fontFamily: theme.fontBody, fontWeight: 800, fontSize: 14.5, padding: '11px 18px', borderRadius: theme.btnRadius, WebkitTapHighlightColor: 'transparent' }}>
              <Icon name="users" size={18} color={theme.accent} />Send invite
            </button>
          </div>
        </div>
      </div>

      {/* ── bottom CTA ── */}
      <div style={{ flexShrink: 0, padding: '12px 16px 30px', borderTop: `1px solid ${theme.line}`,
        background: themeId === 'arcade' ? theme.bg2 : (theme.deviceDark ? 'rgba(0,0,0,.25)' : theme.surface),
        backdropFilter: 'blur(10px)', position: 'relative', zIndex: 6 }}>
        {state.freePixels > 0 ? (
          <>
            <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={() => revealMany(state.freePixels)} disabled={revealedCount === TOTAL}>
              {revealedCount === TOTAL ? 'Fully revealed ✓' : `Reveal all ${state.freePixels} at once`}
            </Btn>
            {revealedCount !== TOTAL && (
              <button onClick={() => buy(null)} style={{ width: '100%', marginTop: 9, border: 'none', background: 'transparent', cursor: 'pointer',
                color: theme.accent, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 13.5, padding: '4px 0', WebkitTapHighlightColor: 'transparent' }}>
                Or reveal one at a time
              </button>
            )}
          </>
        ) : (
          <>
            <Btn theme={theme} size="lg" style={{ width: '100%' }} onClick={() => buy(null)} disabled={revealedCount === TOTAL}>
              {revealedCount === TOTAL ? 'Fully revealed ✓' : `Reveal a pixel · ${ufmt(priceNow)}`}
            </Btn>
            {revealedCount !== TOTAL && (
              <button onClick={openBundles} style={{ width: '100%', marginTop: 9, border: 'none', background: 'transparent', cursor: 'pointer',
                color: theme.accent, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 13.5, padding: '4px 0', WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="grid" size={16} color={theme.accent} />Save with a pixel pack — 6 for $5
              </button>
            )}
          </>
        )}
      </div>

      {/* ── overlays ── */}
      <window.Toast theme={theme} toast={state.toast} />
      {state.reward && <window.RewardPopup theme={theme} payload={state.reward} onClose={() => set({ reward: null })} />}
      {state.revealSummary && <window.RevealSummary theme={theme} payload={state.revealSummary} onClose={() => set({ revealSummary: null })} />}
      {state.sheet === 'claim' && <window.ClaimBox theme={theme} state={state} set={set} onClose={() => set({ sheet: null, pendingBuy: null })} />}
      {state.sheet === 'bundles' && <window.BundleSheet theme={theme} state={state} set={set} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'rewards' && <window.RewardsSheet theme={theme} state={state} set={set} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'wallpapers' && <window.WallpaperSheet theme={theme} state={state} onClose={() => set({ sheet: 'rewards' })} />}
      {state.sheet === 'raffle' && <window.RaffleSheet theme={theme} state={state} set={set} onClose={() => set({ sheet: 'rewards' })} />}
      {state.sheet === 'payment' && <window.PaymentSheet theme={theme} state={state} set={set} toast={toast} onPaid={revealPaid} onClose={() => set({ sheet: null, pendingBuy: null })} />}
      {state.sheet === 'spin' && <window.DailySpinSheet theme={theme} state={state} set={set} toast={toast} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'invite' && <window.InviteSheet theme={theme} state={state} set={set} toast={toast} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'story' && <window.StorySheet theme={theme} state={state} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'leaderboard' && <window.LeaderboardSheet theme={theme} state={state} onClose={() => set({ sheet: null })} />}
      {state.sheet === 'share' && <window.ShareSheet theme={theme} state={state} onClose={() => set({ sheet: null })} />}
      {showCompletion && <window.CompletionOverlay theme={theme} state={state} set={set} hostRef={hostRef} onClose={() => setDoneSeen(true)} />}
    </div>
  );
}
window.GameApp = GameApp;
