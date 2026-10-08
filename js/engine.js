'use strict';
// ---------------------------------------------------------------------------
// Stick Clash — core engine: utilities, audio, input, skeleton, effects,
// projectiles, ragdolls and the Fighter state machine.
// ---------------------------------------------------------------------------

const VW = 1600, VH = 900;
const GRAV = 2600;
const DT = 1 / 60;
const D2R = Math.PI / 180;
const INK = '#15171c';
const METAL = '#eef1f5';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

// ------------------------------- Audio -------------------------------------
const Sfx = {
  ctx: null, out: null, muted: false, enabled: true, nb: null, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      this.out.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
    } catch (e) { this.ctx = null; }
  },
  noise(dur, f0, f1, vol, q = 1, type = 'bandpass') {
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  play(name, k = 1) {
    if (!this.ctx || this.muted || !this.enabled || name === 'none') return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 35) return;
    this.last[name] = now;
    k = clamp(k, 0.1, 1.5);
    switch (name) {
      case 'swing': this.noise(0.13, 700, 3200, 0.16 * k, 0.8); break;
      case 'slash': this.noise(0.18, 1500, 6000, 0.22 * k, 1.2); this.tone(2400, 1800, 0.12, 0.03, 'sine'); break;
      case 'heavy': this.noise(0.28, 250, 1600, 0.28 * k, 0.7); break;
      case 'hit': this.noise(0.12, 2200, 300, 0.45 * k, 0.6); this.tone(170, 50, 0.14, 0.45 * k); break;
      case 'bighit': this.noise(0.32, 1600, 120, 0.7, 0.5); this.tone(130, 35, 0.35, 0.65); this.tone(65, 30, 0.4, 0.45, 'triangle'); break;
      case 'shot': this.noise(0.08, 4200, 600, 0.35, 0.5); this.tone(900, 120, 0.06, 0.12, 'square'); break;
      case 'shotgun': this.noise(0.24, 2600, 200, 0.6, 0.4); this.tone(120, 40, 0.2, 0.3); break;
      case 'boom': this.noise(0.65, 900, 50, 0.8, 0.4, 'lowpass'); this.tone(90, 28, 0.55, 0.6); break;
      case 'jump': this.tone(300, 540, 0.09, 0.07, 'triangle'); break;
      case 'djump': this.tone(420, 760, 0.1, 0.07, 'triangle'); this.noise(0.12, 2000, 5000, 0.05, 1.2); break;
      case 'land': this.noise(0.07, 420, 150, 0.12, 0.8, 'lowpass'); break;
      case 'dodge': this.noise(0.16, 3000, 7000, 0.08, 1.5, 'highpass'); break;
      case 'power': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.13, 0.11, 'triangle', i * 0.06)); break;
      case 'ko': this.tone(220, 38, 0.9, 0.42, 'sawtooth'); this.noise(0.9, 1300, 70, 0.6, 0.5, 'lowpass'); break;
      case 'thud': this.noise(0.1, 320, 80, 0.3 * k, 0.7, 'lowpass'); break;
      case 'zap': this.noise(0.32, 6000, 700, 0.42, 0.6); this.tone(1400, 180, 0.25, 0.1, 'sawtooth'); break;
      case 'fire': this.noise(0.3, 500, 2400, 0.2, 0.6); break;
      case 'clang': this.tone(1250, 1150, 0.3, 0.14, 'square'); this.tone(1900, 1800, 0.25, 0.08); break;
      case 'tick': this.tone(700, 700, 0.1, 0.12, 'square'); break;
      case 'go': this.tone(520, 1040, 0.3, 0.14, 'square'); break;
      case 'select': this.tone(660, 990, 0.06, 0.07, 'triangle'); break;
      case 'shield': this.tone(500, 1500, 0.18, 0.1); break;
      case 'warp': this.tone(1200, 200, 0.18, 0.08, 'sine'); this.noise(0.15, 5000, 1000, 0.08, 1); break;
    }
  },
};

// ------------------------------- Input -------------------------------------
const Input = { down: {}, hit: {}, pads: [], padPrev: [] };
const KEYMAPS = {
  p1: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], jump: ['Space'], tap: ['KeyW'], light: ['KeyJ'], heavy: ['KeyK'], dodge: ['KeyL', 'ShiftLeft'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['Numpad0'], tap: ['ArrowUp'], light: ['Comma', 'Numpad1'], heavy: ['Period', 'Numpad2'], dodge: ['Slash', 'Numpad3', 'ShiftRight'] },
};
const GAME_CODES = new Set(Object.values(KEYMAPS).flatMap((m) => Object.values(m).flat()));

// Virtual pad used by the on-screen touch controls (player 1).
const Touch = { active: false, x: 0, y: 0, hit: {}, prevDown: false };

function pollPads() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < 4; i++) {
    const gp = gps && gps[i];
    if (!gp) { Input.pads[i] = null; continue; }
    const prev = Input.padPrev[i] || [];
    const btn = gp.buttons.map((b) => b.pressed || b.value > 0.5);
    Input.pads[i] = { x: gp.axes[0] || 0, y: gp.axes[1] || 0, btn, hit: btn.map((b, j) => b && !prev[j]) };
    Input.padPrev[i] = btn;
  }
}
function clearHits() { Input.hit = {}; Touch.hit = {}; }

const blankInput = () => ({ x: 0, up: false, down: false, jumpP: false, tapP: false, lightP: false, heavyP: false, dodgeP: false, downP: false });
const BLANK = Object.freeze(blankInput());

class HumanCtrl {
  constructor(map, pad, touch) { this.map = KEYMAPS[map]; this.pad = pad; this.touch = touch; this.o = blankInput(); this.prevDown = false; }
  read() {
    const m = this.map, o = this.o, d = Input.down, h = Input.hit;
    const any = (arr, src) => arr.some((c) => src[c]);
    let x = (any(m.right, d) ? 1 : 0) - (any(m.left, d) ? 1 : 0);
    let up = any(m.up, d), down = any(m.down, d);
    o.jumpP = any(m.jump, h); o.tapP = any(m.tap, h); o.lightP = any(m.light, h);
    o.heavyP = any(m.heavy, h); o.dodgeP = any(m.dodge, h); o.downP = any(m.down, h);
    const p = Input.pads[this.pad];
    if (p) {
      if (Math.abs(p.x) > 0.35) x = p.x;
      if (p.btn[14]) x = -1; if (p.btn[15]) x = 1;
      if (p.y < -0.55 || p.btn[12]) up = true;
      if (p.y > 0.55 || p.btn[13]) down = true;
      if (p.hit[0] || p.hit[3]) o.jumpP = true;
      if (p.hit[2]) o.lightP = true;
      if (p.hit[1]) o.heavyP = true;
      if (p.hit[4] || p.hit[5] || p.hit[6] || p.hit[7]) o.dodgeP = true;
    }
    if (this.touch && Touch.active) {
      if (Math.abs(Touch.x) > 0.3) x = Touch.x;
      if (Touch.y < -0.55) up = true;
      if (Touch.y > 0.55) down = true;
      if (Touch.hit.jump) o.jumpP = true;
      if (Touch.hit.light) o.lightP = true;
      if (Touch.hit.heavy) o.heavyP = true;
      if (Touch.hit.dodge) o.dodgeP = true;
    }
    if (down && !this.prevDown) o.downP = true;
    this.prevDown = down;
    o.x = clamp(x, -1, 1); o.up = up; o.down = down;
    return o;
  }
}

