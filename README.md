# CineBook - Movie Ticket Booking (Full-Stack MERN-style)

Browse movies, pick showtimes, choose exact seats on a live seat map and get a ticket with a booking code. Admins manage movies, theatres, shows, bookings and users, and see sales stats.

**Live demo:** _add your link after deploying_ &nbsp;|&nbsp; **Backend health check:** `/health`

> Screenshots: add 3-4 images in `docs/screenshots/` (home, seat map, ticket, admin) and link them here.

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (ES modules, Fetch API). No build step |
| Backend | Node.js, Express 4 (MVC) |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcryptjs, role based access (user / admin) |
| Security | helmet, CORS allow-list, express-rate-limit, express-mongo-sanitize, express-validator |
| Uploads | multer (poster images) |
| Tests / CI | Jest + Supertest, GitHub Actions |
| Deploy | Render (backend + frontend) + MongoDB Atlas, or AWS EC2 / Netlify / Vercel |

## Features
**Core**
- [x] Register / login / logout with JWT, bcrypt password hashing
- [x] Protected API routes and frontend route guards
- [x] Full CRUD for movies, theatres and shows (admin) and bookings (users)
- [x] Users only see and cancel their own bookings
- [x] Server-side validation + friendly errors, central error middleware, correct status codes
- [x] Responsive UI (mobile first), loading / empty / error states, toasts
- [x] `.env` config with `.env.example`

**Intermediate**
- [x] Role based access control (admin panel)
- [x] Pagination, search, filters (genre, language, status, city, date), sorting
- [x] Profile page + change password
- [x] File upload (movie posters, type and size checked)
- [x] Admin dashboard with aggregation (revenue, tickets, 7-day chart, top movies)
- [x] Rate limiting, security headers, request logging (morgan)

**Advanced**
- [x] Race-condition-safe seat booking (atomic MongoDB update, see below)
- [x] Automated API tests (Jest + Supertest) and GitHub Actions CI
- [x] Docker + docker-compose
- [ ] Real payment gateway (payments are simulated)
- [ ] Email tickets, refresh tokens, real-time seat updates (ideas for v2)

### How double booking is prevented
When two people click the same seat at the same moment, only one can win. `POST /bookings` reserves seats with a single atomic query:

```js
Show.findOneAndUpdate(
  { _id: showId, bookedSeats: { $nin: seats } },   // only if NONE of the seats are taken
  { $push: { bookedSeats: { $each: seats } } }
)
```
If it returns `null`, the API answers `409` and the UI refreshes the seat map. If saving the booking document fails afterwards, the seats are rolled back.

## Folder structure
```
cinebook/
|-- backend/
|   |-- server.js            # entry: env, DB connect, listen
|   |-- src/app.js           # express app (middleware + routes)
|   |-- src/config/ models/ controllers/ routes/ middlewares/ validators/ utils/
|   |-- scripts/seed.js      # demo data
|   `-- tests/api.test.js
|-- frontend/
|   |-- index.html           # movie list
|   |-- pages/               # login, register, movie, booking, bookings, profile, admin, 404
|   |-- css/  js/  js/pages/ assets/
|-- docs/API.md
|-- .github/workflows/ci.yml
|-- docker-compose.yml  render.yaml
`-- README.md
```

## Database design
- **users** `name, email (unique), password (hashed, select:false), phone, role, isActive`
- **movies** `title, description, genres[], language, duration, certificate, releaseDate, posterUrl, cast[], director, status, isActive`
- **theatres** `name, city, address, rows, seatsPerRow`
- **shows** `movie -> Movie, theatre -> Theatre, startTime, price, bookedSeats[]`
- **bookings** `bookingCode (unique), user -> User, show -> Show, seats[], totalAmount, status`

Relations: Theatre 1-N Show, Movie 1-N Show, Show 1-N Booking, User 1-N Booking. Indexes: text/status on movies, `(movie, startTime)` and `(theatre, startTime)` on shows, `(user, createdAt)` on bookings.

## Getting started (local)
Requirements: Node.js 18+, Git, and MongoDB (local) **or** a free MongoDB Atlas cluster.

