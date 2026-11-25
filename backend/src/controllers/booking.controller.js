const crypto = require('crypto');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isValidSeat } = require('../utils/seats');
const { getPagination, paginationMeta } = require('../utils/queryHelpers');
const { BOOKING_STATUS, CANCEL_BEFORE_MINUTES, MAX_SEATS_PER_BOOKING } = require('../config/constants');

const populateBooking = (q) =>
  q.populate({
    path: 'show',
    select: 'startTime price movie theatre',
    populate: [
      { path: 'movie', select: 'title posterUrl duration certificate language' },
      { path: 'theatre', select: 'name city address' },
    ],
  });

const makeCode = () => `CB${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

exports.createBooking = asyncHandler(async (req, res) => {
  const { showId, seats } = req.body;
  const uniqueSeats = [...new Set(seats)];
  if (uniqueSeats.length > MAX_SEATS_PER_BOOKING) throw new ApiError(400, `Maximum ${MAX_SEATS_PER_BOOKING} seats per booking`);

  const show = await Show.findById(showId).populate('theatre');
  if (!show) throw new ApiError(404, 'Show not found');
  if (show.startTime <= new Date()) throw new ApiError(400, 'This show has already started');

  const { rows, seatsPerRow } = show.theatre;
  const bad = uniqueSeats.find((s) => !isValidSeat(s, rows, seatsPerRow));
  if (bad) throw new ApiError(400, `Seat ${bad} does not exist in this theatre`);

  // ATOMIC reservation: succeeds only if none of the requested seats are taken yet.
  // Two people clicking the same seat at once cannot both win.
  const reserved = await Show.findOneAndUpdate(
    { _id: showId, bookedSeats: { $nin: uniqueSeats } },
    { $push: { bookedSeats: { $each: uniqueSeats } } },
    { new: true }
  );
  if (!reserved) throw new ApiError(409, 'Some of the selected seats were just booked. Please pick different seats.');

  try {
    const booking = await Booking.create({
      bookingCode: makeCode(),
      user: req.user._id,
      show: showId,
      seats: uniqueSeats,
      totalAmount: show.price * uniqueSeats.length,
    });
    const full = await populateBooking(Booking.findById(booking._id));
    res.status(201).json({ success: true, message: 'Booking confirmed', data: full });
  } catch (err) {
    // roll back seats if the booking document could not be saved
    await Show.updateOne({ _id: showId }, { $pull: { bookedSeats: { $in: uniqueSeats } } });
    throw err;
  }
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10);
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [bookings, total] = await Promise.all([
    populateBooking(Booking.find(filter).sort('-createdAt').skip(skip).limit(limit)),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, data: bookings, pagination: paginationMeta(page, limit, total) });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (!booking.user.equals(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  res.json({ success: true, data: booking });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  const isAdmin = req.user.role === 'admin';
  if (!booking.user.equals(req.user._id) && !isAdmin) throw new ApiError(403, 'Not allowed');
  if (booking.status === BOOKING_STATUS.CANCELLED) throw new ApiError(400, 'Booking is already cancelled');

  const show = await Show.findById(booking.show);
  if (show && !isAdmin) {
    const limit = new Date(show.startTime.getTime() - CANCEL_BEFORE_MINUTES * 60000);
    if (new Date() > limit) throw new ApiError(400, `Bookings cannot be cancelled within ${CANCEL_BEFORE_MINUTES} minutes of the show`);
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  await booking.save();
  if (show) await Show.updateOne({ _id: show._id }, { $pull: { bookedSeats: { $in: booking.seats } } });
  res.json({ success: true, message: 'Booking cancelled. Seats released.', data: booking });
});

// admin: all bookings
exports.getAllBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [bookings, total] = await Promise.all([
    populateBooking(Booking.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('user', 'name email')),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, data: bookings, pagination: paginationMeta(page, limit, total) });
});
