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

  // render all sections
  const sections = [
    ['data/news.json',         renderNews],
    ['data/group.json',        renderGroup],
    ['data/publications.json', renderPubs],
    ['data/teaching.json',     renderTeaching],
    ['data/service.json',      renderService],
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

// ── Publications ── rendered by js/pubs.js (shared with the lab page)

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
