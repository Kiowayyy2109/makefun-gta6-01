// Builds the city of Port Aurelia: ground, roads, buildings, lamps,
// palms, the north bridge and the harbour pier. Returns the colliders
// (axis-aligned boxes) the player and cars bump into.
import * as THREE from 'three';
import { WORLD, COLOURS } from './config.js';
import { mulberry32, pick, range, facadeTexture, glassTexture, skyTexture, groundTexture } from './util.js';

export function buildCity(scene, seed) {
  const rng = mulberry32(seed);
  const colliders = [];   // {x, z, hx, hz} boxes
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  // Sky, light and fog: golden hour over the bay — a peach-to-blue
  // gradient sky, warm low sun and honey-coloured haze on the horizon.
  scene.background = skyTexture(THREE);
  scene.fog = new THREE.Fog(COLOURS.fog, 170, 520);
  const hemi = new THREE.HemisphereLight(0xffe0b8, 0x5d7a4a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(COLOURS.sun, 2.1);
  sun.position.set(150, 68, 110);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 520;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffd9a3, 0.3));

  // Ground: one textured plane (roads, sidewalks, plaza, beach).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ map: groundTexture(THREE, WORLD.roadLines, WORLD.roadWidth, WORLD.half) })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Sea: a flat blue plane beyond the beach, plus a strip of sand handled
  // by the ground texture. It sits just below ground level to avoid z-fight.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 260),
    new THREE.MeshLambertMaterial({ color: COLOURS.water })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, 330);
  group.add(sea);

  // Buildings: one box per block lot, heights and colours varied, with a
  // procedural window facade. Skips lots that touch the plaza or the pier.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const facadeCache = new Map();
  const lines = WORLD.roadLines;
  for (const bx of lines) {
    for (const bz of lines) {
      // Four lots around each intersection, offset into the block.
      for (const [ox, oz] of [[-38, -38], [38, -38], [-38, 38], [38, 38]]) {
        const cx = bx + ox, cz = bz + oz;
        if (Math.abs(cx) < 56 && Math.abs(cz) < 56) continue;   // plaza stays open
        if (cz > 168) continue;                                  // beach stays open
        if (rng() < 0.12) continue;                              // some empty lots / parks
        const w = range(rng, 18, 30), d = range(rng, 18, 30);
        const h = range(rng, 12, 62) * (rng() < 0.14 ? 1.8 : 1); // a few towers
        const wall = pick(rng, COLOURS.wall), roof = pick(rng, COLOURS.roof);
        const isGlass = rng() < 0.3; // a third of the city wears dark glass
        const key = (isGlass ? 'glass' : wall + roof) + Math.round(h / 12);
        let mat = facadeCache.get(key);
        if (!mat) {
          mat = isGlass
            ? new THREE.MeshLambertMaterial({
              map: glassTexture(THREE, mulberry32(Math.floor(rng() * 1e9))),
              emissive: 0x1a2c3a,
            })
            : new THREE.MeshLambertMaterial({
              map: facadeTexture(THREE, mulberry32(Math.floor(rng() * 1e9)), wall, roof, Math.max(3, Math.round(h / 9))),
            });
          facadeCache.set(key, mat);
        }
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(cx, h / 2, cz);
        b.castShadow = true; b.receiveShadow = true;
        group.add(b);
        colliders.push({ x: cx, z: cz, hx: w / 2 + 0.4, hz: d / 2 + 0.4 });
        // Roof cap so towers read as finished buildings from above.
        const cap = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: roof }));
        cap.scale.set(w + 0.6, 0.8, d + 0.6);
        cap.position.set(cx, h + 0.4, cz);
        group.add(cap);
        // Rooftop props on some buildings: an AC box or a water tank,
        // small silhouettes that make the skyline read as lived-in.
        if (rng() < 0.45) {
          const prop = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x8a939c }));
          const pw = range(rng, 2.5, 5);
          prop.scale.set(pw, range(rng, 1.2, 2.4), pw);
          prop.position.set(cx + range(rng, -w / 4, w / 4), h + 0.8 + prop.scale.y / 2, cz + range(rng, -d / 4, d / 4));
          prop.castShadow = true;
          group.add(prop);
        }
      }
    }
  }

  // Street lamps along every road, instanced to keep draw calls low.
  const lampPole = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c313a });
  const lampBulb = new THREE.SphereGeometry(0.45, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const poleMesh = new THREE.InstancedMesh(lampPole, lampMat, 120);
  const bulbMesh = new THREE.InstancedMesh(lampBulb, bulbMat, 120);
  const dummy = new THREE.Object3D();
  let li = 0;
  for (const L of lines) {
    for (let t = -180; t <= 180; t += 40) {
      if (li >= 120) break;
      dummy.position.set(L + 8.5, 3.5, t);
      dummy.updateMatrix(); poleMesh.setMatrixAt(li, dummy.matrix);
      dummy.position.set(L + 8.5, 7.1, t);
      dummy.updateMatrix(); bulbMesh.setMatrixAt(li, dummy.matrix);
      li++;
    }
  }
  poleMesh.count = li; bulbMesh.count = li;
  group.add(poleMesh); group.add(bulbMesh);

  // Palm trees near the beach and plaza, also instanced trunks + crowns.
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, 6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const crown = new THREE.ConeGeometry(2.4, 3.2, 7);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f8a4a });
  const trunks = new THREE.InstancedMesh(trunk, trunkMat, 96);
  const crowns = new THREE.InstancedMesh(crown, crownMat, 96);
  let pi = 0;
  for (let i = 0; i < 72; i++) {
    let px, pz;
    if (i < 14) {
      // A ring of palms around the central plaza.
      const a = (i / 14) * Math.PI * 2;
      px = Math.cos(a) * 60; pz = Math.sin(a) * 60;
    } else {
      px = range(rng, -190, 190);
      pz = rng() < 0.6 ? range(rng, 172, 192) : range(rng, -60, 60);
      if (Math.abs(px) < 58 && Math.abs(pz) < 58) continue;
    }
    dummy.position.set(px, 3, pz); dummy.updateMatrix();
    trunks.setMatrixAt(pi, dummy.matrix);
    dummy.position.set(px, 7.4, pz); dummy.updateMatrix();
    crowns.setMatrixAt(pi, dummy.matrix);
    pi++;
  }
  trunks.count = pi; crowns.count = pi;
  group.add(trunks); group.add(crowns);

  // North bridge: a raised deck over the top edge, with rails. The deck
  // is solid ground visually; the road texture underneath keeps the
  // crossing drivable, and the rails read as a bridge from a distance.
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(16, 1.2, 60),
    new THREE.MeshLambertMaterial({ color: 0x9aa4ae })
  );
  deck.position.set(0, 0.6, -205);
  group.add(deck);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.4, 60),
      new THREE.MeshLambertMaterial({ color: 0xd8b13c })
    );
    rail.position.set(s * 7.6, 1.8, -205);
    group.add(rail);
  }

  // Harbour pier: wooden deck reaching into the sea, with crates.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(14, 1, 34),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 })
  );
  pier.position.set(120, 0.5, 200);
  group.add(pier);
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb08a3e });
  for (const [cx, cz] of [[114, 196], [126, 204], [118, 210]]) {
    const crate = new THREE.Mesh(boxGeo, crateMat);
    crate.scale.set(3, 3, 3);
    crate.position.set(cx, 2.5, cz);
    crate.castShadow = true;
    group.add(crate);
  }

  // Mission beacon: a tall glowing pillar the player can see across town.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.4, 46, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  );
  beacon.position.set(40, 23, -40);
  beacon.name = 'beacon';
  group.add(beacon);

  return { group, colliders, beacon, sun };
}
