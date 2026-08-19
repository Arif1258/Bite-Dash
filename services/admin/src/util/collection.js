import { connectDb } from "../config/db.js";

export const getRestaurantCollection = async () => {
  const db = await connectDb();

  return db.collection("restaurants");
};

export const getRiderCollection = async () => {
  const db = await connectDb();

  return db.collection("riders");
};

export const getOrderCollection = async () => {
  const db = await connectDb();
  return db.collection("orders");
};
