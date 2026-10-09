import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const tooMany = (message) => ({ success: false, message });

// Automated API tests send many requests from one IP; NODE_ENV=test turns the limits off.
const skip = () => process.env.NODE_ENV === "test";

// Slows password guessing: 10 failed logins per IP in 15 minutes, then 429.
// Successful logins don't count, so a user who gets it right isn't blocked.
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  skip,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany("Too many failed login attempts. Please try again in 15 minutes."),
});

// Stops one IP from creating accounts in bulk.
export const registerLimiter = rateLimit({
  windowMs: ONE_HOUR,
  limit: 10,
  skip,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany("Too many accounts created from this network. Please try again later."),
});
