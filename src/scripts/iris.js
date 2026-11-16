// Iris transitions between full-screen pages.
// Opening: the incoming page sits on top, clipped to a circle that grows to fill the screen.
// Closing (going home): the outgoing page sits on top and its circle shrinks.
// With prefers-reduced-motion every transition becomes a simple crossfade.

import { settings } from './transition-settings.js';
import { lensR, setLens, getLens, tweenLens, homeLinkPoint } from './lens-state.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const OPEN_MS = 950;
const CLOSE_MS = 800;
const EASE = 'cubic-bezier(0.66, 0, 0.22, 1)';

const centre = () => ({ x: innerWidth / 2, y: innerHeight / 2 });
// Radius that covers the whole screen from point p.
const cover = (p) => Math.hypot(Math.max(p.x, innerWidth - p.x), Math.max(p.y, innerHeight - p.y)) + 2;
const circle = (r, p) => `circle(${r}px at ${p.x}px ${p.y}px)`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function show(el, z) {
  el.classList.add('is-visible');
  el.style.zIndex = String(z);
}

function hide(el) {
  el.classList.remove('is-visible');
  el.style.zIndex = '';
  el.getAnimations().forEach((a) => a.cancel());
}

function settle(el) {
  el.style.zIndex = '';
  el.getAnimations().forEach((a) => a.cancel());
}

const iris = (el, r0, r1, p, duration) =>
  el.animate([{ clipPath: circle(r0, p) }, { clipPath: circle(r1, p) }], { duration, easing: EASE, fill: 'forwards' })
    .finished;

const fade = (el, o0, o1, duration) =>
  el.animate([{ opacity: o0 }, { opacity: o1 }], { duration, easing: 'ease', fill: 'forwards' }).finished;

/**
 * @param {object} t
 * @param {{key: string, el: HTMLElement} | null} t.from  null on first load
 * @param {{key: string, el: HTMLElement}} t.to
 * @param {{x: number, y: number} | null} t.origin  click point, null for back/forward and direct links
 * @param {Map<string, HTMLElement>} t.pages
 */
export async function runTransition({ from, to, origin, pages }) {
  const home = pages.get('home');
  for (const el of pages.values()) if (el !== from?.el && el !== to.el) hide(el);

  // First load / direct link: open from the centre, out of black.
  if (!from) {
    show(to.el, 2);
    if (reducedMotion.matches) await fade(to.el, 0, 1, 500);
    else await iris(to.el, 0, cover(centre()), centre(), OPEN_MS + 200);
    return settle(to.el);
  }

  if (reducedMotion.matches) {
    show(from.el, 1);
    show(to.el, 2);
    await fade(to.el, 0, 1, 350);
    hide(from.el);
    return settle(to.el);
  }

  if (to.key === 'home') {
    await closeToHome(from, settings.home, home);
    return settle(home);
  }

  if (from.key === 'home') {
    // Clicked: the lens itself becomes the iris. Back/forward: open from the centre.
    const p = origin ?? centre();
    // (On touch the lens may already fill the screen; then leave it as it is.)
    if (origin && getLens().r <= lensR()) setLens(p.x, p.y, lensR());
    await openOver(home, to.el, p, origin ? lensR() : 0);
    return settle(to.el);
  }

  // Page → page
  const p = origin ?? centre();
  const mode = origin ? settings.between : 'direct';

  if (mode === 'via-home') {
    await closeToHome(from, 'lens', home);
    const q = homeLinkPoint(to.key) ?? centre();
    await wait(120);
    await tweenLens({ ...q, r: lensR() }, 650);
    await wait(80);
    await openOver(home, to.el, q, lensR());
  } else if (mode === 'black') {
    show(from.el, 2);
    await iris(from.el, cover(p), 0, p, CLOSE_MS * 0.8);
    hide(from.el);
    await wait(180);
    show(to.el, 2);
    await iris(to.el, 0, cover(p), p, OPEN_MS);
  } else {
    await openOver(from.el, to.el, p, 0);
  }
  return settle(to.el);
}

async function openOver(below, el, p, r0) {
  show(below, 1);
  show(el, 2);
  await iris(el, r0, cover(p), p, OPEN_MS);
  hide(below);
}

async function closeToHome(from, mode, home) {
  if (mode === 'black') {
    const p = centre();
    show(from.el, 2);
    await iris(from.el, cover(p), 0, p, CLOSE_MS);
    hide(from.el);
    await wait(280);
    setLens(p.x, p.y, 0);
    show(home, 1);
    await fade(home, 0, 1, 600);
    return;
  }

  // 'lens': close onto this page's name on the home screen. 'centre': onto the centre word.
  const p = (mode === 'lens' && homeLinkPoint(from.key)) || centre();
  setLens(p.x, p.y, lensR());
  show(home, 1);
  show(from.el, 2);
  await iris(from.el, cover(p), lensR(), p, CLOSE_MS);
  await fade(from.el, 1, 0, 220);
  hide(from.el);
}
