const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 6 * 86400000);
  since.setHours(0, 0, 0, 0);

  const [users, movies, theatres, upcomingShows, confirmed, cancelled, revenueAgg, byDay, topMovies] =
    await Promise.all([
      User.countDocuments(),
      Movie.countDocuments({ isActive: true }),
      Theatre.countDocuments(),
      Show.countDocuments({ startTime: { $gte: new Date() } }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, tickets: { $sum: { $size: '$seats' } } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'show' } },
        { $unwind: '$show' },
        { $group: { _id: '$show.movie', tickets: { $sum: { $size: '$seats' } }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { tickets: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
        { $unwind: '$movie' },
        { $project: { _id: 0, movieId: '$_id', title: '$movie.title', tickets: 1, revenue: 1 } },
      ]),
    ]);

  res.json({
    success: true,
    data: {
      users, movies, theatres, upcomingShows,
      bookings: { confirmed, cancelled },
      revenue: revenueAgg[0] ? revenueAgg[0].revenue : 0,
      ticketsSold: revenueAgg[0] ? revenueAgg[0].tickets : 0,
      byDay, topMovies,
    },
  });
});
