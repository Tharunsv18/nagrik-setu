import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors";

interface ValidationSchema {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

function parseSchema(schema: ZodType, value: unknown) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "The request payload is invalid.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
}

export function validate(schema: ValidationSchema): RequestHandler {
  return (request, _response, next) => {
    try {
      if (schema.body) {
        request.body = parseSchema(schema.body, request.body);
      }

      if (schema.params) {
        parseSchema(schema.params, request.params);
      }

      if (schema.query) {
        parseSchema(schema.query, request.query);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
