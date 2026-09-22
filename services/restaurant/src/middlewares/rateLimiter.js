// High-performance in-memory sliding-window rate limiter
const memoryStore = new Map();

// Cleanup expired memory store items every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetTime < now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

export const rateLimiter = ({ limit, windowSeconds = 60, type = "general" }) => {
  return async (req, res, next) => {
    const identifier = req.user?._id?.toString() || req.ip;
    const key = `rate:${type}:${identifier}`;
    const now = Date.now();
    const record = memoryStore.get(key) || { count: 0, resetTime: now + windowSeconds * 1000 };

    if (record.resetTime < now) {
      record.count = 0;
      record.resetTime = now + windowSeconds * 1000;
    }

    record.count += 1;
    memoryStore.set(key, record);

    const remaining = Math.max(0, limit - record.count);
    const retryAfter = Math.round((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.round(record.resetTime / 1000));

    if (record.count > limit) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded for ${type}. Please try again later.`,
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
};
