import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, createErrorBody } from "../lib/errors";

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(400, "VALIDATION_ERROR", "The request payload is invalid.", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof SyntaxError) {
    return new AppError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }

  return new AppError(500, "INTERNAL_SERVER_ERROR", "Something went wrong.");
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const appError = normalizeError(error);
  response.status(appError.statusCode).json(createErrorBody(appError));
};
