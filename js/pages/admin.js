import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { renderNavbar, showLoading, showEmpty, showError, renderPagination, toast, confirmDialog, setBusy } from '../ui.js';
import { escapeHTML, formatMoney, formatDateTime, toLocalInput } from '../utils.js';

renderNavbar();
const panel = document.querySelector('#panel');
let current = 'overview';
const cache = {}; // id -> object, used when editing

if (requireAuth('admin')) {
  document.querySelector('#adminTabs').addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    document.querySelectorAll('#adminTabs .tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    go(t.dataset.tab);
  });
  go('overview');
}

function go(tab) {
  current = tab;
  ({ overview, movies, theatres, shows, bookings, users })[tab]();
}

/* ---------- helpers ---------- */
const table = (heads, rows) => `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const field = (name, label, type = 'text', extra = '') =>
  `<div class="field"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" ${extra}><span class="err" data-err="${name}"></span></div>`;
const select = (name, label, options, extra = '') =>
  `<div class="field"><label for="f_${name}">${label}</label><select id="f_${name}" name="${name}" ${extra}>${options.map(([v, l]) => `<option value="${escapeHTML(v)}">${escapeHTML(l)}</option>`).join('')}</select><span class="err" data-err="${name}"></span></div>`;
const formBox = (title, inner) => `<form id="adminForm" class="card" novalidate><h2 id="formTitle">${title}</h2><div class="form-error hidden" role="alert"></div>${inner}
  <div class="row"><button class="btn" type="submit">Save</button><button class="btn btn-outline" type="button" id="resetForm">Clear</button></div></form>`;

function fillForm(obj) {
  const form = document.querySelector('#adminForm');
  Object.entries(obj).forEach(([k, v]) => { const el = form.elements[k]; if (el && el.type !== 'file') el.value = v ?? ''; });
}
function showErr(form, err) {
  form.querySelectorAll('.err').forEach((x) => { x.textContent = ''; });
  const box = form.querySelector('.form-error');
  let general = err.message;
  (err.errors || []).forEach((e) => { const s = form.querySelector(`[data-err="${e.field}"]`); if (s) { s.textContent = e.msg; general = ''; } });
  box.textContent = general; box.classList.toggle('hidden', !general);
}
function bindForm(onSubmit, onReset) {
  const form = document.querySelector('#adminForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Saving...');
    try { await onSubmit(form); showErr(form, { message: '' }); } catch (err) { showErr(form, err); }
    setBusy(btn, false, 'Save');
  });
  form.querySelector('#resetForm').addEventListener('click', () => { form.reset(); form.dataset.id = ''; form.querySelector('#formTitle').textContent = form.dataset.addTitle; onReset && onReset(); });
}
const bindActions = (handlers) => {
  panel.onclick = async (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    try { await handlers[b.dataset.action](b.dataset.id, b); } catch (err) { toast(err.message, 'error', 5000); }
  };
};
const pagerHTML = '<div class="pagination" id="adminPager"></div>';
const startEdit = (form, title, obj) => { form.dataset.id = obj._id; form.querySelector('#formTitle').textContent = title; fillForm(obj); form.scrollIntoView({ behavior: 'smooth' }); };

