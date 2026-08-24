import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017");
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}