```bash
git clone <your-repo-url>
cd cinebook/backend
npm install
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm run seed                # demo admin, user, movies, theatres, shows
npm run dev                 # http://localhost:5000
```
Open **http://localhost:5000** - the backend also serves the `frontend/` folder, so that is all you need.

Prefer VS Code Live Server for the frontend? Open `frontend/index.html` with Live Server (port 5500). It automatically talks to `http://localhost:5000/api/v1`, and `.env.example` already allows ports 5500 and 5000.

**Demo accounts** (created by the seed script, for demo data only): `admin@demo.com / Admin@123` and `user@demo.com / User@1234`.

Docker alternative: `docker compose up --build`, then `docker compose exec app node scripts/seed.js`.

## Environment variables
| Variable | Meaning |
|---|---|
| PORT | Server port (default 5000) |
| NODE_ENV | development / production / test |
| MONGO_URI | MongoDB connection string |
| MONGO_URI_TEST | Separate database used by tests |
| JWT_SECRET | Long random string. Never commit it |
| JWT_EXPIRES_IN | Token lifetime, e.g. `7d` |
| CLIENT_URL | Comma separated allowed frontend origins (CORS) |
| SERVE_FRONTEND | `false` if the frontend is hosted on Netlify/Vercel |

## API
See [docs/API.md](docs/API.md).

## Testing
```bash
cd backend
npm test        # needs MongoDB running; uses MONGO_URI_TEST
```
Manual test cases to try (record results here): register with an existing email (409), login with wrong password (401), open `bookings.html` without logging in (redirect), book the same seat from two browsers (second gets 409), cancel another user's booking (403), upload a 10 MB poster (400), admin page as a normal user (404 page), cancel a booking within 1 hour of the show (400).

## Deployment
### Option 1 - Render + MongoDB Atlas (simplest, one service)
1. **Atlas:** create a free M0 cluster, a database user, allow network access `0.0.0.0/0`, copy the connection string (add `/cinebook` as the database name).
2. Push this repo to GitHub (steps below).
3. **Render:** New > Blueprint (uses `render.yaml`) or New > Web Service with root directory `backend`, build `npm install`, start `npm start`.
4. Set env vars: `MONGO_URI`, `JWT_SECRET` (long random), `NODE_ENV=production`, `CLIENT_URL=https://<your-service>.onrender.com`.
5. Open the Render shell once and run `npm run seed` to create demo data (or register and create content from the admin account).
6. The free tier sleeps when idle: the first request can take up to a minute.

### Option 2 - AWS EC2 (matches the class AWS content)
1. Launch an Ubuntu EC2 instance; open ports 22, 80 (and 5000 while testing) in the security group.
2. `sudo apt update && sudo apt install -y nodejs npm git nginx` (use Node 18+; NodeSource or nvm if needed).
3. `git clone` the repo, `cd backend && npm install --omit=dev`, create `.env` with your Atlas URI and secrets.
4. Keep it running: `sudo npm i -g pm2 && pm2 start server.js --name cinebook && pm2 save && pm2 startup`.
5. Nginx reverse proxy: forward port 80 to `localhost:5000` (`proxy_pass http://localhost:5000;`), set `CLIENT_URL=http://<ec2-public-ip>`.
6. Optional: S3 + CloudFront for the static frontend (set `SERVE_FRONTEND=false` and `PRODUCTION_API` below).

### Option 3 - Frontend on Netlify / Vercel / GitHub Pages
Deploy the `frontend` folder, then set `PRODUCTION_API` in `frontend/js/config.js` to `https://<backend>/api/v1`, and add the frontend URL to `CLIENT_URL` on the backend.

## Push to GitHub
```bash
cd cinebook
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/cinebook.git
git push -u origin main
```
Then work with branches (`feature/seat-map`, `fix/login-redirect`), commit often with messages like `feat(booking): prevent double booking`, and open pull requests. Check `git status`: `.env` and `node_modules` must **not** appear.

## Security notes
Passwords hashed with bcrypt (12 rounds), role never read from request body, whitelisted update fields, ownership checks on bookings, sort fields whitelisted, regex input escaped, helmet + CSP, CORS allow-list, rate limits (stricter on `/auth`), body size limit, upload type and size limits, UI text escaped against XSS, stack traces hidden in production.

## Author
Your name - GitHub - LinkedIn
