import { Hono } from "hono";
import { createCorsMiddleware } from "./middleware/cors";
import type { Env } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const corsMiddleware = createCorsMiddleware(c.env);
  return corsMiddleware(c, next);
});

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "geriatricos-worker"
  });
});

export default app;
