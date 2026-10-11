import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const tooMany = (message) => ({ success: false, message });

// NODE_ENV=test turns the limits off for automated API tests.
const skip = () => process.env.NODE_ENV === "test";

// Slows password guessing; successful logins don't count.
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
