/**
 * Notification controller
 * GET   /api/notifications               — list (latest 50)
 * GET   /api/notifications/unread-count  — unread badge count
 * PATCH /api/notifications/:id/read      — mark one as read
 * PATCH /api/notifications/read-all      — mark all as read
 */

import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/data.service";

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  const notifications = await listNotifications(userId);
  res.json({ success: true, notifications });
});

export const unreadCountHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  const count = await getUnreadCount(userId);
  res.json({ success: true, count });
});

export const markReadHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.auth!;
  const { id } = req.params;
  const notif = await markNotificationRead(id as string, userId);
  if (!notif) {
    return next(new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found."));
  }
  res.json({ success: true, notification: notif });
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  await markAllNotificationsRead(userId);
  res.json({ success: true });
});
