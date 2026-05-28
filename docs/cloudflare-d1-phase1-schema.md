# Cloudflare D1 Phase 1 Schema

## Scope

This document defines the initial D1 schema for backend migration Phase 1.

Included tables:
- `users`
- `facilities`
- `facility_users`
- `residents`
- `resident_contacts`

Out of scope:
- Real auth implementation
- Endpoints implementation
- Frontend integration
- Render/Vercel changes
- Production data creation

Migration file:
- `cloudflare-worker/migrations/0001_initial_phase1.sql`

## D1 Conventions Used

- UUID values are serialized as `TEXT`.
- Primary keys are `id TEXT PRIMARY KEY`.
- Timestamps are `TEXT` in ISO8601 format.
- Soft-delete fields use `deleted_at TEXT NULL` where applicable.
- Foreign keys are explicit.
- Frequent lookups have dedicated indexes.

## Tables and Columns

### `facilities`
- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `slug TEXT`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `users`
- `id TEXT PRIMARY KEY`
- `dni TEXT`
- `email TEXT`
- `full_name TEXT NOT NULL`
- `password_hash TEXT NOT NULL`
- `role TEXT NOT NULL`
- `active_facility_id TEXT NULL`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `facility_users`
- `id TEXT PRIMARY KEY`
- `facility_id TEXT NOT NULL`
- `user_id TEXT NOT NULL`
- `role TEXT NOT NULL`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `residents`
- `id TEXT PRIMARY KEY`
- `facility_id TEXT NOT NULL`
- `first_name TEXT NOT NULL`
- `last_name TEXT NOT NULL`
- `dni TEXT`
- `birth_date TEXT`
- `room TEXT`
- `status TEXT NOT NULL DEFAULT 'ACTIVE'`
- `medical_notes TEXT`
- `deleted_at TEXT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `resident_contacts`
- `id TEXT PRIMARY KEY`
- `resident_id TEXT NOT NULL`
- `full_name TEXT NOT NULL`
- `relationship TEXT`
- `phone TEXT`
- `email TEXT`
- `notes TEXT`
- `is_primary INTEGER NOT NULL DEFAULT 0`
- `deleted_at TEXT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

## Relationships

- `users.active_facility_id -> facilities.id` (`ON DELETE SET NULL`)
- `facility_users.facility_id -> facilities.id` (`ON DELETE CASCADE`)
- `facility_users.user_id -> users.id` (`ON DELETE CASCADE`)
- `residents.facility_id -> facilities.id` (`ON DELETE CASCADE`)
- `resident_contacts.resident_id -> residents.id` (`ON DELETE CASCADE`)

## Indexes

- `idx_users_dni` on `users(dni)`
- `idx_users_email` on `users(email)`
- `idx_users_active_facility_id` on `users(active_facility_id)`
- `idx_facilities_slug` on `facilities(slug)`
- `idx_facility_users_facility_id` on `facility_users(facility_id)`
- `idx_facility_users_user_id` on `facility_users(user_id)`
- `UNIQUE(facility_id, user_id)` on `facility_users`
- `idx_residents_facility_id` on `residents(facility_id)`
- `idx_residents_dni` on `residents(dni)`
- `idx_residents_deleted_at` on `residents(deleted_at)`
- `idx_resident_contacts_resident_id` on `resident_contacts(resident_id)`
- `idx_resident_contacts_deleted_at` on `resident_contacts(deleted_at)`

## Compatibility Notes

This schema was aligned against:
- `backend/app/models/auth.py`
- `backend/app/models/org.py`
- `backend/app/models/residents.py`
- `docs/cloudflare-worker-design.md`
- `docs/backend-migration-checklist.md`

Mapping choices:
- `facility_users` is used as the Phase 1 table name and is functionally equivalent to current backend `facility_user_access`.
- Field naming keeps frontend/backend compatibility requirements for Phase 1 without introducing non-MVP tables.

## Wrangler / D1 Commands

Run from `cloudflare-worker/`.

### 1) Ensure D1 binding placeholder exists

`wrangler.toml` already contains the commented placeholder:
- `[[d1_databases]]`
- `binding = "DB"`
- `database_name = "geriatricos_d1_dev"`
- `database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"`

Do not set a real `database_id` yet.

### 2) Apply migration locally (development)

Current pending step:
- uncomment the `[[d1_databases]]` block in `cloudflare-worker/wrangler.toml` with:
  - `binding = "DB"`
  - `database_name = "geriatricos_d1_dev"`
  - `database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"` (placeholder, not a real ID)

Then run this exact command:

```bash
npx wrangler d1 migrations apply geriatricos_d1_dev --local
```

Observed result before enabling the binding:
- `Couldn't find a D1 DB with the name or binding 'geriatricos_d1_dev' in your wrangler.toml file.`

### 3) Future remote commands (not executed in this block)

```bash
npx wrangler d1 create geriatricos_d1_prod
npx wrangler d1 migrations apply geriatricos_d1_prod --remote
```

These commands are documented for future phases only.

## Verification Status for This Block

- SQL migration file created and reviewed for D1-compatible syntax.
- Explicit FKs and required indexes included.
- No endpoints implemented.
- No login/auth runtime implementation added.
- No frontend files changed.
- No backend FastAPI files changed.
- No Render/Vercel configuration changed.
- No production impact introduced.

## Done Criteria

This block is done when:
- `cloudflare-worker/migrations/0001_initial_phase1.sql` exists with the five Phase 1 tables.
- Schema includes required relations and indexes.
- This document describes tables, relations, indexes, and D1 local/remote commands.
- There are no production changes and no endpoint/auth implementation in this block.
