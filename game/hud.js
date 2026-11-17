// HUD: money, health, wanted stars, clock, parcels counter, objective
// banner, speed and the round minimap drawn on a 2D canvas (player,
// police, cars, walkers, mission marker, north arrow).
import { WORLD, MISSIONS } from './config.js';
import { currentMission, currentTarget } from './missions.js';

export function createHud() {
  return {
    money: document.getElementById('money'),
    stars: document.getElementById('stars'),
    health: document.getElementById('healthfill'),
    clock: document.getElementById('clock'),
    parcels: document.getElementById('parcels'),
    objTitle: document.getElementById('objTitle'),
    objText: document.getElementById('objText'),
    speed: document.getElementById('speed'),
    msg: document.getElementById('msg'),
    hint: document.getElementById('hint'),
    cross: document.getElementById('cross'),
    hud: document.getElementById('hud'),
    map: document.getElementById('minimap'),
    msgUntil: 0, msgText: '',
  };
}

export function showHud(h, on) { h.hud.style.display = on ? 'block' : 'none'; }

export function setMessage(h, text, seconds, now) {
  h.msgText = text;
  h.msg.textContent = text;
  h.msgUntil = now + seconds;
}

export function updateHud(h, G, dt) {
  const p = G.player;
  h.money.textContent = '$' + p.money.toLocaleString('en-US');
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted.level ? '★' : '<span class="off">★</span>';
  h.stars.innerHTML = stars;
  h.health.style.width = Math.max(0, p.health) + '%';
  h.health.style.background = p.health > 50
    ? 'linear-gradient(90deg,#37d67a,#a8e63f)'
    : p.health > 25 ? 'linear-gradient(90deg,#e8a83c,#e8d44d)' : 'linear-gradient(90deg,#d63c2e,#e87a4d)';
  const totalMin = 10 * 60 + Math.floor(G.elapsed * 2); // game clock runs fast
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  h.clock.textContent = hh + ':' + mm + ' · Port Aurelia';
  if (h.parcels) {
    const found = G.parcels ? G.parcels.found : 0;
    const total = G.parcels ? G.parcels.total : 12;
    h.parcels.textContent = '📦 Parcels ' + found + '/' + total;
  }
  const job = currentMission(G.missions);
  if (job) {
    h.objTitle.textContent = job.title + '  —  $' + job.reward;
    if (job.kind === 'escape' && G.wanted.level === 0) {
      h.objText.textContent = 'Stay clean… ' + Math.max(0, 6 - Math.floor(G.missions.escapeTimer)) + 's until the heat is off.';
    } else if (job.kind === 'race') {
      const gates = job.gates ? job.gates.length : 5;
      h.objText.textContent = 'Gate ' + Math.min(G.missions.raceGate + 1, gates) + '/' + gates
        + ' · ' + Math.max(0, Math.ceil(G.missions.timeLeft)) + 's — ' + job.text;
    } else if (job.kind === 'timed') {
      h.objText.textContent = Math.max(0, Math.ceil(G.missions.timeLeft)) + 's left — ' + job.text;
    } else {
      h.objText.textContent = job.text;
    }
  } else {
    h.objTitle.textContent = 'Story complete!';
    h.objText.textContent = 'All seven jobs done. Port Aurelia is yours — free roam and parcel hunting.';
  }
  if (!p.onFoot && p.car) {
    h.speed.innerHTML = Math.round(Math.abs(p.car.speed) * 3.6) + ' <small>km/h · ' + p.car.kind.toUpperCase() + '</small>';
  } else {
    h.speed.innerHTML = p.weapon === 'gun' ? 'PISTOL · ' + p.ammo + ' rounds' : 'ON FOOT';
  }
  h.cross.style.display = p.onFoot ? 'block' : 'none';
  h.hint.textContent = p.onFoot
    ? 'E enter car · 1 fists · 2 pistol · R reload'
    : 'WASD drive · Space brake · F leave car · H horn';
  if (G.elapsed > h.msgUntil) h.msg.textContent = '';
  drawMinimap(h, G);
}

function drawMinimap(h, G) {
  const ctx = h.map.getContext('2d');
  const S = 180, half = WORLD.half;
  const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#12283a'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#2a7fa8'; ctx.fillRect(0, ((196 + half) / (half * 2)) * S, S, S); // sea
  ctx.strokeStyle = '#5a6a78'; ctx.lineWidth = 5;
  for (const L of WORLD.roadLines) {
    const [ax, ay] = toMap(L, -half), [bx, by] = toMap(L, half);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const [cx, cy] = toMap(-half, L), [dx, dy] = toMap(half, L);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
  }
  ctx.fillStyle = '#c9bfa8';
  const [px0, py0] = toMap(-52, -52);
  ctx.fillRect(px0, py0, (104 / (half * 2)) * S, (104 / (half * 2)) * S);
  const dot = (x, z, r, color) => {
    const [mx, my] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
  };
  if (G.parcels) for (const parc of G.parcels.list) if (!parc.taken) dot(parc.x, parc.z, 2, '#ffb52e');
  const job = currentMission(G.missions);
  const target = currentTarget(G.missions);
  if (job && target && job.kind !== 'escape') {
    const [mx, my] = toMap(target[0], target[2]);
    ctx.fillStyle = '#ffd23f';
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  }
  for (const car of G.cars) if (car.driver === 'traffic') dot(car.x, car.z, 2.5, '#e8e8e8');
  for (const ped of G.peds) if (ped.alive) dot(ped.x, ped.z, 1.8, '#7dd8a8');
  for (const car of G.police.cars) dot(car.x, car.z, 4, '#4d8dff');
  for (const f of G.police.foot) dot(f.x, f.z, 3, '#4d8dff');
  const px = G.player.onFoot ? G.player.x : G.player.car.x;
  const pz = G.player.onFoot ? G.player.z : G.player.car.z;
  const [mx, my] = toMap(px, pz);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Verdana';
  ctx.fillText('N', 86, 16);
}
