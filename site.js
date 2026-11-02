// Shared by every page. One rAF loop drives everything tied to scroll or pointer;
// page scripts (home.js, case.js) hook into it through `site`. No framework.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
// style writes are the expensive part of the loop, so skip the ones that would not change anything
const setVar = (el, k, v) => { if (el[k] !== v) { el[k] = v; el.style.setProperty(k, v); } };
const store = {
  get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode: no memory, no harm */ } },
};
const site = { frame: [], measure: [], ready: [] };
const css = getComputedStyle(root);
const FG = css.getPropertyValue('--bone').trim();
const AC = css.getPropertyValue('--signal').trim();
const expo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

/* ---------- text splitting (walks text nodes, so <em> survives) ---------- */
function split(el) {
  let i = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    // split on breaking whitespace only, so an &nbsp; keeps its two words in one span
    for (const part of node.textContent.split(/([^\S ]+)/)) {
      if (!part) continue;
      if (/^[^\S ]+$/.test(part)) { frag.append(part); continue; }
      const w = document.createElement('span');
      const inner = document.createElement('span');
      w.className = 'w';
      w.style.setProperty('--i', i++);
      inner.textContent = part;
      w.append(inner);
      frag.append(w);
    }
    node.replaceWith(frag);
  }
}
$$('[data-split], [data-scrub]').forEach(split);
$$('[data-letters] > span').forEach(s => {
  s.innerHTML = [...s.textContent]
    // the space stays inside .sp so textContent (and the rows drawn from it) keep the word break
    .map((c, i) => c === ' ' ? '<span class="ch sp"> </span>' : `<span class="ch" style="--i:${i}">${c}</span>`).join('');
});

// size a one-line title to its container, edge to edge, whatever the font ends up measuring
function fit(el) {
  el.style.fontSize = '100px';
  el.style.fontSize = (100 * el.clientWidth / el.firstElementChild.scrollWidth) + 'px';
}

$$('[data-hits]').forEach(r => {
  const [hit, of] = r.dataset.hits.split('/').map(Number);
  r.innerHTML = Array.from({ length: of }, (_, i) => `<span class="${i < hit ? 'hit' : 'miss'}" style="--d:${i}"></span>`).join('');
});
// press-to-flip pieces; on a mouse, hover does the same through CSS
$$('.toggle').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));

/* ---------- small facts that must not go stale ---------- */
$$('[data-since]').forEach(el => {
  const [y, m] = el.dataset.since.split('-').map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + now.getMonth() + 1 - m;
  el.textContent = `${Math.floor(months / 12)}y ${months % 12}m`;
});

$$('[data-copy]').forEach(b => {
  const label = b.textContent;
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied ✓'; }
    catch { b.textContent = b.dataset.copy; }
    setTimeout(() => { b.textContent = label; }, 1800);
  });
});

/* ---------- count-ups (from → to, so a drop counts down) ---------- */
const decimals = s => (s.split('.')[1] || '').length;
// the HTML carries the real figure for no-JS and reduced motion; start from `from` otherwise
if (!reduced) $$('[data-count]').forEach(el => { el.textContent = (+(el.dataset.from || 0)).toFixed(decimals(el.dataset.count)); });
function tween(el, from, to, dec, comma, dur = 1600) {
  if (reduced) return;
  const t0 = performance.now();
  const fmt = v => comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1 && el.tweenT0 === t0) requestAnimationFrame(step);
  };
  el.tweenT0 = t0;
  requestAnimationFrame(step);
}
const count = el => tween(el, +(el.dataset.from || 0), +el.dataset.count.replace(/,/g, ''), decimals(el.dataset.count), el.dataset.count.includes(','));

/* ---------- smooth scroll ---------- */
const lenis = !reduced && window.Lenis ? new Lenis({ lerp: 0.09 }) : null;
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  const target = a && $(a.getAttribute('href'));
  if (!target || !lenis) return;
  e.preventDefault();
  lenis.scrollTo(target, { duration: 1.6 });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

