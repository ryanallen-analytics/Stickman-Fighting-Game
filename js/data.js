'use strict';
// ---------------------------------------------------------------------------
// Stick Clash — static game data: skeleton, poses, characters, moves, stages.
//
// Pose angles are in degrees, measured from "straight down", rotating toward
// the direction the fighter faces. So 0 = down, 90 = straight forward,
// 180 = straight up, -90 = straight backward.
//   t  torso lean (0 = upright, + = lean forward)   h  head tilt
//   a1/f1  front upper arm / forearm                a2/f2  back arm
//   l1/s1  front thigh / shin                       l2/s2  back leg
//   hy  extra hip drop (px)   rot  whole-body rotation (+ = forward flip)
//   w   weapon angle relative to the front forearm
// Hitboxes are [x, y, r] relative to the standing hip (x forward, y down).
// ---------------------------------------------------------------------------

const LIMB = { th: 23, sh: 23, to: 36, nk: 4, hr: 13, ua: 19, fa: 19 };

const BASE_POSE = { t: 6, h: 0, a1: 25, f1: 95, a2: -15, f2: 40, l1: 16, s1: -4, l2: -14, s2: -22, hy: 0, rot: 0, w: 0 };

const POSES = {
  jump: { t: 0, l1: 75, s1: -5, l2: 15, s2: -70, a2: -130, f2: -100 },
  fall: { t: -4, l1: 30, s1: -15, l2: -22, s2: -55, a2: -95, f2: -60 },
  flip: { t: 10, l1: 115, s1: 10, l2: 100, s2: -5, a2: 60, f2: 120 },
  crouch: { t: 26, l1: 72, s1: -18, l2: -10, s2: -105 },
  land: { t: 22, l1: 60, s1: -25, l2: -20, s2: -95 },
  hurt: { t: -28, h: -28, a1: 150, f1: 175, a2: -150, f2: -175, l1: 40, s1: 5, l2: -35, s2: -60 },
  spot: { t: -22, h: -12, l1: 30, s1: -10, l2: -40, s2: -80, a2: -60, f2: -20 },
  roll: { t: 40, l1: 120, s1: 10, l2: 110, s2: 0, a2: 80, f2: 140 },
  airdodge: { t: 15, l1: 80, s1: -10, l2: 50, s2: -40, a2: -60, f2: 0 },
};

function M(o) {
  return Object.assign({ f: [5, 4, 12], dmg: 6, ang: 45, kb: 240, ks: 380, hb: [], W: {}, S: {} }, o);
}

// Air moves fall back to their ground counterparts when a character lacks them.
const MOVE_FALLBACK = { fair: 'ftilt', uair: 'utilt', nair: 'jab', dair: 'dtilt' };

// Item throw used by every character while holding bombs (neutral light).
const THROW_MOVE = M({
  name: 'Bomb Toss', f: [6, 2, 12], W: { a1: 200, f1: 230, t: -10 }, S: { a1: 105, f1: 115, t: 18 },
  proj: { type: 'bomb', speed: 760, dir: 32, grav: 1900, dmg: 13, ang: 60, kb: 360, ks: 520, r: 11, life: 85, blastR: 95 },
  trail: false, item: true,
});

