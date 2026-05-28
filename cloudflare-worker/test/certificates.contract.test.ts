import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const DEMO_RESIDENT_ID = "res-demo-001";
const DEMO_FACILITY_ID = "fac-demo-001";
const DEMO_USER_ID = "usr-admin-demo-001";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type CertificateResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  certificate_type: string;
  issued_at: string;
  issued_by_user_id: string;
  body_text: string;
  content_json: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
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

function certificatesUrl(query?: string): string {
  return query ? `http://localhost/certificates?${query}` : "http://localhost/certificates";
}

describe("certificates contract", () => {
  it("GET /certificates returns 401 without token", async () => {
    const response = await SELF.fetch(certificatesUrl(`resident_id=${DEMO_RESIDENT_ID}`));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("POST /certificates creates certificate with 201", async () => {
    const token = await loginAndGetToken();
    const issuedAt = "2026-03-01T14:00:00Z";

    const response = await SELF.fetch("http://localhost/certificates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resident_id: DEMO_RESIDENT_ID,
        facility_id: DEMO_FACILITY_ID,
        certificate_type: "CONTROL_CLINICO",
        body_text: "Constancia de prueba creada por contrato.",
        issued_at: issuedAt,
        content_json: { witness: "demo" }
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as CertificateResponse;
    expect(body.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(body.facility_id).toBe(DEMO_FACILITY_ID);
    expect(body.certificate_type).toBe("CONTROL_CLINICO");
    expect(body.body_text).toBe("Constancia de prueba creada por contrato.");
    expect(body.issued_at).toBe(issuedAt);
    expect(body.issued_by_user_id).toBe(DEMO_USER_ID);
    expect(body.content_json).toEqual({ witness: "demo" });
    expect(body.pdf_url).toBeNull();
    expect(body.id).toBeTruthy();
    expect(body.created_at).toBeTruthy();
  });

  it("GET /certificates lists by resident_id", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/certificates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resident_id: DEMO_RESIDENT_ID,
        facility_id: DEMO_FACILITY_ID,
        certificate_type: "PRESENCIA",
        body_text: "Listado de constancias por residente.",
        issued_at: "2026-03-02T10:00:00Z"
      })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as CertificateResponse;

    const listResponse = await SELF.fetch(
      certificatesUrl(`resident_id=${DEMO_RESIDENT_ID}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as CertificateResponse[];
    expect(list.some((item) => item.id === created.id)).toBe(true);
  });

  it("GET /certificates/:id returns certificate detail", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/certificates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resident_id: DEMO_RESIDENT_ID,
        facility_id: DEMO_FACILITY_ID,
        certificate_type: "OBITO",
        body_text: "Detalle de constancia.",
        issued_at: "2026-03-03T11:00:00Z"
      })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as CertificateResponse;

    const getResponse = await SELF.fetch(`http://localhost/certificates/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(getResponse.status).toBe(200);
    const body = (await getResponse.json()) as CertificateResponse;
    expect(body.id).toBe(created.id);
    expect(body.body_text).toBe("Detalle de constancia.");
  });

  it("PATCH /certificates/:id updates body_text", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/certificates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resident_id: DEMO_RESIDENT_ID,
        facility_id: DEMO_FACILITY_ID,
        certificate_type: "CONSENTIMIENTO",
        body_text: "Texto original.",
        issued_at: "2026-03-04T08:00:00Z"
      })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as CertificateResponse;

    const patchResponse = await SELF.fetch(`http://localhost/certificates/${created.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body_text: "Texto actualizado." })
    });

    expect(patchResponse.status).toBe(200);
    const updated = (await patchResponse.json()) as CertificateResponse;
    expect(updated.body_text).toBe("Texto actualizado.");
  });

  it("POST /certificates returns 400 when resident facility mismatches", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/certificates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resident_id: DEMO_RESIDENT_ID,
        facility_id: "fac-does-not-match",
        certificate_type: "CONTROL_CLINICO",
        body_text: "No debe crearse.",
        issued_at: "2026-03-05T08:00:00Z"
      })
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("El residente no pertenece a la facility especificada");
  });

  it("GET /certificates/:id returns 404 for unknown certificate", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch("http://localhost/certificates/cert-does-not-exist", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Constancia no encontrada");
  });
});
