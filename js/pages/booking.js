import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { renderNavbar, showLoading, showError, toast, setBusy } from '../ui.js';
import { escapeHTML, formatMoney, formatDateTime } from '../utils.js';

renderNavbar();
const root = document.querySelector('#bookingRoot');
const showId = new URLSearchParams(location.search).get('show');
const MAX_SEATS = 8;
let show = null;
const selected = new Set();

if (requireAuth()) init();

async function init() {
  if (!showId) return showError(root, 'No show selected.');
  await loadShow();
}

async function loadShow() {
  showLoading(root, 'Loading seat map...');
  try {
    ({ data: show } = await api(`/shows/${encodeURIComponent(showId)}`));
    if (new Date(show.startTime) <= new Date()) return showError(root, 'This show has already started.');
    selected.forEach((s) => { if (show.bookedSeats.includes(s)) selected.delete(s); });
    render();
  } catch (e) { showError(root, e.message); }
}

function render() {
  const { rows, seatsPerRow } = show.theatre;
  const booked = new Set(show.bookedSeats);
  let seatRows = '';
  for (let r = 0; r < rows; r += 1) {
    const letter = String.fromCharCode(65 + r);
    let seats = '';
    for (let n = 1; n <= seatsPerRow; n += 1) {
      const label = `${letter}${n}`;
      const isBooked = booked.has(label);
      const gap = seatsPerRow >= 8 && n === Math.floor(seatsPerRow / 2) ? ' gap' : '';
      seats += `<button type="button" class="seat${gap}" data-seat="${label}" aria-label="Seat ${label}${isBooked ? ', booked' : ''}"
        aria-pressed="${selected.has(label)}" ${isBooked ? 'disabled' : ''}>${n}</button>`;
    }
    seatRows += `<div class="seat-row"><span class="row-label" aria-hidden="true">${letter}</span>${seats}</div>`;
  }

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>${escapeHTML(show.movie.title)}</h1>
        <p class="muted" style="margin:0">${escapeHTML(show.theatre.name)}, ${escapeHTML(show.theatre.city)} &bull; ${formatDateTime(show.startTime)}</p>
      </div>
    </div>
    <div class="booking-layout">
      <section class="card" aria-label="Seat map">
        <div class="screen" aria-hidden="true">Screen this way</div>
        <div class="seat-scroll"><div class="seat-map" id="seatMap">${seatRows}</div></div>
        <div class="legend"><span><i></i>Available</span><span><i class="sel"></i>Your pick</span><span><i class="bkd"></i>Booked</span></div>
      </section>
      <aside class="card summary" aria-live="polite">
        <h2>Your tickets</h2>
        <dl>
          <dt>Seats</dt><dd id="sumSeats">None yet</dd>
          <dt>Price each</dt><dd>${formatMoney(show.price)}</dd>
          <dt>Tickets</dt><dd id="sumCount">0</dd>
        </dl>
        <p class="total" id="sumTotal">${formatMoney(0)}</p>
        <button class="btn btn-block" id="confirmBtn" disabled>Confirm booking</button>
        <p class="muted" style="font-size:.82rem;margin:.75rem 0 0">Payment is simulated in this project. Up to ${MAX_SEATS} seats per booking.</p>
      </aside>
    </div>`;

  root.querySelector('#seatMap').addEventListener('click', onSeat);
  root.querySelector('#confirmBtn').addEventListener('click', confirm);
  updateSummary();
}

function onSeat(e) {
  const btn = e.target.closest('.seat');
  if (!btn || btn.disabled) return;
  const label = btn.dataset.seat;
  if (selected.has(label)) selected.delete(label);
  else if (selected.size >= MAX_SEATS) return toast(`You can pick up to ${MAX_SEATS} seats`, 'error');
  else selected.add(label);
  btn.setAttribute('aria-pressed', String(selected.has(label)));
  updateSummary();
}

function updateSummary() {
  const list = [...selected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  root.querySelector('#sumSeats').textContent = list.length ? list.join(', ') : 'None yet';
  root.querySelector('#sumCount').textContent = list.length;
  root.querySelector('#sumTotal').textContent = formatMoney(show.price * list.length);
  root.querySelector('#confirmBtn').disabled = list.length === 0;
}

async function confirm() {
  const btn = root.querySelector('#confirmBtn');
  setBusy(btn, true, 'Booking...');
  try {
    const { data } = await api('/bookings', { method: 'POST', body: { showId: show._id, seats: [...selected] } });
    renderTicket(data);
  } catch (e) {
    toast(e.message, 'error', 5000);
    if (e.status === 409) await loadShow(); // someone else took a seat: refresh the map
    else setBusy(btn, false, 'Confirm booking');
  }
}

function renderTicket(b) {
  root.innerHTML = `
    <div class="page-head"><h1>You are booked in</h1></div>
    <article class="ticket" aria-label="Ticket ${escapeHTML(b.bookingCode)}">
      <div class="main">
        <h3>${escapeHTML(b.show.movie.title)}</h3>
        <p class="muted" style="margin:0">${escapeHTML(b.show.theatre.name)}, ${escapeHTML(b.show.theatre.city)}</p>
        <p style="margin:.25rem 0 0">${formatDateTime(b.show.startTime)}</p>
        <div class="seat-tags">${b.seats.map((s) => `<span>${escapeHTML(s)}</span>`).join('')}</div>
        <strong>${formatMoney(b.totalAmount)} paid</strong>
      </div>
      <div class="stub"><span>Booking code</span><span class="code">${escapeHTML(b.bookingCode)}</span><small>Show this at the entrance</small></div>
    </article>
    <div class="row"><a class="btn" href="bookings.html">View my bookings</a><a class="btn btn-outline" href="../index.html">Book another movie</a></div>`;
  toast('Booking confirmed', 'success');
}
