// ── Helpers ────────────────────────────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function load(path) { return fetch(path).then(r => r.json()); }

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // abstract toggles (delegated — works on dynamic content)
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle]');
    if (!btn) return;
    const target = document.getElementById(btn.dataset.toggle);
    if (!target) return;
    const open = target.classList.toggle('open');
    btn.textContent = open ? 'hide abstract' : 'abstract';
  });

  // render all sections
  const sections = [
    ['data/news.json',         renderNews],
    ['data/group.json',        renderGroup],
    ['data/publications.json', renderPubs],
    ['data/teaching.json',     renderTeaching],
    ['data/service.json',      renderService],
    ['data/sponsor.json',      renderSponsor],
    ['data/misc.json',         renderMisc],
  ];
  sections.forEach(([path, fn]) =>
    load(path).then(fn).catch(e => console.error(`Failed to load ${path}:`, e))
  );

  // active nav highlight
  const navSections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => {
          a.style.color = a.getAttribute('href') === '#' + entry.target.id
            ? 'var(--accent)' : '';
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  navSections.forEach(s => observer.observe(s));
});

// ── News ───────────────────────────────────────────────────
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

// ── Group ──────────────────────────────────────────────────
// Schema: { name, photo?, role?, year_start?, year_end?, website? }
function renderGroup(members) {
  const el = document.getElementById('group-grid');
  if (!el) return;
  el.innerHTML = members.map(m => {
    const photo = m.photo
      ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}">`
      : `<div class="group-photo-placeholder"></div>`;
    const nameTag = m.website
      ? `<a href="${esc(m.website)}" target="_blank"><strong>${esc(m.name)}</strong></a>`
      : `<strong>${esc(m.name)}</strong>`;
    const years = m.year_start
      ? `${m.year_start}–${m.year_end || ''}`
      : '';
    const role = [m.role, years].filter(Boolean).join(' · ');
    return `
<div class="group-card">
  ${photo}
  <div class="member-name">${nameTag}</div>
  ${role ? `<div class="member-role">${esc(role)}</div>` : ''}
</div>`;
  }).join('');
}

// ── Publications ───────────────────────────────────────────
// Schema: { id, title, authors:[{name,self?}], venue, year,
//           thumb?, paper?, bibtex?, code?, slides?, project?,
//           award?, note?, abstract?, topics? }
function renderPubs(pubs) {
  const el = document.getElementById('pub-list');
  if (!el) return;

  // collect ordered unique topics
  const allTopics = [];
  pubs.forEach(p => (p.topics || []).forEach(t => {
    if (!allTopics.includes(t)) allTopics.push(t);
  }));

  // render filter bar
  const filterBar = document.getElementById('pub-filter');
  if (filterBar && allTopics.length) {
    filterBar.innerHTML =
      `<button class="topic-chip active" data-topic="all">All</button>` +
      allTopics.map(t => `<button class="topic-chip" data-topic="${esc(t)}">${esc(t)}</button>`).join('');

    let active = 'all';
    filterBar.addEventListener('click', e => {
      const chip = e.target.closest('.topic-chip');
      if (!chip) return;
      active = chip.dataset.topic;
      filterBar.querySelectorAll('.topic-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.topic === active)
      );
      el.querySelectorAll('.pub-row').forEach(row => {
        const topics = (row.dataset.topics || '').split('|');
        row.style.display = (active === 'all' || topics.includes(active)) ? '' : 'none';
      });
    });
  }

  el.innerHTML = pubs.map(p => {
    const authors = p.authors.map(a =>
      a.self ? `<strong>${esc(a.name)}</strong>` : esc(a.name)
    ).join(', ');

    const venueStr = p.award
      ? `<em>${esc(p.venue)}</em>, ${p.year}. <span class="award">🏆 ${esc(p.award)}</span>`
      : `<em>${esc(p.venue)}</em>, ${p.year}.${p.note ? ' <span class="pub-note">' + esc(p.note) + '</span>' : ''}`;

    const links = [];
    if (p.abstract) links.push(`<button data-toggle="abs-${p.id}">abstract</button>`);
    if (p.bibtex)   links.push(`<a href="${esc(p.bibtex)}">bibtex</a>`);
    if (p.slides)   links.push(`<a href="${esc(p.slides)}">slides</a>`);
    if (p.code)     links.push(`<a href="${esc(p.code)}" target="_blank">code</a>`);
    if (p.project)  links.push(`<a href="${esc(p.project)}" target="_blank">project page</a>`);

    const titleTag = p.paper
      ? `<a class="pub-title" href="${esc(p.paper)}" target="_blank">${esc(p.title)}</a>`
      : `<span class="pub-title" style="color:var(--text)">${esc(p.title)}</span>`;

    const thumb = p.thumb
      ? `<a href="${esc(p.thumb)}" target="_blank"><img class="pub-thumb" src="${esc(p.thumb)}" alt="${esc(p.title)}"></a>`
      : `<div class="pub-thumb-placeholder"></div>`;

    const topicsAttr = (p.topics || []).join('|');

    return `
<div class="pub-row" data-topics="${esc(topicsAttr)}">
  ${thumb}
  <div class="pub-info">
    ${titleTag}
    <div class="pub-authors">${authors}.</div>
    <div class="pub-venue">${venueStr}</div>
    ${links.length ? `<div class="pub-links">${links.join('')}</div>` : ''}
    ${p.abstract ? `<div class="pub-abstract" id="abs-${p.id}">${esc(p.abstract)}</div>` : ''}
  </div>
</div>`;
  }).join('');
}

