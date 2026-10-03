import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

await connectDB();

const app = express();
app.use(cors());
app.use(express.json());
// Express 5 leaves req.body undefined when a request has no JSON body;
// default it so controllers can always destructure it.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Fuel API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
