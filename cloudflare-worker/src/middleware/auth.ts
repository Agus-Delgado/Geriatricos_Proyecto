import { createMiddleware } from "hono/factory";
import { verifyJwt, type JwtPayload } from "../modules/auth/jwt";
import type { AppContext } from "../types/env";

export const requireAuth = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ detail: "Not authenticated" }, 401);
  }

  if (!c.env.JWT_SECRET) {
    return c.json({ detail: "Server auth config missing" }, 500);
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }

  c.set("jwtPayload", payload as JwtPayload);
  await next();
});
