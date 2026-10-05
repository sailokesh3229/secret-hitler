/* apps/server entry point: REST (Fastify) and real-time (Socket.IO) on one
   port. The server is the only source of truth (CLAUDE.md rule 1). Live game
   state moves to Redis and history to Postgres in Step 11; until then rooms
   are kept in memory. */
import { randomInt } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { createDevVerifier, createFirebaseVerifier, rejectingVerifier, type TokenVerifier } from "./auth/tokenVerifier.js"
import { composeServer, type ServerDeps } from "./server.js"
import { argon2Hasher } from "./rooms/passwords.js"
import { createMemoryRoomStore } from "./rooms/roomStore.js"
import { createMemoryUserRepository, createPrismaUserRepository } from "./users/userRepository.js"

function baseDeps(verifier: TokenVerifier): ServerDeps {
  return {
    verifier,
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    hasher: argon2Hasher,
    randomInt: (max) => randomInt(max),
    now: () => Date.now(),
  }
}

export function buildServer(verifier: TokenVerifier = rejectingVerifier) {
  return composeServer(baseDeps(verifier)).app
}

function chooseVerifier(env: NodeJS.ProcessEnv): TokenVerifier {
  if (env.FIREBASE_PROJECT_ID) return createFirebaseVerifier(env)
  if (env.ALLOW_DEV_LOGIN === "true") return createDevVerifier()
  return rejectingVerifier
}

const isMain = process.argv[1] && process.argv[1].endsWith("index.ts")

if (isMain) {
  const port = Number(process.env.PORT ?? 4000)
  const host = process.env.HOST ?? "localhost"
  const prisma = new PrismaClient()
  const deps = { ...baseDeps(chooseVerifier(process.env)), users: createPrismaUserRepository(prisma) }
  const { app } = composeServer(deps)
  void app.listen({ port, host })
}
