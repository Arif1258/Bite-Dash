import mongoose from "mongoose";

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  connectionPromise ??= mongoose
    .connect(process.env.MONGO_URI, { dbName: "Zomato_Clone" })
    .then((connection) => {
      console.log("connected to mongodb (restaurant service)");
      return connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
};

export default connectDB;
