import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const WRONG_PASSWORD = "WrongPassword!";
const DEMO_USER_ID = "usr-admin-demo-001";
const DEMO_PASSWORD_HASH =
  "scrypt$v1$16384$8$1$6SmRSRPUeU0c3Esw5lSesQ==$+h43zkkVyGMXdA0m4Ov9h2HUZZc3A6XJMc0mvVMz9Oo=";
const SLOW_TEST_TIMEOUT_MS = 30_000;

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

type ActiveFacilityResponse = {
  active_facility_id: string;
};

async function postLogin(username: string, password: string): Promise<Response> {
  return SELF.fetch("http://localhost/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

async function loginAndGetToken(): Promise<string> {
  const response = await postLogin(DEMO_USERNAME, DEMO_PASSWORD);
  expect(response.status).toBe(200);
  const body = (await response.json()) as LoginResponse;
  return body.access_token;
}

async function putMe(token: string, body: Record<string, unknown>): Promise<Response> {
  return SELF.fetch("http://localhost/auth/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function postChangePassword(
  token: string,
  body: Record<string, string>
): Promise<Response> {
  return SELF.fetch("http://localhost/auth/change-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function postActiveFacility(
  token: string | undefined,
  facilityId: string
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return SELF.fetch("http://localhost/auth/active-facility", {
    method: "POST",
    headers,
    body: JSON.stringify({ facility_id: facilityId })
  });
}

describe("auth contract", () => {
  afterEach(async () => {
    await env.DB.prepare(
      `UPDATE users
       SET dni = ?1, password_hash = ?2, updated_at = ?3
       WHERE id = ?4`
    )
      .bind(DEMO_USERNAME, DEMO_PASSWORD_HASH, new Date().toISOString(), DEMO_USER_ID)
      .run();
  });

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

  it("POST /auth/active-facility returns 401 without token", async () => {
    const response = await postActiveFacility(undefined, "fac-demo-001");

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("POST /auth/active-facility returns 200 for valid facility with membership", async () => {
    const token = await loginAndGetToken();

    const response = await postActiveFacility(token, "fac-demo-001");

    expect(response.status).toBe(200);
    const body = (await response.json()) as ActiveFacilityResponse;
    expect(body.active_facility_id).toBe("fac-demo-001");

    const meResponse = await SELF.fetch("http://localhost/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(meResponse.status).toBe(200);
    const meBody = (await meResponse.json()) as MeResponse;
    expect(meBody.active_facility_id).toBe("fac-demo-001");
  });

  it("POST /auth/active-facility returns 404 for nonexistent facility", async () => {
    const token = await loginAndGetToken();

    const response = await postActiveFacility(token, "fac-does-not-exist");

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Geriátrico no encontrado");
  });

  it("PUT /auth/me allows first DNI without current_password", async () => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO users (
        id, dni, email, full_name, password_hash, role, active_facility_id, is_active, created_at, updated_at
      ) VALUES (
        'usr-test-no-dni',
        NULL,
        'test.nodni@local.invalid',
        'Test Sin DNI',
        ?1,
        'doctor',
        'fac-demo-001',
        1,
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z'
      )`
    )
      .bind(DEMO_PASSWORD_HASH)
      .run();

    const loginResponse = await postLogin("test.nodni@local.invalid", DEMO_PASSWORD);
    expect(loginResponse.status).toBe(200);
    const loginBody = (await loginResponse.json()) as LoginResponse;

    const updateResponse = await putMe(loginBody.access_token, { dni: "12345678" });
    expect(updateResponse.status).toBe(200);
    const meBody = (await updateResponse.json()) as MeResponse;
    expect(meBody.dni).toBe("12345678");

    await env.DB.prepare(`DELETE FROM users WHERE id = 'usr-test-no-dni'`).run();
  });

  it("PUT /auth/me rejects duplicate DNI", async () => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO users (
        id, dni, email, full_name, password_hash, role, active_facility_id, is_active, created_at, updated_at
      ) VALUES (
        'usr-test-dup-dni',
        '99999999',
        'test.dup@local.invalid',
        'Test Dup DNI',
        ?1,
        'doctor',
        'fac-demo-001',
        1,
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z'
      )`
    )
      .bind(DEMO_PASSWORD_HASH)
      .run();

    const token = await loginAndGetToken();
    const response = await putMe(token, {
      dni: "99999999",
      current_password: DEMO_PASSWORD
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("DNI ya registrado");

    await env.DB.prepare(`DELETE FROM users WHERE id = 'usr-test-dup-dni'`).run();
  });

  it("PUT /auth/me updates DNI when current_password is valid", async () => {
    const token = await loginAndGetToken();
    const newDni = "87654321";

    const updateResponse = await putMe(token, {
      dni: newDni,
      current_password: DEMO_PASSWORD
    });
    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as MeResponse;
    expect(updated.dni).toBe(newDni);

    const loginWithNewDni = await postLogin(newDni, DEMO_PASSWORD);
    expect(loginWithNewDni.status).toBe(200);

    const restoreToken = (await loginWithNewDni.json()) as LoginResponse;
    const restoreResponse = await putMe(restoreToken.access_token, {
      dni: DEMO_USERNAME,
      current_password: DEMO_PASSWORD
    });
    expect(restoreResponse.status).toBe(200);
    const restored = (await restoreResponse.json()) as MeResponse;
    expect(restored.dni).toBe(DEMO_USERNAME);
  }, SLOW_TEST_TIMEOUT_MS);

  it("POST /auth/change-password changes password and invalidates old one", async () => {
    const token = await loginAndGetToken();
    const newPassword = "NewPass123!";

    const changeResponse = await postChangePassword(token, {
      current_password: DEMO_PASSWORD,
      new_password: newPassword
    });
    expect(changeResponse.status).toBe(200);

    const loginNew = await postLogin(DEMO_USERNAME, newPassword);
    expect(loginNew.status).toBe(200);

    const loginOld = await postLogin(DEMO_USERNAME, DEMO_PASSWORD);
    expect(loginOld.status).toBe(401);

    const newToken = (await loginNew.json()) as LoginResponse;
    const restoreResponse = await postChangePassword(newToken.access_token, {
      current_password: newPassword,
      new_password: DEMO_PASSWORD
    });
    expect(restoreResponse.status).toBe(200);

    const loginRestored = await postLogin(DEMO_USERNAME, DEMO_PASSWORD);
    expect(loginRestored.status).toBe(200);
  }, SLOW_TEST_TIMEOUT_MS);

  it("POST /auth/active-facility returns 403 without membership", async () => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO facilities (
        id, name, slug, is_active, created_at, updated_at
      ) VALUES (
        'fac-other-001',
        'Hogar Otro Demo',
        'hogar-otro-demo',
        1,
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z'
      )`
    ).run();

    const token = await loginAndGetToken();
    const response = await postActiveFacility(token, "fac-other-001");

    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("No tiene acceso a este geriátrico");
  });
});
