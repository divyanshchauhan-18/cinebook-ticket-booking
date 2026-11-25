module.exports = {
  ROLES: { USER: 'user', ADMIN: 'admin' },
  MOVIE_STATUS: ['now-showing', 'upcoming', 'ended'],
  BOOKING_STATUS: { CONFIRMED: 'confirmed', CANCELLED: 'cancelled' },
  MAX_SEATS_PER_BOOKING: 8,
  CANCEL_BEFORE_MINUTES: 60, // cannot cancel within 1 hour of showtime
};
