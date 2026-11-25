import { api } from './api.js';
import { ROOT } from './config.js';

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
};
export const isLoggedIn = () => Boolean(localStorage.getItem('token') && getUser());

function save({ token, user }) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export async function login(email, password) {
  const { data } = await api('/auth/login', { method: 'POST', body: { email, password } });
  save(data);
  return data.user;
}

export async function register(payload) {
  const { data } = await api('/auth/register', { method: 'POST', body: payload });
  save(data);
  return data.user;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = `${ROOT}pages/login.html`;
}

export function updateStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// call at the top of every private page
export function requireAuth(role) {
  const user = getUser();
  if (!isLoggedIn()) {
    const here = location.pathname.split('/').pop() + location.search;
    location.href = `${ROOT}pages/login.html?next=${encodeURIComponent(here)}`;
    return false;
  }
  if (role && user.role !== role) {
    location.href = `${ROOT}pages/404.html`;
    return false;
  }
  return true;
}
