// Safe pagination + sorting helpers shared by list endpoints.
exports.getPagination = (query, defaultLimit = 10, maxLimit = 50) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// Only allow sorting by whitelisted fields, e.g. ?sort=-createdAt,title
exports.getSort = (sortParam, allowed, fallback) => {
  if (!sortParam) return fallback;
  const parts = String(sortParam)
    .split(',')
    .filter((f) => allowed.includes(f.replace(/^-/, '')));
  return parts.length ? parts.join(' ') : fallback;
};

exports.paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
});

// Escape user text before using it inside a RegExp
exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
