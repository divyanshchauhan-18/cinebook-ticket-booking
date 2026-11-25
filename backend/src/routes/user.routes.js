const router = require('express').Router();
const c = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { profileRules } = require('../validators/auth.validator');

router.use(protect);
router.put('/profile', profileRules, validate, c.updateProfile);
router.get('/', restrictTo('admin'), c.getUsers);
router.patch('/:id/status', restrictTo('admin'), c.setUserStatus);

module.exports = router;
