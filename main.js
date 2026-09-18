/* ═══════════════════════════════════════════════
   FORNO — Wood-Fired Pizza · main.js
   Custom animation engine: smooth scroll, parallax,
   tilt, magnetic UI, particles, cart, sliders.
   No libraries. One rAF loop to rule them all.
   ═══════════════════════════════════════════════ */
(() => {
'use strict';

/* ── Helpers ─────────────────────────────────── */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lerp = (a, b, n) => a + (b - a) * n;
const fine    = matchMedia('(pointer:fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => '₹' + n.toLocaleString('en-IN');

/* ═══════════════ 1. PRELOADER ═══════════════ */
const pre  = $('#preloader');
const wipe = $('.pre-wipe');
lockScroll(true);

let preDone = false;
(function runPreloader() {
  if (!pre) { document.body.classList.add('loaded'); return; }
  const num = $('#preNum'), bar = $('#preBar');
  const t0 = performance.now(), DUR = 1650;
  (function tick(t) {
    t = t || performance.now();
    const k = Math.min(1, (t - t0) / DUR);
    const e = 1 - Math.pow(1 - k, 3);
    num.textContent = Math.round(e * 100);
    bar.style.transform = `scaleX(${e})`;
    if (k < 1) requestAnimationFrame(tick);
    else setTimeout(finishPre, 200);
  })();
})();
function finishPre() {
  if (preDone) return;
  preDone = true;
  document.body.classList.add('loaded');
  if (pre) {
    pre.classList.add('pre-done');
    wipe && wipe.classList.add('pre-done');
    pre.addEventListener('transitionend', () => {
      pre.remove(); wipe && wipe.remove(); lockScroll(false);
    }, { once: true });
    setTimeout(() => { pre.isConnected && pre.remove(); wipe && wipe.isConnected && wipe.remove(); lockScroll(false); }, 2400); // failsafe
  }
}
setTimeout(finishPre, 4200); // hard failsafe
function lockScroll(v) { document.body.style.overflow = v ? 'hidden' : ''; }

/* ═══════════════ 2. HERO TITLE SPLIT ═══════════════ */
$$('[data-split]').forEach(el => {
  splitWords(el);
  el.setAttribute('aria-hidden', 'true');
});
$$('.hero-title .ch-i').forEach((c, i) => {
  c.style.transitionDelay = (0.55 + i * 0.024) + 's';
});
function splitWords(el) {
  [...el.childNodes].forEach(node => {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
        const w = document.createElement('span'); w.className = 'w';
        [...part].forEach(ch => {
          const o = document.createElement('span'); o.className = 'ch';
          const i = document.createElement('span'); i.className = 'ch-i';
          i.textContent = ch; o.append(i); w.append(o);
        });
        frag.append(w);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === 1) splitWords(node);
  });
}

/* ═══════════════ 3. SMOOTH SCROLL ENGINE ═══════════════ */
const wrapper = $('#smooth');
const smooth = fine && !reduced && matchMedia('(min-width:1024px)').matches && wrapper;
let cur = 0, vh = innerHeight, docH = 0;

const setH = () => {
  if (!smooth) return;
  docH = wrapper.scrollHeight;
  document.body.style.height = docH + 'px';
};
if (smooth) {
  document.documentElement.classList.add('smooth');
  setH();
  addEventListener('resize', () => { vh = innerHeight; setH(); });
  new ResizeObserver(setH).observe(wrapper);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setH);
  addEventListener('load', setH);
}

/* ═══════════════ 4. UNIFIED rAF LOOP ═══════════════ */
const progressEl = $('#progress');
const nav = $('#nav');
const parEls = $$('[data-parallax]').map(el => ({ el, speed: parseFloat(el.dataset.parallax) || 0.1 }));
const heroEl = $('.hero');
let heroVisible = true, mouseX = innerWidth / 2, mouseY = innerHeight / 2, ringX = mouseX, ringY = mouseY;

if (heroEl && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(heroEl);
}

function raf(t) {
  if (smooth) {
    cur = lerp(cur, scrollY, 0.085);
    if (Math.abs(scrollY - cur) < 0.05) cur = scrollY;
    wrapper.style.transform = `translate3d(0,${-cur}px,0)`;
  }
  const sc = smooth ? cur : scrollY;
  vh = innerHeight;

  // scroll progress bar
  const H = smooth ? docH : document.documentElement.scrollHeight;
  progressEl.style.transform = `scaleX(${Math.min(1, sc / Math.max(1, H - vh))})`;

  // nav condensation
  nav.classList.toggle('scrolled', sc > 40);

  // parallax elements
  for (const { el, speed } of parEls) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -220 || r.top > vh + 220) continue;
    const off = (r.top + r.height / 2 - vh / 2) * speed;
    el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
  }

  // custom cursor ring
  if (fine && !reduced) {
    ringX = lerp(ringX, mouseX, 0.16);
    ringY = lerp(ringY, mouseY, 0.16);
    curRing.style.transform = `translate(${ringX}px,${ringY}px) translate(-50%,-50%)`;
  }

  embersStep(t);
  requestAnimationFrame(raf);
}

