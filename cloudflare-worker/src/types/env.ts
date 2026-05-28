import type { JwtPayload } from "../modules/auth/jwt";

export type Env = {
  CORS_ORIGINS?: string;
  ENVIRONMENT?: "development" | "staging" | "production";
  JWT_SECRET?: string;
  JWT_EXPIRES_IN_SECONDS?: string;
  DB?: D1Database;
};

export type AppContext = {
  Bindings: Env;
  Variables: {
    jwtPayload: JwtPayload;
  };
};
