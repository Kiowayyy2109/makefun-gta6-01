// The player on foot: WASD movement relative to the camera, running,
// jumping with simple gravity, collision against building boxes, and a
// low-poly body that the third-person camera follows.
import * as THREE from 'three';
import { WORLD, TUNING } from './config.js';
import { clamp } from './util.js';
import { collideBoxes } from './vehicles.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  g.name = 'player';
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2e6f8e });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3242 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.34), jacket);
  body.position.y = 1.08; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.position.y = 1.78; head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56),
    new THREE.MeshLambertMaterial({ color: 0xd8b13c }));
  cap.position.y = 1.98;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), jeans);
  legL.position.set(-0.15, 0.33, 0);
  const legR = legL.clone(); legR.position.x = 0.15;
  g.add(body, head, cap, legL, legR);
  g.userData.legL = legL; g.userData.legR = legR;
  return g;
}

export function createPlayer(scene, x, z) {
  const mesh = makePlayerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, y: 0, vy: 0, yaw: Math.PI, pitch: -0.12,
    health: TUNING.startHealth, money: TUNING.startMoney,
    onFoot: true, car: null, grounded: true, walkPhase: 0,
    weapon: 'fist', ammo: TUNING.magSize, lastShot: 0, lastPunch: 0,
  };
}

// Move on foot. `yaw` is the camera yaw; movement is relative to it.
export function updatePlayerOnFoot(p, input, dt, colliders, peds, onPedHit) {
  const k = input.keys;
  const look = input.takeLook();
  p.yaw -= look.dx * 0.0026;
  p.pitch = clamp(p.pitch - look.dy * 0.0022, -0.9, 0.55);
  const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  const running = !!(k.ShiftLeft || k.ShiftRight);
  const speed = running ? TUNING.runSpeed : TUNING.walkSpeed;
  const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  let mx = 0, mz = 0;
  // Camera looks along -Z rotated by yaw; forward is (-sin, -cos) in x/z.
  mx += -sin * fwd + cos * strafe;
  mz += -cos * fwd - sin * strafe;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    const nx = p.x + mx * speed * dt;
    const nz = p.z + mz * speed * dt;
    const hit = collideBoxes(nx, nz, 0.55, colliders);
    p.x = hit.x; p.z = hit.z;
    p.walkPhase += dt * speed * 1.6;
    p.mesh.rotation.y = Math.atan2(mx, mz);
  }
  // Jump and gravity. Holding Space only jumps once per landing because
  // the grounded flag clears on take-off and only resets at y = 0.
  if ((k.Space) && p.grounded) { p.vy = TUNING.jumpSpeed; p.grounded = false; }
  if (!p.grounded) {
    p.vy -= TUNING.gravity * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.grounded = true; }
  }
  p.x = clamp(p.x, -WORLD.half + 4, WORLD.half - 4);
  p.z = clamp(p.z, -WORLD.half + 4, WORLD.half - 4);
  p.mesh.position.set(p.x, p.y, p.z);
  const swing = Math.sin(p.walkPhase) * (len > 0.01 ? 0.5 : 0);
  p.mesh.userData.legL.rotation.x = swing;
  p.mesh.userData.legR.rotation.x = -swing;
  // Bumping into a pedestrian at speed knocks them over.
  for (const ped of peds) {
    if (!ped.alive) continue;
    const d2 = (ped.x - p.x) ** 2 + (ped.z - p.z) ** 2;
    if (d2 < 1.1 && len > 0.01 && running) onPedHit(ped);
  }
  return len > 0.01;
}

// Third-person camera: behind the player on foot, or behind the car.
export function updateCamera(camera, p, dt) {
  let cx, cy, cz, tx, ty, tz;
  if (p.onFoot) {
    const back = 7.5, up = 3.4;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    cx = p.x + sin * back; cz = p.z + cos * back;
    cy = p.y + up - p.pitch * 4;
    tx = p.x; ty = p.y + 1.6; tz = p.z;
  } else if (p.car) {
    const car = p.car;
    const back = 10.5, up = 4.2;
    const sin = Math.sin(car.yaw), cos = Math.cos(car.yaw);
    cx = car.x - sin * back; cz = car.z - cos * back;
    cy = up;
    tx = car.x + sin * 8; ty = 1.4; tz = car.z + cos * 8;
  }
  const k = 1 - Math.pow(0.0001, dt); // smooth follow
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (cy - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(tx, ty, tz);
}
