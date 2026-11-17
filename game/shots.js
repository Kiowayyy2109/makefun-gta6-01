// Deterministic screenshot scenes: each shot mode arranges the same
// world the same way every time (seed 1), so the four screenshots are
// stable. All four are live gameplay with the HUD on — no menu shot.
// Modes: chase (coastal police pursuit, the cover), play (on foot in
// the plaza), mission (checkpoint race mid-run), harbor (pier, wheel,
// lighthouse and boats at golden hour).
import { MISSIONS } from './config.js';
import { startMission } from './missions.js';
import { addWanted, ensurePolice } from './police.js';

function placePlayerOnFoot(G, x, z, yaw) {
  const p = G.player;
  p.onFoot = true; p.car = null;
  p.x = x; p.z = z; p.y = 0; p.yaw = yaw;
  p.mesh.position.set(x, 0, z);
  p.mesh.visible = true;
}

function putPlayerInCar(G, car, speed) {
  const p = G.player;
  if (p.car) p.car.driver = 'traffic';
  car.driver = 'player';
  p.car = car;
  p.onFoot = false;
  p.mesh.visible = false;
  car.speed = speed || 0;
  p.x = car.x; p.z = car.z;
}

function movePedsNear(G, cx, cz, count, spread) {
  G.peds.slice(0, count).forEach((ped, i) => {
    ped.x = cx + ((i * 7) % spread) - spread / 2;
    ped.z = cz + ((i * 11) % spread) - spread / 2;
    ped.mesh.position.set(ped.x, 0, ped.z);
  });
}

export function applyShot(G, mode) {
  const scene = G.scene;
  // All shots run with the HUD on and the game started.
  G.started = true;
  G.paused = false;
  G.showStartScreen(false);
  if (mode === 'chase') {
    // COVER: golden-hour pursuit on the coastal road (z = 160). The
    // player sport coupe runs east in the right lane, two patrol cars
    // frame it from behind, traffic ahead, walkers on the sidewalk,
    // the sea to the right and the towers behind. Wanted 3, and the
    // Harbor Run objective is on the HUD.
    const coupe = G.parked.find((c) => c.kind === 'sport');
    coupe.x = 20; coupe.z = 163.2; coupe.yaw = Math.PI / 2;
    coupe.mesh.position.set(20, 0, 163.2);
    coupe.mesh.rotation.y = Math.PI / 2;
    putPlayerInCar(G, coupe, 22);
    startMission(G.missions, scene, 3); // Job 4 — Harbor Run
    addWanted(G.wanted, 3, 'chase');
    ensurePolice(scene, G.police, 3, { x: 20, z: 163 });
    // One patrol car pulls alongside on the seaward lane, the other
    // cuts in ahead — both inside the chase camera's frame (the camera
    // sits west of the coupe looking east, so cars placed behind the
    // coupe would fall out of shot).
    const spots = [[23, 168.8], [38, 157.2]];
    G.police.cars.forEach((pc, i) => {
      pc.x = spots[i][0]; pc.z = spots[i][1]; pc.yaw = Math.PI / 2;
      pc.speed = 19;
      pc.mesh.position.set(pc.x, 0, pc.z);
      pc.mesh.rotation.y = Math.PI / 2;
    });
    const traffic = G.cars.filter((c) => c.driver === 'traffic').slice(0, 3);
    traffic.forEach((c, i) => {
      c.x = 52 + i * 16; c.z = 163.2; c.speed = 8;
      c.mesh.position.set(c.x, 0, c.z);
    });
    movePedsNear(G, 34, 180, 4, 12);
    G.player.money = 1450;
  } else if (mode === 'play') {
    // On foot in the central plaza, facing north toward the Job 1
    // beacon, with walkers around, traffic on the ring roads,
    // billboards and neon on the plaza buildings.
    placePlayerOnFoot(G, 18, 26, 0);
    startMission(G.missions, scene, 0);
    G.wanted.level = 0;
    movePedsNear(G, 12, 14, 7, 22);
    G.camera.position.set(18, 4, 36);
    G.player.money = 270;
  } else if (mode === 'mission') {
    // Job 3 Checkpoint Run, mid-race: one gate cleared, the coupe is
    // closing on gate 2 with 63 seconds left on the HUD clock.
    const coupe = G.parked.find((c) => c.kind === 'sport');
    coupe.x = 52; coupe.z = 83.2; coupe.yaw = Math.PI / 2;
    coupe.mesh.position.set(52, 0, 83.2);
    coupe.mesh.rotation.y = Math.PI / 2;
    putPlayerInCar(G, coupe, 18);
    startMission(G.missions, scene, 2); // Job 3 — Checkpoint Run
    G.missions.raceGate = 1;
    G.missions.timeLeft = 63;
    const gate = MISSIONS[2].gates[1];
    if (G.missions.marker) G.missions.marker.position.set(gate[0], 0, gate[2]);
    if (G.beacon) G.beacon.position.set(gate[0], 23, gate[2]);
    // Keep the race road clear so the shot is a clean run at the gate,
    // not a fender-bender with a crossing taxi.
    for (const c of G.cars) {
      if (c.driver === 'traffic' && Math.abs(c.z - 80) < 24 && c.x > -40) {
        c.x = -180; c.mesh.position.set(c.x, 0, c.z);
      }
    }
    // The parked taxi normally sits right in the run-up to gate 2.
    const taxi = G.parked.find((c) => c.kind === 'taxi');
    if (taxi) {
      taxi.x = -120; taxi.z = -120;
      taxi.mesh.position.set(-120, 0, -120);
    }
    G.player.money = 570;
  } else if (mode === 'harbor') {
    // The harbour at golden hour: on foot on the shore road, looking
    // south over the pier, the ferris wheel, the lighthouse and the
    // boats, with beach umbrellas and walkers on the sand.
    placePlayerOnFoot(G, 102, 148, Math.PI);
    startMission(G.missions, scene, 3); // Job 4 — Harbor Run
    G.wanted.level = 0;
    movePedsNear(G, 108, 172, 4, 20);
    G.player.money = 1020;
  } else {
    placePlayerOnFoot(G, 0, 0, Math.PI);
    startMission(G.missions, scene, 0);
  }
  G.shotCamera = false;
  G.flashMessage(MISSIONS[G.missions.index]?.title || '', 4, G.elapsed);
}
