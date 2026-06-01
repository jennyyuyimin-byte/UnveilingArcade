// game-engine.jsx — shared store, reward odds, UI atoms, theme directions
// Exports to window: GAME, THEMES, useGameStore, makeInitialState, rollReward,
//   Btn, Sheet, Toast, Sparkline, fireConfetti, fmt$, NARRATIVE
// ──────────────────────────────────────────────────────────────────────────

// The painting / experience copy. Grounded in the artist's note — edit freely.
const NARRATIVE = {
  brand: 'UNVEIL',
  piece: 'Enter',
  artist: 'the artist',
  // shown on the story sheet
  story: [
    "I crossed an ocean to get here.",
    "“Enter” is the painting I made about that crossing — a small figure standing on a wired-up world, reaching for a light that hadn’t arrived yet. Somewhere between two countries, I used paint to figure out who I was becoming.",
    "So I hid it. One pixel at a time.",
    "Every pixel you reveal uncovers a fragment of that journey — and drops a little something in your pocket too. When the final pixel turns, the whole picture belongs to everyone who helped uncover it.",
  ],
  tagline: 'Reveal the painting, one pixel at a time.',
};

const GAME = {
  cols: 9,
  rows: 12,
  basePrice: 1,        // $ per pixel
  preRevealed: 23,     // community pixels already uncovered at start
  startBalance: 0,     // pay-per-pixel: $1 each via Apple Pay, no prepaid wallet
};
const GAME_TOTAL = GAME.cols * GAME.rows;

// ── reward odds — "almost always small wins" (Temu dopamine) ────────────────
const REWARD_POOL = [
  { type: 'coupon',   weight: 28 },
  { type: 'bonus',    weight: 26 },
  { type: 'flavor',   weight: 18 },
  { type: 'wallpaper',weight: 12 },
  { type: 'mystery',  weight: 9  },
  { type: 'raffle',   weight: 5  },
  { type: 'jackpot',  weight: 2  },
];
const REWARD_META = {
  coupon:   { icon: 'tag',   title: 'Coupon unlocked', line: '50% off your next pixel', tier: 'small' },
  bonus:    { icon: 'plus',  title: 'Free pixel!',     line: '+1 reveal on the house',  tier: 'small' },
  flavor:   { icon: 'spark', title: 'Nice reveal',     line: 'A little more comes into view', tier: 'small' },
  wallpaper:{ icon: 'image', title: 'Wallpaper unlocked', line: 'A digital piece of “Enter” for your phone', tier: 'mid' },
  mystery:  { icon: 'gift',  title: 'Mystery box',     line: 'Tap to open…',            tier: 'mid' },
  raffle:   { icon: 'frame', title: 'Print raffle entry', line: 'Entered to win a signed physical print', tier: 'big' },
  jackpot:  { icon: 'crown', title: 'GOLDEN PIXEL',    line: '+10 free pixels — jackpot!', tier: 'big' },
};
function weightedPick(pool) {
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const r of pool) { if ((n -= r.weight) <= 0) return r.type; }
  return pool[0].type;
}
function rollReward() {
  let type = weightedPick(REWARD_POOL);
  let resolved = type;
  if (type === 'mystery') {
    // mystery resolves to a small/mid prize
    resolved = weightedPick([
      { type: 'coupon', weight: 30 }, { type: 'bonus', weight: 30 },
      { type: 'wallpaper', weight: 25 }, { type: 'jackpot', weight: 5 },
      { type: 'raffle', weight: 10 },
    ]);
  }
  return { shown: type, resolved };
}

// ── shared module-level store (survives focus-mode remounts) ────────────────
const _stores = {};
const _subs = {};
function makeInitialState() {
  const revealed = {};        // index -> 'community' | 'me'
  const idxs = [...Array(GAME_TOTAL).keys()];
  for (let i = idxs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
  idxs.slice(0, GAME.preRevealed).forEach((i) => (revealed[i] = 'community'));
  return {
    revealed,
    balance: GAME.startBalance,
    myPixels: 0,
    freePixels: 0,
    couponPct: 0,            // 0 or 0.5 — discount on next paid pixel
    wallpapers: 0,
    raffles: 0,
    jackpots: 0,
    streak: 0,
    dailyUsed: false,
    sheet: null,             // open sheet id
    reward: null,            // active reward popup payload
    toast: null,
    flash: null,             // index just revealed (for animation)
    invited: false,
    completed: false,
  };
}
function useGameStore(id) {
  const ref = React.useRef(null);
  if (ref.current === null) { if (!_stores[id]) _stores[id] = makeInitialState(); ref.current = id; }
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    (_subs[id] = _subs[id] || []).push(force);
    return () => { _subs[id] = _subs[id].filter((f) => f !== force); };
  }, [id]);
  const set = React.useCallback((updater) => {
    const cur = _stores[id];
    _stores[id] = typeof updater === 'function' ? updater(cur) : { ...cur, ...updater };
    (_subs[id] || []).forEach((f) => f());
  }, [id]);
  return [_stores[id], set];
}

