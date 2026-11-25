const mongoose = require('mongoose');
const { MOVIE_STATUS } = require('../config/constants');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    genres: [{ type: String, trim: true }],
    language: { type: String, required: true, trim: true, default: 'English' },
    duration: { type: Number, required: [true, 'Duration (minutes) is required'], min: 20, max: 400 },
    certificate: { type: String, enum: ['U', 'UA', 'A', 'PG', 'PG-13', 'R'], default: 'UA' },
    releaseDate: { type: Date, required: true },
    posterUrl: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    cast: [{ type: String, trim: true }],
    director: { type: String, trim: true, default: '' },
    status: { type: String, enum: MOVIE_STATUS, default: 'now-showing' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
movieSchema.index({ status: 1, releaseDate: -1 });

module.exports = mongoose.model('Movie', movieSchema);
