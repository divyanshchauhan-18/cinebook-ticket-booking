const router = require('express').Router();
const c = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createBookingRules } = require('../validators/booking.validator');

router.use(protect);
router.post('/', createBookingRules, validate, c.createBooking);
router.get('/my', c.getMyBookings);
router.get('/', restrictTo('admin'), c.getAllBookings);
router.get('/:id', c.getBooking);
router.put('/:id/cancel', c.cancelBooking);

module.exports = router;
