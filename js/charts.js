/* Courtside Capital — tiny dependency-free SVG charts (line, grouped bars, sparkline) */

const CHART_COLORS = {
  s1: '#3987e5',      // series 1 (cash / revenue) — validated on dark surface
  s2: '#e66767',      // series 2 (expenses)
  grid: '#2c2c3a',
  axis: '#3a3a4a',
  ink: '#c3c2b7',
  muted: '#898781',
};

function chartScale(values, height, pad) {
  let lo = Math.min(0, ...values), hi = Math.max(...values);
  if (hi === lo) hi = lo + 1;
  const span = hi - lo;
  lo -= span * 0.05; hi += span * 0.08;
  return v => height - pad.b - ((v - lo) / (hi - lo)) * (height - pad.t - pad.b);
}

function niceTicks(values, count) {
  const lo = Math.min(0, ...values), hi = Math.max(...values);
  const step = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step || 1)));
  const nice = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step) || mag * 10;
  const ticks = [];
  for (let v = Math.ceil(lo / nice) * nice; v <= hi; v += nice) ticks.push(v);
  return ticks;
}

function attachTip(box) {
  let tip = box.querySelector('.chart-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip hidden';
    box.appendChild(tip);
  }
  return tip;
}

/* Line chart: data = [{x: label, y: value}] */
function renderLineChart(box, data, opts) {
  const W = 520, H = 230, pad = { t: 12, r: 12, b: 26, l: 54 };
  const ys = data.map(d => d.y);
  const sy = chartScale(ys, H, pad);
  const sx = i => pad.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));

  const ticks = niceTicks(ys, 4);
  let g = '';
  for (const t of ticks) {
    g += `<line x1="${pad.l}" y1="${sy(t)}" x2="${W - pad.r}" y2="${sy(t)}" stroke="${CHART_COLORS.grid}" stroke-width="1"/>`;
    g += `<text x="${pad.l - 8}" y="${sy(t) + 4}" text-anchor="end" font-size="10" fill="${CHART_COLORS.muted}">${fmtMoney(t)}</text>`;
  }
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(d.y).toFixed(1)}`).join(' ');

  box.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opts.label)}">
      ${g}
      <line x1="${pad.l}" y1="${sy(Math.max(0, Math.min(...ys, 0)))}" x2="${W - pad.r}" y2="${sy(0)}" stroke="${CHART_COLORS.axis}" stroke-width="1"/>
      <path d="${path}" fill="none" stroke="${CHART_COLORS.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle class="hover-dot hidden" r="4" fill="${CHART_COLORS.s1}" stroke="#15151d" stroke-width="2"/>
      <line class="hover-x hidden" y1="${pad.t}" y2="${H - pad.b}" stroke="${CHART_COLORS.muted}" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${W - pad.r}" y="${H - 8}" text-anchor="end" font-size="10" fill="${CHART_COLORS.muted}">game day →</text>
    </svg>`;

  const svg = box.querySelector('svg');
  const dot = svg.querySelector('.hover-dot');
  const xline = svg.querySelector('.hover-x');
  const tip = attachTip(box);

  svg.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const i = clamp(Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1)), 0, data.length - 1);
    const cx = sx(i), cy = sy(data[i].y);
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.classList.remove('hidden');
    xline.setAttribute('x1', cx); xline.setAttribute('x2', cx); xline.classList.remove('hidden');
    tip.classList.remove('hidden');
    tip.innerHTML = `<b>${fmtMoney(data[i].y)}</b> <span class="tip-sub">· ${escapeHtml(data[i].x)}</span>`;
    tip.style.left = `${(cx / W) * 100}%`;
    tip.style.top = `${(cy / H) * 100}%`;
  });
  svg.addEventListener('mouseleave', () => {
    dot.classList.add('hidden'); xline.classList.add('hidden'); tip.classList.add('hidden');
  });
}

/* Grouped bars: data = [{x, a, b}] with series names in opts */
function renderGroupedBars(box, data, opts) {
  const W = 520, H = 230, pad = { t: 12, r: 12, b: 26, l: 54 };
  const ys = data.flatMap(d => [d.a, d.b]);
  const sy = chartScale(ys, H, pad);
  const y0 = sy(0);
  const slot = (W - pad.l - pad.r) / Math.max(1, data.length);
  const barW = Math.min(18, slot * 0.32);

  const ticks = niceTicks(ys, 4);
  let g = '';
  for (const t of ticks) {
    g += `<line x1="${pad.l}" y1="${sy(t)}" x2="${W - pad.r}" y2="${sy(t)}" stroke="${CHART_COLORS.grid}" stroke-width="1"/>`;
    g += `<text x="${pad.l - 8}" y="${sy(t) + 4}" text-anchor="end" font-size="10" fill="${CHART_COLORS.muted}">${fmtMoney(t)}</text>`;
  }
  let bars = '';
  data.forEach((d, i) => {
    const cx = pad.l + slot * i + slot / 2;
    const hA = Math.max(1, y0 - sy(d.a)), hB = Math.max(1, y0 - sy(d.b));
    bars += `<g class="bar-group" data-i="${i}">
      <rect x="${cx - barW - 1}" y="${sy(d.a)}" width="${barW}" height="${hA}" rx="3" fill="${CHART_COLORS.s1}"/>
      <rect x="${cx + 1}" y="${sy(d.b)}" width="${barW}" height="${hB}" rx="3" fill="${CHART_COLORS.s2}"/>
      <rect class="hit" x="${cx - slot / 2}" y="${pad.t}" width="${slot}" height="${H - pad.t - pad.b}" fill="transparent"/>
      <text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="10" fill="${CHART_COLORS.muted}">${escapeHtml(String(d.x))}</text>
    </g>`;
  });

  box.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opts.label)}">
      ${g}
      <line x1="${pad.l}" y1="${y0}" x2="${W - pad.r}" y2="${y0}" stroke="${CHART_COLORS.axis}" stroke-width="1"/>
      ${bars}
    </svg>`;

  const svg = box.querySelector('svg');
  const tip = attachTip(box);
  svg.querySelectorAll('.bar-group').forEach(gEl => {
    gEl.addEventListener('mousemove', ev => {
      const i = +gEl.dataset.i, d = data[i];
      const r = svg.getBoundingClientRect();
      tip.classList.remove('hidden');
      tip.innerHTML = `<b>Day ${escapeHtml(String(d.x))}</b><br>` +
        `${escapeHtml(opts.aName)}: <b>${fmtMoney(d.a)}</b><br>` +
        `${escapeHtml(opts.bName)}: <b>${fmtMoney(d.b)}</b><br>` +
        `<span class="tip-sub">Net: ${fmtMoney(d.a - d.b)}</span>`;
      tip.style.left = `${((ev.clientX - r.left) / r.width) * 100}%`;
      tip.style.top = `${((ev.clientY - r.top) / r.height) * 100}%`;
    });
    gEl.addEventListener('mouseleave', () => tip.classList.add('hidden'));
  });
}

/* Sparkline: small inline value history, single series */
function sparklineSvg(values) {
  if (!values || values.length < 2) return '';
  const W = 120, H = 30, p = 3;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) =>
    `${(p + (i / (values.length - 1)) * (W - 2 * p)).toFixed(1)},` +
    `${(H - p - ((v - lo) / span) * (H - 2 * p)).toFixed(1)}`
  );
  const last = pts[pts.length - 1].split(',');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:100%">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${CHART_COLORS.s1}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="${CHART_COLORS.s1}"/>
  </svg>`;
}
