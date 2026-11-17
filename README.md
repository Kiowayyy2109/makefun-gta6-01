# Port Aurelia — Sun, Smoke & Sirens

![gta6-01](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/Kiowayyy2109/makefun-gta6-01/rank.svg)
![reward](https://make.fun/badge/gta6-01/Kiowayyy2109/makefun-gta6-01/reward.svg)

An original open-world crime game for the make.fun **gta6-01** competition:
explore the sun-soaked coastal city of **Port Aurelia** on foot and by car,
steal cars, outrun the Aurelia Bay Police, and run five story jobs for
Nadia Cole — from a first delivery on Coral Row to a last drop across the
north bridge.

## What is in the game

- **A living city** — a road grid with sidewalks, plazas, a harbour pier, a
  beach, a north bridge, low-poly towers with procedural window facades,
  street lamps and palms, all generated from a seed.
- **On foot** — WASD + mouse look, run, jump, punch.
- **Driving** — press E to take any car (sedan, taxi, van, sport coupe,
  police cruiser), arcade handling, braking, collisions, F to step out.
- **Traffic and pedestrians** — cars follow the roads and pause at
  intersections; walkers stroll the sidewalks and scatter from fast cars.
- **Wanted level** — 0–5 stars for stealing, hitting people and shooting.
  Patrol cars chase and ram you; foot officers close in at 3+ stars. Stars
  fade when you lie low.
- **Five story missions** — deliveries, a car theft, a harbour run, losing
  the heat, and a final drop, each with a gold beacon, a HUD objective and
  a cash reward.
- **Combat** — fists and a pistol with a magazine, tracer and muzzle flash.
- **HUD and minimap** — health, money, stars, clock, speed, objective, and
  a round minimap showing you, police, cars, walkers and the mission marker.
- **Sound** — fully synthesized WebAudio: engine, horn, gunshots, sirens,
  coins and a bass-line loop. No audio files.
- **Save** — money and mission progress persist in localStorage; Continue
  resumes where you left off.

## Play it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome.

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk / drive |
| Mouse | Look (click to lock the pointer) |
| Shift | Run |
| Space | Jump / brake while driving |
| E | Enter / steal a nearby car |
| F | Leave the car |
| Click | Punch |
| 2 then click | Pistol (R reloads) |
| H | Horn |
| Esc | Pause |
| M | Mute |

## Tech

Three.js 0.170.0, vendored locally under `game/vendor/` — the game makes
no network request. All art is procedural and all sound is synthesized.
Source lives in `game/` as small modules with one job each
(`city.js`, `vehicles.js`, `people.js`, `player.js`, `police.js`,
`missions.js`, `combat.js`, `hud.js`, `audio.js`, `input.js`, `shots.js`,
`main.js`).