const CHARS = [
  {
    id: 'kade', name: 'KADE', style: 'Brawler', weapon: 'fists', color: '#e4572e',
    blurb: 'Bare-knuckle rushdown. Fast jabs, rocket punches and a crater-making ground pound.',
    speed: 470, jump: 930, weight: 1.0, airJumps: 2, grav: 1, trail: 'hand',
    stats: { power: 3, speed: 5, range: 1, weight: 3 },
    ai: { range: 72, ranged: false },
    hold: { a1: 28, f1: 128, a2: 18, f2: 122, t: 10 },
    moves: {
      jab: M({ name: 'One-Two', f: [3, 3, 7], W: { a1: 55, f1: 65, t: 4 }, S: { a1: 90, f1: 90, t: 16, a2: -25, f2: 35 }, hb: [[46, -32, 15]], dmg: 4, ang: 30, kb: 170, ks: 140 }),
      ftilt: M({ name: 'Roundhouse', f: [6, 4, 12], trail: 'foot', W: { t: -8, l1: 60, s1: -40, a1: 40 }, S: { t: -26, l1: 100, s1: 96, a1: -30, f1: 30, a2: 70, f2: 120 }, hb: [[54, -14, 17], [32, -10, 14]], dmg: 8, ang: 38, kb: 250, ks: 430 }),
      utilt: M({ name: 'Uppercut', f: [5, 4, 12], W: { a1: 20, f1: 40, t: 14, l1: 50, s1: -30 }, S: { a1: 172, f1: 180, t: -6 }, hb: [[18, -74, 18], [22, -48, 14]], dmg: 7, ang: 86, kb: 260, ks: 360 }),
      dtilt: M({ name: 'Leg Sweep', f: [4, 4, 12], trail: 'foot', W: { t: 26, l1: 55, s1: -40, l2: -10, s2: -110 }, S: { t: 34, l1: 100, s1: 94, l2: -30, s2: -120, a1: 70, f1: 90, a2: -60 }, hb: [[52, 30, 16]], dmg: 6, ang: 72, kb: 220, ks: 220 }),
      nair: M({ name: 'Spin Kick', f: [4, 10, 10], spin: 360, trail: 'foot', S: { l1: 95, s1: 95, l2: -95, s2: -95, a1: 130, f1: 130, a2: -130, f2: -130 }, hb: [[0, -14, 46]], dmg: 7, ang: 45, kb: 220, ks: 340, radial: true }),
      fair: M({ name: 'Flying Knee', f: [5, 5, 12], W: { l1: 30, s1: -60 }, S: { l1: 105, s1: 10, t: 12, a1: -20, f1: 40, a2: -70 }, hb: [[30, -12, 19]], dmg: 9, ang: 40, kb: 250, ks: 430 }),
      uair: M({ name: 'Flip Kick', f: [4, 7, 10], spin: -360, trail: 'foot', S: { l1: 170, s1: 175, l2: 20, s2: -10, a1: -60, a2: -100 }, hb: [[0, -66, 26]], dmg: 7, ang: 88, kb: 250, ks: 360 }),
      dair: M({ name: 'Stomp Dive', f: [7, 14, 10], hold: true, v: [180, 1050], trail: 'foot', S: { l1: 10, s1: 5, l2: -10, s2: -20, a1: 150, f1: 170, a2: -150, f2: -170 }, hb: [[0, 46, 19]], dmg: 9, ang: -78, kb: 330, ks: 300 }),
      nsig: M({ name: 'Haymaker', f: [18, 5, 20], sfx: 'heavy', v: [340, 0], vadd: true, W: { t: -22, a1: -60, f1: -20, l1: 40, s1: -10, l2: -40, s2: -40 }, S: { t: 36, a1: 96, f1: 92, l1: 60, s1: 20, l2: -55, s2: -50 }, hb: [[58, -28, 23]], dmg: 16, ang: 32, kb: 360, ks: 760, shake: 10 }),
      ssig: M({ name: 'Rocket Punch', f: [8, 12, 16], hold: true, v: [950, 0], grav: 0, sfx: 'heavy', W: { a1: -40, f1: 0, t: -10 }, S: { t: 40, a1: 92, f1: 90, a2: -80, f2: -80, l1: 30, l2: -60, s2: -80 }, hb: [[48, -26, 22]], dmg: 12, ang: 28, kb: 300, ks: 560 }),
      usig: M({ name: 'Rising Dragon', f: [4, 14, 22], hold: true, holdFrames: 10, v: [150, -1050], sfx: 'heavy', S: { a1: 178, f1: 182, t: -4, l1: 35, s1: -20, l2: -10, s2: -45 }, hb: [[16, -72, 22], [10, -32, 18]], dmg: 11, ang: 82, kb: 280, ks: 420, upB: true }),
      dsig: M({ name: 'Ground Pound', f: [12, 8, 22], plunge: true, sfx: 'heavy', W: { a1: 190, f1: 200, a2: -190, f2: -200, l1: 80, s1: -10, l2: 60, s2: -30 }, S: { t: 40, a1: 40, f1: 10, a2: -40, f2: -10, l1: 70, s1: -30, l2: -10, s2: -110 }, hb: [[0, 40, 26]], dmg: 9, ang: -70, kb: 300, ks: 300, landHit: { r: 95, dmg: 12, ang: 70, kb: 330, ks: 520 } }),
    },
  },
  {
    id: 'sora', name: 'SORA', style: 'Ronin', weapon: 'katana', color: '#3a86ff',
    blurb: 'Precise katana arcs, a long-range draw cut, a wind dash and a parry that punishes.',
    speed: 450, jump: 920, weight: 1.0, airJumps: 2, grav: 1, trail: 'weapon',
    stats: { power: 4, speed: 4, range: 3, weight: 3 },
    ai: { range: 105, ranged: false },
    hold: { a1: 30, f1: 112, w: 38, a2: -10, f2: 70 },
    moves: {
      jab: M({ name: 'Quick Cut', f: [4, 3, 9], W: { a1: 75, f1: 150, w: 30 }, S: { a1: 86, f1: 80, w: 6, t: 16 }, hb: [[62, -34, 18], [92, -30, 14]], dmg: 5, ang: 35, kb: 180, ks: 180 }),
      ftilt: M({ name: 'Crescent Slash', f: [7, 4, 14], W: { a1: 160, f1: 200, w: 20, t: -8 }, S: { a1: 60, f1: 60, w: 10, t: 22, l1: 50, s1: 20, l2: -30, s2: -40 }, hb: [[64, -42, 24], [82, -6, 22]], dmg: 9, ang: 40, kb: 260, ks: 450 }),
      utilt: M({ name: 'Sky Arc', f: [6, 5, 12], W: { a1: -30, f1: -40, w: 0 }, S: { a1: 192, f1: 200, w: -10, t: -10 }, hb: [[30, -92, 26], [-22, -72, 22], [62, -60, 22]], dmg: 8, ang: 88, kb: 250, ks: 400 }),
      dtilt: M({ name: 'Low Draw', f: [5, 4, 12], W: { t: 30, a1: 40, f1: 40, w: -10, l1: 60, s1: -30, s2: -100 }, S: { t: 36, a1: 90, f1: 95, w: -5, l1: 80, s1: 70, l2: -50, s2: -115 }, hb: [[72, 22, 18], [102, 26, 14]], dmg: 6, ang: 25, kb: 230, ks: 260 }),
      nair: M({ name: 'Whirlwind', f: [5, 10, 10], spin: 360, S: { a1: 90, f1: 90, w: 0, l1: 40, s1: -30, l2: -20, s2: -50 }, hb: [[0, -30, 64]], dmg: 8, ang: 45, kb: 230, ks: 360, radial: true }),
      dair: M({ name: 'Falling Stab', f: [6, 10, 10], S: { a1: 15, f1: 5, w: -5, l1: 60, s1: -10, l2: 20, s2: -50 }, hb: [[10, 42, 18], [10, 72, 14]], dmg: 9, ang: -70, kb: 300, ks: 300 }),
      nsig: M({ name: 'Iaido', f: [22, 4, 22], sfx: 'slash', v: [320, 0], vadd: true, W: { t: 24, a1: -20, f1: 40, w: -130, l1: 70, s1: 0, l2: -40, s2: -90 }, S: { t: 30, a1: 92, f1: 90, w: 0, l1: 75, s1: 30, l2: -60, s2: -60 }, hb: [[82, -28, 26], [132, -28, 22]], dmg: 17, ang: 30, kb: 380, ks: 780, shake: 10 }),
      ssig: M({ name: 'Wind Dash', f: [6, 12, 16], hold: true, v: [1100, 0], grav: 0, sfx: 'slash', W: { t: 20, a1: 60, f1: 40, w: 0 }, S: { t: 40, a1: -60, f1: -80, w: 0, l1: 40, l2: -60, s2: -100 }, hb: [[0, -30, 34], [40, -30, 30]], dmg: 10, ang: 30, kb: 260, ks: 420 }),
      usig: M({ name: 'Rising Gale', f: [4, 16, 20], hold: true, holdFrames: 11, v: [100, -1050], spin: 360, S: { a1: 180, f1: 185, w: 0 }, hb: [[0, -60, 42]], multi: 5, dmg: 4, ang: 85, kb: 210, ks: 250, upB: true, radial: true }),
      dsig: M({ name: 'Parry', f: [3, 26, 14], trail: false, sfx: 'none', W: { a1: 60, f1: 160, w: -70 }, S: { a1: 60, f1: 160, w: -70, t: -6, l1: 30, l2: -40 }, counter: true, counterMove: 'riposte' }),
      riposte: M({ name: 'Riposte', f: [1, 5, 14], sfx: 'slash', W: { a1: 170, f1: 210, w: 10 }, S: { a1: 70, f1: 70, w: 10, t: 30 }, hb: [[60, -32, 44]], dmg: 15, ang: 40, kb: 380, ks: 650, shake: 10 }),
    },
  },
  {
    id: 'brutus', name: 'BRUTUS', style: 'Titan', weapon: 'hammer', color: '#c47a2c',
    blurb: 'A walking siege engine. Slow, armored charges and hammer blows that end stocks.',
    speed: 360, jump: 870, weight: 1.35, airJumps: 1, grav: 1.05, trail: 'weapon',
    stats: { power: 5, speed: 1, range: 3, weight: 5 },
    ai: { range: 100, ranged: false },
    hold: { a1: 14, f1: 140, w: 62, a2: 30, f2: 112, t: 8 },
    moves: {
      jab: M({ name: 'Pommel Bash', f: [6, 4, 12], W: { a1: 40, f1: 70, w: 80 }, S: { a1: 82, f1: 92, w: 100, t: 15 }, hb: [[52, -30, 22]], dmg: 6, ang: 35, kb: 220, ks: 240 }),
      ftilt: M({ name: 'Hammer Swing', f: [12, 5, 18], sfx: 'heavy', W: { a1: -80, f1: -60, w: -60, t: -15 }, S: { a1: 85, f1: 85, w: 0, t: 25 }, hb: [[72, -30, 30], [98, -30, 26]], dmg: 13, ang: 35, kb: 330, ks: 640, shake: 7 }),
      utilt: M({ name: 'Overhead Arc', f: [11, 6, 16], sfx: 'heavy', W: { a1: 40, f1: 20, w: -10, t: 15 }, S: { a1: 182, f1: 200, w: 10, t: -10 }, hb: [[20, -102, 32], [52, -82, 26]], dmg: 12, ang: 85, kb: 320, ks: 600 }),
      dtilt: M({ name: 'Low Sweep', f: [9, 5, 16], W: { t: 35, a1: -30, f1: -20, w: 0, l1: 60, s1: -30, s2: -100 }, S: { t: 35, a1: 82, f1: 86, w: 0, l1: 80, s1: 70, l2: -50, s2: -115 }, hb: [[82, 24, 26]], dmg: 10, ang: 30, kb: 280, ks: 420 }),
      nair: M({ name: 'Cyclone', f: [8, 12, 14], spin: 360, sfx: 'heavy', S: { a1: 90, f1: 90, w: 0 }, hb: [[0, -30, 82]], dmg: 11, ang: 45, kb: 300, ks: 520, radial: true }),
      dair: M({ name: 'Anvil Drop', f: [10, 30, 20], plunge: true, sfx: 'heavy', W: { a1: 190, f1: 200, w: 0 }, S: { a1: 12, f1: 0, w: 0, l1: 70, s1: -20, l2: 40, s2: -60 }, hb: [[10, 62, 30]], dmg: 12, ang: -80, kb: 330, ks: 360, landHit: { r: 90, dmg: 8, ang: 70, kb: 280, ks: 360 } }),
      nsig: M({ name: 'Titan Smash', f: [26, 5, 28], sfx: 'heavy', armor: true, W: { a1: 200, f1: 222, w: 0, t: -20 }, S: { a1: 70, f1: 40, w: 20, t: 42, l1: 65, s1: 20, l2: -60, s2: -60 }, hb: [[92, 20, 40], [62, -20, 30]], dmg: 22, ang: 45, kb: 420, ks: 900, shake: 16, fx: 'quakeDust' }),
      ssig: M({ name: 'Bull Rush', f: [10, 18, 18], hold: true, v: [800, 0], armor: true, sfx: 'heavy', W: { t: -10, a1: 20, f1: 130, w: 60 }, S: { t: 35, a1: 30, f1: 120, w: 60, a2: 40, f2: 100 }, hb: [[30, -30, 32]], dmg: 12, ang: 30, kb: 320, ks: 520 }),
      usig: M({ name: 'Helicopter', f: [6, 22, 22], hold: true, holdFrames: 14, v: [0, -900], spin: 720, S: { a1: 150, f1: 180, w: 0 }, hb: [[0, -40, 74]], multi: 6, dmg: 4, ang: 80, kb: 220, ks: 200, upB: true, radial: true }),
      dsig: M({ name: 'Earthquake', f: [18, 4, 26], plunge: true, sfx: 'heavy', W: { a1: 200, f1: 222, w: 0, t: -15 }, S: { a1: 60, f1: 20, w: 0, t: 45, l1: 70, s1: -30, l2: -10, s2: -110 }, hb: [[70, 20, 30]], dmg: 10, ang: 70, kb: 300, ks: 380, landHit: { r: 80, dmg: 10, ang: 72, kb: 300, ks: 420, quake: true } }),
    },
  },
  {
    id: 'vex', name: 'VEX', style: 'Lancer', weapon: 'spear', color: '#2a9d8f',
    blurb: 'Owns the space in front of her. Long pokes, a thrown javelin and a sky-piercing recovery.',
    speed: 420, jump: 910, weight: 1.05, airJumps: 2, grav: 1, trail: 'weapon',
    stats: { power: 3, speed: 3, range: 5, weight: 3 },
    ai: { range: 125, ranged: true },
    hold: { a1: 40, f1: 80, w: 6, a2: 60, f2: 92 },
    moves: {
      jab: M({ name: 'Poke', f: [4, 3, 9], W: { a1: 20, f1: 60, w: 20, t: 0 }, S: { a1: 82, f1: 88, w: 0, t: 12 }, hb: [[104, -32, 14], [78, -32, 12]], dmg: 5, ang: 25, kb: 190, ks: 180 }),
      ftilt: M({ name: 'Piercing Thrust', f: [8, 4, 14], W: { a1: -10, f1: 40, w: 45, t: -10 }, S: { a1: 88, f1: 90, w: 0, t: 28, l1: 70, s1: 40, l2: -50, s2: -60 }, hb: [[124, -30, 16], [94, -30, 14]], dmg: 10, ang: 30, kb: 260, ks: 520 }),
      utilt: M({ name: 'Sky Thrust', f: [6, 5, 12], W: { a1: 40, f1: 60, w: 60 }, S: { a1: 176, f1: 180, w: 0 }, hb: [[10, -116, 18], [10, -84, 16]], dmg: 8, ang: 90, kb: 250, ks: 420 }),
      dtilt: M({ name: 'Ankle Jab', f: [5, 3, 12], W: { t: 35, l1: 60, s1: -30, s2: -100 }, S: { t: 40, a1: 70, f1: 75, w: 10, l1: 85, s1: 75, l2: -50, s2: -115 }, hb: [[112, 26, 14], [82, 22, 14]], dmg: 6, ang: 20, kb: 220, ks: 220 }),
      nair: M({ name: 'Spear Twirl', f: [5, 12, 10], wspin: 720, S: { a1: 90, f1: 90, w: 0, l1: 50, s1: -20, l2: -30, s2: -60 }, hb: [[0, -30, 72]], multi: 6, dmg: 4, ang: 50, kb: 220, ks: 300, radial: true }),
      dair: M({ name: 'Impale Drop', f: [6, 24, 14], plunge: true, W: { a1: 160, f1: 170, w: 0 }, S: { a1: 10, f1: 0, w: 0, l1: 60, s1: -10, l2: 20, s2: -50 }, hb: [[6, 72, 16]], dmg: 10, ang: -75, kb: 300, ks: 320, landHit: { r: 60, dmg: 6, ang: 70, kb: 240, ks: 260 } }),
      nsig: M({ name: 'Javelin', f: [14, 2, 18], trail: false, W: { a1: 210, f1: 200, w: -115, t: -15 }, S: { a1: 100, f1: 95, w: 0, t: 20 }, proj: { type: 'javelin', speed: 1300, dir: 4, grav: 420, dmg: 11, ang: 30, kb: 300, ks: 520, r: 12, life: 70 } }),
      ssig: M({ name: 'Lunge', f: [6, 14, 16], hold: true, v: [900, 0], grav: 0.2, W: { a1: -10, f1: 40, w: 45, t: -10 }, S: { a1: 88, f1: 90, w: 0, t: 30, l1: 70, s1: 50, l2: -60, s2: -70 }, hb: [[124, -28, 18], [88, -28, 18]], multi: 5, dmg: 4, ang: 25, kb: 200, ks: 220 }),
      usig: M({ name: 'Sky Pierce', f: [5, 14, 20], hold: true, holdFrames: 10, v: [180, -1100], S: { a1: 180, f1: 180, w: 0, t: -5, l1: 10, s1: -10, l2: -20, s2: -30 }, hb: [[10, -112, 20], [10, -72, 18]], dmg: 10, ang: 85, kb: 270, ks: 420, upB: true }),
      dsig: M({ name: 'Sweeping Moon', f: [8, 9, 16], wspin: 360, W: { t: 20, a1: 90, f1: 90, w: 0 }, S: { t: 22, a1: 90, f1: 90, w: 0, l1: 70, s1: -30, l2: -10, s2: -100 }, hb: [[-92, 6, 24], [92, 6, 24], [0, 6, 44]], dmg: 10, ang: 35, kb: 280, ks: 480, radial: true }),
    },
  },
  {
    id: 'nyx', name: 'NYX', style: 'Shade', weapon: 'daggers', color: '#7b2cbf',
    blurb: 'Twin daggers and dirty tricks. Triple jump, shuriken, shadow-step and smoke bombs.',
    speed: 520, jump: 950, weight: 0.85, airJumps: 3, grav: 0.95, trail: 'weapon',
    stats: { power: 2, speed: 5, range: 2, weight: 1 },
    ai: { range: 68, ranged: true },
    hold: { a1: 40, f1: 122, w: -110, a2: 22, f2: 112, t: 14 },
    moves: {
      jab: M({ name: 'Flurry', f: [2, 3, 5], W: { a1: 60, f1: 80 }, S: { a1: 96, f1: 96, w: -90, t: 18 }, hb: [[50, -32, 16]], dmg: 3, ang: 35, kb: 150, ks: 100 }),
      ftilt: M({ name: 'Twin Slash', f: [5, 4, 10], W: { a1: 150, f1: 180, a2: 140, f2: 170 }, S: { a1: 60, f1: 60, a2: 50, f2: 70, t: 25 }, hb: [[52, -28, 22]], dmg: 7, ang: 35, kb: 230, ks: 380 }),
      utilt: M({ name: 'Rising Cut', f: [4, 4, 10], S: { a1: 170, f1: 180, a2: 160, f2: 170, t: -4 }, hb: [[16, -74, 22]], dmg: 6, ang: 88, kb: 230, ks: 340 }),
      dtilt: M({ name: 'Slide', f: [4, 10, 12], hold: true, v: [650, 0], trail: false, S: { t: -22, l1: 95, s1: 95, l2: 30, s2: -60, a1: -60, f1: -30 }, hb: [[42, 30, 18]], dmg: 6, ang: 75, kb: 220, ks: 250 }),
      nair: M({ name: 'Blade Dance', f: [4, 12, 8], spin: 720, S: { a1: 90, f1: 90, a2: -90, f2: -90 }, hb: [[0, -26, 48]], multi: 4, dmg: 3, ang: 50, kb: 190, ks: 180, radial: true }),
      dair: M({ name: 'Shadow Drop', f: [5, 10, 10], hold: true, v: [0, 950], S: { a1: 10, f1: 0, w: 180, a2: -10, f2: 0, l1: 60, s1: -10, l2: 20, s2: -50 }, hb: [[0, 42, 20]], dmg: 7, ang: -70, kb: 260, ks: 260 }),
      nsig: M({ name: 'Shuriken', f: [7, 2, 12], trail: false, W: { a1: 150, f1: 200 }, S: { a1: 92, f1: 92, t: 15 }, proj: { type: 'shuriken', speed: 1200, dir: 0, count: 3, spread: 9, dmg: 4, ang: 30, kb: 160, ks: 180, r: 10, life: 40 } }),
      ssig: M({ name: 'Shadow Step', f: [8, 4, 14], teleport: 230, sfx: 'slash', W: { t: 20, a1: 160, f1: 190, a2: 150, f2: 180 }, S: { a1: 60, f1: 50, a2: 40, f2: 60, t: 30 }, hb: [[30, -30, 40]], dmg: 9, ang: 40, kb: 260, ks: 420 }),
      usig: M({ name: 'Shadow Flip', f: [3, 14, 16], hold: true, holdFrames: 9, v: [200, -1000], spin: -720, S: { a1: 120, f1: 140, a2: -120, f2: -140, l1: 90, s1: 0, l2: 80, s2: -20 }, hb: [[0, -30, 42]], multi: 4, dmg: 3, ang: 80, kb: 200, ks: 200, upB: true, radial: true }),
      dsig: M({ name: 'Smoke Bomb', f: [6, 3, 16], smoke: true, trail: false, sfx: 'boom', W: { a1: 160, f1: 200 }, S: { a1: 20, f1: 10, t: 30, l1: 60, s1: -30, s2: -100 }, hb: [[0, -20, 62]], dmg: 3, ang: 80, kb: 200, ks: 100, radial: true }),
    },
  },
  {
    id: 'colt', name: 'COLT', style: 'Gunslinger', weapon: 'pistol', color: '#e09f3e',
    blurb: 'Zones with a six-shooter and a scattergun. Rocket-jumps back to the stage.',
    speed: 430, jump: 920, weight: 0.95, airJumps: 2, grav: 1, trail: 'foot',
    stats: { power: 2, speed: 3, range: 5, weight: 2 },
    ai: { range: 70, ranged: true },
    hold: { a1: 35, f1: 70, w: 22, a2: -10, f2: 50 },
    moves: {
      jab: M({ name: 'Pistol Whip', f: [4, 3, 8], trail: false, W: { a1: 100, f1: 150, w: 0 }, S: { a1: 80, f1: 60, w: 20, t: 15 }, hb: [[46, -26, 16]], dmg: 5, ang: 40, kb: 180, ks: 180 }),
      ftilt: M({ name: 'Boot', f: [6, 4, 12], W: { l1: 60, s1: -40 }, S: { t: -25, l1: 100, s1: 100, a1: 120, f1: 110, a2: -60 }, hb: [[56, -12, 17]], dmg: 8, ang: 35, kb: 260, ks: 420 }),
      utilt: M({ name: 'Sky Shot', f: [5, 2, 12], trail: false, sfx: 'shot', S: { a1: 180, f1: 180, w: 0, t: -5 }, proj: { type: 'bullet', speed: 1700, dir: 90, dmg: 5, ang: 88, kb: 220, ks: 240, r: 6, life: 30, from: 'gun' } }),
      dtilt: M({ name: 'Leg Sweep', f: [4, 4, 12], W: { t: 26, l1: 55, s1: -40, s2: -110 }, S: { t: 34, l1: 100, s1: 94, l2: -30, s2: -120 }, hb: [[52, 30, 16]], dmg: 5, ang: 72, kb: 210, ks: 200 }),
      nair: M({ name: 'Spin Kick', f: [5, 10, 10], spin: 360, S: { l1: 95, s1: 95, l2: -95, s2: -95 }, hb: [[0, -12, 44]], dmg: 7, ang: 45, kb: 220, ks: 330, radial: true }),
      dair: M({ name: 'Down Shot', f: [5, 2, 12], trail: false, sfx: 'shot', v: [0, -480], S: { a1: 2, f1: 0, w: 0, l1: 50, s1: -20, l2: 30, s2: -50 }, proj: { type: 'bullet', speed: 1700, dir: -90, dmg: 5, ang: -60, kb: 230, ks: 220, r: 6, life: 30, from: 'gun' } }),
      nsig: M({ name: 'Quick Draw', f: [6, 2, 10], trail: false, sfx: 'shot', W: { a1: 70, f1: 70 }, S: { a1: 90, f1: 90, w: 0, t: 5 }, proj: { type: 'bullet', speed: 1850, dir: 0, dmg: 6, ang: 22, kb: 200, ks: 220, r: 6, life: 40, from: 'gun' } }),
      ssig: M({ name: 'Scattershot', f: [12, 2, 20], trail: false, sfx: 'shotgun', v: [-450, -120], vadd: true, W: { a1: 60, f1: 60, w: 0 }, S: { a1: 100, f1: 112, w: 0, t: -12 }, proj: { type: 'pellet', speed: 1500, dir: 3, count: 5, spread: 7, dmg: 3, ang: 30, kb: 220, ks: 320, r: 5, life: 14, from: 'gun' } }),
      usig: M({ name: 'Rocket Jump', f: [8, 4, 20], trail: false, sfx: 'boom', v: [100, -1150], S: { a1: 6, f1: 0, w: 0, l1: 60, s1: -20, l2: 40, s2: -40 }, proj: { type: 'blast', speed: 0, dmg: 8, ang: -60, kb: 300, ks: 300, r: 60, life: 6, off: [0, 50] }, upB: true }),
      dsig: M({ name: 'Grenade', f: [10, 2, 16], trail: false, W: { a1: 200, f1: 230 }, S: { a1: 120, f1: 140 }, proj: { type: 'bomb', speed: 620, dir: 48, grav: 1900, dmg: 14, ang: 60, kb: 380, ks: 520, r: 10, life: 70, blastR: 95 } }),
    },
  },
  {
    id: 'orin', name: 'ORIN', style: 'Mystic', weapon: 'staff', color: '#00a6c8',
    blurb: 'Floats in the air and controls space with fireballs, force waves and lightning.',
    speed: 400, jump: 900, weight: 0.9, airJumps: 2, grav: 0.85, trail: 'weapon',
    stats: { power: 4, speed: 2, range: 4, weight: 2 },
    ai: { range: 92, ranged: true },
    hold: { a1: 25, f1: 82, w: 95, a2: -10, f2: 40 },
    moves: {
      jab: M({ name: 'Staff Jab', f: [4, 3, 9], W: { a1: 40, f1: 70, w: 20 }, S: { a1: 85, f1: 90, w: 0, t: 12 }, hb: [[82, -32, 16]], dmg: 5, ang: 30, kb: 180, ks: 180 }),
      ftilt: M({ name: 'Crescent Swing', f: [8, 4, 14], W: { a1: 150, f1: 190, w: 0 }, S: { a1: 70, f1: 60, w: 0, t: 20 }, hb: [[76, -20, 24]], dmg: 9, ang: 40, kb: 260, ks: 430 }),
      utilt: M({ name: 'Halo', f: [6, 10, 12], wspin: 720, S: { a1: 180, f1: 180, w: 90 }, hb: [[0, -92, 40]], multi: 4, dmg: 3, ang: 90, kb: 210, ks: 220 }),
      dtilt: M({ name: 'Trip', f: [6, 4, 12], W: { t: 26, l1: 60, s1: -30, s2: -100 }, S: { t: 30, a1: 60, f1: 60, w: 0 }, hb: [[82, 30, 18]], dmg: 6, ang: 70, kb: 220, ks: 220 }),
      nair: M({ name: 'Orbit', f: [5, 10, 10], spin: 360, S: { a1: 90, f1: 90, w: 0 }, hb: [[0, -30, 66]], dmg: 8, ang: 45, kb: 230, ks: 360, radial: true }),
      dair: M({ name: 'Pogo', f: [6, 6, 12], S: { a1: 10, f1: 0, w: 0, l1: 50, s1: -20, l2: 20, s2: -50 }, hb: [[0, 64, 22]], dmg: 8, ang: -70, kb: 300, ks: 300 }),
      nsig: M({ name: 'Fireball', f: [14, 2, 16], trail: false, sfx: 'fire', W: { a1: 140, f1: 150, w: 90 }, S: { a1: 90, f1: 90, w: 90, t: 10 }, proj: { type: 'fireball', speed: 650, dir: 0, dmg: 10, ang: 35, kb: 280, ks: 450, r: 17, life: 95 } }),
      ssig: M({ name: 'Force Wave', f: [12, 4, 18], trail: false, sfx: 'heavy', fx: 'wave', W: { a1: -30, f1: 0, w: 90 }, S: { a1: 90, f1: 90, w: 90, t: 15 }, hb: [[62, -30, 42]], dmg: 9, ang: 25, kb: 420, ks: 620 }),
      usig: M({ name: 'Levitate', f: [6, 26, 18], hold: true, holdFrames: 20, v: [0, -650], grav: 0, trail: false, fx: 'sparkle', S: { a1: 170, f1: 180, w: 90, l1: 20, s1: 0, l2: -20, s2: -10 }, hb: [[0, 30, 40]], multi: 6, dmg: 2, ang: 80, kb: 200, ks: 120, upB: true, radial: true }),
      dsig: M({ name: 'Thunder Call', f: [16, 2, 20], trail: false, sfx: 'none', W: { a1: 170, f1: 180, w: 90 }, S: { a1: 175, f1: 180, w: 90, t: -8 }, proj: { type: 'lightning', speed: 0, dmg: 13, ang: 80, kb: 340, ks: 600, r: 34, life: 30, delay: 14, off: [240, 0] } }),
    },
  },
];

