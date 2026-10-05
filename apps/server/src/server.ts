/* Composes the REST app and the Socket.IO server around one room service.
   The room service announces each change and the realtime layer broadcasts it. */
import { Server as SocketIOServer } from "socket.io"
import { buildApp } from "./app.js"
import type { TokenVerifier } from "./auth/tokenVerifier.js"
import { attachRealtime, broadcastRoom } from "./realtime/sockets.js"
import { createRoomService } from "./rooms/roomService.js"
import type { PasswordHasher } from "./rooms/passwords.js"
import type { RoomStore } from "./rooms/roomStore.js"
import type { UserRepository } from "./users/userRepository.js"

export interface ServerDeps {
  verifier: TokenVerifier
  users: UserRepository
  store: RoomStore
  hasher: PasswordHasher
  randomInt: (max: number) => number
  now: () => number
}

export function composeServer(deps: ServerDeps) {
  const sockets: { io?: SocketIOServer } = {}
  const rooms = createRoomService({
    store: deps.store,
    hasher: deps.hasher,
    randomInt: deps.randomInt,
    now: deps.now,
    onChange: (code) => {
      if (sockets.io) broadcastRoom(sockets.io, rooms, code)
    },
  })
  const app = buildApp({ verifier: deps.verifier, users: deps.users, rooms })
  const io = new SocketIOServer(app.server, { cors: { origin: "*" } })
  sockets.io = io
  attachRealtime(io, { verifier: deps.verifier, users: deps.users, rooms })
  return { app, io, rooms }
}
