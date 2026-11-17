// Cars: a low-poly car built from boxes and wheel cylinders, arcade
// driving physics for the player's car, and traffic cars that follow the
// road grid, slow for the car ahead and pause briefly at intersections.
import * as THREE from 'three';
import { WORLD, TUNING, COLOURS } from './config.js';
import { mulberry32, pick, range, clamp, lerp, angleDiff } from './util.js';

const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);

export function makeCarMesh(kind, paint) {
  const g = new THREE.Group();
  g.name = 'car-' + kind;
  const paintMat = new THREE.MeshLambertMaterial({ color: paint });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const sizes = {
    sedan: [2.0, 0.62, 4.4], taxi: [2.0, 0.62, 4.4], sport: [1.9, 0.5, 4.2],
    van: [2.1, 1.1, 5.0], police: [2.0, 0.62, 4.5],
  };
  const [w, h, l] = sizes[kind] || sizes.sedan;
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.scale.set(w, h, l); body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(bodyGeo, kind === 'police' ? paintMat : darkMat);
  cabin.scale.set(w * 0.82, 0.55, l * 0.45);
  cabin.position.set(0, h + 0.28, kind === 'van' ? 0.2 : -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
    sign.scale.set(0.9, 0.22, 0.5); sign.position.set(0, h + 0.68, -0.2);
    g.add(sign);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: COLOURS.policeBlue }));
    bar.scale.set(w * 0.7, 0.18, 0.5); bar.position.set(0, h + 0.62, -0.2);
    g.add(bar);
    const stripe = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: COLOURS.policeBlue }));
    stripe.scale.set(w + 0.02, 0.2, l * 0.9); stripe.position.y = 0.62;
    g.add(stripe);
  }
  g.userData.wheels = [];
  for (const [wx, wz] of [[-w / 2, l / 2 - 0.8], [w / 2, l / 2 - 0.8], [-w / 2, -l / 2 + 0.8], [w / 2, -l / 2 + 0.8]]) {
    const wheel = new THREE.Mesh(wheelGeo, tyreMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
    g.userData.wheels.push(wheel);
  }
  g.userData.halfW = w / 2; g.userData.halfL = l / 2;
  return g;
}

// A car record: mesh + motion state. `driver` is 'player', 'traffic' or 'police'.
export function makeCar(scene, kind, paint, x, z, yaw) {
  const mesh = makeCarMesh(kind, paint);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw;
  scene.add(mesh);
  return {
    mesh, kind, driver: 'traffic', speed: 0, yaw,
    maxSpeed: kind === 'sport' ? TUNING.sportMaxSpeed : TUNING.carMaxSpeed,
    x, z, steer: 0, stopped: 0, horn: 0,
    route: null, // traffic: {axis:'x'|'z', line, dir}
  };
}

export function spawnTraffic(scene, seed, count) {
  const rng = mulberry32(seed + 77);
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'sport', 'sedan'];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = pick(rng, WORLD.roadLines);
    const along = range(rng, -180, 180);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = dir * 3.2; // right-hand lane
    const x = axis === 'x' ? along : line + lane;
    const z = axis === 'x' ? line + lane : along;
    const yaw = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = makeCar(scene, pick(rng, kinds), pick(rng, COLOURS.carPaint), x, z, yaw);
    car.driver = 'traffic';
    car.speed = range(rng, 6, TUNING.trafficSpeed);
    car.route = { axis, line, dir };
    cars.push(car);
  }
  return cars;
}

// Keep a point inside the playable square, bouncing it back at the edge.
function clampToWorld(car) {
  car.x = clamp(car.x, -WORLD.half + 6, WORLD.half - 6);
  car.z = clamp(car.z, -WORLD.half + 6, WORLD.half - 6);
}

// Circle-vs-box push-out used by cars against buildings.
export function collideBoxes(x, z, r, colliders) {
  for (const b of colliders) {
    const cx = clamp(x, b.x - b.hx, b.x + b.hx);
    const cz = clamp(z, b.z - b.hz, b.z + b.hz);
    const dx = x - cx, dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * r;
      z = cz + (dz / d) * r;
      return { x, z, hit: true };
    }
    if (d2 <= 0.0001) { x += r; return { x, z, hit: true }; }
  }
  return { x, z, hit: false };
}

