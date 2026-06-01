// game-actions.jsx — pure-ish helpers + data shared by app and sheets.
// Exports: applyReward, SPIN_SEGMENTS, LEADERBOARD, percentRevealed, randomCovered

function percentRevealed(state) {
  const n = Object.keys(state.revealed).length;
  return Math.round((n / window.GAME_TOTAL) * 100);
}
function randomCovered(state) {
  const covered = [];
  for (let i = 0; i < window.GAME_TOTAL; i++) if (!state.revealed[i]) covered.push(i);
  if (!covered.length) return null;
  return covered[(Math.random() * covered.length) | 0];
}

// apply a resolved reward type to the store (called after a buy / spin / open)
function applyReward(set, resolved) {
  set((s) => {
    const n = { ...s };
    if (resolved === 'coupon') n.couponPct = 0.5;
    else if (resolved === 'bonus') n.freePixels = s.freePixels + 1;
    else if (resolved === 'wallpaper') n.wallpapers = s.wallpapers + 1;
    else if (resolved === 'raffle') n.raffles = s.raffles + 1;
    else if (resolved === 'jackpot') n.freePixels = s.freePixels + 10;
    return n;
  });
}

// Daily spin wheel segments (8). Mostly small wins.
const SPIN_SEGMENTS = [
  { label: 'Free pixel', reward: 'bonus', color: '#36C5F0' },
  { label: '50% off', reward: 'coupon', color: '#FFC400' },
  { label: '+2 pixels', reward: 'pixels2', color: '#2EC27E' },
  { label: 'Wallpaper', reward: 'wallpaper', color: '#E1306C' },
  { label: 'Free pixel', reward: 'bonus', color: '#36C5F0' },
  { label: '50% off', reward: 'coupon', color: '#FFC400' },
  { label: '+3 pixels', reward: 'bonus3', color: '#7C5CFF' },
  { label: 'Almost!', reward: 'none', color: '#9AA0B4' },
];

const LEADERBOARD = [
  { name: 'mei.paints', px: 64, flag: '🏆' },
  { name: 'oceancrosser', px: 51 },
  { name: 'pixel_pilgrim', px: 47 },
  { name: 'd.huang', px: 39 },
  { name: 'studio_nori', px: 33 },
  { name: 'late_bloomer', px: 28 },
  { name: 'rivertown', px: 24 },
  { name: 'qiqi___', px: 19 },
];

Object.assign(window, { percentRevealed, randomCovered, applyReward, SPIN_SEGMENTS, LEADERBOARD });
