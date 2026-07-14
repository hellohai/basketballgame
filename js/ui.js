/* Courtside Capital — UI: rendering, animation & event wiring */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

let selectedDiff = 'normal';
let selectedMode = 'fictional';
let selectedPace = 'quick';
let pendingChallenge = null;
let currentTab = 'office';
let animating = false;
let lastResult = null;
let marketPos = 'ALL';
let marketSort = 'value';
let currentSuggestion = null;

const TOUR_KEY = 'courtside-capital-tour-done';

/* ================= boot ================= */

document.addEventListener('DOMContentLoaded', () => {
  // start screen — league mode + NBA team picker
  const sel = $('#nba-team-select');
  sel.innerHTML = NBA_DATA.teams.map((t, i) => {
    const top5 = [...t.players].map(p => p[3]).sort((a, b) => b - a).slice(0, 5);
    const str = Math.round(top5.reduce((s, v) => s + v, 0) / top5.length);
    return `<option value="${i}">${escapeHtml(t.name)} — strength ${str}</option>`;
  }).join('');
  $('#nba-data-note').textContent =
    `Rosters as of ${NBA_DATA.asOf}. Ratings are game estimates, not official NBA data. ` +
    `Weaker teams are the harder (and more rewarding) challenge.`;

  $('#mode-row').addEventListener('click', ev => {
    const btn = ev.target.closest('.diff-btn');
    if (!btn) return;
    selectedMode = btn.dataset.mode;
    $$('#mode-row .diff-btn').forEach(b => b.classList.toggle('selected', b === btn));
    $('#fictional-setup').classList.toggle('hidden', selectedMode === 'nba');
    $('#nba-setup').classList.toggle('hidden', selectedMode !== 'nba');
  });

  $('#difficulty-row').addEventListener('click', ev => {
    const btn = ev.target.closest('.diff-btn');
    if (!btn) return;
    selectedDiff = btn.dataset.diff;
    $$('#difficulty-row .diff-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });

  $('#pace-row').addEventListener('click', ev => {
    const btn = ev.target.closest('.diff-btn');
    if (!btn) return;
    selectedPace = btn.dataset.pace;
    $$('#pace-row .diff-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });

  $('#start-btn').addEventListener('click', () => {
    clearSave();
    if (pendingChallenge) {
      const c = pendingChallenge;
      const name = c.mode === 'fictional'
        ? ($('#team-name-input').value.trim() || 'Bay City Circuits') : null;
      newGame(name, c.difficulty, { mode: c.mode, teamIdx: c.teamIdx, seed: c.seed, quick: c.quick, challenge: true });
      history.replaceState(null, '', location.pathname + location.search);
    } else if (selectedMode === 'nba') {
      newGame(null, selectedDiff, { mode: 'nba', teamIdx: +$('#nba-team-select').value, quick: selectedPace === 'quick' });
    } else {
      const name = $('#team-name-input').value.trim() || 'Bay City Circuits';
      newGame(name, selectedDiff, { mode: 'fictional', quick: selectedPace === 'quick' });
    }
    enterGame();
    maybeStartTour();
  });

  // smart pricing toggle
  $('#auto-price-toggle').addEventListener('change', () => {
    S.autoPrice = $('#auto-price-toggle').checked;
    if (S.autoPrice) {
      S.ticketPrice = optimalTicketPrice();
      $('#price-slider').value = S.ticketPrice;
      toast('🤖 Smart pricing on — your CFO handles ticket prices.');
    } else {
      toast('Manual pricing — the slider is yours.');
    }
    saveGame();
    renderPricing();
  });

  // tabs
  $('#tabs').addEventListener('click', ev => {
    const tab = ev.target.closest('.tab');
    if (!tab) return;
    switchTab(tab.dataset.tab);
  });

  // ticket price
  $('#price-slider').addEventListener('input', () => {
    S.ticketPrice = +$('#price-slider').value;
    renderPricing();
  });
  $('#price-slider').addEventListener('change', () => {
    completeObjective('price');
    drainObjEvents();
    saveGame();
    renderObjectives();
  });

  // play
  $('#play-btn').addEventListener('click', onPlayGame);
  $('#fab-play').addEventListener('click', onPlayGame);
  $('#result-skip').addEventListener('click', () => { window.__skipAnim = true; });
  $('#result-close').addEventListener('click', () => {
    $('#result-modal').classList.add('hidden');
    if (S.over) showSeasonEnd();
    renderAll();
  });
  $('#result-share').addEventListener('click', () => shareText(buildProgressShare()));
  $('#season-share').addEventListener('click', () => shareText(buildSeasonShare()));
  $('#season-challenge').addEventListener('click', () => shareText(buildChallengeShare()));

  // roster/market/tech transactions (event delegation)
  $('#roster-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-sell]');
    if (btn) { const r = sellPlayer(+btn.dataset.sell); toast(r.msg, r.ok ? '' : 'gold'); afterAction(); }
  });
  $('#market-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-buy]');
    if (btn) { const r = buyPlayer(+btn.dataset.buy); toast(r.msg, r.ok ? '' : 'gold'); afterAction(); }
  });
  $('#tech-list').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-tech]');
    if (btn) { const r = buyTech(btn.dataset.tech); toast(r.msg, r.ok ? '' : 'gold'); afterAction(); }
  });

  // market filters
  $('#market-pos-filter').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-pos]');
    if (!btn) return;
    marketPos = btn.dataset.pos;
    $$('#market-pos-filter button').forEach(b => b.classList.toggle('selected', b === btn));
    renderMarket();
  });
  $('#market-sort').addEventListener('change', () => {
    marketSort = $('#market-sort').value;
    renderMarket();
  });

  // advisor one-tap suggestion
  $('#advisor-card').addEventListener('click', ev => {
    if (!ev.target.closest('#suggestion-apply') || !currentSuggestion) return;
    const r = applySuggestion(currentSuggestion);
    toast(r.msg, r.ok ? '' : 'gold');
    if (currentSuggestion.act === 'price') $('#price-slider').value = S.ticketPrice;
    afterAction();
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

  // ---- entry: challenge link > saved season > start screen ----
  pendingChallenge = parseChallenge(location.hash);
  const saved = loadGame();
  if (pendingChallenge) {
    showChallengeStart(saved);
  } else if (saved) {
    enterGame();          // refresh drops you right back into your season
  }
});