// ── tiny helpers ────────────────────────────────────────────────────────────
const fmt$ = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

function fireConfetti(host, theme) {
  if (!host) return;
  const colors = theme.confettiColors || ['#FF5A1F', '#FFC400', '#36C5F0', '#E1306C', '#2EC27E'];
  const N = 46;
  for (let i = 0; i < N; i++) {
    const p = document.createElement('div');
    const sz = 6 + Math.random() * 7;
    p.style.cssText = `position:absolute;left:50%;top:38%;width:${sz}px;height:${sz * 0.6}px;border-radius:2px;
      background:${colors[i % colors.length]};pointer-events:none;z-index:60;will-change:transform,opacity;`;
    host.appendChild(p);
    const ang = (Math.random() * Math.PI) - Math.PI / 2;
    const vel = 120 + Math.random() * 220;
    const dx = Math.cos(ang) * vel * (Math.random() < .5 ? -1 : 1);
    const dy = -Math.abs(Math.sin(ang) * vel) - 80;
    const rot = (Math.random() * 720 - 360);
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 360}px)) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.15,.6,.4,1)' }).onfinish = () => p.remove();
  }
}

// ── UI atoms (theme-driven, inline styled) ──────────────────────────────────
function Btn({ theme, children, onClick, variant = 'primary', size = 'md', style = {}, disabled }) {
  const base = {
    fontFamily: theme.fontBody, fontWeight: 700, border: 'none', cursor: disabled ? 'default' : 'pointer',
    borderRadius: theme.btnRadius, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, lineHeight: 1, transition: 'transform .12s ease, filter .15s ease, background .15s',
    opacity: disabled ? 0.45 : 1, WebkitTapHighlightColor: 'transparent', letterSpacing: theme.btnTracking || 0,
    textTransform: theme.btnUpper ? 'uppercase' : 'none',
  };
  const sizes = { sm: { padding: '8px 14px', fontSize: 13 }, md: { padding: '13px 18px', fontSize: 15 }, lg: { padding: '16px 20px', fontSize: 17 } };
  const variants = {
    primary: { background: theme.accent, color: theme.accentText, boxShadow: theme.accentGlow || 'none' },
    soft: { background: theme.surfaceAlt, color: theme.text },
    ghost: { background: 'transparent', color: theme.text, boxShadow: `inset 0 0 0 1.5px ${theme.line}` },
    accent2: { background: theme.accent2, color: theme.accentText },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      onPointerDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(.96)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Sheet({ theme, title, onClose, children, accentHeader = false }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', background: 'rgba(0,0,0,.42)', backdropFilter: 'blur(2px)', animation: 'ug-fade .2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: theme.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '10px 18px 26px',
        boxShadow: '0 -12px 40px rgba(0,0,0,.3)', maxHeight: '86%', overflowY: 'auto', animation: 'ug-rise .26s cubic-bezier(.2,.8,.3,1)',
        color: theme.text, borderTop: `1px solid ${theme.line}` }}>
        <div style={{ width: 38, height: 4, borderRadius: 4, background: theme.line, margin: '0 auto 14px' }} />
        {title && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: theme.fontDisplay, fontWeight: theme.displayWeight, fontSize: 24, letterSpacing: theme.displayTracking }}>{title}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer',
            background: theme.surfaceAlt, color: theme.muted, fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>}
        {children}
      </div>
    </div>
  );
}

function Toast({ theme, toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 108, transform: 'translateX(-50%)', zIndex: 55,
      background: theme.toastBg, color: theme.toastText, padding: '10px 16px', borderRadius: 999, fontFamily: theme.fontBody,
      fontWeight: 700, fontSize: 14, boxShadow: '0 10px 30px rgba(0,0,0,.3)', whiteSpace: 'nowrap', animation: 'ug-pop .3s ease' }}>
      {toast}
    </div>
  );
}

