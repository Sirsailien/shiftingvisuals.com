// The perspective lens on the home page.
// Mouse: the lens is the cursor. Idle: it drifts slowly by itself.
// Keyboard: it glides to the focused page name.
// Touch: the lens drifts; a tap expands it from the fingertip until it fills
//        the screen, and THEN the page names appear. Tapping empty space
//        shrinks it back to the finger and the drift resumes.

import { lensR, setLens, getLens } from './lens-state.js';

const home = document.querySelector('[data-page="home"]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let mode = 'drift'; // 'drift' | 'pointer' | 'focus' | 'touch'
let touch = 'idle'; // 'idle' | 'opening' | 'open' | 'closing'
let target = null; // {x, y} for 'focus' and 'touch'
let goalR = lensR();
let t = 0;
let last = performance.now();
let lastPointerType = 'mouse';
let wasActive = false;
let holdUntil = 0; // after landing (e.g. an iris closing onto a name), rest a moment before drifting

const active = () => home.classList.contains('is-active');

function centreOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Radius that covers the whole screen from point p.
const cover = (p) => Math.hypot(Math.max(p.x, innerWidth - p.x), Math.max(p.y, innerHeight - p.y)) + 2;

// A slow figure-of-eight through the middle of the screen.
function driftPoint() {
  if (reducedMotion.matches) return centreOf(home.querySelector('.home__word'));
  return {
    x: innerWidth * (0.5 + Math.sin(t) * 0.28),
    y: innerHeight * (0.52 + Math.sin(t * 1.7) * 0.18),
  };
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(64, now - last);
  last = now;
  const isActive = active();
  if (isActive && !wasActive && getLens().r > 0) holdUntil = now + 900;
  wasActive = isActive;
  if (!isActive || mode === 'pointer') return;
  if (mode === 'drift' && now < holdUntil) return;

  if (mode === 'drift' && !reducedMotion.matches) t += dt * 0.00048;
  const goal = mode === 'drift' ? driftPoint() : target;
  const L = getLens();
  // Ease towards the goal: drift is lazy, the touch expansion slower than focus. Reduced motion: jump.
  const base = mode === 'drift' ? 0.08 : mode === 'touch' ? 0.004 : 0.0005;
  const k = reducedMotion.matches ? 1 : 1 - Math.pow(base, dt / 1000);
  const r = L.r + (goalR - L.r) * k;
  setLens(L.x + (goal.x - L.x) * k, L.y + (goal.y - L.y) * k, r);

  // Touch sequence: reveal the names only once the lens has filled the screen.
  if (touch === 'opening' && r > goalR * 0.97) {
    touch = 'open';
    home.classList.add('is-open');
  } else if (touch === 'closing' && Math.abs(r - lensR()) < 2) {
    touch = 'idle';
    mode = 'drift';
  }
}

function openAt(p) {
  mode = 'touch';
  touch = 'opening';
  target = p;
  setLens(p.x, p.y, 0); // grow from the fingertip
  goalR = cover(p);
}

function close() {
  home.classList.remove('is-open');
  touch = 'closing';
  goalR = lensR();
}

// Mouse: follow exactly.
home.addEventListener('pointermove', (e) => {
  lastPointerType = e.pointerType;
  if (e.pointerType !== 'mouse' || !active()) return;
  mode = 'pointer';
  goalR = lensR();
  setLens(e.clientX, e.clientY, lensR());
});

home.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse' && mode === 'pointer') mode = 'drift';
});

home.addEventListener('pointerdown', (e) => {
  lastPointerType = e.pointerType;
});

// Touch: tap to expand at the finger, tap empty space to close.
home.addEventListener('click', (e) => {
  if (lastPointerType === 'mouse' || !active()) return;
  if (e.target.closest('a')) return; // a page name: the router takes it from here
  if (touch === 'open' || touch === 'opening') close();
  else openAt({ x: e.clientX, y: e.clientY });
});

// Keyboard: the lens moves to the focused page name.
home.addEventListener('focusin', (e) => {
  const link = e.target.closest('[data-home-link]');
  if (!link) return;
  mode = 'focus';
  target = centreOf(link);
});

home.addEventListener('focusout', (e) => {
  if (mode === 'focus' && !e.relatedTarget?.closest?.('[data-home-link]')) mode = 'drift';
});

// Fresh start every time home is shown.
home.addEventListener('route:enter', () => {
  home.classList.remove('is-open');
  mode = 'drift';
  touch = 'idle';
  goalR = lensR();
  t = Math.random() * Math.PI * 2;
});

requestAnimationFrame(frame);
