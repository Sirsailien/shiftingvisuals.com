// Team page paging: no page scroll. Desktop pages sideways through the panels
// (edge buttons, or the mouse wheel); phones swipe vertically, one panel per screen.

const root = document.querySelector('[data-team]');
const page = root.closest('[data-page]');
const track = root.querySelector('[data-track]');
const panels = [...track.querySelectorAll('[data-panel]')];
const prev = root.querySelector('[data-prev]');
const next = root.querySelector('[data-next]');
const nextPhone = root.querySelector('[data-next-phone]');
const count = root.querySelector('[data-count]');

const phone = matchMedia('(max-width: 760px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const behavior = () => (reducedMotion.matches ? 'instant' : 'smooth');

function index() {
  if (phone.matches) return Math.round(track.scrollTop / track.clientHeight);
  const start = panels[0].offsetLeft;
  let best = 0;
  panels.forEach((p, i) => {
    if (Math.abs(p.offsetLeft - start - track.scrollLeft) < Math.abs(panels[best].offsetLeft - start - track.scrollLeft)) best = i;
  });
  return best;
}

function go(i) {
  const target = panels[Math.max(0, Math.min(panels.length - 1, i))];
  if (phone.matches) track.scrollTo({ top: target.offsetTop, behavior: behavior() });
  else track.scrollTo({ left: target.offsetLeft - panels[0].offsetLeft, behavior: behavior() });
}

function update() {
  const atStart = phone.matches ? track.scrollTop < 4 : track.scrollLeft < 4;
  const atEnd = phone.matches
    ? track.scrollTop + track.clientHeight > track.scrollHeight - 4
    : track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
  prev.hidden = atStart;
  next.hidden = atEnd;
  nextPhone.disabled = atEnd;
  count.textContent = String(index() + 1).padStart(2, '0');
}

prev.addEventListener('click', () => go(index() - 1));
next.addEventListener('click', () => go(index() + 1));
nextPhone.addEventListener('click', () => go(index() + 1));
track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
addEventListener('resize', update);

// Desktop: a vertical wheel pages sideways, one panel per gesture.
let wheelLock = 0;
track.addEventListener(
  'wheel',
  (e) => {
    if (phone.matches || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 4) return;
    wheelLock = now + 650;
    go(index() + Math.sign(e.deltaY));
  },
  { passive: false },
);

// Phones have no hover: a tap on a photo shows it in colour.
for (const photo of root.querySelectorAll('[data-photo]')) {
  photo.addEventListener('click', () => photo.classList.toggle('is-colour'));
}

// Start at the statement every time the page opens.
page.addEventListener('route:enter', () => {
  track.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  update();
});

update();
