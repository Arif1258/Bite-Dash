import amqp from "amqplib";

let channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);

    channel = await connection.createChannel();

    await channel.assertQueue(process.env.RIDER_QUEUE, {
      durable: true,
    });
    await channel.assertQueue(process.env.ORDER_READY_QUEUE, {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq(rider service)");
  } catch (error) {
    console.warn("⚠️ RabbitMQ Connection Failed:", error.message);
  }
};

export const getChannel = () => channel;
