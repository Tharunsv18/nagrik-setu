import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { getProfileHandler, updateProfileHandler } from "../controllers/user.controller";

export const userRoutes = Router();

// All /api/user routes require a valid access token
userRoutes.use("/user", authGuard);

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile (id, uniqueId, displayName, email, phone).
 */
userRoutes.get("/user/profile", getProfileHandler);

/**
 * PATCH /api/user/profile
 * Updates the authenticated user's phone number only.
 * name and email fields in the body are silently ignored.
 */
userRoutes.patch("/user/profile", updateProfileHandler);
