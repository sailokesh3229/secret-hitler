/* apps/server entry point. Fastify (REST) + Socket.IO (real-time). The
   server is the only source of truth (CLAUDE.md rule 1): phones send
   actions, the server validates them with packages/engine and replies
   with projectView(). Step 9 wires Firebase login and Prisma; rooms and
   live games arrive in Steps 10-11. */
import { PrismaClient } from "@prisma/client"
import { Server as SocketIOServer } from "socket.io"
import { buildApp, type AppDeps } from "./app.js"
import { createFirebaseVerifier, rejectingVerifier } from "./auth/tokenVerifier.js"
import { createMemoryUserRepository, createPrismaUserRepository } from "./users/userRepository.js"

export function buildServer(deps: AppDeps = { verifier: rejectingVerifier, users: createMemoryUserRepository() }) {
  return buildApp(deps)
}

const isMain = process.argv[1] && process.argv[1].endsWith("index.ts")

if (isMain) {
  const port = Number(process.env.PORT ?? 4000)
  const host = process.env.HOST ?? "localhost"
  const prisma = new PrismaClient()
  const app = buildApp(
    { verifier: createFirebaseVerifier(process.env), users: createPrismaUserRepository(prisma) },
    { logger: true },
  )
  app.listen({ port, host }).then(() => {
    const io = new SocketIOServer(app.server, { cors: { origin: "*" } })
    io.on("connection", (socket) => {
      app.log.info({ socketId: socket.id }, "socket connected")
    })
  })
}
