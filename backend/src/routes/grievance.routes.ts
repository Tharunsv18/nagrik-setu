import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import {
  createGrievanceHandler,
  listGrievancesHandler,
  getGrievanceHandler,
} from "../controllers/grievance.controller";

export const grievanceRoutes = Router();

// All /api/grievances routes require a valid access token
grievanceRoutes.use("/grievances", authGuard);

// POST /api/grievances
grievanceRoutes.post("/grievances", createGrievanceHandler);

// GET /api/grievances
grievanceRoutes.get("/grievances", listGrievancesHandler);

// GET /api/grievances/:id
grievanceRoutes.get("/grievances/:id", getGrievanceHandler);
