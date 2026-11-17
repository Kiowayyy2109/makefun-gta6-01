// Wanted level and the Aurelia Bay Police: patrol cars that chase the
// player, foot officers who close in on foot, stars that rise with crime
// and fade when the player lies low.
import * as THREE from 'three';
import { TUNING, COLOURS } from './config.js';
import { clamp, angleDiff } from './util.js';
import { makeCar, collideBoxes } from './vehicles.js';

export function createWanted() {
  return { level: 0, heat: 0, quietFor: 0, flash: 0 };
}

// Add stars for a crime, capped at five. `heat` keeps the level sticky.
export function addWanted(w, stars, reason) {
  w.level = clamp(w.level + stars, 0, TUNING.maxWanted);
  w.heat = 100;
  w.quietFor = 0;
  w.flash = 1;
  return reason;
}

// Per-frame: decay the level after a quiet spell, and drive police cars.
export function updateWanted(w, dt, committingCrime) {
  if (committingCrime) { w.quietFor = 0; w.heat = 100; }
  else {
    w.quietFor += dt;
    if (w.quietFor > TUNING.wantedDecaySeconds && w.level > 0) {
      w.level -= 1;
      w.quietFor = 0;
      w.heat = 60;
    }
  }
  if (w.flash > 0) w.flash -= dt;
}

// Spawn (or reuse) the right number of patrol cars for the wanted level.
export function ensurePolice(scene, police, wantedLevel, playerPos) {
  const want = wantedLevel === 0 ? 0 : wantedLevel <= 2 ? 1 : wantedLevel <= 4 ? 2 : 4;
  while (police.cars.length < want) {
    const i = police.cars.length;
    const a = (i / 3) * Math.PI * 2 + 0.7;
    const car = makeCar(scene, 'police', COLOURS.policePaint,
      playerPos.x + Math.sin(a) * 42, playerPos.z + Math.cos(a) * 42, a);
    car.driver = 'police';
    car.speed = 0;
    police.cars.push(car);
  }
  while (police.cars.length > want) {
    const car = police.cars.pop();
    scene.remove(car.mesh);
  }
  // Foot officers appear at wanted 3 and up.
  const wantFoot = wantedLevel >= 3 ? wantedLevel - 2 : 0;
  while (police.foot.length < wantFoot) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x1c3f7a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.34), mat);
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.72;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), mat);
    cap.position.y = 1.95;
    g.add(body, head, cap);
    const a = Math.random() * Math.PI * 2;
    g.position.set(playerPos.x + Math.sin(a) * 18, 0, playerPos.z + Math.cos(a) * 18);
    scene.add(g);
    police.foot.push({ mesh: g, x: g.position.x, z: g.position.z });
  }
  while (police.foot.length > wantFoot) {
    const f = police.foot.pop();
    scene.remove(f.mesh);
  }
}

// Patrol cars steer toward the player and ram; foot officers run at them.
// A ram only hurts on a cooldown so a pile-up cannot delete the whole
// health bar in one second (see TUNING.ramDamage / ramCooldown).
export function updatePolice(police, dt, player, colliders, onCaught) {
  const px = player.onFoot ? player.x : player.car.x;
  const pz = player.onFoot ? player.z : player.car.z;
  // Light bars blink red/blue against each other, twice a second.
  const blinkOn = Math.floor(performance.now() / 420) % 2 === 0;
  for (const car of police.cars) {
    const bar = car.mesh.userData.lightBar;
    if (bar) {
      bar.redMesh.visible = blinkOn;
      bar.blueMesh.visible = !blinkOn;
    }
    const targetYaw = Math.atan2(px - car.x, pz - car.z);
    car.yaw += clamp(angleDiff(car.yaw, targetYaw), -2.4 * dt, 2.4 * dt);
    car.speed = Math.min(car.speed + 12 * dt, TUNING.policeSpeed + (player.car ? 4 : 0));
    const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
    const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
    const hit = collideBoxes(nx, nz, 2.2, colliders);
    car.x = hit.x; car.z = hit.z;
    if (hit.hit) car.speed *= 0.5;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
    const d2 = (car.x - px) ** 2 + (car.z - pz) ** 2;
    if (d2 < 9) onCaught('ram');
  }
  for (const f of police.foot) {
    const dx = px - f.x, dz = pz - f.z;
    const d = Math.hypot(dx, dz) || 1;
    const sp = 5.2;
    f.x += (dx / d) * sp * dt;
    f.z += (dz / d) * sp * dt;
    f.mesh.position.set(f.x, 0, f.z);
    f.mesh.rotation.y = Math.atan2(dx, dz);
    if (d < 1.6) onCaught('arrest');
  }
}
