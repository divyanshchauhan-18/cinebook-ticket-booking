const mongoose = require('mongoose');

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Theatre name is required'], trim: true, maxlength: 80 },
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 50 },
    address: { type: String, trim: true, maxlength: 200, default: '' },
    rows: { type: Number, required: true, min: 1, max: 26, default: 8 },
    seatsPerRow: { type: Number, required: true, min: 1, max: 30, default: 10 },
  },
  { timestamps: true }
);

theatreSchema.index({ city: 1 });

module.exports = mongoose.model('Theatre', theatreSchema);
