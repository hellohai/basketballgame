/* Courtside Capital — static data & shared helpers */

const CFG = {
  SEASON_GAMES: 24,   // Full GM pace
  QUICK_GAMES: 12,    // Quick Season pace
  SALARY_GAMES: 24,   // salaries are always spread over a full-length season
  ARENA_CAPACITY: 18000,
  ROSTER_MIN: 8,
  ROSTER_MAX: 12,
  MARKET_SIZE: 32,
  PRICE_ELASTICITY: 1.3,   // attendance ∝ (refPrice/price)^ε above the reference price
  CONCESSION_PER_FAN: 9,
  ARENA_OPS_HOME: 400_000,
  STAFF_PER_GAME: 150_000,
  NATIONAL_TV_PER_GAME: 1_200_000,
  NBA_TV_PER_GAME: 2_800_000,     // real-NBA mode: big national media deal offsets star payrolls
  AWAY_GATE_SHARE: 250_000,
  BUY_FEE: 0.10,           // agent fee on market purchases (Analytics Lab reduces it)
  SALARY_RATIO: 0.30,      // season salary as a share of market value at signing
  BANKRUPT_AT: -10_000_000,
  START_CASH: { easy: 40_000_000, normal: 25_000_000, hard: 15_000_000 },
};

const RIVAL_TEAMS = [
  { name: 'Neon Valley Voltage',  str: 74 },
  { name: 'Harbor City Titans',   str: 72 },
  { name: 'Redrock Mavericks',    str: 70 },
  { name: 'Capital Comets',       str: 68 },
  { name: 'Steel Town Forge',     str: 66 },
  { name: 'Palm Coast Breakers',  str: 64 },
  { name: 'Northgate Wolves',     str: 62 },
];

const FIRST_NAMES = [
  'Marcus','DeAndre','Jalen','Tyrese','Kofi','Andrei','Luka','Malik','Devin','Zion',
  'Caleb','Darius','Emeka','Rashad','Theo','Nikola','Jaylen','Trey','Omar','Kenta',
  'Santiago','Isaiah','Grant','Cole','Amari','Bogdan','Terrence','Miles','Quincy','Rui',
];
const LAST_NAMES = [
  'Whitfield','Okafor','Barnes','Castillo','Vukovic','Hargrove','Tanaka','Delgado','Pryor','Bell',
  'Kimball','Anders','Fontaine','Marsh','Ojeda','Petrov','Sloane','Gathers','Reyes','Holloway',
  'Bright','Nakamura','Ferreira','Doyle','Abara','Lindqvist','Booker','Crane','Mensah','Vance',
];
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

const NEWS_GOOD = [
  '{p} drops 40 in a scrimmage — scouts are buzzing',
  '{p} named to the midseason skills showcase',
  'Viral highlight reel sends {p} trending league-wide',
  '{p} posts career-best efficiency numbers',
];
const NEWS_BAD = [
  '{p} tweaks an ankle in practice — value dips',
  'Sources question {p}\'s conditioning',
  '{p} in a shooting slump, per beat reporters',
  'Trade-value poll ranks {p} lower than expected',
];

const TECH_TREE = [
  {
    id: 'analytics', icon: '📊', name: 'Analytics Lab',
    desc: 'Machine-learning scouting models. Reveals true player ratings on the market, cuts transaction fees, and optimizes game plans.',
    costs: [3_000_000, 6_000_000, 12_000_000],
    levels: [
      'Exact overall ratings visible on the trade market · +1 team strength',
      'Potential ratings revealed · agent fees halved · +2 team strength',
      'Undervalued players flagged 💡 · +4 team strength',
    ],
  },
  {
    id: 'training', icon: '🏋️', name: 'Training Center',
    desc: 'Biomechanics sensors and load-managed practice. Players develop toward their potential every game day.',
    costs: [2_500_000, 5_000_000, 10_000_000],
    levels: [
      'Players under 30 have a 10% chance to improve each game',
      'Development chance 18% · applies to all ages',
      'Development chance 28% · improvements can be +2',
    ],
  },
  {
    id: 'medicine', icon: '🩺', name: 'Sports Medicine',
    desc: 'Recovery science, imaging, and injury-risk modeling. Fewer injuries, faster returns.',
    costs: [2_000_000, 4_000_000, 8_000_000],
    levels: [
      'Injury risk cut by a third',
      'Injury risk halved · recovery 1 game faster',
      'Injury risk cut 70% · recovery 2 games faster',
    ],
  },
  {
    id: 'platform', icon: '📱', name: 'Digital Fan Platform',
    desc: 'Streaming, a fan app, and dynamic merch drops. Turns hype into recurring revenue and keeps it from decaying.',
    costs: [2_500_000, 5_000_000, 9_000_000],
    levels: [
      '+$200k streaming revenue per game day · hype decays slower',
      '+$450k per game day · +10% merch conversion',
      '+$800k per game day · sellouts add a $250k bonus',
    ],
  },
];

/* Season objectives — the guided path through the game's systems.
   Rewards are paid as sponsor bonuses so they reinforce the economy loop. */
const OBJECTIVES = [
  { id: 'price',   icon: '🎟️', name: 'Price the house',    desc: 'Set your ticket price (drag the slider)',       reward: 500_000 },
  { id: 'win1',    icon: '🏀', name: 'First blood',         desc: 'Win a game',                                    reward: 750_000 },
  { id: 'sign',    icon: '✍️', name: 'Deal maker',          desc: 'Sign a player from the trade market',           reward: 750_000 },
  { id: 'tech1',   icon: '🔬', name: 'Early adopter',       desc: 'Buy any technology upgrade',                    reward: 1_000_000 },
  { id: 'hype60',  icon: '🔥', name: 'Hot ticket',          desc: 'Reach 60 fan hype',                             reward: 1_000_000 },
  { id: 'sellout', icon: '🏟️', name: 'Sold out',            desc: 'Fill the arena to 99%+ on a home night',        reward: 1_000_000 },
  { id: 'flip',    icon: '📈', name: 'Buy low, sell high',  desc: 'Sell a player for more than you paid',          reward: 1_500_000 },
  { id: 'streak3', icon: '⚡', name: 'Heater',              desc: 'Win 3 games in a row',                          reward: 2_000_000 },
  { id: 'rich',    icon: '💰', name: 'Money machine',       desc: 'Grow franchise value 25% above where you started', reward: 2_000_000 },
  { id: 'techmax', icon: '🚀', name: 'Silicon franchise',   desc: 'Max out any technology track',                  reward: 2_500_000 },
];

/* Play-by-play flavor for the live game animation. {p} = one of your players. */
const PBP_LINES = [
  '{p} splashes a deep three!',
  '{p} attacks the rim — and one!',
  'Steal and a breakaway slam by {p}!',
  '{p} drains the stepback jumper',
  'No-look dime from {p}',
  '{p} swats it into the third row',
  'Coast-to-coast finish by {p}',
  'Offensive board and putback — {p}',
  '{p} from wayyy downtown 🎯',
  'Crossover, hesitation, floater... {p} counts it',
];
const PBP_OPP = [
  '{o} answers at the other end',
  '{o} hits from mid-range',
  'Tough bucket inside by {o}',
  '{o} converts in transition',
];

const STREAK_KEY = 'courtside-capital-streak';
const STREAK_BONUS_PER_DAY = 250_000;   // × consecutive days, capped at 7

/* ---------- helpers ---------- */

// Mulberry32 seeded PRNG so a season can be reproduced from its seed.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

function fmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtMoneyFull(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
