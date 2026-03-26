#!/bin/sh

echo "Running prisma db push to initialize database..."
DATABASE_URL="file:${DB_PATH:-/data/dev.db}" npx prisma db push --accept-data-loss && echo "Database ready." || echo "Warning: prisma db push failed, continuing anyway."

exec node server.js
