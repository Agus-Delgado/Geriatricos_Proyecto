import { cors } from "hono/cors";
import type { Env } from "../types/env";
import { getAllowedCorsOrigins } from "../config/env";

export function createCorsMiddleware(env: Env) {
  const allowedOrigins = getAllowedCorsOrigins(env);

  return cors({
    origin: (origin) => {
      if (!origin) {
        return allowedOrigins[0] ?? "*";
      }

      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      return "";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    credentials: true
  });
}
