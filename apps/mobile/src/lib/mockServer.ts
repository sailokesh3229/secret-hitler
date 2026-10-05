/* Stand-in for the server until plan.md Step 10. Every entry, room and
   lobby screen calls these functions so Step 10 only swaps the
   implementation for real REST and Socket.IO calls. Room IDs use an
   alphabet with no look-alike characters (spec S7: no 0/O, 1/I/L). */
export type JoinError = "NO_ROOM" | "WRONG_PASSWORD" | "LOCKED" | "FULL" | "STARTED"
export type TableMode = "MODE_IN_PERSON" | "MODE_ONLINE"

export interface MockRoom {
  id: string
  password: string
  playerCount: number
  started: boolean
}

export interface LobbyPlayer {
  name: string
  ready: boolean
  connected: boolean
}

const ROOM_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const ROOM_ID_LENGTH = 6
const MAX_PLAYERS = 10
const MAX_WRONG_PASSWORDS = 5
const TAKEN_USERNAMES = ["arjun", "maya", "admin"]
const LOBBY_NAMES = ["Arjun", "Maya", "Priya", "Rohan", "Zara", "Dev", "Ishaan", "Kiara", "Neel", "Tara"]

const rooms: MockRoom[] = [
  { id: "K7M2QX", password: "1234", playerCount: 6, started: false },
  { id: "P3WD9R", password: "1234", playerCount: 10, started: false },
  { id: "HNF4TB", password: "1234", playerCount: 7, started: true },
]
let wrongPasswordCount = 0

export function generateRoomId(): string {
  let id = ""
  for (let i = 0; i < ROOM_ID_LENGTH; i += 1) {
    id += ROOM_ID_ALPHABET.charAt(Math.floor(Math.random() * ROOM_ID_ALPHABET.length))
  }
  return id
}

export function createMockRoom(password: string): MockRoom {
  const room: MockRoom = { id: generateRoomId(), password, playerCount: 1, started: false }
  rooms.push(room)
  return room
}

export function joinMockRoom(roomId: string, password: string): { ok: true; room: MockRoom } | { ok: false; error: JoinError } {
  if (wrongPasswordCount >= MAX_WRONG_PASSWORDS) return { ok: false, error: "LOCKED" }
  const room = rooms.find((candidate) => candidate.id === roomId.toUpperCase())
  if (!room) return { ok: false, error: "NO_ROOM" }
  if (room.started) return { ok: false, error: "STARTED" }
  if (room.playerCount >= MAX_PLAYERS) return { ok: false, error: "FULL" }
  if (room.password !== password) {
    wrongPasswordCount += 1
    return { ok: false, error: wrongPasswordCount >= MAX_WRONG_PASSWORDS ? "LOCKED" : "WRONG_PASSWORD" }
  }
  return { ok: true, room }
}

export function isUsernameTaken(name: string): boolean {
  return TAKEN_USERNAMES.includes(name.toLowerCase())
}

export function mockLobbyPlayers(count: number, someoneNotReady: boolean): LobbyPlayer[] {
  return LOBBY_NAMES.slice(0, count).map((name, index) => ({
    name,
    ready: !(someoneNotReady && index === count - 1),
    connected: true,
  }))
}
