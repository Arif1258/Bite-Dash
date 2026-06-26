import amqp from "amqplib";

let channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);

    channel = await connection.createChannel();

    await channel.assertQueue(process.env.PAYMENT_QUEUE, {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq");
  } catch (error) {
    console.warn("⚠️ RabbitMQ Connection Failed:", error.message);
  }
};

export const getChannel = () => channel;
