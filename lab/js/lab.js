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

  load('../data/news.json').then(renderNews)
    .catch(e => console.error('Failed to load news:', e));

  // research needs the shared publication list to resolve paper ids
  Promise.all([load('data/research.json'), load('../data/publications.json')])
    .then(([research, pubs]) => {
      renderWelcome(research);
      renderResearch(research, pubs);
    })
    .catch(e => console.error('Failed to load research:', e));

  load('data/people.json').then(renderPeople)
    .catch(e => console.error('Failed to load people:', e));

  load('data/join.json').then(renderJoin)
    .catch(e => console.error('Failed to load join:', e));

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
// Schema: research.json { vision }
function renderWelcome(r) {
  const el = document.getElementById('lab-vision');
  if (el) el.innerHTML = esc(r.vision);
}

// ── Research ───────────────────────────────────────────────
// Schema: research.json { thrusts:[{title, summary, pubs:[id]}] }
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
    <span class="thrust-num">${i + 1}</span>
    <h3>${esc(t.title)}</h3>
  </div>
  <p class="thrust-summary">${esc(t.summary)}</p>
  <div class="paper-grid">${lookup(t.pubs).map(paperCard).join('')}</div>
</div>`).join('');

  el.innerHTML = thrusts;
}

// ── People ─────────────────────────────────────────────────
// Schema: people.json { members:[{name, photo?, role?, website?}] }
// Photo paths are relative to lab/. Members appear in list order.
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
<div class="group-card">
  ${photo}
  <div class="member-name">${nameTag}</div>
  ${m.role ? `<div class="member-role">${esc(m.role)}</div>` : ''}
</div>`;
  };

  const joinCard = `
<a class="group-card join-card" href="#join">
  <div class="group-photo-placeholder"><i class="fa-solid fa-plus"></i></div>
  <div class="member-name">This could be you</div>
  <div class="member-role">Join Us →</div>
</a>`;

  el.innerHTML = `<div class="group-grid">${(data.members || []).map(card).join('')}${joinCard}</div>`;
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
