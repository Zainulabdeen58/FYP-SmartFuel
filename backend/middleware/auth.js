import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  // Only a bad or expired token is a 401 (the frontend signs the user out on 401).
  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }

  // A database error here is not the user's fault: Express passes it to the
  // error handler (500), so users are not signed out during a database problem.
  const user = await User.findById(decoded.userId).select("-password");

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "User no longer exists" });
  }

  req.user = user;
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
}
