const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, getSort, paginationMeta, escapeRegex } = require('../utils/queryHelpers');

const withSeatInfo = (show) => {
  const s = show.toObject ? show.toObject() : show;
  const capacity = s.theatre && s.theatre.rows ? s.theatre.rows * s.theatre.seatsPerRow : 0;
  return { ...s, seatsLeft: Math.max(capacity - (s.bookedSeats || []).length, 0) };
};

// Two shows in one theatre must not overlap (movie length + 15 min cleaning buffer)
async function assertNoOverlap({ theatreId, startTime, movieId, ignoreId }) {
  const movie = await Movie.findById(movieId);
  const start = new Date(startTime);
  const end = new Date(start.getTime() + (movie.duration + 15) * 60000);
  const nearby = await Show.find({
    theatre: theatreId,
    _id: { $ne: ignoreId },
    startTime: { $gte: new Date(start.getTime() - 8 * 3600000), $lte: end },
  }).populate('movie', 'duration');
  const clash = nearby.some((o) => {
    const oStart = o.startTime.getTime();
    const oEnd = oStart + (o.movie.duration + 15) * 60000;
    return start.getTime() < oEnd && end.getTime() > oStart;
  });
  if (clash) throw new ApiError(409, 'This theatre already has a show at that time');
}

exports.getShows = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 50, 100);
  const filter = {};
  if (req.query.movie) filter.movie = req.query.movie;
  if (req.query.theatre) filter.theatre = req.query.theatre;

  if (req.query.city) {
    const ids = await Theatre.find({ city: new RegExp(`^${escapeRegex(req.query.city)}$`, 'i') }).distinct('_id');
    filter.theatre = { $in: ids };
  }

  // time window: ?from=ISO&to=ISO (default: only future shows)
  const range = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (req.query.from) range.$gte = new Date(req.query.from);
  else if (!(isAdmin && req.query.includePast === 'true')) range.$gte = new Date();
  if (req.query.to) range.$lte = new Date(req.query.to);
  if (Object.keys(range).length) filter.startTime = range;

  const sort = getSort(req.query.sort, ['startTime', 'price'], 'startTime');
  const [shows, total] = await Promise.all([
    Show.find(filter).sort(sort).skip(skip).limit(limit)
      .populate('theatre', 'name city address rows seatsPerRow')
      .populate('movie', 'title posterUrl duration certificate language'),
    Show.countDocuments(filter),
  ]);
  res.json({ success: true, data: shows.map(withSeatInfo), pagination: paginationMeta(page, limit, total) });
});

exports.getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('theatre', 'name city address rows seatsPerRow')
    .populate('movie', 'title posterUrl duration certificate language');
  if (!show) throw new ApiError(404, 'Show not found');
  res.json({ success: true, data: withSeatInfo(show) });
});

exports.createShow = asyncHandler(async (req, res) => {
  const { movie, theatre, startTime, price } = req.body;
  if (!(await Movie.exists({ _id: movie, isActive: true }))) throw new ApiError(404, 'Movie not found');
  if (!(await Theatre.exists({ _id: theatre }))) throw new ApiError(404, 'Theatre not found');
  if (new Date(startTime) <= new Date()) throw new ApiError(400, 'Show time must be in the future');
  await assertNoOverlap({ theatreId: theatre, startTime, movieId: movie });
  const show = await Show.create({ movie, theatre, startTime, price });
  res.status(201).json({ success: true, message: 'Show created', data: show });
});

exports.updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new ApiError(404, 'Show not found');
  const { movie, theatre, startTime, price } = req.body;
  const changesSchedule = movie || theatre || startTime;
  if (changesSchedule && show.bookedSeats.length) {
    throw new ApiError(409, 'Show already has bookings: only the price can be changed');
  }
  if (startTime && new Date(startTime) <= new Date()) throw new ApiError(400, 'Show time must be in the future');
  if (changesSchedule) {
    await assertNoOverlap({
      theatreId: theatre || show.theatre,
      startTime: startTime || show.startTime,
      movieId: movie || show.movie,
      ignoreId: show._id,
    });
  }
  if (movie) show.movie = movie;
  if (theatre) show.theatre = theatre;
  if (startTime) show.startTime = startTime;
  if (price !== undefined) show.price = price;
  await show.save();
  res.json({ success: true, message: 'Show updated', data: show });
});

exports.deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new ApiError(404, 'Show not found');
  if (show.bookedSeats.length) throw new ApiError(409, 'Show has bookings and cannot be deleted');
  await show.deleteOne();
  res.json({ success: true, message: 'Show deleted' });
});
