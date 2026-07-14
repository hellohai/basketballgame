/* Courtside Capital — inline SVG icon set (24×24, 2px stroke, currentColor) */

const ICONS = {
  basketball:
    '<circle cx="12" cy="12" r="9"/><path d="M3.6 8.4c3 1.6 5 2.8 5 3.6s-2 2-5 3.6"/><path d="M20.4 8.4c-3 1.6-5 2.8-5 3.6s2 2 5 3.6"/><path d="M3 12h18"/><path d="M12 3v18"/>',
  office:
    '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15"/><path d="M10 21v-3h4v3"/>',
  roster:
    '<circle cx="9" cy="7.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 5.8"/><path d="M17.5 14.4A6 6 0 0 1 21 20"/>',
  market:
    '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  tech:
    '<path d="M10 3v6l-4.8 8.6A2 2 0 0 0 7 21h10a2 2 0 0 0 1.8-3.4L14 9V3"/><path d="M8.5 3h7"/><path d="M7.7 14h8.6"/>',
  finance:
    '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 12h.01M17.5 12h.01"/>',
  league:
    '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H5a2 2 0 0 0 0 4h2"/><path d="M17 6h2a2 2 0 0 1 0 4h-2"/>',
  ticket:
    '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"/><path d="M13 6v2.5M13 11v2M13 15.5V18"/>',
  zap:
    '<polygon points="13 2 3 14 11 14 10.2 22 21 10 13 10 13 2"/>',
  flame:
    '<path d="M12 22c4.4 0 7-2.8 7-6.7 0-3-1.9-5.2-3.4-6.8C14.3 7.1 13.5 5 13.7 2.5 10 4.8 8.6 7.6 8.8 10 7.5 9.4 7 8 7.1 6.4 5.2 8.5 5 11.2 5 13c0 5.6 2.6 9 7 9z"/>',
  chart:
    '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V7M18 17v-8"/>',
  dumbbell:
    '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  heartpulse:
    '<path d="M19.5 13.6 12 21l-7.5-7.4A5.2 5.2 0 1 1 12 6.3a5.2 5.2 0 1 1 7.5 7.3z"/><path d="M4 12h4l1.5-2.5 3 5L14 12h6"/>',
  phone:
    '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  rocket:
    '<path d="M5 15c-1.6 1.3-2 5-2 5s3.7-.4 5-2c.7-.9.7-2.2-.1-3a2.2 2.2 0 0 0-2.9 0z"/><path d="M12 15l-3-3a22 22 0 0 1 2-4A13 13 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H5s.5-3 2-4c1.6-1.1 4 0 4 0"/><path d="M12 15v4s3-.5 4-2c1.1-1.6 0-4 0-4"/>',
  banknote:
    '<path d="M12 2v20"/><path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  share:
    '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 13.4l7.2 4.2M15.6 6.4 8.4 10.6"/>',
  flag:
    '<path d="M4 22V4"/><path d="M4 4.5C7 2.5 10 6.5 13 4.5s4.5-1 7-.5v9.5c-2.5-.5-4 .5-7 2.5s-6-2-9 0"/>',
  check:
    '<polyline points="20 6 9 17 4 12"/>',
  alert:
    '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/>',
  bulb:
    '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4.2 12.6c.7.6 1.2 1.5 1.2 2.4h6c0-.9.5-1.8 1.2-2.4A7 7 0 0 0 12 2z"/>',
  gamepad:
    '<path d="M6 11h4M8 9v4"/><circle cx="15.2" cy="10.4" r="1"/><circle cx="17.8" cy="12.6" r="1"/><path d="M17.3 5H6.7a4.7 4.7 0 0 0-4.6 5.6l.9 4.6A3 3 0 0 0 8 16.6L9 15.5h6l1 1.1a3 3 0 0 0 5-1.4l.9-4.6A4.7 4.7 0 0 0 17.3 5z"/>',
  keyboard:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
  heart:
    '<path d="M19.5 13.6 12 21l-7.5-7.4A5.2 5.2 0 1 1 12 6.3a5.2 5.2 0 1 1 7.5 7.3z"/>',
  lock:
    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  palette:
    '<circle cx="12" cy="12" r="9"/><path d="M12 21a2 2 0 0 1 0-4h2.5a2.5 2.5 0 0 0 2.5-2.5C17 10 15 3 12 3"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7.5" r="1"/>',
};

function icon(name, size) {
  const s = size || 18;
  const d = ICONS[name] || ICONS.basketball;
  return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

// stamp icons into any element carrying data-icon="name" (static markup)
function injectIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon, +el.dataset.iconSize || undefined);
  });
}
