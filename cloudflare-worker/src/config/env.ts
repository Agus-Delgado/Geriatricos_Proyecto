import type { Env } from "../types/env";

const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

export function getAllowedCorsOrigins(env: Env): string[] {
  const configured = env.CORS_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (configured && configured.length > 0) {
    return configured;
  }

  return DEFAULT_LOCAL_ORIGINS;
}
