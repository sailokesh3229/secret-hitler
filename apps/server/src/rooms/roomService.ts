/* Room rules for the lobby (spec S7-S9, Sec 10, Sec 13): create with a
   generated Room ID and hashed password, join with every error and the
   5-wrong-passwords lock, leave with host transfer, ready, seat order,
   kick, settings and start (5-10 players, all ready). The game itself
   starts in Step 11. Pure logic over injected store, hasher and clock. */
import { MAX_PLAYERS, MIN_PLAYERS_TO_START, roomPasswordProblem, generateRoomCode } from "@game/protocol"
import type { RoomSettings, TableMode } from "@game/protocol"
import type { PasswordHasher } from "./passwords.js"
import type { Member, Room, RoomStore } from "./roomStore.js"

export const WRONG_PASSWORD_LIMIT = 5
export const WRONG_PASSWORD_LOCK_MS = 5 * 60 * 1000

export type RoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "ROOM_LOCKED"
  | "ROOM_FULL"
  | "GAME_STARTED"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  | "NOT_IN_LOBBY"
  | "CANNOT_START"
  | "INVALID_SEAT_ORDER"
  | "CANNOT_KICK_SELF"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"

export class RoomError extends Error {
  constructor(readonly code: RoomErrorCode) {
    super(code)
  }
}

export interface UserRef {
  id: string
  username: string
}

export interface RoomView {
  code: string
  mode: TableMode
  status: Room["status"]
  hostId: string
  settings: RoomSettings
  seats: Member[]
  canStart: boolean
  minPlayers: number
  maxPlayers: number
}

export interface RoomServiceDeps {
  store: RoomStore
  hasher: PasswordHasher
  randomInt: (max: number) => number
  now: () => number
  onChange: (code: string) => void
}

interface FailureRecord {
  failures: number
  lockedUntil: number
}

function viewOf(room: Room): RoomView {
  const allReady = room.members.every((member) => member.ready)
  const countOk = room.members.length >= MIN_PLAYERS_TO_START && room.members.length <= MAX_PLAYERS
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    hostId: room.hostId,
    settings: room.settings,
    seats: room.members.map((member) => ({ ...member })),
    canStart: room.status === "LOBBY" && countOk && allReady,
    minPlayers: MIN_PLAYERS_TO_START,
    maxPlayers: MAX_PLAYERS,
  }
}

