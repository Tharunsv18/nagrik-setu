import { Router } from "express";
import {
  listSchemesHandler,
  getSchemeHandler,
  getRelatedSchemesHandler,
} from "../controllers/scheme.controller";

export const schemeRoutes = Router();

// GET /api/schemes?q=&category=&state=&level=&limit=&offset=
schemeRoutes.get("/schemes", listSchemesHandler);

// GET /api/schemes/:id
schemeRoutes.get("/schemes/:id", getSchemeHandler);

// GET /api/schemes/:id/related
schemeRoutes.get("/schemes/:id/related", getRelatedSchemesHandler);