/* ---------- page transitions: rows sweep across, the next page sweeps them away ---------- */
const sweep = document.createElement('div');
sweep.className = 'sweep';
sweep.setAttribute('aria-hidden', 'true');
sweep.innerHTML = Array.from({ length: 14 }, (_, i) => `<i class="${i % 7 === 3 ? 'hot' : ''}" style="--d:${(i * 5) % 14}"></i>`).join('');
document.body.append(sweep);
if (root.classList.contains('arriving')) {
  sweep.classList.add('is-covered');
  root.classList.remove('arriving');
  store.set('sweep', '');
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname || !/^https?:|^file:/.test(url.protocol)) return;
  e.preventDefault();
  store.set('sweep', '1');
  sweep.classList.remove('is-covered');
  sweep.classList.add('is-covering');
  setTimeout(() => { location.href = url.href; }, reduced ? 0 : 720);
});
// Back/Forward restores the page from cache with the bars still drawn across it
addEventListener('pageshow', e => { if (e.persisted) sweep.classList.remove('is-covering', 'is-covered'); });

/* ---------- rows: a line of text redrawn as horizontal data rows ---------- */
// They stream in from the left, comb aside around the pointer, and can be flown
// out to the right. Each field gets its own canvas over `host`; the shape is
// sampled from wherever `target` sits inside it.
function rowField(host, target, paint) {
  const cv = document.createElement('canvas');
  cv.className = 'rowfield';
  cv.setAttribute('aria-hidden', 'true');
  host.append(cv);
  const ctx = cv.getContext('2d');
  const ptr = { x: -1e4, y: -1e4 };
  const f = { rows: [], t0: Infinity, w: 0, h: 0, settled: 0, ok: false };
  if (fine) {
    host.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; });
  }
  f.build = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    f.w = cv.clientWidth; f.h = cv.clientHeight;
    cv.width = f.w * dpr; cv.height = f.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hr = cv.getBoundingClientRect(), tr = target.getBoundingClientRect();
    const W = Math.ceil(tr.width), pad = Math.round(tr.height * 0.25), H = Math.ceil(tr.height) + pad * 2;
    if (!W || !tr.height) return (f.ok = false);
    const o = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d', { willReadFrequently: true });
    const spec = paint(o, W, H);
    if (!spec) return (f.ok = false);
    const data = o.getImageData(0, 0, W, H).data;
    const { pitch } = spec;
    const ox = tr.left - hr.left, oy = tr.top - hr.top - pad, thick = Math.max(2, Math.round(pitch * 0.62));
    const at = (x, y) => data[(y * W + x) * 4 + 3] / 255;
    const rows = [];
    const push = (x, y, len, th) => rows.push({
      tx: ox + x, ty: oy + y, len, th, x0: -len - Math.random() * f.w * 0.6,
      delay: Math.random() * 0.6 + (y / H) * 0.3, dur: 1 + Math.random() * 0.7,
      bad: Math.random() < 0.09, k: Math.random(), o: 0, done: f.t0 < performance.now() - 3000,
    });
    for (let y = 0; y < H; y += pitch) {
      for (let x = 0; x < W;) {
        if (at(x, y) < 0.5) { x++; continue; }
        let end = x;
        while (end < W && at(end, y) >= 0.5) end++;
        for (let s = x; s < end - 1;) {
          const len = Math.min(end - s, 5 + Math.random() * 24);
          push(s, y, len, thick);
          s += len + 1;
        }
        x = end;
      }
    }
    f.rows = rows;
    target.classList.add('rows-on');
    return (f.ok = true);
  };
  f.start = () => { if (f.t0 === Infinity) f.t0 = performance.now(); };
  f.visible = () => { const r = host.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  f.draw = (now, exit = 0) => {
    ctx.clearRect(0, 0, f.w, f.h);
    const t = (now - f.t0) / 1000, fly = exit * exit * f.w * 1.3, hot = [];
    ctx.fillStyle = FG;
    for (const p of f.rows) {
      const e = expo(clamp((t - p.delay) / p.dur, 0, 1));
      if (e === 0) continue;
      const dx = p.tx + p.len / 2 - ptr.x, d = Math.hypot(dx, (p.ty - ptr.y) * 1.8);
      p.o += ((d < 150 ? (1 - d / 150) ** 2 * 70 * (dx < 0 ? -1 : 1) : 0) - p.o) * 0.12;
      const x = p.x0 + (p.tx - p.x0) * e + p.o + fly * (0.75 + p.k);
      if (e === 1 && !p.done) { p.done = true; f.settled++; }
      // a wrong row stays orange in flight and for a beat after it lands, then is reconciled
      if (p.bad && t < p.delay + p.dur + 0.4) hot.push(p, x);
      else ctx.fillRect(x, p.ty, p.len, p.th);
    }
    ctx.fillStyle = AC;
    for (let i = 0; i < hot.length; i += 2) ctx.fillRect(hot[i + 1], hot[i].ty, hot[i].len, hot[i].th);
  };
  return f;
}

