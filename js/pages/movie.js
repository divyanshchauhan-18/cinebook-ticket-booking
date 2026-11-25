import { api } from '../api.js';
import { renderNavbar, showLoading, showEmpty, showError } from '../ui.js';
import { escapeHTML, posterHTML, formatMoney, formatDate, formatTime, dayKey } from '../utils.js';

renderNavbar();

const id = new URLSearchParams(location.search).get('id');
const detail = document.querySelector('#movieDetail');
const chips = document.querySelector('#dateChips');
const list = document.querySelector('#showList');
const citySel = document.querySelector('#city');
let shows = [];
let activeDay = null;

async function loadMovie() {
  if (!id) return showError(detail, 'No movie selected.');
  showLoading(detail, 'Loading movie...');
  try {
    const { data: m } = await api(`/movies/${encodeURIComponent(id)}`);
    document.title = `${m.title} | CineBook`;
    detail.innerHTML = `
      <div class="movie-detail">
        ${posterHTML(m)}
        <div>
          <h1>${escapeHTML(m.title)}</h1>
          <div class="facts">
            <span class="badge ${escapeHTML(m.status)}">${escapeHTML(m.status.replace('-', ' '))}</span>
            <span class="badge">${escapeHTML(m.certificate)}</span>
            <span class="badge">${m.duration} min</span>
            <span class="badge">${escapeHTML(m.language)}</span>
            ${m.genres.map((g) => `<span class="badge">${escapeHTML(g)}</span>`).join('')}
          </div>
          <p>${escapeHTML(m.description)}</p>
          ${m.director ? `<p><strong>Director:</strong> ${escapeHTML(m.director)}</p>` : ''}
          ${m.cast.length ? `<p><strong>Cast:</strong> ${m.cast.map(escapeHTML).join(', ')}</p>` : ''}
          <p class="muted">Release: ${formatDate(m.releaseDate)}</p>
        </div>
      </div>`;
    loadCities();
    loadShows();
  } catch (e) {
    showError(detail, e.message);
    document.querySelector('[aria-labelledby="showsHeading"]').classList.add('hidden');
  }
}

async function loadCities() {
  try {
    const { data } = await api('/theatres/cities');
    data.forEach((c) => citySel.insertAdjacentHTML('beforeend', `<option>${escapeHTML(c)}</option>`));
  } catch (e) { /* optional */ }
}

async function loadShows() {
  showLoading(list, 'Finding showtimes...');
  chips.innerHTML = '';
  try {
    const q = new URLSearchParams({ movie: id, limit: 100 });
    if (citySel.value) q.set('city', citySel.value);
    ({ data: shows } = await api(`/shows?${q}`));
    if (!shows.length) { showEmpty(list, 'No upcoming shows for this movie yet. Check back soon.'); return; }
    const days = [...new Set(shows.map((s) => dayKey(s.startTime)))];
    if (!days.includes(activeDay)) [activeDay] = days;
    renderChips(days);
    renderShows();
  } catch (e) {
    showError(list, e.message);
  }
}

function renderChips(days) {
  chips.innerHTML = days.map((d) => {
    const dt = new Date(`${d}T12:00:00`);
    return `<button class="chip" role="tab" data-day="${d}" aria-selected="${d === activeDay}">
      <strong>${dt.toLocaleDateString('en-IN', { day: 'numeric' })}</strong><br>
      <small>${dt.toLocaleDateString('en-IN', { weekday: 'short', month: 'short' })}</small></button>`;
  }).join('');
}

function renderShows() {
  const today = shows.filter((s) => dayKey(s.startTime) === activeDay);
  const byTheatre = new Map();
  today.forEach((s) => {
    const key = s.theatre._id;
    if (!byTheatre.has(key)) byTheatre.set(key, { theatre: s.theatre, items: [] });
    byTheatre.get(key).items.push(s);
  });
  list.innerHTML = [...byTheatre.values()].map(({ theatre, items }) => `
    <div class="theatre-block">
      <h3 style="margin:0">${escapeHTML(theatre.name)}</h3>
      <span class="muted">${escapeHTML(theatre.address || theatre.city)}</span>
      <div class="showtimes">
        ${items.map((s) => {
          const cls = s.seatsLeft === 0 ? 'full' : s.seatsLeft <= 10 ? 'low' : '';
          const label = s.seatsLeft === 0 ? 'Sold out' : `${formatMoney(s.price)} &bull; ${s.seatsLeft} left`;
          return `<a class="showtime ${cls}" href="booking.html?show=${encodeURIComponent(s._id)}" ${s.seatsLeft === 0 ? 'aria-disabled="true" tabindex="-1"' : ''}>
            ${formatTime(s.startTime)}<small>${label}</small></a>`;
        }).join('')}
      </div>
    </div>`).join('');
}

chips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeDay = chip.dataset.day;
  chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', String(c === chip)));
  renderShows();
});
citySel.addEventListener('change', loadShows);

loadMovie();
