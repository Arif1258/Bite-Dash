import Redis from "ioredis";

let redisClient;
let isRedisConnected = false;

try {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Do not retry continuously on connection failure
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("🚀 Connected to Redis successfully");
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    console.warn("⚠️ Redis Connection Error:", err.message);
  });
} catch (err) {
  console.warn("⚠️ Failed to initialize Redis client:", err.message);
}

export const getRedisClient = () => {
  if (isRedisConnected && redisClient) {
    return redisClient;
  }
  return null;
};
