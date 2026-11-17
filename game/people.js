// Pedestrians: simple low-poly walkers who stroll along the sidewalks,
// turn at intersections, and scatter when a car comes at them.
import * as THREE from 'three';
import { WORLD, TUNING } from './config.js';
import { mulberry32, pick, range, clamp } from './util.js';

const SHIRTS = [0xd95f4b, 0x4b8ad9, 0x58b368, 0xe0b13c, 0x9b5fb0, 0xe8e8e8, 0x3c3c46, 0xd97fb0];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a34, 0xf0c8a0];

export function makePedMesh(rng) {
  const g = new THREE.Group();
  g.name = 'pedestrian';
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, SKINS) });
  const legs = new THREE.MeshLambertMaterial({ color: 0x2c3242 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), shirt);
  body.position.y = 1.05; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.72; head.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), legs);
  legL.position.set(-0.14, 0.31, 0);
  const legR = legL.clone(); legR.position.x = 0.14;
  g.add(body, head, legL, legR);
  g.userData.legL = legL; g.userData.legR = legR;
  return g;
}

export function spawnPedestrians(scene, seed, count) {
  const rng = mulberry32(seed + 31);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = makePedMesh(rng);
    // The last eight walkers stroll the beach promenade and the plaza
    // edge instead of the sidewalks, so the shore feels alive.
    if (i >= count - 8) {
      const alongB = range(rng, -180, 180);
      mesh.position.set(alongB, 0, 184);
      scene.add(mesh);
      peds.push({
        mesh, x: alongB, z: 184, axis: 'x', line: 180, off: 4,
        dir: rng() < 0.5 ? 1 : -1,
        speed: range(rng, 1.1, TUNING.pedSpeed + 0.9),
        walkPhase: rng() * 6, alive: true, scared: 0,
      });
      continue;
    }
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = pick(rng, WORLD.roadLines);
    const along = range(rng, -180, 180);
    const side = rng() < 0.5 ? 1 : -1;
    const off = side * (WORLD.roadWidth / 2 + 2.2);
    const x = axis === 'x' ? along : line + off;
    const z = axis === 'x' ? line + off : along;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z, axis, line, off, dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.1, TUNING.pedSpeed + 0.9),
      walkPhase: rng() * 6, alive: true, scared: 0,
    });
  }
  return peds;
}

// A walker follows its sidewalk line; at an intersection it may turn onto
// the crossing street. A nearby fast car makes it run to the side.
// Walkers never step onto the road itself: their offset from the road
// centre line stays on the sidewalk strip.
export function updatePedestrians(peds, dt, cars) {
  for (const p of peds) {
    if (!p.alive) continue;
    let speed = p.speed;
    for (const car of cars) {
      const d2 = (car.x - p.x) ** 2 + (car.z - p.z) ** 2;
      if (d2 < 36 && Math.abs(car.speed) > 4) { speed = p.speed * 3.2; p.scared = 1.5; break; }
    }
    if (p.scared > 0) p.scared -= dt;
    if (p.axis === 'x') p.x += p.dir * speed * dt;
    else p.z += p.dir * speed * dt;
    // Turn around at the city edge, and sometimes at an intersection.
    const along = p.axis === 'x' ? p.x : p.z;
    if (along > 195 || along < -195) p.dir *= -1;
    if (WORLD.roadLines.some((L) => Math.abs(along - L) < 0.6) && Math.random() < 0.004) {
      p.axis = p.axis === 'x' ? 'z' : 'x';
      p.line = WORLD.roadLines.reduce((best, L) => Math.abs(L - (p.axis === 'x' ? p.z : p.x)) < Math.abs(best - (p.axis === 'x' ? p.z : p.x)) ? L : best, WORLD.roadLines[0]);
      p.off = (p.axis === 'x' ? p.z : p.x) - p.line;
      p.dir = Math.random() < 0.5 ? 1 : -1;
    }
    p.walkPhase += dt * speed * 4;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.axis === 'x' ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
    const swing = Math.sin(p.walkPhase) * 0.45;
    p.mesh.userData.legL.rotation.x = swing;
    p.mesh.userData.legR.rotation.x = -swing;
  }
}

// Knock a pedestrian down (used by car hits and punches). Returns the ped.
export function knockPed(p, scene) {
  p.alive = false;
  p.mesh.rotation.x = -Math.PI / 2;
  p.mesh.position.y = 0.35;
  setTimeout(() => {
    if (!p.alive) { scene.remove(p.mesh); }
  }, 9000);
  return p;
}

export { clamp };
