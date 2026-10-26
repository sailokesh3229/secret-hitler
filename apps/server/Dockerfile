# Server image (plan.md Step 16 deployment prep). Runs the server the same
# way `pnpm --filter @game/server start` does in development: via tsx,
# straight from TypeScript source. The workspace packages (@game/engine,
# @game/protocol) ship as TypeScript, not compiled JS - a plain
# `tsc && node dist/index.js` cannot resolve them at runtime, which is why
# this does not try to run compiled output.
#
# Build from the repo root so the whole pnpm workspace resolves:
#   docker build -f apps/server/Dockerfile -t secret-hitler-server .
#
# Needs at runtime: either FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/
# FIREBASE_PRIVATE_KEY or ALLOW_GUEST_LOGIN=true. DATABASE_URL and REDIS_URL
# are both optional - without them the server runs entirely in memory
# (fine for a demo; accounts and game history are lost on restart).
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo
ENV HOST=0.0.0.0

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/theme/package.json packages/theme/package.json
COPY tools/sim/package.json tools/sim/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS runtime
COPY packages/engine packages/engine
COPY packages/protocol packages/protocol
COPY apps/server apps/server
RUN pnpm --filter @game/server db:generate

WORKDIR /repo/apps/server
EXPOSE 4000
CMD ["pnpm", "start"]