export function createRoomService(deps: RoomServiceDeps) {
  const { store, hasher } = deps
  const failures = new Map<string, FailureRecord>()

  function requireRoom(code: string): Room {
    const room = store.get(code.toUpperCase())
    if (!room) throw new RoomError("ROOM_NOT_FOUND")
    return room
  }

  function requireMember(room: Room, userId: string): Member {
    const member = room.members.find((candidate) => candidate.userId === userId)
    if (!member) throw new RoomError("NOT_IN_ROOM")
    return member
  }

  function requireHost(room: Room, userId: string): void {
    if (room.hostId !== userId) throw new RoomError("NOT_HOST")
  }

  function requireLobby(room: Room): void {
    if (room.status !== "LOBBY") throw new RoomError("NOT_IN_LOBBY")
  }

  function commit(room: Room): RoomView {
    store.set(room)
    deps.onChange(room.code)
    return viewOf(room)
  }

  function freshCode(): string {
    let code = generateRoomCode(deps.randomInt)
    while (store.hasCode(code)) {
      code = generateRoomCode(deps.randomInt)
    }
    return code
  }

  return {
    async create(host: UserRef, input: { mode: TableMode; password: string; settings: RoomSettings }): Promise<RoomView> {
      const problem = roomPasswordProblem(input.password)
      if (problem !== null) throw new RoomError(problem)
      const room: Room = {
        code: freshCode(),
        mode: input.mode,
        passwordHash: await hasher.hash(input.password),
        hostId: host.id,
        status: "LOBBY",
        settings: input.settings,
        members: [{ userId: host.id, username: host.username, ready: false, connected: false }],
      }
      return commit(room)
    },

    async join(user: UserRef, rawCode: string, password: string): Promise<RoomView> {
      const room = requireRoom(rawCode)
      const key = room.code + ":" + user.id
      const record = failures.get(key)
      if (record && record.lockedUntil > deps.now()) throw new RoomError("ROOM_LOCKED")
      if (room.status !== "LOBBY") throw new RoomError("GAME_STARTED")
      if (room.members.some((member) => member.userId === user.id)) return viewOf(room)
      if (room.members.length >= MAX_PLAYERS) throw new RoomError("ROOM_FULL")

      const matches = await hasher.verify(room.passwordHash, password)
      if (!matches) {
        const count = (record?.failures ?? 0) + 1
        if (count >= WRONG_PASSWORD_LIMIT) {
          failures.set(key, { failures: 0, lockedUntil: deps.now() + WRONG_PASSWORD_LOCK_MS })
          throw new RoomError("ROOM_LOCKED")
        }
        failures.set(key, { failures: count, lockedUntil: 0 })
        throw new RoomError("WRONG_PASSWORD")
      }

      failures.delete(key)
      room.members.push({ userId: user.id, username: user.username, ready: false, connected: false })
      return commit(room)
    },

    snapshot(rawCode: string): RoomView {
      return viewOf(requireRoom(rawCode))
    },

    view(rawCode: string, viewerId: string): RoomView {
      const room = requireRoom(rawCode)
      requireMember(room, viewerId)
      return viewOf(room)
    },

    leave(user: UserRef, rawCode: string): RoomView | null {
      const room = requireRoom(rawCode)
      requireMember(room, user.id)
      room.members = room.members.filter((member) => member.userId !== user.id)
      if (room.members.length === 0) {
        store.delete(room.code)
        deps.onChange(room.code)
        return null
      }
      if (room.hostId === user.id) {
        room.hostId = room.members[0]?.userId ?? room.hostId
      }
      return commit(room)
    },

    setReady(user: UserRef, rawCode: string, ready: boolean): RoomView {
      const room = requireRoom(rawCode)
      requireLobby(room)
      requireMember(room, user.id).ready = ready
      return commit(room)
    },

    setConnected(user: UserRef, rawCode: string, connected: boolean): RoomView | null {
      const room = store.get(rawCode.toUpperCase())
      if (!room) return null
      const member = room.members.find((candidate) => candidate.userId === user.id)
      if (!member) return null
      member.connected = connected
      return commit(room)
    },

    reorderSeats(host: UserRef, rawCode: string, order: string[]): RoomView {
      const room = requireRoom(rawCode)
      requireHost(room, host.id)
      requireLobby(room)
      const byId = new Map(room.members.map((member) => [member.userId, member] as const))
      const sameSet = order.length === room.members.length && new Set(order).size === order.length && order.every((id) => byId.has(id))
      if (!sameSet) throw new RoomError("INVALID_SEAT_ORDER")
      room.members = order.map((id) => byId.get(id) as Member)
      return commit(room)
    },

    kick(host: UserRef, rawCode: string, userId: string): RoomView {
      const room = requireRoom(rawCode)
      requireHost(room, host.id)
      requireLobby(room)
      if (userId === host.id) throw new RoomError("CANNOT_KICK_SELF")
      requireMember(room, userId)
      room.members = room.members.filter((member) => member.userId !== userId)
      return commit(room)
    },

    updateSettings(host: UserRef, rawCode: string, settings: RoomSettings): RoomView {
      const room = requireRoom(rawCode)
      requireHost(room, host.id)
      requireLobby(room)
      room.settings = settings
      return commit(room)
    },

    start(host: UserRef, rawCode: string): RoomView {
      const room = requireRoom(rawCode)
      requireHost(room, host.id)
      requireLobby(room)
      if (!viewOf(room).canStart) throw new RoomError("CANNOT_START")
      room.status = "STARTED"
      return commit(room)
    },
  }
}

export type RoomService = ReturnType<typeof createRoomService>
