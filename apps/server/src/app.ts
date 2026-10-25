/* Fastify REST API (spec Sec 11, 13). Step 9 routes: username availability
   and creating the account's username after Firebase login. Every route
   that acts on a player verifies the ID token first (CLAUDE.md rule 1). */
import Fastify from "fastify"
import cors from "@fastify/cors"
import type { HistoryStore } from "./game/history.js"
import type { FastifyReply } from "fastify"
import { roomSettingsSchema, usernameProblem } from "@game/protocol"
import type { TableMode } from "@game/protocol"
import type { TokenVerifier, VerifiedIdentity } from "./auth/tokenVerifier.js"
import { RoomError, type RoomErrorCode, type RoomService, type RoomView, type UserRef } from "./rooms/roomService.js"
import { UsernameTakenError, type UserRepository } from "./users/userRepository.js"

export interface AppDeps {
  verifier: TokenVerifier
  users: UserRepository
  rooms: RoomService
  onRoomStarted?: (room: RoomView) => Promise<void>
  history: HistoryStore
}

const ROOM_ERROR_STATUS: Record<RoomErrorCode, number> = {
  ROOM_NOT_FOUND: 404,
  WRONG_PASSWORD: 403,
  ROOM_LOCKED: 429,
  ROOM_FULL: 409,
  GAME_STARTED: 409,
  NOT_IN_ROOM: 403,
  NOT_HOST: 403,
  NOT_IN_LOBBY: 409,
  CANNOT_START: 409,
  INVALID_SEAT_ORDER: 400,
  CANNOT_KICK_SELF: 400,
  PASSWORD_TOO_SHORT: 400,
  PASSWORD_TOO_LONG: 400,
}

const RATE_WINDOW_MS = 60000
const RATE_LIMIT_PER_MINUTE = 120

