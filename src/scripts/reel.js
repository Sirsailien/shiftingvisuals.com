// Film reel behaviour (Portfolio and In the works): rotating credits, switching
// films, press-to-open, and a lazily-created YouTube player for the active film.
// Only one player exists at a time: a reel removes its player when you leave its page.
//
// States:  idle     still + credit inside the letterbox bars
//          engaged  pressed: credit gone, bars slide away, still in colour
//          open     the YouTube player, with its own controls. Stays open until
//                   you switch film or leave the page; pausing keeps you here.

import { replaceParam } from './router.js';

const PRESS_MS = 500; // hold this long before the player opens
const UNCROP_MS = 500; // the still eases from cropped to the full 16:9 frame
const CREDIT_MS = 2600; // time per credit
const WARMUP_MS = 1500; // create the player this long after the page opens

// The YouTube IFrame API, loaded once on first use.
let ytApi = null;
function loadYouTubeApi() {
  ytApi ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.append(s);
  });
  return ytApi;
}

export function initReel(pf) {
  const page = pf.closest('[data-page]');
  const stage = pf.querySelector('[data-stage]');
  const reel = pf.querySelector('[data-reel]');
  const slides = [...reel.querySelectorAll('[data-slide]')];
  const thumbs = [...pf.querySelectorAll('[data-thumb]')];
  const videoBox = pf.querySelector('[data-video]');
  const soundBtn = pf.querySelector('[data-sound]');
  const hint = pf.querySelector('[data-hint]');
  const capTitle = pf.querySelector('[data-cap-title]');
  const capMeta = pf.querySelector('[data-cap-meta]');
  const count = pf.querySelector('[data-count]');

  const phone = matchMedia('(max-width: 760px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const credits = slides.map((s) => JSON.parse(s.dataset.credits));

  let current = 0;
  let state = 'idle'; // 'idle' | 'engaged' | 'open'
  let timer = null;
  let creditTimer = null;
  let warmupTimer = null;

  // ---------- Rotating credit ----------

  function swap(el, text, after) {
    if (reducedMotion.matches) {
      el.textContent = text;
      after?.();
      return;
    }
    el.classList.add('out');
    setTimeout(() => {
      el.classList.remove('out');
      el.classList.add('in');
      el.textContent = text;
      after?.();
      void el.offsetWidth; // reflow so the slide-in animates
      el.classList.remove('in');
    }, 600);
  }

  // Each film deals its credits like a shuffled deck: every name once, in a random
  // order, then a fresh shuffle that never opens with the name that just closed.
  const decks = credits.map(() => ({ order: [], pos: 0 }));

  function deal(i) {
    const deck = decks[i];
    const last = deck.order[deck.order.length - 1];
    const order = credits[i].map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    if (order.length > 1 && order[0] === last) {
      const j = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[j]] = [order[j], order[0]];
    }
    deck.order = order;
    deck.pos = 0;
  }

  function nextCredit(i) {
    if (++decks[i].pos >= decks[i].order.length) deal(i);
  }

  // Shrink a credit line that's wider than the screen, so long names fit on one line.
  function fit(el) {
    el.style.fontSize = '';
    const room = el.parentElement.clientWidth;
    const width = el.scrollWidth;
    if (room && width > room) {
      el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * room * 0.98) / width}px`;
    }
  }

  function fitAll() {
    pf.querySelectorAll('[data-role], [data-name]').forEach(fit);
  }

  function showCredit(animate, i = current) {
    const list = credits[i];
    if (!list.length) return;
    const c = list[decks[i].order[decks[i].pos]];
    const role = slides[i].querySelector('[data-role]');
    const name = slides[i].querySelector('[data-name]');
    const link = () => (c.href ? name.setAttribute('href', c.href) : name.removeAttribute('href'));
    if (animate) {
      swap(role, c.label, () => fit(role));
      swap(name, c.name, () => {
        link();
        fit(name);
      });
    } else {
      role.textContent = c.label;
      name.textContent = c.name;
      link();
      fit(role);
      fit(name);
    }
  }

  function restartCredits() {
    clearInterval(creditTimer);
    creditTimer = setInterval(() => {
      if (state !== 'idle' || !page.classList.contains('is-visible') || credits[current].length < 2) return;
      nextCredit(current);
      showCredit(true);
    }, CREDIT_MS);
  }

  // ---------- Switching films ----------

  const hasVideo = () => Boolean(slides[current].dataset.yt);

  function indexOf(slug) {
    const i = slides.findIndex((s) => s.dataset.slug === slug);
    return i < 0 ? 0 : i;
  }

  function setCurrent(i, { scroll = null } = {}) {
    if (i !== current) {
      reset(); // switching film is the way back to the thumbnail
      slides[current].classList.remove('is-current');
      // The film we leave gets a fresh shuffle for next time
      deal(current);
      showCredit(false, current);
      current = i;
      slides[i].classList.add('is-current');
      showCredit(false);
      restartCredits();
      cueCurrent();
    }
    const s = slides[i];
    pf.classList.toggle('no-video', !hasVideo());
    capTitle.textContent = s.dataset.title;
    capMeta.textContent = s.dataset.meta;
    count.textContent = String(i + 1).padStart(2, '0');
    thumbs.forEach((t) => (t.dataset.thumb === s.dataset.slug ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
    if (scroll && phone.matches) {
      reel.scrollTo({ top: i * reel.clientHeight, behavior: scroll === 'smooth' && !reducedMotion.matches ? 'smooth' : 'instant' });
    }
  }

  // Phone: swiping to another film changes the film (and the URL, without new history entries).
  let scrollRaf = 0;
  reel.addEventListener(
    'scroll',
    () => {
      if (!phone.matches) return;
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        const i = Math.round(reel.scrollTop / reel.clientHeight);
        if (i !== current && slides[i]) {
          setCurrent(i);
          replaceParam(slides[i].dataset.slug);
        }
      });
    },
    { passive: true },
  );

  // The serif loads after the first measure; fit again once it's in.
  document.fonts?.ready.then(fitAll);

  // Re-align after rotating the phone. Only on a width change: phone browsers resize the
  // height while you scroll (the address bar hides/shows), and snapping back then would
  // fight the swipe.
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (state === 'open') uncrop(false);
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    fitAll();
    if (phone.matches) reel.scrollTo({ top: current * reel.clientHeight, behavior: 'instant' });
  });

  // ---------- Engage / open / reset ----------

  function engage() {
    if (state !== 'idle') return;
    state = 'engaged';
    pf.classList.add('is-engaged');
    ensurePlayer();
  }

  function open() {
    clearTimeout(timer);
    state = 'open';
    pf.classList.add('is-engaged', 'is-open');
    uncrop(true);
    ensurePlayer();
    if (playerReady) player.playVideo();
  }

  // ---------- Cropped still → full 16:9 frame ----------
  // The still eases into exactly the rectangle the player will use, so the video
  // fades in on top of it without a jump.

  let uncropAnim = null;
  const stillOf = (i) => slides[i].querySelector('.pf__still');

  // Same maths as the player's CSS: the largest 16:9 box inside the video area, centred.
  function frameRect() {
    const area = videoBox.getBoundingClientRect();
    const slide = slides[current].getBoundingClientRect();
    const width = Math.min(area.width, (area.height * 16) / 9);
    const height = (width * 9) / 16;
    return {
      left: area.left - slide.left + (area.width - width) / 2,
      top: area.top - slide.top + (area.height - height) / 2,
      width,
      height,
    };
  }

  function uncrop(animate) {
    const img = stillOf(current);
    const r = frameRect();
    const to = { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, transform: 'none' };
    uncropAnim?.cancel();
    if (animate && !reducedMotion.matches) {
      const box = slides[current].getBoundingClientRect();
      const from = { top: '0px', left: '0px', width: `${box.width}px`, height: `${box.height}px`, transform: 'scale(1.04)' };
      uncropAnim = img.animate([from, to], { duration: UNCROP_MS, easing: 'cubic-bezier(0.7, 0, 0.2, 1)' });
    }
    Object.assign(img.style, to);
  }

  function recrop(i) {
    uncropAnim?.cancel();
    uncropAnim = null;
    const img = stillOf(i);
    for (const prop of ['top', 'left', 'width', 'height', 'transform']) img.style.removeProperty(prop);
  }

  // Back to the still + credit (switching film, leaving the page, or a cancelled press).
  function reset() {
    clearTimeout(timer);
    if (state === 'idle') return;
    state = 'idle';
    pf.classList.remove('is-engaged', 'is-open');
    recrop(current);
    videoBox.classList.remove('is-visible');
    if (playerReady) {
      player.pauseVideo();
      player.getIframe().tabIndex = -1;
    }
    restartCredits();
  }

  const isControl = (e) => e.target.closest('a[href], button');

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || isControl(e) || state !== 'idle' || !hasVideo()) return;
    engage();
    timer = setTimeout(open, PRESS_MS);
  });

  // Let go before the player opened: cancel.
  stage.addEventListener('pointerup', (e) => {
    if (state === 'engaged') reset();
  });

  // Scrolling (phone) or the browser taking over the gesture.
  stage.addEventListener('pointercancel', () => {
    if (state === 'engaged') reset();
  });

  stage.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && state === 'engaged') reset();
  });

  stage.addEventListener('contextmenu', (e) => e.preventDefault()); // no long-press menu

  // Keyboard (and anyone who clicks the hint): open straight away.
  hint.addEventListener('click', () => {
    if (state === 'idle') {
      engage();
      open();
    }
  });

  // ---------- Sound ----------

  soundBtn.addEventListener('click', () => {
    if (!playerReady) return;
    const on = player.isMuted();
    on ? player.unMute() : player.mute();
    syncSound();
  });

  function syncSound() {
    const muted = !playerReady || player.isMuted();
    soundBtn.textContent = muted ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(!muted));
  }

  // ---------- YouTube: one player, created lazily for the active film ----------

  let player = null;
  let playerReady = false;
  let apiRequested = false;

  function ensurePlayer() {
    if (player || apiRequested || !hasVideo()) return;
    apiRequested = true;
    loadYouTubeApi().then(() => {
      if (apiRequested && !player && page.classList.contains('is-visible')) createPlayer();
      else apiRequested = false;
    });
  }

  function destroyPlayer() {
    apiRequested = false;
    if (!player) return;
    player.destroy();
    player = null;
    playerReady = false;
    cuedId = null;
    const div = document.createElement('div');
    div.dataset.player = '';
    videoBox.replaceChildren(div);
  }

  function createPlayer() {
    player = new YT.Player(videoBox.querySelector('[data-player]'), {
      host: 'https://www.youtube-nocookie.com',
      videoId: slides[current].dataset.yt,
      playerVars: {
        mute: 1,
        playsinline: 1,
        rel: 0,
        controls: 1, // once open, YouTube's own controls take over
        iv_load_policy: 3,
        cc_load_policy: 0,
        modestbranding: 1,
        origin: location.origin,
      },
      events: {
        onReady: () => {
          playerReady = true;
          player.mute();
          const iframe = player.getIframe();
          iframe.tabIndex = -1;
          iframe.title = 'Film player';
          cueCurrent();
          if (state === 'open') player.playVideo();
        },
        onStateChange: (e) => {
          if (state !== 'open') {
            // Something started while we're back on the still: keep it quiet.
            if (e.data === YT.PlayerState.PLAYING) player.pauseVideo();
            return;
          }
          // Reveal the player once it really plays (hides YouTube's loading screen),
          // then leave it up, paused or not.
          if (e.data === YT.PlayerState.PLAYING && !videoBox.classList.contains('is-visible')) {
            videoBox.classList.add('is-visible');
            player.getIframe().tabIndex = 0;
          }
          syncSound();
        },
      },
    });
  }

  let cuedId = null;
  function cueCurrent() {
    const id = slides[current].dataset.yt;
    if (!playerReady || !id || cuedId === id) return;
    cuedId = id;
    player.cueVideoById(id);
  }

  // ---------- Routing ----------

  // The film from the URL; an unknown slug falls back to the first film.
  function filmFromRoute(param) {
    const i = indexOf(param);
    if (param && slides[i].dataset.slug !== param) replaceParam(null);
    return i;
  }

  page.addEventListener('route:enter', (e) => {
    // A fresh shuffle for every film each time the page is shown
    slides.forEach((_, i) => {
      deal(i);
      showCredit(false, i);
    });
    setCurrent(filmFromRoute(e.detail.param), { scroll: 'instant' });
    showCredit(false);
    restartCredits();
    clearTimeout(warmupTimer);
    warmupTimer = setTimeout(() => page.classList.contains('is-active') && ensurePlayer(), WARMUP_MS);
  });

  page.addEventListener('route:param', (e) => {
    setCurrent(filmFromRoute(e.detail.param), { scroll: 'smooth' });
  });

  page.addEventListener('route:leave', () => {
    reset();
    clearInterval(creditTimer);
    clearTimeout(warmupTimer);
    destroyPlayer();
  });

}
