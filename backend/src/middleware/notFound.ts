import type { RequestHandler } from "express";
import { AppError } from "../lib/errors";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "NOT_FOUND", `No route found for ${request.method} ${request.path}.`));
};
