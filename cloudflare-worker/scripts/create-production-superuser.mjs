/**
 * Genera superuser-production-insert.sql para D1 production.
 * No ejecuta wrangler ni escribe en D1. No imprime la contraseña.
 *
 * Uso (PowerShell, desde cloudflare-worker/):
 *   $env:SUPERUSER_EMAIL = "..."
 *   $env:SUPERUSER_PASSWORD = "..."
 *   $env:SUPERUSER_FACILITY_ID = "<facility-id>"
 *   npx tsx scripts/create-production-superuser.mjs
 *
 * Luego (manual):
 *   npx wrangler d1 execute geriatricos_d1_prod --remote --env production --file superuser-production-insert.sql
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/modules/auth/password.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "superuser-production-insert.sql");

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

const email = requireEnv("SUPERUSER_EMAIL");
const password = process.env.SUPERUSER_PASSWORD ?? "";
const facilityId = requireEnv("SUPERUSER_FACILITY_ID");

if (!password) {
  console.error("Error: falta variable de entorno SUPERUSER_PASSWORD");
  process.exit(1);
}

const fullName = process.env.SUPERUSER_FULL_NAME?.trim() || "Superusuario";
const dni = process.env.SUPERUSER_DNI?.trim() || null;
const userId = process.env.SUPERUSER_USER_ID?.trim() || `usr-super-${randomUUID()}`;
const fuId = `fu-super-${randomUUID()}`;
const now = new Date().toISOString();

const passwordHash = hashPassword(password);

const sql = `PRAGMA foreign_keys = ON;

-- Superusuario production (platform_admin + membership admin).
-- Generado por scripts/create-production-superuser.mjs — no commitear este archivo.
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
  'platform_admin',
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
  'admin',
  1,
  '${now}',
  '${now}'
);
`;

writeFileSync(OUT_FILE, sql, "utf8");

console.log(`OK: ${OUT_FILE}`);
console.log(`user_id=${userId}`);
console.log("facility_users.role=admin, users.role=platform_admin");
console.log("Login: POST /auth/login con body { username, password } (username = email o DNI)");
