/* Courtside Capital — UI: rendering & event wiring */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

let selectedDiff = 'normal';

/* ================= boot ================= */

document.addEventListener('DOMContentLoaded', () => {
  // start screen
  $('#difficulty-row').addEventListener('click', ev => {
    const btn = ev.target.closest('.diff-btn');
    if (!btn) return;
    selectedDiff = btn.dataset.diff;
    $$('.diff-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });

  $('#start-btn').addEventListener('click', () => {
    const name = $('#team-name-input').value.trim() || 'Bay City Circuits';
    clearSave();
    newGame(name, selectedDiff);
    enterGame();
  });

  const saved = loadGame();
  if (saved) {
    $('#continue-btn').classList.remove('hidden');
    $('#continue-btn').addEventListener('click', enterGame);
  }

  // tabs
  $('#tabs').addEventListener('click', ev => {
    const tab = ev.target.closest('.tab');
    if (!tab) return;
    $$('.tab').forEach(t => t.classList.toggle('selected', t === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + tab.dataset.tab));
    renderAll();
  });

  // ticket price
  $('#price-slider').addEventListener('input', () => {
    S.ticketPrice = +$('#price-slider').value;
    renderPricing();
  });
  $('#price-slider').addEventListener('change', saveGame);

  // play
  $('#play-btn').addEventListener('click', onPlayGame);
  $('#result-close').addEventListener('click', () => {
    $('#result-modal').classList.add('hidden');
    if (S.over) showSeasonEnd();
    renderAll();
  });

  // roster/market transactions (event delegation)
  $('#roster-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-sell]');
    if (btn) { toast(sellPlayer(+btn.dataset.sell).msg); renderAll(); }
  });
  $('#market-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-buy]');
    if (btn) { toast(buyPlayer(+btn.dataset.buy).msg); renderAll(); }
  });
  $('#tech-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-tech]');
    if (btn) { toast(buyTech(btn.dataset.tech).msg); renderAll(); }
  });

  $('#reset-btn').addEventListener('click', () => {
    if (confirm('Restart the season? Your current save will be erased.')) {
      clearSave();
      location.reload();
    }
  });
  $('#season-restart').addEventListener('click', () => {
    clearSave();
    location.reload();
  });
});

function enterGame() {
  $('#start-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#price-slider').value = S.ticketPrice;
  renderAll();
}

/* ================= actions ================= */

function onPlayGame() {
  const res = playGameDay();
  if (!res) return;
  const f = res.fin;
  $('#result-headline').textContent = res.win
    ? (res.upset ? 'UPSET WIN! 🔥' : 'Victory! 🏀')
    : 'Tough loss';
  $('#result-score').innerHTML =
    `<span style="color:${res.win ? 'var(--good)' : 'var(--series-2)'}">${res.us}</span>` +
    ` – ${res.them}`;

  let html = `<p>${res.home ? 'vs' : '@'} <b>${escapeHtml(res.opp)}</b>` +
    (f.attendance != null ? ` · ${fmtInt(f.attendance)} fans (${Math.round(f.attendance / CFG.ARENA_CAPACITY * 100)}% full)` : ' · road game') + `</p>`;
  for (const line of f.lines) {
    html += `<div class="fin-line"><span>${escapeHtml(line.label)}</span>` +
      `<span class="amt ${line.amt >= 0 ? 'pos' : 'neg'}">${line.amt >= 0 ? '+' : ''}${fmtMoney(line.amt)}</span></div>`;
  }
  const net = f.revenue - f.expenses;
  html += `<div class="fin-line total"><span>Game-day net</span>` +
    `<span class="amt ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmtMoney(net)}</span></div>`;
  for (const e of res.events) html += `<div class="event-line">⚡ ${escapeHtml(e)}</div>`;
  $('#result-details').innerHTML = html;
  $('#result-modal').classList.remove('hidden');
  renderAll();
}

