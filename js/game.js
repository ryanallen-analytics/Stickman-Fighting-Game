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
      const range = f.c.ai.range * (f.c.reach || 1) * f.scale + 20;
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
      return new Fighter(this, i, makeLoadout(CHARS[p.char], p.weapon), ctrl, { color: p.color, label: p.label, human: p.ctrl !== 'cpu', name: p.name, look: p.look });
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
    const cam = this.stage.cam;
    const bw = Math.max(x1 - x0 + 560, cam.minW), bh = Math.max(y1 - y0 + 420, 560);
    tz = clamp(Math.min(VW / bw, VH / bh), cam.zMin, cam.zMax);
    tx = clamp((x0 + x1) / 2, this.stage.center - cam.x, this.stage.center + cam.x);
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
// Flat Flash-style scenery: bold fills, dark outlines, a few parallax layers.
function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function makeBackground(stage) {
  const r = seeded(stage.id.length * 9973 + 17);
  return { r: Array.from({ length: 400 }, () => r()) };
}

// Sets a transform for a background layer that scrolls at fraction p of the camera.
function layer(ctx, g, cw, ch, base, p) {
  const z = base * lerp(1, g.cam.z, p);
  const cx = lerp(g.stage.center, g.cam.x, p), cy = lerp(470, g.cam.y, p);
  ctx.setTransform(z, 0, 0, z, cw / 2 - cx * z, ch / 2 - cy * z);
}
function outlined(ctx, fill, lw = 3) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
function box(ctx, x, y, w, h, fill, lw = 3) { ctx.beginPath(); ctx.rect(x, y, w, h); outlined(ctx, fill, lw); }
function vgrad(ctx, ch, stops) {
  const gr = ctx.createLinearGradient(0, 0, 0, ch);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
// Overlapping circles stroked first, then filled, read as one outlined blob.
function blobs(ctx, circles, fill, lw = 4) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw * 2;
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = fill;
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
}
function star5(ctx, x, y, r, rot, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); outlined(ctx, fill, 2.5);
}
function glyph(ctx, ch, x, y, size, color) {
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Noto Serif CJK JP", serif`;
  ctx.fillText(ch, x, y);
}

function drawBackground(ctx, g, cw, ch, base) {
  const th = g.stage.theme;
  if (th === 'bath') bgBath(ctx, g, cw, ch, base);
  else if (th === 'grove') bgGrove(ctx, g, cw, ch, base);
  else bgShrine(ctx, g, cw, ch, base);
}
function drawPlatforms(ctx, g) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const th = g.stage.theme;
  for (const p of g.stage.plats) {
    if (th === 'bath') platBath(ctx, p, g);
    else if (th === 'grove') platGrove(ctx, p, g);
    else platShrine(ctx, p, g);
  }
}