// Paints an element's own text, in its own font, for rowField. The condensed cut
// needs canvas fontStretch; without it this declines and the DOM text stays.
const stretchKeyword = pct => pct <= 65 ? 'extra-condensed' : pct <= 80 ? 'condensed' : pct <= 95 ? 'semi-condensed' : 'normal';
function textPaint(el) {
  return (o, W, H) => {
    if (reduced) return false;
    const cs = getComputedStyle(el);
    const text = cs.textTransform === 'uppercase' ? el.textContent.toUpperCase() : el.textContent;
    const stretch = stretchKeyword(parseFloat(cs.fontStretch) || 100);
    const ls = (parseFloat(cs.letterSpacing) || 0) / parseFloat(cs.fontSize);
    const ws = (parseFloat(cs.wordSpacing) || 0) / parseFloat(cs.fontSize);
    const font = s => {
      o.font = `${cs.fontWeight} ${s}px ${cs.fontFamily}`;
      o.fontStretch = stretch; o.letterSpacing = `${ls * s}px`; o.wordSpacing = `${ws * s}px`;
    };
    o.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
    const plain = o.measureText(text).width;
    font(100);
    let m = o.measureText(text);
    if (stretch !== 'normal' && !(m.width < plain * 0.95)) return false;
    const s = 100 * W / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    font(s);
    m = o.measureText(text);
    o.fillText(text, m.actualBoundingBoxLeft, (H + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    return { pitch: Math.max(3, Math.round(s / 48)) };
  };
}

/* ---------- scrubbed paragraphs: words light up as the paragraph crosses the viewport ---------- */
const scrubs = $$('[data-scrub]:not([data-scrub="pin"])').map(el => ({ el, words: $$('.w', el), lit: -1 }));
function scrubTo(s, p) {
  const n = Math.round(clamp(p, 0, 1) * s.words.length);
  if (n === s.lit) return;
  s.lit = n;
  s.words.forEach((w, i) => w.classList.toggle('lit', i < n));
}

/* ---------- cursor, row preview, magnets, scramble ---------- */
const cursor = $('.cursor'), cursorLabel = $('.cursor__label'), preview = $('.preview');
const m = { x: innerWidth / 2, y: innerHeight / 2 }, c = { ...m }, pv = { ...m };
const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function scramble(el) {
  const text = el.dataset.text || (el.dataset.text = el.textContent);
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', text.trim());
  let f = 0;
  cancelAnimationFrame(el.scrambleRaf);
  const step = () => {
    el.textContent = text.replace(/[a-z0-9]/gi, (ch, i) => i < f / 2 ? ch : glyphs[Math.random() * glyphs.length | 0]);
    if (++f < text.length * 2) el.scrambleRaf = requestAnimationFrame(step);
    else el.textContent = text;
  };
  step();
}
if (fine) {
  addEventListener('pointermove', e => { m.x = e.clientX; m.y = e.clientY; });
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor], a, button');
    cursor.classList.toggle('is-big', !!t?.dataset.cursor);
    cursor.classList.toggle('is-link', !!t && !t.dataset.cursor && !t.classList.contains('row'));
    cursorLabel.textContent = t?.dataset.cursor || '';
  });
  $$('.row').forEach(row => {
    row.addEventListener('pointerenter', () => { preview.innerHTML = $('.row__note', row).innerHTML; preview.classList.add('on'); });
    row.addEventListener('pointerleave', () => preview.classList.remove('on'));
  });
  $$('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.28}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
  if (!reduced) $$('.nav__links a, .nav__contact, .foot a, .btn').forEach(el => el.addEventListener('pointerenter', () => scramble(el)));
}

