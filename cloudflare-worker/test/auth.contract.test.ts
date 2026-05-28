import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const WRONG_PASSWORD = "WrongPassword!";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type MeResponse = {
  id: string;
  email: string | null;
  dni: string | null;
  full_name: string;
  is_active: boolean;
  active_facility_id: string | null;
  roles: Array<{ code: string }>;
  memberships: Array<{ role: string; facility_id: string }>;
};

async function postLogin(username: string, password: string): Promise<Response> {
  return SELF.fetch("http://localhost/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

describe("auth contract", () => {
  it("POST /auth/login returns bearer token for valid demo credentials", async () => {
    const response = await postLogin(DEMO_USERNAME, DEMO_PASSWORD);

    expect(response.status).toBe(200);
    const body = (await response.json()) as LoginResponse;
    expect(typeof body.access_token).toBe("string");
    expect(body.access_token.length).toBeGreaterThan(0);
    expect(body.token_type).toBe("bearer");
  });

  it("POST /auth/login returns 401 for invalid password", async () => {
    const response = await postLogin(DEMO_USERNAME, WRONG_PASSWORD);

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Credenciales inválidas");
  });

  it("GET /auth/me returns 401 without token", async () => {
    const response = await SELF.fetch("http://localhost/auth/me");

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /auth/me returns demo profile with valid token", async () => {
    const loginResponse = await postLogin(DEMO_USERNAME, DEMO_PASSWORD);
    expect(loginResponse.status).toBe(200);
    const loginBody = (await loginResponse.json()) as LoginResponse;

    const response = await SELF.fetch("http://localhost/auth/me", {
      headers: { Authorization: `Bearer ${loginBody.access_token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as MeResponse;
    expect(body.id).toBe("usr-admin-demo-001");
    expect(body.dni).toBe("00000000");
    expect(body.email).toBe("admin.demo@local.invalid");
    expect(body.full_name).toBe("Admin Demo");
    expect(body.is_active).toBe(true);
    expect(body.active_facility_id).toBe("fac-demo-001");
    expect(body.roles.some((role) => role.code === "ADMIN")).toBe(true);
    expect(body.memberships.length).toBeGreaterThanOrEqual(1);
    expect(body.memberships[0]?.role).toBe("ADMIN");
    expect(body.memberships[0]?.facility_id).toBe("fac-demo-001");
  });
});
