# Secret Hitler Mobile

Mobile multiplayer social-deduction game (Secret Hitler rules) for 5-10
human players, Android + iOS. See CLAUDE.md for working rules, docs/spec.md
for what to build, and docs/plan.md for build order.

## Workspace layout

- apps/mobile - Expo app (expo-router)
- apps/server - Fastify + Socket.IO
- packages/engine - pure rules engine
- packages/protocol - event names and zod schemas
- packages/theme - design tokens, strings, icons
- tools/sim - test-only scripted clients and game simulator

## Getting started

1. Copy .env.example to .env and fill in values as they become needed.
2. pnpm install
3. pnpm db:up (starts Postgres + Redis via Docker Compose)
4. pnpm dev:server - starts the API and sockets
5. pnpm dev:mobile - starts the Expo dev server (scan the QR code with
   Expo Go on your phone)

## Checks

- pnpm lint
- pnpm typecheck
- pnpm test
