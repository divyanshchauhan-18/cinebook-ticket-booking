const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();
const isTest = process.env.NODE_ENV === 'test';

app.set('trust proxy', 1); // needed behind Render/Railway proxies for rate limiting

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // posters load from a different origin
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'upgrade-insecure-requests': null,
        'img-src': ["'self'", 'data:', 'https:'],
        'script-src': ["'self'"],
        'connect-src': ["'self'", ...(process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean)],
      },
    },
  })
);

const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
if (!isTest) app.use(morgan('dev'));

if (!isTest) {
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
      message: { success: false, message: 'Too many attempts, please try again later' },
    })
  );
}

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', routes);

// One-service deployment: Express also serves the frontend folder
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
if (process.env.SERVE_FRONTEND !== 'false' && fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
}

app.use('/api', notFound);
app.use((req, res, next) => {
  // non-API 404: show the friendly frontend page when available
  const page = path.join(frontendDir, 'pages', '404.html');
  if (req.method === 'GET' && fs.existsSync(page) && process.env.SERVE_FRONTEND !== 'false') {
    return res.status(404).sendFile(page);
  }
  return notFound(req, res, next);
});
app.use(errorHandler);

module.exports = app;
