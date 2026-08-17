import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import {
  createApplicationHandler,
  listApplicationsHandler,
  getApplicationHandler,
} from "../controllers/application.controller";

export const applicationRoutes = Router();

// All /api/applications routes require a valid access token
applicationRoutes.use("/applications", authGuard);

// POST /api/applications
applicationRoutes.post("/applications", createApplicationHandler);

// GET /api/applications
applicationRoutes.get("/applications", listApplicationsHandler);

// GET /api/applications/:id
applicationRoutes.get("/applications/:id", getApplicationHandler);
