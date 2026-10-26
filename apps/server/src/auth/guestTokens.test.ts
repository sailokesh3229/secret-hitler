import { describe, expect, it } from "vitest"
import { createGuestAuth } from "./guestTokens.js"
import { composeServer } from "../server.js"
import { createMemoryRoomStore } from "../rooms/roomStore.js"
import { createMemoryUserRepository } from "../users/userRepository.js"

describe("temporary guest authentication", () => {
  it("issues independent opaque identities and rejects a forged or expired token", async () => {
    let now = 1000
    const auth = createGuestAuth(Buffer.alloc(32, 7), () => now)
    const first = auth.issueToken()
    const second = auth.issueToken()
    const firstIdentity = await auth.verifier.verify(first)
    const secondIdentity = await auth.verifier.verify(second)
    expect(firstIdentity?.provider).toBe("guest")
    expect(firstIdentity?.providerUid).not.toBe(secondIdentity?.providerUid)
    expect(await auth.verifier.verify(first.replace(/.$/, "x"))).toBeNull()
    expect(await auth.verifier.verify("dev:Host")).toBeNull()
    now += 31 * 24 * 60 * 60 * 1000
    expect(await auth.verifier.verify(first)).toBeNull()
  })

  it("keeps another guest's account inaccessible without their issued token", async () => {
    const auth = createGuestAuth(Buffer.alloc(32, 9))
    const { app, io } = composeServer({
      verifier: auth.verifier,
      issueGuestToken: auth.issueToken,
      users: createMemoryUserRepository(),
      store: createMemoryRoomStore(),
      hasher: { hash: async (value) => value, verify: async (a, b) => a === b },
      randomInt: () => 0,
      now: Date.now,
    })
    const first = await app.inject({ method: "POST", url: "/auth/guest" })
    const second = await app.inject({ method: "POST", url: "/auth/guest" })
    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    const firstToken = String(first.json().token)
    const secondToken = String(second.json().token)
    const firstCreated = await app.inject({ method: "POST", url: "/me", headers: { authorization: `Bearer ${firstToken}` }, payload: { username: "First" } })
    expect(firstCreated.statusCode).toBe(201)
    const other = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${secondToken}` } })
    expect(other.statusCode).toBe(404)
    const forged = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer dev:First" } })
    expect(forged.statusCode).toBe(401)
    await io.close()
    await app.close()
  })
})
