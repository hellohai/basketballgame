/* Courtside Capital — game engine: state, economics, market, simulation */

const SAVE_KEY = 'courtside-capital-save-v1';

let S = null;    // game state
let rng = Math.random;

/* ================= state creation ================= */

function newGame(teamName, difficulty, opts) {
  opts = opts || { mode: 'fictional' };
  const seed = (Math.random() * 2 ** 31) | 0;
  rng = makeRng(seed);

  let league, nbaTeam = null;
  if (opts.mode === 'nba') {
    nbaTeam = NBA_DATA.teams[opts.teamIdx];
    teamName = nbaTeam.name;
    league = NBA_DATA.teams
      .filter((t, i) => i !== opts.teamIdx)
      .map(t => ({ name: t.name, str: nbaTeamStrength(t), w: 0, l: 0, you: false }));
  } else {
    league = RIVAL_TEAMS.map(t => ({ name: t.name, str: t.str, w: 0, l: 0, you: false }));
  }
  league.push({ name: teamName, str: 0, w: 0, l: 0, you: true });

  S = {
    seed,
    mode: opts.mode,
    teamName,
    difficulty,
    cash: CFG.START_CASH[difficulty],
    hype: 40,
    day: 0,
    ticketPrice: 45,
    roster: [],
    market: [],
    tech: { analytics: 0, training: 0, medicine: 0, platform: 0 },
    league,
    nbaPool: [],
    schedule: null,
    ledger: [],
    cashHistory: [],
    gamesFin: [],
    results: [],
    news: ['New ownership takes over ' + teamName + '. The league is watching.'],
    over: false,
    nextId: 1,
  };

  S.schedule = makeSchedule(S.league.length - 1);

  if (opts.mode === 'nba') {
    // your roster = the real team's players; the market pool = everyone
    // outside each team's top 7 (the league's "trade block")
    for (const arr of nbaTeam.players) S.roster.push(realToPlayer(arr, true));
    NBA_DATA.teams.forEach((t, i) => {
      if (i === opts.teamIdx) return;
      for (const arr of [...t.players].sort((a, b) => b[3] - a[3]).slice(7)) S.nbaPool.push(arr);
    });
    while (S.market.length < CFG.MARKET_SIZE) S.market.push(genMarketPlayer());
  } else {
    for (let i = 0; i < 9; i++) S.roster.push(genPlayer(50, 70, true));
    while (S.market.length < CFG.MARKET_SIZE) S.market.push(genPlayer(55, 92, false));
  }

  S.cashHistory.push(S.cash);
  S.startWorth = netWorth();
  S.league.find(t => t.you).str = teamStrength(false);
  saveGame();
  return S;
}

// rough rival strength from its real roster: top-5 average + bench/coaching proxy
function nbaTeamStrength(team) {
  const top5 = [...team.players].map(p => p[3]).sort((a, b) => b - a).slice(0, 5);
  return Math.round((top5.reduce((s, v) => s + v, 0) / top5.length + 3) * 10) / 10;
}

// convert a [name, pos, age, ovr] snapshot entry into a live game player
function realToPlayer(arr, mine) {
  const [name, pos, age, ovr] = arr;
  const p = {
    id: S.nextId++,
    name, pos, age, ovr,
    pot: clamp(ovr + Math.max(0, Math.round((27 - age) * 1.2)), ovr, 99),
    form: 1 + (rng() - 0.5) * 0.1,
    injury: 0,
    mine: !!mine,
    value: 0,
    salary: 0,
    hist: [],
  };
  p.value = Math.round(fairValue(p) * (0.9 + rng() * 0.2));
  p.salary = Math.round(p.value * CFG.SALARY_RATIO);
  p.hist = [p.value];
  return p;
}

function genMarketPlayer() {
  if (S.mode === 'nba' && S.nbaPool.length) {
    const idx = Math.floor(rng() * S.nbaPool.length);
    return realToPlayer(S.nbaPool.splice(idx, 1)[0], false);
  }
  return genPlayer(55, 92, false);
}

