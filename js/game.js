'use strict';
// ---------------------------------------------------------------------------
// Stick Clash — match logic: CPU brains, power-ups, the Game object (hits,
// KOs, camera) and all world/HUD rendering.
// ---------------------------------------------------------------------------

// ------------------------------- CPU ---------------------------------------
class CpuCtrl {
  constructor(level) { this.lv = CPU_LEVELS[level] || CPU_LEVELS.normal; this.o = blankInput(); this.think = rint(0, 10); this.cool = 0; this.jumpCD = 0; this.mood = rand(0, 1); }
  read(f) {
    const o = this.o, g = f.g, lv = this.lv;
    o.jumpP = o.tapP = o.lightP = o.heavyP = o.dodgeP = o.downP = false;
    if (this.cool > 0) this.cool--;
    if (this.jumpCD > 0) this.jumpCD--;
    // 1) Recovery always takes priority.
    const below = g.groundBelow(f.x, f.y - 2);
    if (!f.grounded && !below) {
      const tgt = g.nearestSolid(f.x);
      const edgeX = clamp(f.x, tgt.x + 30, tgt.x + tgt.w - 30);
      o.x = Math.sign(edgeX - f.x); o.up = false; o.down = false;
      if (f.vy > -150 && f.y > tgt.y - 140 && !f.move) {
        if (f.jumps > 0 && this.jumpCD <= 0) { o.jumpP = true; this.jumpCD = 16; }
        else if (!f.usedSide && Math.abs(edgeX - f.x) > 220 && f.y < tgt.y + 40 && f.c.id !== 'colt') { o.heavyP = true; o.up = false; f.facing = o.x || f.facing; }
        else if (!f.usedUp) { o.up = true; o.heavyP = true; }
      }
      return o;
    }
    if (f.move || f.stun > 0) return o;
    if (this.think-- > 0) {
      o.jumpP = false;
      if (f.grounded && o.x && !g.groundBelow(f.x + o.x * 50, f.y - 5) && !this.leap) o.x = 0;
      return o;
    }
    this.think = lv.react + rint(0, 5);
    this.leap = false;
    o.up = false; o.down = false; o.x = 0;
    // 2) Pick a target: closest living enemy, or a nearby power-up.
    let tg = null, best = 1e9;
    for (const e of g.fighters) {
      if (e === f || e.dead || (e.invis > 0 && Math.abs(e.x - f.x) > 140)) continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y) + (e.respawnInv ? 400 : 0);
      if (d < best) { best = d; tg = e; }
    }
    let pw = null;
    for (const p of g.powers) { const d = Math.hypot(p.x - f.x, p.y - f.y); if (p.landed && d < 380 && (!tg || d < best * 0.8)) pw = p; }
    const goal = pw || tg;
    if (!goal) return o;
    const dx = goal.x - f.x, dy = goal.y - f.y, adx = Math.abs(dx);
    // 3) Defensive dodge.
    if (tg && tg.move && tg.move.phase === 'startup' && Math.hypot(tg.x - f.x, tg.y - f.y) < 170 && Math.random() < lv.dodge) {
      o.dodgeP = true;
      o.x = Math.random() < 0.5 ? -Math.sign(tg.x - f.x) : 0;
      return o;
    }
    if (!pw && tg) {
      const range = f.c.ai.range * f.scale + 20;
      const lowHp = tg.hp < 40;
      if (adx < range && Math.abs(dy) < 60 && this.cool <= 0) {
        this.cool = lv.cool + rint(0, 8);
        if (Math.random() < lv.miss) return o;
        const r = Math.random(), dir = Math.sign(dx) || f.facing;
        if (f.grounded) {
          if (r < (lowHp ? 0.25 : 0.4)) { o.x = 0; if (f.facing !== dir) o.x = dir * 0.5; o.lightP = true; }
          else if (r < (lowHp ? 0.5 : 0.72)) { o.x = dir; o.lightP = true; }
          else if (r < 0.86) { o.x = dir; o.heavyP = true; }
          else if (f.facing === dir) { o.heavyP = true; }
          else { o.down = true; o.lightP = true; }
        } else {
          if (r < 0.5) { o.x = 0; o.lightP = true; }
          else { o.x = dir; o.lightP = true; }
        }
        return o;
      }
      if (adx < 80 && dy < -70 && dy > -220 && this.cool <= 0) { this.cool = lv.cool; o.up = true; o.lightP = true; return o; }
      if (adx < 60 && dy > 70 && !f.grounded && this.cool <= 0 && below) { this.cool = lv.cool; o.down = true; o.lightP = true; return o; }
      // Zoning.
      if (f.c.ai.ranged && adx > 240 && adx < 750 && Math.abs(dy) < 70 && this.cool <= 0 && Math.random() < lv.aggr * 0.45) {
        this.cool = lv.cool + 10;
        if (f.facing !== Math.sign(dx)) { o.x = Math.sign(dx) * 0.3; this.think = 1; return o; }
        o.heavyP = true;
        if (f.c.id === 'orin' && Math.random() < 0.4 && adx < 340) { o.down = true; }
        return o;
      }
      if (Math.random() > lv.aggr && adx < 300) { o.x = -Math.sign(dx) * (Math.random() < 0.5 ? 1 : 0); return o; }
    }
    // 4) Approach.
    o.x = adx > 20 ? Math.sign(dx) : 0;
    if (dy < -90 && f.grounded) { o.jumpP = true; this.leap = true; }
    else if (dy < -90 && !f.grounded && f.vy > 0 && f.jumps > 0 && this.jumpCD <= 0) { o.jumpP = true; this.jumpCD = 18; }
    if (dy > 60 && f.grounded && f.plat && !f.plat.solid) o.downP = true;
    if (f.grounded && o.x && !g.groundBelow(f.x + o.x * 50, f.y - 5)) {
      const land = g.groundBelow(f.x + o.x * 260, f.y - 80);
      if (land && (dy < -40 || adx > 200)) { o.jumpP = true; this.leap = true; } else o.x = 0;
    }
    return o;
  }
}