/* ═══════════════ 5. CUSTOM CURSOR ═══════════════ */
const curDot = $('#curDot'), curRing = $('#curRing');
if (fine && !reduced) {
  addEventListener('pointermove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    curDot.style.transform = `translate(${mouseX}px,${mouseY}px) translate(-50%,-50%)`;
    document.documentElement.classList.remove('cur-hide');
  });
  document.addEventListener('pointerover', e => {
    if (e.target.closest('a,button,[data-hover]')) document.documentElement.classList.add('cur-h');
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest('a,button,[data-hover]')) document.documentElement.classList.remove('cur-h');
  });
  document.documentElement.addEventListener('mouseleave', () => document.documentElement.classList.add('cur-hide'));
}

/* ═══════════════ 6. EMBER PARTICLES ═══════════════ */
const cv = $('#embers');
let embersStep = () => {};
if (cv && !reduced && matchMedia('(min-width:768px)').matches) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, parts = [];
  const resize = () => {
    const r = heroEl.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
  const N = 64;
  for (let i = 0; i < N; i++) parts.push(spawn(true));
  function spawn(anyY) {
    return {
      x: Math.random() * W,
      y: anyY ? Math.random() * H : H + 12,
      r: 0.8 + Math.random() * 2.1,
      v: 0.25 + Math.random() * 0.75,
      ph: Math.random() * Math.PI * 2,
      am: 0.3 + Math.random() * 0.7,
      a: 0.18 + Math.random() * 0.5
    };
  }
  embersStep = (t) => {
    if (!heroVisible || document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.y -= p.v;
      p.x += Math.sin(p.ph + t * 0.0009) * p.am * 0.5;
      const tw = 0.65 + 0.35 * Math.sin(p.ph * 3 + t * 0.003);
      if (p.y < -14) Object.assign(p, spawn(false));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${120 + Math.floor(70 * tw)},48,${(p.a * tw).toFixed(3)})`;
      ctx.shadowColor = 'rgba(255,110,40,.75)';
      ctx.shadowBlur = 7;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
  };
}

/* ═══════════════ 7. SCROLL REVEALS & COUNTERS ═══════════════ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
$$('[data-reveal]').forEach(el => io.observe(el));

const ioCount = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    ioCount.unobserve(el);
    const end = parseFloat(el.dataset.count), dur = 1700, t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      const ez = 1 - Math.pow(2, -10 * k);
      el.textContent = Math.round(end * ez).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });
}, { threshold: 0.5 });
$$('[data-count]').forEach(el => ioCount.observe(el));

/* ═══════════════ 8. 3D TILT CARDS ═══════════════ */
if (fine && !reduced) {
  $$('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', ((y - 0.5) * -7) + 'deg');
      card.style.setProperty('--ry', ((x - 0.5) * 9) + 'deg');
      card.style.setProperty('--mx', (x * 100) + '%');
      card.style.setProperty('--my', (y * 100) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ═══════════════ 9. MAGNETIC BUTTONS ═══════════════ */
if (fine && !reduced) {
  $$('[data-magnet]').forEach(el => {
    const s = parseFloat(el.dataset.magnet) || 0.3;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform .12s ease-out';
      el.style.transform = `translate(${x * s}px,${y * s}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .65s cubic-bezier(.2,2.2,.35,1)';
      el.style.transform = '';
      setTimeout(() => el.style.transition = '', 650);
    });
  });
}

/* ═══════════════ 10. NAV / MOBILE MENU / ANCHORS ═══════════════ */
const burger = $('#burger'), mMenu = $('#mMenu');
const closeMenu = () => {
  burger.classList.remove('open'); mMenu.classList.remove('open');
  mMenu.setAttribute('aria-hidden', 'true');
  if (!$('#cartDrawer').classList.contains('open')) lockScroll(false);
};
burger.addEventListener('click', () => {
  const open = !mMenu.classList.contains('open');
  burger.classList.toggle('open', open);
  mMenu.classList.toggle('open', open);
  mMenu.setAttribute('aria-hidden', String(!open));
  lockScroll(open);
});

$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = $(id);
  if (!el) return;
  e.preventDefault();
  closeMenu();
  closeCart();
  const y = el.getBoundingClientRect().top + (smooth ? cur : scrollY);
  if (smooth) scrollTo(0, Math.max(0, y));
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}));

