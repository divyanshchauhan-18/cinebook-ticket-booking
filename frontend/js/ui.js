import { ROOT } from './config.js';
import { getUser, logout } from './auth.js';
import { escapeHTML } from './utils.js';

export function renderNavbar() {
  const host = document.querySelector('#navbar');
  if (!host) return;
  const user = getUser();
  const here = location.pathname.split('/').pop() || 'index.html';
  const link = (href, label, file) =>
    `<a href="${ROOT}${href}" ${here === file ? 'aria-current="page"' : ''}>${label}</a>`;

  host.className = 'navbar';
  host.innerHTML = `
    <div class="container">
      <a class="brand" href="${ROOT}index.html">Cine<span>Book</span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="navLinks">Menu</button>
      <nav class="nav-links" id="navLinks" aria-label="Main">
        ${link('index.html', 'Movies', 'index.html')}
        ${user ? link('pages/bookings.html', 'My bookings', 'bookings.html') : ''}
        ${user && user.role === 'admin' ? link('pages/admin.html', 'Admin', 'admin.html') : ''}
        ${user
          ? `${link('pages/profile.html', 'Profile', 'profile.html')}
             <span class="nav-user">${escapeHTML(user.name.split(' ')[0])}</span>
             <button class="link" id="logoutBtn" type="button">Log out</button>`
          : `${link('pages/login.html', 'Log in', 'login.html')}${link('pages/register.html', 'Sign up', 'register.html')}`}
      </nav>
    </div>`;

  const toggle = host.querySelector('.nav-toggle');
  const links = host.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  const out = host.querySelector('#logoutBtn');
  if (out) out.addEventListener('click', logout);

  const footer = document.querySelector('#footer');
  if (footer) {
    footer.className = 'footer';
    footer.innerHTML = `<div class="container"><span>CineBook &copy; ${new Date().getFullYear()}</span><span>Student full-stack project. Payments are simulated.</span></div>`;
  }
}

export function toast(message, type = 'info', ms = 3500) {
  let box = document.querySelector('#toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export const showLoading = (el, text = 'Loading...') => {
  el.innerHTML = `<div class="state"><div class="spinner"></div><p>${escapeHTML(text)}</p></div>`;
};
export const showEmpty = (el, text) => { el.innerHTML = `<div class="state"><p>${escapeHTML(text)}</p></div>`; };
export const showError = (el, text) => { el.innerHTML = `<div class="state error"><p>${escapeHTML(text)}</p></div>`; };

export function confirmDialog(message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<p></p><div class="actions">
      <button class="btn btn-outline btn-sm" value="no">Keep</button>
      <button class="btn btn-danger btn-sm" value="yes"></button></div>`;
    dlg.querySelector('p').textContent = message;
    dlg.querySelector('[value="yes"]').textContent = confirmLabel;
    dlg.addEventListener('click', (e) => {
      const v = e.target.value;
      if (v) { dlg.close(v); }
    });
    dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'yes'); dlg.remove(); });
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

export function renderPagination(el, pagination, onChange) {
  if (!pagination || pagination.pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button class="btn btn-outline btn-sm" data-go="${pagination.page - 1}" ${pagination.page <= 1 ? 'disabled' : ''}>Previous</button>
    <span>Page ${pagination.page} of ${pagination.pages}</span>
    <button class="btn btn-outline btn-sm" data-go="${pagination.page + 1}" ${pagination.page >= pagination.pages ? 'disabled' : ''}>Next</button>`;
  el.onclick = (e) => {
    const b = e.target.closest('[data-go]');
    if (b && !b.disabled) onChange(Number(b.dataset.go));
  };
}

export function setBusy(btn, busy, label) {
  btn.disabled = busy;
  btn.setAttribute('aria-busy', String(busy));
  if (label) btn.textContent = label;
}

export function showFieldErrors(form, err) {
  form.querySelectorAll('.err').forEach((e) => { e.textContent = ''; });
  const box = form.querySelector('.form-error');
  let general = err.message;
  (err.errors || []).forEach((e) => {
    const slot = form.querySelector(`[data-err="${e.field}"]`);
    if (slot) { slot.textContent = e.msg; general = ''; }
  });
  if (box) { box.textContent = general; box.classList.toggle('hidden', !general); }
}

export function wirePasswordToggles() {
  document.querySelectorAll('.password-wrap').forEach((wrap) => {
    const input = wrap.querySelector('input');
    const btn = wrap.querySelector('button');
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
    });
  });
}