// Trail and drop-on-death geometry for each weapon look (px along the grip axis).
// Fist-type weapons decorate the hands and have no separate prop.
const WEAPONS = {
  fists: null, knuckles: null, gauntlets: null,
  nunchucks: { tip: 36, base: 8 },
  katana: { tip: 58, base: 14 }, nodachi: { tip: 76, base: 16 }, energy: { tip: 62, base: 10 }, bokken: { tip: 58, base: 12 },
  hammer: { tip: 66, base: 34 }, greataxe: { tip: 70, base: 40 }, anchor: { tip: 74, base: 30 }, club: { tip: 58, base: 26 },
  spear: { tip: 86, base: 40 }, halberd: { tip: 88, base: 44 }, trident: { tip: 90, base: 46 }, naginata: { tip: 92, base: 52 },
  daggers: { tip: 25, base: 5 }, kama: { tip: 26, base: 8 }, sai: { tip: 27, base: 6 },
  pistol: { tip: 24, base: 4 }, cannon: { tip: 32, base: 4 }, twin: { tip: 24, base: 4 }, raygun: { tip: 28, base: 4 },
  staff: { tip: 50, base: 10 }, wand: { tip: 32, base: 6 }, scythe: { tip: 60, base: 30 },
};
const FIST_WEAPONS = new Set(['fists', 'knuckles', 'gauntlets']);
// These are carried one per hand.
const DUAL_WEAPONS = new Set(['daggers', 'kama', 'sai', 'twin']);

