import { register, isLoggedIn } from '../auth.js';
import { renderNavbar, setBusy, showFieldErrors, wirePasswordToggles } from '../ui.js';
import { ROOT } from '../config.js';

renderNavbar();
wirePasswordToggles();
if (isLoggedIn()) location.href = `${ROOT}index.html`;

const form = document.querySelector('#registerForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const payload = {
    name: form.elements['name'].value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    password: form.password.value,
  };
  // quick client-side checks (the server validates again)
  if (payload.name.length < 2) return showFieldErrors(form, { message: '', errors: [{ field: 'name', msg: 'Enter your full name' }] });
  if (payload.password.length < 8) return showFieldErrors(form, { message: '', errors: [{ field: 'password', msg: 'Use at least 8 characters' }] });
  setBusy(btn, true, 'Creating account...');
  try {
    await register(payload);
    location.href = `${ROOT}index.html`;
  } catch (err) {
    showFieldErrors(form, err);
    setBusy(btn, false, 'Sign up');
  }
});
