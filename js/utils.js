import { API_ORIGIN, ROOT } from './config.js';

export const escapeHTML = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const debounce = (fn, ms = 400) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

export const formatMoney = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

// yyyy-mm-dd in the viewer's local time zone (used to group shows by day)
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const posterSrc = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`;
  return `${ROOT}${url.replace(/^\//, '')}`;
};

export const posterHTML = (movie) =>
  movie.posterUrl
    ? `<div class="poster"><img src="${escapeHTML(posterSrc(movie.posterUrl))}" alt="Poster of ${escapeHTML(movie.title)}" loading="lazy"></div>`
    : `<div class="poster"><span>${escapeHTML(movie.title)}</span></div>`;

// datetime-local input value from a Date
export const toLocalInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export const safeNext = (v) => (v && /^[\w./?=&%-]+$/.test(v) && !v.startsWith('//') && !/^[a-z]+:/i.test(v) ? v : null);