function makeSchedule(rivalCount) {
  // 24 games: home/away alternating-ish against the rivals in rotation
  const sched = [];
  for (let g = 0; g < CFG.SEASON_GAMES; g++) {
    sched.push({ opp: g % rivalCount, home: g % 2 === 0 });
  }
  // shuffle opponents lightly so it's not a strict rotation
  for (let i = sched.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sched[i].opp, sched[j].opp] = [sched[j].opp, sched[i].opp];
  }
  return sched;
}

function genPlayer(ovrLo, ovrHi, mine) {
  const ovr = Math.round(ovrLo + rng() * (ovrHi - ovrLo));
  const age = 19 + Math.floor(rng() * 15);
  const pot = clamp(ovr + Math.round(rng() * (age < 25 ? 14 : 5)), ovr, 99);
  const p = {
    id: S ? S.nextId++ : 0,
    name: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] + ' ' +
          LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)],
    pos: POSITIONS[Math.floor(rng() * POSITIONS.length)],
    age, ovr, pot,
    form: 1 + (rng() - 0.5) * 0.1,
    injury: 0,
    mine,
    value: 0,
    salary: 0,
    hist: [],
  };
  p.value = Math.round(fairValue(p) * (0.85 + rng() * 0.3));
  p.salary = Math.round(p.value * CFG.SALARY_RATIO);
  p.hist = [p.value];
  return p;
}

/* ================= valuation & market ================= */

function fairValue(p) {
  const ageF = p.age <= 24 ? 1.15 : p.age <= 28 ? 1.0 : p.age <= 31 ? 0.85 : 0.7;
  const potF = 1 + (p.pot - p.ovr) * 0.015;
  return Math.max(1_000_000, Math.pow(p.ovr - 40, 2) * 22_000 * ageF * potF);
}

function isUndervalued(p) { return p.value < fairValue(p) * 0.88; }

function tickPlayerValue(p, extraDrift) {
  const noise = (rng() - 0.5) * 0.06;                       // ±3% random walk
  const reversion = (fairValue(p) - p.value) / p.value * 0.08; // pull toward fundamentals
  const formDrift = (p.form - 1) * 0.05;
  p.value = Math.round(Math.max(500_000, p.value * (1 + noise + reversion + formDrift + (extraDrift || 0))));
  p.hist.push(p.value);
  if (p.hist.length > 25) p.hist.shift();
  p.form = clamp(p.form + (rng() - 0.5) * 0.04, 0.85, 1.15);
}

function tickMarket(dayNews) {
  for (const p of S.market) tickPlayerValue(p, 0);
  // occasional market-moving news → the buy-low / sell-high opportunity
  if (rng() < 0.55 && S.market.length) {
    const p = S.market[Math.floor(rng() * S.market.length)];
    const good = rng() < 0.5;
    const swing = 0.15 + rng() * 0.10;
    p.value = Math.round(p.value * (good ? 1 + swing : 1 - swing));
    p.form = clamp(p.form + (good ? 0.06 : -0.06), 0.85, 1.15);
    p.hist[p.hist.length - 1] = p.value;
    const pool = good ? NEWS_GOOD : NEWS_BAD;
    dayNews.push(pool[Math.floor(rng() * pool.length)].replace('{p}', p.name));
  }
  // rotate one player out, one in, sometimes — keeps the market fresh
  if (rng() < 0.30) {
    const idx = Math.floor(rng() * S.market.length);
    const out = S.market.splice(idx, 1)[0];
    if (S.mode === 'nba' && out) S.nbaPool.push([out.name, out.pos, out.age, out.ovr]);
  }
  while (S.market.length < CFG.MARKET_SIZE) S.market.push(genMarketPlayer());
  while (S.market.length > CFG.MARKET_SIZE) {   // players you sold can push it over
    const out = S.market.splice(Math.floor(rng() * S.market.length), 1)[0];
    if (S.mode === 'nba' && out) S.nbaPool.push([out.name, out.pos, out.age, out.ovr]);
  }
}