// Each class picks from its own arsenal. `mod` scales the whole moveset:
// damage, knockback, speed (higher = faster startup/recovery), melee reach,
// projectile speed/size. `moves` overrides individual moves.
const ARSENALS = {
  kade: [
    { id: 'wraps', name: 'Hand Wraps', draw: 'fists', desc: 'The baseline: quick, reliable combos.', mod: {} },
    { id: 'knuckles', name: 'Brass Knuckles', draw: 'knuckles', desc: 'Harder punches, a little slower.', mod: { dmg: 1.15, kb: 1.05, speed: 0.93 } },
    { id: 'gauntlets', name: 'Power Gauntlets', draw: 'gauntlets', desc: 'Huge knockback, slow wind-ups.', mod: { dmg: 1.25, kb: 1.25, speed: 0.8 } },
    { id: 'nunchucks', name: 'Nunchucks', draw: 'nunchucks', trail: 'weapon', desc: 'Extra reach and speed, lighter hits.', mod: { dmg: 0.92, speed: 1.08, reach: 1.3 } },
  ],
  sora: [
    { id: 'katana', name: 'Katana', draw: 'katana', desc: 'The baseline: precise, balanced cuts.', mod: {} },
    { id: 'nodachi', name: 'Nodachi', draw: 'nodachi', desc: 'A long field sword. Big reach, slower.', mod: { dmg: 1.1, kb: 1.05, speed: 0.85, reach: 1.25 } },
    { id: 'energy', name: 'Plasma Blade', draw: 'energy', tint: '#ff3355', desc: 'Searing hits and a glowing trail.', mod: { dmg: 1.15 } },
    { id: 'bokken', name: 'Bokken', draw: 'bokken', desc: 'Wooden practice sword. Fast, bonks hard.', mod: { dmg: 0.8, kb: 1.3, speed: 1.15 } },
  ],
  brutus: [
    { id: 'hammer', name: 'Warhammer', draw: 'hammer', desc: 'The baseline: crushing all-rounder.', mod: {} },
    { id: 'greataxe', name: 'Great Axe', draw: 'greataxe', desc: 'Heavier damage and reach.', mod: { dmg: 1.2, kb: 0.95, speed: 0.9, reach: 1.1 } },
    { id: 'anchor', name: 'Ship Anchor', draw: 'anchor', desc: 'Launches anything it touches. Very slow.', mod: { dmg: 1.1, kb: 1.35, speed: 0.8, reach: 1.15 } },
    { id: 'club', name: 'Spiked Club', draw: 'club', desc: 'Lighter and quicker to swing.', mod: { dmg: 0.9, kb: 0.95, speed: 1.15 } },
  ],
  vex: [
    { id: 'spear', name: 'Spear', draw: 'spear', desc: 'The baseline: long, fast pokes.', mod: {} },
    { id: 'halberd', name: 'Halberd', draw: 'halberd', desc: 'Axe-headed pole. Heavier and slower.', mod: { dmg: 1.15, kb: 1.1, speed: 0.88 } },
    { id: 'trident', name: 'Trident', draw: 'trident', desc: 'Wider prongs and a stronger javelin.', mod: { dmg: 1.05, reach: 1.08, pdmg: 1.15, pr: 1.3 } },
    { id: 'naginata', name: 'Naginata', draw: 'naginata', desc: 'Curved blade. Quick sweeping strikes.', mod: { dmg: 0.95, speed: 1.12, reach: 1.05 } },
  ],
  nyx: [
    { id: 'daggers', name: 'Twin Daggers', draw: 'daggers', desc: 'The baseline: blinding speed.', mod: {} },
    { id: 'kama', name: 'Kama', draw: 'kama', desc: 'Hooked sickles. More bite and reach.', mod: { dmg: 1.1, reach: 1.12, speed: 0.95 } },
    { id: 'sai', name: 'Sai', draw: 'sai', desc: 'Even faster jabs that knock back harder.', mod: { dmg: 0.9, kb: 1.12, speed: 1.12 } },
  ],
  colt: [
    { id: 'revolver', name: 'Revolver', draw: 'pistol', desc: 'The baseline: steady six-shooter.', mod: {} },
    { id: 'cannon', name: 'Hand Cannon', draw: 'cannon', desc: 'Huge slow slugs that hit like a truck.', mod: { dmg: 1.35, kb: 1.25, speed: 0.8, pspeed: 0.8, pr: 1.7 } },
    { id: 'twin', name: 'Twin Pistols', draw: 'twin', desc: 'Two guns: double Quick Draw, weaker shots.', mod: { dmg: 0.85, speed: 1.15 }, moves: { nsig: { proj: { count: 2, spread: 4 } } } },
    { id: 'raygun', name: 'Ray Gun', draw: 'raygun', tint: '#39e07a', desc: 'Fast laser bolts that cross the map.', mod: { pspeed: 1.4, dmg: 1.05 } },
  ],
  orin: [
    { id: 'staff', name: 'Staff', draw: 'staff', desc: 'The baseline: balanced magic and melee.', mod: {} },
    { id: 'wand', name: 'Crystal Wand', draw: 'wand', tint: '#c77dff', desc: 'Faster casting and spells, weak melee.', mod: { speed: 1.15, dmg: 0.9, reach: 0.8, pspeed: 1.25 } },
    { id: 'scythe', name: 'Scythe', draw: 'scythe', desc: 'Reaping melee, slower casting.', mod: { dmg: 1.25, kb: 1.05, speed: 0.9, reach: 1.15 } },
  ],
};

