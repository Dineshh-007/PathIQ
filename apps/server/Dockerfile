# ─── Stage 1: Install workspace deps from monorepo root ───────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace manifests
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install all workspace deps (includes shared-types resolution)
RUN npm install --workspaces --include-workspace-root

# ─── Stage 2: Build shared-types ──────────────────────────────────────────────
FROM deps AS shared-types-build
COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npm run build 2>/dev/null || true

# ─── Stage 3: Build the server ────────────────────────────────────────────────
FROM shared-types-build AS builder
WORKDIR /app

COPY apps/server ./apps/server
COPY apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ─── Stage 4: Production image (minimal) ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

WORKDIR /app/apps/server

EXPOSE 3001

# Run migrations then start — entrypoint.sh handles the ordering
COPY apps/server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
