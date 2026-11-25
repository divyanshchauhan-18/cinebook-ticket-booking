import { login, isLoggedIn } from '../auth.js';
import { renderNavbar, setBusy, showFieldErrors, wirePasswordToggles, toast } from '../ui.js';
import { ROOT } from '../config.js';
import { safeNext } from '../utils.js';

renderNavbar();
wirePasswordToggles();
const next = safeNext(new URLSearchParams(location.search).get('next'));
const go = () => { location.href = next ? (next.startsWith('index') ? `${ROOT}${next}` : `${next}`) : `${ROOT}index.html`; };
if (isLoggedIn()) go();

const form = document.querySelector('#loginForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showFieldErrors(form, { message: 'Enter your email and password.' });
  setBusy(btn, true, 'Logging in...');
  try {
    await login(email, password);
    toast('Logged in', 'success');
    go();
  } catch (err) {
    showFieldErrors(form, err);
    setBusy(btn, false, 'Log in');
  }
});
