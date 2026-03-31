import { NextRequest, NextResponse } from "next/server";
import BetterSqlite3 from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = ["grok_api_key", "custom_prompt", "dashboard_password"];

function getDb() {
  const dbPath =
    process.env.NODE_ENV === "production"
      ? "/data/dev.db"
      : path.join(process.cwd(), "prisma", "dev.db");
  return new BetterSqlite3(dbPath);
}

export async function GET() {
  const db = getDb();
  try {
    const rows = db.prepare(`SELECT key, value FROM "Setting"`).all() as { key: string; value: string }[];
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.key === "grok_api_key") {
        map[row.key] = row.value ? "••••••••" : "";
      } else if (row.key !== "dashboard_password") {
        map[row.key] = row.value;
      }
    }
    return NextResponse.json(map);
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  try {
    const stmt = db.prepare(
      `INSERT INTO "Setting" (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    let saved = 0;
    for (const key of ALLOWED_KEYS) {
      if (key in body && typeof body[key] === "string" && body[key].trim()) {
        stmt.run(key, body[key].trim());
        saved++;
      }
    }
    return NextResponse.json({ ok: true, saved });
  } finally {
    db.close();
  }
}