/* ---------- overview ---------- */
async function overview() {
  showLoading(panel);
  try {
    const { data: d } = await api('/dashboard/stats');
    const max = Math.max(1, ...d.byDay.map((x) => x.bookings));
    panel.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><b>${formatMoney(d.revenue)}</b><span>Revenue</span></div>
        <div class="stat"><b>${d.ticketsSold}</b><span>Tickets sold</span></div>
        <div class="stat"><b>${d.bookings.confirmed}</b><span>Confirmed bookings (${d.bookings.cancelled} cancelled)</span></div>
        <div class="stat"><b>${d.upcomingShows}</b><span>Upcoming shows</span></div>
        <div class="stat"><b>${d.movies}</b><span>Active movies</span></div>
        <div class="stat"><b>${d.theatres}</b><span>Theatres</span></div>
        <div class="stat"><b>${d.users}</b><span>Users</span></div>
      </div>
      <div class="admin-two" style="grid-template-columns:1fr 1fr">
        <section class="card"><h2>Bookings, last 7 days</h2>
          ${d.byDay.length ? `<div class="bars">${d.byDay.map((x) => `<div class="bar" title="${formatMoney(x.revenue)}"><span>${x.bookings}</span><i style="height:${Math.round((x.bookings / max) * 100)}%"></i><span>${x._id.slice(5)}</span></div>`).join('')}</div>` : '<p class="muted">No bookings in the last week.</p>'}
        </section>
        <section class="card"><h2>Top movies</h2>
          ${d.topMovies.length ? `<ol>${d.topMovies.map((m) => `<li>${escapeHTML(m.title)} <span class="muted">${m.tickets} tickets, ${formatMoney(m.revenue)}</span></li>`).join('')}</ol>` : '<p class="muted">No sales yet.</p>'}
        </section>
      </div>`;
  } catch (e) { showError(panel, e.message); }
}

/* ---------- movies ---------- */
async function movies(page = 1) {
  showLoading(panel);
  try {
    const { data, pagination } = await api(`/movies?page=${page}&limit=10&sort=title`);
    data.forEach((m) => { cache[m._id] = m; });
    panel.innerHTML = `<div class="admin-two"><div>
      ${data.length ? table(['', 'Title', 'Status', 'Actions'], data.map((m) => `<tr>
        <td>${m.posterUrl ? '<span class="badge">poster</span>' : ''}</td><td>${escapeHTML(m.title)}<br><span class="muted">${escapeHTML(m.language)}, ${m.duration} min</span></td>
        <td><span class="badge ${m.status}">${m.status}</span></td>
        <td><button class="btn btn-sm btn-outline" data-action="edit" data-id="${m._id}">Edit</button><button class="btn btn-sm btn-danger" data-action="del" data-id="${m._id}">Remove</button></td></tr>`)) : '<div class="state"><p>No movies yet. Add the first one.</p></div>'}
      ${pagerHTML}</div>
      ${formBox('Add movie', `
        ${field('title', 'Title', 'text', 'required maxlength="120"')}
        <div class="field"><label for="f_description">Description</label><textarea id="f_description" name="description" rows="3" required maxlength="2000"></textarea><span class="err" data-err="description"></span></div>
        <div class="field-row">${field('duration', 'Duration (min)', 'number', 'min="20" max="400" required')}${field('releaseDate', 'Release date', 'date', 'required')}</div>
        <div class="field-row">${field('language', 'Language', 'text', 'value="English"')}${select('certificate', 'Certificate', ['U', 'UA', 'A', 'PG', 'PG-13', 'R'].map((x) => [x, x]))}</div>
        ${select('status', 'Status', [['now-showing', 'Now showing'], ['upcoming', 'Coming soon'], ['ended', 'Ended']])}
        ${field('genres', 'Genres', 'text', 'placeholder="Action, Thriller"')}
        ${field('cast', 'Cast', 'text', 'placeholder="Comma separated"')}
        ${field('director', 'Director')}
        ${field('posterUrl', 'Poster URL (optional)', 'text')}
        <div class="field"><label for="f_poster">Or upload poster (JPG/PNG/WEBP, 2 MB max)</label><input id="f_poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp"></div>`)}
    </div>`;
    const form = document.querySelector('#adminForm');
    form.dataset.addTitle = 'Add movie';
    renderPagination(document.querySelector('#adminPager'), pagination, (p) => movies(p));
    bindActions({
      edit: (id) => startEdit(form, 'Edit movie', { ...cache[id], genres: cache[id].genres.join(', '), cast: cache[id].cast.join(', '), releaseDate: cache[id].releaseDate.slice(0, 10) }),
      del: async (id) => { if (await confirmDialog('Remove this movie from the site?', 'Remove')) { await api(`/movies/${id}`, { method: 'DELETE' }); toast('Movie removed', 'success'); movies(page); } },
    });
    bindForm(async (f) => {
      const body = {};
      ['title', 'description', 'duration', 'releaseDate', 'language', 'certificate', 'status', 'genres', 'cast', 'director', 'posterUrl'].forEach((k) => { body[k] = f.elements[k].value; });
      const id = f.dataset.id;
      const res = id ? await api(`/movies/${id}`, { method: 'PUT', body }) : await api('/movies', { method: 'POST', body });
      const file = f.elements.poster.files[0];
      if (file) { const fd = new FormData(); fd.append('poster', file); await api(`/movies/${res.data._id}/poster`, { method: 'POST', body: fd, isForm: true }); }
      toast(id ? 'Movie updated' : 'Movie added', 'success');
      movies(page);
    });
  } catch (e) { showError(panel, e.message); }
}

/* ---------- theatres ---------- */
async function theatres() {
  showLoading(panel);
  try {
    const { data } = await api('/theatres');
    data.forEach((t) => { cache[t._id] = t; });
    panel.innerHTML = `<div class="admin-two"><div>
      ${data.length ? table(['Theatre', 'Layout', 'Actions'], data.map((t) => `<tr>
        <td>${escapeHTML(t.name)}<br><span class="muted">${escapeHTML(t.city)}</span></td><td>${t.rows} x ${t.seatsPerRow} = ${t.rows * t.seatsPerRow} seats</td>
        <td><button class="btn btn-sm btn-outline" data-action="edit" data-id="${t._id}">Edit</button><button class="btn btn-sm btn-danger" data-action="del" data-id="${t._id}">Delete</button></td></tr>`)) : '<div class="state"><p>No theatres yet. Add one to create shows.</p></div>'}
      </div>
      ${formBox('Add theatre', `${field('name', 'Name', 'text', 'required')}${field('city', 'City', 'text', 'required')}${field('address', 'Address')}
        <div class="field-row">${field('rows', 'Rows (A, B, C...)', 'number', 'min="1" max="26" value="8" required')}${field('seatsPerRow', 'Seats per row', 'number', 'min="1" max="30" value="10" required')}</div>`)}
    </div>`;
    const form = document.querySelector('#adminForm');
    form.dataset.addTitle = 'Add theatre';
    bindActions({
      edit: (id) => startEdit(form, 'Edit theatre', cache[id]),
      del: async (id) => { if (await confirmDialog('Delete this theatre?', 'Delete')) { await api(`/theatres/${id}`, { method: 'DELETE' }); toast('Theatre deleted', 'success'); theatres(); } },
    });
    bindForm(async (f) => {
      const body = {}; ['name', 'city', 'address', 'rows', 'seatsPerRow'].forEach((k) => { body[k] = f.elements[k].value; });
      const id = f.dataset.id;
      await api(id ? `/theatres/${id}` : '/theatres', { method: id ? 'PUT' : 'POST', body });
      toast(id ? 'Theatre updated' : 'Theatre added', 'success');
      theatres();
    });
  } catch (e) { showError(panel, e.message); }
}

/* ---------- shows ---------- */
async function shows(page = 1) {
  showLoading(panel);
  try {
    const [sh, mv, th] = await Promise.all([
      api(`/shows?page=${page}&limit=10&includePast=true&sort=-startTime`), api('/movies?limit=50&sort=title'), api('/theatres'),
    ]);
    sh.data.forEach((s) => { cache[s._id] = s; });
    panel.innerHTML = `<div class="admin-two"><div>
      ${sh.data.length ? table(['Movie', 'Theatre', 'When', 'Price', 'Sold', ''], sh.data.map((s) => `<tr>
        <td>${escapeHTML(s.movie ? s.movie.title : '-')}</td><td>${escapeHTML(s.theatre ? s.theatre.name : '-')}</td><td>${formatDateTime(s.startTime)}</td>
        <td>${formatMoney(s.price)}</td><td>${s.bookedSeats.length}</td>
        <td><button class="btn btn-sm btn-outline" data-action="edit" data-id="${s._id}">Edit</button><button class="btn btn-sm btn-danger" data-action="del" data-id="${s._id}">Delete</button></td></tr>`)) : '<div class="state"><p>No shows yet.</p></div>'}
      ${pagerHTML}</div>
      ${formBox('Add show', `${select('movie', 'Movie', mv.data.filter((m) => m.status !== 'ended').map((m) => [m._id, m.title]))}
        ${select('theatre', 'Theatre', th.data.map((t) => [t._id, `${t.name} (${t.city})`]))}
        ${field('startTime', 'Start time', 'datetime-local', 'required')}${field('price', 'Ticket price (INR)', 'number', 'min="0" required')}
        <p class="hint muted">Shows in one theatre cannot overlap. A show with bookings can only change price.</p>`)}
    </div>`;
    const form = document.querySelector('#adminForm');
    form.dataset.addTitle = 'Add show';
    renderPagination(document.querySelector('#adminPager'), sh.pagination, (p) => shows(p));
    bindActions({
      edit: (id) => { const s = cache[id]; startEdit(form, 'Edit show', { _id: s._id, movie: s.movie._id, theatre: s.theatre._id, startTime: toLocalInput(s.startTime), price: s.price }); },
      del: async (id) => { if (await confirmDialog('Delete this show?', 'Delete')) { await api(`/shows/${id}`, { method: 'DELETE' }); toast('Show deleted', 'success'); shows(page); } },
    });
    bindForm(async (f) => {
      const body = { movie: f.elements.movie.value, theatre: f.elements.theatre.value, startTime: f.elements.startTime.value ? new Date(f.elements.startTime.value).toISOString() : '', price: f.elements.price.value };
      const id = f.dataset.id;
      await api(id ? `/shows/${id}` : '/shows', { method: id ? 'PUT' : 'POST', body });
      toast(id ? 'Show updated' : 'Show added', 'success');
      shows(page);
    });
  } catch (e) { showError(panel, e.message); }
}

/* ---------- bookings ---------- */
async function bookings(page = 1) {
  showLoading(panel);
  try {
    const { data, pagination } = await api(`/bookings?page=${page}&limit=10`);
    if (!data.length) return showEmpty(panel, 'No bookings yet.');
    panel.innerHTML = `${table(['Code', 'User', 'Movie', 'Seats', 'Total', 'Status', ''], data.map((b) => `<tr>
      <td><code>${escapeHTML(b.bookingCode)}</code></td><td>${escapeHTML(b.user ? b.user.name : '-')}<br><span class="muted">${escapeHTML(b.user ? b.user.email : '')}</span></td>
      <td>${escapeHTML(b.show && b.show.movie ? b.show.movie.title : '-')}<br><span class="muted">${b.show ? formatDateTime(b.show.startTime) : ''}</span></td>
      <td>${b.seats.map(escapeHTML).join(', ')}</td><td>${formatMoney(b.totalAmount)}</td><td><span class="badge ${b.status}">${b.status}</span></td>
      <td>${b.status === 'confirmed' ? `<button class="btn btn-sm btn-danger" data-action="cancel" data-id="${b._id}">Cancel</button>` : ''}</td></tr>`))}${pagerHTML}`;
    renderPagination(document.querySelector('#adminPager'), pagination, (p) => bookings(p));
    bindActions({ cancel: async (id) => { if (await confirmDialog('Cancel this booking for the customer?', 'Cancel booking')) { await api(`/bookings/${id}/cancel`, { method: 'PUT' }); toast('Booking cancelled', 'success'); bookings(page); } } });
  } catch (e) { showError(panel, e.message); }
}

/* ---------- users ---------- */
async function users(page = 1) {
  showLoading(panel);
  try {
    const { data, pagination } = await api(`/users?page=${page}&limit=10`);
    panel.innerHTML = `${table(['Name', 'Email', 'Role', 'Joined', 'Status', ''], data.map((u) => `<tr>
      <td>${escapeHTML(u.name)}</td><td>${escapeHTML(u.email)}</td><td><span class="badge ${u.role}">${u.role}</span></td><td>${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
      <td><span class="badge ${u.isActive ? 'confirmed' : 'cancelled'}">${u.isActive ? 'active' : 'deactivated'}</span></td>
      <td><button class="btn btn-sm btn-outline" data-action="toggle" data-id="${u._id}" data-active="${u.isActive}">${u.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>`))}${pagerHTML}`;
    renderPagination(document.querySelector('#adminPager'), pagination, (p) => users(p));
    bindActions({ toggle: async (id, btn) => { await api(`/users/${id}/status`, { method: 'PATCH', body: { isActive: btn.dataset.active !== 'true' } }); toast('User updated', 'success'); users(page); } });
  } catch (e) { showError(panel, e.message); }
}
