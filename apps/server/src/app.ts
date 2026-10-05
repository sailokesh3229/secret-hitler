/* Fastify REST API (spec Sec 11, 13). Step 9 routes: username availability
   and creating the account's username after Firebase login. Every route
   that acts on a player verifies the ID token first (CLAUDE.md rule 1). */
import Fastify from "fastify"
import { usernameProblem } from "@game/protocol"
import type { TokenVerifier, VerifiedIdentity } from "./auth/tokenVerifier.js"
import { UsernameTakenError, type UserRepository } from "./users/userRepository.js"

export interface AppDeps {
  verifier: TokenVerifier
  users: UserRepository
}

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

  async function identityOrNull(authorization: string | undefined): Promise<VerifiedIdentity | null> {
    const token = bearerToken(authorization)
    if (token === null) return null
    return deps.verifier.verify(token)
  }

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

  return app
}
