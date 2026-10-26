/* Composes the REST app, the game service and the Socket.IO server around the
   room service. Room changes and game changes are announced by the services
   and broadcast by the realtime layer. */
import { randomBytes } from "node:crypto"
import { Server as SocketIOServer } from "socket.io"
import { buildApp } from "./app.js"
import type { TokenVerifier } from "./auth/tokenVerifier.js"
import { createGameService } from "./game/gameService.js"
import { createMemoryHistory, type HistoryStore } from "./game/history.js"
import { createMemoryKeyValue, type KeyValueClient } from "./game/gameStore.js"
import { attachRealtime, broadcastGame, broadcastRoom } from "./realtime/sockets.js"
import { createMemoryReports, type ReportStore } from "./game/reports.js"
import type { PasswordHasher } from "./rooms/passwords.js"
import { createRoomService } from "./rooms/roomService.js"
import type { RoomStore } from "./rooms/roomStore.js"
import type { UserRepository } from "./users/userRepository.js"

export interface ServerDeps {
  verifier: TokenVerifier
  issueGuestToken?: (() => string) | undefined
  users: UserRepository
  store: RoomStore
  hasher: PasswordHasher
  randomInt: (max: number) => number
  now: () => number
  kv?: KeyValueClient
  history?: HistoryStore
  random?: () => number
  reports?: ReportStore
}

/* 32 random bits from the OS CSPRNG, as a float in [0, 1). */
export function secureRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 0x100000000
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
  const reports = deps.reports ?? createMemoryReports()
  const history = deps.history ?? createMemoryHistory()
  const games = createGameService({
    kv: deps.kv ?? createMemoryKeyValue(),
    history,
    random: deps.random ?? secureRandom,
    now: () => new Date(deps.now()),
    onChanged: (roomCode, events) => {
      if (sockets.io) void broadcastGame(sockets.io, games, roomCode, events)
    },
  })
  const app = buildApp({
    verifier: deps.verifier,
    issueGuestToken: deps.issueGuestToken,
    users: deps.users,
    rooms,
    history,
    onRoomStarted: (room) =>
      games.start(
        room.code,
        room.seats.map((seat) => ({ userId: seat.userId, username: seat.username })),
        room.hostId,
        room.mode,
        room.settings.timers,
      ),
  })
  const io = new SocketIOServer(app.server, { cors: { origin: "*" } })
  sockets.io = io
  attachRealtime(io, { verifier: deps.verifier, users: deps.users, rooms, games, reports })
  for (const code of rooms.startedCodes()) {
    void games.rearm(code)
  }

  return { app, io, rooms, games, reports }
}
