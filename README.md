# Port Aurelia — Sun, Smoke & Sirens

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kiowayyy2109/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kiowayyy2109/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for the make.fun **gta6-01** competition:
explore the sun-soaked coastal city of **Port Aurelia** on foot and by car,
steal cars, outrun the Aurelia Bay Police, and run seven story jobs for
Nadia Cole — from a first delivery on Coral Row to a last drop across the
north bridge.

## What is in the game

- **Golden-hour city** — a road grid with sidewalks, plazas, a harbour
  pier, a beach and a north bridge, lit by a low warm sun under a
  peach-to-blue gradient sky. Low-poly towers mix plaster facades with
  dark reflective glass, rooftop AC boxes and water tanks, street lamps
  and 72 palms.
- **Signage and landmarks** — invented-brand billboards (Hotel Aurelia,
  Café Coral, Bay View Motors, Club Lumen, Aurelia Bank, Nadia's Café),
  neon strips around the plaza, a striped lighthouse, bobbing boats, a
  turning ferris wheel, and beach umbrellas with towels on the sand.
- **On foot** — WASD + mouse look, run, jump, punch.
- **Driving** — press E to take any car (sedan, taxi, van, sport coupe,
  police cruiser), arcade handling, braking, collisions, F to step out.
  Every car has glowing headlights and tail lights; patrol cars flash
  their red/blue light bars.
- **Traffic and pedestrians** — 20 traffic cars follow the roads and
  pause at intersections; 28 walkers stroll the sidewalks, the plaza
  and the beach promenade, and scatter from fast cars.
- **Wanted level** — 0–5 stars for stealing, hitting people and shooting.
  Patrol cars chase and ram you (four of them at five stars); foot
  officers close in at 3+ stars. Stars fade when you lie low.
- **Seven story missions** — deliveries, a car theft, a five-gate
  checkpoint run against the clock, a harbour run, losing the heat, a
  timed rush delivery, and a final drop, each with a gold beacon, a HUD
  objective and a cash reward.
- **Hidden parcels** — twelve glowing parcels are hidden across the
  city; collect each one for $50, tracked on the HUD and in the save.
- **Combat** — fists and a pistol with a magazine, tracer and muzzle flash.
- **HUD and minimap** — health, money, stars, clock, parcels, speed,
  objective, and a round minimap showing you, police, cars, walkers,
  parcels and the mission marker.
- **Sound** — fully synthesized WebAudio: engine, horn, gunshots, sirens,
  coins and a bass-line loop. No audio files.
- **Save** — money, mission progress and parcels persist in localStorage;
  Continue resumes where you left off.

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
(`city.js`, `signs.js`, `landmarks.js`, `vehicles.js`, `people.js`,
`player.js`, `police.js`, `missions.js`, `activities.js`, `combat.js`,
`hud.js`, `audio.js`, `input.js`, `shots.js`, `main.js`).
