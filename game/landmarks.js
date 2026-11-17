// Landmarks: the harbour dressing that makes the south shore read at a
// glance — a striped lighthouse at the pier's end, bobbing boats, a slow
// ferris wheel on the pier green, and beach umbrellas with towels on the
// sand. All low-poly boxes, cylinders and cones; animated cheaply.
import * as THREE from 'three';
import { range } from './util.js';

function makeBoat(rng, x, z) {
  const g = new THREE.Group();
  const hullColours = [0xe8e8e8, 0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xd06a1e];
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1, 5.2),
    new THREE.MeshLambertMaterial({ color: hullColours[Math.floor(rng() * hullColours.length)] })
  );
  hull.position.y = 0.4;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.9, 1.8),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })
  );
  cabin.position.set(0, 1.3, -0.6);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 })
  );
  mast.position.set(0, 2.4, 0.9);
  g.add(hull, cabin, mast);
  g.position.set(x, 0, z);
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

function makeFerrisWheel(x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const steel = new THREE.MeshLambertMaterial({ color: 0xd8dee6 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 15, 6), steel);
    leg.position.set(s * 4.2, 7, 0);
    leg.rotation.z = s * 0.28;
    root.add(leg);
  }
  const wheel = new THREE.Group();
  wheel.position.set(0, 14.5, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.35, 8, 36), steel);
  wheel.add(rim);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0xb8c2cc });
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 20.4, 5), spokeMat);
    spoke.rotation.z = (i / 6) * Math.PI;
    wheel.add(spoke);
  }
  const cabinColours = [0xff5a4e, 0xffd23f, 0x4d8dff, 0x58b368, 0xff9ef0, 0xff8a3c, 0x7dd8a8, 0xe8e8e8];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.5, 1.4),
      new THREE.MeshLambertMaterial({ color: cabinColours[i] })
    );
    cabin.position.set(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 0);
    cabin.name = 'wheelCabin';
    wheel.add(cabin);
  }
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  wheel.add(hub);
  root.add(wheel);
  return { root, wheel };
}

// Build every landmark and return the handles the frame loop animates.
export function createLandmarks(scene, rng) {
  const group = new THREE.Group();
  group.name = 'landmarks';
  scene.add(group);

  // Lighthouse: alternating red and white bands on a cylinder at the
  // end of the harbour pier, with a glowing lamp room on top.
  const light = new THREE.Group();
  light.position.set(120, 0, 226);
  const bandRed = new THREE.MeshLambertMaterial({ color: 0xd63c2e });
  const bandWhite = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.5 - i * 0.22, 2.7 - i * 0.22, 3.4, 12), i % 2 ? bandWhite : bandRed);
    band.position.y = 1.7 + i * 3.4;
    band.castShadow = true;
    light.add(band);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), lampMat);
  lamp.position.y = 19.2;
  const capTop = new THREE.Mesh(new THREE.ConeGeometry(2, 1.8, 10),
    new THREE.MeshLambertMaterial({ color: 0x232a33 }));
  capTop.position.y = 20.8;
  light.add(lamp, capTop);
  group.add(light);

  // Boats anchored off the beach, each with its own bob phase.
  const boats = [];
  for (let i = 0; i < 6; i++) {
    const boat = makeBoat(rng, -140 + i * 52 + range(rng, -10, 10), 238 + range(rng, 0, 42));
    group.add(boat);
    boats.push({ mesh: boat, phase: rng() * Math.PI * 2, baseY: 0 });
  }

  // The pier ferris wheel.
  const { root: wheelRoot, wheel } = makeFerrisWheel(82, 190);
  group.add(wheelRoot);

  // Beach umbrellas and towels along the sand strip.
  const towelColours = [0xff5a4e, 0x4d8dff, 0xffd23f, 0x58b368, 0xff9ef0, 0x33e0ff];
  for (let i = 0; i < 10; i++) {
    const ux = -160 + i * 34 + range(rng, -6, 6);
    if (Math.abs(ux - 120) < 16) continue; // keep the pier clear
    const uz = range(rng, 184, 194);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 5),
      new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
    pole.position.set(ux, 1.2, uz);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.8, 8),
      new THREE.MeshLambertMaterial({ color: towelColours[i % towelColours.length] }));
    shade.position.set(ux, 2.5, uz);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 2.2),
      new THREE.MeshLambertMaterial({ color: towelColours[(i + 2) % towelColours.length] }));
    towel.position.set(ux + 1.8, 0.06, uz + 0.6);
    towel.rotation.y = rng() * 0.8;
    group.add(pole, shade, towel);
  }

  return { group, boats, wheel, lamp, lampMat, t: 0 };
}

// Per-frame landmark life: boats bob and roll, the wheel turns slowly,
// and the lighthouse lamp pulses like a real beacon.
export function updateLandmarks(landmarks, dt) {
  if (!landmarks) return;
  landmarks.t += dt;
  const t = landmarks.t;
  for (const b of landmarks.boats) {
    b.mesh.position.y = Math.sin(t * 1.3 + b.phase) * 0.32;
    b.mesh.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.05;
    b.mesh.rotation.x = Math.cos(t * 1.1 + b.phase) * 0.03;
  }
  if (landmarks.wheel) landmarks.wheel.rotation.z += dt * 0.22;
  if (landmarks.lamp) {
    const s = 1 + Math.sin(t * 2.2) * 0.18;
    landmarks.lamp.scale.set(s, s, s);
  }
}
