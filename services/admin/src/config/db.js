import { MongoClient } from "mongodb";

let client;
let db;

export const connectDb = async () => {
  if (db) return db;

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  db = client.db(process.env.DB_NAME || "Zomato_Clone");

  console.log("Admin service connected to mongodb");

  return db;
};
