// The home page: hero streams, pinned evidence and method, stacked cards,
// marquees and the email bookend. Runs on site.js's loop.
const stacked = matchMedia('(min-width: 901px)');
const wide = matchMedia('(min-width: 761px)');

/* ---------- generated viz ---------- */
// rank cells by a fixed hash: the wrong ones scatter, but the same way on every visit
const hash = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
const rank = [];
Array.from({ length: 100 }, (_, i) => i).sort((a, b) => hash(a) - hash(b)).forEach((cell, r) => { rank[cell] = r; });
$$('[data-grid]').forEach(g => {
  const bad = +g.dataset.grid;
  g.innerHTML = rank.map(d => `<span class="${d < bad ? 'bad' : ''}" style="--d:${d}"></span>`).join('');
});

/* ---------- hero: rows streaming through a reconcile gate, and the name built from rows ---------- */
const hero = $('.hero');
const canvas = $('.hero__canvas');
const ctx = canvas.getContext('2d');
const rowsOut = $('[data-rows]');
const name = $('.hero__name');
const nameRows = rowField(hero, name, textPaint(name));
const ptr = { x: -1e4, y: -1e4 };
let cw = 0, ch = 0, gate = 0, lanes = [], crossed = 0;

const newRow = x => ({ x, len: 2 + Math.random() * 26, bad: Math.random() < 0.12 });
function sizeHero() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cw = canvas.clientWidth; ch = canvas.clientHeight;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gate = cw * 0.64;
  const gap = cw < 760 ? 22 : 15;
  lanes = Array.from({ length: Math.floor(ch / gap) }, (_, i) => {
    const rows = [];
    for (let x = Math.random() * 120 - 120; x < cw; x += 30 + Math.random() * 140) rows.push(newRow(x));
    return { y: gap * (i + 0.5), speed: 0.35 + Math.random() * 1.5, rows };
  });
}
hero.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
});
hero.addEventListener('pointerleave', () => { ptr.x = ptr.y = -1e4; });

function drawLanes(dt) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = AC;
  ctx.globalAlpha = 0.5;
  for (let gy = 80; gy < ch; gy += 9) ctx.fillRect(gate, gy, 1, 4);
  for (const lane of lanes) {
    for (const r of lane.rows) {
      const was = r.x;
      r.x += lane.speed * dt;
      if (was < gate && r.x >= gate) crossed++;
      if (r.x > cw + 30) { r.x = -r.len - Math.random() * 120; r.bad = Math.random() < 0.12; }
      // rows part around the pointer like a lens
      const dx = r.x + r.len / 2 - ptr.x, dy = lane.y - ptr.y, d = Math.hypot(dx, dy);
      const push = d < 160 ? (1 - d / 160) ** 2 * 46 * (dy < 0 ? -1 : 1) : 0;
      const wrong = r.bad && r.x + r.len < gate;
      ctx.globalAlpha = wrong ? 0.9 : 0.2;
      ctx.fillStyle = wrong ? AC : FG;
      ctx.fillRect(r.x, lane.y + push - 1, r.len, wrong ? 3 : 2);
    }
  }
  ctx.globalAlpha = 1;
  rowsOut.textContent = (crossed + nameRows.settled).toLocaleString('en-US');
}

/* ---------- pinned horizontal numbers ---------- */
const numbers = $('.numbers');
const track = $('.numbers__track');
const nbar = $('.numbers__bar i');
let hDist = 0, hTop = 0;
function sizeNumbers() {
  if (!wide.matches) { numbers.style.height = ''; track.style.transform = ''; hDist = 0; return; }
  hDist = Math.max(0, track.scrollWidth + track.offsetLeft * 2 - innerWidth);
  numbers.style.height = (innerHeight + hDist) + 'px';
  hTop = numbers.offsetTop;
}

/* ---------- pinned method text, lit word by word ---------- */
const method = $('.method');
const methodNote = $('.method__note');
const methodScrub = { el: $('[data-scrub="pin"]'), words: $$('[data-scrub="pin"] .w'), lit: -1 };

/* ---------- marquees, cards, career line, the stack's pipeline ---------- */
const cards = $$('.card');
const log = $('.log');
const pipe = $('.pipe');
let flow = 0;
const marquees = $$('.marquee__inner').map((el, i) => {
  el.innerHTML += el.innerHTML; // two copies, so wrapping at half the width is seamless
  return { el, x: 0, dir: i % 2 ? 1 : -1, half: 0 };
});

/* ---------- the email at the bottom assembles from rows when you reach it ---------- */
const contact = $('.contact');
const mail = $('.contact__mail');
const mailRows = rowField(contact, mail, textPaint(mail));

function watch(el, fn) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fn(); io.disconnect(); } }, { threshold: 0.35 });
  io.observe(el);
}

site.measure.push(() => {
  sizeHero();
  sizeNumbers();
  marquees.forEach(mq => { mq.half = mq.el.scrollWidth / 2; });
  if (nameRows.ok) nameRows.build();
  if (mailRows.ok) mailRows.build();
  if (reduced) drawLanes(0);
});

site.ready.push(() => {
  if (nameRows.build()) nameRows.start();
  if (mailRows.build()) watch(contact, () => mailRows.start());
});

site.frame.push((now, dt, y, v) => {
  // reads first, then writes, so the frame lays out once
  const covers = cards.map((card, i) => {
    if (!stacked.matches || i === cards.length - 1) return 0;
    const a = card.getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
    return clamp(1 - (b.top - a.top) / a.height, 0, 1);
  });
  const mr = method.getBoundingClientRect();
  const lr = log.getBoundingClientRect();
  const mailOn = mailRows.ok && mailRows.visible();
  const pr = pipe.getBoundingClientRect();
  const pipeOn = pr.bottom > 0 && pr.top < innerHeight;

  if (hDist) {
    const p = clamp((y - hTop) / hDist, 0, 1);
    track.style.transform = `translate3d(${-p * hDist}px,0,0)`;
    nbar.style.transform = `scaleX(${p})`;
  }
  covers.forEach((p, i) => setVar(cards[i], '--cover', p.toFixed(3)));
  const mp = clamp(-mr.top / (mr.height - innerHeight), 0, 1);
  scrubTo(methodScrub, mp / 0.7);
  methodNote.classList.toggle('in', mp > 0.78);
  setVar(log, '--draw', clamp((innerHeight * 0.75 - lr.top) / lr.height, 0, 1).toFixed(3));

  if (reduced) return;
  for (const mq of marquees) {
    mq.x += (0.7 + Math.abs(v) * 0.3) * mq.dir * (v < -0.3 ? -1 : 1) * dt;
    if (mq.x <= -mq.half) mq.x += mq.half;
    else if (mq.x > 0) mq.x -= mq.half;
    mq.el.style.transform = `translate3d(${mq.x}px,0,0)`;
  }
  // packets run faster while you scroll; 120 is the packet pattern's length, so wrapping is seamless
  if (pipeOn) {
    flow = (flow + (1.2 + Math.abs(v) * 0.6) * dt) % 120;
    pipe.style.setProperty('--flow', flow.toFixed(1) + 'px');
  }
  if (y < ch) {
    drawLanes(dt);
    if (nameRows.ok) nameRows.draw(now, clamp(y / ch, 0, 1));
  }
  if (mailOn) mailRows.draw(now);
});
