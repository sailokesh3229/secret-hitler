import { describe, expect, it } from "vitest"
import { composeServer } from "./server.js"
import { createMemoryRoomStore } from "./rooms/roomStore.js"
import type { TokenVerifier } from "./auth/tokenVerifier.js"
import { createMemoryUserRepository } from "./users/userRepository.js"

const verifier: TokenVerifier = {
  verify: (token) => {
    if (token === "token-a") return Promise.resolve({ provider: "phone", providerUid: "uid-a" })
    if (token === "token-b") return Promise.resolve({ provider: "google.com", providerUid: "uid-b" })
    return Promise.resolve(null)
  },
}

const fakeHasher = {
  hash: (password: string) => Promise.resolve("hash:" + password),
  verify: (hash: string, password: string) => Promise.resolve(hash === "hash:" + password),
}

function newApp() {
  return composeServer({
    verifier,
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    hasher: fakeHasher,
    randomInt: () => 0,
    now: () => Date.now(),
  }).app
}

describe("S5 username availability (Step 9)", () => {
  it("reports a free name as available", async () => {
    const app = newApp()
    const response = await app.inject({ method: "GET", url: "/usernames/maya_k/availability" })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ available: true })
  })

  it("rejects an invalid name before touching the database", async () => {
    const app = newApp()
    const response = await app.inject({ method: "GET", url: "/usernames/ma%20ya/availability" })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ code: "USERNAME_BAD_CHARACTERS" })
  })
})

describe("S5 choose username, signed in with Firebase (Step 9)", () => {
  it("refuses to create a username without a valid ID token", async () => {
    const app = newApp()
    const response = await app.inject({ method: "POST", url: "/me", payload: { username: "maya_k" } })
    expect(response.statusCode).toBe(401)
  })

  it("creates the username for the verified identity and returns it from GET /me", async () => {
    const app = newApp()
    const created = await app.inject({
      method: "POST",
      url: "/me",
      headers: { authorization: "Bearer token-a" },
      payload: { username: "maya_k" },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({ username: "maya_k" })

    const me = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer token-a" } })
    expect(me.json()).toMatchObject({ username: "maya_k" })
  })

  it("gives each account only one username", async () => {
    const app = newApp()
    await app.inject({ method: "POST", url: "/me", headers: { authorization: "Bearer token-a" }, payload: { username: "maya_k" } })
    const again = await app.inject({ method: "POST", url: "/me", headers: { authorization: "Bearer token-a" }, payload: { username: "other_name" } })
    expect(again.statusCode).toBe(409)
    expect(again.json()).toEqual({ code: "ALREADY_HAS_USERNAME" })
  })

  it("rejects a name another player already has, ignoring case", async () => {
    const app = newApp()
    await app.inject({ method: "POST", url: "/me", headers: { authorization: "Bearer token-a" }, payload: { username: "maya_k" } })
    const taken = await app.inject({ method: "POST", url: "/me", headers: { authorization: "Bearer token-b" }, payload: { username: "MAYA_K" } })
    expect(taken.statusCode).toBe(409)
    expect(taken.json()).toEqual({ code: "USERNAME_TAKEN" })
  })

  it("reports no username yet for a signed-in account that has not chosen one", async () => {
    const app = newApp()
    const response = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer token-b" } })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ code: "NO_USERNAME" })
  })
})

describe("browser access (web deployment)", () => {
  it("answers a CORS preflight for a cross-origin browser request instead of 404ing it", async () => {
    const app = newApp()
    const response = await app.inject({
      method: "OPTIONS",
      url: "/usernames/someone/availability",
      headers: {
        origin: "http://example.com",
        "access-control-request-method": "GET",
      },
    })
    expect(response.statusCode).toBeLessThan(300)
    expect(response.headers["access-control-allow-origin"]).toBe("http://example.com")
  })

  it("echoes the request origin on a normal cross-origin GET", async () => {
    const app = newApp()
    const response = await app.inject({ method: "GET", url: "/usernames/someone/availability", headers: { origin: "http://example.com" } })
    expect(response.statusCode).toBe(200)
    expect(response.headers["access-control-allow-origin"]).toBe("http://example.com")
  })
})

describe("root path (health probes that ignore the configured path)", () => {
  it("answers 200 on a bare GET / instead of 404ing", async () => {
    const app = newApp()
    const response = await app.inject({ method: "GET", url: "/" })
    expect(response.statusCode).toBe(200)
  })
})
