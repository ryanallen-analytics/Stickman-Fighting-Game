# Stick Clash

A 2D platform fighter in the spirit of Brawlhalla and Super Smash Bros, with all-stickman fighters. It is plain HTML5 Canvas and JavaScript with no build step and no dependencies.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
npx http-server -p 8080 .   # then open http://localhost:8080
```

The menu runs a live 4-CPU battle in the background. Pick fighters for up to 6 slots (Player 1, Player 2, or CPU), set the rules, and press **Fight!**

## Customization

Press **Style** on any lineup slot to open its customizer:

- **Name:** up to 14 characters. It's shown on the fighter's name tag, the HUD card, and the results screen.
- **Hat:** top hat, cap, cowboy hat, crown, viking helmet, party hat, wizard hat, headband, or halo.
- **Accessory:** shades, mustache, beard, eye patch, monocle, bow tie, or a cape with rope physics.

Hats pop off and tumble away when a fighter is K.O.'d. Your lineup and looks are saved in the browser.

## Controls

| Action | Player 1 | Player 2 | Gamepad |
| --- | --- | --- | --- |
| Move | `A` `D` | `←` `→` | Stick / D-pad |
| Jump (double/triple in air) | `W` / `Space` | `↑` | A / Y |
| Aim, fast-fall, drop through | `W` `S` | `↑` `↓` | Stick |
| Light attack | `J` | `,` / `Num1` | X |
| Heavy (signature) | `K` | `.` / `Num2` | B |
| Dodge (spot, roll, air) | `L` / `Shift` | `/` / `Num3` | Bumpers |

Hold a direction while attacking to pick the move. Each character has neutral, side, up and down lights, plus aerials and four heavy signature moves. Up + Heavy is the recovery move. `Esc` pauses and `M` mutes. On touch screens, an on-screen stick and buttons appear.

## Rules

- Every stock starts with 100 HP. Hits deal damage, and knockback grows as HP drops.
- If your HP hits 0, you're K.O.'d: the body goes into an active ragdoll, flailing in the air and bracing or curling up when it lands, and drops its weapon.
- If you're launched past the blast zone, it's a ring-out.
- The last fighter with stocks left wins.

## Fighters

| Fighter | Style | Weapon | Signature moves |
| --- | --- | --- | --- |
| KADE | Brawler | Fists | Haymaker, Rocket Punch, Rising Dragon, Ground Pound |
| SORA | Ronin | Katana | Iaido draw-cut, Wind Dash, Rising Gale, Parry (counter) |
| BRUTUS | Titan | Warhammer | Titan Smash (armored), Bull Rush, Helicopter, Earthquake |
| VEX | Lancer | Spear | Javelin throw, Lunge, Sky Pierce, Sweeping Moon |
| NYX | Shade | Twin daggers | Shuriken, Shadow Step teleport, Shadow Flip, Smoke Bomb |
| COLT | Gunslinger | Revolver | Quick Draw, Scattershot, Rocket Jump, Grenade |
| ORIN | Mystic | Staff | Fireball, Force Wave, Levitate, Thunder Call |

## Power-ups

Power-ups parachute onto the stage: **Health** (+35 HP), **Rage** (+45% damage), **Haste** (speed), **Shield** (absorbs 40 damage), **Giant** (bigger, heavier, stronger), and **Bombs**. While you hold bombs, a neutral Light attack throws one.

## Stages

**Notebook** (a hardback book and pencil platforms on ruled paper), **Sunset Peaks** (twin floating islands), and **Sky Temple** (a marble arena with drop-through ledges).

## Code layout

- `js/data.js`: skeleton dimensions, poses, characters and movesets, stages, and CPU levels. Moves are data: frame timings, pose keyframes, hitboxes, knockback, and projectiles.
- `js/engine.js`: audio synthesis, input, forward kinematics and drawing, effects, projectiles, the ragdoll, and the `Fighter` state machine.
- `js/game.js`: CPU AI, power-ups, hit resolution and K.O.s, the camera, backgrounds, and the HUD.
- `js/ui.js`: menus, character select, results, touch controls, and the fixed-timestep main loop.
