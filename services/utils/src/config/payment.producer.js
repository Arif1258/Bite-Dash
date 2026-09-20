import { getChannel } from "./rabbitmq.js";

export const publishPaymentSuccess = async (payload) => {
  try {
    const channel = getChannel();
    if (!channel) {
      console.warn("⚠️ RabbitMQ channel unavailable, skipping payment queue publish");
      return;
    }

    channel.sendToQueue(
      process.env.PAYMENT_QUEUE,
      Buffer.from(
        JSON.stringify({
          type: "PAYMENT_SUCCESS",
          data: payload,
        }),
      ),
      { persistent: true },
    );
  } catch (err) {
    console.warn("⚠️ Failed to publish payment success event to RabbitMQ:", err.message);
  }
};
