const router = require('express').Router();
const c = require('../controllers/movie.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');
const { createMovieRules, updateMovieRules } = require('../validators/movie.validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// optional auth: lets admins see inactive movies, everyone else is anonymous
const optionalAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) {
      const decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (e) { /* ignore: treated as guest */ }
  next();
};

router.get('/', optionalAuth, c.getMovies);
router.get('/filters', c.getFilters);
router.get('/:id', c.getMovie);

router.use(protect, restrictTo('admin'));
router.post('/', createMovieRules, validate, c.createMovie);
router.put('/:id', updateMovieRules, validate, c.updateMovie);
router.delete('/:id', c.deleteMovie);
router.post('/:id/poster', upload.single('poster'), c.uploadPoster);

module.exports = router;