// ------------------------------ Power-ups ----------------------------------
class Power {
  constructor(g, type, x) {
    this.g = g; this.type = type; this.x = x; this.y = g.stage.blast.t + 250; this.vy = 0;
    this.landed = false; this.life = 1000; this.t = rand(0, 100); this.dead = false;
  }
  update() {
    this.t++;
    if (!this.landed) {
      this.vy = Math.min(this.vy + 900 * DT, 230);
      const py = this.y; this.y += this.vy * DT;
      for (const p of this.g.stage.plats) {
        if (this.x > p.x + 10 && this.x < p.x + p.w - 10 && py + 20 <= p.y && this.y + 20 >= p.y) { this.y = p.y - 20; this.landed = true; this.g.fx.dust(this.x, p.y, 4, 0.6); }
      }
      if (this.y > this.g.stage.blast.b) this.dead = true;
    }
    if (--this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const P = POWERS[this.type];
    if (this.life < 120 && Math.floor(this.t / 5) % 2) return;
    const y = this.y + (this.landed ? Math.sin(this.t * 0.08) * 4 - 6 : 0), x = this.x;
    if (!this.landed) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      line(ctx, [x - 14, y - 6], [x - 26, y - 46]); line(ctx, [x + 14, y - 6], [x + 26, y - 46]); line(ctx, [x, y - 18], [x, y - 52]);
      ctx.fillStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 34, y - 44); ctx.quadraticCurveTo(x, y - 84, x + 34, y - 44); ctx.quadraticCurveTo(x, y - 54, x - 34, y - 44); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 0.25; ctx.fillStyle = P.color; ctx.beginPath(); ctx.arc(x, y, 28 + Math.sin(this.t * 0.15) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.color; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    drawPowerIcon(ctx, this.type, x, y, 1);
  }
}

function drawPowerIcon(ctx, type, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (type) {
    case 'health': ctx.fillRect(-3.5, -10, 7, 20); ctx.fillRect(-10, -3.5, 20, 7); break;
    case 'rage':
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(10, -2, 6, 7); ctx.quadraticCurveTo(0, 12, -6, 7); ctx.quadraticCurveTo(-9, 0, -3, -4); ctx.quadraticCurveTo(-2, 2, 1, 2); ctx.quadraticCurveTo(3, -5, 0, -11); ctx.fill(); break;
    case 'speed': ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(-7, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 12); ctx.lineTo(7, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill(); break;
    case 'shield': ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, -6); ctx.quadraticCurveTo(9, 6, 0, 11); ctx.quadraticCurveTo(-9, 6, -9, -6); ctx.closePath(); ctx.stroke(); break;
    case 'giant': ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, -1); ctx.lineTo(3, -1); ctx.lineTo(3, 10); ctx.lineTo(-3, 10); ctx.lineTo(-3, -1); ctx.lineTo(-9, -1); ctx.closePath(); ctx.fill(); break;
    case 'bomb': ctx.beginPath(); ctx.arc(-1, 2, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.5; line(ctx, [3, -4], [7, -10]); ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.arc(8, -11, 2.5, 0, Math.PI * 2); ctx.fill(); break;
  }
  ctx.restore();
}

// ------------------------------- Game --------------------------------------
class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.dpr = 1; this.onEnd = null; this.paused = false;
  }
  start(setup) {
    this.opts = setup;
    this.stage = setup.stage;
    this.fx = new FX(); this.projs = []; this.ragdolls = []; this.powers = [];
    this.frame = 0; this.time = 0; this.freeze = 0; this.focus = null;
    this.shake = 0; this.flashA = 0; this.banner = null;
    this.phase = 'countdown'; this.phaseT = 0; this.winner = null;
    this.powerT = rint(360, 540);
    this.fighters = setup.players.map((p, i) => {
      const ctrl = p.ctrl === 'cpu' ? new CpuCtrl(p.level) : new HumanCtrl(p.ctrl, p.ctrl === 'p1' ? 0 : 1, p.ctrl === 'p1');
      return new Fighter(this, i, CHARS[p.char], ctrl, { color: p.color, label: p.label, human: p.ctrl !== 'cpu', name: p.name, look: p.look });
    });
    this.cam = { x: this.stage.center, y: 470, z: 0.85 };
    this.bg = makeBackground(this.stage);
    if (setup.demo) { this.phase = 'fight'; }
  }
  // --- queries used by fighters, projectiles and the CPU ---
  groundBelow(x, y) {
    let best = null;
    for (const p of this.stage.plats) if (x >= p.x && x <= p.x + p.w && p.y >= y && (!best || p.y < best.y)) best = p;
    return best;
  }
  solidAt(x, y) {
    for (const p of this.stage.plats) if (p.solid && x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return true;
    return false;
  }
  nearestSolid(x) {
    let best = null, bd = 1e9;
    for (const p of this.stage.plats) { if (!p.solid) continue; const d = Math.abs(p.x + p.w / 2 - x); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  addProj(p) { this.projs.push(p); }
  boomFx(x, y, r) {
    this.fx.ring(x, y, 10, r * 1.2, '#ffb703', 0.35, 10);
    this.fx.star(x, y, r * 0.8, '#ffd166', 0.16);
    this.fx.smoke(x, y, 10, 200); this.fx.sparks(x, y, 14, '#ff8c1a', 900);
    this.shake = Math.max(this.shake, 12); Sfx.play('boom');
  }
  setBanner(text, color, dur = 60, size = 130) { this.banner = { text, color, t: 0, dur, size }; }

  // --- combat ---
  hit(att, vic, spec, hx, hy, dirX, fromProj) {
    if (vic.dead || vic.isInvuln()) return false;
    const vm = vic.move;
    if (vm && vm.def.counter && vm.phase === 'active' && att && att !== vic && !fromProj) { vic.counter(att); return true; }
    let dmg = spec.dmg * (att ? att.dmgMul() : 1);
    if (vic.shield > 0) {
      const ab = Math.min(vic.shield, dmg); vic.shield -= ab; dmg -= ab;
      this.fx.ring(vic.J.chest[0], vic.J.chest[1], 30, 70, POWERS.shield.color, 0.25, 6); Sfx.play('shield');
      if (vic.shield <= 0) { this.fx.sparks(vic.J.chest[0], vic.J.chest[1], 16, POWERS.shield.color, 700); this.fx.text(vic.x, vic.y - 130, 'SHIELD BREAK', POWERS.shield.color, 24); }
      if (dmg <= 0) { vic.vx += dirX * 200; vic.hitstop = 4; if (att && !fromProj) att.hitstop = 4; return true; }
    }
    vic.hp -= dmg; vic.flash = 10; vic.lastHitBy = att; vic.lastHitT = this.frame;
    if (att) att.stats.dmg += dmg;
    const missing = 1 - Math.max(0, vic.hp) / vic.maxHp;
    const kb = (spec.kb + spec.ks * missing * 1.6) / vic.weightMul();
    const ang = spec.ang * D2R;
    const kvx = Math.cos(ang) * kb * dirX, kvy = -Math.sin(ang) * kb;
    const hs = clamp(Math.round(3 + dmg * 0.55), 3, 14);
    this.fx.star(hx, hy, 14 + dmg * 2.2, dmg >= 12 ? '#ffd166' : '#fff');
    this.fx.sparks(hx, hy, 6 + Math.floor(dmg / 2), att ? att.c.color : '#ffd23f', 500 + dmg * 40, Math.atan2(kvy, kvx), 1.6);
    this.fx.text(hx + rand(-10, 10), hy - 20, Math.round(dmg).toString(), dmg >= 12 ? '#ffd166' : '#fff', 22 + Math.min(dmg, 20));
    this.shake = Math.max(this.shake, spec.shake || dmg * 0.55);
    if (vic.hp <= 0) {
      // Keep the body on screen: a strong, readable launch rather than a ring-out.
      vic.hp = 0;
      let rvx = kvx * 0.45 + dirX * 120, rvy = Math.min(kvy * 0.5, 0) - 420;
      const sp = Math.hypot(rvx, rvy), cap = 760;
      if (sp > cap) { rvx *= cap / sp; rvy *= cap / sp; }
      this.ko(vic, att, rvx, rvy, hx, hy);
      return true;
    }
    Sfx.play(dmg >= 12 ? 'bighit' : 'hit', 0.6 + dmg / 20);
    const armored = vm && vm.def.armor && vm.phase !== 'recovery';
    if (armored) { vic.hitstop = hs; this.fx.text(vic.x, vic.y - 130, 'ARMOR', vic.c.color, 22); }
    else {
      vic.move = null; vic.dodge = null; vic.hover = 0;
      vic.vx = kvx; vic.vy = kvy;
      if (vic.grounded && kvy > 0) vic.vy = -kvy * 0.5;
      if (vic.vy < 0) { vic.grounded = false; vic.plat = null; }
      vic.stun = Math.round(9 + kb * 0.024); vic.state = 'hitstun'; vic.tumble = kb > 700;
      vic.usedUp = false; vic.usedSide = false; vic.airDodged = false;
      vic.hitstop = hs;
    }
    if (att && !fromProj) att.hitstop = hs;
    return true;
  }
  ko(vic, att, vx, vy, hx, hy) {
    vic.dead = true; vic.stocks--; vic.stats.falls++;
    if (att && att !== vic) att.stats.kos++;
    const rd = new Ragdoll(this, vic, vx, vy, hx, hy);
    this.ragdolls.push(rd);
    if (this.ragdolls.length > 8) this.ragdolls.shift();
    this.freeze = 46; this.focus = rd; this.flashA = 0.55; this.shake = 22;
    this.fx.star(hx, hy, 70, '#fff', 0.25);
    this.fx.ink(hx, hy, 26, vx, vy, 420);
    this.fx.ring(hx, hy, 20, 220, att ? att.color : INK, 0.45, 12);
    this.setBanner('K.O.!', att ? att.color : '#e63946', 75);
    Sfx.play('bighit'); Sfx.play('ko');
    vic.respawnT = vic.stocks > 0 ? 170 : -1;
    vic.move = null; vic.dodge = null;
  }
  ringOut(f) {
    f.dead = true; f.stocks--; f.stats.falls++;
    const att = f.lastHitBy && this.frame - f.lastHitT < 600 ? f.lastHitBy : null;
    if (att && att !== f) att.stats.kos++;
    const b = this.stage.blast;
    const x = clamp(f.x, b.l + 60, b.r - 60), y = clamp(f.y - 40, b.t + 60, b.b - 60);
    const ang = Math.atan2(this.cam.y - y, this.cam.x - x);
    for (let i = 0; i < 3; i++) this.fx.ring(x, y, 10 + i * 20, 260 + i * 60, f.color, 0.6 + i * 0.1, 14 - i * 3);
    this.fx.sparks(x, y, 40, f.color, 1800, ang, 1.1, 6);
    this.fx.ink(x, y, 20, Math.cos(ang) * 900, Math.sin(ang) * 900, 300);
    this.shake = 24; this.flashA = 0.35;
    this.setBanner('RING OUT!', att ? att.color : f.color, 70);
    Sfx.play('boom'); Sfx.play('ko');
    f.respawnT = f.stocks > 0 ? 150 : -1;
  }

  resolveHits() {
    for (const a of this.fighters) {
      if (a.dead || !a.move || a.move.phase !== 'active') continue;
      const hbs = a.hitboxes();
      if (!hbs) continue;
      const m = a.move, d = m.def;
      for (const b of this.fighters) {
        if (b === a || b.dead) continue;
        const last = m.hits.get(b);
        if (last !== undefined && !(d.multi && m.t - last >= d.multi)) continue;
        let hp = null;
        for (const h of hbs) {
          for (const u of b.hurt()) if (Math.hypot(h[0] - u[0], h[1] - u[1]) < h[2] + u[2]) { hp = [(h[0] + u[0]) / 2, (h[1] + u[1]) / 2]; break; }
          if (hp) break;
        }
        if (!hp) continue;
        m.hits.set(b, m.t);
        const dirX = d.radial ? Math.sign(b.x - a.x) || a.facing : a.facing;
        this.hit(a, b, d, hp[0], hp[1], dirX, false);
        if (!a.move) break;
      }
      if (!a.move) continue;
      for (const r of this.ragdolls) {
        if (m.ragHit.has(r) || r.age < 0.25) continue;
        if (hbs.some((h) => r.p.some((p) => Math.hypot(h[0] - p.x, h[1] - p.y) < h[2] + 6))) {
          m.ragHit.add(r);
          const dirX = d.radial ? Math.sign(r.pelvis.x - a.x) || a.facing : a.facing;
          const k = d.kb + d.ks;
          r.impulse(Math.cos(d.ang * D2R) * k * dirX, -Math.abs(Math.sin(d.ang * D2R) * k) - 300);
          this.fx.star(r.pelvis.x, r.pelvis.y, 22, '#fff'); Sfx.play('thud', 1);
        }
      }
    }
    for (const p of this.projs) {
      if (p.dead) continue;
      for (const f of this.fighters) {
        if (f.dead || f === p.owner || p.hit.has(f)) continue;
        if (p.type === 'bomb' && !p.active) continue;
        const hp = p.hitTest(f);
        if (!hp) continue;
        if (p.type === 'bomb') { p.explode(); break; }
        p.hit.add(f);
        if (this.hit(p.owner, f, p.spec, hp[0], hp[1], p.dirX(f), true)) p.onHit();
        if (p.dead) break;
      }
      if (!p.dead && p.radial && p.t <= 3) {
        for (const r of this.ragdolls) {
          if (p.hit.has(r) || r.age < 0.25) continue;
          if (Math.hypot(r.pelvis.x - p.x, r.pelvis.y - p.y) < p.r + 40) { p.hit.add(r); r.impulse(Math.sign(r.pelvis.x - p.x) * 500, -700); }
        }
      }
    }
  }

  applyPower(f, pw) {
    const P = POWERS[pw.type];
    switch (pw.type) {
      case 'health': f.hp = Math.min(f.maxHp, f.hp + 35); break;
      case 'rage': f.buffs.rage = P.dur; break;
      case 'speed': f.buffs.speed = P.dur; break;
      case 'shield': f.shield = 40; break;
      case 'giant': f.buffs.giant = P.dur; break;
      case 'bomb': f.bombs = 3; break;
    }
    this.fx.ring(pw.x, pw.y, 10, 70, P.color, 0.35, 8);
    this.fx.sparks(pw.x, pw.y, 12, P.color, 500);
    this.fx.text(pw.x, pw.y - 40, (pw.type === 'health' ? '+35 HP' : P.name.toUpperCase()), P.color, 28);
    Sfx.play('power');
  }

  update() {
    this.frame++;
    const slow = this.freeze > 0 ? 0.3 : 1;
    const dt = DT * slow;
    this.time += dt;
    if (this.phase === 'countdown') {
      const t = this.phaseT++;
      if (t === 0) { this.setBanner('3', INK, 46, 170); Sfx.play('tick'); }
      if (t === 50) { this.setBanner('2', INK, 46, 170); Sfx.play('tick'); }
      if (t === 100) { this.setBanner('1', INK, 46, 170); Sfx.play('tick'); }
      if (t === 150) { this.setBanner('FIGHT!', '#e63946', 60, 160); Sfx.play('go'); this.phase = 'fight'; this.phaseT = 0; }
    }
    if (this.freeze > 0) this.freeze--;
    else {
      for (const f of this.fighters) f.update();
      this.resolveHits();
      for (const p of this.projs) p.update();
      this.projs = this.projs.filter((p) => !p.dead);
      if (this.opts.items && this.phase === 'fight' && --this.powerT <= 0) {
        this.powerT = rint(480, 780);
        if (this.powers.length < 2) {
          const pl = pick(this.stage.plats);
          this.powers.push(new Power(this, pick(Object.keys(POWERS)), pl.x + rand(30, pl.w - 30)));
        }
      }
      for (const pw of this.powers) {
        pw.update();
        if (pw.dead) continue;
        for (const f of this.fighters) {
          if (f.dead) continue;
          if (Math.hypot(f.x - pw.x, f.y - 45 * f.scale - pw.y) < 44 * f.scale) { this.applyPower(f, pw); pw.dead = true; break; }
        }
      }
      this.powers = this.powers.filter((p) => !p.dead);
      const b = this.stage.blast;
      for (const f of this.fighters) {
        if (f.dead) continue;
        if (f.x < b.l || f.x > b.r || f.y > b.b || (f.y < b.t && f.stun > 0)) this.ringOut(f);
      }
    }
    for (const r of this.ragdolls) r.update(dt);
    this.ragdolls = this.ragdolls.filter((r) => !r.gone);
    this.fx.update(dt);
    if (this.phase === 'fight') {
      const alive = this.fighters.filter((f) => f.stocks > 0);
      if (alive.length <= 1) {
        this.phase = 'over'; this.phaseT = 0; this.winner = alive[0] || null;
        this.freeze = Math.max(this.freeze, 60);
        this.setBanner('GAME!', '#e63946', 120, 170);
      }
    } else if (this.phase === 'over') {
      if (++this.phaseT === 190 && this.onEnd) this.onEnd(this);
    }
    if (this.banner && ++this.banner.t > this.banner.dur) this.banner = null;
    this.shake *= 0.86; if (this.shake < 0.3) this.shake = 0;
    this.flashA *= 0.88;
    this.updateCam();
  }

  updateCam() {
    const c = this.cam;
    let tx, ty, tz;
    if (this.freeze > 0 && this.focus && !this.focus.gone) {
      tx = this.focus.pelvis.x; ty = this.focus.pelvis.y - 20; tz = 1.25;
      c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12; c.z += (tz - c.z) * 0.08;
      return;
    }
    const pts = [];
    for (const f of this.fighters) if (!f.dead) pts.push([f.x, f.y - 50]);
    for (const r of this.ragdolls) if (r.age < 1.6) pts.push([r.pelvis.x, r.pelvis.y]);
    if (!pts.length) pts.push([this.stage.center, 500]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const bw = Math.max(x1 - x0 + 560, 1000), bh = Math.max(y1 - y0 + 420, 560);
    tz = clamp(Math.min(VW / bw, VH / bh), 0.5, 1.15);
    tx = clamp((x0 + x1) / 2, this.stage.center - 520, this.stage.center + 520);
    ty = clamp((y0 + y1) / 2 + 40, 160, 760);
    c.x += (tx - c.x) * 0.07; c.y += (ty - c.y) * 0.07; c.z += (tz - c.z) * 0.05;
  }

  // --- rendering ---
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    }
    this.dpr = dpr;
  }
  render() {
    this.resize();
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    // Portrait screens show a narrower slice of the arena so fighters stay readable.
    const base = Math.min(cw / (VW * (cw < ch ? 0.6 : 1)), ch / VH);
    const S = base * this.cam.z;
    const sx = this.shake ? rand(-this.shake, this.shake) * base : 0, sy = this.shake ? rand(-this.shake, this.shake) * base : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground(ctx, this, cw, ch, base);
    ctx.setTransform(S, 0, 0, S, cw / 2 - this.cam.x * S + sx, ch / 2 - this.cam.y * S + sy);
    drawPlatforms(ctx, this);
    for (const p of this.powers) p.draw(ctx);
    for (const r of this.ragdolls) r.draw(ctx);
    for (const f of this.fighters) f.draw(ctx);
    for (const p of this.projs) p.draw(ctx);
    this.fx.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.flashA > 0.02) { ctx.fillStyle = `rgba(255,255,255,${this.flashA})`; ctx.fillRect(0, 0, cw, ch); }
    if (this.freeze > 0 && this.focus) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.9);
      g.addColorStop(0, 'rgba(21,23,28,0)'); g.addColorStop(1, `rgba(21,23,28,${Math.min(0.35, this.freeze / 80)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (!this.opts.demo) drawHUD(ctx, this, cw, ch);
    drawBanner(ctx, this, cw, ch);
  }
}

// ---------------------------- Backgrounds ----------------------------------
function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function makeBackground(stage) {
  const r = seeded(stage.id.length * 9973 + 17);
  const bg = { clouds: [], ridges: [], doodles: [] };
  for (let i = 0; i < 9; i++) bg.clouds.push({ x: -600 + i * 380 + r() * 200, y: 60 + r() * 260, s: 0.6 + r() * 0.8, sp: 4 + r() * 8 });
  for (let l = 0; l < 3; l++) {
    const pts = []; let x = -1400;
    while (x < 3000) { pts.push([x, 420 + l * 90 - r() * (220 - l * 50)]); x += 90 + r() * 160; }
    bg.ridges.push(pts);
  }
  for (let i = 0; i < 6; i++) bg.doodles.push({ x: -300 + i * 420 + r() * 140, y: 120 + r() * 300, k: Math.floor(r() * 3), s: 0.8 + r() * 0.5, rot: r() * 0.6 - 0.3 });
  return bg;
}

// Sets a transform for a background layer that scrolls at fraction p of the camera.
function layer(ctx, g, cw, ch, base, p) {
  const z = base * lerp(1, g.cam.z, p);
  const cx = lerp(g.stage.center, g.cam.x, p), cy = lerp(470, g.cam.y, p);
  ctx.setTransform(z, 0, 0, z, cw / 2 - cx * z, ch / 2 - cy * z);
}

function cloud(ctx, x, y, s, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, 34 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 40 * s, y - 26 * s, 38 * s, Math.PI, Math.PI * 1.85);
  ctx.arc(x + 92 * s, y - 14 * s, 30 * s, Math.PI * 1.2, Math.PI * 1.95);
  ctx.arc(x + 112 * s, y + 4 * s, 30 * s, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}

function drawBackground(ctx, g, cw, ch, base) {
  const th = g.stage.theme, bg = g.bg, t = g.time;
  if (th === 'paper') {
    ctx.fillStyle = '#f7f8fb'; ctx.fillRect(0, 0, cw, ch);
    layer(ctx, g, cw, ch, base, 0.45);
    ctx.strokeStyle = '#c7d7ef'; ctx.lineWidth = 2;
    for (let y = -800; y < 1800; y += 46) line(ctx, [-2000, y], [3600, y]);
    ctx.strokeStyle = '#f0a3a3'; ctx.lineWidth = 3; line(ctx, [120, -1000], [120, 2000]); line(ctx, [128, -1000], [128, 2000]);
    ctx.fillStyle = '#e4e8ef';
    for (const y of [120, 470, 820]) { ctx.beginPath(); ctx.arc(50, y, 22, 0, Math.PI * 2); ctx.fill(); }
    // Doodles in the margins: a sun, little houses, scribbled clouds.
    ctx.strokeStyle = 'rgba(40,60,120,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(1380, 130, 44, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.2; line(ctx, [1380 + Math.cos(a) * 58, 130 + Math.sin(a) * 58], [1380 + Math.cos(a) * 78, 130 + Math.sin(a) * 78]); }
    for (const c of bg.clouds.slice(0, 5)) cloud(ctx, ((c.x + t * c.sp) % 2600) - 500, c.y * 0.7, c.s * 0.8, 'rgba(255,255,255,0)', 'rgba(40,60,120,0.25)');
    for (const d of bg.doodles) {
      ctx.save(); ctx.translate(d.x, d.y + 380); ctx.rotate(d.rot); ctx.scale(d.s, d.s);
      ctx.strokeStyle = 'rgba(40,60,120,0.22)'; ctx.lineWidth = 3;
      if (d.k === 0) { line(ctx, [-30, 0], [-30, -40], [0, -64], [30, -40], [30, 0], [-30, 0]); line(ctx, [-8, 0], [-8, -20], [8, -20], [8, 0]); }
      else if (d.k === 1) { line(ctx, [0, 0], [0, -60]); ctx.beginPath(); ctx.arc(0, -78, 26, 0, Math.PI * 2); ctx.stroke(); }
      else { line(ctx, [-40, 0], [-20, -30], [0, 0], [20, -30], [40, 0]); }
      ctx.restore();
    }
  } else if (th === 'sunset') {
    const gr = ctx.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, '#ffd89a'); gr.addColorStop(0.45, '#ff9a76'); gr.addColorStop(1, '#a8679b');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
    layer(ctx, g, cw, ch, base, 0.08);
    ctx.fillStyle = 'rgba(255,244,214,0.55)'; ctx.beginPath(); ctx.arc(820, 300, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3d1'; ctx.beginPath(); ctx.arc(820, 300, 130, 0, Math.PI * 2); ctx.fill();
    const cols = ['#e89a9a', '#c4738f', '#8a557f'];
    bg.ridges.forEach((pts, i) => {
      layer(ctx, g, cw, ch, base, 0.2 + i * 0.18);
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(pts[0][0], 2000);
      for (const p of pts) ctx.lineTo(p[0], p[1] + 160 + i * 40);
      ctx.lineTo(pts[pts.length - 1][0], 2000); ctx.closePath(); ctx.fill();
    });
    layer(ctx, g, cw, ch, base, 0.3);
    for (const c of bg.clouds.slice(0, 6)) cloud(ctx, ((c.x + t * c.sp * 2) % 2800) - 600, c.y * 0.6, c.s, 'rgba(255,226,200,0.55)');
  } else {
    const gr = ctx.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, '#bfe6fb'); gr.addColorStop(1, '#f2fbff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
    layer(ctx, g, cw, ch, base, 0.15);
    ctx.fillStyle = '#d6ecf7';
    for (let i = 0; i < 7; i++) { const x = -300 + i * 380; ctx.fillRect(x, 260, 46, 900); ctx.fillRect(x - 12, 250, 70, 16); }
    ctx.fillRect(-400, 240, 3000, 14);
    layer(ctx, g, cw, ch, base, 0.32);
    for (const c of bg.clouds) cloud(ctx, ((c.x + t * c.sp * 3) % 3000) - 700, c.y + 300, c.s * 1.3, 'rgba(255,255,255,0.9)');
  }
}

function drawPlatforms(ctx, g) {
  const th = g.stage.theme;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const p of g.stage.plats) {
    if (th === 'paper') {
      if (p.solid) {
        // A closed hardback notebook.
        ctx.fillStyle = '#fbf7ee'; ctx.fillRect(p.x + 6, p.y + 8, p.w - 12, p.h - 14);
        ctx.strokeStyle = '#cfc6b3'; ctx.lineWidth = 1.5;
        for (let y = p.y + 14; y < p.y + p.h - 8; y += 5) line(ctx, [p.x + 8, y], [p.x + p.w - 8, y]);
        ctx.fillStyle = '#2f4a7a'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, 12, 4); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(p.x, p.y + p.h - 10, p.w, 12, 4); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(p.x - 6, p.y, 18, p.h + 2, 6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(p.x + 6, p.y + 8, p.w - 12, p.h - 14);
        ctx.fillStyle = '#f2c14e'; ctx.fillRect(p.x + p.w * 0.6, p.y - 2, 26, 14);
      } else {
        // A pencil.
        const y = p.y, h = 16, x0 = p.x, x1 = p.x + p.w;
        ctx.fillStyle = '#f5c242'; ctx.fillRect(x0 + 34, y, p.w - 70, h);
        ctx.fillStyle = '#e0a92c'; ctx.fillRect(x0 + 34, y + h * 0.62, p.w - 70, h * 0.38);
        ctx.fillStyle = '#f29ab0'; ctx.fillRect(x0, y, 20, h);
        ctx.fillStyle = '#b7bcc6'; ctx.fillRect(x0 + 20, y, 14, h);
        ctx.fillStyle = '#efd3a8'; ctx.beginPath(); ctx.moveTo(x1 - 36, y); ctx.lineTo(x1, y + h / 2); ctx.lineTo(x1 - 36, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x1 - 12, y + h / 2 - 4); ctx.lineTo(x1, y + h / 2); ctx.lineTo(x1 - 12, y + h / 2 + 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x1 - 36, y); ctx.lineTo(x1, y + h / 2); ctx.lineTo(x1 - 36, y + h); ctx.lineTo(x0 + 4, y + h); ctx.quadraticCurveTo(x0 - 2, y + h / 2, x0 + 4, y); ctx.stroke();
        line(ctx, [x0 + 20, y], [x0 + 20, y + h]); line(ctx, [x0 + 34, y], [x0 + 34, y + h]);
      }
    } else if (th === 'sunset') {
      if (p.solid) {
        ctx.fillStyle = '#3d2b4a'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w - 20, p.y + p.h);
        ctx.lineTo(p.x + p.w * 0.72, p.y + p.h + 70); ctx.lineTo(p.x + p.w * 0.5, p.y + p.h + 150); ctx.lineTo(p.x + p.w * 0.3, p.y + p.h + 80); ctx.lineTo(p.x + 20, p.y + p.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e9875f'; ctx.beginPath(); ctx.roundRect(p.x - 4, p.y - 2, p.w + 8, 14, 6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
        for (let i = 1; i < 6; i++) line(ctx, [p.x + p.w * i / 6, p.y + 22], [p.x + p.w * i / 6 - 14, p.y + p.h - 8]);
      } else {
        ctx.fillStyle = '#8a5a3c'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, 14, 4); ctx.fill(); ctx.stroke();
        for (let x = p.x + 30; x < p.x + p.w; x += 40) line(ctx, [x, p.y + 2], [x, p.y + 12]);
        line(ctx, [p.x + 14, p.y + 14], [p.x + 14, p.y + 40]); line(ctx, [p.x + p.w - 14, p.y + 14], [p.x + p.w - 14, p.y + 40]);
      }
    } else {
      if (p.solid) {
        ctx.fillStyle = '#fbfaf6'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d9a441'; ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, 8);
        ctx.strokeStyle = 'rgba(21,23,28,0.18)'; ctx.lineWidth = 2;
        for (let x = p.x + 40; x < p.x + p.w - 20; x += 60) line(ctx, [x, p.y + 18], [x, p.y + p.h - 8]);
        for (const cx of [p.x + 50, p.x + p.w - 90]) {
          ctx.fillStyle = '#eef0ec'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx, p.y + p.h); ctx.lineTo(cx + 40, p.y + p.h); ctx.lineTo(cx + 30, p.y + p.h + 120); ctx.lineTo(cx + 10, p.y + p.h + 120); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#eef0ec'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, 16, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d9a441'; ctx.fillRect(p.x + 4, p.y + 3, p.w - 8, 4);
      }
    }
  }
}

// --------------------------------- HUD -------------------------------------
function hpColor(f) { const r = f.hp / f.maxHp; return r > 0.5 ? '#25a865' : r > 0.25 ? '#f0b400' : '#e63946'; }

function drawHUD(ctx, g, cw, ch) {
  const n = g.fighters.length;
  const fit = (cols) => clamp(Math.min(cw / (cols * 270 + 80), ch / 700), 0.4, 1.6);
  // Five or six fighters wrap onto two rows when one row would get cramped.
  const cols = n > 4 && fit(n) < 0.8 ? Math.ceil(n / 2) : n;
  const rows = Math.ceil(n / cols);
  const s = fit(cols);
  const cardW = 250 * s, cardH = 78 * s, gap = 14 * s;
  g.fighters.forEach((f, i) => {
    const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
    const x = (cw - (inRow * cardW + (inRow - 1) * gap)) / 2 + (i % cols) * (cardW + gap);
    const y = ch - 16 * s - (rows - row) * cardH - (rows - row - 1) * gap * 0.7;
    const out = f.stocks <= 0;
    ctx.globalAlpha = out ? 0.45 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 10 * s); ctx.fill(); ctx.stroke();
    // Portrait chip.
    const px = x + 34 * s, py = y + cardH / 2;
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(px, py, 24 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py - 6 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 4 * s; line(ctx, [px, py], [px, py + 14 * s]);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${13 * s}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(f.label, px, py + 21 * s);
    // Name.
    ctx.textAlign = 'left'; ctx.fillStyle = INK;
    // Shrink long custom names so they never run into the HP readout.
    let fs = 22 * s;
    ctx.font = `${fs}px "Permanent Marker", cursive`;
    const room = cardW - 66 * s - 78 * s, tw = ctx.measureText(f.name).width;
    if (tw > room) { fs *= room / tw; ctx.font = `${fs}px "Permanent Marker", cursive`; }
    ctx.fillText(f.name, x + 66 * s, y + 27 * s);
    ctx.font = `600 ${14 * s}px "Barlow Condensed", sans-serif`; ctx.fillStyle = '#5a6070';
    ctx.textAlign = 'right'; ctx.fillText(out ? 'OUT' : f.dead ? 'RESPAWNING' : `${Math.ceil(f.hp)} HP`, x + cardW - 12 * s, y + 26 * s);
    // HP bar.
    const bx = x + 66 * s, by = y + 36 * s, bw = cardW - 80 * s, bh = 14 * s;
    ctx.fillStyle = '#e4e7ec'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4 * s); ctx.fill();
    const hpw = (bw * Math.max(0, f.hp)) / f.maxHp, dw = (bw * Math.max(0, f.dispHp)) / f.maxHp;
    if (dw > hpw) { ctx.fillStyle = '#ffb3b3'; ctx.fillRect(bx + hpw, by, dw - hpw, bh); }
    ctx.fillStyle = hpColor(f); if (hpw > 0) { ctx.beginPath(); ctx.roundRect(bx, by, hpw, bh, 4 * s); ctx.fill(); }
    if (f.shield > 0) { ctx.fillStyle = 'rgba(58,134,255,0.55)'; ctx.fillRect(bx, by, (bw * f.shield) / f.maxHp, bh * 0.4); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4 * s); ctx.stroke();
    // Stocks.
    for (let i = 0; i < g.opts.stocks; i++) {
      ctx.fillStyle = i < f.stocks ? INK : '#d4d8df';
      ctx.beginPath(); ctx.arc(bx + 7 * s + i * 17 * s, by + bh + 14 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
    }
    // Buffs.
    let ix = x + cardW - 20 * s;
    const buffs = [];
    if (f.buffs.rage > 0) buffs.push(['rage', f.buffs.rage / POWERS.rage.dur]);
    if (f.buffs.speed > 0) buffs.push(['speed', f.buffs.speed / POWERS.speed.dur]);
    if (f.buffs.giant > 0) buffs.push(['giant', f.buffs.giant / POWERS.giant.dur]);
    if (f.bombs > 0) buffs.push(['bomb', f.bombs / 3]);
    for (const [k, r] of buffs) {
      const cy = by + bh + 14 * s;
      ctx.fillStyle = POWERS[k].color; ctx.beginPath(); ctx.arc(ix, cy, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(ix, cy, 11 * s, -Math.PI / 2, -Math.PI / 2 + r * Math.PI * 2); ctx.stroke();
      drawPowerIcon(ctx, k, ix, cy, 0.55 * s);
      ix -= 26 * s;
    }
    ctx.globalAlpha = 1;
  });
}

function drawBanner(ctx, g, cw, ch) {
  const b = g.banner;
  if (!b) return;
  const base = Math.min(cw / VW, ch / VH);
  const t = b.t;
  const pop = t < 8 ? 1.5 - 0.5 * easeOut(t / 8) : 1;
  const a = t > b.dur - 12 ? (b.dur - t) / 12 : 1;
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.translate(cw / 2, ch * 0.36);
  ctx.scale(pop * base, pop * base);
  ctx.rotate(-0.05);
  ctx.font = `${b.size}px "Permanent Marker", "Comic Sans MS", cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 22; ctx.strokeStyle = '#fff'; ctx.strokeText(b.text, 0, 0);
  ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.strokeText(b.text, 0, 0);
  ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
  ctx.restore();
}
