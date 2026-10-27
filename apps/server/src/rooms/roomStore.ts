/* Room store. The in-memory version supports tests and local demo mode;
   Postgres-backed snapshots survive restarts on the free web host. */
import type { RoomSettings, TableMode } from "@game/protocol"
import type { Prisma, PrismaClient } from "@prisma/client"
import { roomSettingsSchema } from "@game/protocol"

export type RoomStatus = "LOBBY" | "STARTED"

export interface Member {
  userId: string
  username: string
  ready: boolean
  connected: boolean
}

export interface Room {
  code: string
  mode: TableMode
  passwordHash: string
  hostId: string
  status: RoomStatus
  settings: RoomSettings
  members: Member[]
}

export interface RoomStore {
  get(code: string): Room | undefined
  set(room: Room): void
  delete(code: string): void
  hasCode(code: string): boolean
  listStartedCodes(): string[]
  flush(): Promise<void>
}

export function createMemoryRoomStore(): RoomStore {
  const rooms = new Map<string, Room>()
  return {
    get: (code) => rooms.get(code),
    set: (room) => {
      rooms.set(room.code, room)
    },
    delete: (code) => {
      rooms.delete(code)
    },
    hasCode: (code) => rooms.has(code),
    listStartedCodes: () => [...rooms.values()].filter((room) => room.status === "STARTED").map((room) => room.code),
    flush: () => Promise.resolve(),
  }
}

function isRoom(value: unknown): value is Room {
  if (!value || typeof value !== "object") return false
  const room = value as Partial<Room>
  return typeof room.code === "string" && typeof room.passwordHash === "string" && typeof room.hostId === "string" &&
    (room.status === "LOBBY" || room.status === "STARTED") &&
    (room.mode === "MODE_IN_PERSON" || room.mode === "MODE_ONLINE") &&
    roomSettingsSchema.safeParse(room.settings).success && Array.isArray(room.members) &&
    room.members.every((member) => typeof member.userId === "string" && typeof member.username === "string" && typeof member.ready === "boolean" && typeof member.connected === "boolean")
}

export async function createPrismaRoomStore(prisma: PrismaClient): Promise<RoomStore> {
  const rooms = new Map<string, Room>()
  const archivedCodes = new Set((await prisma.room.findMany({ select: { roomCode: true } })).map((row) => row.roomCode))
  for (const row of await prisma.liveRoom.findMany()) {
    if (!isRoom(row.state) || row.state.code !== row.code) throw new Error("Invalid stored room: " + row.code)
    const room = structuredClone(row.state)
    room.members.forEach((member) => { member.connected = false })
    rooms.set(row.code, room)
    if (row.state.members.some((member) => member.connected)) {
      await prisma.liveRoom.update({ where: { code: row.code }, data: { state: room as unknown as Prisma.InputJsonValue } })
    }
  }
  let pending: Promise<unknown> = Promise.resolve()
  function queue(write: () => Promise<unknown>): void {
    pending = pending.catch(() => undefined).then(write)
    void pending.catch((error) => console.error("Room persistence failed:", error))
  }
  return {
    get: (code) => rooms.get(code),
    hasCode: (code) => rooms.has(code) || archivedCodes.has(code),
    listStartedCodes: () => [...rooms.values()].filter((room) => room.status === "STARTED").map((room) => room.code),
    set: (room) => {
      const snapshot = structuredClone(room)
      rooms.set(room.code, snapshot)
      const state = snapshot as unknown as Prisma.InputJsonValue
      queue(() => prisma.liveRoom.upsert({ where: { code: room.code }, create: { code: room.code, state }, update: { state } }))
    },
    delete: (code) => {
      rooms.delete(code)
      queue(() => prisma.liveRoom.deleteMany({ where: { code } }))
    },
    flush: async () => { await pending },
  }
}
