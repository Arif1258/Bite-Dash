import { getChannel } from "./rabbitmq.js";

export const publishEvent = async (type, data) => {
  const channel = getChannel();

  channel.sendToQueue(
    process.env.ORDER_READY_QUEUE,
    Buffer.from(JSON.stringify({ type, data })),
    { persistent: true },
  );
};

export const publishOrderLifecycleEvent = async (type, data) => {
  try {
    const channel = getChannel();
    if (!channel) {
      console.warn("⚠️ RabbitMQ channel not available for publishing event:", type);
      return;
    }
    channel.sendToQueue(
      "order_events_queue",
      Buffer.from(JSON.stringify({ type, data, timestamp: new Date() })),
      { persistent: true }
    );
    console.log(`🐇 Published event ${type} to order_events_queue`);
  } catch (err) {
    console.error("❌ Failed to publish lifecycle event:", err);
  }
};
