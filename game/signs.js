// Signage: invented-brand billboards and neon strips that give Port
// Aurelia a named, lived-in skyline. Every brand here is made up for
// this game — cafes, a hotel, a garage, a club and a bank that exist
// nowhere else. Signs are pure decoration: no colliders, no cost.
import * as THREE from 'three';

// Draw one billboard face onto a canvas: bold invented name, a small
// tagline, and a coloured band. Returns a CanvasTexture.
function signTexture(THREE_, text, tagline, bg, fg, band) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 160);
  g.fillStyle = band; g.fillRect(0, 0, 512, 18); g.fillRect(0, 142, 512, 18);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.font = 'bold 54px Verdana, sans-serif';
  g.fillText(text, 256, 82);
  g.font = '24px Verdana, sans-serif';
  g.fillText(tagline, 256, 122);
  const tex = new THREE_.CanvasTexture(c);
  tex.colorSpace = THREE_.SRGBColorSpace;
  return tex;
}

// One billboard: a lit face on a dark backing box, held up by two poles
// or mounted flat on a rooftop edge. Faces the yaw direction given.
export function addBillboard(scene, text, tagline, x, y, z, yaw, colours) {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 4.7),
    new THREE.MeshBasicMaterial({ map: signTexture(THREE, text, tagline, colours.bg, colours.fg, colours.band) })
  );
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(15.4, 5.1, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x232a33 })
  );
  back.position.z = -0.22;
  group.add(back, face);
  if (y > 8) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a424c });
    for (const px of [-5.5, 5.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, y, 6), poleMat);
      pole.position.set(px, -y / 2 - 2, -0.3);
      group.add(pole);
    }
  }
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  scene.add(group);
  return group;
}

// Neon strips: thin glowing bars in club colours, run along the
// building faces that ring the central plaza.
export function addNeonStrip(scene, x, y, z, yaw, colour, len) {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(len || 16, 0.5, 0.3),
    new THREE.MeshBasicMaterial({ color: colour })
  );
  strip.position.set(x, y, z);
  strip.rotation.y = yaw;
  scene.add(strip);
  return strip;
}

// Place all of Port Aurelia's signs: eight billboards on downtown
// rooftops and corners, plus neon around the plaza.
export function buildSigns(scene, rng) {
  const signs = new THREE.Group();
  signs.name = 'signs';
  scene.add(signs);
  const B = (text, tag, x, y, z, yaw, bg, fg, band) =>
    addBillboard(signs, text, tag, x, y, z, yaw, { bg, fg, band });
  // Downtown billboards, angled toward the roads and plaza so they
  // read in normal play and in screenshots.
  B('HOTEL AURELIA', 'ROOMS · ROOFTOP POOL', -62, 20, -62, Math.PI * 0.25, '#173a5e', '#ffe9a8', '#d8b13c');
  B('CAFÉ CORAL', 'COFFEE · ALL DAY', 62, 16, -62, -Math.PI * 0.25, '#7a2e1e', '#fff3d6', '#ff8a5c');
  B('BAY VIEW MOTORS', 'CARS · TRADE-INS', 66, 15, 58, -Math.PI * 0.75, '#1e4d3a', '#d8ffe8', '#3aa655');
  B('CLUB LUMEN', 'OPEN LATE · LIVE DJS', -66, 18, 58, Math.PI * 0.75, '#2c1440', '#ff9ef0', '#b44dff');
  B('AURELIA BANK', 'SINCE 1962', -62, 22, 118, Math.PI * 0.8, '#20303e', '#e8f3ff', '#7dd8a8');
  B("NADIA'S CAFÉ", 'CORAL ROW · EST. 1998', 58, 13, -118, -Math.PI * 0.2, '#5e3418', '#ffe9a8', '#e8a83c');
  B('HOTEL AURELIA', 'STAY BY THE BAY', 122, 17, 118, -Math.PI * 0.75, '#173a5e', '#ffe9a8', '#d8b13c');
  B('BAY VIEW MOTORS', 'SPORT COUPES IN STOCK', -122, 14, -118, Math.PI * 0.25, '#1e4d3a', '#d8ffe8', '#3aa655');
  // Neon strips mounted on the building faces that ring the plaza.
  const neon = [0xff4dd2, 0x33e0ff, 0xffa62b, 0x7dff6a, 0xff4d6a, 0xffe94d];
  const spots = [
    [103, 9, -38, Math.PI / 2], [-103, 9, -38, Math.PI / 2],
    [103, 9, 38, Math.PI / 2], [-103, 9, 38, Math.PI / 2],
    [42, 9, -103, 0], [-42, 9, 103, 0],
  ];
  spots.forEach(([x, y, z, yaw], i) => addNeonStrip(signs, x, y, z, yaw, neon[i % neon.length], 17));
  return { group: signs };
}