// ------------------------------ Skeleton -----------------------------------
// Forward kinematics: turns a pose into joint positions in world space.
function skel(x, y, facing, s, p) {
  const fc = facing;
  const dir = (a, len) => [Math.sin(a * D2R) * len * fc, Math.cos(a * D2R) * len];
  const t1 = dir(p.l1, LIMB.th * s), s1 = dir(p.s1, LIMB.sh * s);
  const t2 = dir(p.l2, LIMB.th * s), s2 = dir(p.s2, LIMB.sh * s);
  const drop = Math.max(t1[1] + s1[1], t2[1] + s2[1], 16 * s);
  const hip = [x, y - drop + p.hy * s];
  const tv = dir(180 - p.t, LIMB.to * s);
  const neck = [hip[0] + tv[0], hip[1] + tv[1]];
  const hv = dir(180 - (p.t + p.h), (LIMB.nk + LIMB.hr) * s);
  const head = [neck[0] + hv[0], neck[1] + hv[1]];
  const sv = dir(180 - p.t, -3 * s);
  const sh = [neck[0] + sv[0], neck[1] + sv[1]];
  const u1 = dir(p.a1, LIMB.ua * s), w1 = dir(p.f1, LIMB.fa * s);
  const u2 = dir(p.a2, LIMB.ua * s), w2 = dir(p.f2, LIMB.fa * s);
  const J = {
    hip, neck, head, sh,
    chest: [(hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2],
    e1: [sh[0] + u1[0], sh[1] + u1[1]], e2: [sh[0] + u2[0], sh[1] + u2[1]],
    k1: [hip[0] + t1[0], hip[1] + t1[1]], k2: [hip[0] + t2[0], hip[1] + t2[1]],
    wa: p.f1 + p.w, wa2: p.f2 + p.w, fc, s,
  };
  J.h1 = [J.e1[0] + w1[0], J.e1[1] + w1[1]];
  J.h2 = [J.e2[0] + w2[0], J.e2[1] + w2[1]];
  J.f1 = [J.k1[0] + s1[0], J.k1[1] + s1[1]];
  J.f2 = [J.k2[0] + s2[0], J.k2[1] + s2[1]];
  if (p.rot) {
    const th = p.rot * fc * D2R, c = Math.cos(th), sn = Math.sin(th);
    const cx = J.chest[0], cy = J.chest[1];
    for (const k of ['hip', 'neck', 'head', 'sh', 'chest', 'e1', 'e2', 'k1', 'k2', 'h1', 'h2', 'f1', 'f2']) {
      const q = J[k], dx = q[0] - cx, dy = q[1] - cy;
      J[k] = [cx + dx * c - dy * sn, cy + dx * sn + dy * c];
    }
    J.wa -= p.rot; J.wa2 -= p.rot;
  }
  return J;
}

function line(ctx, ...pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// Draw a weapon gripped at (hx,hy) pointing along angle `ang` (pose convention).
function drawWeapon(ctx, type, hx, hy, ang, fc, s, accent) {
  if (!type || type === 'fists') return;
  const ux = Math.sin(ang * D2R) * fc, uy = Math.cos(ang * D2R);
  const nx = -uy, ny = ux;
  const P = (a, b = 0) => [hx + ux * a * s + nx * b * s, hy + uy * a * s + ny * b * s];
  const poly = (pts, fill, lw = 1.8) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw * s; ctx.strokeStyle = INK; ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (type) {
    case 'katana': {
      ctx.strokeStyle = INK; ctx.lineWidth = 5.5 * s; line(ctx, P(-10), P(6));
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6 * s; line(ctx, P(-8), P(4));
      ctx.strokeStyle = INK; ctx.lineWidth = 4 * s; line(ctx, P(7, -6), P(7, 6));
      poly([P(8, -2.8), P(34, -3.2), P(54, -1.6), P(61, 2.2), P(52, 2.6), P(30, 2.4), P(8, 2.6)], METAL);
      break;
    }
    case 'hammer': {
      ctx.strokeStyle = INK; ctx.lineWidth = 6 * s; line(ctx, P(-14), P(50));
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5 * s; line(ctx, P(-10), P(-2));
      poly([P(44, -18), P(68, -18), P(68, 18), P(44, 18)], '#2b2f3a', 2.4);
      ctx.strokeStyle = accent; ctx.lineWidth = 4.5 * s; line(ctx, P(50, -18), P(50, 18));
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2 * s; line(ctx, P(64, -14), P(64, 14));
      break;
    }
    case 'spear': {
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5 * s; line(ctx, P(-42), P(64));
      poly([P(62, -5.5), P(90, 0), P(62, 5.5)], METAL);
      ctx.strokeStyle = accent; ctx.lineWidth = 3 * s; line(ctx, P(60, 0), P(52, 7), P(44, 9));
      line(ctx, P(60, 0), P(53, -6), P(46, -8));
      break;
    }
    case 'daggers': {
      ctx.strokeStyle = INK; ctx.lineWidth = 5 * s; line(ctx, P(-6), P(4));
      ctx.lineWidth = 3.5 * s; line(ctx, P(4, -4.5), P(4, 4.5));
      poly([P(5, -3), P(27, 0), P(5, 3)], METAL);
      ctx.strokeStyle = accent; ctx.lineWidth = 2 * s; line(ctx, P(-5), P(1));
      break;
    }
    case 'pistol': {
      const Q = (a, b) => P(a, b * fc);
      ctx.strokeStyle = INK; ctx.lineWidth = 6 * s; line(ctx, P(-2), P(25));
      ctx.lineWidth = 5.5 * s; line(ctx, Q(-1, 0), Q(-5, 11));
      ctx.fillStyle = accent; ctx.beginPath(); const c = P(7); ctx.arc(c[0], c[1], 4.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.6 * s; ctx.strokeStyle = INK; ctx.stroke();
      break;
    }
    case 'staff': {
      ctx.strokeStyle = INK; ctx.lineWidth = 5 * s; line(ctx, P(-46), P(44));
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5 * s; line(ctx, P(38, -6), P(46), P(38, 6));
      const o = P(52);
      ctx.fillStyle = accent; ctx.globalAlpha *= 0.3;
      ctx.beginPath(); ctx.arc(o[0], o[1], 15 * s, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha /= 0.3;
      ctx.beginPath(); ctx.arc(o[0], o[1], 8.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2 * s; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(o[0] - 2.5 * s, o[1] - 2.5 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
}

// Draws the stick figure itself, plus its weapon(s).
function drawFigure(ctx, J, ch, col, opts = {}) {
  const s = J.s;
  drawLookBack(ctx, J, opts.look, opts.cape, ch.color);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ch.weapon === 'daggers') drawWeapon(ctx, 'daggers', J.h2[0], J.h2[1], J.wa2, J.fc, s, ch.color);
  if (opts.bomb) {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(J.h2[0], J.h2[1] + 6 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = col; ctx.lineWidth = 7 * s;
  line(ctx, J.sh, J.e2, J.h2);
  line(ctx, J.hip, J.k2, J.f2);
  line(ctx, J.hip, J.neck);
  line(ctx, J.hip, J.k1, J.f1);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(J.head[0], J.head[1], LIMB.hr * s, 0, Math.PI * 2); ctx.fill();
  if (ch.weapon === 'fists') {
    ctx.strokeStyle = ch.color; ctx.lineWidth = 9 * s;
    line(ctx, J.h2, J.h2);
  }
  ctx.strokeStyle = col; ctx.lineWidth = 7 * s;
  line(ctx, J.sh, J.e1, J.h1);
  if (ch.weapon === 'fists') { ctx.strokeStyle = ch.color; ctx.lineWidth = 9 * s; line(ctx, J.h1, J.h1); }
  else drawWeapon(ctx, ch.weapon, J.h1[0], J.h1[1], J.wa, J.fc, s, ch.color);
  drawLookFront(ctx, J, opts.look, opts.accent || ch.color);
}


// ----------------------------- Cosmetics -----------------------------------
// Hats and face accessories are drawn in a head-local frame: origin at the
// head's centre, +x toward the facing direction, -y along the neck→head axis,
// units in unscaled pixels (head radius 11).
function inFrame(ctx, ox, oy, bx, by, fc, s, fn) {
  const ux = ox - bx, uy = oy - by;
  ctx.save();
  ctx.translate(ox, oy); ctx.rotate(Math.atan2(ux, -uy)); ctx.scale(fc * s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  fn();
  ctx.restore();
}
function cosPoly(ctx, pts, fill, lw = 2) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
}
function drawHat(ctx, id, col) {
  switch (id) {
    case 'tophat':
      cosPoly(ctx, [[-17, -7], [17, -7], [16, -12], [-16, -12]], '#262a33');
      cosPoly(ctx, [[-9, -11], [9, -11], [10, -34], [-10, -34]], '#262a33');
      ctx.fillStyle = col; ctx.fillRect(-9, -17, 18.5, 4.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; line(ctx, [6, -20], [6.5, -31]);
      break;
    case 'cap':
      ctx.beginPath(); ctx.arc(0, -3, 12.5, Math.PI, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      cosPoly(ctx, [[5, -5], [24, -3.5], [23, 0], [5, -1]], col);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(6, -2.5, 16, 2);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -15.5, 2.2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cowboy':
      ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(0, -1, 22, -6); ctx.quadraticCurveTo(23, -12, 17, -10.5);
      ctx.lineTo(-17, -10.5); ctx.quadraticCurveTo(-23, -12, -22, -6); ctx.closePath();
      ctx.fillStyle = '#a0703f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      cosPoly(ctx, [[-10, -10], [10, -10], [9, -25], [3, -21], [0, -24], [-3, -21], [-9, -25]], '#a0703f');
      ctx.fillStyle = col; ctx.fillRect(-9.5, -14.5, 19, 3.5);
      break;
    case 'crown':
      cosPoly(ctx, [[-11, -7], [11, -7], [13, -25], [6, -15], [0, -28], [-6, -15], [-13, -25]], '#f2c14e');
      ctx.fillStyle = col;
      for (const [x, y] of [[0, -11], [-7, -10], [7, -10]]) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'viking':
      cosPoly(ctx, [[-11, -8], [-20, -13], [-25, -27], [-17, -17], [-9, -12]], '#f4ecd8');
      cosPoly(ctx, [[11, -8], [20, -13], [25, -27], [17, -17], [9, -12]], '#f4ecd8');
      ctx.beginPath(); ctx.arc(0, -3, 13, Math.PI, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#9aa3b2'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(-13, -6.5, 26, 4); ctx.strokeRect(-13, -6.5, 26, 4);
      break;
    case 'party':
      cosPoly(ctx, [[-10, -7], [10, -7], [1, -37]], col);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5;
      line(ctx, [-6, -11], [6, -16]); line(ctx, [-3, -21], [4, -25]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1, -38, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
      break;
    case 'wizard':
      ctx.beginPath(); ctx.ellipse(0, -8, 19, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3b2e7e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      cosPoly(ctx, [[-10, -9], [10, -9], [-3, -31], [-15, -42]], '#3b2e7e');
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 4, a = (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(-1 + Math.cos(a) * r, -19 + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      break;
    case 'headband':
      ctx.strokeStyle = col; ctx.lineWidth = 4.5;
      line(ctx, [-11, -4], [11, -6]);
      ctx.lineWidth = 3; line(ctx, [-10, -4], [-19, -1], [-25, 5]); line(ctx, [-10, -4], [-21, -7], [-27, -4]);
      break;
    case 'halo':
      ctx.strokeStyle = 'rgba(242,193,78,0.35)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(0, -25, 13, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; ctx.stroke();
      break;
  }
}
function drawFaceAcc(ctx, id) {
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff';
  switch (id) {
    case 'shades':
      line(ctx, [-10, -3], [1, -3]);
      ctx.fillStyle = '#1d2433'; ctx.beginPath(); ctx.roundRect(1, -6, 13, 6.5, 2.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; line(ctx, [4, -4.5], [6.5, -2]);
      break;
    case 'mustache':
      ctx.fillStyle = '#7a4a24';
      ctx.beginPath(); ctx.moveTo(4, 4); ctx.quadraticCurveTo(10, -0.5, 13, 3); ctx.quadraticCurveTo(17, 0, 19, 4);
      ctx.quadraticCurveTo(20, 8, 16, 6.5); ctx.quadraticCurveTo(12, 7, 9, 6); ctx.quadraticCurveTo(6, 7.5, 4, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    case 'beard':
      ctx.fillStyle = '#7a4a24';
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.quadraticCurveTo(-2, 22, 10, 18); ctx.quadraticCurveTo(16, 14, 13, 3);
      ctx.quadraticCurveTo(6, 8, -6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'eyepatch':
      line(ctx, [-11, -8], [4, -3.5]);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(7, -2, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'monocle':
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(7, -2, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1; line(ctx, [7, 2.5], [4, 8], [1, 14]);
      break;
  }
}
function drawBowtie(ctx, col) {
  cosPoly(ctx, [[0, 0], [-8, -5], [-8, 5]], col, 1.8);
  cosPoly(ctx, [[0, 0], [8, -5], [8, 5]], col, 1.8);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
}
// Draws the cape along a rope's points, or a resting pose when there's no rope.
function drawCape(ctx, pts, col, s) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, c] of [[19, INK], [14, col]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w * s;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
}
// Everything a look draws behind the body (the cape).
function drawLookBack(ctx, J, look, cape, col) {
  if (!look || look.acc !== 'cape') return;
  const s = J.s;
  const pts = cape && cape.p.length > 1 ? cape.p.map((q) => [q.x, q.y])
    : [J.sh, [J.sh[0] - J.fc * 9 * s, J.sh[1] + 22 * s], [J.sh[0] - J.fc * 15 * s, J.sh[1] + 50 * s]];
  drawCape(ctx, pts, col, s);
}
// Everything a look draws over the body: bow tie, face accessory, hat.
function drawLookFront(ctx, J, look, col, noHat) {
  if (!look) return;
  const s = J.s, fc = J.fc;
  if (look.acc === 'bowtie') inFrame(ctx, J.neck[0], J.neck[1], J.chest[0], J.chest[1], fc, s, () => drawBowtie(ctx, col));
  inFrame(ctx, J.head[0], J.head[1], J.neck[0], J.neck[1], fc, s, () => {
    drawFaceAcc(ctx, look.acc);
    if (!noHat) drawHat(ctx, look.hat, col);
  });
}

// ------------------------------ Scarf --------------------------------------
// A short verlet rope tied to the neck: cheap secondary motion that sells speed.
class Scarf {
  constructor() { this.p = []; }
  reset(x, y) { this.p = Array.from({ length: 7 }, () => ({ x, y, px: x, py: y })); }
  update(ax, ay, dt, wind, s, segLen = 6.5) {
    if (!this.p.length) this.reset(ax, ay);
    const p = this.p, k = dt * 60;
    p[0].x = ax; p[0].y = ay; p[0].px = ax; p[0].py = ay;
    for (let i = 1; i < p.length; i++) {
      const q = p[i];
      const vx = (q.x - q.px) * 0.9, vy = (q.y - q.py) * 0.9;
      q.px = q.x; q.py = q.y;
      q.x += vx * k + wind * dt * dt * 60; q.y += vy * k + 700 * dt * dt;
    }
    const seg = segLen * s;
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const diff = (d - seg) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
  }
  draw(ctx, col, s) {
    if (this.p.length < 2) return;
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(this.p[0].x, this.p[0].y);
    for (let i = 1; i < this.p.length; i++) ctx.lineTo(this.p[i].x, this.p[i].y);
    ctx.stroke();
    ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(this.p[1].x, this.p[1].y);
    for (let i = 2; i < this.p.length - 1; i++) ctx.lineTo(this.p[i].x + 3 * s, this.p[i].y + 4 * s);
    ctx.stroke();
  }
}

// ------------------------------ Effects ------------------------------------
class FX {
  constructor() { this.list = []; }
  add(p) {
    if (this.list.length > 1200) return p;
    p.max = p.life; p.vx = p.vx || 0; p.vy = p.vy || 0; p.rot = p.rot || 0;
    this.list.push(p); return p;
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.drag) { const d = Math.pow(1 - p.drag, dt * 60); p.vx *= d; p.vy *= d; }
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += (p.vr || 0) * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  sparks(x, y, n, color, speed = 700, ang = null, spread = Math.PI * 2, w = 3) {
    for (let i = 0; i < n; i++) {
      const a = ang === null ? rand(0, Math.PI * 2) : ang + rand(-spread / 2, spread / 2);
      const v = rand(speed * 0.4, speed);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.15, 0.32), color, w, drag: 0.1, grav: 600 });
    }
  }
  dust(x, y, n, spread = 1, color = 'rgba(21,23,28,0.14)') {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'dust', x: x + rand(-8, 8), y: y - rand(0, 6), vx: rand(-160, 160) * spread, vy: rand(-90, -10), life: rand(0.3, 0.55), r: rand(5, 10), grow: rand(10, 22), color, drag: 0.08 });
    }
  }
  ring(x, y, r0, r1, color, life = 0.3, w = 6) { this.add({ type: 'ring', x, y, r0, r1, color, life, w }); }
  star(x, y, size, color, life = 0.14) { this.add({ type: 'star', x, y, size, color, life, rot: rand(0, Math.PI) }); }
  ink(x, y, n, vx = 0, vy = 0, sp = 500) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'ink', x, y, vx: vx * rand(0.2, 0.7) + rand(-sp, sp), vy: vy * rand(0.2, 0.7) + rand(-sp, sp * 0.5), life: rand(0.4, 0.9), r: rand(2, 7), grav: 1600, drag: 0.02 });
    }
  }
  text(x, y, str, color, size = 30) { this.add({ type: 'text', x, y, vy: -120, life: 0.85, str, color, size, drag: 0.06 }); }
  smoke(x, y, n, spread = 120) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'smoke', x: x + rand(-20, 20), y: y + rand(-30, 10), vx: rand(-spread, spread), vy: rand(-spread, spread * 0.3), life: rand(0.6, 1.2), r: rand(14, 26), grow: rand(20, 40), drag: 0.06 });
    }
  }
  fire(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'fire', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-60, 60), vy: rand(-140, -20), life: rand(0.2, 0.45), r: rand(4, 9), drag: 0.05 });
    }
  }
  rocks(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'rock', x: x + rand(-14, 14), y, vx: rand(-120, 120), vy: rand(-650, -300), life: rand(0.4, 0.7), r: rand(4, 9), grav: 2200, rot: rand(0, 6), vr: rand(-10, 10) });
    }
  }
  ghost(J, ch, color, life = 0.25) { this.add({ type: 'ghost', x: 0, y: 0, J, ch, color, life }); }
  draw(ctx) {
    for (const p of this.list) {
      const a = clamp(p.life / p.max, 0, 1);
      switch (p.type) {
        case 'spark': {
          ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.w * (0.5 + a); ctx.lineCap = 'round';
          line(ctx, [p.x, p.y], [p.x - p.vx * 0.035, p.y - p.vy * 0.035]);
          break;
        }
        case 'dust': {
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - a) * p.grow, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'ring': {
          const e = easeOut(1 - a);
          ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.w * a + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r0, p.r1, e), 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'star': {
          const sz = p.size * (0.6 + 0.6 * (1 - a));
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const r = i % 2 ? sz * 0.38 : sz;
            const an = p.rot + (i / 16) * Math.PI * 2;
            ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r);
          }
          ctx.closePath(); ctx.fillStyle = p.color; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.28, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'ink': {
          ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = INK;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'text': {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.font = `${p.size}px "Permanent Marker", "Comic Sans MS", cursive`;
          ctx.textAlign = 'center'; ctx.lineJoin = 'round';
          ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(p.str, p.x, p.y);
          ctx.fillStyle = p.color; ctx.fillText(p.str, p.x, p.y);
          break;
        }
        case 'smoke': {
          ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#6b6f7c';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - a) * p.grow, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'fire': {
          ctx.globalAlpha = a; ctx.fillStyle = a > 0.6 ? '#ffd166' : a > 0.3 ? '#ff8c1a' : '#d6402a';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'rock': {
          ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = '#4a4f5c'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.moveTo(-p.r, p.r * 0.6); ctx.lineTo(0, -p.r); ctx.lineTo(p.r, p.r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'ghost': {
          ctx.globalAlpha = a * 0.35;
          drawFigure(ctx, p.J, p.ch, p.color);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------- Projectiles ----------------------------------
class Proj {
  constructor(g, owner, spec, x, y, vx, vy) {
    this.g = g; this.owner = owner; this.spec = spec; this.type = spec.type;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    const sc = owner ? owner.scale : 1;
    this.r = (spec.r || 10) * sc; this.life = spec.life || 60; this.t = 0;
    this.hit = new Set(); this.dead = false; this.rot = 0; this.grav = spec.grav || 0;
    this.radial = ['blast', 'shock', 'quake', 'lightning'].includes(this.type);
    if (this.type === 'lightning') {
      const gy = g.groundBelow(this.x, (owner ? owner.y : y) - 60);
      this.gy = gy ? gy.y : (owner ? owner.y : y) + 260;
      this.top = this.gy - 560;
      this.delay = spec.delay || 12;
    }
  }
  get active() { return this.type !== 'lightning' || this.t > this.delay; }
  update() {
    const g = this.g;
    this.t++;
    switch (this.type) {
      case 'bullet': case 'pellet': case 'shuriken': case 'fireball': case 'javelin': {
        this.vy += this.grav * DT;
        this.x += this.vx * DT; this.y += this.vy * DT;
        this.rot += DT * 30;
        if (this.type === 'fireball' && this.t % 2 === 0) g.fx.fire(this.x, this.y, 2);
        if (g.solidAt(this.x, this.y)) {
          g.fx.sparks(this.x, this.y, 6, this.type === 'fireball' ? '#ff8c1a' : '#ffd23f', 400);
          this.dead = true;
        }
        break;
      }
      case 'bomb': {
        this.vy += this.grav * DT;
        const px = this.x, py = this.y;
        this.x += this.vx * DT; this.y += this.vy * DT;
        this.rot += this.vx * DT * 0.05;
        for (const p of g.stage.plats) {
          if (this.x > p.x && this.x < p.x + p.w) {
            if (this.vy > 0 && py + this.r <= p.y + 2 && this.y + this.r >= p.y) {
              this.y = p.y - this.r; this.vy *= -0.45; this.vx *= 0.75;
              if (Math.abs(this.vy) < 80) this.vy = 0;
            } else if (p.solid && this.y > p.y && this.y < p.y + p.h) {
              this.x = px; this.vx *= -0.5;
            }
          }
        }
        if (this.t % 3 === 0) g.fx.sparks(this.x, this.y - this.r, 1, '#ffb703', 150, -Math.PI / 2, 1, 2);
        break;
      }
      case 'quake': {
        this.x += this.vx * DT;
        const gp = g.groundBelow(this.x, this.y - 10);
        if (!gp || Math.abs(gp.y - this.y) > 6) { this.dead = true; break; }
        if (this.t % 2 === 0) g.fx.rocks(this.x, this.y, 2);
        break;
      }
      case 'lightning': {
        if (this.t === this.delay + 1) {
          Sfx.play('zap'); g.shake = Math.max(g.shake, 10); g.flashA = Math.max(g.flashA, 0.25);
          g.fx.sparks(this.x, this.gy, 18, '#7fe3ff', 800, -Math.PI / 2, Math.PI);
          g.fx.ring(this.x, this.gy, 10, 90, '#7fe3ff', 0.35, 8);
        }
        break;
      }
    }
    if (--this.life <= 0) {
      if (this.type === 'bomb') this.explode();
      this.dead = true;
    }
    const b = g.stage.blast;
    if (this.x < b.l - 200 || this.x > b.r + 200 || this.y > b.b + 200 || this.y < b.t - 400) this.dead = true;
  }
  explode() {
    const s = this.spec, g = this.g;
    if (this.exploded) return;
    this.exploded = true; this.dead = true;
    g.addProj(new Proj(g, this.owner, { type: 'blast', dmg: s.dmg, ang: s.ang, kb: s.kb, ks: s.ks, r: s.blastR || 90, life: 6 }, this.x, this.y, 0, 0));
    g.boomFx(this.x, this.y, s.blastR || 90);
  }
  // Returns the contact point with fighter f, or null.
  hitTest(f) {
    if (!this.active) return null;
    const H = f.hurt();
    if (this.type === 'lightning') {
      if (this.t > this.delay + 10) return null;
      for (const h of H) if (Math.abs(h[0] - this.x) < this.r + h[2] && h[1] > this.top && h[1] < this.gy + 10) return [this.x, h[1]];
      return null;
    }
    if (this.type === 'seg') {
      for (const h of H) {
        const dx = this.x2 - this.x, dy = this.y2 - this.y, L2 = dx * dx + dy * dy || 1;
        const t = clamp(((h[0] - this.x) * dx + (h[1] - this.y) * dy) / L2, 0, 1);
        const cx = this.x + dx * t, cy = this.y + dy * t;
        if (Math.hypot(h[0] - cx, h[1] - cy) < this.r + h[2]) return [cx, cy];
      }
      return null;
    }
    if ((this.type === 'blast' || this.type === 'shock') && this.t > 3) return null;
    for (const h of H) {
      if (Math.hypot(h[0] - this.x, h[1] - this.y) < this.r + h[2]) return [(h[0] + this.x) / 2, (h[1] + this.y) / 2];
    }
    return null;
  }
  dirX(f) { return this.radial ? (Math.sign(f.x - this.x) || 1) : (Math.sign(this.vx) || (this.owner ? this.owner.facing : 1)); }
  onHit() {
    if (['bullet', 'pellet', 'shuriken', 'fireball', 'javelin'].includes(this.type)) this.dead = true;
    if (this.type === 'fireball') { this.g.fx.ring(this.x, this.y, 8, 50, '#ff8c1a', 0.25, 6); this.g.fx.fire(this.x, this.y, 12); }
    if (this.type === 'bomb') this.explode();
  }
  draw(ctx) {
    const sp = Math.hypot(this.vx, this.vy) || 1;
    switch (this.type) {
      case 'bullet': case 'pellet': {
        const k = this.type === 'bullet' ? 0.03 : 0.02;
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = 6; line(ctx, [this.x - this.vx * k, this.y - this.vy * k], [this.x, this.y]);
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; line(ctx, [this.x - this.vx * k * 0.8, this.y - this.vy * k * 0.8], [this.x, this.y]);
        break;
      }
      case 'shuriken': {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? 3.5 : this.r; const a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
        ctx.fillStyle = this.owner ? this.owner.c.color : '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }
      case 'fireball': {
        const r = this.r * (1 + Math.sin(this.t * 0.6) * 0.08);
        ctx.fillStyle = 'rgba(255,140,26,0.25)'; ctx.beginPath(); ctx.arc(this.x, this.y, r * 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6b1a'; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(this.x + Math.sign(this.vx) * 3, this.y - 2, r * 0.55, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'javelin': {
        const ang = Math.atan2(this.vx, this.vy) / D2R;
        drawWeapon(ctx, 'spear', this.x, this.y, ang, 1, 1, this.owner ? this.owner.c.color : '#2a9d8f');
        ctx.strokeStyle = 'rgba(21,23,28,0.3)'; ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) line(ctx, [this.x - this.vx * 0.05, this.y - this.vy * 0.05 + i * 8], [this.x - this.vx * 0.09, this.y - this.vy * 0.09 + i * 8]);
        break;
      }
      case 'bomb': {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-this.r * 0.35, -this.r * 0.35, this.r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; line(ctx, [0, -this.r], [4, -this.r - 7]);
        ctx.restore();
        if (this.life < 30 && Math.floor(this.t / 3) % 2) { ctx.fillStyle = 'rgba(230,57,70,0.5)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 4, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'lightning': {
        const col = this.owner ? this.owner.c.color : '#7fe3ff';
        if (this.t <= this.delay) {
          const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.9);
          ctx.globalAlpha = 0.35 + pulse * 0.4;
          ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
          line(ctx, [this.x, this.top + 200], [this.x, this.gy]); ctx.setLineDash([]);
          ctx.beginPath(); ctx.ellipse(this.x, this.gy, this.r * (1.2 - pulse * 0.3), 8, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (this.t <= this.delay + 14) {
          const pts = [[this.x, this.top]];
          const n = 10;
          for (let i = 1; i < n; i++) pts.push([this.x + rand(-22, 22), lerp(this.top, this.gy, i / n)]);
          pts.push([this.x, this.gy]);
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.strokeStyle = INK; ctx.lineWidth = 13; line(ctx, ...pts);
          ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 8; line(ctx, ...pts);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; line(ctx, ...pts);
        }
        break;
      }
      case 'blast': case 'shock': {
        const a = clamp(1 - this.t / 8, 0, 1);
        ctx.globalAlpha = a * 0.5; ctx.fillStyle = this.type === 'blast' ? '#ffb703' : 'rgba(21,23,28,0.35)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * (0.6 + 0.4 * (1 - a)), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
}

// ------------------------------ Ragdoll ------------------------------------
// Position-based ragdoll with an "active" phase: for the first moments after a
// KO the body tries to protect itself (windmilling in the air, bracing and
// curling up on impact) before going limp — a lightweight take on Euphoria.
const RAG_LINES = [[1, 6, 7], [3, 10, 11], [3, 2, 1], [3, 8, 9], [1, 4, 5]];

class Ragdoll {
  constructor(g, f, vx, vy, hx, hy) {
    this.g = g; this.age = 0; this.char = f.c; this.color = f.color; this.s = f.scale; this.fc = f.facing;
    this.scarf = f.scarf; f.scarf = new Scarf();
    this.look = f.look; this.accent = f.color;
    this.cape = f.cape; if (f.cape) f.cape = new Scarf();
    const J = f.J, s = this.s;
    const src = [J.head, J.neck, J.chest, J.hip, J.e1, J.h1, J.e2, J.h2, J.k1, J.f1, J.k2, J.f2];
    this.p = src.map((q, i) => ({ x: q[0], y: q[1], ox: q[0], oy: q[1], vx: 0, vy: 0, r: (i === 0 ? LIMB.hr : 3.5) * s, c: false }));
    const cx = J.chest[0], cy = J.chest[1];
    const spin = rand(-5, 5) + Math.sign(vx || 1) * 4;
    for (const p of this.p) {
      const dx = p.x - cx, dy = p.y - cy;
      p.vx = vx - dy * spin * 0.5 + rand(-50, 50);
      p.vy = vy + dx * spin * 0.5 + rand(-50, 50);
      const k = Math.max(0, 1 - Math.hypot(p.x - hx, p.y - hy) / 70) * 0.6;
      p.vx += vx * k; p.vy += vy * k;
    }
    const L = LIMB;
    this.cons = [[0, 1, (L.nk + L.hr) * s], [1, 2, (L.to / 2) * s], [2, 3, (L.to / 2) * s], [1, 4, L.ua * s], [4, 5, L.fa * s],
      [1, 6, L.ua * s], [6, 7, L.fa * s], [3, 8, L.th * s], [8, 9, L.sh * s], [3, 10, L.th * s], [10, 11, L.sh * s]];
    const hn = L.nk + L.hr + L.to / 2;
    // [i, j, min, max, stiffness] — loose joint limits.
    this.soft = [[0, 2, hn * 0.82 * s, hn * s, 0.5], [1, 3, L.to * 0.78 * s, L.to * s, 0.6], [0, 3, 34 * s, 999, 0.6],
      [5, 1, 12 * s, 999, 0.5], [7, 1, 12 * s, 999, 0.5], [9, 3, 15 * s, 999, 0.5], [11, 3, 15 * s, 999, 0.5], [8, 10, 6 * s, 999, 0.3]];
    this.touchT = -9; this.firstTouch = -1; this.lastThud = -1; this.off = rand(0, 6);
    // Dropped weapons become their own two-point rigid sticks.
    // The hat pops off and tumbles on its own.
    if (f.look.hat !== 'none') {
      const h = f.J.head;
      this.hat = { x: h[0], y: h[1] - 8 * s, ox: h[0], oy: h[1], r: 6 * s, vx: vx * 0.7 + rand(-150, 150), vy: Math.min(vy, 0) * 0.7 - rand(350, 550), rot: 0, vr: rand(-14, 14) };
    }
    this.weps = [];
    const W = WEAPONS[f.c.weapon] || (f.c.weapon === 'pistol' ? { tip: 24 } : null);
    if (W) {
      const add = (h, wa) => {
        const ux = Math.sin(wa * D2R) * f.facing, uy = Math.cos(wa * D2R);
        const len = W.tip * s;
        const a = { x: h[0], y: h[1], ox: h[0], oy: h[1], r: 3, vx: vx * 0.9 + rand(-120, 120), vy: vy * 0.9 - rand(100, 300) };
        const b = { x: h[0] + ux * len, y: h[1] + uy * len, ox: 0, oy: 0, r: 3, vx: a.vx + rand(-400, 400), vy: a.vy + rand(-400, 400) };
        this.weps.push({ a, b, len });
      };
      add(J.h1, J.wa);
      if (f.c.weapon === 'daggers') add(J.h2, J.wa2);
    }
  }
  get pelvis() { return this.p[3]; }
  impulse(vx, vy) { for (const p of this.p) { p.vx += vx * rand(0.8, 1.2); p.vy += vy * rand(0.8, 1.2); } this.age = Math.min(this.age, 0.6); }
  collidePt(p, dt, pts) {
    for (const pl of this.g.stage.plats) {
      if (p.x < pl.x - p.r * 0.5 || p.x > pl.x + pl.w + p.r * 0.5) continue;
      const top = pl.y;
      if (p.y + p.r > top && p.oy + p.r <= top + 3) {
        const v = (p.y - p.oy) / dt;
        p.y = top - p.r; p.c = true;
        if (pts && v > 420 && this.age - this.lastThud > 0.12) {
          this.lastThud = this.age;
          Sfx.play('thud', v / 1000);
          this.g.fx.dust(p.x, top, 3, 0.8);
          if (v > 900) { this.g.shake = Math.max(this.g.shake, 4); this.g.fx.ink(p.x, top - 4, 3, 0, -200, 160); }
        }
      } else if (pl.solid && p.y > top && p.y < pl.y + pl.h) {
        const dl = p.x - pl.x, dr = pl.x + pl.w - p.x, db = pl.y + pl.h - p.y;
        const mn = Math.min(dl, dr, db);
        if (mn === db) p.y = pl.y + pl.h + p.r; else if (mn === dl) p.x = pl.x - p.r; else p.x = pl.x + pl.w + p.r;
      }
    }
  }
  // Muscle action: move a limb point toward a target while pushing the anchor
  // the opposite way, so the body can flail without propelling itself.
  nudge(p, tx, ty, k, anchor) {
    const dx = (tx - p.x) * k, dy = (ty - p.y) * k;
    p.x += dx * 0.5; p.y += dy * 0.5;
    const a = anchor || this.p[2];
    a.x -= dx * 0.5; a.y -= dy * 0.5;
  }
  muscles(dt) {
    const t = this.age, P = this.p, s = this.s;
    const S = Math.max(0, 1 - t / 2.0);
    const air = t - this.touchT > 0.2;
    const f = (v) => 1 - Math.pow(1 - clamp(v, 0, 0.95), dt * 60);
    const neck = P[1], chest = P[2], hip = P[3];
    // Neck tone: keep the head roughly in line with the spine.
    let ux = neck.x - chest.x, uy = neck.y - chest.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    const tone = Math.max(S, 0.15);
    this.nudge(P[0], neck.x + ux * 16 * s, neck.y + uy * 16 * s, f(0.35 * tone), chest);
    const px = -uy, py = ux;
    const reach = (LIMB.ua + LIMB.fa) * s;
    if (air && S > 0) {
      // Flailing: windmill the arms and bicycle the legs.
      const w = t * 13 + this.off;
      [[4, 5, 0], [6, 7, Math.PI]].forEach(([e, h, o]) => {
        const a = w + o;
        this.nudge(P[h], neck.x + Math.cos(a) * reach * 0.85, neck.y + Math.sin(a) * reach * 0.85, f(0.3 * S), neck);
        this.nudge(P[e], neck.x + Math.cos(a - 0.7) * LIMB.ua * s, neck.y + Math.sin(a - 0.7) * LIMB.ua * s, f(0.2 * S), neck);
      });
      [[8, 9, 0], [10, 11, Math.PI]].forEach(([k, ft, o]) => {
        const sw = Math.sin(t * 11 + o + this.off);
        const kx = hip.x - ux * LIMB.th * 0.8 * s + px * sw * 14 * s, ky = hip.y - uy * LIMB.th * 0.8 * s + py * sw * 14 * s;
        this.nudge(P[k], kx, ky, f(0.2 * S), hip);
        this.nudge(P[ft], kx - ux * LIMB.sh * 0.8 * s - px * sw * 8 * s, ky - uy * LIMB.sh * 0.8 * s - py * sw * 8 * s, f(0.14 * S), hip);
      });
      // Brace: if the ground is coming up fast, throw the hands toward it.
      const gp = this.g.groundBelow(chest.x, chest.y);
      if (gp && gp.y - chest.y < 110 && chest.vy > 200) {
        for (const h of [5, 7]) this.nudge(P[h], chest.x + Math.sign(chest.vx) * 18 * s, gp.y, f(0.4 * S), neck);
      }
    } else if (this.firstTouch >= 0) {
      // On the ground: clutch and curl, fading out into a limp body.
      const S2 = Math.max(0, 1 - (t - this.firstTouch) / 2.6) * 0.9;
      if (S2 > 0) {
        const wr = Math.sin(t * 4 + this.off);
        this.nudge(P[5], chest.x + px * 10 * s * wr, chest.y + py * 10 * s, f(0.1 * S2), neck);
        this.nudge(P[7], chest.x - px * 8 * s, chest.y - py * 8 * s + wr * 4, f(0.1 * S2), neck);
        const curl = 0.5 + 0.5 * Math.sin(t * 2.2 + this.off);
        this.nudge(P[8], hip.x + ux * 10 * s * curl - px * 12 * s, hip.y + uy * 10 * s * curl - py * 12 * s, f(0.08 * S2), hip);
        this.nudge(P[10], hip.x + ux * 6 * s * (1 - curl) - px * 14 * s, hip.y + uy * 6 * s * (1 - curl) - py * 14 * s, f(0.07 * S2), hip);
      }
    }
  }
  update(dt) {
    if (dt <= 0) return;
    this.age += dt;
    const P = this.p;
    for (const p of P) {
      p.ox = p.x; p.oy = p.y; p.c = false;
      p.vy += GRAV * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.muscles(dt);
    for (let it = 0; it < 8; it++) {
      for (const [i, j, L] of this.cons) {
        const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
        const k = ((d - L) / d) * 0.5;
        a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
      }
      for (const [i, j, mn, mx, st] of this.soft) {
        const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
        const L = d < mn ? mn : d > mx ? mx : d;
        if (L === d) continue;
        const k = ((d - L) / d) * 0.5 * st;
        a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
      }
      for (const p of P) this.collidePt(p, dt, it === 0);
    }
    let touching = false;
    for (const p of P) {
      if (p.c) { touching = true; p.x = p.ox + (p.x - p.ox) * 0.82; }
      p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt;
    }
    if (touching) { this.touchT = this.age; if (this.firstTouch < 0) this.firstTouch = this.age; }
    for (const w of this.weps) {
      for (const p of [w.a, w.b]) { p.ox = p.x; p.oy = p.y; p.c = false; p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      for (let it = 0; it < 4; it++) {
        const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y, d = Math.hypot(dx, dy) || 0.001, k = ((d - w.len) / d) * 0.5;
        w.a.x += dx * k; w.a.y += dy * k; w.b.x -= dx * k; w.b.y -= dy * k;
        this.collidePt(w.a, dt, false); this.collidePt(w.b, dt, false);
      }
      for (const p of [w.a, w.b]) {
        if (p.c) p.x = p.ox + (p.x - p.ox) * 0.7;
        p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt;
      }
    }
    const n = P[1];
    this.scarf.update(n.x, n.y, dt, 0, this.s);
    if (this.cape) this.cape.update(n.x, n.y, dt, 0, this.s, 9);
    const h = this.hat;
    if (h) {
      h.ox = h.x; h.oy = h.y; h.c = false;
      h.vy += GRAV * dt; h.x += h.vx * dt; h.y += h.vy * dt;
      this.collidePt(h, dt, false);
      if (h.c) { h.vx *= Math.pow(0.02, dt); h.vy = 0; h.vr *= Math.pow(0.01, dt); h.rot += wrap180(-h.rot / D2R) * D2R * Math.min(1, dt * 10); }
      else h.vy = (h.y - h.oy) / dt;
      h.rot += h.vr * dt;
    }
  }
  get alpha() { return this.age < 7 ? 1 : Math.max(0, 1 - (this.age - 7)); }
  get gone() { return this.age > 8 || this.p[3].y > this.g.stage.blast.b + 400; }
  draw(ctx) {
    const P = this.p, s = this.s;
    ctx.globalAlpha = this.alpha;
    if (this.cape) drawCape(ctx, this.cape.p.map((q) => [q.x, q.y]), this.char.color, s);
    this.scarf.draw(ctx, this.color, s);
    for (const w of this.weps) {
      const ang = Math.atan2((w.b.x - w.a.x) * this.fc, w.b.y - w.a.y) / D2R;
      drawWeapon(ctx, this.char.weapon, w.a.x, w.a.y, ang, this.fc, s, this.char.color);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const ln of RAG_LINES) line(ctx, ...ln.map((i) => [P[i].x, P[i].y]));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(P[0].x, P[0].y, LIMB.hr * s, 0, Math.PI * 2); ctx.fill();
    const look = this.look;
    if (look.acc === 'bowtie') inFrame(ctx, P[1].x, P[1].y, P[2].x, P[2].y, this.fc, s, () => drawBowtie(ctx, this.accent));
    if (look.acc !== 'none') inFrame(ctx, P[0].x, P[0].y, P[1].x, P[1].y, this.fc, s, () => drawFaceAcc(ctx, look.acc));
    if (this.hat) {
      ctx.save(); ctx.translate(this.hat.x, this.hat.y); ctx.rotate(this.hat.rot); ctx.scale(this.fc * s, s);
      ctx.translate(0, 8); drawHat(ctx, look.hat, this.accent); ctx.restore();
    }
    // Knocked-out eyes.
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8 * s;
    const ex = P[0].x, ey = P[0].y;
    for (const o of [-4, 4]) { line(ctx, [ex + o * s - 2.2 * s, ey - 2.2 * s], [ex + o * s + 2.2 * s, ey + 2.2 * s]); line(ctx, [ex + o * s + 2.2 * s, ey - 2.2 * s], [ex + o * s - 2.2 * s, ey + 2.2 * s]); }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------ Fighter ------------------------------------
let MOVE_SEQ = 0;

class Fighter {
  constructor(g, idx, ch, ctrl, opts) {
    this.g = g; this.idx = idx; this.c = ch; this.ctrl = ctrl;
    this.color = opts.color; this.label = opts.label; this.human = opts.human;
    this.name = opts.name || ch.name; this.tag = opts.name || opts.label;
    this.look = opts.look || { hat: 'none', acc: 'none' };
    this.cape = this.look.acc === 'cape' ? new Scarf() : null;
    this.stocks = g.opts.stocks; this.maxHp = 100;
    this.stats = { kos: 0, falls: 0, dmg: 0 };
    this.scale = 1; this.pose = Object.assign({}, BASE_POSE, ch.hold);
    this.scarf = new Scarf(); this.trail = []; this.inp = BLANK;
    this.buf = { jump: 0, light: 0, heavy: 0, dodge: 0 };
    this.runPh = 0; this.tumbleRot = 0; this.frame = 0;
    const sp = g.stage.spawns[idx % g.stage.spawns.length];
    this.reset(sp[0], sp[1]);
  }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.facing = x < this.g.stage.center ? 1 : -1;
    this.hp = this.maxHp; this.dispHp = this.maxHp;
    this.grounded = false; this.plat = null; this.state = 'fall';
    this.jumps = this.c.airJumps; this.move = null; this.dodge = null;
    this.stun = 0; this.lag = 0; this.invuln = 0; this.flash = 0; this.hitstop = 0;
    this.buffs = { rage: 0, speed: 0, giant: 0 }; this.shield = 0; this.bombs = 0; this.invis = 0;
    this.usedUp = false; this.usedSide = false; this.airDodged = false; this.fastFalling = false;
    this.dropT = 0; this.dodgeCD = 0; this.flipT = 0; this.tapT = 0; this.hover = 0;
    this.dead = false; this.respawnT = 0; this.tumble = false; this.lastHitBy = null; this.lastHitT = 0;
    this.J = skel(this.x, this.y, this.facing, this.scale, this.pose);
    this.scarf.reset(this.J.neck[0], this.J.neck[1]);
    if (this.cape) this.cape.reset(this.J.sh[0], this.J.sh[1]);
    this.trail.length = 0;
  }
  respawn() {
    const g = this.g;
    this.reset(g.stage.center + rand(-120, 120), 150);
    this.invuln = 120; this.hover = 70; this.respawnInv = true;
    g.fx.ring(this.x, this.y - 50, 10, 120, this.color, 0.5, 8);
  }
  dmgMul() { return (this.buffs.rage > 0 ? 1.45 : 1) * (this.buffs.giant > 0 ? 1.2 : 1); }
  weightMul() { return this.c.weight * (this.buffs.giant > 0 ? 1.4 : 1); }
  isInvuln() {
    if (this.invuln > 0) return true;
    const d = this.dodge;
    return !!(d && d.t >= 2 && d.t <= d.dur - 6);
  }
  hurt() {
    const J = this.J, s = this.scale;
    return [[J.hip[0], J.hip[1], 15 * s], [J.chest[0], J.chest[1], 16 * s], [J.head[0], J.head[1], 13 * s]];
  }
  hitboxes() {
    const m = this.move;
    if (!m || m.phase !== 'active' || !m.def.hb.length) return null;
    const s = this.scale, bx = this.x, by = this.y - 44 * s;
    return m.def.hb.map((h) => [bx + h[0] * this.facing * s, by + h[1] * s, h[2] * s]);
  }

  update() {
    const g = this.g;
    this.frame++;
    if (this.dead) {
      if (this.respawnT > 0 && --this.respawnT === 0) this.respawn();
      return;
    }
    const inp = g.phase === 'fight' ? this.ctrl.read(this) : BLANK;
    this.inp = inp;
    const B = this.buf;
    for (const k in B) if (B[k] > 0) B[k]--;
    if (inp.jumpP) B.jump = 7;
    if (inp.lightP) { B.light = 7; this.lastHeavy = false; }
    if (inp.heavyP) { B.heavy = 7; this.lastHeavy = true; }
    if (inp.dodgeP) B.dodge = 6;
    // Tap-jump (W / Up) waits a few frames so up+attack doesn't also jump.
    if (inp.tapP) this.tapT = 4;
    if (this.tapT > 0) {
      if (B.light || B.heavy) this.tapT = 0;
      else if (--this.tapT === 0) B.jump = 6;
    }
    if (this.hitstop > 0) { this.hitstop--; this.updateVisuals(); return; }

    if (this.invuln > 0 && --this.invuln === 0) this.respawnInv = false;
    if (this.flash > 0) this.flash--;
    if (this.invis > 0) this.invis--;
    if (this.dropT > 0) this.dropT--;
    if (this.lag > 0) this.lag--;
    if (this.dodgeCD > 0) this.dodgeCD--;
    if (this.flipT > 0) this.flipT--;
    for (const k in this.buffs) if (this.buffs[k] > 0) this.buffs[k]--;
    this.scale += ((this.buffs.giant > 0 ? 1.35 : 1) - this.scale) * 0.12;
    if (this.hover > 0) { this.hover--; if (inp.x || inp.jumpP || inp.lightP || inp.heavyP || inp.down) this.hover = 0; }

    if (this.stun > 0 && --this.stun === 0 && this.state === 'hitstun') { this.state = this.grounded ? 'idle' : 'fall'; this.tumble = false; }
    if (this.move) this.updateMove();
    if (this.dodge) this.updateDodge();
    const actionable = !this.move && !this.dodge && this.stun <= 0 && this.lag <= 0;
    if (actionable) this.handleActions(inp);
    this.physics(inp, !this.move && !this.dodge && this.stun <= 0 && this.lag <= 0);
    this.updatePose();
    this.updateVisuals();
  }

  handleActions(inp) {
    const B = this.buf;
    if (B.dodge && this.dodgeCD <= 0 && (this.grounded || !this.airDodged)) { B.dodge = 0; this.startDodge(inp); return; }
    if (B.light || B.heavy) {
      const heavy = B.heavy > 0 && (this.lastHeavy || !B.light);
      B.light = 0; B.heavy = 0;
      let dir = 'n';
      if (inp.up) dir = 'u'; else if (inp.down) dir = 'd'; else if (Math.abs(inp.x) > 0.4) dir = 's';
      if (dir === 's') this.facing = inp.x > 0 ? 1 : -1;
      let key;
      if (!heavy) {
        if (this.bombs > 0 && dir === 'n') key = 'throw';
        else key = this.grounded ? { n: 'jab', s: 'ftilt', u: 'utilt', d: 'dtilt' }[dir] : { n: 'nair', s: 'fair', u: 'uair', d: 'dair' }[dir];
      } else {
        key = { n: 'nsig', s: 'ssig', u: 'usig', d: 'dsig' }[dir];
        if (!this.grounded && ((key === 'usig' && this.usedUp) || (key === 'ssig' && this.usedSide))) key = null;
      }
      if (key) { this.startMove(key); return; }
    }
    if (B.jump) {
      if (this.grounded) {
        B.jump = 0;
        this.vy = -this.c.jump * (this.buffs.speed > 0 ? 1.08 : 1); this.grounded = false; this.plat = null; this.fastFalling = false;
        this.g.fx.dust(this.x, this.y, 5, 0.7); Sfx.play('jump');
      } else if (this.jumps > 0) {
        B.jump = 0; this.jumps--;
        this.vy = -this.c.jump * 0.9; this.fastFalling = false; this.flipT = 22;
        if (Math.abs(this.inp.x) > 0.3) this.vx = this.inp.x * this.c.speed * 0.9;
        this.g.fx.ring(this.x, this.y, 6, 38, 'rgba(21,23,28,0.5)', 0.25, 4); Sfx.play('djump');
      }
    }
    if (this.grounded && this.plat && !this.plat.solid && inp.downP) {
      this.dropT = 14; this.grounded = false; this.plat = null; this.y += 2; this.vy = Math.max(this.vy, 120);
    }
  }

  startMove(key) {
    const def = key === 'throw' ? THROW_MOVE : this.c.moves[key] || this.c.moves[MOVE_FALLBACK[key]];
    if (!def) return;
    this.move = { def, key, t: 0, phase: 'startup', hits: new Map(), air: !this.grounded, id: ++MOVE_SEQ, landed: false, ragHit: new Set() };
    if (key === 'usig') this.usedUp = true;
    if (key === 'ssig' && !this.grounded) this.usedSide = true;
    if (key === 'throw') this.bombs--;
    this.state = 'attack'; this.trail.length = 0; this.hover = 0;
    if (def.armor) this.g.fx.ring(this.x, this.y - 45 * this.scale, 30, 60, this.c.color, 0.3, 5);
  }

  updateMove() {
    const m = this.move, d = m.def, [su, ac, re] = d.f;
    m.t++;
    if (m.t === su + 1) this.onActive();
    if (d.plunge && m.air && !m.landed && m.t > su) {
      this.vy = 1450; this.vx *= 0.9;
      if (m.t >= su + ac) m.t = su + ac - 1;
      if (m.t % 3 === 0) this.g.fx.add({ type: 'spark', x: this.x + rand(-14, 14), y: this.y - rand(40, 90), vx: 0, vy: -600, life: 0.15, color: 'rgba(21,23,28,0.4)', w: 2 });
    }
    m.phase = m.t <= su ? 'startup' : m.t <= su + ac ? 'active' : 'recovery';
    if (d.fx === 'sparkle' && m.phase === 'active' && m.t % 2 === 0) this.g.fx.sparks(this.x, this.y + 10, 2, this.c.color, 300, Math.PI / 2, 1.2, 3);
    if (m.t >= su + ac + re) { this.move = null; this.state = this.grounded ? 'idle' : 'fall'; }
  }

  onActive() {
    const m = this.move, d = m.def, g = this.g;
    if (d.v && !d.hold) {
      if (d.vadd) { this.vx += d.v[0] * this.facing; this.vy += d.v[1]; }
      else { this.vx = d.v[0] * this.facing; this.vy = d.v[1]; }
    }
    if (d.hold && d.v) { this.vx = d.v[0] * this.facing; this.vy = d.v[1]; }
    if (this.vy < 0) { this.grounded = false; this.plat = null; }
    if (d.proj) this.fire(d.proj);
    if (d.teleport) this.teleport(d.teleport);
    if (d.smoke) {
      this.invis = 150; this.invuln = Math.max(this.invuln, 20);
      g.fx.smoke(this.x, this.y - 40, 18, 220);
    }
    if (d.plunge && !m.air) this.landBurst();
    if (d.fx === 'wave') {
      const cx = this.x + 50 * this.facing * this.scale, cy = this.y - 74 * this.scale;
      g.fx.ring(cx, cy, 10, 90, this.c.color, 0.3, 10); g.fx.ring(cx + 30 * this.facing, cy, 10, 70, this.c.color, 0.35, 6);
    }
    if (d.fx === 'quakeDust') { g.fx.dust(this.x + 90 * this.facing, this.y, 10, 1.6); g.fx.rocks(this.x + 90 * this.facing, this.y, 6); g.shake = Math.max(g.shake, 8); }
    if (d.sfx !== 'none') Sfx.play(d.sfx || 'swing');
  }

  fire(spec) {
    const n = spec.count || 1, s = this.scale;
    for (let i = 0; i < n; i++) {
      const deg = (spec.dir || 0) + (n > 1 ? (i - (n - 1) / 2) * (spec.spread || 0) : 0);
      const a = deg * D2R;
      let ox, oy;
      if (spec.off) { ox = this.x + spec.off[0] * this.facing * s; oy = this.y - 44 * s + spec.off[1] * s; }
      else { ox = this.x + (4 + Math.cos(a) * 46) * this.facing * s; oy = this.y - 74 * s - Math.sin(a) * 46 * s; }
      const p = new Proj(this.g, this, spec, ox, oy, Math.cos(a) * spec.speed * this.facing, -Math.sin(a) * spec.speed);
      this.g.addProj(p);
      if (spec.from === 'gun' && i === 0) { this.g.fx.star(ox, oy, 14, '#ffd23f', 0.08); }
    }
    if (spec.type === 'blast') this.g.boomFx(this.x, this.y + 6, spec.r);
  }

  teleport(dist) {
    const g = this.g, s = this.scale;
    const sx = this.x, sy = this.y - 50 * s;
    g.fx.ghost(this.J, this.c, this.c.color, 0.35);
    g.fx.smoke(this.x, this.y - 40, 8, 90);
    const b = g.stage.blast;
    this.x = clamp(this.x + dist * this.facing, b.l + 160, b.r - 160);
    const seg = new Proj(g, this, { type: 'seg', dmg: 5, ang: 50, kb: 220, ks: 200, r: 26, life: 5 }, sx, sy, 0, 0);
    seg.x2 = this.x; seg.y2 = sy;
    g.addProj(seg);
    g.fx.add({ type: 'spark', x: this.x, y: sy, vx: (sx - this.x) * 8, vy: 0, life: 0.18, color: this.c.color, w: 8 });
    if (this.grounded && !g.groundBelow(this.x, this.y - 5)) { this.grounded = false; this.plat = null; }
    Sfx.play('warp');
  }

  landBurst() {
    const g = this.g, lh = this.move.def.landHit, s = this.scale;
    g.addProj(new Proj(g, this, { type: 'shock', dmg: lh.dmg, ang: lh.ang, kb: lh.kb, ks: lh.ks, r: lh.r, life: 6 }, this.x, this.y - 20 * s, 0, 0));
    if (lh.quake) {
      for (const dx of [-1, 1]) g.addProj(new Proj(g, this, { type: 'quake', dmg: 7, ang: 75, kb: 280, ks: 300, r: 26, life: 34 }, this.x + dx * 40, this.y, dx * 720, 0));
    }
    g.fx.dust(this.x - 30, this.y, 7, 2); g.fx.dust(this.x + 30, this.y, 7, 2);
    g.fx.ring(this.x, this.y - 6, 10, lh.r * 1.3 * s, 'rgba(21,23,28,0.6)', 0.3, 7);
    g.fx.rocks(this.x, this.y, 8);
    g.shake = Math.max(g.shake, 10);
    Sfx.play('boom');
  }

  counter(att) {
    const g = this.g, m = this.move;
    this.move = null;
    this.x = att.x - att.facing * 58 * att.scale;
    this.y = att.y; this.vx = 0; this.vy = 0;
    this.grounded = att.grounded; this.plat = att.plat;
    this.facing = att.facing;
    this.invuln = Math.max(this.invuln, 24);
    att.hitstop = 20; att.move = null; att.stun = 30; att.state = 'hitstun';
    g.fx.star(this.x, this.y - 60, 40, '#fff', 0.2);
    g.fx.text(this.x, this.y - 120, 'PARRY!', this.c.color, 32);
    Sfx.play('clang');
    this.startMove(m.def.counterMove);
  }

  startDodge(inp) {
    Sfx.play('dodge');
    this.state = 'dodge'; this.hover = 0;
    if (this.grounded) {
      if (Math.abs(inp.x) > 0.4) this.dodge = { type: 'roll', t: 0, dur: 24, dir: inp.x > 0 ? 1 : -1 };
      else this.dodge = { type: 'spot', t: 0, dur: 20 };
    } else {
      this.airDodged = true;
      let dx = inp.x, dy = (inp.up ? -1 : 0) + (inp.down ? 1 : 0);
      const l = Math.hypot(dx, dy);
      if (l > 0.3) { dx /= l; dy /= l; this.vx = dx * 760; this.vy = dy * 760; }
      else { this.vx *= 0.3; this.vy = Math.min(this.vy, 0) * 0.3; }
      this.dodge = { type: 'air', t: 0, dur: 24 };
    }
    this.g.fx.ghost(this.J, this.c, this.color, 0.2);
  }

  updateDodge() {
    const d = this.dodge;
    d.t++;
    if (d.type === 'air' && d.t < 14) { this.vx *= 0.93; this.vy *= 0.93; }
    if (d.t % 4 === 0) this.g.fx.ghost(this.J, this.c, this.color, 0.18);
    if (d.t >= d.dur) {
      this.dodge = null;
      this.dodgeCD = d.type === 'air' ? 0 : 10;
      this.state = this.grounded ? 'idle' : 'fall';
    }
  }

  physics(inp, actionable) {
    const c = this.c, m = this.move, d = m && m.def;
    const sp = c.speed * (this.buffs.speed > 0 ? 1.38 : 1);
    const holding = m && d.hold && m.phase === 'active' && (!d.holdFrames || m.t - d.f[0] <= d.holdFrames);
    if (holding) { this.vx = d.v[0] * this.facing; this.vy = d.v[1]; }
    else if (this.dodge && this.dodge.type === 'roll') {
      const k = 1 - this.dodge.t / this.dodge.dur;
      this.vx = this.dodge.dir * 640 * clamp(k * 1.25 - 0.1, 0, 1);
    } else if (this.grounded) {
      if (actionable && Math.abs(inp.x) > 0.25) { this.vx = approach(this.vx, inp.x * sp, 5200 * DT); this.facing = inp.x > 0 ? 1 : -1; }
      else this.vx = approach(this.vx, 0, (this.stun > 0 ? 1500 : m ? 2600 : 4400) * DT);
    } else {
      if (this.stun > 0) { this.vx *= 0.993; if (Math.abs(inp.x) > 0.3) this.vx += inp.x * 260 * DT; }
      else if (this.dodge) { /* momentum */ }
      else if ((actionable || (m && !d.hold && !d.plunge)) && Math.abs(inp.x) > 0.25) this.vx = approach(this.vx, inp.x * sp * 0.92, 2700 * DT);
      else this.vx = approach(this.vx, 0, 450 * DT);
    }
    let gm = c.grav;
    if (m && m.phase === 'active' && d.grav != null) gm *= d.grav;
    if (this.dodge && this.dodge.type === 'air' && this.dodge.t < 14) gm *= 0.1;
    if (this.hover > 0) gm = 0;
    if (!holding && !this.grounded) this.vy += GRAV * gm * DT;
    let maxFall = 1050;
    if (actionable && inp.down && !this.grounded && this.vy > -100) {
      maxFall = 1600;
      if (!this.fastFalling) { this.fastFalling = true; this.vy = Math.max(this.vy, 1000); }
    }
    if (this.stun > 0) maxFall = 2600;
    if (d && d.plunge) maxFall = 1600;
    if (holding && d.v[1] > maxFall) maxFall = d.v[1];
    if (this.vy > maxFall) this.vy = approach(this.vy, maxFall, 5000 * DT);
    const prevY = this.y;
    this.x += this.vx * DT; this.y += this.vy * DT;
    this.collide(prevY);
  }

  collide(prevY) {
    const plats = this.g.stage.plats;
    let landed = null;
    if (this.vy >= 0) {
      for (const p of plats) {
        if (!p.solid && this.dropT > 0) continue;
        if (this.x >= p.x - 4 && this.x <= p.x + p.w + 4 && prevY <= p.y + 1 && this.y >= p.y) {
          if (!landed || p.y < landed.y) landed = p;
        }
      }
    }
    if (landed) {
      const impact = this.vy;
      this.y = landed.y;
      if (!this.grounded) { if (!this.onLand(landed, impact)) return; }
      this.vy = 0; this.grounded = true; this.plat = landed;
    } else if (this.grounded) {
      const p = this.plat;
      if (!p || this.x < p.x - 4 || this.x > p.x + p.w + 4 || this.vy < 0) { this.grounded = false; this.plat = null; if (this.state === 'idle' || this.state === 'run') this.state = 'fall'; }
      else this.y = p.y;
    }
    const s = this.scale, hw = 12 * s, top = this.y - 86 * s;
    for (const p of plats) {
      if (!p.solid || (this.grounded && this.plat === p)) continue;
      if (this.x + hw <= p.x || this.x - hw >= p.x + p.w || this.y <= p.y || top >= p.y + p.h) continue;
      const pl = this.x + hw - p.x, pr = p.x + p.w - (this.x - hw), pb = p.y + p.h - top;
      const mn = Math.min(pl, pr, pb);
      if (mn === pb) { this.y += pb; if (this.vy < 0) this.vy = this.stun > 0 ? -this.vy * 0.4 : 0; }
      else if (mn === pl) { this.x -= pl; if (this.vx > 0) this.vx = this.stun > 0 ? -this.vx * 0.4 : 0; }
      else { this.x += pr; if (this.vx < 0) this.vx = this.stun > 0 ? -this.vx * 0.4 : 0; }
    }
  }

  onLand(p, impact) {
    const g = this.g;
    if (this.state === 'hitstun' && this.tumble && impact > 520) {
      this.vy = -impact * 0.42; this.y = p.y - 1; this.tumble = false;
      this.stun = Math.max(this.stun, 16);
      g.fx.dust(this.x, p.y, 8, 1.5); Sfx.play('thud', 0.9); g.shake = Math.max(g.shake, 5);
      return false;
    }
    this.grounded = true; this.plat = p;
    this.jumps = this.c.airJumps; this.usedUp = false; this.usedSide = false; this.airDodged = false; this.fastFalling = false;
    this.flipT = 0; this.hover = 0;
    if (impact > 300) { g.fx.dust(this.x, p.y, impact > 900 ? 8 : 4, 1); Sfx.play('land'); }
    const m = this.move;
    if (m) {
      if (m.def.plunge && m.air && !m.landed) {
        m.landed = true; this.y = p.y; this.landBurst();
        m.t = m.def.f[0] + m.def.f[1]; m.phase = 'recovery';
      } else if (m.air) { this.move = null; this.lag = 6; this.state = 'idle'; }
    }
    if (this.dodge && this.dodge.type === 'air') { this.dodge = null; this.lag = 4; }
    if (this.state === 'fall') this.state = 'idle';
    return true;
  }

  updatePose() {
    const c = this.c, T = this.g.time;
    const tp = Object.assign({}, BASE_POSE, c.hold);
    let k = 18, rot = null, wAdd = 0;
    const m = this.move;
    if (m) {
      const d = m.def, [su, ac, re] = d.f;
      if (m.phase === 'startup') { Object.assign(tp, d.W); k = Math.max(16, 75 / Math.max(su, 1)); }
      else if (m.phase === 'active') {
        Object.assign(tp, d.W, d.S); k = 55;
        const pr = clamp((m.t - su) / ac, 0, 1);
        if (d.spin) rot = d.spin * easeOut(pr);
        if (d.wspin) wAdd = d.wspin * pr;
      } else {
        const rp = (m.t - su - ac) / re;
        if (rp < 0.4) Object.assign(tp, d.W, d.S);
        k = rp < 0.4 ? 30 : 13;
        if (d.spin) rot = d.spin;
      }
    } else if (this.dodge) {
      const d = this.dodge, pr = d.t / d.dur;
      if (d.type === 'roll') { Object.assign(tp, POSES.roll); rot = 360 * easeInOut(clamp(pr * 1.15, 0, 1)) * (d.dir === this.facing ? 1 : -1); k = 40; }
      else if (d.type === 'spot') { Object.assign(tp, POSES.spot); k = 30; }
      else { Object.assign(tp, POSES.airdodge); k = 25; }
    } else if (this.state === 'hitstun') {
      Object.assign(tp, POSES.hurt); k = 25;
      tp.a1 += Math.sin(this.frame * 0.7) * 25; tp.a2 += Math.cos(this.frame * 0.6) * 25;
      if (this.tumble) { this.tumbleRot += 15 * -Math.sign(this.vx * this.facing || 1); rot = this.tumbleRot; }
    } else if (!this.grounded) {
      if (this.flipT > 0) { Object.assign(tp, POSES.flip); rot = 360 * easeInOut(1 - this.flipT / 22); k = 30; }
      else Object.assign(tp, this.vy < 0 ? POSES.jump : POSES.fall);
      k = Math.max(k, 14);
    } else if (this.lag > 0) { Object.assign(tp, POSES.land); k = 30; }
    else if (Math.abs(this.vx) > 40) {
      const sp = clamp(Math.abs(this.vx) / c.speed, 0, 1.3);
      this.runPh += (Math.abs(this.vx) * DT * Math.PI * 2) / 125;
      const ph = this.runPh, sw = 50 * sp;
      tp.t = 14 + 10 * sp;
      tp.l1 = sw * Math.sin(ph); tp.s1 = tp.l1 - (14 + 80 * sp * Math.max(0, Math.cos(ph)));
      tp.l2 = -sw * Math.sin(ph); tp.s2 = tp.l2 - (14 + 80 * sp * Math.max(0, -Math.cos(ph)));
      tp.a2 = sw * 0.9 * Math.sin(ph) - 10; tp.f2 = tp.a2 + 85;
      if (c.weapon === 'fists') { tp.a1 = -sw * 0.9 * Math.sin(ph) + 10; tp.f1 = tp.a1 + 95; }
      k = 32;
    } else if (this.inp.down) { Object.assign(tp, POSES.crouch); k = 26; }
    else {
      const b = Math.sin(T * 2.8 + this.idx);
      tp.t += b * 2; tp.a1 += b * 3; tp.a2 -= b * 3; tp.h = -b * 2; tp.l1 += b * 2; tp.l2 -= b * 2;
    }
    const a = 1 - Math.exp(-k * DT), P = this.pose;
    for (const key in tp) {
      let diff = tp[key] - P[key];
      if (key === 'rot' || (key === 'w' && Math.abs(diff) > 180)) diff = wrap180(diff);
      P[key] += diff * a;
    }
    if (rot !== null) P.rot = rot;
    if (wAdd) P.w = tp.w + wAdd;
  }

  updateVisuals() {
    const g = this.g;
    this.J = skel(this.x, this.y, this.facing, this.scale, this.pose);
    const J = this.J;
    const wind = -this.facing * 160 + Math.sin(g.time * 6 + this.idx) * 140 - this.vx * 0.3;
    this.scarf.update(J.neck[0] - this.facing * 2, J.neck[1] + 2, DT, wind, this.scale);
    if (this.cape) this.cape.update(J.sh[0] - this.facing * 3, J.sh[1] + 3, DT, wind * 0.6, this.scale, 9);
    for (const t of this.trail) t.life -= 1 / 7;
    this.trail = this.trail.filter((t) => t.life > 0);
    const m = this.move;
    if (m && m.def.trail !== false) {
      const d = m.def, [su, ac] = d.f;
      if (m.t >= su - 1 && m.t <= su + ac + 3) {
        const src = d.trail || this.c.trail;
        let a, b;
        if (src === 'weapon' && WEAPONS[this.c.weapon]) {
          const W = WEAPONS[this.c.weapon], s = this.scale;
          const ux = Math.sin(J.wa * D2R) * this.facing, uy = Math.cos(J.wa * D2R);
          a = [J.h1[0] + ux * W.tip * s, J.h1[1] + uy * W.tip * s];
          b = [J.h1[0] + ux * W.base * s, J.h1[1] + uy * W.base * s];
        } else if (src === 'foot') { a = J.f1; b = J.k1; }
        else { a = J.h1; b = J.e1; }
        this.trail.push({ a, b, life: 1 });
      }
    }
    if ((this.buffs.speed > 0 && Math.abs(this.vx) > 200 && this.frame % 3 === 0) ||
        (m && m.def.hold && m.phase === 'active' && this.frame % 2 === 0)) {
      g.fx.ghost(J, this.c, this.buffs.speed > 0 ? POWERS.speed.color : this.c.color, 0.22);
    }
    if (this.buffs.rage > 0 && this.frame % 4 === 0) g.fx.fire(J.chest[0] + rand(-12, 12), J.chest[1] + rand(-20, 20), 1);
    if (this.dispHp > this.hp) this.dispHp = Math.max(this.hp, this.dispHp - 0.6);
    else this.dispHp = this.hp;
  }

  draw(ctx) {
    if (this.dead) return;
    const J = this.J, s = this.scale, g = this.g;
    let alpha = 1;
    if (this.respawnInv && this.invuln > 0) alpha = Math.floor(this.frame / 4) % 2 ? 0.35 : 0.9;
    if (this.invis > 0) alpha = 0.16;
    if (this.isInvuln() && this.dodge) alpha = 0.55;
    // Weapon trail.
    if (this.trail.length > 1) {
      ctx.fillStyle = this.c.color;
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i - 1], q = this.trail[i];
        ctx.globalAlpha = q.life * 0.5 * alpha;
        ctx.beginPath(); ctx.moveTo(p.a[0], p.a[1]); ctx.lineTo(q.a[0], q.a[1]); ctx.lineTo(q.b[0], q.b[1]); ctx.lineTo(p.b[0], p.b[1]); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = alpha;
    this.scarf.draw(ctx, this.color, s);
    if (this.buffs.rage > 0) { ctx.shadowColor = POWERS.rage.color; ctx.shadowBlur = 16 + Math.sin(g.time * 20) * 5; }
    const col = this.flash > 0 && this.flash % 4 < 2 ? '#e63946' : INK;
    if (this.hitstop > 0 && this.flash > 0) { ctx.save(); ctx.translate(rand(-3, 3), rand(-2, 2)); }
    drawFigure(ctx, J, this.c, col, { bomb: this.bombs > 0, look: this.look, cape: this.cape, accent: this.color });
    if (this.hitstop > 0 && this.flash > 0) ctx.restore();
    ctx.shadowBlur = 0;
    if (this.shield > 0) {
      const r = 60 * s, cx = J.chest[0], cy = J.chest[1] - 6 * s;
      ctx.globalAlpha = alpha * 0.14; ctx.fillStyle = POWERS.shield.color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * 0.75; ctx.strokeStyle = POWERS.shield.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r - 6, -2.4 + g.time, -1.6 + g.time); ctx.stroke();
    }
    if (this.move && this.move.def.armor && this.move.phase !== 'recovery') {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(g.time * 30); ctx.strokeStyle = this.c.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(J.chest[0], J.chest[1], 34 * s, 56 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.move && this.move.def.counter && this.move.phase === 'active') {
      ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(J.chest[0], J.chest[1], 50 * s + Math.sin(g.time * 40) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = this.c.color; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = this.invis > 0 ? 0.3 : 1;
    // Name tag.
    const tx = J.head[0], ty = Math.min(J.head[1], J.hip[1] - 40 * s) - 34 * s;
    ctx.font = '700 17px "Barlow Condensed", "Arial Narrow", sans-serif';
    const tw = ctx.measureText(this.tag).width + 14;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(tx - tw / 2, ty - 21, tw, 20, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 5, ty - 1.5); ctx.lineTo(tx + 5, ty - 1.5); ctx.lineTo(tx, ty + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(this.tag, tx, ty - 5.5);
    ctx.globalAlpha = 1;
  }
}
