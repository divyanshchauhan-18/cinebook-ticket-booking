const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    startTime: { type: Date, required: [true, 'Start time is required'] },
    price: { type: Number, required: [true, 'Ticket price is required'], min: 0 },
    bookedSeats: { type: [String], default: [] },
  },
  { timestamps: true }
);

showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ theatre: 1, startTime: 1 });

module.exports = mongoose.model('Show', showSchema);
