// Missions and story: seven jobs from Nadia Cole, in order. Each job has
// a gold beacon in the world, a HUD objective and a cash reward. Kinds:
// reach (get to the marker), deliverCar (arrive driving the sport
// coupe), race (hit five gates in order against the clock), timed
// (reach the marker before the timer dies) and escape (lose the heat).
// Race and timed jobs reset their clock when it runs out — no harsh
// punishment, the job simply starts its timer again.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { addWanted } from './police.js';

export function createMissions(scene, beacon) {
  return {
    index: 0, done: false, storyDone: false,
    escapeTimer: 0, startedAt: 0, beacon, heatSet: false,
    marker: null, markerRing: null,
    raceGate: 0, timeLeft: 0,
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

// The point the marker and beacon should sit on right now: for a race
// that is the current gate, for everything else the job target.
export function currentTarget(m) {
  const job = currentMission(m);
  if (!job) return null;
  if (job.kind === 'race' && job.gates) return job.gates[Math.min(m.raceGate, job.gates.length - 1)];
  return job.target;
}

function moveMarker(m) {
  const t = currentTarget(m);
  if (!t) return;
  if (m.marker) m.marker.position.set(t[0], 0, t[2]);
  if (m.beacon) m.beacon.position.set(t[0], 23, t[2]);
}

export function startMission(m, scene, idx) {
  m.index = idx;
  m.escapeTimer = 0;
  m.heatSet = false;
  m.raceGate = 0;
  const job = currentMission(m);
  m.timeLeft = job && job.timeLimit ? job.timeLimit : 0;
  if (!m.marker) m.marker = makeMarker(scene);
  if (!job) { m.marker.visible = false; if (m.beacon) m.beacon.visible = false; return; }
  moveMarker(m);
  m.marker.visible = job.kind !== 'escape';
  if (m.beacon) m.beacon.visible = job.kind !== 'escape';
}

// Returns an event string when something mission-relevant happened:
// 'complete' (job paid), 'story' (final job paid) or null.
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
  } else if (job.kind === 'race') {
    m.timeLeft -= dt;
    if (m.timeLeft <= 0) {
      // Out of time: reset the gates and the clock, no other penalty.
      m.raceGate = 0;
      m.timeLeft = job.timeLimit;
      moveMarker(m);
      G.flashMessage('Out of time! The Checkpoint Run restarts — hit gate 1 again.', 4);
      return null;
    }
    const gate = job.gates[m.raceGate];
    const d2 = (px - gate[0]) ** 2 + (pz - gate[2]) ** 2;
    if (d2 < 64) {
      m.raceGate++;
      G.audio?.coin();
      if (m.raceGate >= job.gates.length) return completeMission(m, G);
      moveMarker(m);
      G.flashMessage('Gate ' + m.raceGate + '/' + job.gates.length + ' cleared — next gate!', 3);
    }
  } else if (job.kind === 'timed') {
    m.timeLeft -= dt;
    if (m.timeLeft <= 0) {
      m.timeLeft = job.timeLimit;
      G.flashMessage('Too late — the buyer cooled off. The Rush Delivery timer restarts.', 4);
      return null;
    }
    const d2 = (px - job.target[0]) ** 2 + (pz - job.target[2]) ** 2;
    if (d2 < 36) return completeMission(m, G);
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
