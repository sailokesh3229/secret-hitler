/* Socket.IO wiring (spec Sec 13). A phone connects with its ID token,
   subscribes to one room it belongs to, and receives room:update while in the
   lobby and game:view (its own projection only) once the game starts. Every
   game action and chat message is validated here (zod, rate limits) and then
   by the game service, which applies the mute rules (R30, R42). */
import type { Server as SocketIOServer } from "socket.io"
import { GAME_ACTION_EVENT, GAME_PUBLIC_EVENT, GAME_VIEW_EVENT, gameActionSchema } from "@game/protocol"
import type { PublicGameEvent } from "@game/protocol"
import type { TokenVerifier } from "../auth/tokenVerifier.js"
import type { ChatLine, GameService } from "../game/gameService.js"
import type { ReportStore } from "../game/reports.js"
import type { RoomService } from "../rooms/roomService.js"
import { RoomError } from "../rooms/roomService.js"
import type { UserRepository } from "../users/userRepository.js"

export interface RealtimeDeps {
  verifier: TokenVerifier
  users: UserRepository
  rooms: RoomService
  games: GameService
  reports: ReportStore
}

type Ack = (reply: unknown) => void

export const CHAT_RATE_WINDOW_MS = 10000
export const CHAT_RATE_LIMIT = 5

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

export function connectedPlayers(rooms: RoomService, code: string): Set<string> {
  return new Set(rooms.snapshot(code).seats.filter((seat) => seat.connected).map((seat) => seat.userId))
}

/* Every subscribed phone gets its own view; public events go to the whole room. */
export async function broadcastGame(io: SocketIOServer, games: GameService, code: string, events: PublicGameEvent[]): Promise<void> {
  io.to(roomChannel(code)).emit(GAME_PUBLIC_EVENT, events)
  const sockets = await io.in(roomChannel(code)).fetchSockets()
  for (const remote of sockets) {
    const user = remote.data.user as { id: string } | undefined
    if (!user) continue
    const view = await games.view(code, user.id)
    if (view) io.to(remote.id).emit(GAME_VIEW_EVENT, view)
  }
}

export function attachRealtime(io: SocketIOServer, deps: RealtimeDeps, now: () => number = Date.now): void {
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
    const chatTimes: number[] = []

    socket.on("room:subscribe", async (payload: unknown, ack?: Ack) => {
      const code = typeof (payload as { code?: unknown })?.code === "string" ? (payload as { code: string }).code : ""
      try {
        const view = deps.rooms.view(code, user.id)
        void socket.join(roomChannel(view.code))
        socket.data.roomCode = view.code
        deps.rooms.setConnected(user, view.code, true)
        socket.emit("room:update", deps.rooms.snapshot(view.code))
        const game = await deps.games.view(view.code, user.id)
        if (game) {
          socket.emit(GAME_VIEW_EVENT, game)
          socket.emit("chat:history", (await deps.games.chatLog(view.code, user.id)) ?? [])
        }
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
      return ack?.({ ok: true })
    })

    socket.on("chat:send", async (payload: unknown, ack?: Ack) => {
      const code = socket.data.roomCode as string | undefined
      if (!code) return ack?.({ ok: false, code: "NOT_SUBSCRIBED" })
      const text = typeof (payload as { text?: unknown })?.text === "string" ? (payload as { text: string }).text : ""
      const cutoff = now() - CHAT_RATE_WINDOW_MS
      while (chatTimes.length > 0 && (chatTimes[0] ?? 0) < cutoff) chatTimes.shift()
      if (chatTimes.length >= CHAT_RATE_LIMIT) return ack?.({ ok: false, code: "RATE_LIMITED" })
      const result = await deps.games.chat(code, user.id, text)
      if (!result.ok) return ack?.({ ok: false, code: result.code })
      chatTimes.push(now())
      io.to(roomChannel(code)).emit("chat:message", result.line satisfies ChatLine)
      return ack?.({ ok: true })
    })

    socket.on("chat:report", (payload: unknown, ack?: Ack) => {
      const code = socket.data.roomCode as string | undefined
      if (!code) return ack?.({ ok: false, code: "NOT_SUBSCRIBED" })
      const seq = typeof (payload as { seq?: unknown })?.seq === "number" ? (payload as { seq: number }).seq : NaN
      if (!Number.isInteger(seq)) return ack?.({ ok: false, code: "INVALID_REPORT" })
      deps.reports.add({ roomCode: code, messageSeq: seq, reporterId: user.id, at: new Date(now()).toISOString() })
      return ack?.({ ok: true })
    })

    socket.on("disconnect", () => {
      const code = socket.data.roomCode as string | undefined
      if (code) deps.rooms.setConnected(user, code, false)
    })
  })
}