// Built-in "Flash game" looks: flat fills with a dark outline, clothes and hair.
const OUTLINE = '#1b1c22';
const OUTFITS = {
  kade: { skin: '#f1c49b', shirt: '#f6f5ef', sleeves: false, pants: '#3e6db5', shoes: '#2a2b31', hair: 'none', limb: 10.5, size: 1 },
  sora: { skin: '#f0c39a', shirt: '#2c3e73', sleeves: true, pants: '#1f2438', belt: '#d43c3c', shoes: '#3a2a20', hair: 'topknot', hairColor: '#1b1b1f', limb: 9.5, size: 1 },
  brutus: { skin: '#d9a27a', shirt: '#6e4529', sleeves: false, pants: '#4a4e57', belt: '#c47a2c', shoes: '#2a2b31', hair: 'mohawk', hairColor: '#c47a2c', beard: '#5a3a22', limb: 13, size: 1.14 },
  vex: { skin: '#e8b48e', shirt: '#2a9d8f', sleeves: true, pants: '#e6d3a3', belt: '#7a5230', shoes: '#5a3a22', hair: 'ponytail', hairColor: '#8a3b1e', limb: 9, size: 1 },
  nyx: { skin: '#2a2c35', shirt: '#2a2c35', sleeves: true, pants: '#2a2c35', shoes: '#15161b', outline: '#0b0b0f', hair: 'ninjaband', hairColor: '#d62839', limb: 8.5, size: 0.95 },
  colt: { skin: '#e9b98e', shirt: '#a0603a', sleeves: true, pants: '#3d5a8a', belt: '#2b2b30', shoes: '#4a2f1e', hair: 'short', hairColor: '#6b4226', limb: 9.5, size: 1 },
  orin: { skin: '#e7c3a0', shirt: '#3c5aa6', sleeves: true, pants: '#3c5aa6', robe: '#3c5aa6', shoes: '#2b2f3a', hair: 'long', hairColor: '#ececf2', beard: '#ececf2', limb: 9, size: 1 },
};

