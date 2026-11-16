// Hash router. Every page is already in the DOM; the router decides which one
// is showing and hands the change to the iris transition.
//
// Pages receive events:  route:enter / route:leave  ({detail: route})
//                        route:param  (same page, new param, e.g. another film)

import { parse, toHash } from './routes.js';
import { runTransition } from './iris.js';

const pages = new Map([...document.querySelectorAll('[data-page]')].map((el) => [el.dataset.page, el]));

let current = null; // { page, param }
let running = false;
let queued = null;

history.scrollRestoration = 'manual';

function setActive(key) {
  for (const [k, el] of pages) {
    const on = k === key;
    el.inert = !on;
    el.classList.toggle('is-active', on);
    el.classList.toggle('is-visible', on);
  }
}

async function navigate(route, { origin = null, kind }) {
  if (running) {
    queued = { route, ctx: { origin, kind } };
    return;
  }

  if (current && route.page === current.page) {
    if (route.param !== current.param) {
      current = route;
      pages.get(route.page).dispatchEvent(new CustomEvent('route:param', { detail: route }));
    }
    return;
  }

  const from = current;
  const to = pages.get(route.page);
  current = route;
  running = true;
  closeMenus();
  for (const el of pages.values()) el.inert = true;

  const title = to.dataset.title;
  document.title = route.page === 'home' ? 'Shifting Visuals' : `${title} · Shifting Visuals`;
  to.dispatchEvent(new CustomEvent('route:enter', { detail: route }));

  await runTransition({
    from: from && { key: from.page, el: pages.get(from.page) },
    to: { key: route.page, el: to },
    origin,
    pages,
  });

  setActive(route.page);
  if (from) pages.get(from.page).dispatchEvent(new CustomEvent('route:leave', { detail: from }));
  if (kind !== 'load') to.querySelector('[data-page-heading]')?.focus({ preventScroll: true });
  running = false;

  if (queued) {
    const q = queued;
    queued = null;
    navigate(q.route, q.ctx);
  }
}

function routeFromLocation() {
  const route = parse(location.hash);
  if (route) return route;
  history.replaceState(null, '', '#/');
  return { page: 'home', param: null };
}

// In-site links: push the new hash ourselves so we know where the click happened.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const route = parse(a.getAttribute('href'));
  if (!route) return;
  e.preventDefault();

  const r = a.getBoundingClientRect();
  const origin = e.detail > 0 ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const hash = toHash(route);
  if (hash !== toHash(routeFromLocation())) history.pushState(null, '', hash);
  navigate(route, { origin, kind: 'click' });
});

// Back/forward and hand-edited URLs. navigate() ignores the duplicate when both fire.
window.addEventListener('popstate', () => navigate(routeFromLocation(), { kind: 'pop' }));
window.addEventListener('hashchange', () => navigate(routeFromLocation(), { kind: 'pop' }));

// Quiet menu (mobile toggle).
function closeMenus() {
  for (const m of document.querySelectorAll('.menu[data-open]')) {
    m.removeAttribute('data-open');
    m.querySelector('[data-menu-toggle]').setAttribute('aria-expanded', 'false');
  }
}

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-menu-toggle]');
  if (toggle) {
    const menu = toggle.closest('.menu');
    const open = !menu.hasAttribute('data-open');
    closeMenus();
    menu.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  } else if (!e.target.closest('.menu')) {
    closeMenus();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenus();
});

/** Update the film in the URL without a history entry (e.g. swiping between films). */
export function replaceParam(param) {
  if (!current || current.param === param) return;
  current = { ...current, param };
  history.replaceState(null, '', toHash(current));
}

// Start once every page script has attached its listeners. Module scripts all run
// before DOMContentLoaded, so waiting for it is enough ('load' is a fallback).
let started = false;
function start() {
  if (started) return;
  started = true;
  navigate(routeFromLocation(), { kind: 'load' });
}
if (document.readyState === 'complete') start();
else {
  document.addEventListener('DOMContentLoaded', start);
  addEventListener('load', start);
}
