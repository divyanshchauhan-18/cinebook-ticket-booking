const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // extension comes from the checked MIME type, never from the user's filename
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ALLOWED[file.mimetype]}`),
});

const fileFilter = (req, file, cb) =>
  ALLOWED[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WEBP images allowed'));

module.exports = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