// active section highlight
const secIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.nav-links a').forEach(l => l.classList.toggle('active', l.dataset.link === e.target.id));
  });
}, { rootMargin: '-42% 0px -52% 0px' });
['menu', 'craft', 'reviews', 'visit'].forEach(id => { const s = $('#' + id); s && secIO.observe(s); });

/* ═══════════════ 11. CART ═══════════════ */
const MENU = {
  margherita: { name: 'Margherita Classica', price: 299, img: 'images/margherita.jpg' },
  pepperoni:  { name: 'Pepperoni Inferno',   price: 449, img: 'images/pepperoni.jpg'  },
  formaggi:   { name: 'Quattro Formaggi',    price: 499, img: 'images/formaggi.jpg'   },
  bbq:        { name: 'BBQ Smokehouse',      price: 479, img: 'images/bbq.jpg'        },
  verdura:    { name: 'Verdura Garden',      price: 349, img: 'images/verdura.jpg'    },
  diavola:    { name: 'La Diavola',          price: 469, img: 'images/diavola.jpg'    }
};
const FREE_SHIP = 999, SHIP_FEE = 49;
const drawer = $('#cartDrawer'), backdrop = $('#backdrop');
const cartCountEl = $('#cartCount'), cartItemsEl = $('#cartItems');
const cartBtn = $('#cartOpen');

let cart = new Map();
try { cart = new Map(JSON.parse(localStorage.getItem('forno-cart') || '[]')); } catch (_) {}
cart.forEach((q, id) => { if (!MENU[id]) cart.delete(id); }); // drop stale items
const saveCart = () => { try { localStorage.setItem('forno-cart', JSON.stringify([...cart])); } catch (_) {} };

function totals() {
  let n = 0, sub = 0;
  cart.forEach((q, id) => { n += q; sub += q * MENU[id].price; });
  const del = sub === 0 || sub >= FREE_SHIP ? 0 : SHIP_FEE;
  return { n, sub, del, tot: sub + del };
}

function renderCart() {
  const { n, sub, del, tot } = totals();
  cartCountEl.textContent = n;
  cartCountEl.classList.toggle('zero', n === 0);
  drawer.classList.toggle('is-empty', cart.size === 0);

  cartItemsEl.innerHTML = [...cart].map(([id, q]) => {
    const m = MENU[id];
    return `<div class="c-item" data-id="${id}">
      <img src="${m.img}" alt="${m.name}">
      <div>
        <div class="c-name">${m.name}</div>
        <div class="c-price">${fmt(m.price)} each</div>
        <button class="c-rem" data-rem="${id}">remove</button>
      </div>
      <div class="c-right">
        <span class="c-total">${fmt(m.price * q)}</span>
        <span class="stepper">
          <button data-dec="${id}" aria-label="Decrease quantity">−</button>
          <b>${q}</b>
          <button data-inc="${id}" aria-label="Increase quantity">+</button>
        </span>
      </div>
    </div>`;
  }).join('');

  const k = Math.min(1, sub / FREE_SHIP);
  $('#shipBar').style.width = (sub === 0 ? 0 : Math.max(8, k * 100)) + '%';
  $('#shipMsg').innerHTML = sub >= FREE_SHIP
    ? `<b>Free delivery unlocked 🔥</b>`
    : `Add <b>${fmt(FREE_SHIP - sub)}</b> more for free delivery`;
  $('#cartSub').textContent = fmt(sub);
  $('#cartDel').textContent = del === 0 ? (sub === 0 ? fmt(0) : 'FREE') : fmt(del);
  $('#cartTot').textContent = fmt(tot);
}

function bumpBadge() {
  cartBtn.classList.remove('pop');
  void cartBtn.offsetWidth;
  cartBtn.classList.add('pop');
  renderCart();
}

function addToCart(id, btnEl) {
  cart.set(id, (cart.get(id) || 0) + 1);
  saveCart();
  bumpBadge();
  toast(`<b>${MENU[id].name}</b>&nbsp;added to your box`);
  const imgEl = btnEl && btnEl.closest('.card') ? $('.card-media img', btnEl.closest('.card')) : null;
  if (imgEl && !reduced) flyToCart(imgEl);
  if (btnEl) {
    btnEl.classList.add('added');
    setTimeout(() => btnEl.classList.remove('added'), 700);
  }
}