/* ================= economics ================= */

function referencePrice() { return Math.round(30 + S.hype * 0.45); }

function projectDemand(price) {
  const hypeF = 0.28 + 0.72 * (S.hype / 100);
  const ref = referencePrice();
  const priceF = Math.min(1.15, Math.pow(ref / price, CFG.PRICE_ELASTICITY));
  const attendance = Math.round(Math.min(CFG.ARENA_CAPACITY, CFG.ARENA_CAPACITY * hypeF * priceF));
  return {
    attendance,
    ref,
    gate: attendance * price,
    concessions: attendance * CFG.CONCESSION_PER_FAN,
  };
}

function payrollPerGame() {
  return Math.round(S.roster.reduce((s, p) => s + p.salary, 0) / CFG.SEASON_GAMES);
}

function techInvested() {
  let sum = 0;
  for (const t of TECH_TREE) {
    for (let i = 0; i < S.tech[t.id]; i++) sum += t.costs[i];
  }
  return sum;
}

function netWorth() {
  const rosterVal = S.roster.reduce((s, p) => s + p.value, 0);
  return S.cash + rosterVal + Math.round(techInvested() * 0.6);
}

function ledger(label, amount) {
  S.cash += amount;
  S.ledger.push({ day: S.day, label, amount, balance: S.cash });
}

/* ================= team strength & simulation ================= */

function teamStrength(home) {
  const healthy = S.roster.filter(p => p.injury === 0)
    .map(p => p.ovr * p.form)
    .sort((a, b) => b - a);
  const starters = healthy.slice(0, 5);
  let str = starters.length
    ? starters.reduce((s, v) => s + v, 0) / starters.length
    : 30;
  if (starters.length < 5) str -= (5 - starters.length) * 8;   // short-handed penalty
  const bench = healthy.slice(5, 8);
  if (bench.length) str += (bench.reduce((s, v) => s + v, 0) / bench.length) * 0.04;
  str += [0, 1, 2, 4][S.tech.analytics];
  if (home) str += 2;
  return Math.round(str * 10) / 10;
}

function winProbability(strUs, strThem) {
  return 1 / (1 + Math.pow(10, -(strUs - strThem) / 12));
}

function nextMatchup() {
  const g = S.schedule[S.day];
  const opp = S.league[g.opp];   // rivals occupy league[0..6]
  const strUs = teamStrength(g.home);
  return { opp, home: g.home, strUs, strThem: opp.str, pWin: winProbability(strUs, opp.str) };
}