export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    if (car.driver !== 'traffic') continue;
    const r = car.route;
    if (!r) continue;
    // Slow down for a car ahead on the same lane.
    let target = TUNING.trafficSpeed;
    for (const other of cars) {
      if (other === car) continue;
      const ahead = r.axis === 'x'
        ? (other.z - r.line) * r.dir > 0 && Math.abs(other.z - (r.line + r.dir * 3.2)) < 5 && (other.x - car.x) * r.dir > 0 && (other.x - car.x) * r.dir < 12
        : (other.x - r.line) * r.dir > 0 && Math.abs(other.x - (r.line + r.dir * 3.2)) < 5 && (other.z - car.z) * r.dir > 0 && (other.z - car.z) * r.dir < 12;
      if (ahead) { target = 0; break; }
    }
  // Brief pause at intersections, like a stop sign. The pause only
  // triggers when the car is actually crossing a road line, not while
  // it is cruising mid-block.
  const along = r.axis === 'x' ? car.x : car.z;
    const nearCross = WORLD.roadLines.some((L) => Math.abs(along - L) < 3 && Math.abs(along - L) > 0.5);
    if (nearCross && car.stopped <= 0 && Math.abs(along % 80) < 4) car.stopped = 1.2 + Math.random() * 0.8;
    if (car.stopped > 0) { car.stopped -= dt; target = 0; }
    car.speed += clamp(target - car.speed, -14 * dt, 8 * dt);
    if (r.axis === 'x') car.x += r.dir * car.speed * dt;
    else car.z += r.dir * car.speed * dt;
    // Wrap around the far edge so traffic never runs out.
    if (r.axis === 'x' && (car.x > 205 || car.x < -205)) car.x = -Math.sign(car.x) * 200;
    if (r.axis === 'z' && (car.z > 205 || car.z < -205)) car.z = -Math.sign(car.z) * 200;
    const hit = collideBoxes(car.x, car.z, 2.2, colliders);
    car.x = hit.x; car.z = hit.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  }
}

// Arcade driving for the player's car. Returns true when a hard impact happened.
export function drivePlayerCar(car, input, dt, colliders, cars) {
  const k = input.keys;
  const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  const steerIn = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
  const braking = !!k.Space;
  if (fwd > 0) car.speed += TUNING.carAccel * dt;
  else if (fwd < 0) car.speed -= (car.speed > 0.5 ? TUNING.carBrake : TUNING.carReverse) * dt;
  else car.speed -= Math.sign(car.speed) * TUNING.carDrag * dt;
  if (braking) car.speed -= Math.sign(car.speed) * TUNING.carBrake * dt;
  if (Math.abs(car.speed) < 0.15 && fwd === 0) car.speed = 0;
  car.speed = clamp(car.speed, -12, car.maxSpeed);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.steer = lerp(car.steer, steerIn * TUNING.carTurn, Math.min(1, dt * 8));
  car.yaw += car.steer * dirSign * Math.min(1, Math.abs(car.speed) / 8) * dt * 1.6;
  const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
  const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
  const hit = collideBoxes(nx, nz, 2.2, colliders);
  let impact = false;
  if (hit.hit) {
    if (Math.abs(car.speed) > 9) impact = true;
    car.speed *= 0.45;
  }
  car.x = hit.x; car.z = hit.z;
  // Bump into other cars: slow down, shove them a little.
  for (const other of cars) {
    if (other === car) continue;
    const d2 = (other.x - car.x) ** 2 + (other.z - car.z) ** 2;
    if (d2 < 16 && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const push = (4 - d) / 2;
      other.x += ((other.x - car.x) / d) * push;
      other.z += ((other.z - car.z) / d) * push;
      other.mesh.position.x = other.x; other.mesh.position.z = other.z;
      if (Math.abs(car.speed) > 8) impact = true;
      car.speed *= 0.7;
    }
  }
  clampToWorld(car);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  car.mesh.userData.wheels[0].rotation.y = car.steer * 0.3;
  car.mesh.userData.wheels[1].rotation.y = car.steer * 0.3;
  return impact;
}

export function carSpeedKmh(car) { return Math.round(Math.abs(car.speed) * 3.6); }
export { angleDiff };
