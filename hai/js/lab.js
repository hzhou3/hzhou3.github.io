// ── Helpers (same as js/main.js) ───────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function load(path) { return fetch(path).then(r => r.json()); }

// paths in the shared root data/ are relative to the site root
function rootPath(p) {
  if (!p || /^(https?:)?\/\//.test(p) || p.startsWith('/')) return p;
  return '../' + p;
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // publications.html: only the shared publication list (renderPubs in ../js/pubs.js)
  if (document.getElementById('pub-list')) {
    load('../data/publications.json').then(pubs => renderPubs(pubs, rootPath))
      .catch(e => console.error('Failed to load publications:', e));
    return;
  }

  load('../data/news.json').then(renderNews)
    .catch(e => console.error('Failed to load news:', e));

  // research needs the shared publication list to resolve paper ids
  Promise.all([load('data/research.json'), load('../data/publications.json')])
    .then(([research, pubs]) => {
      renderWelcome(research);
      renderResearch(research, pubs);
    })
    .catch(e => console.error('Failed to load research:', e));

  Promise.all([load('data/photos.json'), load('data/media.json')])
    .then(([photos, media]) => renderHighlights(photos, media))
    .catch(e => console.error('Failed to load highlights:', e));

  load('data/people.json').then(renderPeople)
    .catch(e => console.error('Failed to load people:', e));

  load('data/join.json').then(renderJoin)
    .catch(e => console.error('Failed to load join:', e));

  load('../data/sponsor.json').then(renderSponsor)
    .catch(e => console.error('Failed to load sponsors:', e));

  // active nav highlight
  const navSections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a =>
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id)
        );
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  navSections.forEach(s => observer.observe(s));
});

// ── News (same schema as the personal site) ────────────────
// Schema: { date, text, bold?, link?: {label, url} }
function renderNews(items) {
  const el = document.getElementById('news-list');
  if (!el) return;
  el.innerHTML = items.map(n => {
    let text = esc(n.text);
    if (n.bold) text = text.replace(esc(n.bold), `<strong>${esc(n.bold)}</strong>`);
    if (n.link) text += ` <a href="${esc(n.link.url)}" target="_blank">${esc(n.link.label)}</a>`;
    return `<li><span class="news-date">${esc(n.date)}</span><span>${text}</span></li>`;
  }).join('');
}

