# Secret Hitler

# Multiplayer social-deduction game (Secret Hitler rules) for 5-10
human players. One Expo codebase targets Android, iOS, web and installable
desktop web. See CLAUDE.md for working rules, docs/spec.md
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
3. `pnpm dev:server` starts the API and sockets with in-memory storage if
   `DATABASE_URL` and `REDIS_URL` are absent. A Postgres `DATABASE_URL` persists
   users, live rooms, game snapshots and history. Use `pnpm db:up` only when
   you want PostgreSQL and Redis locally.
4. `pnpm dev:mobile` starts Expo; scan its QR code with Expo Go.
5. For a web export, run `pnpm --filter @game/mobile exec expo export --platform web`
   and host `apps/mobile/dist` with a single-page rewrite to `/index.html`.

## Authentication

Email/password sign-up and log-in use Firebase Authentication. Enable the
Email/Password provider in your own Firebase project, then configure the
`EXPO_PUBLIC_FIREBASE_*` values in the frontend build and the server's
`FIREBASE_PROJECT_ID`. The server verifies Firebase ID token signatures
against Google's published public certificates; it needs no service-account
private key. The app refreshes its ID token for HTTP and sockets.

For phone testing against the deployed server, put its HTTPS URL and the four
`EXPO_PUBLIC_FIREBASE_*` values from `.env.example` in the ignored
`apps/mobile/.env`, then run `pnpm dev:mobile`. The startup script preserves
an explicit HTTPS API URL. Native release builds also need these public values
set in their build environment; they are baked into the Expo bundle.

For a temporary coursework demo without Firebase, guest login is enabled by
default on the server; set `EXPO_PUBLIC_DEV_LOGIN=true` for the frontend build. Each
guest receives a server-signed token; `dev:<name>` tokens are rejected by the
public entry point. Guest accounts and game history disappear on server restart
when no persistent database is configured. Set a 32+ byte
`GUEST_TOKEN_SECRET` if guest tokens must survive a restart with persistent
storage. Set `ALLOW_GUEST_LOGIN=false` to disable the demo route. Guest mode
is not durable account sign-in.

## Platforms and hosting

The web export works in a browser and can be installed as a desktop PWA.
Accounts and rooms are held by Firebase and the game server, so players may
use different browsers and devices at the same table. Each browser keeps its
own sign-in session; sign in with the same email on a new browser. Browser
sharing features are optional: room invites fall back to copying when the
Web Share API is absent. Opening an invite in a fresh browser keeps its Room
ID through sign-up or login. PWA installation depends on browser support.
Android and iOS use the same screens and game API; Expo bundling has been
verified for both. Distributable native binaries still require EAS build
credentials and device testing. Set `EXPO_PUBLIC_WEB_URL` in native builds
to make room invites open the public web game when the native deep link is
unavailable. The PWA needs a live connection to play; it does not cache
private game state for offline use.

The backend can run on a free Render web service for a course demonstration.
For a match to survive Render's free-instance restarts, set a private
`DATABASE_URL` on the server service and apply `pnpm --filter @game/server
db:migrate` against that database before restarting the service. A direct
Postgres endpoint is appropriate for migrations; the pooled endpoint can be
used by the running server. Never put either connection string in Git or in
the frontend's `EXPO_PUBLIC_*` settings. `REDIS_URL` is optional; with only
Postgres configured, the server stores live game snapshots there too. The
manual production smoke check is `node tools/sim/src/liveSmoke.mjs` with a
local ignored `apps/mobile/.env`; it creates and removes two test accounts.
An Azure deployment requires an active subscription with verified remaining
credit/free-tier eligibility. Do not enable a paid tier solely for this demo.

## Checks

- pnpm lint
- pnpm typecheck
- pnpm test
