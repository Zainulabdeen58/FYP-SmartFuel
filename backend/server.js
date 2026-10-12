import express from "express";
import cors from "cors";
import helmet from "helmet";
import checkEnv from "./config/env.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import fuelRecordRoutes from "./routes/fuelRecordRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import placeRoutes from "./routes/placeRoutes.js";
import crisisRoutes from "./routes/crisisRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

checkEnv();
await connectDB();

const app = express();
// Security headers (also removes X-Powered-By).
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
// Express 5 leaves req.body undefined when there is no JSON body; default it to {}.
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
app.use("/api/fuel-records", fuelRecordRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/crisis", crisisRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));