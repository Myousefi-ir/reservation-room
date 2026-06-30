#!/bin/sh
set -e

echo "→ Waiting for database & applying schema (prisma db push)..."
npx prisma db push --skip-generate

echo "→ Seeding initial data (idempotent)..."
node dist/seed.js

echo "→ Starting NestJS backend on port ${BACKEND_PORT:-4000}..."
exec node dist/main.js
