// Missions and story: five jobs from Nadia Cole, in order. Each job has a
// gold beacon in the world, a HUD objective and a cash reward. Finishing
// one advances to the next; finishing all five completes the story.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { addWanted } from './police.js';

export function createMissions(scene, beacon) {
  return {
    index: 0, done: false, storyDone: false,
    escapeTimer: 0, startedAt: 0, beacon, heatSet: false,
    marker: null, markerRing: null,
  };
}

function makeMarker(scene) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  pole.position.y = 15;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.35, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  g.add(pole, ring);
  g.visible = false;
  scene.add(g);
  return g;
}

export function currentMission(m) {
  return m.index < MISSIONS.length ? MISSIONS[m.index] : null;
}

export function startMission(m, scene, idx) {
  m.index = idx;
  m.escapeTimer = 0;
  m.heatSet = false;
  if (!m.marker) m.marker = makeMarker(scene);
  const job = currentMission(m);
  if (!job) { m.marker.visible = false; return; }
  m.marker.position.set(job.target[0], 0, job.target[2]);
  m.marker.visible = job.kind !== 'escape';
  if (m.beacon) m.beacon.position.set(job.target[0], 23, job.target[2]);
  if (m.beacon) m.beacon.visible = job.kind !== 'escape';
}

// Returns an event string when something mission-relevant happened:
// 'complete' (job paid), 'progress' or null.
export function updateMissions(m, G, dt) {
  const job = currentMission(m);
  if (!job || m.storyDone) return null;
  const px = G.player.onFoot ? G.player.x : G.player.car.x;
  const pz = G.player.onFoot ? G.player.z : G.player.car.z;
  if (m.marker) m.marker.rotation.y += dt * 0.8;
  if (job.kind === 'reach') {
    const d2 = (px - job.target[0]) ** 2 + (pz - job.target[2]) ** 2;
    if (d2 < 36) return completeMission(m, G);
  } else if (job.kind === 'deliverCar') {
    // Job 2: the player must be driving the red sport coupe at the garage.
    const inSport = !G.player.onFoot && G.player.car && G.player.car.kind === 'sport';
    const d2 = (px - job.target[0]) ** 2 + (pz - job.target[2]) ** 2;
    if (inSport && d2 < 49) return completeMission(m, G);
  } else if (job.kind === 'escape') {
    // The job only counts once the heat is real: put two stars on the
    // player the moment the escape starts, then wait for them to clear.
    if (!m.heatSet) {
      m.heatSet = true;
      addWanted(G.wanted, 2, 'escape');
      G.flashMessage('The police are on you — lose them!', 4);
    }
    if (G.wanted.level === 0) {
      m.escapeTimer += dt;
      if (m.escapeTimer > 6) return completeMission(m, G);
    } else {
      m.escapeTimer = 0;
    }
  }
  return null;
}

function completeMission(m, G) {
  const job = currentMission(m);
  G.player.money += job.reward;
  G.audio?.coin();
  const next = m.index + 1;
  if (next >= MISSIONS.length) {
    m.storyDone = true;
    m.index = next;
    if (m.marker) m.marker.visible = false;
    if (m.beacon) m.beacon.visible = false;
    G.saveProgress();
    return 'story';
  }
  startMission(m, G.scene, next);
  G.saveProgress();
  return 'complete';
}

// A short story line shown when a job starts, for the HUD message feed.
export function missionBrief(m) {
  const job = currentMission(m);
  if (!job) return 'Story complete — Port Aurelia is yours.';
  return job.title + ': ' + job.text;
}
