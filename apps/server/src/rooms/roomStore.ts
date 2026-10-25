/* Room store. Step 10 keeps rooms in memory; Step 11 moves live state to Redis and history to Postgres behind this same interface. */
import type { RoomSettings, TableMode } from "@game/protocol"

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
  }
}
