const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');
  // role is NEVER taken from the body: everyone who registers is a normal user
  const user = await User.create({ name, email, password, phone });
  res.status(201).json({
    success: true,
    message: 'Registered successfully',
    data: { token: generateToken(user._id), user: publicUser(user) },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(401, 'Account is deactivated');
  res.json({
    success: true,
    message: 'Logged in',
    data: { token: generateToken(user._id), user: publicUser(user) },
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: publicUser(req.user) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});
