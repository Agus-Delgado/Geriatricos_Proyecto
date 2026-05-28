import { Hono } from "hono";
import { createCorsMiddleware } from "./middleware/cors";
import { authRouter } from "./modules/auth";
import { facilitiesRouter } from "./modules/facilities";
import { certificatesRouter } from "./modules/certificates";
import {
  medicationPlansRouter,
  medicationTimesRouter
} from "./modules/medications";
import { residentsRouter } from "./modules/residents";
import type { AppContext } from "./types/env";

const app = new Hono<AppContext>();

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

app.route("/auth", authRouter);
app.route("/facilities", facilitiesRouter);
app.route("/certificates", certificatesRouter);
app.route("/residents", residentsRouter);
app.route("/medication-plans", medicationPlansRouter);
app.route("/medication-times", medicationTimesRouter);

export default app;
