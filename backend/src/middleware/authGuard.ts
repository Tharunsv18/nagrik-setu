import type { RequestHandler } from "express";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../services/auth.service";

export const authGuard: RequestHandler = (request, _response, next) => {
  const header = request.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "AUTH_REQUIRED", "A valid bearer token is required."));
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    next(new AppError(401, "AUTH_REQUIRED", "A valid bearer token is required."));
    return;
  }

  try {
    request.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
