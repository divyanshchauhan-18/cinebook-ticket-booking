const router = require('express').Router();
const c = require('../controllers/show.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createShowRules, updateShowRules } = require('../validators/show.validator');

router.get('/', c.getShows);
router.get('/:id', c.getShow);

router.use(protect, restrictTo('admin'));
router.post('/', createShowRules, validate, c.createShow);
router.put('/:id', updateShowRules, validate, c.updateShow);
router.delete('/:id', c.deleteShow);

module.exports = router;
