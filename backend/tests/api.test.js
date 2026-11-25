// Needs a running MongoDB. Set MONGO_URI_TEST (see .env.example).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_test_secret_test_secret';
process.env.CLIENT_URL = 'http://localhost:5500';
process.env.SERVE_FRONTEND = 'false';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Theatre = require('../src/models/Theatre');
const Show = require('../src/models/Show');

const URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/cinebook_test';
let adminToken; let userToken; let user2Token; let show;

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password123', role: 'admin' });
  const movie = await Movie.create({ title: 'Test Movie', description: 'desc', duration: 100, releaseDate: new Date() });
  const theatre = await Theatre.create({ name: 'T1', city: 'Lucknow', rows: 3, seatsPerRow: 4 });
  show = await Show.create({ movie: movie._id, theatre: theatre._id, startTime: new Date(Date.now() + 5 * 3600000), price: 200 });
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const reg = (name, email) => request(app).post('/api/v1/auth/register').send({ name, email, password: 'Password123' });

describe('Auth', () => {
  it('registers a user and ignores a role in the body', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Test', email: 't@test.com', password: 'Password123', role: 'admin' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.role).toBe('user');
    userToken = res.body.data.token;
  });
  it('rejects duplicate email with 409', async () => {
    expect((await reg('Test', 't@test.com')).statusCode).toBe(409);
  });
  it('rejects a short password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'X Y', email: 'x@test.com', password: '123' });
    expect(res.statusCode).toBe(400);
  });
  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 't@test.com', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
  });
  it('logs in admin', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.com', password: 'Password123' });
    expect(res.statusCode).toBe(200);
    adminToken = res.body.data.token;
  });
  it('blocks /auth/me without a token', async () => {
    expect((await request(app).get('/api/v1/auth/me')).statusCode).toBe(401);
  });
});

describe('RBAC', () => {
  it('forbids a normal user from creating a movie', async () => {
    const res = await request(app).post('/api/v1/movies').set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Nope', description: 'd', duration: 90, releaseDate: '2025-01-01' });
    expect(res.statusCode).toBe(403);
  });
  it('lets admin create a movie', async () => {
    const res = await request(app).post('/api/v1/movies').set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Movie', description: 'd', duration: 90, releaseDate: '2025-01-01', genres: 'Drama, Comedy' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.genres).toEqual(['Drama', 'Comedy']);
  });
  it('lists movies publicly with pagination', async () => {
    const res = await request(app).get('/api/v1/movies?limit=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });
});

describe('Booking', () => {
  it('books seats and totals the price', async () => {
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${userToken}`)
      .send({ showId: String(show._id), seats: ['A1', 'A2'] });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.totalAmount).toBe(400);
  });
  it('rejects double booking of the same seat with 409', async () => {
    user2Token = (await reg('Second', 's@test.com')).body.data.token;
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${user2Token}`)
      .send({ showId: String(show._id), seats: ['A2', 'A3'] });
    expect(res.statusCode).toBe(409);
    const fresh = await Show.findById(show._id);
    expect(fresh.bookedSeats).not.toContain('A3'); // nothing partially reserved
  });
  it('rejects seats that do not exist', async () => {
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${user2Token}`)
      .send({ showId: String(show._id), seats: ['Z9'] });
    expect(res.statusCode).toBe(400);
  });
  it("does not let another user read or cancel someone else's booking", async () => {
    const mine = await request(app).get('/api/v1/bookings/my').set('Authorization', `Bearer ${userToken}`);
    const id = mine.body.data[0]._id;
    expect((await request(app).get(`/api/v1/bookings/${id}`).set('Authorization', `Bearer ${user2Token}`)).statusCode).toBe(403);
    expect((await request(app).put(`/api/v1/bookings/${id}/cancel`).set('Authorization', `Bearer ${user2Token}`)).statusCode).toBe(403);
  });
  it('cancels a booking and frees the seats', async () => {
    const mine = await request(app).get('/api/v1/bookings/my').set('Authorization', `Bearer ${userToken}`);
    const res = await request(app).put(`/api/v1/bookings/${mine.body.data[0]._id}/cancel`).set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect((await Show.findById(show._id)).bookedSeats).toHaveLength(0);
  });
});
