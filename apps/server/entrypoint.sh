#!/bin/sh
set -e


echo "🚀 Starting server..."
exec node dist/apps/server/src/index.js
