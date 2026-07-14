/* Courtside Capital — controller & keyboard support
   Gamepad (standard mapping):
     LB/RB or D-pad ◀▶  switch tabs        A  select / play / skip
     D-pad ▲▼           move focus         B  back / close modal
     LT/RT              ticket price −/+
   Keyboard:
     1–6 jump to screen · Q/E or ←→ prev/next screen · ↑↓ move focus
     Space/Enter select / play / skip · Esc back · +/− ticket price · ? help */

(function () {
  const TAB_ORDER = ['office', 'roster', 'market', 'tech', 'finance', 'league'];
  const BTN = { A: 0, B: 1, LB: 4, RB: 5, LT: 6, RT: 7, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const REPEAT_MS = 160;

  let prev = [];            // previous pressed state per button
  let lastMove = 0;         // for stick/trigger repeat pacing
  let focusIdx = -1;
  let announced = false;

  function pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  // buttons the controller can reach in the current context
  function focusables() {
    const modal = ['#result-modal', '#season-modal', '#start-screen', '#tour-overlay']
      .map(s => $(s)).find(el => el && !el.classList.contains('hidden'));
    const root = modal || $('#tab-' + currentTab) || document;
    const els = [...root.querySelectorAll('button:not(:disabled), select, input[type=range], input[type=checkbox]')]
      .filter(el => el.offsetParent !== null);
    if (!modal) {
      const fab = $('#fab-play');
      if (fab && !fab.classList.contains('hidden')) els.push(fab);
    }
    return els;
  }

  function setFocus(delta) {
    const els = focusables();
    if (!els.length) return;
    document.querySelectorAll('.gp-focus').forEach(el => el.classList.remove('gp-focus'));
    focusIdx = ((focusIdx + delta) % els.length + els.length) % els.length;
    const el = els[focusIdx];
    el.classList.add('gp-focus');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function focused() {
    return document.querySelector('.gp-focus');
  }

  function pressA() {
    // during the live game, A skips; on the final whistle it continues
    if (!$('#result-modal').classList.contains('hidden')) {
      if (!$('#result-skip').classList.contains('hidden')) return $('#result-skip').click();
      return $('#result-close').click();
    }
    const el = focused();
    if (el) {
      if (el.matches('input[type=checkbox]')) { el.checked = !el.checked; el.dispatchEvent(new Event('change')); return; }
      if (el.matches('select, input[type=range]')) { el.focus(); return; }
      el.click();
      focusIdx = -1;
      document.querySelectorAll('.gp-focus').forEach(e => e.classList.remove('gp-focus'));
      return;
    }
    // no focus → default action: tip-off
    if (typeof S !== 'undefined' && S && !gameIsDone()) onPlayGame();
  }

  function pressB() {
    if (!$('#result-modal').classList.contains('hidden')) {
      if (!$('#result-skip').classList.contains('hidden')) return $('#result-skip').click();
      return $('#result-close').click();
    }
    if (!$('#tour-overlay').classList.contains('hidden')) return $('#tour-skip').click();
    document.querySelectorAll('.gp-focus').forEach(e => e.classList.remove('gp-focus'));
    focusIdx = -1;
  }

  function shiftTab(dir) {
    if (typeof S === 'undefined' || !S || !$('#app') || $('#app').classList.contains('hidden')) return;
    const i = TAB_ORDER.indexOf(currentTab);
    switchTab(TAB_ORDER[((i + dir) % TAB_ORDER.length + TAB_ORDER.length) % TAB_ORDER.length]);
    focusIdx = -1;
  }

  function nudgePrice(dir) {
    const slider = $('#price-slider');
    if (!slider || typeof S === 'undefined' || !S || S.autoPrice) return;
    slider.value = clamp(+slider.value + dir, +slider.min, +slider.max);
    slider.dispatchEvent(new Event('input'));
    slider.dispatchEvent(new Event('change'));
  }

  function poll(now) {
    const p = pad();
    if (p) {
      if (!announced) {
        announced = true;
        toast('🎮 Controller connected — LB/RB tabs · ▲▼ focus · A select · B back · LT/RT price');
        $('#gp-indicator').classList.remove('hidden');
      }
      const pressed = i => p.buttons[i] && p.buttons[i].pressed;
      const edge = i => pressed(i) && !prev[i];

      if (edge(BTN.A)) pressA();
      if (edge(BTN.B)) pressB();
      if (edge(BTN.LB) || edge(BTN.LEFT)) shiftTab(-1);
      if (edge(BTN.RB) || edge(BTN.RIGHT)) shiftTab(1);
      if (edge(BTN.UP)) setFocus(-1);
      if (edge(BTN.DOWN)) setFocus(1);

      // analog: left stick repeats, triggers ride the price slider
      if (now - lastMove > REPEAT_MS) {
        const x = p.axes[0] || 0, y = p.axes[1] || 0;
        if (y < -0.6) { setFocus(-1); lastMove = now; }
        else if (y > 0.6) { setFocus(1); lastMove = now; }
        else if (x < -0.6) { shiftTab(-1); lastMove = now; }
        else if (x > 0.6) { shiftTab(1); lastMove = now; }
        const lt = p.buttons[BTN.LT], rt = p.buttons[BTN.RT];
        if (lt && lt.value > 0.4) { nudgePrice(-1); lastMove = now; }
        if (rt && rt.value > 0.4) { nudgePrice(1); lastMove = now; }
      }
      prev = p.buttons.map(b => b.pressed);
    } else if (announced) {
      announced = false;
      $('#gp-indicator').classList.add('hidden');
      prev = [];
    }
    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', () => { /* poll loop below picks it up */ });
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(poll));

  /* ---------------- keyboard: same brain, different fingers ---------------- */

  const SHORTCUTS_HELP =
    '⌨️ 1–6 screens · Q/E or ←→ prev/next · ↑↓ focus · Space/Enter select or play · Esc back · +/− price · ? help';

  function typingIn(el) {
    return el && (el.matches('input[type="text"], textarea, select') || el.isContentEditable);
  }

  document.addEventListener('keydown', ev => {
    if (typingIn(ev.target)) return;
    const appVisible = $('#app') && !$('#app').classList.contains('hidden');
    const k = ev.key;

    // let the browser drive a natively-focused slider with arrows
    if (ev.target.matches && ev.target.matches('input[type="range"]') &&
        (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) return;

    if (k >= '1' && k <= '6' && appVisible) {
      switchTab(TAB_ORDER[+k - 1]);
      focusIdx = -1;
      ev.preventDefault();
    } else if (k === 'q' || k === 'Q' || k === 'ArrowLeft') {
      shiftTab(-1); ev.preventDefault();
    } else if (k === 'e' || k === 'E' || k === 'ArrowRight') {
      shiftTab(1); ev.preventDefault();
    } else if (k === 'ArrowUp') {
      setFocus(-1); ev.preventDefault();
    } else if (k === 'ArrowDown') {
      setFocus(1); ev.preventDefault();
    } else if (k === ' ' || k === 'Enter') {
      // a genuinely tab-focused button should still click natively on Enter
      if (k === 'Enter' && ev.target.matches && ev.target.matches('button')) return;
      pressA(); ev.preventDefault();
    } else if (k === 'Escape') {
      pressB();
    } else if (k === '+' || k === '=') {
      nudgePrice(1); ev.preventDefault();
    } else if (k === '-' || k === '_') {
      nudgePrice(-1); ev.preventDefault();
    } else if (k === '?') {
      toast(SHORTCUTS_HELP);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const kb = $('#kb-indicator');
    if (kb) kb.addEventListener('click', () => toast(SHORTCUTS_HELP));
  });
})();
