# Single-service image: builds the Next.js frontend as a static export and the
# NestJS backend, then runs ONE process that serves both the API (/api) and the
# static frontend. The SQLite database lives on a mounted disk at /app/data.

# ---------- frontend build (static export) ----------
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Static export; the browser talks to the API on the same origin under /api.
ENV NEXT_OUTPUT=export
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- backend build ----------
FROM node:20-alpine AS backend
RUN apk add --no-cache openssl
WORKDIR /app
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/prisma ./prisma
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
# Static frontend is served by NestJS from ./frontend (see app.module.ts).
COPY --from=frontend /fe/out ./frontend
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/data
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