export interface AppOptions {
  logger?: boolean
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

export function buildApp(deps: AppDeps, options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false })
  void app.register(cors, { origin: true })
  const windows = new Map<string, { start: number; count: number }>()
  app.addHook("onRequest", async (request, reply) => {
    const now = Date.now()
    const window = windows.get(request.ip)
    if (!window || now - window.start >= RATE_WINDOW_MS) {
      windows.set(request.ip, { start: now, count: 1 })
      return
    }
    window.count += 1
    if (window.count > RATE_LIMIT_PER_MINUTE) {
      return reply.code(429).send({ code: "RATE_LIMITED" })
    }
  })

  async function identityOrNull(authorization: string | undefined): Promise<VerifiedIdentity | null> {
    const token = bearerToken(authorization)
    if (token === null) return null
    return deps.verifier.verify(token)
  }

  app.get("/", async () => ({ status: "ok", service: "secret-hitler-server" }))
  app.get("/health", async () => ({ status: "ok" }))

  app.get<{ Params: { username: string } }>("/usernames/:username/availability", async (request, reply) => {
    const problem = usernameProblem(request.params.username)
    if (problem !== null) {
      return reply.code(400).send({ code: problem })
    }
    const taken = await deps.users.usernameTaken(request.params.username)
    return { available: !taken }
  })

  app.get("/me", async (request, reply) => {
    const identity = await identityOrNull(request.headers.authorization)
    if (identity === null) {
      return reply.code(401).send({ code: "UNAUTHENTICATED" })
    }
    const user = await deps.users.findByIdentity(identity.provider, identity.providerUid)
    if (user === null) {
      return reply.code(404).send({ code: "NO_USERNAME" })
    }
    return { id: user.id, username: user.username }
  })

  app.post<{ Body: { username?: unknown } }>("/me", async (request, reply) => {
    const identity = await identityOrNull(request.headers.authorization)
    if (identity === null) {
      return reply.code(401).send({ code: "UNAUTHENTICATED" })
    }
    const username = typeof request.body?.username === "string" ? request.body.username : ""
    const problem = usernameProblem(username)
    if (problem !== null) {
      return reply.code(400).send({ code: problem })
    }
    const existing = await deps.users.findByIdentity(identity.provider, identity.providerUid)
    if (existing !== null) {
      return reply.code(409).send({ code: "ALREADY_HAS_USERNAME" })
    }
    try {
      const user = await deps.users.createUser({ username, provider: identity.provider, providerUid: identity.providerUid })
      return reply.code(201).send({ id: user.id, username: user.username })
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        return reply.code(409).send({ code: "USERNAME_TAKEN" })
      }
      throw error
    }
  })

  async function requireUser(authorization: string | undefined, reply: FastifyReply): Promise<UserRef | null> {
    const identity = await identityOrNull(authorization)
    if (identity === null) {
      await reply.code(401).send({ code: "UNAUTHENTICATED" })
      return null
    }
    const user = await deps.users.findByIdentity(identity.provider, identity.providerUid)
    if (user === null) {
      await reply.code(403).send({ code: "NO_USERNAME" })
      return null
    }
    return { id: user.id, username: user.username }
  }

  async function withRoomErrors(reply: FastifyReply, action: () => Promise<unknown> | unknown) {
    try {
      return await action()
    } catch (error) {
      if (error instanceof RoomError) {
        return reply.code(ROOM_ERROR_STATUS[error.code]).send({ code: error.code })
      }
      throw error
    }
  }

  app.post<{ Body: { mode?: unknown; password?: unknown; settings?: unknown } }>("/rooms", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const settings = roomSettingsSchema.safeParse(request.body?.settings)
    const mode = request.body?.mode
    if (!settings.success || !isTableMode(mode)) {
      return reply.code(400).send({ code: "INVALID_ROOM_SETTINGS" })
    }
    const password = typeof request.body?.password === "string" ? request.body.password : ""
    return withRoomErrors(reply, async () => reply.code(201).send(await deps.rooms.create(user, { mode, password, settings: settings.data })))
  })

  app.get<{ Params: { code: string } }>("/rooms/:code", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    return withRoomErrors(reply, () => deps.rooms.view(request.params.code, user.id))
  })

  app.post<{ Params: { code: string }; Body: { password?: unknown } }>("/rooms/:code/join", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const password = typeof request.body?.password === "string" ? request.body.password : ""
    return withRoomErrors(reply, () => deps.rooms.join(user, request.params.code, password))
  })

  app.post<{ Params: { code: string } }>("/rooms/:code/leave", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    return withRoomErrors(reply, () => ({ room: deps.rooms.leave(user, request.params.code) }))
  })

  app.post<{ Params: { code: string }; Body: { ready?: unknown } }>("/rooms/:code/ready", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    if (typeof request.body?.ready !== "boolean") {
      return reply.code(400).send({ code: "INVALID_READY_FLAG" })
    }
    return withRoomErrors(reply, () => deps.rooms.setReady(user, request.params.code, request.body.ready as boolean))
  })

  app.post<{ Params: { code: string }; Body: { order?: unknown } }>("/rooms/:code/seats", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const order = Array.isArray(request.body?.order) && request.body.order.every((id) => typeof id === "string") ? (request.body.order as string[]) : null
    if (order === null) {
      return reply.code(400).send({ code: "INVALID_SEAT_ORDER" })
    }
    return withRoomErrors(reply, () => deps.rooms.reorderSeats(user, request.params.code, order))
  })

  app.post<{ Params: { code: string }; Body: { userId?: unknown } }>("/rooms/:code/kick", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const userId = typeof request.body?.userId === "string" ? request.body.userId : ""
    return withRoomErrors(reply, () => deps.rooms.kick(user, request.params.code, userId))
  })

  app.put<{ Params: { code: string }; Body: unknown }>("/rooms/:code/settings", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const settings = roomSettingsSchema.safeParse(request.body)
    if (!settings.success) {
      return reply.code(400).send({ code: "INVALID_ROOM_SETTINGS" })
    }
    return withRoomErrors(reply, () => deps.rooms.updateSettings(user, request.params.code, settings.data))
  })

  app.post<{ Params: { code: string } }>("/rooms/:code/start", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    return withRoomErrors(reply, async () => {
      const view = deps.rooms.start(user, request.params.code)
      await deps.onRoomStarted?.(view)
      return view
    })
  })

  app.delete("/me", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    await deps.history.deleteForUser(user.id)
    await deps.users.deleteUser(user.id)
    return reply.code(204).send()
  })

  app.get("/me/games", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    return deps.history.listForUser(user.id)
  })

  app.get<{ Params: { id: string } }>("/games/:id", async (request, reply) => {
    const user = await requireUser(request.headers.authorization, reply)
    if (user === null) return reply
    const game = await deps.history.get(request.params.id)
    if (game === null || !game.players.some((player) => player.userId === user.id)) {
      return reply.code(404).send({ code: "GAME_NOT_FOUND" })
    }
    return game
  })

  return app
}

function isTableMode(value: unknown): value is TableMode {
  return value === "MODE_IN_PERSON" || value === "MODE_ONLINE"
}
