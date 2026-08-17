import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { healthRoutes } from "./health.routes";
import { otpRoutes } from "./otp.routes";
import { userRoutes } from "./user.routes";
import { schemeRoutes } from "./scheme.routes";
import { applicationRoutes } from "./application.routes";
import { grievanceRoutes } from "./grievance.routes";
import { notificationRoutes } from "./notification.routes";

export const routes = Router();

// Health check — no prefix (GET /health)
routes.use(healthRoutes);

// Auth API — /api/auth/...
routes.use("/api", authRoutes);

// User profile — /api/user/profile  (requires auth)
routes.use("/api", userRoutes);

// Schemes — /api/schemes (public read-only)
routes.use("/api", schemeRoutes);

// Applications — /api/applications  (requires auth)
routes.use("/api", applicationRoutes);

// Grievances — /api/grievances  (requires auth)
routes.use("/api", grievanceRoutes);

// Notifications — /api/notifications  (requires auth)
routes.use("/api", notificationRoutes);

// Legacy OTP route (POST /api/auth/otp/request) — kept for backward compatibility
routes.use("/api", otpRoutes);
