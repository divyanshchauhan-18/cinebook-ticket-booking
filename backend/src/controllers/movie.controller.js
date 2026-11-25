const Movie = require('../models/Movie');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, getSort, paginationMeta, escapeRegex } = require('../utils/queryHelpers');

const toArray = (v) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

const FIELDS = ['title', 'description', 'language', 'duration', 'certificate', 'releaseDate',
  'posterUrl', 'trailerUrl', 'director', 'status'];

const pickMovieFields = (body) => {
  const data = {};
  FIELDS.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });
  if (body.genres !== undefined) data.genres = toArray(body.genres);
  if (body.cast !== undefined) data.cast = toArray(body.cast);
  return data;
};

exports.getMovies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 12);
  const { search, genre, language, status } = req.query;
  const filter = req.user && req.user.role === 'admin' && req.query.includeInactive === 'true'
    ? {} : { isActive: true };
  if (status) filter.status = status;
  if (genre) filter.genres = new RegExp(`^${escapeRegex(genre)}$`, 'i');
  if (language) filter.language = new RegExp(`^${escapeRegex(language)}$`, 'i');
  if (search) filter.title = new RegExp(escapeRegex(search), 'i');

  const sort = getSort(req.query.sort, ['releaseDate', 'title', 'duration', 'createdAt'], '-releaseDate');
  const [movies, total] = await Promise.all([
    Movie.find(filter).sort(sort).skip(skip).limit(limit),
    Movie.countDocuments(filter),
  ]);
  res.json({ success: true, data: movies, pagination: paginationMeta(page, limit, total) });
});

// handy for filter dropdowns
exports.getFilters = asyncHandler(async (req, res) => {
  const [genres, languages] = await Promise.all([
    Movie.distinct('genres', { isActive: true }),
    Movie.distinct('language', { isActive: true }),
  ]);
  res.json({ success: true, data: { genres: genres.sort(), languages: languages.sort() } });
});

exports.getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie || !movie.isActive) throw new ApiError(404, 'Movie not found');
  res.json({ success: true, data: movie });
});

exports.createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create({ ...pickMovieFields(req.body), createdBy: req.user._id });
  res.status(201).json({ success: true, message: 'Movie created', data: movie });
});

exports.updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new ApiError(404, 'Movie not found');
  Object.assign(movie, pickMovieFields(req.body));
  await movie.save();
  res.json({ success: true, message: 'Movie updated', data: movie });
});

// soft delete keeps old bookings readable
exports.deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new ApiError(404, 'Movie not found');
  const upcoming = await Show.countDocuments({ movie: movie._id, startTime: { $gte: new Date() }, 'bookedSeats.0': { $exists: true } });
  if (upcoming) throw new ApiError(409, 'Movie has upcoming shows with bookings. Cancel them first.');
  movie.isActive = false;
  await movie.save();
  res.json({ success: true, message: 'Movie removed' });
});

exports.uploadPoster = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Poster image is required');
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new ApiError(404, 'Movie not found');
  movie.posterUrl = `/uploads/${req.file.filename}`;
  await movie.save();
  res.json({ success: true, message: 'Poster uploaded', data: movie });
});
