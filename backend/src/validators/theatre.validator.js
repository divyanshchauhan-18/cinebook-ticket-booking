const { body } = require('express-validator');

const make = (optional) => {
  const f = (name) => (optional ? body(name).optional() : body(name));
  return [
    f('name').trim().notEmpty().withMessage('Theatre name required'),
    f('city').trim().notEmpty().withMessage('City required'),
    f('rows').isInt({ min: 1, max: 26 }).withMessage('Rows must be 1-26'),
    f('seatsPerRow').isInt({ min: 1, max: 30 }).withMessage('Seats per row must be 1-30'),
  ];
};
exports.createTheatreRules = make(false);
exports.updateTheatreRules = make(true);
