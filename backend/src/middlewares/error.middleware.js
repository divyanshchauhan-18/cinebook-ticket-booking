exports.notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || {})[0] || 'value'} already exists`;
  }
  if (err.name === 'CastError') { status = 400; message = 'Invalid ID format'; }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401; message = 'Invalid or expired token';
  }
  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2 MB)' : err.message;
  }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }

  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(err);

  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
