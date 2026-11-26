const PRODUCTION_API = 'https://cinebook-api-bdrr.onrender.com/api/v1';

const host = location.hostname;
const onStaticHost = host.endsWith('github.io') || host.endsWith('netlify.app') || host.endsWith('vercel.app');
const isLocalStatic = ['localhost', '127.0.0.1'].includes(host) && ['5500', '5501', '3000', '8080'].includes(location.port);

export const API_URL = onStaticHost && PRODUCTION_API
  ? PRODUCTION_API
  : (isLocalStatic ? 'http://localhost:5000/api/v1' : '/api/v1');
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');
export const ROOT = location.pathname.includes('/pages/') ? '../' : './';
