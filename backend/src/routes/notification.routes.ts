import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import {
  listNotificationsHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
} from "../controllers/notification.controller";

export const notificationRoutes = Router();

// All /api/notifications routes require a valid access token
notificationRoutes.use("/notifications", authGuard);

// GET /api/notifications
notificationRoutes.get("/notifications", listNotificationsHandler);

// GET /api/notifications/unread-count
notificationRoutes.get("/notifications/unread-count", unreadCountHandler);

// PATCH /api/notifications/read-all
notificationRoutes.patch("/notifications/read-all", markAllReadHandler);

// PATCH /api/notifications/:id/read
notificationRoutes.patch("/notifications/:id/read", markReadHandler);
