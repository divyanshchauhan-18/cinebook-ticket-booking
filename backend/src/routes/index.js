const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/movies', require('./movie.routes'));
router.use('/theatres', require('./theatre.routes'));
router.use('/shows', require('./show.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