function showSeasonEnd() {
  const sum = seasonSummary();
  if (S.over === 'bankrupt') {
    $('#season-headline').textContent = '💸 Bankrupt';
    $('#season-summary').innerHTML =
      `<p>The league has seized the franchise — debts passed ${fmtMoney(CFG.BANKRUPT_AT)}. ` +
      `Great rosters mean nothing if the balance sheet collapses.</p>` +
      `<div class="grade">F</div>`;
  } else {
    const champ = sum.rank === 1;
    $('#season-headline').textContent = champ ? '🏆 League Champions!' : 'Season complete';
    $('#season-summary').innerHTML =
      `<div class="grade">${sum.grade}</div>` +
      `<div class="fin-line"><span>Final record</span><b>${sum.wins}–${sum.losses} (#${sum.rank} of 8)</b></div>` +
      `<div class="fin-line"><span>Starting franchise value</span><b>${fmtMoney(sum.startWorth)}</b></div>` +
      `<div class="fin-line"><span>Final franchise value</span><b>${fmtMoney(sum.worth)}</b></div>` +
      `<div class="fin-line"><span>Value growth</span><b style="color:${sum.growth >= 0 ? 'var(--good)' : 'var(--series-2)'}">${(sum.growth * 100).toFixed(0)}%</b></div>` +
      (champ ? '<p>Banner raised. Dynasty next?</p>' : '<p>The board expects a title <i>and</i> a return on capital. Run it back.</p>');
  }
  $('#season-modal').classList.remove('hidden');
}

function toast(msg) {
  if (msg) { $('#ticker').textContent = msg; }
}

/* ================= rendering ================= */

function renderAll() {
  if (!S) return;
  renderHud();
  renderTicker();
  renderOffice();
  renderRoster();
  renderMarket();
  renderTech();
  renderFinance();
  renderLeague();
}

function renderHud() {
  const you = S.league.find(t => t.you);
  $('#hud-team').textContent = S.teamName;
  $('#hud-record').textContent = S.day >= CFG.SEASON_GAMES
    ? `${you.w}–${you.l} · season over`
    : `${you.w}–${you.l} · Game ${S.day + 1} of ${CFG.SEASON_GAMES}`;
  const cashEl = $('#hud-cash');
  cashEl.textContent = fmtMoney(S.cash);
  cashEl.classList.toggle('neg', S.cash < 0);
  $('#hud-hype').textContent = `${Math.round(S.hype)} / 100`;
  $('#hud-payroll').textContent = fmtMoney(payrollPerGame());
  $('#hud-networth').textContent = fmtMoney(netWorth());
}

function renderTicker() {
  const items = S.news && S.news.length ? S.news : ['Quiet day around the league.'];
  $('#ticker').textContent = items.join('  ···  ');
}

function renderOffice() {
  const done = S.day >= CFG.SEASON_GAMES || S.over;
  $('#play-btn').disabled = !!done;
  if (done) {
    $('#matchup').innerHTML = '<p class="matchup-meta">Season complete.</p>';
    $('#play-btn').textContent = 'Season over';
  } else {
    const m = nextMatchup();
    $('#matchup').innerHTML =
      `<div class="matchup-teams">
        <div class="matchup-team"><div class="t-name">${escapeHtml(S.teamName)}</div><div class="t-str">strength ${m.strUs}</div></div>
        <div class="matchup-vs">${m.home ? 'vs' : '@'}</div>
        <div class="matchup-team"><div class="t-name">${escapeHtml(m.opp.name)}</div><div class="t-str">strength ${m.strThem}</div></div>
      </div>
      <div class="matchup-meta">${m.home ? 'Home game — gate revenue is yours' : 'Road game — TV money only'}</div>
      <div class="winprob-bar"><div class="winprob-fill" style="width:${Math.round(m.pWin * 100)}%"></div></div>
      <div class="winprob-label">Win probability: ${Math.round(m.pWin * 100)}%</div>`;
  }
  renderPricing();
  renderAdvisor();
}

function renderPricing() {
  $('#price-value').textContent = S.ticketPrice;
  const d = projectDemand(S.ticketPrice);
  const pct = Math.round(d.attendance / CFG.ARENA_CAPACITY * 100);
  $('#demand-readout').innerHTML =
    `<div class="demand-stat"><span class="d-label">Projected crowd</span><span class="d-value">${fmtInt(d.attendance)} (${pct}%)</span></div>
     <div class="demand-stat"><span class="d-label">Gate revenue</span><span class="d-value">${fmtMoney(d.gate)}</span></div>
     <div class="demand-stat"><span class="d-label">+ Concessions</span><span class="d-value">${fmtMoney(d.concessions)}</span></div>
     <div class="demand-stat"><span class="d-label">Fans' reference price</span><span class="d-value">$${d.ref}</span></div>`;
  const note = S.ticketPrice > d.ref * 1.6
    ? 'Way above what fans think is fair — demand collapses at this price (elasticity bites).'
    : S.ticketPrice < d.ref * 0.8
      ? 'Below the market-clearing price — the arena sells out but you leave gate money on the table.'
      : 'Near the revenue-maximizing zone. Winning raises the reference price fans will pay.';
  $('#econ-note').textContent = note;
}

