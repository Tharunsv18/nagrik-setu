import cors from "cors";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

/** In development, accept any localhost/127.0.0.1 origin (any port). */
const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const corsMiddleware = cors({
  credentials: true,
  origin(origin, callback) {
    // Allow requests with no Origin header (curl, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    // In development, accept any local origin regardless of port
    if (env.NODE_ENV !== "production" && DEV_ORIGIN_RE.test(origin)) {
      callback(null, true);
      return;
    }

    // In production, only accept the configured origin
    if (env.NODE_ENV === "production" && origin === env.FRONTEND_ORIGIN) {
      callback(null, true);
      return;
    }

    callback(
      new AppError(403, "CORS_ORIGIN_DENIED", "The request origin is not allowed.", {
        origin,
      }),
    );
  },
});
