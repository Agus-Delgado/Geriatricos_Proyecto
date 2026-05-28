export type Env = {
  CORS_ORIGINS?: string;
  ENVIRONMENT?: "development" | "staging" | "production";
  DB?: D1Database;
};
