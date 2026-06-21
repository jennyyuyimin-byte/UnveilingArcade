// api/_economy.js — the reveal economy, server-side and authoritative.
// This is the same reward odds the client shows, but here the rolls actually
// MINT free pixels, so they must run on the server: a tampered browser can no
// longer grant itself reveals. Mirrors game-engine.jsx / game-actions.jsx —
// keep the two in sync if you tune the odds.

// Per-reveal surprise odds ("almost always small wins").
const REWARD_POOL = [
  { type: 'coupon',    weight: 28 },
  { type: 'bonus',     weight: 26 },
  { type: 'flavor',    weight: 18 },
  { type: 'wallpaper', weight: 12 },
  { type: 'mystery',   weight: 9 },
  { type: 'raffle',    weight: 5 },
  { type: 'jackpot',   weight: 2 },
];

// Daily-spin wheel (index order must match SPIN_SEGMENTS in game-actions.jsx).
const SPIN_SEGMENTS = [
  { label: 'Free pixel', reward: 'bonus' },
  { label: '50% off',    reward: 'coupon' },
  { label: '+2 pixels',  reward: 'pixels2' },
  { label: 'Wallpaper',  reward: 'wallpaper' },
  { label: 'Free pixel', reward: 'bonus' },
  { label: '50% off',    reward: 'coupon' },
  { label: '+3 pixels',  reward: 'bonus3' },
  { label: 'Almost!',    reward: 'none' },
];

function weightedPick(pool) {
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const r of pool) { if ((n -= r.weight) <= 0) return r.type; }
  return pool[0].type;
}

// A single reveal's surprise. `mystery` resolves to a concrete small/mid prize.
function rollReward() {
  const shown = weightedPick(REWARD_POOL);
  let resolved = shown;
  if (shown === 'mystery') {
    resolved = weightedPick([
      { type: 'coupon', weight: 30 }, { type: 'bonus', weight: 30 },
      { type: 'wallpaper', weight: 25 }, { type: 'jackpot', weight: 5 },
      { type: 'raffle', weight: 10 },
    ]);
  }
  return { shown, resolved };
}

function makeRaffleCode() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HL-${a}-${b}`;
}

// Apply a resolved reward to the SERVER player record (mints free pixels etc).
function applyResolved(player, resolved) {
  if (resolved === 'coupon') player.couponPct = 0.5;
  else if (resolved === 'bonus') player.freePixels += 1;
  else if (resolved === 'wallpaper') player.wallpapers += 1;
  else if (resolved === 'raffle') {
    player.raffles += 1;
    player.raffleCodes = [...(player.raffleCodes || []), makeRaffleCode()];
  } else if (resolved === 'jackpot') {
    player.freePixels += 10;
    player.jackpots += 1;
  }
  // 'flavor' / 'none' grant nothing
}

// Apply a daily-spin segment to the SERVER player record.
function applySpinSegment(player, seg) {
  if (seg.reward === 'pixels2') player.freePixels += 2;
  else if (seg.reward === 'bonus3') player.freePixels += 3;
  else if (seg.reward === 'bonus') player.freePixels += 1;
  else if (seg.reward === 'coupon') player.couponPct = 0.5;
  else if (seg.reward === 'wallpaper') player.wallpapers += 1;
}

// Pick a spin segment, weighted toward small/none (matches the client wheel).
function pickSpinIndex() {
  const idx = weightedPick(
    SPIN_SEGMENTS.map((s, i) => ({
      type: i,
      weight: s.reward === 'bonus3' ? 1 : s.reward === 'wallpaper' ? 2 : 4,
    }))
  );
  return idx;
}

const utcDay = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

module.exports = {
  REWARD_POOL, SPIN_SEGMENTS,
  weightedPick, rollReward, applyResolved, applySpinSegment, pickSpinIndex,
  makeRaffleCode, utcDay,
};
