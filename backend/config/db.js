import mongoose from "mongoose";
import dns from "node:dns";

// mongodb+srv:// needs an SRV DNS lookup. Node's default resolver can be
// refused on some Windows/ISP setups, so point it at public DNS servers.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not set. Create backend/.env from .env.example.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