// ── Welcome ────────────────────────────────────────────────
// Schema: research.json { vision?, why?:[{title, role, icon?, text, tags?:[{icon, label}]}], cycle?:[fwd, back],
//   context?:{icon, label, factors?:[{icon, label, arc: top|bottom, pos: 0..1}]}, whyStyle? }
// Two "why" entries + cycle labels render as a loop: card 1 ⇄ card 2.
// context draws a frame around the loop (the cycle happens within people's environments);
// each factor is an icon placed on the dashed loop, pos = fraction along the arc (left → right).
// Placement logic: the top arc (learning → building) carries the physical conditions that shape
// the signals we sense; the bottom arc (deployment → new needs) carries the settings systems
// are deployed into, leaving from "Building" (right) and returning to "Learning" (left).
// whyStyle picks the design: "v1" (tinted cards, arrows between) or "v2" (white cards
// joined by looping arcs). Preview the other one with ?why=v1 or ?why=v2 in the URL.
function renderWelcome(r) {
  const el = document.getElementById('lab-vision');
  if (!el) return;
  const style = new URLSearchParams(location.search).get('why') || r.whyStyle || 'v1';
  const icon = c => c.icon ? `<i class="${esc(c.icon)}" aria-hidden="true"></i>` : '';
  let html = r.vision ? `<p class="lab-vision-text">${esc(r.vision)}</p>` : '';
  const card = w =>
    `<div class="why-card"><div class="why-head">` +
    (w.icon ? `<span class="why-icon">${icon(w)}</span>` : '') +
    `<div><span class="lab-why-role">${esc(w.role)}</span>` +
    `<strong class="lab-why-title">${esc(w.title)}</strong></div></div>` +
    `<span class="lab-why-text">${esc(w.text)}</span>` +
    (w.tags && w.tags.length ? `<div class="why-tags">` +
      w.tags.map(t => `<span class="why-tag">${icon(t)}${esc(t.label)}</span>`).join('') + `</div>` : '') +
    `</div>`;

  // curved arrows between the cards: forward arcs over the top (left → right),
  // back arcs underneath (right → left), so together they read as a loop
  const arcArrow = dir => {
    const id = `why-ah-${dir}`;
    const d = dir === 'fwd' ? 'M6 26 Q45 -8 82 22' : 'M84 4 Q45 38 8 8';
    return `<svg class="why-arc-arrow" viewBox="0 0 90 30" aria-hidden="true">` +
      `<defs><marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">` +
      `<path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>` +
      `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" marker-end="url(#${id})"/></svg>`;
  };

  // beads sit exactly on the half-ellipse arc: x = pos, y from the ellipse equation
  const factors = (r.context && r.context.factors) || [];
  const beads = arc => factors.filter(f => f.arc === arc).map(f => {
    const x = Math.min(Math.max(+f.pos || 0, 0), 1);
    const h = Math.sqrt(Math.max(0, 1 - (2 * x - 1) ** 2));
    const y = arc === 'top' ? 1 - h : h;
    return `<span class="why-bead" ` +
      `style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%">` +
      `${icon(f)}<em>${esc(f.label)}</em></span>`;
  }).join('');

  if (r.why && r.why.length === 2 && r.cycle) {
    html += `<div class="why-cycle why-${esc(style)}">` +
      `<div class="why-arc top" aria-hidden="true"><span class="why-arc-label">${esc(r.cycle[0])}</span>${beads('top')}</div>` +
      `<div class="why-arc bottom" aria-hidden="true"><span class="why-arc-label">${esc(r.cycle[1])}</span>${beads('bottom')}</div>` +
      card(r.why[0]) +
      `<div class="why-arrows" aria-hidden="true">` +
        `<div class="why-arrow fwd"><span>${esc(r.cycle[0])}</span>${arcArrow('fwd')}</div>` +
        `<div class="why-arrow back">${arcArrow('back')}<span>${esc(r.cycle[1])}</span></div>` +
      `</div>` +
      card(r.why[1]) +
      `</div>`;
    if (r.context && style !== 'v1') {  // v1 has no environment frame
      // chip row: shown when the arcs are not (v1, phones)
      const chips = factors.length ? `<div class="why-env-factors">` +
        factors.map(f => `<span class="why-env-chip">${icon(f)}${esc(f.label)}</span>`).join('') + `</div>` : '';
      html = `<div class="why-env why-env-${esc(style)}">` +
        `<span class="why-env-label">${icon(r.context)}${esc(r.context.label)}</span>` +
        html + chips + `</div>`;
    }
  } else if (r.why && r.why.length) {
    html += `<div class="why-cycle why-${esc(style)}">${r.why.map(card).join('')}</div>`;
  }
  el.innerHTML = html;
}

// ── Research ───────────────────────────────────────────────
// Schema: research.json { thrusts:[{title, icon?, summary?, pubs:[id]}] }
// Thrusts follow the two cards (Humans as Inspiration / Humans as the Purpose).
// Paper ids refer to ../data/publications.json
function renderResearch(r, pubs) {
  const el = document.getElementById('research-content');
  if (!el) return;
  const byId = new Map(pubs.map(p => [p.id, p]));
  const lookup = ids => (ids || []).map(id => {
    const p = byId.get(id);
    if (!p) console.warn(`research.json: unknown publication id "${id}"`);
    return p;
  }).filter(Boolean);

  const paperCard = p => {
    const href = esc(rootPath(p.paper) || '');
    const thumb = p.thumb
      ? `<img src="${esc(rootPath(p.thumb))}" alt="" loading="lazy">`
      : `<div class="paper-thumb-empty"></div>`;
    const tag = p.paper ? 'a' : 'div';
    return `
<${tag} class="paper-card"${p.paper ? ` href="${href}" target="_blank"` : ''}>
  <div class="paper-thumb">${thumb}</div>
  <div class="paper-venue">${esc(p.venue)} ${esc(p.year)}${p.award ? ' · 🏆' : ''}</div>
  <div class="paper-title">${esc(p.title)}</div>
</${tag}>`;
  };

  const thrusts = (r.thrusts || []).map((t, i) => `
<div class="thrust">
  <div class="thrust-head">
    <span class="thrust-num">${t.icon ? `<i class="${esc(t.icon)}" aria-hidden="true"></i>` : i + 1}</span>
    <h3>${esc(t.title)}</h3>
  </div>
  ${t.summary ? `<p class="thrust-summary">${esc(t.summary)}</p>` : ''}
  <div class="paper-grid">${lookup(t.pubs).map(paperCard).join('')}</div>
</div>`).join('');

  el.innerHTML = thrusts;
}