const POWERS = {
  health: { name: 'Health', color: '#25a865', dur: 0 },
  rage: { name: 'Rage', color: '#e63946', dur: 600 },
  speed: { name: 'Haste', color: '#f0b400', dur: 600 },
  shield: { name: 'Shield', color: '#3a86ff', dur: 0 },
  giant: { name: 'Giant', color: '#8e44ec', dur: 600 },
  bomb: { name: 'Bombs', color: '#2b2d36', dur: 0 },
};

const PLAYER_COLORS = ['#e63946', '#2d7ff9', '#22a55b', '#f29e0c', '#9b5de5', '#0fa3b1'];
const MAX_FIGHTERS = PLAYER_COLORS.length;

// Cosmetics. Hats sit on the head, face items on the face or neck, back items behind the body.
const HATS = [
  { id: 'none', name: 'None' }, { id: 'tophat', name: 'Top hat' }, { id: 'cap', name: 'Cap' },
  { id: 'cowboy', name: 'Cowboy' }, { id: 'crown', name: 'Crown' }, { id: 'viking', name: 'Viking' },
  { id: 'party', name: 'Party hat' }, { id: 'wizard', name: 'Wizard' }, { id: 'headband', name: 'Headband' },
  { id: 'halo', name: 'Halo' }, { id: 'horns', name: 'Devil horns' }, { id: 'beanie', name: 'Beanie' },
  { id: 'kabuto', name: 'Kabuto' }, { id: 'pirate', name: 'Pirate' },
];
const FACES = [
  { id: 'none', name: 'None' }, { id: 'gasmask', name: 'Gas mask' }, { id: 'shades', name: 'Shades' },
  { id: 'ninjamask', name: 'Ninja mask' }, { id: 'hockey', name: 'Hockey mask' }, { id: 'mustache', name: 'Mustache' },
  { id: 'beard', name: 'Beard' }, { id: 'eyepatch', name: 'Eye patch' }, { id: 'monocle', name: 'Monocle' },
  { id: 'bowtie', name: 'Bow tie' },
];
const BACKS = [
  { id: 'none', name: 'None' }, { id: 'batwings', name: 'Dragon wings' }, { id: 'angelwings', name: 'Angel wings' },
  { id: 'cape', name: 'Cape' }, { id: 'jetpack', name: 'Jetpack' },
];
// "Classic" keeps the character's outfit; any other color paints the whole body.
const BODY_COLORS = [
  { id: 'classic', name: 'Classic', fill: null },
  { id: 'red', name: 'Red', fill: '#e8352f' }, { id: 'ink', name: 'Shadow', fill: '#2a2c35', outline: '#0b0b0f' },
  { id: 'blue', name: 'Blue', fill: '#2f6fe0' }, { id: 'green', name: 'Green', fill: '#2fa84f' },
  { id: 'gold', name: 'Gold', fill: '#f2b630' }, { id: 'white', name: 'White', fill: '#f4f4f2' },
  { id: 'purple', name: 'Purple', fill: '#8b46d9' }, { id: 'orange', name: 'Orange', fill: '#f07f2a' },
  { id: 'pink', name: 'Pink', fill: '#f06fb0' }, { id: 'cyan', name: 'Cyan', fill: '#22b8cf' },
];
const NAME_MAX = 14;

