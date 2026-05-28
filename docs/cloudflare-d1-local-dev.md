# Cloudflare D1 Local/Dev Setup

This guide configures and validates the local development D1 database used by `cloudflare-worker/`.

## Scope

- Local/development only.
- No production data.
- No authentication implementation in this block.
- No frontend/backend/Vercel/Render changes.

## 1) D1 binding for local/dev

File: `cloudflare-worker/wrangler.toml`

Required block:

```toml
[[d1_databases]]
binding = "DB"
database_name = "geriatricos_d1_dev"
database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"
```

Notes:
- This binding is for local/development workflow.
- Keep `database_id` as placeholder until the remote D1 database is created.
- Do not use real personal or production data.

## 2) Apply migrations locally

Run from `cloudflare-worker/`:

```bash
npx wrangler d1 migrations apply geriatricos_d1_dev --local
```

This applies `migrations/0001_initial_phase1.sql` to the local D1 instance.

## 3) Apply development seed

Seed file:
- `cloudflare-worker/seed/dev_seed.sql`

Run from `cloudflare-worker/`:

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --file=seed/dev_seed.sql
```

Seed includes:
- 1 demo facility
- 1 demo admin user
- 1 `facility_users` relation
- `active_facility_id` linked to the demo facility
- 1 demo resident + 1 demo contact

`password_hash` in seed is a real scrypt hash (verifiable login in local/dev):
- Demo user: DNI `00000000` or email `admin.demo@local.invalid`
- Demo password: `AdminDemo123!` (development only; do not use in production)
- See [cloudflare-worker-auth.md](./cloudflare-worker-auth.md) and [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md) for remote bootstrap guidance.

## 4) Validate with SELECT queries

Run from `cloudflare-worker/`:

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --command "SELECT id, name, slug, is_active FROM facilities;"
```

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --command "SELECT id, full_name, email, role, active_facility_id FROM users;"
```

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --command \"SELECT fu.id, fu.facility_id, fu.user_id, fu.role, f.name AS facility_name, u.full_name AS user_name FROM facility_users fu JOIN facilities f ON f.id = fu.facility_id JOIN users u ON u.id = fu.user_id;\"
```

## 5) Clean/retry when local DB has previous state

If migration/seed fails due to previous local data, recreate local state:

1. Remove local D1 metadata directory inside `cloudflare-worker/.wrangler/` (local only).
2. Re-run migration command.
3. Re-run seed command.
4. Re-run validation `SELECT`.

If you prefer not to delete local state, run targeted cleanup:

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --command "DELETE FROM resident_contacts;"
npx wrangler d1 execute geriatricos_d1_dev --local --command "DELETE FROM residents;"
npx wrangler d1 execute geriatricos_d1_dev --local --command "DELETE FROM facility_users;"
npx wrangler d1 execute geriatricos_d1_dev --local --command "DELETE FROM users;"
npx wrangler d1 execute geriatricos_d1_dev --local --command "DELETE FROM facilities;"
```

## 6) What this is NOT

- Not production database setup.
- Not remote D1 provisioning.
- Not auth/login implementation.
- Not data migration from real systems.

## 7) Future remote D1 step (later block)

When ready for remote environment:

1. Create remote D1:

```bash
npx wrangler d1 create geriatricos_d1_prod
```

2. Copy real `database_id` from Wrangler output.
3. Replace `database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"` in `wrangler.toml`.
4. Apply remote migrations intentionally:

```bash
npx wrangler d1 migrations apply geriatricos_d1_prod --remote
```

Do this only in the corresponding remote/prod block.

## 8) Done criteria

- D1 local/dev binding configured in `wrangler.toml`.
- Phase 1 migration applies locally.
- `seed/dev_seed.sql` applies locally.
- At least one demo facility and one demo admin exist in local D1.
- `facility_users` relation exists and `active_facility_id` is correctly linked.
- Local workflow documented in this file.
