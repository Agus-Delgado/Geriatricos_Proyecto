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

type ContactResponse = {
  id: string;
  resident_id: string;
  full_name: string;
  relationship_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
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

function contactsUrl(residentId: string, contactId?: string): string {
  const base = `http://localhost/residents/${residentId}/contacts`;
  return contactId ? `${base}/${contactId}` : base;
}

describe("contacts contract", () => {
  it("GET /residents/:id/contacts returns 401 without token", async () => {
    const response = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID));

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Not authenticated");
  });

  it("GET /residents/:id/contacts returns demo contact with valid token", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ContactResponse[];
    expect(Array.isArray(body)).toBe(true);
    const demo = body.find((c) => c.id === "rc-demo-001");
    expect(demo).toBeDefined();
    expect(demo?.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(demo?.full_name).toBe("Maria Demo");
    expect(demo?.relationship_type).toBe("Hija");
    expect(demo?.is_primary).toBe(true);
  });

  it("GET /residents/:id/contacts returns 404 for unknown resident", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(contactsUrl("res-does-not-exist"), {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.detail).toBe("Residente no encontrado");
  });

  it("POST /residents/:id/contacts creates contact with 201", async () => {
    const token = await loginAndGetToken();

    const response = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name: "Contacto Test",
        relationship_type: "Hermano",
        phone: "+54-11-2222-2222",
        is_primary: false
      })
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ContactResponse;
    expect(body.full_name).toBe("Contacto Test");
    expect(body.resident_id).toBe(DEMO_RESIDENT_ID);
    expect(body.relationship_type).toBe("Hermano");
    expect(body.phone).toBe("+54-11-2222-2222");
    expect(body.is_primary).toBe(false);
    expect(body.id).toBeTruthy();
  });

  it("PATCH /residents/:id/contacts/:contactId updates contact with 200", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ full_name: "Para Patch" })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as ContactResponse;

    const patchResponse = await SELF.fetch(
      contactsUrl(DEMO_RESIDENT_ID, created.id),
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone: "+54-11-3333-3333" })
      }
    );

    expect(patchResponse.status).toBe(200);
    const patched = (await patchResponse.json()) as ContactResponse;
    expect(patched.id).toBe(created.id);
    expect(patched.phone).toBe("+54-11-3333-3333");
    expect(patched.full_name).toBe("Para Patch");
  });

  it("DELETE /residents/:id/contacts/:contactId returns 204 and removes from list", async () => {
    const token = await loginAndGetToken();

    const createResponse = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ full_name: "Para Borrar" })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as ContactResponse;

    const deleteResponse = await SELF.fetch(
      contactsUrl(DEMO_RESIDENT_ID, created.id),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe("");

    const listResponse = await SELF.fetch(contactsUrl(DEMO_RESIDENT_ID), {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as ContactResponse[];
    expect(list.find((c) => c.id === created.id)).toBeUndefined();
  });
});
