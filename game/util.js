// Small helpers: seeded random numbers, clamping, angles, canvas textures.
// The city is generated from a seed so every load (and every screenshot)
// builds the same streets, the same buildings and the same traffic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }

// Shortest signed difference between two angles, in radians. Used by
// police steering so a patrol car always turns the short way around.
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}

// Draw a procedural window facade onto a canvas and return it as a texture.
// `three` is passed in so this module never imports three itself.
export function facadeTexture(THREE, rng, wall, roof, floors) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, 128, 256);
  g.fillStyle = roof; g.fillRect(0, 0, 128, 10);
  const rows = Math.max(3, floors);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < 4; col++) {
      const lit = rng() < 0.28;
      g.fillStyle = lit ? '#ffe9a8' : '#2c4a63';
      g.fillRect(12 + col * 28, 22 + r * Math.floor(220 / rows), 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A vertical gradient sky for golden hour: warm peach at the horizon
// melting up into soft coastal blue. Used as the scene background.
export function skyTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#5f9fd0');
  grad.addColorStop(0.45, '#a8d4e8');
  grad.addColorStop(0.72, '#ffd9a3');
  grad.addColorStop(0.92, '#ffb37e');
  grad.addColorStop(1, '#ff9e7a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A dark reflective glass facade: deep blue panes with a few catching
// the low sun. Used for the glass tower variant in the city.
export function glassTexture(THREE, rng) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2e4a5e'; g.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 12; r++) {
    for (let col = 0; col < 4; col++) {
      const warm = rng() < 0.22;
      g.fillStyle = warm ? '#ffca7a' : (rng() < 0.5 ? '#4d7d99' : '#223c4f');
      g.fillRect(10 + col * 29, 14 + r * 20, 20, 13);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Paint the whole ground (roads, sidewalks, grass, plaza, sand, water edge)
// onto one big canvas so the city floor costs a single draw call.
export function groundTexture(THREE, lines, roadW, half) {
  const S = 2048, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const px = (v) => ((v + half) / (half * 2)) * S;
  g.fillStyle = '#5d9b4a'; g.fillRect(0, 0, S, S);           // grass base
  g.fillStyle = '#e0c98f'; g.fillRect(0, px(186), S, S - px(186)); // beach strip
  g.fillStyle = '#c9bfa8';                                      // central plaza
  g.fillRect(px(-52), px(-52), px(52) - px(-52), px(52) - px(-52));
  g.fillStyle = '#b9b3a4';                                      // sidewalks
  for (const L of lines) {
    g.fillRect(px(L - roadW / 2 - 4), 0, px(L + roadW / 2 + 4) - px(L - roadW / 2 - 4), S);
    g.fillRect(0, px(L - roadW / 2 - 4), S, px(L + roadW / 2 + 4) - px(L - roadW / 2 - 4));
  }
  g.fillStyle = '#33373d';                                      // asphalt
  for (const L of lines) {
    g.fillRect(px(L - roadW / 2), 0, px(L + roadW / 2) - px(L - roadW / 2), S);
    g.fillRect(0, px(L - roadW / 2), S, px(L + roadW / 2) - px(L - roadW / 2));
  }
  g.strokeStyle = '#e8d44d'; g.lineWidth = 3; g.setLineDash([26, 22]); // centre dashes
  for (const L of lines) {
    g.beginPath(); g.moveTo(px(L), 0); g.lineTo(px(L), S); g.stroke();
    g.beginPath(); g.moveTo(0, px(L)); g.lineTo(S, px(L)); g.stroke();
  }
  g.setLineDash([]);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
