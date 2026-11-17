// Deterministic screenshot scenes: each shot mode arranges the same world
// the same way every time (seed 1), so the four screenshots are stable.
// Modes: menu (start screen), play (on foot downtown), chase (police
// pursuit at 3 stars), mission (driving the red coupe to the garage).
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
  // Player mesh hides inside the car while driving.
  p.x = car.x; p.z = car.z;
}

export function applyShot(G, mode) {
  const scene = G.scene;
  if (mode === 'menu') {
    placePlayerOnFoot(G, 20, 20, Math.PI * 0.8);
    startMission(G.missions, scene, 0);
    G.started = false;
    G.showStartScreen(true);
    // A wide view of the plaza, the bay and the towers behind the menu.
    G.camera.position.set(60, 26, 90);
    G.camera.lookAt(0, 8, -20);
    G.shotCamera = true;
    return;
  }
  // All gameplay shots run with the HUD on and the game started.
  G.started = true;
  G.paused = false;
  G.showStartScreen(false);
  if (mode === 'play') {
    // On foot in the central plaza, facing north toward the gold beacon
    // for Job 1, with the north road and its traffic right ahead.
    placePlayerOnFoot(G, 0, 30, Math.PI);
    startMission(G.missions, scene, 0);
    G.wanted.level = 0;
    G.camera.position.set(0, 4, 38);
  } else if (mode === 'chase') {
    // Wanted 3, in the red sport coupe, two patrol cars closing in.
    // The coupe sits in the right-hand lane of the north road (x = 0),
    // facing north (-z); the patrol cars start behind it, to the south.
    const coupe = G.parked.find((c) => c.kind === 'sport');
    coupe.x = 3; coupe.z = 60; coupe.yaw = Math.PI;
    coupe.mesh.position.set(3, 0, 60);
    coupe.mesh.rotation.y = Math.PI;
    putPlayerInCar(G, coupe, 22);
    startMission(G.missions, scene, 2);
    addWanted(G.wanted, 3, 'chase');
    ensurePolice(scene, G.police, 3, { x: 3, z: 60 });
    // Park the patrol cars where the chase camera can actually see them:
    // the camera sits ~10 units behind the coupe looking north, so cars
    // placed behind it fall out of frame. Flank the coupe ahead of it
    // instead, in the lanes it is about to cross, so the pursuit reads
    // at a glance.
    const spots = [[-4, 46], [11, 50]];
    G.police.cars.forEach((pc, i) => {
      pc.x = spots[i][0]; pc.z = spots[i][1]; pc.yaw = Math.PI;
      pc.speed = 19;
      pc.mesh.position.set(pc.x, 0, pc.z);
      pc.mesh.rotation.y = Math.PI;
    });
    // A few traffic cars ahead so the chase reads as a chase.
    G.cars.slice(0, 3).forEach((c, i) => {
      c.x = -3 + i * 4; c.z = 60 - 34 - i * 5; c.speed = 8;
      c.mesh.position.set(c.x, 0, c.z);
    });
    G.player.money = 1250;
  } else if (mode === 'mission') {
    // Job 2: driving the stolen red coupe toward the garage marker.
    // The coupe approaches along the z = 80 road, facing west, so the
    // gold beacon at the garage (-40, 80) stands dead ahead in frame
    // instead of behind the camera.
    const coupe = G.parked.find((c) => c.kind === 'sport');
    coupe.x = -8; coupe.z = 80; coupe.yaw = -Math.PI / 2;
    coupe.mesh.position.set(-8, 0, 80);
    coupe.mesh.rotation.y = coupe.yaw;
    putPlayerInCar(G, coupe, 16);
    startMission(G.missions, scene, 1);
    addWanted(G.wanted, 1, 'stolen');
    G.player.money = 420;
  } else {
    placePlayerOnFoot(G, 0, 0, Math.PI);
    startMission(G.missions, scene, 0);
  }
  G.shotCamera = false;
  G.flashMessage(MISSIONS[G.missions.index]?.title || '', 4, G.elapsed);
}