// Three arenas of different sizes. `players` is the lineup size each suits
// best (used by Random); `cam` bounds how far the camera pans and zooms.
const STAGES = [
  {
    id: 'bath', name: 'Bathhouse', size: 'Small', theme: 'bath', players: [2, 2],
    blurb: 'A cramped wooden deck over the baths. Short blast zones make for fast, brutal duels.',
    plats: [
      { x: 470, y: 640, w: 660, h: 60, solid: true },
      { x: 690, y: 485, w: 220 },
    ],
    spawns: [[590, 640], [1010, 640], [700, 640], [900, 640], [740, 485], [860, 485]],
    blast: { l: 110, r: 1490, t: -360, b: 1050 },
    center: 800, cam: { x: 140, zMin: 0.8, zMax: 1.3, minW: 820 },
  },
  {
    id: 'grove', name: 'Dream Grove', size: 'Medium', theme: 'grove', players: [2, 4],
    blurb: 'A grassy island under a sleepy giant tree, with three floating planks.',
    plats: [
      { x: 360, y: 640, w: 880, h: 90, solid: true },
      { x: 420, y: 500, w: 200 },
      { x: 980, y: 500, w: 200 },
      { x: 700, y: 375, w: 200 },
    ],
    spawns: [[500, 640], [1100, 640], [680, 640], [920, 640], [520, 500], [1080, 500]],
    blast: { l: -260, r: 1860, t: -560, b: 1200 },
    center: 800, cam: { x: 420, zMin: 0.6, zMax: 1.15, minW: 1000 },
  },
  {
    id: 'shrine', name: 'Crimson Shrine', size: 'Large', theme: 'shrine', players: [3, 6],
    blurb: 'A long lacquered pavilion with railings and rafters. Room for a six-fighter brawl.',
    plats: [
      { x: 140, y: 640, w: 1320, h: 70, solid: true },
      { x: 240, y: 500, w: 260 },
      { x: 1100, y: 500, w: 260 },
      { x: 650, y: 470, w: 300 },
      { x: 400, y: 330, w: 240 },
      { x: 960, y: 330, w: 240 },
    ],
    spawns: [[330, 640], [1270, 640], [620, 640], [980, 640], [370, 500], [1230, 500]],
    blast: { l: -520, r: 2120, t: -620, b: 1250 },
    center: 800, cam: { x: 660, zMin: 0.46, zMax: 1.05, minW: 1100 },
  },
];