function renderAdvisor() {
  const tips = [];
  const healthy = S.roster.filter(p => p.injury === 0).length;
  if (healthy < 6) tips.push(`Only ${healthy} healthy players — sign help on the trade market before tip-off.`);
  const deals = S.tech.analytics >= 3 ? S.market.filter(isUndervalued).length : 0;
  if (deals) tips.push(`Analytics flags ${deals} undervalued player${deals > 1 ? 's' : ''} on the market right now. 💡`);
  if (S.tech.analytics === 0) tips.push('Without an Analytics Lab you only see rating *ranges* on the market — you are trading blind.');
  const pg = payrollPerGame();
  const lastFin = S.gamesFin[S.gamesFin.length - 1];
  if (lastFin && lastFin.revenue < lastFin.expenses) {
    tips.push(`You lost ${fmtMoney(lastFin.expenses - lastFin.revenue)} last game day. Raise hype (win, sign stars) or trim payroll (${fmtMoney(pg)}/game).`);
  }
  if (S.hype >= 75) tips.push('Hype is surging — fans will absorb a ticket-price increase.');
  if (S.cash > 12_000_000 && Object.values(S.tech).some(l => l < 3)) {
    tips.push('Idle cash earns nothing. Technology upgrades compound over the remaining schedule.');
  }
  const young = S.roster.filter(p => p.age <= 24 && p.pot - p.ovr >= 6).length;
  if (young && S.tech.training === 0) tips.push(`${young} young player${young > 1 ? 's have' : ' has'} untapped potential — a Training Center converts that into wins and resale value.`);
  if (!tips.length) tips.push('All systems steady. Watch the market for mispriced talent.');
  $('#advisor-list').innerHTML = tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
}

function playerCard(p, mode) {
  const showExact = mode === 'roster' || S.tech.analytics >= 1;
  const showPot = mode === 'roster' || S.tech.analytics >= 2;
  const flagDeal = mode === 'market' && S.tech.analytics >= 3 && isUndervalued(p);
  const ovrTxt = showExact ? p.ovr : `${Math.max(40, p.ovr - 4)}–${Math.min(99, p.ovr + 4)}`;
  const hist = p.hist || [];
  const prev = hist.length > 1 ? hist[hist.length - 2] : p.value;
  const delta = p.value - prev;
  const deltaPct = prev ? (delta / prev) * 100 : 0;
  const tags = [];
  if (p.injury > 0) tags.push(`<span class="p-tag hurt">INJ ${p.injury}g</span>`);
  if (p.form > 1.07) tags.push('<span class="p-tag hot">HOT</span>');
  if (flagDeal) tags.push('<span class="p-tag deal">💡 UNDERVALUED</span>');

  const action = mode === 'roster'
    ? `<button class="btn btn-sell" data-sell="${p.id}">Sell · ${fmtMoney(p.value)}</button>`
    : `<button class="btn btn-buy" data-buy="${p.id}">Sign · ${fmtMoney(Math.round(p.value * (1 + buyFee())))}</button>`;

  return `<div class="player-card${p.injury > 0 ? ' injured' : ''}">
    <div class="p-top">
      <div><span class="p-name">${escapeHtml(p.name)}</span> <span class="p-pos">${p.pos} · ${p.age}y</span></div>
      <div class="p-ovr${showExact ? '' : ' range'}">${ovrTxt}</div>
    </div>
    <div class="p-meta">
      ${showPot ? `<span>Potential <b>${p.pot}</b></span>` : '<span>Potential <b>?</b></span>'}
      <span>Salary <b>${fmtMoney(mode === 'roster' ? p.salary : Math.round(p.value * CFG.SALARY_RATIO))}/season</b></span>
    </div>
    <div class="p-value-row">
      <span class="p-value">${fmtMoney(p.value)}</span>
      <span class="p-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(deltaPct).toFixed(1)}%</span>
    </div>
    <div class="p-spark">${sparklineSvg(hist)}</div>
    <div class="p-actions">${tags.join('')}${action}</div>
  </div>`;
}

