import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const DEMO_USERNAME = "00000000";
const DEMO_PASSWORD = "AdminDemo123!";
const DEMO_RESIDENT_ID = "res-demo-001";
const DEMO_PLAN_ID = "mp-demo-001";
const DEMO_TIME_ID = "mst-demo-001";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type ErrorResponse = {
  detail: string;
};

type MedicationPlanResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  med_name: string;
  dose: string;
  route: string | null;
  instructions: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  prescribed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type MedicationScheduleTimeResponse = {
  id: string;
  medication_plan_id: string;
  time: string;
  day_of_week: number | null;
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

function plansUrl(residentId: string, activeOnly?: boolean): string {
  const base = `http://localhost/residents/${residentId}/medication-plans`;
  if (activeOnly === undefined) {
    return base;
  }
  return `${base}?active_only=${activeOnly}`;
}

function planTimesUrl(planId: string): string {
  return `http://localhost/medication-plans/${planId}/times`;
}

function timeUrl(timeId: string): string {
  return `http://localhost/medication-times/${timeId}`;
}

describe("medications contract", () => {
  it("GET /residents/:id/medication-plans returns 401 without token", async () => {
    const response = await SELF.fetch(plansUrl(DEMO_RESIDENT_ID));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents/:id/medication-plans returns 404 for unknown resident", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(plansUrl("res-does-not-exist"), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Residente no encontrado");
  });

  it("GET /residents/:id/medication-plans returns 200 with demo plan", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(plansUrl(DEMO_RESIDENT_ID), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as MedicationPlanResponse[];
    expect(Array.isArray(body)).toBe(true);
    const demo = body.find((p) => p.id === DEMO_PLAN_ID);
    expect(demo).toBeDefined();
    expect(demo?.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(demo?.med_name).toBe("Metformina");
    expect(demo?.dose).toBe("500mg");
    expect(demo?.is_active).toBe(true);
  });

  it("GET /residents/:id/medication-plans?active_only=true returns only active plans", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(plansUrl(DEMO_RESIDENT_ID, true), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as MedicationPlanResponse[];
    expect(body.every((p) => p.is_active === true)).toBe(true);
    expect(body.some((p) => p.id === "mp-demo-inactive")).toBe(false);
    expect(body.some((p) => p.id === DEMO_PLAN_ID)).toBe(true);
  });

  it("POST /residents/:id/medication-plans creates plan with 201", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(plansUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        med_name: "Losartan",
        dose: "50mg",
        route: "VO",
        start_date: "2026-02-01"
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as MedicationPlanResponse;
    expect(body.med_name).toBe("Losartan");
    expect(body.dose).toBe("50mg");
    expect(body.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(body.facility_id).toBe("fac-demo-001");
    expect(body.is_active).toBe(true);
    expect(body.prescribed_by_user_id).toBe("usr-admin-demo-001");
    expect(body.id).toBeTruthy();
    expect(body.created_at).toBeTruthy();
  });

  it("POST /residents/:id/medication-plans returns 422 without med_name", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(plansUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dose: "50mg"
      })
    });

    expect(response.status).toBe(422);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("med_name es requerido");
  });

  it("POST /medication-plans/:planId/times creates schedule time with 201", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(planTimesUrl(DEMO_PLAN_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        time: "14:00",
        day_of_week: 1
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as MedicationScheduleTimeResponse;
    expect(body.medication_plan_id).toBe(DEMO_PLAN_ID);
    expect(body.time).toBe("14:00");
    expect(body.day_of_week).toBe(1);
    expect(body.id).toBeTruthy();
  });

  it("POST /medication-plans/:planId/times returns 422 for invalid time format", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(planTimesUrl(DEMO_PLAN_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        time: "8am"
      })
    });

    expect(response.status).toBe(422);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("time debe tener formato HH:MM");
  });

  it("DELETE /medication-times/:timeId returns 204", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(timeUrl(DEMO_TIME_ID), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("DELETE /medication-times/:timeId returns 404 for unknown time", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(timeUrl("mst-does-not-exist"), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Horario no encontrado");
  });
});
