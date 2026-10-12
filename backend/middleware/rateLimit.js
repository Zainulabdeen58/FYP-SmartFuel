import { rateLimit } from "express-rate-limit";

const TEN_MINUTES = 10 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const tooMany = (message) => ({ success: false, message });

// NODE_ENV=test turns the limits off for automated API tests.
const skip = () => process.env.NODE_ENV === "test";

// Counted per signed-in user (these routes run after protect).
const byUser = (req) => String(req.user._id);

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

// The route service's free quota is shared by all users, so one user can't use it up.
export const placeLimiter = rateLimit({
  windowMs: TEN_MINUTES,
  limit: 30,
  keyGenerator: byUser,
  skip,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany("Too many place searches. Please wait a few minutes."),
});

export const routeLimiter = rateLimit({
  windowMs: TEN_MINUTES,
  limit: 20,
  keyGenerator: byUser,
  skip,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany("Too many trip changes. Please wait a few minutes."),
});
