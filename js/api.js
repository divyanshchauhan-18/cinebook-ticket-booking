// All network calls go through this one function.
import { API_URL, ROOT } from './config.js';

export async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method, headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    // token expired or user deactivated -> force login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!location.pathname.endsWith('login.html')) {
      const here = location.pathname.split('/').pop() + location.search;
      location.href = `${ROOT}pages/login.html?next=${encodeURIComponent(here)}`;
    }
  }
  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong');
    err.status = res.status;
    err.errors = data.errors || [];
    throw err;
  }
  return data;
}
