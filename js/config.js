// ONE place for the backend address.
// - Backend serves the frontend (default, e.g. one Render service): leave PRODUCTION_API empty.
// - Frontend hosted separately (Netlify / Vercel / GitHub Pages): set it to
//   'https://your-backend.onrender.com/api/v1'
const PRODUCTION_API = '';

// Frontend opened with a separate static server (VS Code Live Server etc.) -> talk to the API on :5000
const isLocalStatic =
  ['localhost', '127.0.0.1'].includes(location.hostname) && ['5500', '5501', '3000', '8080'].includes(location.port);

export const API_URL = PRODUCTION_API || (isLocalStatic ? 'http://localhost:5000/api/v1' : '/api/v1');
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');
// path prefix that works from index.html and from pages/*.html (also under GitHub Pages sub-paths)
export const ROOT = location.pathname.includes('/pages/') ? '../' : './';
