#!/usr/bin/env node
/**
 * Refresh data/nba_data.js with current NBA rosters from ESPN's public
 * (unofficial) JSON API. No dependencies; Node 18+.
 *
 *   node scripts/update-rosters.mjs            # fetch + write
 *   node scripts/update-rosters.mjs --dry-run  # fetch + print summary only
 *
 * Rating strategy: a player keeps the rating already in data/nba_data.js
 * (matched by name). New/unknown players get an estimate from age and
 * years of experience. Edit ratings by hand freely — refreshes preserve them.
 *
 * The script refuses to overwrite the data file unless the fetch looks
 * healthy (>= 25 teams and >= 200 players), so a flaky API run can never
 * wreck a working snapshot.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'data', 'nba_data.js');
const API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const DRY = process.argv.includes('--dry-run');
const POSITIONS = new Set(['PG', 'SG', 'SF', 'PF', 'C']);

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'courtside-capital-roster-refresh' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// previous ratings, keyed by lowercased player name
function loadExistingRatings() {
  const ratings = new Map();
  try {
    const src = readFileSync(DATA_FILE, 'utf8');
    // entries look like: ['Name', 'POS', age, ovr]
    const re = /\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'(?:PG|SG|SF|PF|C)'\s*,\s*\d+\s*,\s*(\d+)\s*\]/g;
    let m;
    while ((m = re.exec(src))) ratings.set(m[1].replace(/\\'/g, "'").toLowerCase(), +m[2]);
  } catch { /* first run — no existing file */ }
  return ratings;
}

function estimateRating(age, exp) {
  // conservative default for players we have no prior rating for:
  // rookies ~68, rises with experience, tapers with age
  let r = 66 + Math.min(8, (exp ?? 0) * 1.5);
  if (age >= 33) r -= (age - 32);
  return Math.round(Math.max(60, Math.min(78, r)));
}

function normalizePos(abbrev) {
  const map = { G: 'PG', F: 'SF', 'G-F': 'SG', 'F-G': 'SF', 'F-C': 'PF', 'C-F': 'C' };
  const p = (abbrev || '').toUpperCase();
  return POSITIONS.has(p) ? p : (map[p] || 'SF');
}

const prior = loadExistingRatings();
const teamsIndex = await getJson(`${API}/teams?limit=32`);
const teamRefs = (teamsIndex.sports?.[0]?.leagues?.[0]?.teams || [])
  .map(t => t.team).filter(t => t && !t.isAllStar);

console.log(`Found ${teamRefs.length} teams; fetching rosters…`);
const teams = [];
let totalPlayers = 0, keptRatings = 0;

for (const t of teamRefs) {
  try {
    const roster = await getJson(`${API}/teams/${t.id}/roster`);
    const athletes = (roster.athletes || []).flatMap(g => g.items || g || []);
    const players = [];
    for (const a of athletes) {
      const name = a.displayName || a.fullName;
      if (!name) continue;
      const age = a.age || 25;
      const pos = normalizePos(a.position?.abbreviation);
      const known = prior.get(name.toLowerCase());
      if (known) keptRatings++;
      const ovr = known ?? estimateRating(age, a.experience?.years);
      players.push([name, pos, age, ovr]);
    }
    players.sort((x, y) => y[3] - x[3]);
    if (players.length >= 8) {
      teams.push({ name: t.displayName, abbr: t.abbreviation, players: players.slice(0, 12) });
      totalPlayers += Math.min(players.length, 12);
      console.log(`  ${t.abbreviation}: ${players.length} players`);
    } else {
      console.warn(`  ${t.abbreviation}: only ${players.length} players — skipped`);
    }
    await new Promise(r => setTimeout(r, 300));   // be polite to the API
  } catch (e) {
    console.warn(`  ${t.abbreviation || t.id}: fetch failed — ${e.message}`);
  }
}

console.log(`\n${teams.length} teams, ${totalPlayers} players (${keptRatings} kept prior ratings).`);
if (teams.length < 25 || totalPlayers < 200) {
  console.error('Fetch looks unhealthy — NOT writing data file.');
  process.exit(1);
}

teams.sort((a, b) => a.name.localeCompare(b.name));
const asOf = new Date().toISOString().slice(0, 10) + ' (via scripts/update-rosters.mjs)';
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const body = teams.map(t =>
  `    { name: '${esc(t.name)}', abbr: '${esc(t.abbr)}', players: [\n` +
  t.players.map(p => `      ['${esc(p[0])}', '${p[1]}', ${p[2]}, ${p[3]}],`).join('\n') +
  '\n    ]},'
).join('\n');

const out = `/* Courtside Capital — Real NBA roster snapshot.
 *
 * Player entries: [name, position, age, overallRating]
 * Ratings are editorial estimates for game balance — NOT official NBA data.
 * Refresh with: node scripts/update-rosters.mjs
 */

const NBA_DATA = {
  asOf: '${asOf}',
  teams: [
${body}
  ],
};
`;

if (DRY) {
  console.log('\n--dry-run: not writing. First team preview:\n');
  console.log(out.slice(0, 900) + '…');
} else {
  writeFileSync(DATA_FILE, out);
  console.log(`Wrote ${DATA_FILE}`);
}
