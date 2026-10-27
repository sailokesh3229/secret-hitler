/* Shared HTTP and socket client. Firebase tokens refresh through a provider;
   temporary guest tokens are signed and issued by the server. */
import { io, type Socket } from "socket.io-client"

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ""

let sessionToken: string | null = null
let sessionUsername: string | null = null
let tokenProvider: (() => Promise<string | null>) | null = null
export const DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === "true"

export function setSessionToken(token: string | null): void {
  sessionToken = token
}

export function setTokenProvider(provider: (() => Promise<string | null>) | null): void {
  tokenProvider = provider
}

async function currentToken(): Promise<string | null> {
  if (tokenProvider) {
    const fresh = await tokenProvider()
    sessionToken = fresh
  }
  return sessionToken
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
  const token = await currentToken()
  if (token) headers.authorization = "Bearer " + token
  const response = await fetch(BASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const json = (await response.json().catch(() => ({}))) as { code?: string }
  if (!response.ok) throw new ApiError(response.status, json.code ?? "HTTP_" + response.status)
  return json as T
}

export const api = {
  createGuestSession: () => request<{ token: string }>("POST", "/auth/guest", {}),
  me: () => request<{ id: string; username: string }>("GET", "/me"),
  saveUsername: (username: string) => request<{ id: string; username: string }>("POST", "/me", { username }),
  checkUsername: (username: string) => request<{ available: boolean }>("GET", "/usernames/" + encodeURIComponent(username) + "/availability"),
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

export function subscribeToRoom(code: string, onView: (view: RoomView) => void, onIssue?: (code: string | null) => void): () => void {
  const socket: Socket = io(BASE_URL, { auth: (next) => { void currentToken().then((token) => next({ token })).catch(() => next({ token: null })) }, transports: ["websocket"] })
  socket.on("connect", () => {
    socket.emit("room:subscribe", { code }, (reply: { ok: boolean; code?: string }) => {
      onIssue?.(reply.ok ? null : reply.code ?? "UNKNOWN")
    })
  })
  socket.on("disconnect", () => onIssue?.("OFFLINE"))
  socket.on("connect_error", (error: Error) => onIssue?.(error.message))
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

export function mockAllowed(): boolean {
  return __DEV__ && !apiEnabled()
}

export interface ChatLineView {
  seq: number
  authorId: string
  authorName: string
  text: string
}

export interface GameListItemView {
  id: string
  roomCode: string
  mode: string
  playerCount: number
  winner: string | null
  winReason: string | null
  startedAt: string
  endedAt: string
  myRole: string
  won: boolean
}

export const gamesApi = {
  mine: () => request<GameListItemView[]>("GET", "/me/games"),
  detail: (id: string) => request<{ id: string; players: { userId: string; username?: string; seat: number; role: string; alive: boolean }[]; events: { kind: string; actorId?: string; targetId?: string; reveal?: unknown; winner?: string; winReason?: string; enacted?: string; chaosPolicy?: string; seq: number }[]; winner: string | null; winReason: string | null; roomCode: string; mode: string; playerCount: number; startedAt: string; endedAt: string }>("GET", "/games/" + id),
  deleteAccount: () => request<void>("DELETE", "/me"),
}

/* One socket per room screen: room updates, the viewer's own game:view with
   its deadline, public events, online chat, and automatic re-subscribe after a
   reconnect (spec Sec 10). `resync` reconnects when the app returns to the
   foreground. */
export function openRoomSocket(
  code: string,
  handlers: {
    onRoom: (view: RoomView) => void
    onGameView: (view: unknown) => void
    onEvents: (events: unknown[]) => void
    onChatHistory: (lines: ChatLineView[]) => void
    onChatMessage: (line: ChatLineView) => void
    onStatus: (status: "live" | "offline") => void
  },
): {
  act: (action: unknown) => Promise<GameActionResult>
  sendChat: (text: string) => Promise<GameActionResult>
  reportChat: (seq: number) => Promise<GameActionResult>
  resync: () => void
  close: () => void
} {
  const socket: Socket = io(BASE_URL, { auth: (next) => { void currentToken().then((token) => next({ token })).catch(() => next({ token: null })) }, transports: ["websocket"], reconnection: true })
  socket.on("connect", () => {
    handlers.onStatus("live")
    socket.emit("room:subscribe", { code })
  })
  socket.on("disconnect", () => handlers.onStatus("offline"))
  socket.on("room:update", (view: RoomView) => handlers.onRoom(view))
  socket.on("game:view", (view: unknown) => handlers.onGameView(view))
  socket.on("game:event", (events: unknown[]) => handlers.onEvents(events))
  socket.on("chat:history", (lines: ChatLineView[]) => handlers.onChatHistory(lines))
  socket.on("chat:message", (line: ChatLineView) => handlers.onChatMessage(line))
  return {
    act: (action) => socket.emitWithAck("game:action", action) as Promise<GameActionResult>,
    sendChat: (text) => socket.emitWithAck("chat:send", { text }) as Promise<GameActionResult>,
    reportChat: (seq) => socket.emitWithAck("chat:report", { seq }) as Promise<GameActionResult>,
    resync: () => {
      if (socket.disconnected) socket.connect()
    },
    close: () => socket.disconnect(),
  }
}
