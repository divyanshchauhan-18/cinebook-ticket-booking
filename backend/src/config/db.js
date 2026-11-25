const mongoose = require('mongoose');

module.exports = async function connectDB(uri = process.env.MONGO_URI) {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
