#!/bin/sh
set -e

echo "📦 Syncing database schema..."
npx prisma db push --accept-data-loss --skip-generate || echo "⚠️ Database sync in entrypoint had issues, continuing to server startup..."
echo "✅ Database schema sync step completed"

echo "🌱 Running seed (idempotent)..."
  npm run db:seed || echo "⚠️ Seed had issues, continuing..."

echo "🚀 Starting server..."
exec node dist/apps/server/src/index.js
