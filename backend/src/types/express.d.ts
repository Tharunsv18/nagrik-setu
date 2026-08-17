import type { AuthTokenPayload } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthTokenPayload;
  }
}
