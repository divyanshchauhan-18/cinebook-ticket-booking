const { body } = require('express-validator');
const { MAX_SEATS_PER_BOOKING } = require('../config/constants');

exports.createBookingRules = [
  body('showId').isMongoId().withMessage('Valid show id required'),
  body('seats')
    .isArray({ min: 1, max: MAX_SEATS_PER_BOOKING })
    .withMessage(`Select 1 to ${MAX_SEATS_PER_BOOKING} seats`),
  body('seats.*').isString().matches(/^[A-Z]\d{1,2}$/).withMessage('Invalid seat label'),
];
