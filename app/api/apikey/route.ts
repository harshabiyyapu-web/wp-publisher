/**
 * Dedicated API key endpoint — uses raw better-sqlite3, no Prisma.
 * GET  → { configured: bool }
 * POST → { key: "sk-or-..." } → saves to DB, returns { ok: true }
 */
import { NextRequest, NextResponse } from "next/server";
import BetterSqlite3 from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

function dbPath() {
  return process.env.NODE_ENV === "production"
    ? "/data/dev.db"
    : path.join(process.cwd(), "prisma", "dev.db");
}

function openDb() {
  const db = new BetterSqlite3(dbPath());
  // Ensure table exists
  db.exec(`CREATE TABLE IF NOT EXISTS "Setting" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL)`);
  return db;
}

export async function GET() {
  const db = openDb();
  try {
    const row = db.prepare(`SELECT value FROM "Setting" WHERE key = 'grok_api_key'`).get() as { value: string } | undefined;
    return NextResponse.json({ configured: !!(row?.value) });
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const key: string = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) {
    return NextResponse.json({ ok: false, error: "API key is required" }, { status: 400 });
  }
  const db = openDb();
  try {
    db.prepare(
      `INSERT INTO "Setting" (key, value) VALUES ('grok_api_key', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key);
    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
