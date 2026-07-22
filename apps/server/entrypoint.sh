#!/bin/sh
set -e


echo "⏳ Synchronizing database schema (waiting for DB to wake up)..."
max_retries=15
count=0
until npx prisma db push --accept-data-loss; do
  count=$((count + 1))
  if [ $count -eq $max_retries ]; then
    echo "❌ Database failed to wake up after $max_retries attempts."
    exit 1
  fi
  echo "⚠️ Database connection failed. Retrying in 5 seconds... ($count/$max_retries)"
  sleep 5
done

echo "✅ Database schema synchronized!"
echo "🚀 Starting server..."
exec node dist/apps/server/src/index.js
