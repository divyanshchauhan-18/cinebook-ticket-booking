import { api } from '../api.js';
import { requireAuth, getUser, updateStoredUser } from '../auth.js';
import { renderNavbar, toast, setBusy, showFieldErrors } from '../ui.js';

if (requireAuth()) {
  const profileForm = document.querySelector('#profileForm');
  const passwordForm = document.querySelector('#passwordForm');

  (async () => {
    try {
      const { data } = await api('/auth/me');
      updateStoredUser({ id: data.id, name: data.name, email: data.email, phone: data.phone, role: data.role });
      profileForm.email.value = data.email;
      profileForm.elements['name'].value = data.name;
      profileForm.phone.value = data.phone || '';
    } catch (e) { toast(e.message, 'error'); }
    renderNavbar();
  })();
  renderNavbar();
  document.querySelector('#email').value = getUser().email;

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = profileForm.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Saving...');
    try {
      const { data } = await api('/users/profile', { method: 'PUT', body: { name: profileForm.elements['name'].value.trim(), phone: profileForm.phone.value.trim() } });
      updateStoredUser(data);
      showFieldErrors(profileForm, { message: '' });
      toast('Profile updated', 'success');
      renderNavbar();
    } catch (err) { showFieldErrors(profileForm, err); }
    setBusy(btn, false, 'Save changes');
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = passwordForm.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Updating...');
    try {
      await api('/auth/change-password', { method: 'PUT', body: { currentPassword: passwordForm.currentPassword.value, newPassword: passwordForm.newPassword.value } });
      passwordForm.reset();
      showFieldErrors(passwordForm, { message: '' });
      toast('Password updated', 'success');
    } catch (err) { showFieldErrors(passwordForm, err); }
    setBusy(btn, false, 'Update password');
  });
}
