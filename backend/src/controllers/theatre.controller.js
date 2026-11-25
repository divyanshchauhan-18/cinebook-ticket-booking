const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/queryHelpers');

const FIELDS = ['name', 'city', 'address', 'rows', 'seatsPerRow'];
const pick = (body) => FIELDS.reduce((o, k) => (body[k] !== undefined ? { ...o, [k]: body[k] } : o), {});

exports.getTheatres = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter.city = new RegExp(`^${escapeRegex(req.query.city)}$`, 'i');
  const theatres = await Theatre.find(filter).sort('city name');
  res.json({ success: true, data: theatres });
});

exports.getCities = asyncHandler(async (req, res) => {
  res.json({ success: true, data: (await Theatre.distinct('city')).sort() });
});

exports.createTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.create(pick(req.body));
  res.status(201).json({ success: true, message: 'Theatre created', data: theatre });
});

exports.updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new ApiError(404, 'Theatre not found');
  const data = pick(req.body);
  if ((data.rows || data.seatsPerRow) && (await Show.exists({ theatre: theatre._id, 'bookedSeats.0': { $exists: true } }))) {
    throw new ApiError(409, 'Cannot change seat layout: shows already have bookings');
  }
  Object.assign(theatre, data);
  await theatre.save();
  res.json({ success: true, message: 'Theatre updated', data: theatre });
});

exports.deleteTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new ApiError(404, 'Theatre not found');
  if (await Show.exists({ theatre: theatre._id, startTime: { $gte: new Date() } })) {
    throw new ApiError(409, 'Theatre has upcoming shows. Delete those first.');
  }
  await theatre.deleteOne();
  res.json({ success: true, message: 'Theatre deleted' });
});
