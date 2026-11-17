// Combat: fists up close and a pistol with a magazine, tracer lines and
// a muzzle flash. Shooting a pedestrian or an officer raises the wanted
// level; punching a pedestrian does the same.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { knockPed } from './people.js';

export function createCombat(scene) {
  const flash = new THREE.PointLight(0xffc860, 0, 14);
  scene.add(flash);
  return { scene, flash, tracer: null, tracerUntil: 0 };
}

// Left click: punch with fists, shoot with the pistol.
export function tryAttack(G, dt) {
  const p = G.player;
  const now = G.elapsed;
  const wantShoot = p.weapon === 'gun' && (G.input.wasPressed('Mouse0') || G.input.wasPressed('Mouse2'));
  const wantPunch = p.weapon === 'fist' && G.input.wasPressed('Mouse0');
  if (!p.onFoot) return;
  if (wantPunch && now - p.lastPunch > 0.45) {
    p.lastPunch = now;
    G.audio?.swing();
    // Punch the nearest pedestrian in front, within reach.
    for (const ped of G.peds) {
      if (!ped.alive) continue;
      const d2 = (ped.x - p.x) ** 2 + (ped.z - p.z) ** 2;
      if (d2 < TUNING.punchRange * TUNING.punchRange) {
        knockPed(ped, G.scene);
        G.crime('punch');
        G.flashMessage('You hit a pedestrian! The police are coming.');
        break;
      }
    }
    // A punch can also shove a nearby police officer back.
    for (const f of G.police.foot) {
      const d2 = (f.x - p.x) ** 2 + (f.z - p.z) ** 2;
      if (d2 < 6) { f.x += (f.x - p.x) * 1.5; f.z += (f.z - p.z) * 1.5; }
    }
  }
  if (wantShoot) {
    if (p.ammo <= 0) { G.audio?.click(); G.flashMessage('Out of ammo — press R to reload.'); return; }
    if (now - p.lastShot < 0.22) return;
    p.lastShot = now;
    p.ammo -= 1;
    G.audio?.gunshot();
    shootRay(G);
  }
}

function shootRay(G) {
  const p = G.player;
  const cam = G.camera;
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const origin = cam.position.clone();
  // Muzzle flash at the player's hand, tracer to the hit point.
  G.combat.flash.position.copy(p.mesh.position).add(new THREE.Vector3(0, 1.5, 0));
  G.combat.flash.intensity = 26;
  setTimeout(() => { G.combat.flash.intensity = 0; }, 60);
  let end = origin.clone().add(dir.clone().multiplyScalar(TUNING.gunRange));
  let hitPed = null, hitDist = TUNING.gunRange;
  for (const ped of G.peds) {
    if (!ped.alive) continue;
    const to = new THREE.Vector3(ped.x - origin.x, 1.2 - origin.y, ped.z - origin.z);
    const along = to.dot(dir);
    if (along < 0 || along > hitDist) continue;
    const perp = to.clone().add(dir.clone().multiplyScalar(-along)).length();
    if (perp < 1.1) { hitPed = ped; hitDist = along; }
  }
  if (hitPed) {
    end = origin.clone().add(dir.clone().multiplyScalar(hitDist));
    knockPed(hitPed, G.scene);
    G.crime('shoot');
    G.flashMessage('You shot a pedestrian! Wanted level rising.');
  }
  // A miss leaves the tracer ending at full range; nothing else happens.
  // The shot itself is already loud enough to draw attention nearby.
  // A tracer line from the camera to the impact point.
  if (G.combat.tracer) G.scene.remove(G.combat.tracer);
  const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8 }));
  G.scene.add(line);
  G.combat.tracer = line;
  G.combat.tracerUntil = G.elapsed + 0.09;
}

export function updateCombat(G) {
  if (G.combat.tracer && G.elapsed > G.combat.tracerUntil) {
    G.scene.remove(G.combat.tracer);
    G.combat.tracer = null;
  }
}

// Reload the pistol (R). Ammo is free at Nadia's cafe — the story says so.
export function reload(G) {
  const p = G.player;
  if (p.weapon !== 'gun' || p.ammo === TUNING.magSize) return;
  p.ammo = TUNING.magSize;
  G.audio?.reload();
  G.flashMessage('Reloaded. ' + p.ammo + ' rounds ready.');
}
