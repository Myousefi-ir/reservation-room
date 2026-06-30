#!/bin/sh
set -e

# Ensure the SQLite data directory (mounted disk on Liara) exists.
mkdir -p /app/data

echo "→ Applying database schema (prisma db push)..."
npx prisma db push --skip-generate

echo "→ Seeding initial data (idempotent)..."
node dist/seed.js

echo "→ Starting NestJS (API + static frontend) on port ${BACKEND_PORT:-4000}..."
exec node dist/main.js
