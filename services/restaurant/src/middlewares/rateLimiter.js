import { getRedisClient } from "../utils/redis.js";

// Local in-memory fallback store
const memoryStore = new Map();

// Cleanup expired memory store items occasionally
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
    const redis = getRedisClient();

    if (redis) {
      try {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }

        const ttl = await redis.ttl(key);
        res.setHeader("X-RateLimit-Limit", limit);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));
        res.setHeader("X-RateLimit-Reset", Math.round(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds));

        if (count > limit) {
          return res.status(429).json({
            error: "Too Many Requests",
            message: `Rate limit exceeded for ${type}. Please try again later.`,
            retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
          });
        }
        return next();
      } catch (err) {
        console.error("Redis rate limiter error, falling back to memory:", err);
      }
    }

    // In-Memory Fallback Rate Limiter
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
