import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Applies all SQL files under cloudflare-worker/migrations/ (0001–0005+).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
