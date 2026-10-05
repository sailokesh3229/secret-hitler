/* Server client (plan.md Step 10). Active only when EXPO_PUBLIC_API_URL is set;
   otherwise the entry screens keep using the local mock. The session token is
   the Firebase ID token once Step 9 login is wired; until then a development
   build can use "dev:<name>" against a server started with ALLOW_DEV_LOGIN=true. */
import { io, type Socket } from "socket.io-client"

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ""

let sessionToken: string | null = null
let sessionUsername: string | null = null
export const DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === "true"

export function setSessionToken(token: string | null): void {
  sessionToken = token
}

export function setSessionUsername(name: string): void {
  sessionUsername = name
}

export function currentUsername(): string | null {
  return sessionUsername
}

export function apiEnabled(): boolean {
  return BASE_URL.length > 0
}

export function serverConfigured(): boolean {
  return apiEnabled() && sessionToken !== null
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

export interface RoomSeat {
  userId: string
  username: string
  ready: boolean
  connected: boolean
}

export interface RoomView {
  code: string
  mode: "MODE_IN_PERSON" | "MODE_ONLINE"
  status: "LOBBY" | "STARTED"
  hostId: string
  settings: { timers: boolean; chat: boolean }
  seats: RoomSeat[]
  canStart: boolean
  minPlayers: number
  maxPlayers: number
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (sessionToken) headers.authorization = "Bearer " + sessionToken
  const response = await fetch(BASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const json = (await response.json().catch(() => ({}))) as { code?: string }
  if (!response.ok) throw new ApiError(response.status, json.code ?? "HTTP_" + response.status)
  return json as T
}

export const api = {
  saveUsername: (username: string) => request<{ id: string; username: string }>("POST", "/me", { username }),
  createRoom: (mode: RoomView["mode"], password: string, settings: RoomView["settings"]) =>
    request<RoomView>("POST", "/rooms", { mode, password, settings }),
  joinRoom: (code: string, password: string) => request<RoomView>("POST", "/rooms/" + code + "/join", { password }),
  getRoom: (code: string) => request<RoomView>("GET", "/rooms/" + code),
  setReady: (code: string, ready: boolean) => request<RoomView>("POST", "/rooms/" + code + "/ready", { ready }),
  startRoom: (code: string) => request<RoomView>("POST", "/rooms/" + code + "/start"),
  leaveRoom: (code: string) => request<{ room: RoomView | null }>("POST", "/rooms/" + code + "/leave"),
  reorderSeats: (code: string, order: string[]) => request<RoomView>("POST", "/rooms/" + code + "/seats", { order }),
  kick: (code: string, userId: string) => request<RoomView>("POST", "/rooms/" + code + "/kick", { userId }),
}

export function subscribeToRoom(code: string, onView: (view: RoomView) => void): () => void {
  const socket: Socket = io(BASE_URL, { auth: { token: sessionToken }, transports: ["websocket"] })
  socket.on("connect", () => {
    socket.emit("room:subscribe", { code })
  })
  socket.on("room:update", (view: RoomView) => onView(view))
  return () => {
    socket.disconnect()
  }
}

export interface GameActionResult {
  ok: boolean
  code?: string
  message?: string
}

/* One socket per room screen: room updates, the viewer's own game:view, public
   game events, and automatic re-subscribe after a reconnect (spec Sec 10). */
export function openRoomSocket(
  code: string,
  handlers: {
    onRoom: (view: RoomView) => void
    onGameView: (view: unknown) => void
    onEvents: (events: unknown[]) => void
    onStatus: (status: "live" | "offline") => void
  },
): { act: (action: unknown) => Promise<GameActionResult>; close: () => void } {
  const socket: Socket = io(BASE_URL, { auth: { token: sessionToken }, transports: ["websocket"], reconnection: true })
  socket.on("connect", () => {
    handlers.onStatus("live")
    socket.emit("room:subscribe", { code })
  })
  socket.on("disconnect", () => handlers.onStatus("offline"))
  socket.on("room:update", (view: RoomView) => handlers.onRoom(view))
  socket.on("game:view", (view: unknown) => handlers.onGameView(view))
  socket.on("game:event", (events: unknown[]) => handlers.onEvents(events))
  return {
    act: (action) => socket.emitWithAck("game:action", action) as Promise<GameActionResult>,
    close: () => socket.disconnect(),
  }
}
