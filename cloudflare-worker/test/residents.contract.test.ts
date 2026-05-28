import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const DEMO_FACILITY_ID = "fac-demo-001";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type ResidentResponse = {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  admission_date: string;
  stay_status: string;
  status: string;
  home_label: string | null;
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

describe("residents contract", () => {
  it("GET /residents returns 401 without token", async () => {
    const response = await SELF.fetch(
      `http://localhost/residents?facility_id=${DEMO_FACILITY_ID}`
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents?facility_id=fac-demo-001 returns demo resident with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(
      `http://localhost/residents?facility_id=${DEMO_FACILITY_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as ResidentResponse[];
    expect(Array.isArray(body)).toBe(true);
    const demo = body.find((r) => r.id === "res-demo-001");
    expect(demo).toBeDefined();
    expect(demo?.facility_id).toBe(DEMO_FACILITY_ID);
    expect(demo?.first_name).toBe("Juan");
    expect(demo?.last_name).toBe("Demo");
    expect(demo?.admission_date).toBe("2025-06-01");
    expect(demo?.stay_status).toBe("ACTIVE");
    expect(demo?.status).toBe("ACTIVE");
  });

  it("GET /residents/res-demo-001 returns resident detail with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/residents/res-demo-001", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ResidentResponse;
    expect(body.id).toBe("res-demo-001");
    expect(body.first_name).toBe("Juan");
    expect(body.last_name).toBe("Demo");
  });

  it("POST /residents creates minimal resident", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Ana",
        last_name: "Test",
        admission_date: "2026-02-01"
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ResidentResponse;
    expect(body.id).toBeTruthy();
    expect(body.facility_id).toBe(DEMO_FACILITY_ID);
    expect(body.first_name).toBe("Ana");
    expect(body.last_name).toBe("Test");
    expect(body.stay_status).toBe("ACTIVE");
    expect(body.status).toBe("ACTIVE");
  });

  it("PATCH /residents/:id updates resident", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Patch",
        last_name: "Target",
        admission_date: "2026-03-01"
      })
    });
    const created = (await createResponse.json()) as ResidentResponse;

    const patchResponse = await SELF.fetch(`http://localhost/residents/${created.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ first_name: "Patched" })
    });

    expect(patchResponse.status).toBe(200);
    const patched = (await patchResponse.json()) as ResidentResponse;
    expect(patched.first_name).toBe("Patched");
    expect(patched.last_name).toBe("Target");
  });

  it("DELETE /residents/:id soft-deletes and GET returns 404", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Delete",
        last_name: "Me",
        admission_date: "2026-04-01"
      })
    });
    const created = (await createResponse.json()) as ResidentResponse;

    const deleteResponse = await SELF.fetch(`http://localhost/residents/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe("");

    const getResponse = await SELF.fetch(`http://localhost/residents/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(getResponse.status).toBe(404);
    const err = (await getResponse.json()) as ErrorResponse;
    expect(err.detail).toBe("Residente no encontrado");
  });

  it("POST /residents creates resident with home_label", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Hogar",
        last_name: "Uno",
        admission_date: "2026-06-01",
        home_label: "Hogar 1"
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ResidentResponse;
    expect(body.home_label).toBe("Hogar 1");
  });

  it("PATCH /residents/:id updates home_label", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Hogar",
        last_name: "Patch",
        admission_date: "2026-06-02",
        home_label: "Hogar 1"
      })
    });
    const created = (await createResponse.json()) as ResidentResponse;

    const patchResponse = await SELF.fetch(`http://localhost/residents/${created.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ home_label: "Hogar 2" })
    });

    expect(patchResponse.status).toBe(200);
    const patched = (await patchResponse.json()) as ResidentResponse;
    expect(patched.home_label).toBe("Hogar 2");
  });

  it("GET /residents filters by home_label", async () => {
    const token = await loginAndGetToken();

    await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Filtro",
        last_name: "HogarA",
        admission_date: "2026-06-03",
        home_label: "Hogar 3"
      })
    });

    const listResponse = await SELF.fetch(
      `http://localhost/residents?facility_id=${DEMO_FACILITY_ID}&home_label=Hogar%203`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(listResponse.status).toBe(200);
    const body = (await listResponse.json()) as ResidentResponse[];
    expect(body.every((r) => r.home_label === "Hogar 3")).toBe(true);
    expect(body.some((r) => r.last_name === "HogarA")).toBe(true);
  });

  it("POST /residents with contacts[] inserts inline contacts", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Con",
        last_name: "Tactos",
        admission_date: "2026-05-01",
        contacts: [
          {
            full_name: "Familiar Demo",
            relationship_type: "Hijo",
            phone: "+54-11-1111-1111",
            is_primary: true
          }
        ]
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ResidentResponse;
    expect(body.first_name).toBe("Con");
  });
});
