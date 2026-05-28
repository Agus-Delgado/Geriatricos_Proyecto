export async function execSqlStatements(db: D1Database, raw: string): Promise<void> {
  const withoutComments = raw.replace(/--[^\n]*/g, "");
  const statements = withoutComments
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const sql of statements) {
    await db.prepare(sql).run();
  }
}
