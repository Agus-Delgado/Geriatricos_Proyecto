/// <reference types="@cloudflare/vitest-pool-workers/types" />

type TestD1Migration = {
  name: string;
  queries: string[];
};

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    JWT_EXPIRES_IN_SECONDS: string;
    CORS_ORIGINS: string;
    ENVIRONMENT: string;
    TEST_MIGRATIONS: TestD1Migration[];
  }
}