const CPU_LEVELS = {
  easy: { name: 'Easy', react: 24, aggr: 0.4, dodge: 0.04, cool: 34, miss: 0.35 },
  normal: { name: 'Normal', react: 13, aggr: 0.65, dodge: 0.14, cool: 18, miss: 0.15 },
  hard: { name: 'Hard', react: 6, aggr: 0.9, dodge: 0.32, cool: 8, miss: 0.04 },
};

// Builds a fighter's loadout: the character with its chosen weapon applied
// to every move (damage, knockback, timing, reach and projectiles).
function makeLoadout(ch, wid) {
  const ars = ARSENALS[ch.id];
  const w = ars.find((a) => a.id === wid) || ars[0];
  const m = Object.assign({ dmg: 1, kb: 1, speed: 1, reach: 1, pspeed: 1, pr: 1, pdmg: 1 }, w.mod);
  const moves = {};
  for (const [k, mv] of Object.entries(ch.moves)) {
    const out = {
      ...mv,
      f: [Math.max(1, Math.round(mv.f[0] / m.speed)), mv.f[1], Math.max(2, Math.round(mv.f[2] / m.speed))],
      hb: mv.hb.map(([x, y, r]) => [x * m.reach, y, x === 0 ? r * m.reach : r * (1 + (m.reach - 1) * 0.4)]),
      dmg: mv.dmg * m.dmg, kb: mv.kb * m.kb, ks: mv.ks * m.kb,
    };
    if (mv.proj) {
      out.proj = { ...mv.proj, dmg: mv.proj.dmg * m.dmg * m.pdmg, kb: mv.proj.kb * m.kb, ks: mv.proj.ks * m.kb, speed: mv.proj.speed * m.pspeed, r: mv.proj.r * m.pr, tint: w.tint };
    }
    if (mv.landHit) out.landHit = { ...mv.landHit, dmg: mv.landHit.dmg * m.dmg, kb: mv.landHit.kb * m.kb, ks: mv.landHit.ks * m.kb };
    const ov = w.moves && w.moves[k];
    if (ov) { const { proj, ...rest } = ov; Object.assign(out, rest); if (proj) out.proj = { ...out.proj, ...proj }; }
    moves[k] = out;
  }
  return {
    ...ch, moves, weapon: w.draw, wid: w.id, wname: w.name, wtint: w.tint || null,
    trail: w.trail || ch.trail, reach: m.reach, outfit: OUTFITS[ch.id], size: OUTFITS[ch.id].size,
  };
}
