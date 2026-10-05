/* Socket.IO wiring (spec Sec 13). A phone connects with its Firebase ID token,
   subscribes to one room it belongs to, and receives room:update whenever the
   room changes. Room views contain only public lobby facts (no password hash,
   no hidden roles). */
import type { Server as SocketIOServer } from "socket.io"
import type { TokenVerifier } from "../auth/tokenVerifier.js"
import type { RoomService } from "../rooms/roomService.js"
import { RoomError } from "../rooms/roomService.js"
import type { UserRepository } from "../users/userRepository.js"

export interface RealtimeDeps {
  verifier: TokenVerifier
  users: UserRepository
  rooms: RoomService
}

export function roomChannel(code: string): string {
  return "room:" + code
}

export function broadcastRoom(io: SocketIOServer, rooms: RoomService, code: string): void {
  try {
    io.to(roomChannel(code)).emit("room:update", rooms.snapshot(code))
  } catch (error) {
    if (!(error instanceof RoomError)) throw error
  }
}

export function attachRealtime(io: SocketIOServer, deps: RealtimeDeps): void {
  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : null
    const identity = token === null ? null : await deps.verifier.verify(token)
    if (identity === null) return next(new Error("UNAUTHENTICATED"))
    const user = await deps.users.findByIdentity(identity.provider, identity.providerUid)
    if (user === null) return next(new Error("NO_USERNAME"))
    socket.data.user = { id: user.id, username: user.username }
    return next()
  })

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; username: string }

    socket.on("room:subscribe", (payload: unknown, ack?: (reply: unknown) => void) => {
      const code = typeof (payload as { code?: unknown })?.code === "string" ? (payload as { code: string }).code : ""
      try {
        const view = deps.rooms.view(code, user.id)
        void socket.join(roomChannel(view.code))
        socket.data.roomCode = view.code
        deps.rooms.setConnected(user, view.code, true)
        socket.emit("room:update", deps.rooms.snapshot(view.code))
        ack?.({ ok: true })
      } catch (error) {
        if (!(error instanceof RoomError)) throw error
        ack?.({ ok: false, code: error.code })
      }
    })

    socket.on("disconnect", () => {
      const code = socket.data.roomCode as string | undefined
      if (code) deps.rooms.setConnected(user, code, false)
    })
  })
}
