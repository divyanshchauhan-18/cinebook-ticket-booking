const router = require('express').Router();
const { getStats } = require('../controllers/dashboard.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

router.get('/stats', protect, restrictTo('admin'), getStats);

module.exports = router;
