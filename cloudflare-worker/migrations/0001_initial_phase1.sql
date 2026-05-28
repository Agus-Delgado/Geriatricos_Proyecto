PRAGMA foreign_keys = ON;

-- Phase 1 initial schema for Cloudflare D1
-- Conventions:
-- - UUIDs as TEXT
-- - ISO8601 timestamps as TEXT
-- - Soft delete with deleted_at TEXT NULL where applicable

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  dni TEXT,
  email TEXT,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  active_facility_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (active_facility_id) REFERENCES facilities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS facility_users (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (facility_id, user_id)
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT,
  birth_date TEXT,
  room TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  medical_notes TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resident_contacts (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- users
CREATE INDEX IF NOT EXISTS idx_users_dni ON users(dni);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active_facility_id ON users(active_facility_id);

-- facilities
CREATE INDEX IF NOT EXISTS idx_facilities_slug ON facilities(slug);

-- facility_users
CREATE INDEX IF NOT EXISTS idx_facility_users_facility_id ON facility_users(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_users_user_id ON facility_users(user_id);

-- residents
CREATE INDEX IF NOT EXISTS idx_residents_facility_id ON residents(facility_id);
CREATE INDEX IF NOT EXISTS idx_residents_dni ON residents(dni);
CREATE INDEX IF NOT EXISTS idx_residents_deleted_at ON residents(deleted_at);

-- resident_contacts
CREATE INDEX IF NOT EXISTS idx_resident_contacts_resident_id ON resident_contacts(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_contacts_deleted_at ON resident_contacts(deleted_at);
