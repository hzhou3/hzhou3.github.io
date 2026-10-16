// ── Publications (shared by index.html and hai/publications.html) ──
// Needs esc() from the page's main script.
// Schema: { id, title, authors:[{name,self?}], venue, year,
//           thumb?, paper?, bibtex?, code?, slides?, project?,
//           award?, note?, abstract?, topics? }
// `resolve` maps site-root-relative paths for pages outside the root
// (the lab page passes rootPath); external URLs pass through unchanged.

// abstract toggles (delegated — works on dynamic content)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-toggle]');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.toggle);
  if (!target) return;
  const open = target.classList.toggle('open');
  btn.textContent = open ? 'hide abstract' : 'abstract';
});

function renderPubs(pubs, resolve = p => p) {
  const el = document.getElementById('pub-list');
  if (!el) return;
  const url = p => esc(resolve(p));

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
    if (p.bibtex)   links.push(`<a href="${url(p.bibtex)}">bibtex</a>`);
    if (p.slides)   links.push(`<a href="${url(p.slides)}">slides</a>`);
    if (p.code)     links.push(`<a href="${url(p.code)}" target="_blank">code</a>`);
    if (p.project)  links.push(`<a href="${url(p.project)}" target="_blank">project page</a>`);

    const titleTag = p.paper
      ? `<a class="pub-title" href="${url(p.paper)}" target="_blank">${esc(p.title)}</a>`
      : `<span class="pub-title" style="color:var(--text)">${esc(p.title)}</span>`;

    const thumb = p.thumb
      ? `<a href="${url(p.thumb)}" target="_blank"><img class="pub-thumb" src="${url(p.thumb)}" alt="${esc(p.title)}"></a>`
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
