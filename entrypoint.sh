#!/bin/sh

echo "Initializing database..."
DATABASE_URL="file:/data/dev.db" npx prisma db push --accept-data-loss && echo "Database ready." || echo "Warning: db push had issues, continuing."

echo "Starting Next.js..."
exec npx next start -p 3000 -H 0.0.0.0