function playGameDay() {
  if (S.over || S.day >= CFG.SEASON_GAMES) return null;
  const dayNews = [];
  const m = nextMatchup();
  S.day += 1;

  // --- simulate our game ---
  const win = rng() < m.pWin;
  const base = 96 + Math.round(rng() * 18);
  const margin = 2 + Math.round(rng() * 12 + Math.abs(m.strUs - m.strThem) * 0.4);
  const us = win ? base + margin : base;
  const them = win ? base : base + margin;
  if (win) { m.opp.l += 1; } else { m.opp.w += 1; }
  const you = S.league.find(t => t.you);
  if (win) you.w += 1; else you.l += 1;

  // hype reacts to results; the fan platform slows the bleed
  const lossHit = -5 + Math.min(2, S.tech.platform);
  const upset = win && m.strThem > m.strUs;
  S.hype = clamp(S.hype + (win ? (upset ? 8 : 6) : lossHit), 5, 100);

  // --- finances ---
  const fin = { day: S.day, revenue: 0, expenses: 0, lines: [] };
  const addRev = (label, amt) => { amt = Math.round(amt); if (amt <= 0) return; fin.revenue += amt; fin.lines.push({ label, amt }); ledger(label, amt); };
  const addExp = (label, amt) => { amt = Math.round(amt); if (amt <= 0) return; fin.expenses += amt; fin.lines.push({ label, amt: -amt }); ledger(label, -amt); };

  const streaming = [0, 200_000, 450_000, 800_000][S.tech.platform];
  if (m.home) {
    const d = projectDemand(S.ticketPrice);
    fin.attendance = d.attendance;
    addRev(`Tickets (${fmtInt(d.attendance)} @ $${S.ticketPrice})`, d.gate);
    addRev('Concessions', d.concessions);
    const merchRate = 2 + S.hype * 0.05;
    addRev('Merchandise', d.attendance * merchRate * (S.tech.platform >= 2 ? 1.1 : 1));
    if (S.tech.platform >= 3 && d.attendance >= CFG.ARENA_CAPACITY * 0.99) {
      addRev('Sellout bonus', 250_000);
    }
    addRev('Local sponsorships', S.hype * 8_000);
  } else {
    addRev('Away gate share', CFG.AWAY_GATE_SHARE);
    addRev('Merchandise', S.hype * 3_000);
  }
  addRev('National TV deal', S.mode === 'nba' ? CFG.NBA_TV_PER_GAME : CFG.NATIONAL_TV_PER_GAME);
  if (streaming) addRev('Streaming platform', streaming);

  addExp('Player payroll', payrollPerGame());
  addExp('Staff & operations', CFG.STAFF_PER_GAME);
  if (m.home) addExp('Arena operations', CFG.ARENA_OPS_HOME);

  S.gamesFin.push({ day: S.day, revenue: fin.revenue, expenses: fin.expenses });
  S.cashHistory.push(S.cash);

  // --- injuries & recovery ---
  const medF = [1, 0.67, 0.5, 0.3][S.tech.medicine];
  const recoveryBonus = [0, 0, 1, 2][S.tech.medicine];
  const events = [];
  for (const p of S.roster) {
    if (p.injury > 0) {
      p.injury -= 1;
      if (p.injury === 0) events.push(`${p.name} returns from injury.`);
    } else if (rng() < 0.035 * medF) {
      p.injury = Math.max(1, 1 + Math.floor(rng() * 4) - recoveryBonus);
      events.push(`${p.name} injured — out ${p.injury} game${p.injury > 1 ? 's' : ''}.`);
      p.value = Math.round(p.value * 0.93);
    }
  }

  // --- development (Training Center) ---
  const devChance = [0, 0.10, 0.18, 0.28][S.tech.training];
  for (const p of S.roster) {
    const eligible = S.tech.training >= 2 || p.age < 30;
    if (devChance && eligible && p.ovr < p.pot && rng() < devChance) {
      const gain = S.tech.training >= 3 && rng() < 0.4 ? 2 : 1;
      p.ovr = Math.min(p.pot, p.ovr + gain);
      events.push(`${p.name} improved to ${p.ovr} OVR (training).`);
    }
  }

  // --- market & roster values move ---
  const rosterDrift = win ? 0.015 : -0.008;
  for (const p of S.roster) tickPlayerValue(p, rosterDrift);
  tickMarket(dayNews);

  // --- simulate the rest of the league ---
  const rivalCount = S.league.length - 1;
  const idle = Array.from({ length: rivalCount }, (_, i) => i)
    .filter(i => i !== S.schedule[S.day - 1].opp);
  for (let i = idle.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idle[i], idle[j]] = [idle[j], idle[i]];
  }
  for (let k = 0; k + 1 < idle.length; k += 2) {
    const a = S.league[idle[k]], b = S.league[idle[k + 1]];
    const pA = winProbability(a.str, b.str);
    if (rng() < pA) { a.w++; b.l++; } else { b.w++; a.l++; }
  }
  for (const t of S.league) if (!t.you) t.str = clamp(t.str + (rng() - 0.5) * 1.2, 55, 92);
  you.str = teamStrength(false);

  const result = {
    day: S.day, opp: m.opp.name, home: m.home, us, them, win,
    fin, events, upset,
  };
  S.results.push(result);
  S.news = dayNews.concat(events.slice(0, 2));

  if (S.cash < CFG.BANKRUPT_AT) S.over = 'bankrupt';
  else if (S.day >= CFG.SEASON_GAMES) S.over = 'season';
  saveGame();
  return result;
}

