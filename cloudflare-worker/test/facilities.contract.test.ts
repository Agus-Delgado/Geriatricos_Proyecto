import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type FacilityResponse = {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  address: string | null;
  is_active: boolean;
};

async function loginAndGetToken(): Promise<string> {
  const response = await SELF.fetch("http://localhost/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: DEMO_USERNAME, password: DEMO_PASSWORD })
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as LoginResponse;
  return body.access_token;
}

describe("facilities contract", () => {
  it("GET /facilities returns 401 without token", async () => {
    const response = await SELF.fetch("http://localhost/facilities");

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /facilities returns demo facility list with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/facilities", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as FacilityResponse[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const demo = body.find((f) => f.id === "fac-demo-001");
    expect(demo).toBeDefined();
    expect(demo?.name).toBe("Hogar Demo Centro");
    expect(demo?.code).toBe("hogar-demo-centro");
    expect(demo?.slug).toBe("hogar-demo-centro");
    expect(demo?.address).toBeNull();
    expect(demo?.is_active).toBe(true);
  });

  it("GET /facilities/fac-demo-001 returns facility detail with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/facilities/fac-demo-001", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as FacilityResponse;
    expect(body.id).toBe("fac-demo-001");
    expect(body.name).toBe("Hogar Demo Centro");
    expect(body.code).toBe("hogar-demo-centro");
    expect(body.is_active).toBe(true);
  });

  it("GET /facilities/by-slug/hogar-demo-centro returns facility with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/facilities/by-slug/hogar-demo-centro", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as FacilityResponse;
    expect(body.id).toBe("fac-demo-001");
    expect(body.slug).toBe("hogar-demo-centro");
  });
});
