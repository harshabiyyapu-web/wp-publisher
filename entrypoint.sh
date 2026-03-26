#!/bin/sh
set -e

# Sync Prisma schema to the SQLite database (creates tables if they don't exist)
DATABASE_URL="file:${DB_PATH:-/data/dev.db}" npx prisma db push --accept-data-loss

exec node server.js
