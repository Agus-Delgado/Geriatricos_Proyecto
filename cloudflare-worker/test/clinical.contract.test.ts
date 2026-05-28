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

type ClinicalSummaryResponse = {
  id: string;
  resident_id: string;
  primary_diagnosis: string | null;
  secondary_diagnoses: string | null;
  allergies: string | null;
  current_medications: string | null;
  medical_history: string | null;
  family_history: string | null;
  updated_by_user_id: string | null;
  updated_at: string;
};

type ClinicalNoteResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  author_user_id: string;
  note_type: string;
  content: string;
  recorded_at: string;
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

function summaryUrl(residentId: string): string {
  return `http://localhost/residents/${residentId}/clinical-summary`;
}

function notesUrl(residentId: string): string {
  return `http://localhost/residents/${residentId}/clinical-notes`;
}

describe("clinical contract", () => {
  it("GET /residents/:id/clinical-summary returns 401 without token", async () => {
    const response = await SELF.fetch(summaryUrl(DEMO_RESIDENT_ID));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents/:id/clinical-summary returns 404 for unknown resident", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(summaryUrl("res-does-not-exist"), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Residente no encontrado");
  });

  it("GET /residents/:id/clinical-summary returns 404 when summary row is missing", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Sin",
        last_name: "Resumen",
        admission_date: "2026-02-01"
      })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const response = await SELF.fetch(summaryUrl(created.id), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Resumen clínico no encontrado");
  });

  it("PUT /residents/:id/clinical-summary creates and updates summary with 200", async () => {
    const token = await loginAndGetToken();

    const createResident = await SELF.fetch("http://localhost/residents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facility_id: DEMO_FACILITY_ID,
        first_name: "Clinical",
        last_name: "Upsert",
        admission_date: "2026-03-01"
      })
    });
    expect(createResident.status).toBe(201);
    const resident = (await createResident.json()) as { id: string };

    const createSummary = await SELF.fetch(summaryUrl(resident.id), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        primary_diagnosis: "Asma leve",
        allergies: "Ninguna conocida"
      })
    });
    expect(createSummary.status).toBe(200);
    const createdSummary = (await createSummary.json()) as ClinicalSummaryResponse;
    expect(createdSummary.resident_id).toBe(resident.id);
    expect(createdSummary.primary_diagnosis).toBe("Asma leve");
    expect(createdSummary.allergies).toBe("Ninguna conocida");
    expect(createdSummary.updated_by_user_id).toBe(DEMO_USER_ID);

    const updateSummary = await SELF.fetch(summaryUrl(resident.id), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        primary_diagnosis: "Asma moderada",
        unknown_field: "ignored"
      })
    });
    expect(updateSummary.status).toBe(200);
    const updatedSummary = (await updateSummary.json()) as ClinicalSummaryResponse;
    expect(updatedSummary.id).toBe(createdSummary.id);
    expect(updatedSummary.primary_diagnosis).toBe("Asma moderada");
    expect(updatedSummary.allergies).toBe("Ninguna conocida");
  });

  it("GET /residents/:id/clinical-notes returns 401 without token", async () => {
    const response = await SELF.fetch(notesUrl(DEMO_RESIDENT_ID));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents/:id/clinical-notes returns demo note with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(notesUrl(DEMO_RESIDENT_ID), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ClinicalNoteResponse[];
    expect(Array.isArray(body)).toBe(true);
    const demo = body.find((n) => n.id === "cn-demo-001");
    expect(demo).toBeDefined();
    expect(demo?.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(demo?.facility_id).toBe(DEMO_FACILITY_ID);
    expect(demo?.author_user_id).toBe(DEMO_USER_ID);
    expect(demo?.note_type).toBe("EVOLUTION");
  });

  it("POST /residents/:id/clinical-notes creates note with 201", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(notesUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        note_type: "OBSERVATION",
        content: "Nota de prueba local"
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ClinicalNoteResponse;
    expect(body.content).toBe("Nota de prueba local");
    expect(body.note_type).toBe("OBSERVATION");
    expect(body.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(body.facility_id).toBe(DEMO_FACILITY_ID);
    expect(body.author_user_id).toBe(DEMO_USER_ID);
    expect(body.id).toBeTruthy();
  });
});
