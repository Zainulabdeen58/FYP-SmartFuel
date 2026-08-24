import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, "adfghjklmbxvxght");
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
}
