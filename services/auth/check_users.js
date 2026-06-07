import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/tomato?appName=Cluster0";

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log("Collections:");
  for (let col of collections) {
    const docs = await db.collection(col.name).find().toArray();
    console.log(`- Collection ${col.name} has ${docs.length} documents.`);
    if (docs.length > 0) {
      console.log(JSON.stringify(docs.slice(0, 3), null, 2));
    }
  }
  await mongoose.disconnect();
}

check().catch(console.error);
