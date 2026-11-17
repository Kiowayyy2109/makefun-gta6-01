// Side activity: twelve hidden parcels scattered across Port Aurelia.
// Each one is a small glowing crate with a gold ring; walk or drive
// through it to collect it for $50. The count shows on the HUD and is
// kept in the save file, so hunting them all is a real second goal
// beside Nadia's seven jobs.
import * as THREE from 'three';

// Fixed spots: roadsides, the plaza corners, the beach and the pier —
// every one reachable on foot or by car, none inside a building.
export const PARCEL_SPOTS = [
  [24, -8], [-24, 24], [88, -72], [168, 88], [-168, -72], [8, 168],
  [104, 186], [-48, -128], [72, 128], [-128, 48], [48, 152], [-152, 168],
];

export function spawnParcels(scene) {
  const list = [];
  const boxGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const boxMat = new THREE.MeshBasicMaterial({ color: 0xffb52e });
  const ringGeo = new THREE.TorusGeometry(1.5, 0.14, 6, 20);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  for (const [x, z] of PARCEL_SPOTS) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.85;
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    g.add(box, ring);
    g.position.set(x, 0, z);
    scene.add(g);
    list.push({ mesh: g, x, z, taken: false, spin: Math.random() * 6 });
  }
  return { list, found: 0, total: list.length };
}

// Mark the first `n` parcels as already collected (save restore).
export function restoreParcels(parcels, n) {
  parcels.found = 0;
  for (const p of parcels.list) {
    p.taken = parcels.found < n;
    p.mesh.visible = !p.taken;
    if (p.taken) parcels.found++;
  }
}

// Spin the uncollected parcels and pick up any the player touches.
// Returns how many were newly collected this frame.
export function updateParcels(parcels, G, dt) {
  if (!parcels) return 0;
  const px = G.player.onFoot ? G.player.x : (G.player.car ? G.player.car.x : G.player.x);
  const pz = G.player.onFoot ? G.player.z : (G.player.car ? G.player.car.z : G.player.z);
  const reach = G.player.onFoot ? 3.2 : 5;
  let got = 0;
  for (const p of parcels.list) {
    if (p.taken) continue;
    p.spin += dt * 2.4;
    p.mesh.rotation.y = p.spin;
    const d2 = (p.x - px) ** 2 + (p.z - pz) ** 2;
    if (d2 < reach * reach) {
      p.taken = true;
      p.mesh.visible = false;
      parcels.found++;
      got++;
      G.player.money += 50;
      G.audio?.coin();
      G.flashMessage('Hidden parcel found! +$50 — ' + parcels.found + '/' + parcels.total, 3);
      G.saveProgress();
    }
  }
  return got;
}