/* ---------- the loop ---------- */
const bar = $('.progress i');
const themed = $$('main > section');
const skewEls = $$('.h2, .commit__role');
let last = performance.now(), lastY = scrollY, vel = 0, skew = 0, theme = '', maxScroll = 1;

function loop(now) {
  const dt = clamp((now - last) / 16.667, 0, 3);
  last = now;
  lenis?.raf(now);
  const y = scrollY, mid = innerHeight / 2;
  vel += (y - lastY - vel) * 0.18;
  lastY = y;

  // sections carry a data-theme; the one under the middle of the viewport wins
  const zone = themed.find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  const t = zone ? zone.dataset.theme || 'dark' : theme;
  if (t !== theme) root.dataset.theme = theme = t;
  bar.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1)})`;
  for (const s of scrubs) {
    const r = s.el.getBoundingClientRect();
    scrubTo(s, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35));
  }
  if (!reduced) {
    const sk = clamp(vel * 0.1, -3.5, 3.5);
    if (Math.abs(sk - skew) > 0.02) {
      skew = sk;
      skewEls.forEach(el => { el.style.transform = `skewY(${sk.toFixed(2)}deg)`; });
    }
  }
  for (const f of site.frame) f(now, dt, y, vel);
  if (fine) {
    c.x += (m.x - c.x) * 0.22; c.y += (m.y - c.y) * 0.22;
    pv.x += (m.x - pv.x) * 0.1; pv.y += (m.y - pv.y) * 0.1;
    cursor.style.transform = `translate3d(${c.x}px,${c.y}px,0)`;
    preview.style.transform = `translate3d(${pv.x + 28}px,${pv.y - 60}px,0)`;
  }
  requestAnimationFrame(loop);
}

function measure() {
  $$('[data-fit]').forEach(fit);
  for (const f of site.measure) f();
  maxScroll = Math.max(1, root.scrollHeight - innerHeight);
}

/* ---------- intro: the loader on a first visit, the sweep on every arrival ---------- */
function intro() {
  const loader = $('.loader');
  const lift = () => requestAnimationFrame(() => requestAnimationFrame(() => sweep.classList.remove('is-covered')));
  if (!loader || reduced || store.get('seen')) {
    loader?.remove();
    return document.fonts.ready.then(lift);
  }
  store.set('seen', '1');
  lift();
  root.classList.add('is-loading');
  const n = $('.loader__n'), fill = $('.loader__bar i'), total = 77962, t0 = performance.now(), dur = 1500;
  const counted = new Promise(done => {
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = Math.round(e * total).toLocaleString('en-US');
      fill.style.transform = `scaleX(${e})`;
      p < 1 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });
  return Promise.all([counted, document.fonts.ready]).then(() => {
    // the counter turns into rows and streams off to the right as the page arrives behind it
    const field = rowField(loader, n, textPaint(n));
    const out = performance.now();
    if (field.build()) {
      field.t0 = -1e6;
      const leave = now => {
        field.draw(now, clamp((now - out) / 900, 0, 1));
        if (now - out > 1100) site.frame.splice(site.frame.indexOf(leave), 1);
      };
      site.frame.push(leave);
    }
    loader.classList.add('done');
    root.classList.remove('is-loading');
    setTimeout(() => loader.remove(), 1200);
  });
}

addEventListener('resize', measure);
addEventListener('load', measure);
addEventListener('DOMContentLoaded', () => {
  measure();
  requestAnimationFrame(loop);
  intro().then(() => {
    measure();
    root.classList.add('ready');
    for (const f of site.ready) f();
    // pinned sections only get their real heights now, so the browser's own jump to #hash landed short
    const target = location.hash && $(location.hash);
    if (target) lenis ? lenis.scrollTo(target, { immediate: true }) : target.scrollIntoView();
    // section labels, "(04) — Independent work", decode like data as they arrive
    const decode = new Set(reduced ? [] : $$('main .label').filter(el => !el.children.length && /^\(\d+\)/.test(el.textContent.trim())));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(count);
      if (decode.has(e.target)) scramble(e.target);
      io.unobserve(e.target);
    }), { threshold: 0.25 });
    [...$$('[data-split], [data-reveal], .card, .stat'), ...decode].forEach(el => io.observe(el));
  });
});
