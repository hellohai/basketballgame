# 🏀 Courtside Capital

**A basketball franchise tycoon game — where economics and technology win championships.**

You just bought a struggling basketball franchise. Over a 24-game season you'll try to do
what every real front office does: win games *and* grow the value of the franchise. The
roster gets you wins, but the economy is the real game.

## Play it

No build step, no dependencies. Either:

- Open `index.html` directly in any modern browser, or
- Serve the folder: `python3 -m http.server 8000` → http://localhost:8000, or
- Host it free on **GitHub Pages** (Settings → Pages → deploy from branch) — it's a fully
  static site.

Your season auto-saves to the browser (localStorage), so you can close the tab and pick
it back up.

## Two ways to play

- **Fictional League** — 8 invented teams, you name your franchise.
- **Real NBA** — pick any of the 30 real NBA teams and inherit its actual roster.
  Rival strength is computed from real rosters, and the trade market fills with real
  players from around the league. Picking a contender is easy mode; turning a rebuilding
  team into a champion is the real challenge.

## Two paces

- **🕹️ Quick Season** — 12 games, smart pricing on (your CFO auto-sets the
  revenue-maximizing ticket price). Play, trade, and follow the one-tap suggested
  moves — a season fits in a coffee break.
- **🧠 Full GM** — 24 games and every lever is yours, including the demand curve.

Both paces end with **playoffs**: top 4 seeds, single-elimination semifinal and
championship, with premium playoff gate revenue.

## Controller support 🎮

Plug in any standard gamepad: **LB/RB** (or D-pad ◀▶) switch screens, **▲▼** move
focus, **A** selects / plays / skips, **B** backs out, and **LT/RT** ride the
ticket-price slider.

### Where the NBA data comes from

`data/nba_data.js` ships with a bundled roster snapshot (see its `asOf` field). To pull
current rosters from ESPN's public API:

```
node scripts/update-rosters.mjs           # refresh data/nba_data.js
node scripts/update-rosters.mjs --dry-run # preview without writing
```

A GitHub Action (`.github/workflows/update-rosters.yml`) runs the same script every
Monday and commits the result, so a deployed copy stays current through trades and
signings. Player **ratings** are editorial estimates for game balance — refreshes
preserve any rating already in the file (matched by name), so you can hand-tune them.
New players get a conservative estimate from age and experience.

**A note on rights:** team names, player names, and stats are facts, which is why a free
fan game can use them. Don't add official team logos, wordmarks, or player photos —
those are licensed property — and the calculus changes if you ever charge money for
the game.

## The three pillars

### 🏀 Basketball
- Run an 8-team league across a 24-game season with live standings.
- Team strength comes from your top five healthy players (form and injuries matter),
  bench depth, home court, and your analytics edge.
- Win probability is Elo-style — upsets happen, and beating a stronger team spikes fan hype.

### 📈 Economics
- **Price-elastic ticket demand.** Fans have a reference price that rises as you win.
  Price above it and attendance collapses; price below it and you sell out but leave gate
  money on the table. The pricing panel shows the projected crowd and revenue live as you
  drag the slider — find the revenue-maximizing point.
- **A player trade market that behaves like a market.** Values follow a random walk with
  mean reversion toward fundamentals (age, rating, potential), plus news shocks that
  create genuine buy-low / sell-high opportunities. Every player card has a price
  sparkline.
- **A real income statement.** Gate, concessions, merch, sponsorships, TV and streaming
  revenue against payroll, staff, and arena operations — tracked in a ledger with cash
  and revenue-vs-expense charts. Overspend and the league seizes the franchise at
  −$10M.

### 💻 Technology
A four-track tech tree, each with three levels of capital investment:

| Track | What it does |
|---|---|
| 📊 Analytics Lab | Reveals true ratings and potential on the market, halves agent fees, flags undervalued players, boosts game plans |
| 🏋️ Training Center | Players develop toward their potential every game day |
| 🩺 Sports Medicine | Fewer injuries, faster recoveries |
| 📱 Digital Fan Platform | Streaming revenue, merch conversion, sellout bonuses, slower hype decay |

Without the Analytics Lab you only see rating *ranges* on the market — you're trading
blind, which is exactly the information asymmetry the upgrade removes.

## Winning

At season's end you're graded (S–D) on **two axes**: where you finished in the standings
and how much you grew franchise value (cash + roster value + technology assets) versus
where you started. A title with a wrecked balance sheet won't get you an S.

## Project layout

```
index.html                 page structure (start screen, tabs, modals)
css/style.css              dark court theme
js/data.js                 constants, names, tech tree, seeded RNG, formatters
js/engine.js               game state, economy, market simulation, game/season logic
js/charts.js               dependency-free SVG charts (line, grouped bars, sparklines)
js/ui.js                   rendering and event wiring
data/nba_data.js           real NBA roster snapshot (regenerated by the script below)
scripts/update-rosters.mjs roster refresh from ESPN's public API (Node 18+, no deps)
```

Plain HTML/CSS/JS — no framework, no build, ~1,700 lines total.

## Ideas for future seasons

- Multi-season careers with player aging and a draft
- A playoff bracket for the top four seeds
- Loans and bond issues (leverage!) and an arena-expansion capital project
- Online leaderboards or head-to-head leagues (would need a small backend)
