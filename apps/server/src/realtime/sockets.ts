/* Socket.IO wiring (spec Sec 13). A phone connects with its ID token,
   subscribes to one room it belongs to, and receives room:update while in the
   lobby and game:view (its own projection only) once the game starts. Every
   game action is validated here (zod) and then by the game service. */
import type { Server as SocketIOServer } from "socket.io"
import { GAME_ACTION_EVENT, GAME_PUBLIC_EVENT, GAME_VIEW_EVENT, gameActionSchema } from "@game/protocol"
import type { TokenVerifier } from "../auth/tokenVerifier.js"
import type { GameService } from "../game/gameService.js"
import type { RoomService } from "../rooms/roomService.js"
import { RoomError } from "../rooms/roomService.js"
import type { UserRepository } from "../users/userRepository.js"

export interface RealtimeDeps {
  verifier: TokenVerifier
  users: UserRepository
  rooms: RoomService
  games: GameService
}

type Ack = (reply: unknown) => void

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

function connectedPlayers(rooms: RoomService, code: string): Set<string> {
  return new Set(rooms.snapshot(code).seats.filter((seat) => seat.connected).map((seat) => seat.userId))
}

async function sendGameViews(io: SocketIOServer, games: GameService, code: string): Promise<void> {
  const sockets = await io.in(roomChannel(code)).fetchSockets()
  for (const remote of sockets) {
    const user = remote.data.user as { id: string } | undefined
    if (!user) continue
    const view = await games.view(code, user.id)
    if (view) io.to(remote.id).emit(GAME_VIEW_EVENT, view)
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

    socket.on("room:subscribe", async (payload: unknown, ack?: Ack) => {
      const code = typeof (payload as { code?: unknown })?.code === "string" ? (payload as { code: string }).code : ""
      try {
        const view = deps.rooms.view(code, user.id)
        void socket.join(roomChannel(view.code))
        socket.data.roomCode = view.code
        deps.rooms.setConnected(user, view.code, true)
        socket.emit("room:update", deps.rooms.snapshot(view.code))
        const game = await deps.games.view(view.code, user.id)
        if (game) socket.emit(GAME_VIEW_EVENT, game)
        ack?.({ ok: true })
      } catch (error) {
        if (!(error instanceof RoomError)) throw error
        ack?.({ ok: false, code: error.code })
      }
    })

    socket.on(GAME_ACTION_EVENT, async (payload: unknown, ack?: Ack) => {
      const code = socket.data.roomCode as string | undefined
      if (!code) return ack?.({ ok: false, code: "NOT_SUBSCRIBED" })
      const parsed = gameActionSchema.safeParse(payload)
      if (!parsed.success) return ack?.({ ok: false, code: "INVALID_ACTION" })
      const result = await deps.games.perform(code, user.id, parsed.data, connectedPlayers(deps.rooms, code))
      if (!result.ok) return ack?.({ ok: false, code: result.code, message: result.message })
      io.to(roomChannel(code)).emit(GAME_PUBLIC_EVENT, result.events)
      await sendGameViews(io, deps.games, code)
      return ack?.({ ok: true })
    })

    socket.on("disconnect", () => {
      const code = socket.data.roomCode as string | undefined
      if (code) deps.rooms.setConnected(user, code, false)
    })
  })
}