// ── theme directions ────────────────────────────────────────────────────────
const THEMES = {
  gallery: {
    id: 'gallery', name: 'Gallery', tagline: 'Calm · premium · art-first',
    deviceDark: true,
    painting: 'assets/enter.jpg', pw: 771, ph: 1051,
    fontDisplay: "'Cormorant Garamond', Georgia, serif", fontBody: "'Inter', -apple-system, system-ui, sans-serif",
    displayWeight: 600, displayTracking: '0.2px',
    bg: '#0E0E11', bg2: '#0E0E11', surface: '#17171B', surfaceAlt: '#202026', line: 'rgba(255,255,255,.10)',
    text: '#F3F0E9', muted: 'rgba(243,240,233,.56)', faint: 'rgba(243,240,233,.34)',
    accent: '#C8A24A', accentText: '#16130A', accent2: '#8C8472', accentGlow: 'none',
    good: '#C8A24A',
    btnRadius: 10, btnUpper: true, btnTracking: '0.06em',
    celebrate: 'subtle',
    tile: { fill: 'rgba(16,16,19,.92)', line: 'rgba(255,255,255,.08)', num: 'rgba(243,240,233,.30)', hover: 'rgba(200,162,74,.22)' },
    progressTrack: 'rgba(255,255,255,.10)',
    toastBg: '#F3F0E9', toastText: '#16130A',
    confettiColors: ['#C8A24A', '#E9DEBE', '#8C8472'],
    pixelWord: 'pixel',
  },
  arcade: {
    id: 'arcade', name: 'Arcade', tagline: 'Bright · playful · Temu energy',
    deviceDark: false,
    painting: 'assets/painting-arcade.jpg', pw: 1179, ph: 1498,
    fontDisplay: "'Fredoka', system-ui, sans-serif", fontBody: "'Fredoka', system-ui, sans-serif",
    displayWeight: 600, displayTracking: '0px',
    bg: '#FFF4EC', bg2: '#FFE9DC', surface: '#FFFFFF', surfaceAlt: '#FFF0E6', line: 'rgba(255,90,31,.16)',
    text: '#34170A', muted: '#9A6B53', faint: '#C2A290',
    accent: '#FF5A1F', accentText: '#FFFFFF', accent2: '#FF2E7E', accentGlow: '0 8px 20px rgba(255,90,31,.34)',
    good: '#2EC27E',
    btnRadius: 18, btnUpper: false, btnTracking: '0px',
    celebrate: 'confetti',
    tile: { fill: '#FF7A3D', line: 'rgba(255,255,255,.55)', num: 'rgba(255,255,255,.9)', hover: '#FF5A1F' },
    progressTrack: 'rgba(255,90,31,.18)',
    toastBg: '#34170A', toastText: '#fff',
    confettiColors: ['#FF5A1F', '#FFC400', '#36C5F0', '#FF2E7E', '#2EC27E'],
    pixelWord: 'pixel',
  },
  cosmic: {
    id: 'cosmic', name: 'Cosmic', tagline: 'Modern · neon · matches the art',
    deviceDark: true,
    painting: 'assets/enter.jpg', pw: 771, ph: 1051,
    fontDisplay: "'Space Grotesk', system-ui, sans-serif", fontBody: "'Space Grotesk', system-ui, sans-serif",
    displayWeight: 600, displayTracking: '-0.5px',
    bg: '#080612', bg2: '#0E0A24', surface: '#15112E', surfaceAlt: '#1F1A40', line: 'rgba(150,130,255,.18)',
    text: '#EDEAFF', muted: 'rgba(237,234,255,.58)', faint: 'rgba(237,234,255,.34)',
    accent: '#7C5CFF', accentText: '#0B0820', accent2: '#22D3EE', accentGlow: '0 8px 26px rgba(124,92,255,.45)',
    good: '#22D3EE',
    btnRadius: 14, btnUpper: false, btnTracking: '0.01em',
    celebrate: 'glow',
    tile: { fill: 'rgba(8,6,20,.92)', line: 'rgba(150,130,255,.22)', num: 'rgba(237,234,255,.34)', hover: 'rgba(124,92,255,.45)' },
    progressTrack: 'rgba(150,130,255,.18)',
    toastBg: '#7C5CFF', toastText: '#fff',
    confettiColors: ['#7C5CFF', '#22D3EE', '#E1306C', '#FFC400'],
    pixelWord: 'pixel',
  },
};

Object.assign(window, {
  GAME, GAME_TOTAL, THEMES, NARRATIVE, REWARD_META,
  useGameStore, makeInitialState, rollReward, weightedPick,
  Btn, Sheet, Toast, fireConfetti, fmt$,
});