function renderRoster() {
  const sorted = [...S.roster].sort((a, b) => b.ovr - a.ovr);
  $('#roster-count').textContent = `${S.roster.length} players (min ${CFG.ROSTER_MIN}, max ${CFG.ROSTER_MAX}) · payroll ${fmtMoney(payrollPerGame())}/game`;
  $('#roster-list').innerHTML = sorted.map(p => playerCard(p, 'roster')).join('');
}

function renderMarket() {
  $('#market-note').textContent = S.tech.analytics === 0
    ? 'Scouting is fuzzy without an Analytics Lab: ratings show as ranges and potential is hidden. Values drift daily — news moves them sharply.'
    : `Agent fee on signings: ${Math.round(buyFee() * 100)}%. Values drift daily; news moves them sharply. Selling returns full market value.`;
  const sorted = [...S.market].sort((a, b) => b.value - a.value);
  $('#market-list').innerHTML = sorted.map(p => playerCard(p, 'market')).join('');
}

function renderTech() {
  $('#tech-list').innerHTML = TECH_TREE.map(t => {
    const lvl = S.tech[t.id];
    const maxed = lvl >= t.costs.length;
    const pips = [0, 1, 2].map(i => `<span class="pip${i < lvl ? ' on' : ''}"></span>`).join('');
    const current = lvl > 0 ? `<div class="tech-effect">Now: <b>${escapeHtml(t.levels[lvl - 1])}</b></div>` : '';
    const next = maxed
      ? '<div class="tech-effect">Fully upgraded.</div>'
      : `<div class="tech-effect">Next: <b>${escapeHtml(t.levels[lvl])}</b></div>`;
    const btn = maxed
      ? '<button class="btn" disabled>Max level</button>'
      : `<button class="btn btn-primary" data-tech="${t.id}" ${S.cash < t.costs[lvl] ? 'disabled' : ''}>Upgrade · ${fmtMoney(t.costs[lvl])}</button>`;
    return `<div class="tech-card">
      <div class="tech-head"><span class="tech-name">${t.icon} ${escapeHtml(t.name)}</span><div class="tech-pips">${pips}</div></div>
      <p class="tech-desc">${escapeHtml(t.desc)}</p>
      ${current}${next}${btn}
    </div>`;
  }).join('');
}

function renderFinance() {
  const cashData = S.cashHistory.map((v, i) => ({ x: i === 0 ? 'season start' : `day ${i}`, y: v }));
  renderLineChart($('#cash-chart'), cashData, { label: 'Cash balance over the season' });

  const last10 = S.gamesFin.slice(-10);
  if (last10.length) {
    renderGroupedBars($('#revexp-chart'),
      last10.map(f => ({ x: f.day, a: f.revenue, b: f.expenses })),
      { label: 'Revenue vs expenses per game day', aName: 'Revenue', bName: 'Expenses' });
  } else {
    $('#revexp-chart').innerHTML = '<p class="econ-note">Play a game to see revenue and expenses.</p>';
  }

  const rows = [...S.ledger].reverse().slice(0, 60).map(e =>
    `<tr><td>${e.day}</td><td>${escapeHtml(e.label)}</td>` +
    `<td class="num ${e.amount >= 0 ? 'pos-amt' : 'neg-amt'}">${e.amount >= 0 ? '+' : ''}${fmtMoney(e.amount)}</td>` +
    `<td class="num">${fmtMoney(e.balance)}</td></tr>`
  ).join('');
  $('#ledger-table tbody').innerHTML = rows || '<tr><td colspan="4">No transactions yet.</td></tr>';
}

function renderLeague() {
  const rows = standings().map((t, i) =>
    `<tr class="${t.you ? 'you' : ''}"><td>${i + 1}</td><td>${escapeHtml(t.name)}${t.you ? ' ★' : ''}</td>` +
    `<td class="num">${t.w}</td><td class="num">${t.l}</td><td class="num">${Math.round(t.str)}</td></tr>`
  ).join('');
  $('#standings-table tbody').innerHTML = rows;

  const res = [...S.results].reverse().map(r =>
    `<li><span>Day ${r.day} · ${r.home ? 'vs' : '@'} ${escapeHtml(r.opp)}</span>` +
    `<span class="${r.win ? 'res-w' : 'res-l'}">${r.win ? 'W' : 'L'} ${r.us}–${r.them}</span></li>`
  ).join('');
  $('#results-list').innerHTML = res || '<li>No games played yet.</li>';
}