// ── Teaching ───────────────────────────────────────────────
// // Schema: { code?, title, institution?, terms? }
// function renderTeaching(courses) {
//   const el = document.getElementById('teaching-list');
//   if (!el) return;
//   el.innerHTML = courses.map(c => {
//     const parts = [];
//     if (c.code)        parts.push(`<strong>${esc(c.code)}</strong>`);
//     parts.push(esc(c.title));
//     if (c.institution) parts.push(esc(c.institution));
//     if (c.terms && c.terms.length) parts.push(c.terms.map(esc).join(', '));
//     return `<li>${parts.join(' · ')}</li>`;
//   }).join('');
// }


// Schema: { code?, title, institution?, terms? }
function renderTeaching(courses) {
  const el = document.getElementById('teaching-list');
  if (!el) return;

  const groups = new Map();

  courses.forEach(c => {
    const institution = c.institution || 'Other';
    if (!groups.has(institution)) groups.set(institution, []);
    groups.get(institution).push(c);
  });

  el.innerHTML = [...groups.entries()].map(([institution, items]) => {
    return `
      <li class="teaching-group">
        <div class="teaching-institution">${esc(institution)}</div>

        <div class="teaching-courses">
          ${items.map(c => `
            <div class="teaching-row">
              <div class="teaching-course">
                ${c.code ? `<strong>${esc(c.code)}</strong> · ` : ''}
                ${esc(c.title || '')}
              </div>

              <div class="teaching-term">
                ${c.terms && c.terms.length ? c.terms.map(esc).join(', ') : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </li>
    `;
  }).join('');
}


// ── Service ────────────────────────────────────────────────
// Schema: { program_committee?:[], reviewer?:[], volunteer?:[], [custom_key]:[] }
function renderService(data) {
  const el = document.getElementById('service-content');
  if (!el) return;
  const labels = {
    program_committee: 'Program Committee',
    reviewer: 'Reviewer',
    volunteer: 'Student Volunteer'
  };
  el.innerHTML = Object.entries(data).map(([key, items]) => {
    if (!items || !items.length) return '';
    const label = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const lis = items.map(i => `<li>${esc(i)}</li>`).join('');
    return `
<div class="service-block">
  <h3>${esc(label)}</h3>
  <ul>${lis}</ul>
</div>`;
  }).join('');
}

// ── Sponsor ────────────────────────────────────────────────
// Schema: { name, logo, url? }
function renderSponsor(sponsors) {
  const el = document.getElementById('sponsor-grid');
  if (!el) return;
  el.innerHTML = sponsors.map(s => {
    const img = `<img src="${esc(s.logo)}" alt="${esc(s.name)}">`;
    const wrapped = s.url
      ? `<a href="${esc(s.url)}" target="_blank">${img}</a>`
      : img;
    return `<div class="sponsor-grid-item"><div class="sponsor-img">${wrapped}</div></div>`;
  }).join('');
}

// ── Misc ───────────────────────────────────────────────────
// Schema: { title, subtitle?, year?, image?, link? }
function renderMisc(items) {
  const el = document.getElementById('misc-grid');
  if (!el) return;
  el.innerHTML = items.map(m => {
    const img = m.image
      ? `<div class="misc-card-img"><img src="${esc(m.image)}" alt="${esc(m.title)}"></div>`
      : '';
    const sub = [m.subtitle, m.year].filter(Boolean).join(' · ');
    return `
<div class="misc-card">
  ${img}
  <div class="misc-title">${esc(m.title)}</div>
  ${sub ? `<div class="misc-sub">${esc(sub)}</div>` : ''}
</div>`;
  }).join('');
}
