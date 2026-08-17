import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import { routes } from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));

  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
