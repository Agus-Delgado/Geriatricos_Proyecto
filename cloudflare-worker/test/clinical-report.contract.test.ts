import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const DEMO_RESIDENT_ID = "res-demo-001";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type ClinicalReportResponse = {
  generated_at: string;
  resident: { id: string; facility_id: string; first_name: string; last_name: string };
  clinical_summary: { id: string; resident_id: string } | null;
  clinical_notes: Array<{ id: string; content: string; recorded_at: string }>;
  medication_plans: Array<{ id: string; med_name: string; is_active: boolean }>;
  contacts: Array<{ id: string; full_name: string }>;
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

function reportUrl(residentId: string): string {
  return `http://localhost/residents/${residentId}/clinical-report`;
}

describe("clinical-report contract", () => {
  it("GET /residents/:id/clinical-report returns 401 without token", async () => {
    const response = await SELF.fetch(reportUrl(DEMO_RESIDENT_ID));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents/:id/clinical-report returns 404 for unknown resident", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(reportUrl("res-does-not-exist"), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Residente no encontrado");
  });

  it("GET /residents/:id/clinical-report returns consolidated payload", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(reportUrl(DEMO_RESIDENT_ID), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ClinicalReportResponse;

    expect(body.generated_at).toBeTruthy();
    expect(body.resident.id).toBe(DEMO_RESIDENT_ID);
    expect(body.clinical_summary?.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(body.clinical_notes.length).toBeGreaterThan(0);
    expect(body.medication_plans.length).toBeGreaterThan(0);
    expect(body.medication_plans.every((plan) => plan.is_active)).toBe(true);
    expect(body.contacts.length).toBeGreaterThan(0);

    const noteTimes = body.clinical_notes.map((note) =>
      new Date(note.recorded_at).getTime()
    );
    const sorted = [...noteTimes].sort((a, b) => a - b);
    expect(noteTimes).toEqual(sorted);
  });
});
