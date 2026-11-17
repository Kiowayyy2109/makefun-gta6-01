// Keyboard and mouse state: held keys, one-shot presses, pointer-lock look.
// The game polls `keys` every frame; `pressed` fires once per keydown.
export function createInput() {
  const keys = {};
  const pressed = {};
  const look = { dx: 0, dy: 0 };
  let locked = false;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    look.dx += e.movementX || 0;
    look.dy += e.movementY || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === document.body;
  });
  document.addEventListener('mousedown', (e) => {
    // Mouse clicks are one-shot presses too, so the combat code can read
    // them with the same wasPressed() call it uses for keys.
    if (e.button === 0) pressed.Mouse0 = true;
    if (e.button === 2) pressed.Mouse2 = true;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys, pressed, look,
    get locked() { return locked; },
    lock() { document.body.requestPointerLock?.(); },
    unlock() { document.exitPointerLock?.(); },
    // Consume the look delta accumulated since the last frame.
    takeLook() {
      const out = { dx: look.dx, dy: look.dy };
      look.dx = 0; look.dy = 0;
      return out;
    },
    // True once for a key pressed since the last frame, then cleared.
    wasPressed(code) {
      const v = !!pressed[code];
      pressed[code] = false;
      return v;
    },
    clearPressed() { for (const k in pressed) pressed[k] = false; },
  };
}
