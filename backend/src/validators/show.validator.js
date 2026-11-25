const { body } = require('express-validator');

exports.createShowRules = [
  body('movie').isMongoId().withMessage('Valid movie id required'),
  body('theatre').isMongoId().withMessage('Valid theatre id required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
];

exports.updateShowRules = [
  body('movie').optional().isMongoId(),
  body('theatre').optional().isMongoId(),
  body('startTime').optional().isISO8601().withMessage('Valid start time required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
];
