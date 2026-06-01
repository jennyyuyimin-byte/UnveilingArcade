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

// ── express payment — pay $1/pixel right away (Apple Pay first, no cart) ──────
function PaymentSheet({ theme, state, set, onClose, toast, onPaid }) {
  const Icon = window.Icon;
  const buyInfo = state.pendingBuy || { count: 1, price: 1 };
  const count = buyInfo.count || 1;
  const price = buyInfo.price != null ? buyInfo.price : count;
  const [phase, setPhase] = React.useState('form'); // form | processing | success
  const [num, setNum] = React.useState('');
  const [exp, setExp] = React.useState('');
  const [cvc, setCvc] = React.useState('');

  const fmtNum = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const valid = num.replace(/\s/g, '').length >= 15 && exp.length === 5 && cvc.length >= 3;
  const label = count === 1 ? 'Reveal 1 pixel' : `Reveal ${count} pixels`;

  const finish = () => {
    if (phase !== 'form') return;
    setPhase('processing');
    setTimeout(() => {
      setPhase('success');
      setTimeout(() => {
        onPaid && onPaid(buyInfo);
        set({ sheet: null, pendingBuy: null });
      }, 950);
    }, 1300);
  };

  const close = () => set({ sheet: null, pendingBuy: null });

  const field = (val, setter, placeholder, opts = {}) => (
    <input value={val} onChange={(e) => setter((opts.fmt || ((x) => x))(e.target.value))}
      inputMode={opts.inputMode || 'text'} placeholder={placeholder}
      style={{ width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1.5px solid ${theme.line}`,
        borderRadius: 12, padding: '13px 14px', color: theme.text, fontFamily: theme.fontBody, fontWeight: 600, fontSize: 15.5,
        outline: 'none', letterSpacing: opts.spaced ? '.06em' : 0, ...(opts.style || {}) }}
      onFocus={(e) => (e.target.style.borderColor = theme.accent)}
      onBlur={(e) => (e.target.style.borderColor = theme.line)} />
  );

  return (
    <Sheet theme={theme} title={phase === 'success' ? '' : `Pay ${fmt$(price)}`} onClose={close}>
      {phase === 'success' ? (
        <div style={{ textAlign: 'center', padding: '14px 6px 8px' }}>
          <div style={{ width: 88, height: 88, borderRadius: 44, margin: '0 auto 18px', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.accentGlow, animation: 'ug-pop .4s cubic-bezier(.2,.9,.3,1.3)' }}>
            <Icon name="check" size={46} color={theme.accentText} sw={2.4} />
          </div>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 26, marginBottom: 6 }}>Payment complete</div>
          <div style={{ color: theme.muted, fontFamily: theme.fontBody, fontSize: 15 }}>Revealing {count} pixel{count === 1 ? '' : 's'}…</div>
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
              <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>“{window.NARRATIVE.piece}” · $1 each</div>
            </div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22 }}>{fmt$(price)}</div>
          </div>

          {/* express pay — the immediate primary action */}
          <button onClick={finish} disabled={phase === 'processing'} style={{ width: '100%', height: 52, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 10, WebkitTapHighlightColor: 'transparent' }}>
            {phase === 'processing'
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: 16 }}><span className="ug-spin" style={{ width: 18, height: 18, borderRadius: 9, border: '2.4px solid #fff', borderTopColor: 'transparent', display: 'inline-block' }} />Paying…</span>
              : <><Icon name="apple" size={22} color="#fff" /><span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: 18 }}>Pay</span></>}
          </button>
          <button onClick={finish} disabled={phase === 'processing'} style={{ width: '100%', height: 52, borderRadius: 13, cursor: 'pointer',
            background: '#fff', color: '#3c4043', border: '1px solid #dadce0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, WebkitTapHighlightColor: 'transparent' }}>
            <Icon name="google" size={20} /><span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: 16 }}>Pay</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px', color: theme.faint }}>
            <div style={{ flex: 1, height: 1, background: theme.line }} />
            <div style={{ fontFamily: theme.fontBody, fontSize: 12, fontWeight: 600 }}>or pay with card</div>
            <div style={{ flex: 1, height: 1, background: theme.line }} />
          </div>

          {/* card form */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {field(num, setNum, 'Card number', { inputMode: 'numeric', fmt: fmtNum, spaced: true })}
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="card" size={22} color={theme.faint} /></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {field(exp, setExp, 'MM/YY', { inputMode: 'numeric', fmt: fmtExp })}
            {field(cvc, setCvc, 'CVC', { inputMode: 'numeric', fmt: (v) => v.replace(/\D/g, '').slice(0, 4) })}
          </div>

          <Btn theme={theme} size="lg" style={{ width: '100%' }} disabled={!valid || phase === 'processing'} onClick={finish}>
            {phase === 'processing'
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><span className="ug-spin" style={{ width: 18, height: 18, borderRadius: 9, border: `2.4px solid ${theme.accentText}`, borderTopColor: 'transparent', display: 'inline-block' }} />Processing…</span>
              : `Pay ${fmt$(price)}`}
          </Btn>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, color: theme.faint }}>
            <Icon name="lock" size={14} color={theme.faint} />
            <span style={{ fontFamily: theme.fontBody, fontSize: 11.5 }}>Prototype — no real charge is made.</span>
          </div>
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

  const spin = () => {
    if (spinning || state.dailyUsed) return;
    setSpinning(true); setResult(null);
    // weight toward small/none
    const idx = window.weightedPick(segs.map((s, i) => ({ type: i, weight: s.reward === 'bonus3' ? 1 : s.reward === 'wallpaper' ? 2 : 4 })));
    const target = 360 * 5 - (idx * seg + seg / 2) + (rot - (rot % 360));
    setRot(target);
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
  const claim = () => {
    if (!state.invited) { set((s) => ({ ...s, invited: true, freePixels: s.freePixels + 1 })); toast('Invite sent · +1 free pixel'); }
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

Object.assign(window, { MiniReveal, RewardPopup, PaymentSheet, DailySpinSheet, InviteSheet, StorySheet, LeaderboardSheet, ShareSheet, CompletionOverlay });
