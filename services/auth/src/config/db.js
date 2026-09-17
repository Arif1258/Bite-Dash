import mongoose from "mongoose";

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  // A Vercel function can receive several requests while its first connection
  // is still opening. Reuse that connection rather than starting one per request.
  connectionPromise ??= mongoose
    .connect(process.env.MONGO_URI, { dbName: "Zomato_Clone" })
    .then((connection) => {
      console.log("connected to mongodb");
      return connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
};

export default connectDB;
