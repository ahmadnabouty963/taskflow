import { rateLimit } from "express-rate-limit";

function createRateLimitHandler(message) {
  return (request, response) => {
    return response.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message,
      },
    });
  };
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT_MAX ?? 100),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many requests. Please try again later."),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many authentication attempts. Please try again later.",
  ),
});
