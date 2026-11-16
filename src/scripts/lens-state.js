// The home lens position, shared by the lens itself and the iris transitions.
// Drives the --lx / --ly / --lr CSS variables on the home page.

const home = document.querySelector('[data-page="home"]');
const word = home.querySelector('.home__word');

// The lens is always big enough to hold the whole centre word:
// at least half the word's diagonal plus a margin, and never under 110px (220px wide).
let radius = 110;
function measure() {
  const r = word.getBoundingClientRect();
  if (!r.width) return;
  radius = Math.max(110, Math.ceil(Math.hypot(r.width, r.height) / 2 + 16));
}
measure();
addEventListener('resize', measure);
document.fonts?.ready.then(measure);

export const lensR = () => radius;
let lens = { x: innerWidth / 2, y: innerHeight / 2, r: 0 };

export function setLens(x, y, r = lens.r) {
  lens = { x, y, r };
  home.style.setProperty('--lx', `${x}px`);
  home.style.setProperty('--ly', `${y}px`);
  home.style.setProperty('--lr', `${r}px`);
}

export const getLens = () => ({ ...lens });

/** Centre of a page name on the home screen, e.g. homeLinkPoint('team'). */
export function homeLinkPoint(key) {
  const a = home.querySelector(`[data-home-link="${key}"]`);
  const r = a?.getBoundingClientRect();
  if (!r || !r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Glide the lens to a point. */
export function tweenLens(to, ms) {
  const from = getLens();
  const r = to.r ?? from.r;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = easeInOut(t);
      setLens(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, from.r + (r - from.r) * e);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
