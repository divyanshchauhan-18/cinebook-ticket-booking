// Usage: npm run seed        -> wipes DB and inserts demo data
//        npm run seed:destroy -> wipes DB only
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Theatre = require('../src/models/Theatre');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');

const movies = [
  { title: 'Midnight Express Heist', genres: ['Action', 'Thriller'], language: 'English', duration: 128, certificate: 'UA', director: 'R. Calloway', cast: ['Ava Brooks', 'Leo Marin'], poster: 'midnight-express', description: 'A retired train conductor is pulled into one last job: emptying a vault on a night train that never stops.' },
  { title: 'Starlight Odyssey', genres: ['Sci-Fi', 'Adventure'], language: 'English', duration: 142, certificate: 'PG-13', director: 'M. Okafor', cast: ['Nia Cole', 'Sam Duarte'], poster: 'starlight-odyssey', description: 'A crew of eight sets out to relight a dying star, and discovers they are not the first to try.' },
  { title: 'The Last Monsoon', genres: ['Drama', 'Romance'], language: 'Hindi', duration: 135, certificate: 'U', director: 'A. Rao', cast: ['Meera Iyer', 'Kabir Sen'], poster: 'last-monsoon', description: 'Two strangers share a single umbrella and a village of secrets through the final rains of the season.' },
  { title: 'Laugh Riot', genres: ['Comedy'], language: 'Hindi', duration: 118, certificate: 'U', director: 'P. Verma', cast: ['Rohan Gill', 'Tara Bose'], poster: 'laugh-riot', description: 'A wedding planner, a runaway groom and a goat. Nothing goes to plan, everything goes wrong, brilliantly.' },
  { title: 'Echoes of Tomorrow', genres: ['Sci-Fi', 'Thriller'], language: 'English', duration: 121, certificate: 'UA', director: 'J. Lindqvist', cast: ['Eli Ward', 'Priya Nand'], poster: 'echoes', description: 'A sound engineer begins hearing recordings of conversations that have not happened yet.' },
  { title: 'Desert Rose', genres: ['Drama', 'Adventure'], language: 'Tamil', duration: 150, certificate: 'UA', director: 'S. Murugan', cast: ['Divya Raman', 'Arjun Pillai'], poster: 'desert-rose', description: 'Across a vast desert, a young mapmaker follows a legend about a flower that blooms once a century.' },
  { title: 'Paper Lanterns', genres: ['Animation', 'Family'], language: 'English', duration: 98, certificate: 'U', director: 'K. Tanaka', cast: ['Voices of Mia Frost', 'Tom Hale'], poster: 'paper-lanterns', description: 'On the night of the lantern festival, one small lantern refuses to float away.', status: 'upcoming' },
];

const theatres = [
  { name: 'Grand Cinema Hall', city: 'Lucknow', address: 'Hazratganj, Lucknow', rows: 8, seatsPerRow: 12 },
  { name: 'Silver Screen Multiplex', city: 'Lucknow', address: 'Gomti Nagar, Lucknow', rows: 7, seatsPerRow: 10 },
  { name: 'Royal Picture Palace', city: 'Delhi', address: 'Connaught Place, New Delhi', rows: 9, seatsPerRow: 14 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Movie, Theatre, Show, Booking].map((M) => M.deleteMany({})));
    // drop stale indexes left by older versions of the schema
  await Promise.all([User, Movie, Theatre, Show, Booking].map((M) => M.syncIndexes()));
  console.log('Database cleared');
  if (process.argv.includes('--destroy')) return;

  await User.create([
    { name: 'Admin', email: 'admin@demo.com', password: 'Admin@123', role: 'admin' },
    { name: 'Demo User', email: 'user@demo.com', password: 'User@1234' },
  ]);

  const now = new Date();
  const movieDocs = await Movie.insertMany(
    movies.map((m, i) => ({
      ...m,
      posterUrl: `assets/images/posters/${m.poster}.svg`,
      status: m.status || 'now-showing',
      releaseDate: new Date(now.getTime() + (m.status === 'upcoming' ? 20 : -(i + 1) * 5) * 86400000),
    }))
  );
  const theatreDocs = await Theatre.insertMany(theatres);

  const slots = [[10, 30], [13, 45], [17, 0], [20, 30]];
  const shows = [];
  movieDocs.filter((m) => m.status === 'now-showing').forEach((movie, mi) => {
    theatreDocs.forEach((theatre, ti) => {
      for (let day = 0; day < 7; day += 1) {
        // each movie gets 2 slots per theatre per day, staggered so shows never overlap
        [(mi + ti) % 4, (mi + ti + 2) % 4].forEach((s) => {
          const start = new Date(now);
          start.setDate(now.getDate() + day);
          start.setHours(slots[s][0], slots[s][1], 0, 0);
          if (start > now) shows.push({ movie: movie._id, theatre: theatre._id, startTime: start, price: 150 + ti * 50 + (s >= 2 ? 50 : 0) });
        });
      }
    });
  });
  // remove any accidental overlaps in the same theatre (keep the first)
  const kept = [];
  shows.sort((a, b) => a.startTime - b.startTime).forEach((s) => {
    const clash = kept.some((k) => String(k.theatre) === String(s.theatre) && Math.abs(k.startTime - s.startTime) < 3 * 3600000);
    if (!clash) kept.push(s);
  });
  await Show.insertMany(kept);

  console.log(`Seeded: 2 users, ${movieDocs.length} movies, ${theatreDocs.length} theatres, ${kept.length} shows`);
  console.log('Admin  -> admin@demo.com / Admin@123');
  console.log('User   -> user@demo.com  / User@1234');
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