/* ================= transactions ================= */

function buyFee() { return S.tech.analytics >= 2 ? CFG.BUY_FEE / 2 : CFG.BUY_FEE; }

function buyPlayer(id) {
  const idx = S.market.findIndex(p => p.id === id);
  if (idx < 0) return { ok: false, msg: 'Player no longer available.' };
  const p = S.market[idx];
  const cost = Math.round(p.value * (1 + buyFee()));
  if (S.roster.length >= CFG.ROSTER_MAX) return { ok: false, msg: `Roster is full (${CFG.ROSTER_MAX} max).` };
  if (S.cash < cost) return { ok: false, msg: 'Not enough cash for this deal.' };
  S.market.splice(idx, 1);
  p.mine = true;
  p.salary = Math.round(p.value * CFG.SALARY_RATIO);
  S.roster.push(p);
  ledger(`Signed ${p.name}`, -cost);
  if (p.ovr >= 82) S.hype = clamp(S.hype + 5, 5, 100);
  saveGame();
  return { ok: true, msg: `${p.name} signed for ${fmtMoney(cost)} (incl. ${Math.round(buyFee() * 100)}% agent fee).` };
}

function sellPlayer(id) {
  const idx = S.roster.findIndex(p => p.id === id);
  if (idx < 0) return { ok: false, msg: 'Player not found.' };
  if (S.roster.length <= CFG.ROSTER_MIN) return { ok: false, msg: `You need at least ${CFG.ROSTER_MIN} players.` };
  const p = S.roster[idx];
  S.roster.splice(idx, 1);
  p.mine = false;
  S.market.push(p);
  ledger(`Sold ${p.name}`, p.value);
  if (p.ovr >= 82) S.hype = clamp(S.hype - 4, 5, 100);
  saveGame();
  return { ok: true, msg: `${p.name} sold for ${fmtMoney(p.value)}.` };
}

function buyTech(id) {
  const t = TECH_TREE.find(t => t.id === id);
  const lvl = S.tech[id];
  if (lvl >= t.costs.length) return { ok: false, msg: 'Already at max level.' };
  const cost = t.costs[lvl];
  if (S.cash < cost) return { ok: false, msg: 'Not enough cash.' };
  S.tech[id] += 1;
  ledger(`${t.name} → level ${S.tech[id]}`, -cost);
  saveGame();
  return { ok: true, msg: `${t.name} upgraded to level ${S.tech[id]}.` };
}

/* ================= season end ================= */

function standings() {
  return [...S.league].sort((a, b) => b.w - a.w || a.l - b.l || b.str - a.str);
}

function seasonSummary() {
  const rank = standings().findIndex(t => t.you) + 1;
  const you = S.league.find(t => t.you);
  const startWorth = S.startWorth || CFG.START_CASH[S.difficulty];
  const worth = netWorth();
  const growth = (worth - startWorth) / startWorth;
  const n = S.league.length;
  const score = (rank === 1 ? 3 : rank <= Math.ceil(n / 4) ? 2 : rank <= Math.ceil(n / 2) ? 1 : 0) +
                (growth > 0.5 ? 3 : growth > 0.2 ? 2 : growth > 0 ? 1 : 0);
  const grade = score >= 6 ? 'S' : score >= 5 ? 'A' : score >= 4 ? 'B' : score >= 2 ? 'C' : 'D';
  return { rank, wins: you.w, losses: you.l, worth, startWorth, growth, grade };
}

/* ================= persistence ================= */

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* private mode etc. */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.roster) || s.over) return null;
    s.mode = s.mode || 'fictional';
    s.nbaPool = s.nbaPool || [];
    S = s;
    rng = makeRng((s.seed ^ (s.day * 2654435761)) >>> 0);
    return S;
  } catch (e) { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}
