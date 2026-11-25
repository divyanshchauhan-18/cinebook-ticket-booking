import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { renderNavbar, showLoading, showEmpty, showError, renderPagination, toast, confirmDialog } from '../ui.js';
import { escapeHTML, formatMoney, formatDateTime } from '../utils.js';
import { ROOT } from '../config.js';

renderNavbar();
const list = document.querySelector('#list');
const pager = document.querySelector('#pagination');
const state = { page: 1, status: '' };

if (requireAuth()) load();

async function load() {
  showLoading(list, 'Loading your bookings...');
  try {
    const q = new URLSearchParams({ page: state.page, limit: 5 });
    if (state.status) q.set('status', state.status);
    const { data, pagination } = await api(`/bookings/my?${q}`);
    if (!data.length) {
      list.innerHTML = `<div class="state"><p>No bookings here yet.</p><a class="btn" href="${ROOT}index.html">Find a movie</a></div>`;
      pager.innerHTML = '';
      return;
    }
    list.innerHTML = data.map(ticket).join('');
    renderPagination(pager, pagination, (p) => { state.page = p; load(); });
  } catch (e) { showError(list, e.message); }
}

function ticket(b) {
  const s = b.show;
  if (!s) return '';
  const past = new Date(s.startTime) < new Date();
  const canCancel = b.status === 'confirmed' && !past;
  return `
    <article class="ticket ${b.status}">
      <div class="main">
        <h3>${escapeHTML(s.movie ? s.movie.title : 'Movie removed')}</h3>
        <p class="muted" style="margin:0">${escapeHTML(s.theatre ? `${s.theatre.name}, ${s.theatre.city}` : '')}</p>
        <p style="margin:.25rem 0 0">${formatDateTime(s.startTime)}</p>
        <div class="seat-tags">${b.seats.map((x) => `<span>${escapeHTML(x)}</span>`).join('')}</div>
        <span class="badge ${b.status}">${b.status}${past && b.status === 'confirmed' ? ' (watched)' : ''}</span>
        <strong style="margin-left:.5rem">${formatMoney(b.totalAmount)}</strong>
      </div>
      <div class="stub">
        <span>Booking code</span><span class="code">${escapeHTML(b.bookingCode)}</span>
        ${canCancel ? `<button class="btn btn-sm btn-danger" data-cancel="${b._id}" style="margin-top:.5rem">Cancel booking</button>` : ''}
      </div>
    </article>`;
}

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-cancel]');
  if (!btn) return;
  if (!(await confirmDialog('Cancel this booking? Your seats will be released.', 'Cancel booking'))) return;
  try {
    await api(`/bookings/${btn.dataset.cancel}/cancel`, { method: 'PUT' });
    toast('Booking cancelled', 'success');
    load();
  } catch (err) { toast(err.message, 'error', 5000); }
});

document.querySelector('#statusTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('#statusTabs .tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
  state.status = tab.dataset.status; state.page = 1; load();
});
