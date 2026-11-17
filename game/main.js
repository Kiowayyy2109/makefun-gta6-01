// Port Aurelia — entry point. Builds the world, owns the game state,
// runs the frame loop, and wires menus, saving and the wanted system.
// Everything the player does flows through here.
import * as THREE from 'three';
import { WORLD, TUNING, COLOURS, MISSIONS, SAVE_KEY } from './config.js';
import { mulberry32, clamp } from './util.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { makeCar, spawnTraffic, updateTraffic, drivePlayerCar, collideBoxes, carSpeedKmh } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, knockPed } from './people.js';
import { createPlayer, updatePlayerOnFoot, updateCamera } from './player.js';
import { createWanted, addWanted, updateWanted, ensurePolice, updatePolice } from './police.js';
import { createMissions, startMission, updateMissions, missionBrief, currentMission } from './missions.js';
import { createCombat, tryAttack, updateCombat, reload } from './combat.js';
import { createHud, showHud, updateHud, setMessage } from './hud.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';
import { buildSigns } from './signs.js';
import { createLandmarks, updateLandmarks } from './landmarks.js';
import { spawnParcels, updateParcels, restoreParcels } from './activities.js';

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shotMode = params.get('shot') || '';
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));

// --- World ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
camera.position.set(30, 18, 60);

const city = buildCity(scene, seed);
const signs = buildSigns(scene, mulberry32(seed + 5));
const landmarks = createLandmarks(scene, mulberry32(seed + 9));
const parcels = spawnParcels(scene);
const input = createInput();
const audio = createAudio();
const hud = createHud();

// --- State ---------------------------------------------------------------
const G = {
  scene, camera, renderer, input, audio, hud,
  elapsed: 0, started: false, paused: false, over: false,
  seed, shotMode, shotCamera: false,
  colliders: city.colliders, beacon: city.beacon,
  player: null, cars: [], parked: [], peds: [],
  police: { cars: [], foot: [] },
  wanted: createWanted(),
  missions: null, combat: null,
  signs, landmarks, parcels,
  crimeFlash: 0, sirenTimer: 0, stepTimer: 0, ramCooldown: 0,
};
G.missions = createMissions(scene, city.beacon);
G.combat = createCombat(scene);
G.player = createPlayer(scene, 12, 12);
G.cars = spawnTraffic(scene, seed, 20);
G.peds = spawnPedestrians(scene, seed, 28);

// Parked cars the player can take, including the red sport coupe for Job 2.
const parkedSpots = [
  ['sport', 0xc23b2e, 30, -60, Math.PI * 0.5],
  ['sedan', 0x2e6fc2, -24, 44, 0],
  ['taxi', COLOURS.taxi, 64, 84, Math.PI],
  ['van', 0xe8e8e8, -84, -44, Math.PI / 2],
  ['sedan', 0x3aa655, 124, 4, -Math.PI / 2],
  ['sport', 0xd06a1e, -124, 124, 0],
];
for (const [kind, paint, x, z, yaw] of parkedSpots) {
  const car = makeCar(scene, kind, paint, x, z, yaw);
  car.driver = 'parked';
  G.parked.push(car);
  G.cars.push(car);
}
window.__game = G;

// --- Helpers -------------------------------------------------------------
G.flashMessage = (text, seconds) => setMessage(hud, text, seconds || 4, G.elapsed);
G.saveProgress = () => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.player.money, mission: G.missions.index, storyDone: G.missions.storyDone,
      parcels: G.parcels ? G.parcels.found : 0,
    }));
  } catch (e) {}
};
G.loadProgress = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};
G.crime = (kind) => {
  const stars = { steal: 1, punch: 1, shoot: 2, runover: 2, ram: 0 }[kind] || 1;
  if (stars > 0) addWanted(G.wanted, stars, kind);
  G.crimeFlash = 1;
};
G.showStartScreen = (on) => {
  document.getElementById('screen').style.display = on ? 'flex' : 'none';
  showHud(hud, !on && G.started);
};