function afterAction() {
  drainObjEvents();
  renderAll();
}

function switchTab(name) {
  currentTab = name;
  $$('.tab').forEach(t => t.classList.toggle('selected', t.dataset.tab === name));
  $$('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + name));
  renderAll();
}

function showChallengeStart(saved) {
  const c = pendingChallenge;
  const who = c.mode === 'nba' ? NBA_DATA.teams[c.teamIdx].name : 'a fictional franchise';
  $('#challenge-banner').classList.remove('hidden');
  $('#challenge-banner').innerHTML =
    `⚔️ <b>Challenge accepted!</b> A friend dared you to run <b>${escapeHtml(who)}</b> ` +
    `(${escapeHtml(c.difficulty)} difficulty) — the exact same season they played: same roster, ` +
    `same market, same schedule. Beat their record.` +
    (saved ? '<br><b>⚠️ Starting this challenge replaces your current saved season.</b>' : '');
  // lock the pickers to the challenge settings
  $('#mode-row').style.display = 'none';
  $('#difficulty-row').style.display = 'none';
  $('#pace-row').style.display = 'none';
  $$('.field-label').forEach(l => {
    if (/^(League|Difficulty|Pace)/.test(l.textContent)) l.style.display = 'none';
  });
  $('#fictional-setup').classList.toggle('hidden', c.mode !== 'fictional');
  $('#nba-setup').classList.add('hidden');
  $('#start-btn').textContent = 'Accept Challenge';
}

function enterGame() {
  $('#start-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#price-slider').value = S.ticketPrice;
  renderAll();
}

/* ================= toasts, confetti, tweens ================= */

function toast(msg, cls) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast' + (cls ? ' ' + cls : '');
  el.textContent = msg;
  $('#toast-stack').appendChild(el);
  setTimeout(() => el.classList.add('fade'), 3400);
  setTimeout(() => el.remove(), 3900);
}

