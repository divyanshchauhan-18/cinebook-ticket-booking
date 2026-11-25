import { api } from '../api.js';
import { renderNavbar, showLoading, showEmpty, showError, renderPagination } from '../ui.js';
import { escapeHTML, debounce, posterHTML, posterSrc } from '../utils.js';

renderNavbar();

const grid = document.querySelector('#movieGrid');
const pager = document.querySelector('#pagination');
const state = { page: 1, search: '', genre: '', language: '', status: 'now-showing', sort: '-releaseDate' };

/* ---------- featured slider ---------- */
async function loadHero() {
  const hero = document.querySelector('#hero');
  try {
    const { data } = await api('/movies?status=now-showing&limit=5&sort=-releaseDate');
    if (!data.length) return;
    const slides = data.filter((m) => m.posterUrl);
    if (!slides.length) return;
    hero.innerHTML = `
      ${slides.map((m, i) => `
        <div class="slide ${i === 0 ? 'active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}">
          <img class="bg" src="${escapeHTML(posterSrc(m.posterUrl))}" alt="">
          <div class="slide-inner">
            <div class="slide-text">
              <div class="slide-meta">
                <span class="badge">${escapeHTML(m.certificate)}</span>
                <span class="badge">${m.duration} min</span>
                <span class="badge">${escapeHTML(m.language)}</span>
                ${m.genres.slice(0, 2).map((g) => `<span class="badge">${escapeHTML(g)}</span>`).join('')}
              </div>
              <h1>${escapeHTML(m.title)}</h1>
              <p>${escapeHTML(m.description)}</p>
              <a class="btn" href="pages/movie.html?id=${encodeURIComponent(m._id)}">Book tickets</a>
            </div>
            <div class="slide-poster"><img src="${escapeHTML(posterSrc(m.posterUrl))}" alt="Poster of ${escapeHTML(m.title)}"></div>
          </div>
        </div>`).join('')}
      <button class="slide-arrow prev" aria-label="Previous movie">&#8249;</button>
      <button class="slide-arrow next" aria-label="Next movie">&#8250;</button>
      <div class="slide-dots">${slides.map((m, i) => `<button aria-label="Show ${escapeHTML(m.title)}" aria-current="${i === 0}" data-i="${i}"></button>`).join('')}</div>`;

    const els = [...hero.querySelectorAll('.slide')];
    const dots = [...hero.querySelectorAll('.slide-dots button')];
    let cur = 0;
    let timer;
    const show = (i) => {
      cur = (i + els.length) % els.length;
      els.forEach((s, n) => s.classList.toggle('active', n === cur));
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === cur)));
    };
    const start = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      clearInterval(timer);
      timer = setInterval(() => show(cur + 1), 5000);
    };
    hero.querySelector('.prev').addEventListener('click', () => { show(cur - 1); start(); });
    hero.querySelector('.next').addEventListener('click', () => { show(cur + 1); start(); });
    dots.forEach((d) => d.addEventListener('click', () => { show(Number(d.dataset.i)); start(); }));
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', start);
    start();
  } catch (e) { /* keep the static intro if loading fails */ }
}

/* ---------- filters + grid ---------- */
async function loadFilters() {
  try {
    const { data } = await api('/movies/filters');
    const fill = (id, items) => {
      const sel = document.querySelector(id);
      items.forEach((v) => sel.insertAdjacentHTML('beforeend', `<option>${escapeHTML(v)}</option>`));
    };
    fill('#genre', data.genres);
    fill('#language', data.languages);
  } catch (e) { /* filters are optional */ }
}

async function loadMovies() {
  showLoading(grid, 'Loading movies...');
  try {
    const q = new URLSearchParams({ page: state.page, limit: 12, sort: state.sort });
    ['search', 'genre', 'language', 'status'].forEach((k) => { if (state[k]) q.set(k, state[k]); });
    const { data, pagination } = await api(`/movies?${q}`);
    if (!data.length) {
      showEmpty(grid, 'No movies match those filters. Try clearing the search.');
      pager.innerHTML = '';
      return;
    }
    grid.innerHTML = data.map((m) => `
      <a class="movie-card" href="pages/movie.html?id=${encodeURIComponent(m._id)}">
        <div class="poster-wrap" style="position:relative">
          <span class="cert">${escapeHTML(m.certificate)}</span><span class="runtime">${m.duration} min</span>
          ${posterHTML(m)}
        </div>
        <div class="meta">
          <h3>${escapeHTML(m.title)}</h3>
          <div class="genres">${m.genres.map((g) => `<span>${escapeHTML(g)}</span>`).join('')}</div>
          <span class="sub">${escapeHTML(m.language)}${m.status === 'upcoming' ? ' &bull; Coming soon' : ''}</span>
        </div>
        <span class="book">${m.status === 'upcoming' ? 'View details' : 'Book tickets'}</span>
      </a>`).join('');
    renderPagination(pager, pagination, (p) => { state.page = p; loadMovies(); document.querySelector('#statusTabs').scrollIntoView({ behavior: 'smooth' }); });
  } catch (e) {
    showError(grid, e.message);
  }
}

document.querySelector('#search').addEventListener('input', debounce((e) => {
  state.search = e.target.value.trim(); state.page = 1; loadMovies();
}, 400));
['genre', 'language', 'sort'].forEach((k) =>
  document.querySelector(`#${k}`).addEventListener('change', (e) => { state[k] = e.target.value; state.page = 1; loadMovies(); }));
document.querySelector('#statusTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('#statusTabs .tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
  state.status = tab.dataset.status; state.page = 1; loadMovies();
});

loadHero();
loadFilters();
loadMovies();
