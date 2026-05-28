import { env } from "cloudflare:workers";
import seedSql from "../seed/dev_seed.sql?raw";
import { execSqlStatements } from "./helpers/exec-sql";

await execSqlStatements(env.DB, seedSql);
