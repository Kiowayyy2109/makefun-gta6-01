// Shared constants for Port Aurelia: world size, roads, tuning, colours.
// Nothing here names a real place, person or brand; everything is invented.
export const WORLD = {
  half: 210,            // playable ground extends -210..210 on x and z
  roadGap: 80,          // distance between parallel road centre lines
  roadWidth: 13,
  roadLines: [-160, -80, 0, 80, 160],
  sidewalk: 4,          // sidewalk strip beside each road
  seaZ: 196,            // beach / water starts south of this z
  bridgeX: 0,           // the north bridge crosses at x = 0
};

export const TUNING = {
  walkSpeed: 6, runSpeed: 11, jumpSpeed: 8.5, gravity: 24,
  carAccel: 16, carBrake: 30, carReverse: 9, carMaxSpeed: 34,
  sportMaxSpeed: 44, carTurn: 1.9, carDrag: 0.6,
  pedSpeed: 1.6, trafficSpeed: 9, policeSpeed: 15,
  maxWanted: 5, wantedDecaySeconds: 22,
  punchDamage: 20, punchRange: 2.4, gunDamage: 34, gunRange: 60,
  magSize: 12, startMoney: 120, startHealth: 100,
  // A police ram hurts, but the cooldown stops a pile-up from deleting
  // the player's whole health bar in a single second.
  ramDamage: 14, ramCooldown: 1.2,
};

export const COLOURS = {
  sky: 0xffd9a3, fog: 0xf2c49b, sun: 0xffd9a3,
  asphalt: '#33373d', asphaltLine: '#e8d44d', sidewalk: '#b9b3a4',
  grass: '#5d9b4a', sand: '#e0c98f', water: 0x2a7fa8,
  plaza: '#c9bfa8', roof: ['#c96f4a', '#7a8ba0', '#d9a441', '#8a6f9b', '#5d8a6a', '#b05555'],
  wall: ['#e8dcc8', '#d8c9b0', '#c8d4dc', '#e0b8a0', '#b8c8b0', '#d8d0e0'],
  glassWall: ['#2e4a5e', '#35586e', '#274156', '#3d6076'],
  glass: '#2c4a63',
  carPaint: [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xe8e8e8, 0x222831, 0xd06a1e, 0x7a4dbb],
  taxi: 0xf2c230, policePaint: 0xf2f2f2, policeBlue: 0x1c4fd6,
};

// Seven story jobs, in order. Each job: title, briefing, target point,
// what finishes it, and the cash reward. Race jobs carry `gates` (an
// ordered list of checkpoints) and timed jobs carry `timeLimit` seconds.
export const MISSIONS = [
  { title: 'Job 1 — First Delivery', text: 'Nadia needs a parcel on Coral Row. Reach the gold marker.',
    target: [40, 0, -40], kind: 'reach', reward: 150, hint: 'Follow the gold beacon. Walk or take a car.' },
  { title: 'Job 2 — Hot Wheels', text: 'A red sport coupe is parked by the plaza. Take it and bring it to the garage.',
    target: [-40, 0, 80], kind: 'deliverCar', reward: 300, hint: 'Press E near the red coupe, then drive to the garage marker.' },
  { title: 'Job 3 — Checkpoint Run', text: 'Nadia is timing you. Hit all five gold gates around the bay before the clock runs out.',
    target: [0, 0, 80], kind: 'race', reward: 500, timeLimit: 90,
    gates: [[0, 0, 80], [80, 0, 80], [80, 0, 0], [80, 0, -80], [0, 0, -80]],
    hint: 'Drive through each gold ring in order. The HUD counts the gates and the seconds left.' },
  { title: 'Job 4 — Harbor Run', text: 'A crate for the harbor. The docks are watching — expect heat.',
    target: [120, 0, 170], kind: 'reach', reward: 450, hint: 'Deliver to the pier. Police will be looking.' },
  { title: 'Job 5 — Lose the Heat', text: 'The bay police are on you. Shake them off until the stars clear.',
    target: [0, 0, 0], kind: 'escape', reward: 600, hint: 'Stay out of sight and out of trouble until wanted drops to zero.' },
  { title: 'Job 6 — Rush Delivery', text: 'A feverish buyer on the west shore pays double, but only if the parcel lands fast. Beat the clock.',
    target: [-160, 0, 80], kind: 'timed', reward: 700, timeLimit: 75, hint: 'Reach the marker before the timer in the HUD runs out.' },
  { title: 'Job 7 — The Last Drop', text: 'One last parcel, across the north bridge to the old plaza. Finish the story.',
    target: [-120, 0, -160], kind: 'reach', reward: 1000, hint: 'Cross the bridge and reach the north plaza marker.' },
];

export const SAVE_KEY = 'portAureliaSaveV1';
