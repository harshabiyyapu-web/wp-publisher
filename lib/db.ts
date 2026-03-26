import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.NODE_ENV === "production"
  ? "/data/dev.db"
  : path.join(process.cwd(), "dev.db");

// Create all tables if they don't exist — runs synchronously before Prisma connects.
// This replaces the need for `prisma db push` or any migration CLI command.
function initDatabase() {
  const db = new BetterSqlite3(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Group" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "name"      TEXT    NOT NULL,
      "geography" TEXT    NOT NULL DEFAULT '',
      "color"     TEXT    NOT NULL DEFAULT '#6366f1',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Site" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "name"      TEXT    NOT NULL,
      "url"       TEXT    NOT NULL UNIQUE,
      "token"     TEXT    NOT NULL,
      "groupId"   INTEGER,
      "language"  TEXT    NOT NULL DEFAULT 'english',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("groupId") REFERENCES "Group"("id")
    );

    CREATE TABLE IF NOT EXISTS "Article" (
      "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
      "sourceUrl"    TEXT    NOT NULL,
      "scrapedTitle" TEXT    NOT NULL,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "PubJob" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "articleId" INTEGER NOT NULL,
      "siteId"    INTEGER NOT NULL,
      "status"    TEXT    NOT NULL DEFAULT 'pending',
      "wpPostId"  INTEGER,
      "permalink" TEXT,
      "error"     TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("articleId") REFERENCES "Article"("id"),
      FOREIGN KEY ("siteId")    REFERENCES "Site"("id")
    );

    CREATE TABLE IF NOT EXISTS "Setting" (
      "key"   TEXT PRIMARY KEY,
      "value" TEXT NOT NULL
    );
  `);
  db.close();
}

try {
  initDatabase();
} catch {
  // /data directory doesn't exist during `next build` — runs correctly at runtime
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
