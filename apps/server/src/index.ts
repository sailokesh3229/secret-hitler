/* apps/server entry point: REST (Fastify) and real-time (Socket.IO) on one
   port. The server is the only source of truth (CLAUDE.md rule 1). Live game
   state moves to Redis and history to Postgres in Step 11; until then rooms
   are kept in memory. */
import { randomInt } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { createFirebaseVerifier, rejectingVerifier, type TokenVerifier } from "./auth/tokenVerifier.js"
import { createGuestAuth } from "./auth/guestTokens.js"
import { composeServer, type ServerDeps } from "./server.js"
import { argon2Hasher } from "./rooms/passwords.js"
import { createMemoryRoomStore } from "./rooms/roomStore.js"
import { createMemoryUserRepository, createPrismaUserRepository } from "./users/userRepository.js"
import { createMemoryKeyValue, type KeyValueClient } from "./game/gameStore.js"
import { createMemoryHistory, createPrismaHistory } from "./game/history.js"
import { Redis } from "ioredis"

function baseDeps(verifier: TokenVerifier): ServerDeps {
  return {
    verifier,
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    hasher: argon2Hasher,
    randomInt: (max) => randomInt(max),
    now: () => Date.now(),
    kv: createMemoryKeyValue(),
    history: createMemoryHistory(),
  }
}

export function buildServer(verifier: TokenVerifier = rejectingVerifier) {
  return composeServer(baseDeps(verifier)).app
}

export function chooseAuth(env: NodeJS.ProcessEnv): { verifier: TokenVerifier; issueGuestToken?: () => string } {
  if (env.FIREBASE_PROJECT_ID) return { verifier: createFirebaseVerifier(env) }
  /* When no Firebase project is configured, the public demo offers only
     server-issued, signed guest identities. A value of false explicitly
     disables the demo route. ALLOW_DEV_LOGIN is ignored: client-chosen
     dev:<name> tokens must never work on a public server. */
  if (env.ALLOW_GUEST_LOGIN === "false") return { verifier: rejectingVerifier }
  const secret = env.GUEST_TOKEN_SECRET ? Buffer.from(env.GUEST_TOKEN_SECRET, "utf8") : undefined
  const guest = createGuestAuth(secret)
  return { verifier: guest.verifier, issueGuestToken: guest.issueToken }
}

const isMain = process.argv[1] && process.argv[1].endsWith("index.ts")

if (isMain) {
  const port = Number(process.env.PORT ?? 4000)
  const host = process.env.HOST ?? "localhost"
  const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null
  const kv: KeyValueClient = redis ?? createMemoryKeyValue()
  const auth = chooseAuth(process.env)
  const deps: ServerDeps = { ...baseDeps(auth.verifier), issueGuestToken: auth.issueGuestToken, kv }
  /* Postgres is optional: without DATABASE_URL the server runs fully in
     memory (same fallback kv already has), so a quick deploy needs no
     database at all. Set DATABASE_URL to persist accounts and history. */
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient()
    deps.users = createPrismaUserRepository(prisma)
    deps.history = createPrismaHistory(prisma)
  } else {
    console.log("No DATABASE_URL set: running with in-memory users and history (accounts and game history are lost on restart).")
  }
  const { app } = composeServer(deps)
  void app.listen({ port, host })
}
