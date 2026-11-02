// Case-study pages: the title in rows, and pinned stories that advance a chart
// one step per screen of scroll. Charts are plain markup; a step only toggles
// `.shown` / `.is-now` on whatever carries a matching data-at.
const caseHero = $('.case-hero');
const title = $('.case-hero__title');
const titleRows = rowField(caseHero, title, textPaint(title));
site.measure.push(() => { if (titleRows.ok) titleRows.build(); });
site.ready.push(() => { if (titleRows.build()) titleRows.start(); });

// "$4,304" → { pre: '$', n: 4304, dec: 0, comma: true, post: '' }
const parse = s => {
  const m = /^([^\d]*?)(\d[\d,]*\.?\d*)(.*)$/.exec(s || '');
  return m && { pre: m[1], n: +m[2].replace(/,/g, ''), dec: decimals(m[2]), comma: m[2].includes(','), post: m[3] };
};
const stories = $$('.story').map(el => {
  const steps = $$('.story__steps > li', el);
  el.style.setProperty('--n', steps.length);
  return {
    el, steps, step: -1,
    parts: $$('[data-at]', el),
    readout: $('[data-readout]', el),
    caption: $('[data-caption]', el),
    values: (el.dataset.values || '').split('|'),
    captions: (el.dataset.captions || '').split('|'),
  };
});

function setStep(s, k) {
  if (k === s.step) return;
  const a = parse(s.values[s.step]), b = parse(s.values[k]);
  s.step = k;
  s.el.dataset.step = k;
  s.steps.forEach((li, i) => { li.classList.toggle('on', i === k); li.classList.toggle('past', i < k); });
  s.parts.forEach(p => { const at = +p.dataset.at; p.classList.toggle('shown', at <= k); p.classList.toggle('is-now', at === k); });
  if (s.caption) s.caption.textContent = s.captions[k] || '';
  if (!s.readout) return;
  // a number that changes counts its way there; anything else is just swapped
  if (a && b && a.pre === b.pre) {
    const span = document.createElement('span');
    s.readout.replaceChildren(b.pre, span, b.post);
    span.textContent = a.n.toFixed(b.dec);
    tween(span, a.n, b.n, b.dec, b.comma, 700);
    if (reduced) span.textContent = s.values[k].slice(b.pre.length, s.values[k].length - b.post.length);
  } else s.readout.textContent = s.values[k];
}

site.frame.push(() => {
  for (const s of stories) {
    const r = s.el.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight), 0, 0.999);
    setStep(s, Math.floor(p * s.steps.length));
  }
  if (titleRows.ok && titleRows.visible()) titleRows.draw(performance.now(), clamp(scrollY / caseHero.offsetHeight, 0, 1));
});
