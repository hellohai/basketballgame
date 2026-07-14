/* Courtside Capital — support modal, supporter codes, themes, sponsor slot.
   The monetization FOUNDATION: everything renders only when configured in
   js/data.js (SUPPORT / HOUSE_SPONSOR), so the default build stays clean. */

function djb2(s) {
  let h = 5381;
  for (const c of s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

function isSupporter() {
  try { return localStorage.getItem(SUPPORTER_KEY) === '1'; } catch (e) { return false; }
}

function currentTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'midnight'; } catch (e) { return 'midnight'; }
}

function applyTheme(id) {
  const t = THEMES.find(t => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  try { localStorage.setItem(THEME_KEY, t.id); } catch (e) {}
}

function renderSupportModal() {
  const links = SUPPORT.links || [];
  $('#support-links').innerHTML = links.length
    ? links.map(l =>
        `<a class="btn btn-primary support-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
      ).join('')
    : '<p class="econ-note">No payment links configured yet — this build runs on love alone.</p>';

  const sup = isSupporter();
  $('#theme-row').innerHTML = THEMES.map(t => {
    const locked = !t.free && !sup;
    return `<button class="diff-btn theme-btn${currentTheme() === t.id ? ' selected' : ''}" data-theme-id="${t.id}" ${locked ? 'data-locked="1"' : ''}>
      ${escapeHtml(t.name)}<span>${locked ? icon('lock', 12) + ' supporters' : t.free ? 'free' : icon('check', 12) + ' unlocked'}</span>
    </button>`;
  }).join('');
  $('#supporter-code').parentElement.style.display = sup ? 'none' : '';
  $$('.field-label').forEach(l => {
    if (l.htmlFor === 'supporter-code') l.style.display = sup ? 'none' : '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme());

  $('#support-btn').addEventListener('click', () => {
    renderSupportModal();
    $('#support-modal').classList.remove('hidden');
  });
  $('#support-close').addEventListener('click', () => $('#support-modal').classList.add('hidden'));

  $('#theme-row').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-theme-id]');
    if (!btn) return;
    if (btn.dataset.locked) {
      toast('That theme is a supporter perk — redeem a code below.', 'gold');
      return;
    }
    applyTheme(btn.dataset.themeId);
    renderSupportModal();
  });

  $('#redeem-btn').addEventListener('click', () => {
    const code = $('#supporter-code').value.trim().toUpperCase();
    if (!code) return;
    if ((SUPPORT.codeHashes || []).includes(djb2(code))) {
      try { localStorage.setItem(SUPPORTER_KEY, '1'); } catch (e) {}
      confetti(120);
      toast('Welcome to the owner\'s box — themes unlocked. Thank you!', 'gold');
      renderSupportModal();
    } else {
      toast('That code didn\'t check out.', 'gold');
    }
  });
});
