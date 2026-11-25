const router = require('express').Router();
const c = require('../controllers/theatre.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTheatreRules, updateTheatreRules } = require('../validators/theatre.validator');

router.get('/', c.getTheatres);
router.get('/cities', c.getCities);

router.use(protect, restrictTo('admin'));
router.post('/', createTheatreRules, validate, c.createTheatre);
router.put('/:id', updateTheatreRules, validate, c.updateTheatre);
router.delete('/:id', c.deleteTheatre);

module.exports = router;