function nearestCar(maxDist) {
  let best = null, bestD = maxDist;
  for (const car of G.cars) {
    if (car.driver === 'player' || car.driver === 'police') continue;
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterCar() {
  const car = nearestCar(5.5);
  if (!car) { G.flashMessage('No car close enough.'); return; }
  // Taking any car that is not yours is stealing in Port Aurelia, parked
  // or moving — the wanted level goes up either way.
  const wasMoving = car.driver === 'traffic';
  car.driver = 'player';
  G.player.car = car;
  G.player.onFoot = false;
  G.player.mesh.visible = false;
  car.speed = 0;
  audio.ensure(); audio.resume();
  G.crime('steal');
  G.flashMessage(wasMoving ? 'You stole the car! The owner called the police.' : 'You took the car. Wanted level up.');
  audio.horn();
}

function exitCar() {
  const car = G.player.car;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  const p = G.player;
  p.x = car.x + Math.cos(car.yaw) * 3.4;
  p.z = car.z - Math.sin(car.yaw) * 3.4;
  p.y = 0; p.vy = 0; p.grounded = true;
  p.yaw = car.yaw + Math.PI;
  p.car = null; p.onFoot = true;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
}

function endGame(kind) {
  if (G.over) return;
  G.over = true;
  G.started = false;
  input.unlock();
  audio.busted();
  const w = document.getElementById('wasted');
  document.getElementById('wastedTitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('wastedText').textContent = kind === 'busted'
    ? 'The Aurelia Bay Police caught Leo. Nadia is not impressed.'
    : 'Leo went down in the streets of Port Aurelia.';
  w.style.display = 'flex';
  showHud(hud, false);
}

function startGame(fromSave) {
  const save = fromSave ? G.loadProgress() : null;
  if (save) {
    G.player.money = save.money || TUNING.startMoney;
    startMission(G.missions, scene, Math.min(save.mission || 0, MISSIONS.length - 1));
    if (save.storyDone) G.missions.storyDone = true;
    if (save.parcels) restoreParcels(G.parcels, save.parcels);
  } else {
    G.player.money = TUNING.startMoney;
    startMission(G.missions, scene, 0);
  }
  G.started = true; G.paused = false; G.over = false;
  document.getElementById('wasted').style.display = 'none';
  G.showStartScreen(false);
  audio.ensure(); audio.resume();
  input.lock();
  G.flashMessage(missionBrief(G.missions), 5);
}

// --- Menus ---------------------------------------------------------------
const save = G.loadProgress();
const continueBtn = document.getElementById('continueBtn');
if (save && (save.money > TUNING.startMoney || save.mission > 0)) {
  continueBtn.style.display = 'inline-block';
  continueBtn.textContent = 'CONTINUE — $' + save.money + ' · Job ' + ((save.mission || 0) + 1);
}
document.getElementById('startBtn').addEventListener('click', () => startGame(false));
continueBtn.addEventListener('click', () => startGame(true));
document.getElementById('retryBtn').addEventListener('click', () => {
  G.player.health = TUNING.startHealth;
  G.wanted.level = 0;
  if (G.player.car) exitCar();
  G.player.x = 12; G.player.z = 12;
  G.player.mesh.position.set(12, 0, 12);
  startGame(false);
});
renderer.domElement.addEventListener('click', () => {
  if (G.started && !G.paused) input.lock();
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- Shot mode -----------------------------------------------------------
if (shotMode) {
  applyShot(G, shotMode);
  if (shotMode !== 'menu') {
    audio.ensure();
    showHud(hud, true);
  }
} else {
  startMission(G.missions, scene, 0);
}

// --- Frame loop ----------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!G.paused) G.elapsed += dt;

  // Pause toggle (Esc) — only outside shot mode menus.
  if (input.wasPressed('Escape') && G.started && !shotMode) {
    G.paused = !G.paused;
    document.getElementById('screen').style.display = G.paused ? 'flex' : 'none';
    document.querySelector('#screen h1').textContent = G.paused ? 'PAUSED' : 'PORT AURELIA';
    document.getElementById('startBtn').textContent = G.paused ? 'RESUME' : 'START ENGINE';
    if (!G.paused) input.lock();
  }
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.muted);

  if (G.started && !G.paused && !G.over) {
    const p = G.player;
    // Weapon switch and reload.
    if (input.wasPressed('Digit1')) { p.weapon = 'fist'; G.flashMessage('Fists ready.'); }
    if (input.wasPressed('Digit2')) { p.weapon = 'gun'; G.flashMessage('Pistol ready — ' + p.ammo + ' rounds.'); }
    if (input.wasPressed('KeyR')) reload(G);
    if (input.wasPressed('KeyH') && !p.onFoot) audio.horn();

    // Enter / leave a car.
    if (p.onFoot && input.wasPressed('KeyE')) enterCar();
    if (!p.onFoot && input.wasPressed('KeyF')) exitCar();

    let committingCrime = false;
    if (p.onFoot) {
      const moved = updatePlayerOnFoot(p, input, dt, G.colliders, G.peds, (ped) => {
        knockPed(ped, scene);
        G.crime('runover');
        G.flashMessage('You ran someone over!');
      });
      if (moved) {
        G.stepTimer -= dt;
        if (G.stepTimer <= 0) { audio.step(); G.stepTimer = 0.38; }
      }
      tryAttack(G, dt);
    } else {
      input.takeLook(); // drain mouse deltas while driving
      const impact = drivePlayerCar(p.car, input, dt, G.colliders, G.cars);
      if (impact) {
        audio.crash();
        G.flashMessage('Crash!');
        p.health = Math.max(0, p.health - 4);
      }
      // Running over a pedestrian while driving.
      for (const ped of G.peds) {
        if (!ped.alive) continue;
        const d2 = (ped.x - p.car.x) ** 2 + (ped.z - p.car.z) ** 2;
        if (d2 < 7) {
          knockPed(ped, scene);
          G.crime('runover');
          committingCrime = true;
          G.flashMessage('You hit a pedestrian!');
        }
      }
      audio.engine(Math.abs(p.car.speed) / p.car.maxSpeed, true);
    }
    if (!p.onFoot) audio.engine(Math.abs(p.car.speed) / p.car.maxSpeed, true);
    else audio.engine(0, false);

    // World life: traffic, walkers, police, missions, combat effects.
    updateTraffic(G.cars, dt, G.colliders);
    updatePedestrians(G.peds, dt, G.cars);
    updateWanted(G.wanted, dt, committingCrime || G.crimeFlash > 0);
    if (G.crimeFlash > 0) G.crimeFlash -= dt;
    ensurePolice(scene, G.police, G.wanted.level, { x: p.onFoot ? p.x : p.car.x, z: p.onFoot ? p.z : p.car.z });
    if (G.wanted.level > 0) {
      updatePolice(G.police, dt, p, G.colliders, (how) => {
        if (how === 'arrest' && p.onFoot) { endGame('busted'); return; }
        if (G.ramCooldown <= 0) {
          G.ramCooldown = 1.2;
          p.health = Math.max(0, p.health - 14);
          audio.crash();
          G.flashMessage('Police rammed you!');
          if (p.health <= 0) endGame('wasted');
        }
      });
      G.sirenTimer -= dt;
      if (G.sirenTimer <= 0) { audio.siren(); G.sirenTimer = 3.6; }
    }
    if (G.ramCooldown > 0) G.ramCooldown -= dt;
    // Slow health recovery while the heat is off.
    if (G.wanted.level === 0 && p.health < TUNING.startHealth) p.health = Math.min(TUNING.startHealth, p.health + 3 * dt);

    const missionEvent = updateMissions(G.missions, G, dt);
    if (missionEvent === 'complete') {
      const job = MISSIONS[G.missions.index - 1];
      G.flashMessage('Job complete! +$' + job.reward + ' — next: ' + MISSIONS[G.missions.index].title, 5);
    } else if (missionEvent === 'story') {
      G.flashMessage('STORY COMPLETE! All seven jobs done. Port Aurelia is yours.', 8);
    }
    updateParcels(G.parcels, G, dt);
    updateLandmarks(G.landmarks, dt);
    updateCombat(G);
    updateCamera(camera, p, dt);
    updateHud(hud, G, dt);
  } else if (!G.started && !shotMode) {
    // Menu backdrop: slow orbit around the plaza.
    const t = G.elapsed * 0.05;
    camera.position.set(Math.sin(t) * 90, 34, Math.cos(t) * 90);
    camera.lookAt(0, 6, 0);
    updateTraffic(G.cars, dt, G.colliders);
    updatePedestrians(G.peds, dt, G.cars);
  } else if (shotMode === 'menu') {
    updateTraffic(G.cars, dt, G.colliders);
    updatePedestrians(G.peds, dt, G.cars);
  } else if (shotMode && G.started) {
    // Shot scenes keep the world alive so traffic and police move.
    updateTraffic(G.cars, dt, G.colliders);
    updatePedestrians(G.peds, dt, G.cars);
    updateLandmarks(G.landmarks, dt);
    updateParcels(G.parcels, G, 0);
    if (G.wanted.level > 0) {
      updatePolice(G.police, dt, G.player, G.colliders, () => {});
    }
    updateCamera(camera, G.player, dt);
    updateHud(hud, G, dt);
    updateCombat(G);
  }

  renderer.render(scene, camera);
  frames++;
  if (frames === 5) window.__ready = true;
  if (frames === 30) window.__settled = true;
}
animate();
