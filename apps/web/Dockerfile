# ─── Stage 1: Install deps ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json

RUN npm install --workspaces --include-workspace-root

# ─── Stage 2: Build Next.js app ───────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Build args injected at docker build time (baked into the static bundle)
ARG NEXT_PUBLIC_API_URL=https://pathiq-api-z6pi.onrender.com
ARG NEXT_PUBLIC_SOCKET_URL=https://pathiq-api-z6pi.onrender.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

WORKDIR /app/apps/web
RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