function flyToCart(img) {
  const c = cartBtn.getBoundingClientRect();
  const f = img.getBoundingClientRect();
  if (!f.width || !c.width) return;
  const ghost = img.cloneNode();
  ghost.className = 'fly';
  Object.assign(ghost.style, { left: f.left + 'px', top: f.top + 'px', width: f.width + 'px', height: f.height + 'px' });
  document.body.append(ghost);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '24px' },
    { transform: `translate(${c.left + c.width / 2 - (f.left + f.width / 2)}px,${c.top + c.height / 2 - (f.top + f.height / 2)}px) scale(.05)`, opacity: 0.35, borderRadius: '50%' }
  ], { duration: 750, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => ghost.remove();
}

$$('[data-add]').forEach(btn => btn.addEventListener('click', () => addToCart(btn.dataset.add, btn)));

// stepper / remove (event delegation)
drawer.addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  const rem = e.target.closest('[data-rem]');
  if (inc) { cart.set(inc.dataset.inc, cart.get(inc.dataset.inc) + 1); saveCart(); renderCart(); }
  if (dec) {
    const id = dec.dataset.dec, q = cart.get(id) - 1;
    q <= 0 ? cart.delete(id) : cart.set(id, q);
    saveCart(); renderCart();
  }
  if (rem) {
    const row = rem.closest('.c-item');
    row && row.classList.add('removing');
    setTimeout(() => { cart.delete(rem.dataset.rem); saveCart(); renderCart(); }, 260);
  }
});

const openCart = () => {
  drawer.classList.add('open'); backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false'); lockScroll(true);
};
const closeCart = () => {
  drawer.classList.remove('open'); backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  if (!mMenu.classList.contains('open')) lockScroll(false);
};
cartBtn.addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);
$('#browseBtn').addEventListener('click', () => {
  closeCart();
  const el = $('#menu');
  const y = el.getBoundingClientRect().top + (smooth ? cur : scrollY);
  smooth ? scrollTo(0, y) : el.scrollIntoView({ behavior: 'smooth' });
});
addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeMenu(); } });

// checkout
$('#checkoutBtn').addEventListener('click', function () {
  if (cart.size === 0) return;
  const r = this.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top);
  cart.clear(); saveCart();
  const orig = this.innerHTML;
  this.innerHTML = '<span>Order placed ✓</span>';
  this.disabled = true;
  toast(`<b>Order confirmed 🔥</b>&nbsp;Hot pizza at your door in ~30 min`);
  setTimeout(() => { renderCart(); this.innerHTML = orig; this.disabled = false; closeCart(); }, 1900);
});

renderCart();

/* ═══════════════ 12. TOASTS & CONFETTI ═══════════════ */
function toast(html) {
  const box = $('#toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg><span>${html}</span>`;
  box.append(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 450); }, 2500);
}

function confetti(x, y) {
  if (reduced) return;
  const root = $('#confettiRoot');
  const colors = ['#FF6A2B', '#FFB03A', '#F5EFE8', '#7CB342', '#FFC857'];
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    s.className = 'cf';
    s.style.background = colors[i % colors.length];
    s.style.left = x + 'px'; s.style.top = y + 'px';
    root.append(s);
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    s.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist - 4}px,${Math.sin(ang) * dist + 130}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0 }
    ], { duration: 950 + Math.random() * 550, easing: 'cubic-bezier(.16,.8,.4,1)' }).onfinish = () => s.remove();
  }
}

/* ═══════════════ 13. REVIEWS SLIDER ═══════════════ */
const slides = $$('.slide'), dotsBox = $('#dots');
let si = 0, autoTimer;
slides.forEach((_, i) => {
  const d = document.createElement('button');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.setAttribute('aria-label', `Review ${i + 1}`);
  d.addEventListener('click', () => { showSlide(i); restartAuto(); });
  dotsBox.append(d);
});
const dots = $$('.dot', dotsBox);
function showSlide(n) {
  slides[si].classList.remove('active'); dots[si].classList.remove('active');
  si = (n + slides.length) % slides.length;
  slides[si].classList.add('active'); dots[si].classList.add('active');
}
$('#prevSlide').addEventListener('click', () => { showSlide(si - 1); restartAuto(); });
$('#nextSlide').addEventListener('click', () => { showSlide(si + 1); restartAuto(); });
function restartAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => showSlide(si + 1), 6000);
}
if (!reduced) restartAuto();
const sliderEl = $('#slider');
sliderEl.addEventListener('mouseenter', () => clearInterval(autoTimer));
sliderEl.addEventListener('mouseleave', () => !reduced && restartAuto());
let touchX = null;
sliderEl.addEventListener('touchstart', e => touchX = e.touches[0].clientX, { passive: true });
sliderEl.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 42) { showSlide(dx < 0 ? si + 1 : si - 1); restartAuto(); }
  touchX = null;
}, { passive: true });

/* ═══════════════ 14. MISC ═══════════════ */
$('#year').textContent = new Date().getFullYear();

// start the engine
requestAnimationFrame(raf);

})();