// ── People ─────────────────────────────────────────────────
// Schema: people.json { members:[{name, photo?, role?, website?}] }
// Photo paths are relative to hai/. Members appear in list order.
function renderPeople(data) {
  const el = document.getElementById('people-content');
  if (!el) return;

  const card = m => {
    const photo = m.photo
      ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}">`
      : `<div class="group-photo-placeholder"><i class="fa-solid fa-user"></i></div>`;
    const nameTag = m.website
      ? `<a href="${esc(m.website)}"${/^https?:/.test(m.website) ? ' target="_blank"' : ''}><strong>${esc(m.name)}</strong></a>`
      : `<strong>${esc(m.name)}</strong>`;
    return `
<div class="group-card person-card">
  <div class="photo-img person-img">${photo}</div>
  <div class="member-name">${nameTag}</div>
  ${m.role ? `<div class="member-role">${esc(m.role)}</div>` : ''}
</div>`;
  };

  const joinCard = `
<a class="group-card person-card join-card" href="#join">
  <div class="photo-img person-img"><div class="group-photo-placeholder"><i class="fa-solid fa-plus"></i></div></div>
  <div class="member-name">This could be you</div>
  <div class="member-role">Join Us →</div>
</a>`;

  el.innerHTML = `<div class="photo-grid">${(data.members || []).map(card).join('')}${joinCard}</div>`;
}

// ── Join Us ────────────────────────────────────────────────
// Schema: join.json { roles:[{title, icon?, text, subject?}] }
function renderJoin(j) {
  const el = document.getElementById('join-content');
  if (!el) return;
  el.innerHTML = `<div class="join-grid">${(j.roles || []).map(r => `
<div class="join-role">
  <div class="join-title">${r.icon ? `<i class="${esc(r.icon)}"></i>` : ''}${esc(r.title)}</div>
  <p>${esc(r.text)}</p>
  ${r.subject ? `<div class="join-subject">Email subject: <code>${esc(r.subject)}</code></div>` : ''}
</div>`).join('')}</div>`;
}

// ── Sponsors (shared ../data/sponsor.json) ─────────────────
// Schema: { name, logo, url? } — logo paths are relative to the site root
function renderSponsor(sponsors) {
  const el = document.getElementById('sponsor-grid');
  if (!el) return;
  el.innerHTML = sponsors.map(s => {
    const img = `<img src="${esc(rootPath(s.logo))}" alt="${esc(s.name)}">`;
    const tag = s.url ? 'a' : 'div';
    return `<${tag} class="photo-img photo-img-contain sponsor-logo"${s.url ? ` href="${esc(s.url)}" target="_blank"` : ''}>${img}</${tag}>`;
  }).join('');
}

// ── Highlights ─────────────────────────────────────────────
// Awards and talks (photos.json) and press coverage (media.json) in one grid,
// newest first by year; within a year, press comes first, then list order.
// photos.json [{ image, who, what, where?, when? }]  caption "<who> <what>",
//   image opens full size
// media.json  [{ year, topic, outlet, url, image? }]  image opens the article
// Image paths are relative to hai/. Nothing in either list shows "To come."
function renderHighlights(photos, media) {
  const el = document.getElementById('highlights-grid');
  if (!el) return;

  const yearOf = v => +((String(v || '').match(/\d{4}/) || [0])[0]);
  const icon = (cls, text) => `<span><i class="${cls}"></i>${esc(text)}</span>`;

  const items = [
    ...media.map(m => ({
      year: yearOf(m.year), image: m.image, href: m.url, contain: true,
      caption: m.topic,
      meta: [icon('fa-regular fa-newspaper', m.outlet), m.year && icon('fa-regular fa-calendar', m.year)],
    })),
    ...photos.map(p => ({
      year: yearOf(p.when), image: p.image, href: p.image, contain: false,
      caption: [p.who, p.what].filter(Boolean).join(' '),
      meta: [p.where && icon('fa-solid fa-location-dot', p.where), p.when && icon('fa-regular fa-calendar', p.when)],
    })),
  ].sort((a, b) => b.year - a.year);

  if (!items.length) {
    el.outerHTML = '<p class="photos-empty">To come.</p>';
    return;
  }

  el.innerHTML = items.map(h => {
    const meta = h.meta.filter(Boolean).join('');
    return `
<figure class="photo-card">
  <a class="photo-img${h.contain ? ' photo-img-contain' : ''}" href="${esc(h.href)}" target="_blank">
    ${h.image ? `<img src="${esc(h.image)}" alt="${esc(h.caption)}" loading="lazy" onerror="this.remove()">` : ''}
  </a>
  <figcaption>
    <p class="photo-caption">${esc(h.caption)}</p>
    ${meta ? `<p class="photo-meta">${meta}</p>` : ''}
  </figcaption>
</figure>`;
  }).join('');
}
