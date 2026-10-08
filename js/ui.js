'use strict';
// ---------------------------------------------------------------------------
// Stick Clash — menus, character select, results, touch controls, main loop.
// ---------------------------------------------------------------------------
(() => {
  const app = document.getElementById('app');
  const canvas = document.getElementById('game');
  const game = new Game(canvas);

  const SLOT_TYPES = ['p1', 'p2', 'cpu', 'off'];
  const TYPE_LABEL = { p1: 'Player 1', p2: 'Player 2', cpu: 'CPU', off: 'Empty' };
  const TYPE_HINT = { p1: 'WASD · J K L', p2: 'Arrows · , . /', cpu: 'Computer', off: 'Click to add' };

  const newSlot = (type, char) => ({ type, char, name: '', hat: 'none', acc: 'none' });
  const state = {
    slots: [newSlot('p1', 0), newSlot('cpu', 1), newSlot('off', 2), newSlot('off', 5), newSlot('off', 3), newSlot('off', 6)],
    active: 0, stocks: 3, level: 'normal', stage: 'random', items: true,
  };
  const validHat = (id) => HATS.some((h) => h.id === id), validAcc = (id) => ACCESSORIES.some((a) => a.id === id);
  try {
    const saved = JSON.parse(localStorage.getItem('stickclash.setup') || 'null');
    if (saved && Array.isArray(saved.slots)) {
      // Older saves had 4 slots and no looks; merge whatever is valid onto the defaults.
      saved.slots.slice(0, MAX_FIGHTERS).forEach((o, i) => {
        const d = state.slots[i];
        if (SLOT_TYPES.includes(o.type)) d.type = o.type;
        if (Number.isInteger(o.char) && o.char >= -1 && o.char < CHARS.length) d.char = o.char;
        if (typeof o.name === 'string') d.name = o.name.slice(0, NAME_MAX);
        if (validHat(o.hat)) d.hat = o.hat;
        if (validAcc(o.acc)) d.acc = o.acc;
      });
      for (const k of ['stocks', 'level', 'stage', 'items']) if (k in saved) state[k] = saved[k];
    }
  } catch (e) { /* storage unavailable */ }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lookOf = (s) => ({ hat: s.hat, acc: s.acc });
  const save = () => { try { localStorage.setItem('stickclash.setup', JSON.stringify(state)); } catch (e) { /* ignore */ } };

  let mode = 'menu';
  let lastSetup = null;

  // ------------------------------ Markup -----------------------------------
  const dirGlyph = { n: '•', s: '→', u: '↑', d: '↓' };
  app.insertAdjacentHTML('beforeend', `
  <div id="menu" class="overlay">
    <div class="menu-inner">
      <header class="masthead">
        <h1 class="logo">Stick&nbsp;Clash</h1>
        <p class="tagline">A platform fighter for stick people. Drain their health for a ragdoll K.O., or launch them off the page.</p>
      </header>
      <div class="layout">
        <section class="col" aria-label="Fighters">
          <h2 class="eyebrow">Choose fighters <span class="for">for <b id="forSlot">P1</b></span></h2>
          <div class="roster" id="roster"></div>
          <article class="detail" id="detail"></article>
        </section>
        <section class="col" aria-label="Match setup">
          <h2 class="eyebrow">Lineup</h2>
          <div class="slots" id="slots"></div>
          <h2 class="eyebrow">Rules</h2>
          <div class="opts">
            <div class="opt"><span>Stocks</span><div class="seg" id="optStocks"></div></div>
            <div class="opt"><span>CPU level</span><div class="seg" id="optLevel"></div></div>
            <div class="opt"><span>Stage</span><div class="seg" id="optStage"></div></div>
            <div class="opt"><span>Power-ups</span><div class="seg" id="optItems"></div></div>
          </div>
          <button class="fight" id="fightBtn" type="button">Fight!</button>
          <p class="err" id="err" role="status"></p>
          <details class="controls" open>
            <summary>Controls</summary>
            <div class="tbl-wrap"><table>
              <thead><tr><th>Action</th><th>Player 1</th><th>Player 2</th><th>Gamepad</th></tr></thead>
              <tbody>
                <tr><td>Move</td><td><kbd>A</kbd> <kbd>D</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td><td>Stick / D-pad</td></tr>
                <tr><td>Jump (×2 in air)</td><td><kbd>W</kbd> / <kbd>Space</kbd></td><td><kbd>↑</kbd></td><td>A / Y</td></tr>
                <tr><td>Aim / fast-fall / drop</td><td><kbd>W</kbd> <kbd>S</kbd></td><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>Stick</td></tr>
                <tr><td>Light attack</td><td><kbd>J</kbd></td><td><kbd>,</kbd> / <kbd>Num1</kbd></td><td>X</td></tr>
                <tr><td>Heavy (signature)</td><td><kbd>K</kbd></td><td><kbd>.</kbd> / <kbd>Num2</kbd></td><td>B</td></tr>
                <tr><td>Dodge</td><td><kbd>L</kbd> / <kbd>Shift</kbd></td><td><kbd>/</kbd> / <kbd>Num3</kbd></td><td>Bumpers</td></tr>
              </tbody>
            </table></div>
            <p class="note">Hold a direction while attacking to change the move: neutral, side, up or down, on the ground or in the air. Up + Heavy is your recovery. Grab a bomb power-up, then neutral Light throws it. <kbd>Esc</kbd> pauses, <kbd>M</kbd> mutes.</p>
          </details>
        </section>
      </div>
    </div>
  </div>
  <div id="custom" class="overlay dim" hidden>
    <div class="panel custom-panel" role="dialog" aria-modal="true" aria-labelledby="customTitle">
      <h2 class="panel-title" id="customTitle">Customize</h2>
      <div class="custom-grid">
        <canvas id="customPreview" aria-hidden="true"></canvas>
        <div class="custom-fields">
          <label class="field" for="custName"><span>Name</span>
            <input id="custName" type="text" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false"></label>
          <div class="field"><span>Hat</span><div class="chips" id="hatChips"></div></div>
          <div class="field"><span>Accessory</span><div class="chips" id="accChips"></div></div>
        </div>
      </div>
      <div class="btns">
        <button type="button" class="btn" id="custRandom">Random look</button>
        <button type="button" class="btn primary" id="custDone">Done</button>
      </div>
    </div>
  </div>
  <div id="pause" class="overlay dim" hidden>
    <div class="panel">
      <h2 class="panel-title">Paused</h2>
      <div class="btns">
        <button type="button" class="btn primary" data-act="resume">Resume</button>
        <button type="button" class="btn" data-act="restart">Restart</button>
        <button type="button" class="btn" data-act="quit">Change fighters</button>
      </div>
    </div>
  </div>
  <div id="results" class="overlay dim" hidden>
    <div class="panel">
      <p class="eyebrow">Winner</p>
      <h2 class="panel-title" id="winName"></h2>
      <div class="tbl-wrap"><table class="stats" id="statsTbl"></table></div>
      <div class="btns">
        <button type="button" class="btn primary" data-act="rematch">Rematch</button>
        <button type="button" class="btn" data-act="quit">Change fighters</button>
      </div>
    </div>
  </div>
  <div id="hint" class="hint" hidden>Esc pause · M mute</div>
  <div id="toast" class="toast" hidden></div>
  <div id="touch" hidden>
    <button type="button" class="tpause" id="tpause" aria-label="Pause">II</button>
    <div class="stick" id="stick"><div class="knob" id="knob"></div></div>
    <div class="tbtns">
      <button type="button" data-b="heavy">Heavy</button>
      <button type="button" data-b="light">Light</button>
      <button type="button" data-b="dodge">Dodge</button>
      <button type="button" data-b="jump">Jump</button>
    </div>
  </div>`);

  const $ = (id) => document.getElementById(id);
  const menu = $('menu'), pauseEl = $('pause'), resultsEl = $('results');

  // ------------------------------ Portraits --------------------------------
  const portraits = [];
  function makePortrait(cv, getChar, opts = {}) {
    const p = { cv, ctx: cv.getContext('2d'), getChar, pose: null, opts, t: rand(0, 3) };
    portraits.push(p);
    return p;
  }
  function drawPortraits(dt) {
    if (mode !== 'menu') return;
    for (const p of portraits) {
      const ci = p.getChar();
      const cv = p.cv, w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) continue;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const ctx = p.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      if (ci === -2) continue;
      if (ci === -1 && !p.opts.preview) {
        ctx.fillStyle = INK; ctx.font = `${cv.height * 0.55}px "Permanent Marker", cursive`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cv.width / 2, cv.height / 2);
        continue;
      }
      const ch = CHARS[ci < 0 ? 0 : ci];
      p.t += dt;
      const target = Object.assign({}, BASE_POSE, ch.hold);
      const b = Math.sin(p.t * 2.8);
      target.t += b * 2; target.a1 += b * 3; target.a2 -= b * 3;
      if (p.opts.showoff) {
        const cyc = p.t % 2.4;
        const mv = ch.moves[['nsig', 'ftilt', 'usig', 'dsig'][Math.floor(p.t / 2.4) % 4]];
        if (cyc > 1.0 && cyc < 1.35) Object.assign(target, mv.W);
        else if (cyc >= 1.35 && cyc < 1.8) Object.assign(target, mv.W, mv.S);
        target.rot = 0;
      }
      if (!p.pose || p.char !== ci) { p.pose = Object.assign({}, target); p.char = ci; }
      const k = 1 - Math.exp(-22 * dt);
      for (const key in target) p.pose[key] += (target[key] - p.pose[key]) * k;
      const sc = cv.height / 150;
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      const J = skel((150 * cv.width / cv.height) * 0.42, 138, 1, 1, p.pose);
      const slot = p.opts.slot !== undefined ? state.slots[p.opts.slot] : null;
      drawFigure(ctx, J, ch, INK, slot ? { look: lookOf(slot), accent: PLAYER_COLORS[p.opts.slot] } : {});
    }
  }

  // ------------------------------ Roster -----------------------------------
  const roster = $('roster');
  const cards = [];
  [...CHARS.map((c, i) => i), -1].forEach((ci) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'card'; btn.id = `card-${ci}`;
    const ch = CHARS[ci];
    btn.innerHTML = `<canvas aria-hidden="true"></canvas><span class="badges"></span>
      <span class="nm">${ch ? ch.name : 'RANDOM'}</span><span class="st">${ch ? `${ch.style} · ${ch.weapon === 'fists' ? 'fists' : ch.weapon}` : 'Surprise me'}</span>`;
    btn.style.setProperty('--c', ch ? ch.color : '#15171c');
    btn.addEventListener('click', () => { Sfx.init(); Sfx.play('select'); assignChar(ci); });
    btn.addEventListener('mouseenter', () => renderDetail(ci));
    btn.addEventListener('focus', () => renderDetail(ci));
    btn.addEventListener('mouseleave', () => renderDetail());
    roster.appendChild(btn);
    makePortrait(btn.querySelector('canvas'), () => ci, { showoff: true });
    cards.push({ ci, btn });
  });

  function assignChar(ci) {
    const s = state.slots[state.active];
    if (s.type === 'off') s.type = firstFreeType();
    s.char = ci;
    // Advance to the next filled slot so picking a whole lineup is quick.
    for (let i = 1; i <= MAX_FIGHTERS; i++) {
      const j = (state.active + i) % MAX_FIGHTERS;
      if (state.slots[j].type !== 'off') { if (j > state.active) state.active = j; break; }
    }
    save(); refresh();
  }
  function firstFreeType() {
    for (const t of ['p1', 'p2']) if (!state.slots.some((s) => s.type === t)) return t;
    return 'cpu';
  }

  // ------------------------------ Detail -----------------------------------
  function renderDetail(ci) {
    if (ci === undefined) ci = state.slots[state.active].char;
    const el = $('detail');
    if (ci === -1 || !CHARS[ci]) {
      el.innerHTML = `<h3 class="d-name">Random</h3><p class="d-blurb">A random fighter is drawn when the match starts.</p>`;
      return;
    }
    const ch = CHARS[ci];
    const pips = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    const mv = (k) => (ch.moves[k] || ch.moves[MOVE_FALLBACK[k]] || {}).name || '—';
    el.style.setProperty('--c', ch.color);
    el.innerHTML = `
      <div class="d-head"><h3 class="d-name">${ch.name}</h3><span class="d-style">${ch.style}</span></div>
      <p class="d-blurb">${ch.blurb}</p>
      <div class="d-grid">
        <dl class="d-stats">
          ${['power', 'speed', 'range', 'weight'].map((k) => `<div><dt>${k}</dt><dd class="pips">${pips(ch.stats[k])}</dd></div>`).join('')}
          <div><dt>air jumps</dt><dd>${ch.airJumps}</dd></div>
        </dl>
        <div class="d-moves">
          <h4>Heavy · signatures</h4>
          <ul>${['nsig', 'ssig', 'usig', 'dsig'].map((k) => `<li><b>${dirGlyph[k[0]]}</b>${mv(k)}</li>`).join('')}</ul>
          <h4>Light</h4>
          <ul>${['jab', 'ftilt', 'utilt', 'dtilt'].map((k) => `<li><b>${dirGlyph[k === 'jab' ? 'n' : k === 'ftilt' ? 's' : k[0]]}</b>${mv(k)}</li>`).join('')}
          <li><b>air</b>${[mv('nair'), mv('dair')].join(' · ')}</li></ul>
        </div>
      </div>`;
  }

  // ------------------------------ Slots ------------------------------------
  const slotsEl = $('slots');
  const slotEls = state.slots.map((_, i) => {
    const el = document.createElement('div');
    el.className = 'slot'; el.style.setProperty('--pc', PLAYER_COLORS[i]);
    el.innerHTML = `<button type="button" class="slot-main" id="slot-${i}"><canvas aria-hidden="true"></canvas>
        <span class="slot-txt"><span class="pill"></span><span class="slot-char"></span><span class="slot-hint"></span></span></button>
      <div class="slot-actions">
        <button type="button" class="slot-type" id="slotType-${i}" title="Change who controls this slot"></button>
        <button type="button" class="slot-style" id="slotStyle-${i}" title="Name, hat and accessory">Style</button>
      </div>`;
    el.querySelector('.slot-main').addEventListener('click', () => {
      Sfx.init(); Sfx.play('select');
      if (state.slots[i].type === 'off') state.slots[i].type = firstFreeType();
      state.active = i; save(); refresh();
    });
    el.querySelector('.slot-type').addEventListener('click', () => {
      Sfx.init(); Sfx.play('select');
      const s = state.slots[i];
      let idx = SLOT_TYPES.indexOf(s.type);
      for (let n = 0; n < 4; n++) {
        idx = (idx + 1) % 4;
        const t = SLOT_TYPES[idx];
        if ((t === 'p1' || t === 'p2') && state.slots.some((o, j) => j !== i && o.type === t)) continue;
        break;
      }
      s.type = SLOT_TYPES[idx];
      if (s.type !== 'off') state.active = i;
      else if (state.active === i) state.active = state.slots.findIndex((o) => o.type !== 'off');
      if (state.active < 0) state.active = 0;
      save(); refresh();
    });
    el.querySelector('.slot-style').addEventListener('click', () => {
      Sfx.init(); Sfx.play('select');
      if (state.slots[i].type === 'off') state.slots[i].type = firstFreeType();
      state.active = i; save(); refresh(); openCustom(i);
    });
    slotsEl.appendChild(el);
    makePortrait(el.querySelector('canvas'), () => (state.slots[i].type === 'off' ? -2 : state.slots[i].char), { slot: i });
    return el;
  });

  // ------------------------------ Customize --------------------------------
  const customEl = $('custom');
  let customSlot = 0;
  makePortrait($('customPreview'), () => state.slots[customSlot].char, { showoff: true, preview: true, get slot() { return customSlot; } });
  function chips(id, items, key) {
    const el = $(id);
    el.innerHTML = items.map((it) => `<button type="button" class="chip" data-v="${it.id}">${it.name}</button>`).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      Sfx.play('select');
      state.slots[customSlot][key] = b.dataset.v; save(); syncCustom(); refresh();
    });
  }
  chips('hatChips', HATS, 'hat');
  chips('accChips', ACCESSORIES, 'acc');
  function syncCustom() {
    const s = state.slots[customSlot];
    $('hatChips').querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b.dataset.v === s.hat));
    $('accChips').querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b.dataset.v === s.acc));
  }
  function openCustom(i) {
    customSlot = i;
    const s = state.slots[i];
    $('customTitle').textContent = `Customize ${labelFor(s, i)}`;
    $('customTitle').style.color = PLAYER_COLORS[i];
    $('custName').value = s.name;
    $('custName').placeholder = s.char === -1 ? 'Fighter name' : CHARS[s.char].name;
    syncCustom();
    customEl.hidden = false;
    $('custName').focus({ preventScroll: true });
  }
  function closeCustom() { customEl.hidden = true; $(`slotStyle-${customSlot}`).focus({ preventScroll: true }); }
  $('custName').addEventListener('input', (e) => {
    state.slots[customSlot].name = e.target.value.replace(/\s+/g, ' ').slice(0, NAME_MAX);
    save(); refresh();
  });
  $('custName').addEventListener('change', (e) => {
    state.slots[customSlot].name = state.slots[customSlot].name.trim(); e.target.value = state.slots[customSlot].name; save(); refresh();
  });
  $('custRandom').addEventListener('click', () => {
    const s = state.slots[customSlot];
    s.hat = pick(HATS.slice(1)).id; s.acc = pick(ACCESSORIES).id;
    Sfx.play('select'); save(); syncCustom(); refresh();
  });
  $('custDone').addEventListener('click', () => { Sfx.play('select'); closeCustom(); });
  customEl.addEventListener('click', (e) => { if (e.target === customEl) closeCustom(); });

  // ------------------------------ Options ----------------------------------
  function seg(id, items, get, set) {
    const el = $(id);
    el.innerHTML = items.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      Sfx.init(); Sfx.play('select');
      set(b.dataset.v); save(); refresh();
    });
    return () => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(get())));
  }
  const segs = [
    seg('optStocks', [1, 2, 3, 4, 5].map((n) => [n, n]), () => state.stocks, (v) => (state.stocks = +v)),
    seg('optLevel', Object.entries(CPU_LEVELS).map(([k, v]) => [k, v.name]), () => state.level, (v) => (state.level = v)),
    seg('optStage', [['random', 'Random'], ...STAGES.map((s) => [s.id, s.name])], () => state.stage, (v) => (state.stage = v)),
    seg('optItems', [['true', 'On'], ['false', 'Off']], () => state.items, (v) => (state.items = v === 'true')),
  ];

  function refresh() {
    const act = state.slots[state.active];
    $('forSlot').textContent = act.type === 'cpu' ? `CPU ${state.active + 1}` : act.type === 'p2' ? 'P2' : act.type === 'p1' ? 'P1' : `slot ${state.active + 1}`;
    $('forSlot').style.color = PLAYER_COLORS[state.active];
    for (const { ci, btn } of cards) {
      const who = state.slots.map((s, i) => ({ s, i })).filter(({ s }) => s.type !== 'off' && s.char === ci);
      btn.querySelector('.badges').innerHTML = who.map(({ s, i }) => `<span class="badge" style="background:${PLAYER_COLORS[i]}">${labelFor(s, i)}</span>`).join('');
      btn.classList.toggle('picked', act.char === ci && act.type !== 'off');
      btn.style.setProperty('--pc', PLAYER_COLORS[state.active]);
    }
    state.slots.forEach((s, i) => {
      const el = slotEls[i];
      el.classList.toggle('off', s.type === 'off');
      el.classList.toggle('active', i === state.active && s.type !== 'off');
      el.querySelector('.pill').textContent = s.type === 'off' ? `Slot ${i + 1}` : labelFor(s, i);
      const charName = s.char === -1 ? 'Random' : CHARS[s.char].name;
      el.querySelector('.slot-char').textContent = s.type === 'off' ? 'Empty' : s.name || charName;
      el.querySelector('.slot-hint').textContent = s.type !== 'off' && s.name ? `${charName} · ${TYPE_HINT[s.type]}` : TYPE_HINT[s.type];
      el.querySelector('.slot-style').hidden = s.type === 'off';
      el.querySelector('.slot-type').textContent = s.type === 'off' ? 'Add' : TYPE_LABEL[s.type];
    });
    segs.forEach((f) => f());
    renderDetail();
    $('err').textContent = '';
  }
  const labelFor = (s, i) => (s.type === 'p1' ? 'P1' : s.type === 'p2' ? 'P2' : `CPU${i + 1}`);

  // ------------------------------ Matches ----------------------------------
  function buildSetup() {
    const players = [];
    state.slots.forEach((s, i) => {
      if (s.type === 'off') return;
      players.push({ random: s.char === -1, char: s.char === -1 ? rint(0, CHARS.length - 1) : s.char, ctrl: s.type, level: state.level, color: PLAYER_COLORS[i], label: labelFor(s, i), name: s.name.trim(), look: lookOf(s) });
    });
    const stage = state.stage === 'random' ? pick(STAGES) : STAGES.find((st) => st.id === state.stage);
    return { players, stage, stocks: state.stocks, items: state.items, demo: false };
  }
  function startMatch(setup) {
    Sfx.init(); Sfx.enabled = true;
    lastSetup = setup;
    game.start(setup);
    mode = 'match'; game.paused = false;
    menu.hidden = true; pauseEl.hidden = true; resultsEl.hidden = true;
    $('hint').hidden = isTouch;
    $('touch').hidden = !isTouch;
    canvas.focus({ preventScroll: true });
  }
  function startDemo() {
    const used = new Set();
    const players = [0, 1, 2, 3].map((i) => {
      let c; do { c = rint(0, CHARS.length - 1); } while (used.has(c)); used.add(c);
      const look = { hat: Math.random() < 0.6 ? pick(HATS).id : 'none', acc: Math.random() < 0.5 ? pick(ACCESSORIES).id : 'none' };
      return { char: c, ctrl: 'cpu', level: 'hard', color: PLAYER_COLORS[i], label: `CPU${i + 1}`, look };
    });
    game.start({ players, stage: pick(STAGES), stocks: 2, items: true, demo: true });
    Sfx.enabled = false;
    mode = 'menu'; game.paused = false;
  }
  function toMenu() {
    menu.hidden = false; pauseEl.hidden = true; resultsEl.hidden = true;
    $('hint').hidden = true; $('touch').hidden = true;
    refresh(); startDemo();
  }
  function showResults(g) {
    mode = 'results';
    const w = g.winner;
    $('winName').textContent = w ? w.name : 'Draw';
    $('winName').style.color = w ? w.color : INK;
    const rows = [...g.fighters].sort((a, b) => (b.stocks - a.stocks) || (b.stats.kos - a.stats.kos));
    $('statsTbl').innerHTML = `<thead><tr><th>Player</th><th>Fighter</th><th>K.O.s</th><th>Falls</th><th>Damage</th></tr></thead><tbody>${
      rows.map((f) => `<tr><td><span class="badge" style="background:${f.color}">${f.label}</span> ${esc(f.name)}</td><td>${f.c.name}</td><td>${f.stats.kos}</td><td>${f.stats.falls}</td><td>${Math.round(f.stats.dmg)}</td></tr>`).join('')}</tbody>`;
    resultsEl.hidden = false;
    $('hint').hidden = true; $('touch').hidden = true;
    resultsEl.querySelector('[data-act="rematch"]').focus({ preventScroll: true });
  }
  game.onEnd = (g) => { if (g.opts.demo) startDemo(); else showResults(g); };

  function tryFight() {
    const n = state.slots.filter((s) => s.type !== 'off').length;
    if (n < 2) { $('err').textContent = 'Add at least two fighters to the lineup.'; return; }
    save();
    startMatch(buildSetup());
  }
  $('fightBtn').addEventListener('click', tryFight);

  function setPaused(p) {
    if (mode !== 'match') return;
    game.paused = p; pauseEl.hidden = !p;
    if (p) pauseEl.querySelector('[data-act="resume"]').focus({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    Sfx.play('select');
    const a = b.dataset.act;
    if (a === 'resume') setPaused(false);
    if (a === 'restart' || a === 'rematch') {
      const s = lastSetup;
      startMatch({ ...s, players: s.players.map((p) => (p.random ? { ...p, char: rint(0, CHARS.length - 1) } : p)) });
    }
    if (a === 'quit') toMenu();
  });

  // ------------------------------ Keyboard ---------------------------------
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 1400);
  }
  addEventListener('keydown', (e) => {
    if (!e.repeat) { Input.down[e.code] = true; Input.hit[e.code] = true; }
    if (mode === 'match' && GAME_CODES.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (!customEl.hidden) {
      if (e.code === 'Escape' || (e.code === 'Enter' && e.target.id === 'custName')) { e.preventDefault(); closeCustom(); }
      return;
    }
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyM') { Sfx.init(); Sfx.muted = !Sfx.muted; toast(Sfx.muted ? 'Sound off' : 'Sound on'); }
    if ((e.code === 'Escape' || e.code === 'KeyP') && mode === 'match') { setPaused(!game.paused); e.preventDefault(); }
    else if (e.code === 'Escape' && mode === 'results') toMenu();
    if (e.code === 'Enter' && mode === 'menu' && !(document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement !== $('fightBtn'))) tryFight();
  });
  addEventListener('keyup', (e) => { Input.down[e.code] = false; });
  addEventListener('blur', () => { Input.down = {}; if (mode === 'match') setPaused(true); });

  // ------------------------------ Touch ------------------------------------
  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) {
    Touch.active = true;
    const stick = $('stick'), knob = $('knob');
    let sid = null;
    const setStick = (e) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      Touch.x = dx; Touch.y = dy;
      knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
    };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); setStick(e); Sfx.init(); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e); });
    const end = (e) => { if (e.pointerId !== sid) return; sid = null; Touch.x = 0; Touch.y = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    $('tpause').addEventListener('click', () => setPaused(true));
    document.querySelectorAll('#touch [data-b]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); Touch.hit[b.dataset.b] = true; b.classList.add('down'); });
      const up = () => b.classList.remove('down');
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  }

  // ------------------------------ Main loop --------------------------------
  let last = performance.now(), acc = 0, padStartPrev = false;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!game.paused) {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 4) {
        pollPads();
        game.update();
        clearHits();
        acc -= DT; n++;
      }
      if (n >= 4) acc = 0;
    } else pollPads();
    const p0 = Input.pads[0], startDown = !!(p0 && p0.btn[9]);
    if (startDown && !padStartPrev) {
      if (mode === 'match') setPaused(!game.paused);
      else if (mode === 'menu') tryFight();
      else if (mode === 'results') resultsEl.querySelector('[data-act="rematch"]').click();
    }
    padStartPrev = startDown;
    game.render();
    drawPortraits(dt);
    requestAnimationFrame(frame);
  }

  refresh();
  startDemo();
  requestAnimationFrame(frame);
  window.__stickClash = { game, state, startMatch, buildSetup, toMenu };
})();
