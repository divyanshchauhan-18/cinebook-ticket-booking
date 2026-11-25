const { body } = require('express-validator');
const { MOVIE_STATUS } = require('../config/constants');

const create = (optional) => {
  const chain = (field) => (optional ? body(field).optional() : body(field));
  return [
    chain('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
    chain('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
    chain('duration').isInt({ min: 20, max: 400 }).withMessage('Duration must be 20-400 minutes'),
    chain('releaseDate').isISO8601().withMessage('Valid release date required'),
    body('status').optional().isIn(MOVIE_STATUS).withMessage(`Status must be one of ${MOVIE_STATUS.join(', ')}`),
    body('genres').optional(),
    body('cast').optional(),
  ];
};

exports.createMovieRules = create(false);
exports.updateMovieRules = create(true);
