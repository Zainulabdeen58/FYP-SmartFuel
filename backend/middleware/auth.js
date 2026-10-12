import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  // Only token errors are 401, because the frontend signs the user out on 401.
  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }

  // A database error goes to the error handler (500), so users aren't signed out during an outage.
  const user = await User.findById(decoded.userId).select("-password");

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "User no longer exists" });
  }

  req.user = user;
  next();
}

// The opposite of adminOnly: answers admins with 403 and this message. Used for what admins
// don't have (budgets, crisis mode) or may only look at (trips).
export function nonAdminOnly(message) {
  return (req, res, next) => {
    if (req.user?.role === "Admin") return res.status(403).json({ success: false, message });
    next();
  };
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
}
