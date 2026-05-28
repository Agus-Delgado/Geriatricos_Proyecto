/**
 * Genera medical-user-production-insert.sql para D1 production.
 * No ejecuta wrangler ni escribe en D1. No imprime la contraseña.
 *
 * Uso (PowerShell, desde cloudflare-worker/):
 *   $env:MEDICAL_USER_EMAIL = "..."
 *   $env:MEDICAL_USER_PASSWORD = "..."
 *   $env:MEDICAL_USER_FACILITY_ID = "<facility-id>"
 *   npx tsx scripts/create-production-medical-user.mjs
 *
 * Luego (manual):
 *   npx wrangler d1 execute geriatricos_d1_prod --remote --env production --file medical-user-production-insert.sql
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/modules/auth/password.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "medical-user-production-insert.sql");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Error: falta variable de entorno ${name}`);
    process.exit(1);
  }
  return value;
}

function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}

const email = requireEnv("MEDICAL_USER_EMAIL");
const password = process.env.MEDICAL_USER_PASSWORD ?? "";
const facilityId = requireEnv("MEDICAL_USER_FACILITY_ID");

if (!password) {
  console.error("Error: falta variable de entorno MEDICAL_USER_PASSWORD");
  process.exit(1);
}

const fullName = process.env.MEDICAL_USER_FULL_NAME?.trim() || "Médico";
const dni = process.env.MEDICAL_USER_DNI?.trim() || null;
const userId = process.env.MEDICAL_USER_ID?.trim() || `usr-med-${randomUUID()}`;
const fuId = `fu-med-${randomUUID()}`;
const now = new Date().toISOString();

const passwordHash = hashPassword(password);

const sql = `PRAGMA foreign_keys = ON;

-- Usuario médico production (users.role=doctor, facility_users.role=medico).
-- Generado por scripts/create-production-medical-user.mjs — no commitear este archivo.
-- user_id: ${userId}

INSERT INTO users (
  id,
  dni,
  email,
  full_name,
  password_hash,
  role,
  active_facility_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  '${escapeSqlString(userId)}',
  ${dni ? `'${escapeSqlString(dni)}'` : "NULL"},
  '${escapeSqlString(email)}',
  '${escapeSqlString(fullName)}',
  '${escapeSqlString(passwordHash)}',
  'doctor',
  '${escapeSqlString(facilityId)}',
  1,
  '${now}',
  '${now}'
);

INSERT INTO facility_users (
  id,
  facility_id,
  user_id,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '${fuId}',
  '${escapeSqlString(facilityId)}',
  '${escapeSqlString(userId)}',
  'medico',
  1,
  '${now}',
  '${now}'
);
`;

writeFileSync(OUT_FILE, sql, "utf8");

console.log(`OK: ${OUT_FILE}`);
console.log(`user_id=${userId}`);
console.log("users.role=doctor, facility_users.role=medico");
console.log("Login: POST /auth/login con body { username, password } (username = email o DNI)");