// --- Bathhouse: tiled room, rising-sun mountain mural, steaming tub. ---
function bgBath(ctx, g, cw, ch, base) {
  const t = g.time, R = g.bg.r;
  ctx.fillStyle = '#efe7c3'; ctx.fillRect(0, 0, cw, ch);
  layer(ctx, g, cw, ch, base, 0.55);
  // Ceiling tiles.
  box(ctx, -1400, -900, 3800, 1000, '#f3eedc', 0);
  ctx.strokeStyle = '#ddd5b5'; ctx.lineWidth = 2;
  for (let x = -1400; x < 2400; x += 40) line(ctx, [x, -900], [x, 100]);
  for (let y = -900; y < 100; y += 30) line(ctx, [-1400, y], [2400, y]);
  // Wall tiles.
  box(ctx, -1400, 100, 3800, 470, '#e3e4b6', 0);
  ctx.strokeStyle = '#cfd09a'; ctx.lineWidth = 2;
  for (let x = -1400; x < 2400; x += 34) line(ctx, [x, 100], [x, 570]);
  for (let y = 100; y < 570; y += 34) line(ctx, [-1400, y], [2400, y]);
  box(ctx, -1400, 96, 3800, 10, '#c9b98a', 3);
  // Mural: rising sun on the left, blue tiles on the right, a mountain between.
  ctx.save(); ctx.beginPath(); ctx.rect(360, 140, 440, 280); ctx.clip();
  ctx.fillStyle = '#f7c64a'; ctx.fillRect(360, 140, 440, 280);
  ctx.fillStyle = '#e5402f';
  for (let i = 0; i < 16; i += 2) {
    const a0 = -Math.PI + (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 8;
    ctx.beginPath(); ctx.moveTo(560, 330); ctx.lineTo(560 + Math.cos(a0) * 600, 330 + Math.sin(a0) * 600); ctx.lineTo(560 + Math.cos(a1) * 600, 330 + Math.sin(a1) * 600); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(560, 330, 78, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#7d97dc'; ctx.fillRect(800, 140, 440, 280);
  ctx.strokeStyle = '#a2b5ea'; ctx.lineWidth = 2;
  for (let x = 800; x <= 1240; x += 40) line(ctx, [x, 140], [x, 420]);
  for (let y = 140; y <= 420; y += 40) line(ctx, [800, y], [1240, y]);
  ctx.beginPath(); ctx.moveTo(600, 400); ctx.lineTo(790, 186); ctx.lineTo(830, 186); ctx.lineTo(1030, 400); ctx.closePath(); outlined(ctx, '#6a4c9c', 3);
  ctx.beginPath(); ctx.moveTo(735, 248); ctx.lineTo(790, 186); ctx.lineTo(830, 186); ctx.lineTo(885, 248); ctx.lineTo(860, 262); ctx.lineTo(840, 238); ctx.lineTo(818, 266); ctx.lineTo(796, 240); ctx.lineTo(772, 264); ctx.lineTo(752, 244); ctx.closePath(); outlined(ctx, '#ffffff', 3);
  ctx.beginPath(); ctx.moveTo(540, 372);
  for (let x = 540; x <= 1120; x += 40) ctx.quadraticCurveTo(x + 20, 348 + (x % 80 ? 8 : -6), x + 40, 372);
  ctx.lineTo(1120, 396); ctx.lineTo(540, 396); ctx.closePath(); outlined(ctx, '#e9edff', 3);
  ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeRect(360, 140, 880, 280);
  // Stone tub with water and steam.
  box(ctx, 420, 430, 760, 110, '#b9b6ae', 4);
  ctx.strokeStyle = '#9d9a92'; ctx.lineWidth = 2;
  for (let y = 458; y < 540; y += 28) line(ctx, [420, y], [1180, y]);
  for (let x = 460; x < 1180; x += 80) line(ctx, [x, 430], [x, 540]);
  box(ctx, 410, 418, 780, 16, '#dedbd2', 4);
  ctx.fillStyle = '#8fd0ea'; ctx.fillRect(416, 410, 768, 9);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  for (let x = 440; x < 1160; x += 70) line(ctx, [x + Math.sin(t * 2 + x) * 6, 414], [x + 26 + Math.sin(t * 2 + x) * 6, 414]);
  for (let i = 0; i < 7; i++) {
    const k = ((t * 0.35 + R[i]) % 1);
    ctx.globalAlpha = 0.45 * (1 - k);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(470 + i * 110 + Math.sin(t + i) * 14, 400 - k * 260, 26 + k * 30, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Noren curtain on the left, paper lantern on the right.
  box(ctx, 150, 106, 160, 330, '#ef7a2a', 4);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; line(ctx, [203, 300], [203, 436]); line(ctx, [256, 300], [256, 436]);
  ctx.beginPath(); ctx.arc(230, 220, 44, 0, Math.PI * 2); outlined(ctx, '#ffffff', 3);
  glyph(ctx, 'ゆ', 230, 222, 54, '#ef7a2a');
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; line(ctx, [1390, 106], [1390, 138]);
  ctx.beginPath(); ctx.ellipse(1390, 272, 78, 128, 0, 0, Math.PI * 2); outlined(ctx, '#d8332a', 4);
  ctx.strokeStyle = '#a8231d'; ctx.lineWidth = 2.5;
  for (let y = 172; y < 380; y += 24) { const w = 78 * Math.sqrt(1 - ((y - 272) / 128) ** 2); line(ctx, [1390 - w, y], [1390 + w, y]); }
  glyph(ctx, '湯', 1390, 276, 80, '#ffffff');
  box(ctx, 1340, 138, 100, 18, '#2b2d36', 3); box(ctx, 1340, 390, 100, 18, '#2b2d36', 3);
  // The hot pool the deck sits over: falling off means a dunk.
  box(ctx, -1400, 560, 3800, 900, '#e3e4b6', 0);
  layer(ctx, g, cw, ch, base, 0.8);
  ctx.fillStyle = '#6dbbd6'; ctx.fillRect(-1400, 700, 3800, 1200);
  ctx.fillStyle = '#4f9fc2'; ctx.fillRect(-1400, 860, 3800, 1100);
  box(ctx, -1400, 688, 3800, 16, '#dedbd2', 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const x = -600 + R[i + 300] * 2800 + Math.sin(t * 1.5 + i) * 12, y = 730 + R[i + 330] * 260;
    line(ctx, [x, y], [x + 30 + R[i + 360] * 30, y]);
  }
  for (let i = 0; i < 6; i++) {
    const k = ((t * 0.3 + R[i + 380]) % 1);
    ctx.globalAlpha = 0.35 * (1 - k);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(200 + i * 240 + Math.sin(t + i) * 20, 690 - k * 220, 30 + k * 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function platBath(ctx, p, g) {
  if (p.solid) {
    for (const x of [p.x + 30, p.x + p.w / 2, p.x + p.w - 30]) box(ctx, x - 13, p.y + p.h, 26, 120, '#7a5230', 3);
    box(ctx, p.x + 20, p.y + p.h + 90, p.w - 40, 16, '#8a5f38', 3);
    box(ctx, p.x, p.y + 12, p.w, p.h - 12, '#b98a52', 4);
    ctx.strokeStyle = '#94683a'; ctx.lineWidth = 2.5;
    for (let x = p.x + 44; x < p.x + p.w; x += 44) line(ctx, [x, p.y + 16], [x, p.y + p.h - 4]);
    box(ctx, p.x - 6, p.y, p.w + 12, 14, '#e9d39a', 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; line(ctx, [p.x + 4, p.y + 4], [p.x + p.w - 4, p.y + 4]);
  } else {
    ctx.strokeStyle = '#6b4a2f'; ctx.lineWidth = 3;
    line(ctx, [p.x + 16, p.y], [p.x + 16, p.y - 700]); line(ctx, [p.x + p.w - 16, p.y], [p.x + p.w - 16, p.y - 700]);
    box(ctx, p.x, p.y, p.w, 15, '#c89a5c', 3);
    ctx.strokeStyle = '#94683a'; ctx.lineWidth = 2; line(ctx, [p.x + 6, p.y + 10], [p.x + p.w - 6, p.y + 10]);
  }
}

// --- Dream Grove: pastel sky, stars, a giant sleepy tree, a grassy island. ---
function bgGrove(ctx, g, cw, ch, base) {
  const t = g.time, R = g.bg.r;
  ctx.fillStyle = vgrad(ctx, ch, [[0, '#9fdcff'], [0.6, '#d9ccff'], [1, '#ffe3f1']]); ctx.fillRect(0, 0, cw, ch);
  layer(ctx, g, cw, ch, base, 0.08);
  for (const [col, y0, amp, k] of [['#c7ecbd', 560, 50, 0.004], ['#a6dc9d', 610, 40, 0.006]]) {
    ctx.beginPath(); ctx.moveTo(-1400, 1500);
    for (let x = -1400; x <= 3000; x += 40) ctx.lineTo(x, y0 - Math.sin(x * k + y0) * amp);
    ctx.lineTo(3000, 1500); ctx.closePath(); outlined(ctx, col, 3);
  }
  layer(ctx, g, cw, ch, base, 0.12);
  const starCols = ['#ffd84a', '#ff8fc8', '#b48cff'];
  for (let i = 0; i < 16; i++) {
    const x = -300 + R[i] * 2200, y = -150 + R[i + 20] * 520;
    star5(ctx, x, y + Math.sin(t * 1.2 + i) * 8, 9 + R[i + 40] * 8 + Math.sin(t * 3 + i) * 1.5, t * 0.3 + i, starCols[i % 3]);
  }
  layer(ctx, g, cw, ch, base, 0.3);
  for (const x of [130, 1470]) {
    ctx.beginPath(); ctx.moveTo(x - 38, 760); ctx.lineTo(x - 30, 240); ctx.lineTo(x + 30, 240); ctx.lineTo(x + 38, 760); ctx.closePath(); outlined(ctx, '#b8783f', 4);
    ctx.strokeStyle = '#94602f'; ctx.lineWidth = 3; line(ctx, [x - 10, 300], [x - 14, 700]); line(ctx, [x + 12, 330], [x + 16, 620]);
    blobs(ctx, [[x - 80, 220, 80], [x + 70, 210, 86], [x, 140, 100], [x - 20, 260, 70], [x + 30, 270, 70]], '#3fae4a');
    ctx.fillStyle = '#6ccf5c';
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x - 90 + R[i + 60] * 180, 120 + R[i + 80] * 150, 7, 0, Math.PI * 2); ctx.fill(); }
  }
  layer(ctx, g, cw, ch, base, 0.5);
  ctx.beginPath(); ctx.moveTo(640, 720); ctx.lineTo(690, 290); ctx.lineTo(910, 290); ctx.lineTo(960, 720); ctx.closePath(); outlined(ctx, '#a96a35', 5);
  ctx.strokeStyle = '#8a552a'; ctx.lineWidth = 4;
  for (const x of [700, 735, 870, 905]) line(ctx, [x, 320], [x + (x < 800 ? -12 : 12), 680]);
  // The tree's face: blinks every few seconds.
  const blink = (t % 4.2) < 0.14;
  for (const ex of [748, 852]) {
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; line(ctx, [ex - 16, 440], [ex + 16, 440]); }
    else {
      ctx.beginPath(); ctx.ellipse(ex, 440, 15, 24, 0, 0, Math.PI * 2); outlined(ctx, '#2a1a10', 3);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 4, 430, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.beginPath(); ctx.arc(800, 482, 16, 0, Math.PI * 2); outlined(ctx, '#b97a40', 3);
  ctx.beginPath(); ctx.ellipse(800, 532, 26 + Math.sin(t * 1.5) * 3, 14 + Math.sin(t * 1.5) * 4, 0, 0, Math.PI * 2); outlined(ctx, '#3a1f10', 3);
  const canopy = [];
  for (let i = 0; i < 14; i++) canopy.push([520 + R[i + 100] * 560, 110 + R[i + 120] * 200, 70 + R[i + 140] * 50]);
  canopy.push([800, 160, 150], [640, 230, 100], [960, 230, 100]);
  blobs(ctx, canopy, '#2f9e44', 5);
  ctx.fillStyle = '#45b84f';
  for (const [x, y, r] of canopy) { ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7fda6c';
  for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc(540 + R[i + 160] * 520, 60 + R[i + 190] * 230, 6, 0, Math.PI * 2); ctx.fill(); }
  layer(ctx, g, cw, ch, base, 0.82);
  for (const [x0, x1] of [[370, 650], [950, 1230]]) {
    const b = [];
    for (let x = x0; x <= x1; x += 40) b.push([x, 610 - (x % 80 ? 10 : 0), 38]);
    blobs(ctx, b, '#3c9a3f', 3.5);
    for (let i = 0; i < 10; i++) {
      const fx = x0 + R[i + 220 + (x0 > 800 ? 10 : 0)] * (x1 - x0), fy = 590 + R[i + 240] * 30;
      ctx.fillStyle = i % 2 ? '#ff8fb8' : '#ffffff'; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function platGrove(ctx, p, g) {
  const R = g.bg.r;
  if (p.solid) {
    const x0 = p.x, x1 = p.x + p.w, cx = p.x + p.w / 2;
    ctx.beginPath(); ctx.moveTo(x0, p.y + 24); ctx.lineTo(x1, p.y + 24); ctx.lineTo(x1 - 40, p.y + 100); ctx.lineTo(x1 - 150, p.y + 160);
    ctx.lineTo(cx, p.y + 200); ctx.lineTo(x0 + 150, p.y + 160); ctx.lineTo(x0 + 40, p.y + 100); ctx.closePath(); outlined(ctx, '#d39b55', 4);
    ctx.strokeStyle = '#b97f3f'; ctx.lineWidth = 3;
    for (const [y, inset] of [[p.y + 70, 40], [p.y + 120, 110], [p.y + 160, 200]]) {
      ctx.beginPath(); ctx.moveTo(x0 + inset, y);
      for (let x = x0 + inset; x <= x1 - inset; x += 60) ctx.quadraticCurveTo(x + 30, y + 8, x + 60, y);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.roundRect(x0 - 8, p.y - 4, p.w + 16, 34, 14); outlined(ctx, '#5cc84a', 4);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x0 - 6, p.y - 2, p.w + 12, 30, 13); ctx.clip();
    ctx.fillStyle = '#6fd65a';
    for (let x = x0 - 40; x < x1 + 40; x += 60) { ctx.beginPath(); ctx.moveTo(x, p.y - 4); ctx.lineTo(x + 30, p.y - 4); ctx.lineTo(x + 10, p.y + 32); ctx.lineTo(x - 20, p.y + 32); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(x0 - 8, p.y - 4, p.w + 16, 34, 14); ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillStyle = '#5cc84a';
    for (let x = x0 + 10; x < x1 - 10; x += 22) { ctx.beginPath(); ctx.arc(x, p.y + 30, 8, 0, Math.PI); ctx.fill(); }
    for (const [px, rx] of [[cx - 70, 74], [cx + 110, 34]]) {
      ctx.beginPath(); ctx.ellipse(px, p.y + 14, rx, 7, 0, 0, Math.PI * 2); outlined(ctx, '#7fd6f2', 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; line(ctx, [px - rx * 0.5, p.y + 12], [px - rx * 0.1, p.y + 12]);
    }
    for (let i = 0; i < 12; i++) {
      const fx = x0 + 20 + R[i + 260] * (p.w - 40);
      if (Math.abs(fx - (cx - 70)) < 85 || Math.abs(fx - (cx + 110)) < 45) continue;
      ctx.fillStyle = i % 3 ? '#ffe066' : '#ff8fb8'; ctx.beginPath(); ctx.arc(fx, p.y + 6, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    for (const x of [p.x + 16, p.x + p.w - 16]) box(ctx, x - 5, p.y + 8, 10, 30, '#d9a52a', 2.5);
    box(ctx, p.x, p.y, p.w, 13, '#f5c84c', 3);
    ctx.fillStyle = '#d9a52a'; ctx.fillRect(p.x + 2, p.y + 8, p.w - 4, 3.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; line(ctx, [p.x + 6, p.y + 4], [p.x + p.w - 6, p.y + 4]);
  }
}

// --- Crimson Shrine: city and pine in the distance, red pillars and lanterns. ---
function bgShrine(ctx, g, cw, ch, base) {
  const t = g.time, R = g.bg.r;
  ctx.fillStyle = vgrad(ctx, ch, [[0, '#8fcdf5'], [1, '#e9f7ff']]); ctx.fillRect(0, 0, cw, ch);
  layer(ctx, g, cw, ch, base, 0.06);
  for (const [col, hmul, off] of [['#b3d4ee', 1, 0], ['#8db9df', 0.7, 37]]) {
    let x = -1400, i = off;
    while (x < 3000) {
      const w = 60 + R[i % 300] * 90, h = (120 + R[(i + 7) % 300] * 260) * hmul;
      box(ctx, x, 620 - h, w, h + 900, col, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let wy = 620 - h + 14; wy < 600; wy += 22) for (let wx = x + 10; wx < x + w - 10; wx += 18) ctx.fillRect(wx, wy, 6, 9);
      x += w + 8; i++;
    }
  }
  layer(ctx, g, cw, ch, base, 0.18);
  const line1 = [];
  for (let x = -1400; x < 3000; x += 70) line1.push([x, 580 - (R[(x + 1400) / 70 % 300 | 0] * 40), 60]);
  blobs(ctx, line1, '#3f8f4a', 3);
  box(ctx, -1400, 600, 4400, 900, '#3f8f4a', 0);
  ctx.beginPath(); ctx.moveTo(870, 640); ctx.quadraticCurveTo(820, 480, 880, 400); ctx.quadraticCurveTo(930, 330, 850, 250); ctx.lineTo(880, 245);
  ctx.quadraticCurveTo(960, 330, 912, 410); ctx.quadraticCurveTo(870, 490, 910, 640); ctx.closePath(); outlined(ctx, '#6b4a2f', 4);
  for (const [x, y, w] of [[860, 240, 170], [760, 320, 150], [990, 340, 160], [880, 420, 190], [720, 450, 120]]) {
    ctx.beginPath(); ctx.ellipse(x, y, w, 34, 0, 0, Math.PI * 2); outlined(ctx, '#2e6b34', 4);
    ctx.fillStyle = '#4a8f4e'; ctx.beginPath(); ctx.ellipse(x - 10, y - 10, w * 0.7, 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  layer(ctx, g, cw, ch, base, 0.3);
  box(ctx, -1400, 610, 4400, 900, '#7cb85a', 0);
  ctx.beginPath(); ctx.moveTo(460, 560); ctx.lineTo(540, 520); ctx.lineTo(620, 560); ctx.closePath(); outlined(ctx, '#7a3b2a', 3);
  box(ctx, 478, 560, 124, 52, '#d9b37e', 3);
  for (const x of [300, 1240]) {
    box(ctx, x - 8, 570, 16, 40, '#9aa0a6', 2.5); box(ctx, x - 20, 548, 40, 24, '#b5bbc1', 2.5);
    ctx.beginPath(); ctx.moveTo(x - 26, 548); ctx.lineTo(x, 532); ctx.lineTo(x + 26, 548); ctx.closePath(); outlined(ctx, '#9aa0a6', 2.5);
  }
  layer(ctx, g, cw, ch, base, 0.68);
  // Koi pond under the pavilion: the drop below the floor.
  box(ctx, -1400, 650, 4400, 1000, '#3b86b8', 0);
  ctx.fillStyle = '#2f6f9e'; ctx.fillRect(-1400, 820, 4400, 900);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
  for (let i = 0; i < 30; i++) {
    const x = -900 + R[i + 300] * 3400 + Math.sin(t + i) * 10, y = 690 + R[i + 330] * 300;
    line(ctx, [x, y], [x + 24 + R[i + 360] * 30, y]);
  }
  for (let i = 0; i < 5; i++) {
    const x = -400 + i * 620 + R[i + 390] * 200, y = 760 + R[i + 395] * 160;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 11, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x, y); ctx.closePath(); outlined(ctx, '#4f9a45', 2.5);
    const kx = x + 120 + Math.sin(t * 0.7 + i) * 60, ky = y + 40;
    ctx.beginPath(); ctx.ellipse(kx, ky, 16, 7, Math.cos(t * 0.7 + i) > 0 ? 0 : Math.PI, 0, Math.PI * 2); outlined(ctx, i % 2 ? '#f07f2a' : '#f4f1e8', 2);
  }
  // Railing behind the floor.
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6;
  for (let x = -1200; x < 2800; x += 56) line(ctx, [x, 572], [x, 640]);
  ctx.strokeStyle = '#c8231d'; ctx.lineWidth = 3;
  for (let x = -1200; x < 2800; x += 56) line(ctx, [x, 572], [x, 640]);
  box(ctx, -1400, 560, 4400, 14, '#c8231d', 3); box(ctx, -1400, 612, 4400, 10, '#c8231d', 3);
  // Pillars with paper talismans.
  for (let x = -680; x < 2400; x += 420) {
    box(ctx, x - 28, -400, 56, 1200, '#c8231d', 4);
    ctx.fillStyle = '#9a1a15'; ctx.fillRect(x + 12, -398, 14, 1196);
    box(ctx, x - 34, 600, 68, 40, '#2b2d36', 3);
    ctx.beginPath(); ctx.moveTo(x - 10, 280); ctx.lineTo(x + 6, 290); ctx.lineTo(x - 6, 302); ctx.lineTo(x + 8, 314); ctx.lineTo(x - 4, 328); ctx.lineTo(x + 10, 328); ctx.lineTo(x + 20, 312); ctx.lineTo(x + 8, 300); ctx.lineTo(x + 18, 288); ctx.closePath(); outlined(ctx, '#ffffff', 2);
  }
  // Roof beam with a wave pattern, and paper lanterns.
  box(ctx, -1400, -40, 4400, 110, '#c8231d', 4);
  ctx.strokeStyle = '#8f1712'; ctx.lineWidth = 4;
  for (let row = 0; row < 2; row++) {
    ctx.beginPath(); ctx.moveTo(-1400, 0 + row * 34);
    for (let x = -1400; x < 3000; x += 60) ctx.quadraticCurveTo(x + 30, -16 + row * 34, x + 60, 0 + row * 34);
    ctx.stroke();
  }
  box(ctx, -1400, 70, 4400, 16, '#e2b13c', 3);
  const glyphs = ['祭', '武', '祭', '武'];
  [-260, 330, 1270, 1860].forEach((x, i) => {
    const sw = Math.sin(t * 1.3 + i) * 0.04;
    ctx.save(); ctx.translate(x, 86); ctx.rotate(sw);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; line(ctx, [0, 0], [0, 40]);
    ctx.beginPath(); ctx.ellipse(0, 128, 46, 76, 0, 0, Math.PI * 2); outlined(ctx, '#f6f1e6', 4);
    ctx.strokeStyle = '#ddd5c4'; ctx.lineWidth = 2;
    for (let y = 70; y < 190; y += 18) { const w = 46 * Math.sqrt(Math.max(0, 1 - ((y - 128) / 76) ** 2)); line(ctx, [-w, y], [w, y]); }
    glyph(ctx, glyphs[i], 0, 130, 56, '#15171c');
    box(ctx, -30, 44, 60, 14, '#c8231d', 3); box(ctx, -30, 198, 60, 14, '#c8231d', 3);
    ctx.restore();
  });
}
function platShrine(ctx, p, g) {
  if (p.solid) {
    ctx.fillStyle = 'rgba(21,23,28,0.18)'; ctx.fillRect(p.x + 20, p.y + p.h, p.w - 40, 30);
    box(ctx, p.x, p.y + 16, p.w, p.h - 16, '#b8211b', 4);
    ctx.fillStyle = '#8f1712'; ctx.fillRect(p.x + 2, p.y + p.h - 14, p.w - 4, 12);
    for (let x = p.x + 40; x < p.x + p.w - 20; x += 110) { ctx.beginPath(); ctx.arc(x, p.y + 38, 6, 0, Math.PI * 2); outlined(ctx, '#f2c14e', 2); }
    box(ctx, p.x - 8, p.y, p.w + 16, 18, '#e8c99a', 4);
    ctx.strokeStyle = '#c9a571'; ctx.lineWidth = 2;
    for (let x = p.x + 70; x < p.x + p.w; x += 80) line(ctx, [x, p.y + 3], [x, p.y + 15]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; line(ctx, [p.x, p.y + 4], [p.x + p.w, p.y + 4]);
  } else {
    const high = p.y < 400;
    box(ctx, p.x, p.y, p.w, 15, high ? '#9a1a15' : '#c8231d', 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; line(ctx, [p.x + 4, p.y + 4], [p.x + p.w - 4, p.y + 4]);
    box(ctx, p.x - 8, p.y - 2, 14, 19, '#f2c14e', 2.5); box(ctx, p.x + p.w - 6, p.y - 2, 14, 19, '#f2c14e', 2.5);
    if (!high) for (const x of [p.x + 30, p.x + p.w - 30]) { ctx.strokeStyle = '#d62839'; ctx.lineWidth = 3; line(ctx, [x, p.y + 15], [x, p.y + 38]); ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(x, p.y + 40, 4, 0, Math.PI * 2); ctx.fill(); }
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