function drainObjEvents() {
  if (!S || !S.objEvents || !S.objEvents.length) return;
  for (const id of S.objEvents) {
    const o = OBJECTIVES.find(o => o.id === id);
    if (o) toast(`🎯 Objective complete: ${o.name} · +${fmtMoney(o.reward)} sponsor bonus`, 'gold');
  }
  confetti(30);
  S.objEvents = [];
  saveGame();
}

function confetti(n) {
  const root = $('#confetti-root');
  const colors = ['#f5842b', '#0ca30c', '#3987e5', '#fab219', '#e66767'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    root.appendChild(c);
    setTimeout(() => c.remove(), 3800);
  }
}

// animate a numeric text change (money HUD, scoreboard)
function tweenText(el, from, to, fmt, ms) {
  if (from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / (ms || 500));
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const sleep = ms => new Promise(res => {
  const t0 = performance.now();
  const tick = () => (window.__skipAnim || performance.now() - t0 >= ms) ? res() : requestAnimationFrame(tick);
  tick();
});

/* ================= live game ================= */

async function onPlayGame() {
  if (animating || !S || gameIsDone()) return;
  animating = true;
  window.__skipAnim = false;
  const res = playGameDay();
  if (!res) { animating = false; return; }
  lastResult = res;

  // reset modal
  $('#result-headline').textContent = res.playoff
    ? `🏆 ${res.playoff.toUpperCase()} — LIVE`
    : '🏀 Live from the arena';
  $('#sb-us-name').textContent = S.teamName;
  $('#sb-them-name').textContent = res.opp;
  $('#sb-us-score').textContent = '0';
  $('#sb-them-score').textContent = '0';
  $('#sb-us-score').classList.remove('lead');
  $('#sb-them-score').classList.remove('lead');
  $('#sb-quarter').textContent = res.home ? 'Q1 · HOME' : 'Q1 · AWAY';
  $('#quarter-row').innerHTML = '';
  $('#pbp-feed').innerHTML = '';
  $('#result-details').classList.add('hidden');
  $('#result-close').classList.add('hidden');
  $('#result-share').classList.add('hidden');
  $('#result-skip').classList.remove('hidden');
  $('#result-modal').classList.remove('hidden');
  $('#fab-play').classList.add('hidden');

  const stars = S.roster.filter(p => p.injury === 0).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  let cumUs = 0, cumThem = 0;
  for (let q = 0; q < 4; q++) {
    $('#sb-quarter').textContent = `Q${q + 1}`;
    const [qUs, qThem] = res.quarters[q];
    // a couple of play-by-play beats per quarter
    for (let b = 0; b < 2; b++) {
      if (window.__skipAnim) break;
      const ours = Math.random() < 0.6;
      const line = ours
        ? PBP_LINES[Math.floor(Math.random() * PBP_LINES.length)]
            .replace('{p}', stars.length ? stars[Math.floor(Math.random() * stars.length)].name : S.teamName)
        : PBP_OPP[Math.floor(Math.random() * PBP_OPP.length)].replace('{o}', res.opp);
      pbpLine(line, ours && Math.random() < 0.35);
      await sleep(650);
    }
    tweenText($('#sb-us-score'), cumUs, cumUs + qUs, String, 600);
    tweenText($('#sb-them-score'), cumThem, cumThem + qThem, String, 600);
    cumUs += qUs; cumThem += qThem;
    $('#quarter-row').innerHTML += `<span>Q${q + 1} <b>${qUs}–${qThem}</b></span>`;
    await sleep(750);
  }

  // final state
  window.__skipAnim = false;
  $('#sb-us-score').textContent = res.us;
  $('#sb-them-score').textContent = res.them;
  $('#sb-quarter').textContent = 'FINAL';
  $('#quarter-row').innerHTML = res.quarters.map((q, i) => `<span>Q${i + 1} <b>${q[0]}–${q[1]}</b></span>`).join('');
  (res.win ? $('#sb-us-score') : $('#sb-them-score')).classList.add('lead');
  const champion = S.over === 'champion';
  $('#result-headline').textContent = champion
    ? '🏆 LEAGUE CHAMPIONS!'
    : res.playoff
      ? (res.win ? `🏆 ${res.playoff} — WON!` : `${res.playoff} — eliminated`)
      : res.win ? (res.upset ? '🔥 UPSET WIN!' : '🏀 Victory!') : 'Tough loss';
  if (champion) confetti(220);
  else if (res.win) confetti(res.upset ? 80 : 40);

  let html = '';
  if (S.streakW >= 2) html += `<p style="color:var(--accent);font-weight:700">⚡ ${S.streakW}-game win streak</p>`;
  if (res.streakInfo && res.streakInfo.bonus) {
    html += `<div class="event-line">🔥 Day-${res.streakInfo.n} play streak — sponsor bonus +${fmtMoney(res.streakInfo.bonus)}</div>`;
  }
  html += `<p>${res.home ? 'vs' : '@'} <b>${escapeHtml(res.opp)}</b>` +
    (res.fin.attendance != null ? ` · ${fmtInt(res.fin.attendance)} fans (${Math.round(res.fin.attendance / CFG.ARENA_CAPACITY * 100)}% full)` : ' · road game') + `</p>`;
  for (const line of res.fin.lines) {
    html += `<div class="fin-line"><span>${escapeHtml(line.label)}</span>` +
      `<span class="amt ${line.amt >= 0 ? 'pos' : 'neg'}">${line.amt >= 0 ? '+' : ''}${fmtMoney(line.amt)}</span></div>`;
  }
  const net = res.fin.revenue - res.fin.expenses;
  html += `<div class="fin-line total"><span>Game-day net</span>` +
    `<span class="amt ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmtMoney(net)}</span></div>`;
  for (const e of res.events) html += `<div class="event-line">⚡ ${escapeHtml(e)}</div>`;
  $('#result-details').innerHTML = html;
  $('#result-details').classList.remove('hidden');
  $('#result-skip').classList.add('hidden');
  $('#result-close').classList.remove('hidden');
  $('#result-share').classList.remove('hidden');

  animating = false;
  drainObjEvents();
  renderAll();
}

function pbpLine(text, big) {
  const el = document.createElement('div');
  el.className = 'pbp-line' + (big ? ' big' : '');
  el.textContent = (big ? '🔥 ' : '· ') + text;
  const feed = $('#pbp-feed');
  feed.prepend(el);
  while (feed.children.length > 4) feed.lastChild.remove();
}

/* ================= sharing ================= */

function resultEmojiGrid(limit) {
  const res = limit ? S.results.slice(-limit) : S.results;
  return res.map(r => (r.win ? '🟩' : '🟥')).join('');
}

function challengeUrl() {
  return location.href.split('#')[0] + '#c=' + challengeCode();
}

function buildProgressShare() {
  const you = S.league.find(t => t.you);
  return `🏀 Courtside Capital — ${S.teamName}\n` +
    `${you.w}–${you.l} after ${S.day}/${seasonLen()} games · 💰 franchise value ${fmtMoney(netWorth())}\n` +
    `${resultEmojiGrid()}\n` +
    `Think you can do better? Play my exact season:\n${challengeUrl()}`;
}

function buildSeasonShare() {
  const sum = seasonSummary();
  const champ = sum.champion ? '🏆 CHAMPIONS · ' : '';
  return `🏀 Courtside Capital — ${S.teamName}\n` +
    `${champ}Finished #${sum.rank} of ${S.league.length} · ${sum.wins}–${sum.losses} · Grade ${sum.grade}\n` +
    `💰 Franchise value ${sum.growth >= 0 ? '+' : ''}${(sum.growth * 100).toFixed(0)}%\n` +
    `${resultEmojiGrid()}\n` +
    `Beat my season — same roster, same market, same schedule:\n${challengeUrl()}`;
}

function buildChallengeShare() {
  return `⚔️ I challenge you to run ${S.teamName} in Courtside Capital.\n` +
    `Same roster, same market, same schedule — beat my record.\n${challengeUrl()}`;
}

async function shareText(text) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
  } catch (e) { /* user cancelled the share sheet — fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(text);
    toast('📋 Copied to clipboard — paste it anywhere');
  } catch (e) {
    prompt('Copy your share text:', text);
  }
}

/* ================= coach tour ================= */

const TOUR_STEPS = [
  { sel: '#next-game-card',  text: 'Your next game. Strength and win probability update with every roster move you make.' },
  { sel: '#pricing-card',    text: 'Ticket pricing. Fans have a reference price — set yours against the demand curve. In Quick Season your CFO handles it; untick smart pricing anytime to take over.' },
  { sel: '#objectives-card', text: 'Your to-do list. Each objective teaches one system and pays a real cash bonus when you complete it.' },
  { sel: '.tab[data-tab="market"]', text: 'The trade market. Player values move every game day — buy low, sell high, and fund your empire.' },
  { sel: '#play-btn',        text: 'When you\'re ready: tip-off. Good luck, owner. 🏀' },
];
let tourStep = -1;

function maybeStartTour() {
  try { if (localStorage.getItem(TOUR_KEY)) return; } catch (e) {}
  tourStep = -1;
  $('#tour-overlay').classList.remove('hidden');
  $('#tour-next').onclick = nextTourStep;
  $('#tour-skip').onclick = endTour;
  nextTourStep();
}

function nextTourStep() {
  clearTourSpotlight();
  tourStep += 1;
  if (tourStep >= TOUR_STEPS.length) return endTour();
  const step = TOUR_STEPS[tourStep];
  const el = $(step.sel);
  if (!el) return nextTourStep();
  el.classList.add('tour-spotlight');
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  $('#tour-text').textContent = step.text;
  $('#tour-next').textContent = tourStep === TOUR_STEPS.length - 1 ? 'Let\'s go! 🏀' : 'Next ▸';
  const r = el.getBoundingClientRect();
  const tip = $('#tour-tip');
  tip.style.left = Math.max(12, Math.min(window.innerWidth - 320, r.left)) + 'px';
  tip.style.top = (r.bottom + 12 + 300 > window.innerHeight ? Math.max(12, r.top - 130) : r.bottom + 12) + 'px';
}

function clearTourSpotlight() {
  $$('.tour-spotlight').forEach(el => el.classList.remove('tour-spotlight'));
}

function endTour() {
  clearTourSpotlight();
  $('#tour-overlay').classList.add('hidden');
  try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {}
}

/* ================= season end ================= */

function showSeasonEnd() {
  const sum = seasonSummary();
  if (S.over === 'bankrupt') {
    $('#season-headline').textContent = '💸 Bankrupt';
    $('#season-summary').innerHTML =
      `<p>The league has seized the franchise — debts passed ${fmtMoney(CFG.BANKRUPT_AT)}. ` +
      `Great rosters mean nothing if the balance sheet collapses.</p>` +
      `<div class="grade">F</div>`;
  } else {
    const champ = sum.champion;
    $('#season-headline').textContent = champ ? '🏆 League Champions!' : 'Season complete';
    if (champ) confetti(160);
    const playoffLine = champ
      ? 'Won the Championship'
      : sum.madePlayoffs
        ? `Made the playoffs · ${escapeHtml(sum.champName || '')} won the title`
        : `Missed the playoffs (top 4) · ${escapeHtml(sum.champName || '')} won the title`;
    $('#season-summary').innerHTML =
      `<div class="grade">${sum.grade}</div>` +
      `<div class="fin-line"><span>Playoffs</span><b>${playoffLine}</b></div>` +
      `<div class="fin-line"><span>Final record</span><b>${sum.wins}–${sum.losses} (#${sum.rank} of ${S.league.length})</b></div>` +
      `<div class="fin-line"><span>Starting franchise value</span><b>${fmtMoney(sum.startWorth)}</b></div>` +
      `<div class="fin-line"><span>Final franchise value</span><b>${fmtMoney(sum.worth)}</b></div>` +
      `<div class="fin-line"><span>Value growth</span><b style="color:${sum.growth >= 0 ? 'var(--good)' : 'var(--series-2)'}">${(sum.growth * 100).toFixed(0)}%</b></div>` +
      `<div class="fin-line"><span>Objectives completed</span><b>${Object.keys(S.obj).length}/${OBJECTIVES.length}</b></div>` +
      (champ ? '<p>Banner raised. Share the trophy — then defend it.</p>'
             : '<p>The board expects a title <i>and</i> a return on capital. Run it back — or dare a friend to do better.</p>');
  }
  $('#season-modal').classList.remove('hidden');
}

/* ================= rendering ================= */

function renderAll() {
  if (!S) return;
  renderHud();
  renderSeasonStrip();
  renderTicker();
  renderNavBadges();
  renderOffice();
  renderRoster();
  renderMarket();
  renderTech();
  renderFinance();
  renderLeague();
  renderFab();
}

function gameIsDone() {
  return !!S.over || (S.day >= seasonLen() && S.phase !== 'playoffs');
}

function renderNavBadges() {
  const injured = S.roster.filter(p => p.injury > 0).length;
  const rosterBadge = $('#badge-roster');
  rosterBadge.classList.toggle('hidden', injured === 0);
  rosterBadge.textContent = injured ? `${injured} INJ` : '';
  const deals = S.tech.analytics >= 3 ? S.market.filter(isUndervalued).length : 0;
  const marketBadge = $('#badge-market');
  marketBadge.classList.toggle('hidden', deals === 0);
  marketBadge.textContent = deals ? `${deals} 💡` : '';
}

let prevCash = null, prevWorth = null;

function renderHud() {
  const you = S.league.find(t => t.you);
  $('#hud-team').textContent = S.teamName + (S.challenge ? ' ⚔️' : '');
  $('#hud-record').textContent = S.phase === 'playoffs' && !S.over
    ? `${you.w}–${you.l} · 🏆 PLAYOFFS: ${S.playoff.stage === 'final' ? 'Championship' : 'Semifinal'}`
    : gameIsDone()
      ? `${you.w}–${you.l} · season over`
      : `${you.w}–${you.l} · Game ${S.day + 1} of ${seasonLen()}`;

  const cashEl = $('#hud-cash');
  if (prevCash !== null && prevCash !== S.cash) {
    tweenText(cashEl, prevCash, S.cash, fmtMoney);
    cashEl.classList.remove('bump-up', 'bump-down');
    void cashEl.offsetWidth;   // restart the bump animation
    cashEl.classList.add(S.cash > prevCash ? 'bump-up' : 'bump-down');
  } else {
    cashEl.textContent = fmtMoney(S.cash);
  }
  prevCash = S.cash;
  cashEl.classList.toggle('neg', S.cash < 0);

  $('#hud-hype').textContent = `${Math.round(S.hype)} / 100`;
  $('#hud-payroll').textContent = fmtMoney(payrollPerGame());

  const worthEl = $('#hud-networth');
  const worth = netWorth();
  if (prevWorth !== null && prevWorth !== worth) tweenText(worthEl, prevWorth, worth, fmtMoney);
  else worthEl.textContent = fmtMoney(worth);
  prevWorth = worth;

  const streak = currentStreak();
  $('#hud-streak').textContent = streak >= 2 ? `🔥 ${streak}d` : '—';
  $('#hud-streak-wrap').style.display = streak >= 2 ? '' : 'none';
}

function renderSeasonStrip() {
  const total = Math.max(seasonLen(), S.results.length + (S.phase === 'playoffs' && !S.over ? 1 : 0));
  const dots = [];
  for (let i = 0; i < total; i++) {
    const r = S.results[i];
    const po = r ? !!r.playoff : (i >= seasonLen());
    const cls = (r ? (r.win ? 'w' : 'l') : (i === S.day && !S.over ? 'next' : '')) + (po ? ' po' : '');
    const label = r
      ? `${r.playoff ? r.playoff : 'Game ' + (i + 1)}: ${r.win ? 'W' : 'L'} ${r.us}–${r.them} ${r.home ? 'vs' : '@'} ${r.opp}`
      : (po ? 'Playoff game' : `Game ${i + 1}`);
    dots.push(`<div class="strip-dot ${cls}" title="${escapeHtml(label)}"></div>`);
  }
  $('#season-strip').innerHTML = dots.join('');
}

function renderTicker() {
  const items = S.news && S.news.length ? S.news : ['Quiet day around the league.'];
  $('#ticker').textContent = items.join('  ···  ');
}

function renderFab() {
  const show = currentTab !== 'office' && !gameIsDone() &&
    $('#result-modal').classList.contains('hidden');
  $('#fab-play').classList.toggle('hidden', !show);
}

// next opponent for either phase, shaped like nextMatchup()
function upcomingGame() {
  if (S.phase === 'playoffs') {
    const po = S.playoff;
    const opp = S.league.find(t => t.name === (po.stage === 'final' ? po.finalOpp : po.myOpp));
    const home = po.mySeed <= 2;
    const strUs = teamStrength(home);
    return { opp, home, strUs, strThem: opp.str, pWin: winProbability(strUs, opp.str),
             round: po.stage === 'final' ? 'CHAMPIONSHIP' : 'PLAYOFF SEMIFINAL' };
  }
  return nextMatchup();
}

function renderOffice() {
  const done = gameIsDone();
  $('#play-btn').disabled = !!done;
  if (done) {
    $('#matchup').innerHTML = '<p class="matchup-meta">Season complete.</p>';
    $('#play-btn').textContent = 'Season over';
  } else {
    const m = upcomingGame();
    $('#matchup').innerHTML =
      (m.round ? `<div class="playoff-banner">🏆 ${m.round}</div>` : '') +
      `<div class="matchup-teams">
        <div class="matchup-team"><div class="t-name">${escapeHtml(S.teamName)}</div><div class="t-str">strength ${m.strUs}</div></div>
        <div class="matchup-vs">${m.home ? 'vs' : '@'}</div>
        <div class="matchup-team"><div class="t-name">${escapeHtml(m.opp.name)}</div><div class="t-str">strength ${m.strThem}</div></div>
      </div>
      <div class="matchup-meta">${m.home
        ? (m.round ? 'Home playoff game — premium gate revenue' : 'Home game — gate revenue is yours')
        : 'Road game — TV money only'}</div>
      <div class="winprob-bar"><div class="winprob-fill" style="width:${Math.round(m.pWin * 100)}%"></div></div>
      <div class="winprob-label">Win probability: ${Math.round(m.pWin * 100)}%</div>`;
    $('#play-btn').textContent = m.round ? 'Play Playoff Game ▸' : 'Play Game ▸';
  }
  renderPricing();
  renderObjectives();
  renderAdvisor();
}

function renderObjectives() {
  const doneCount = Object.keys(S.obj).length;
  $('#obj-progress').textContent = `${doneCount}/${OBJECTIVES.length} · each pays a sponsor bonus`;
  // open objectives first, completed sink to the bottom
  const ordered = [...OBJECTIVES].sort((a, b) => (S.obj[a.id] !== undefined) - (S.obj[b.id] !== undefined));
  $('#objectives-list').innerHTML = ordered.map(o => {
    const done = S.obj[o.id] !== undefined;
    return `<div class="obj-row${done ? ' done' : ''}">
      <span class="obj-icon">${o.icon}</span>
      <span class="obj-body"><span class="obj-name">${escapeHtml(o.name)}</span><br><span class="obj-desc">${escapeHtml(o.desc)}</span></span>
      <span class="obj-reward">+${fmtMoney(o.reward)}</span>
    </div>`;
  }).join('');
}

function renderPricing() {
  $('#auto-price-toggle').checked = !!S.autoPrice;
  $('.price-row').classList.toggle('dimmed', !!S.autoPrice);
  if (S.autoPrice) {
    S.ticketPrice = optimalTicketPrice();
    $('#price-slider').value = S.ticketPrice;
  }
  $('#price-value').textContent = S.ticketPrice;
  const d = projectDemand(S.ticketPrice);
  const pct = Math.round(d.attendance / CFG.ARENA_CAPACITY * 100);
  $('#demand-readout').innerHTML =
    `<div class="demand-stat"><span class="d-label">Projected crowd</span><span class="d-value">${fmtInt(d.attendance)} (${pct}%)</span></div>
     <div class="demand-stat"><span class="d-label">Gate revenue</span><span class="d-value">${fmtMoney(d.gate)}</span></div>
     <div class="demand-stat"><span class="d-label">+ Concessions</span><span class="d-value">${fmtMoney(d.concessions)}</span></div>
     <div class="demand-stat"><span class="d-label">Fans' reference price</span><span class="d-value">$${d.ref}</span></div>`;
  const note = S.autoPrice
    ? 'Your CFO reprices every game as hype moves. Untick smart pricing to play the demand curve yourself.'
    : S.ticketPrice > d.ref * 1.6
      ? 'Way above what fans think is fair — demand collapses at this price (elasticity bites).'
      : S.ticketPrice < d.ref * 0.8
        ? 'Below the market-clearing price — the arena sells out but you leave gate money on the table.'
        : 'Near the revenue-maximizing zone. Winning raises the reference price fans will pay.';
  $('#econ-note').textContent = note;
}

function renderAdvisor() {
  currentSuggestion = computeSuggestion();
  const sugHtml = currentSuggestion
    ? `<div class="suggestion-box"><span>💡 ${escapeHtml(currentSuggestion.text)}</span>` +
      `<button id="suggestion-apply" class="btn btn-primary btn-small">⚡ Do it</button></div>`
    : '';
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
  $('#suggestion-slot').innerHTML = sugHtml;
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

  let action;
  if (mode === 'roster') {
    const atMin = S.roster.length <= CFG.ROSTER_MIN;
    action = `<button class="btn btn-sell" data-sell="${p.id}" ${atMin ? `disabled title="League minimum is ${CFG.ROSTER_MIN} players — sign someone before selling"` : ''}>Sell · ${fmtMoney(p.value)}</button>`;
  } else {
    const cost = Math.round(p.value * (1 + buyFee()));
    const full = S.roster.length >= CFG.ROSTER_MAX;
    const broke = S.cash < cost;
    action = `<button class="btn btn-buy" data-buy="${p.id}" ${full ? `disabled title="Roster is full (${CFG.ROSTER_MAX} max) — sell someone first"` : broke ? 'disabled title="Not enough cash"' : ''}>Sign · ${fmtMoney(cost)}</button>`;
  }

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
  $('#roster-count').textContent =
    `${S.roster.length} of ${CFG.ROSTER_MAX} roster spots filled · league minimum ${CFG.ROSTER_MIN} · payroll ${fmtMoney(payrollPerGame())}/game`;
  $('#roster-list').innerHTML = sorted.map(p => playerCard(p, 'roster')).join('');
}

const MARKET_SORTS = {
  value:  (a, b) => b.value - a.value,
  cheap:  (a, b) => a.value - b.value,
  young:  (a, b) => a.age - b.age,
  movers: (a, b) => marketDelta(b) - marketDelta(a),
  ovr:    (a, b) => b.ovr - a.ovr,
};
function marketDelta(p) {
  const h = p.hist || [];
  return h.length > 1 ? Math.abs(h[h.length - 1] - h[h.length - 2]) / h[h.length - 2] : 0;
}

function renderMarket() {
  $('#market-note').textContent = S.tech.analytics === 0
    ? 'Scouting is fuzzy without an Analytics Lab: ratings show as ranges and potential is hidden. Values drift daily — news moves them sharply.'
    : `Agent fee on signings: ${Math.round(buyFee() * 100)}%. Values drift daily; news moves them sharply. Selling returns full market value.`;
  $('#market-roster-chip').innerHTML =
    `Roster <b>${S.roster.length}/${CFG.ROSTER_MAX}</b> · Cash <b>${fmtMoney(S.cash)}</b>`;
  $('#sort-ovr-option').hidden = S.tech.analytics === 0;   // no sorting on hidden info
  if (marketSort === 'ovr' && S.tech.analytics === 0) marketSort = 'value';
  const pool = S.market.filter(p => marketPos === 'ALL' || p.pos === marketPos);
  const sorted = [...pool].sort(MARKET_SORTS[marketSort] || MARKET_SORTS.value);
  $('#market-list').innerHTML = sorted.length
    ? sorted.map(p => playerCard(p, 'market')).join('')
    : '<p class="econ-note">No players at this position right now — the pool refreshes every game day.</p>';
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
