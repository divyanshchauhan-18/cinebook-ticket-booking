const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, getSort, paginationMeta, escapeRegex } = require('../utils/queryHelpers');

exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const sort = getSort(req.query.sort, ['createdAt', 'name', 'email'], '-createdAt');
  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data: users, pagination: paginationMeta(page, limit, total) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone']; // whitelist: role/email cannot be changed here
  allowed.forEach((k) => { if (req.body[k] !== undefined) req.user[k] = req.body[k]; });
  await req.user.save();
  res.json({
    success: true,
    message: 'Profile updated',
    data: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role },
  });
});

exports.setUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) throw new ApiError(400, 'You cannot deactivate yourself');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isActive = Boolean(req.body.isActive);
  await user.save();
  res.json({ success: true, message: user.isActive ? 'User activated' : 'User deactivated', data: user });
});
