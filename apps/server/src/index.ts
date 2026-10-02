/* apps/server - Fastify (REST) + Socket.IO (real-time). The server is the
   only source of truth (CLAUDE.md rule 1): phones send actions, the server
   validates them with packages/engine and replies with projectView().
   Rooms, auth, DB and real game wiring land per plan.md Steps 9-11. This
   placeholder proves Fastify boots and a health check responds. */
import Fastify from "fastify"
import { Server as SocketIOServer } from "socket.io"

export function buildServer() {
  const app = Fastify({ logger: true })

  app.get("/health", async () => ({ status: "ok" }))

  return app
}

const isMain = process.argv[1] && process.argv[1].endsWith("index.ts")

if (isMain) {
  const port = Number(process.env.PORT ?? 4000)
  const host = process.env.HOST ?? "localhost"
  const app = buildServer()
  app.listen({ port, host }).then(() => {
    const io = new SocketIOServer(app.server, { cors: { origin: "*" } })
    io.on("connection", (socket) => {
      app.log.info({ socketId: socket.id }, "socket connected")
    })
  })
}
