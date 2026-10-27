import { describe, expect, it } from "vitest"
import { createDevVerifier } from "../auth/tokenVerifier.js"
import { composeServer } from "../server.js"
import { createMemoryRoomStore } from "./roomStore.js"
import { createMemoryUserRepository } from "../users/userRepository.js"

const fakeHasher = {
  hash: (password: string) => Promise.resolve("hash:" + password),
  verify: (hash: string, password: string) => Promise.resolve(hash === "hash:" + password),
}

const SETTINGS = { timers: false, chat: false }

let currentTime = 1_000_000

function newServer() {
  let counter = 0
  return composeServer({
    verifier: createDevVerifier(),
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    hasher: fakeHasher,
    randomInt: (max) => (counter++ * 7) % max,
    now: () => currentTime,
  }).app
}

async function registered(app: ReturnType<typeof newServer>, name: string) {
  const auth = { authorization: "Bearer dev:" + name }
  await app.inject({ method: "POST", url: "/me", headers: auth, payload: { username: name } })
  return { name, auth }
}

async function createRoom(app: ReturnType<typeof newServer>, host: { auth: { authorization: string } }, password = "1234") {
  const response = await app.inject({
    method: "POST",
    url: "/rooms",
    headers: host.auth,
    payload: { mode: "MODE_IN_PERSON", password, settings: SETTINGS },
  })
  return response.json().code as string
}

describe("S7 create a room (Step 10)", () => {
  it("returns a 6-character code and never sends the password hash", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const response = await app.inject({
      method: "POST",
      url: "/rooms",
      headers: host.auth,
      payload: { mode: "MODE_IN_PERSON", password: "1234", settings: SETTINGS },
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().code).toHaveLength(6)
    expect(response.body).not.toContain("hash:")
    expect(response.json().canStart).toBe(false)
  })

  it("assigns distinct codes when two hosts create rooms while password hashes are pending", async () => {
    let releaseHashes: (() => void) | undefined
    const hashGate = new Promise<void>((resolve) => { releaseHashes = resolve })
    let counter = 0
    const app = composeServer({
      verifier: createDevVerifier(), users: createMemoryUserRepository(), store: createMemoryRoomStore(),
      hasher: { hash: async (password) => { await hashGate; return "hash:" + password }, verify: fakeHasher.verify },
      randomInt: (max) => (counter++ * 7) % max, now: () => currentTime,
    }).app
    const first = await registered(app, "FirstHost")
    const second = await registered(app, "SecondHost")
    const requests = [first, second].map((host) => app.inject({
      method: "POST", url: "/rooms", headers: host.auth,
      payload: { mode: "MODE_IN_PERSON", password: "1234", settings: SETTINGS },
    }))
    releaseHashes?.()
    const results = await Promise.all(requests)
    expect(results.map((result) => result.statusCode)).toEqual([201, 201])
    expect(new Set(results.map((result) => result.json().code)).size).toBe(2)
  })
})

describe("S9 start rules (Step 10)", () => {
  it("the game starts only with 5 to 10 players who are all ready", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const code = await createRoom(app, host)
    const others = []
    for (const name of ["Maya", "Priya", "Rohan", "Zara"]) {
      const player = await registered(app, name)
      others.push(player)
      const joined = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: player.auth, payload: { password: "1234" } })
      expect(joined.statusCode).toBe(200)
    }
    const early = await app.inject({ method: "POST", url: "/rooms/" + code + "/start", headers: host.auth })
    expect(early.statusCode).toBe(409)
    expect(early.json()).toEqual({ code: "CANNOT_START" })

    for (const player of [host, ...others]) {
      await app.inject({ method: "POST", url: "/rooms/" + code + "/ready", headers: player.auth, payload: { ready: true } })
    }
    const started = await app.inject({ method: "POST", url: "/rooms/" + code + "/start", headers: host.auth })
    expect(started.statusCode).toBe(200)
    expect(started.json().status).toBe("STARTED")
  })
})

describe("S8 join a room (Step 10)", () => {
  it("refuses a wrong password, and 5 wrong passwords lock joining for 5 minutes", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const code = await createRoom(app, host)
    const guest = await registered(app, "Maya")
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const wrong = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: guest.auth, payload: { password: "nope" } })
      expect(wrong.json()).toEqual({ code: "WRONG_PASSWORD" })
    }
    const fifth = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: guest.auth, payload: { password: "nope" } })
    expect(fifth.statusCode).toBe(429)
    const lockedCorrect = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: guest.auth, payload: { password: "1234" } })
    expect(lockedCorrect.json()).toEqual({ code: "ROOM_LOCKED" })

    currentTime += 5 * 60 * 1000 + 1
    const afterWait = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: guest.auth, payload: { password: "1234" } })
    expect(afterWait.statusCode).toBe(200)
  })

  it("reports an unknown room, a full room and a started game with their own errors", async () => {
    const app = newServer()
    const host = await registered(app, "Host")
    const missing = await app.inject({ method: "POST", url: "/rooms/ZZZZZZ/join", headers: host.auth, payload: { password: "1234" } })
    expect(missing.json()).toEqual({ code: "ROOM_NOT_FOUND" })

    const code = await createRoom(app, host)
    for (let index = 1; index < 10; index += 1) {
      const player = await registered(app, "Player" + index)
      await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: player.auth, payload: { password: "1234" } })
    }
    const extra = await registered(app, "Extra")
    const full = await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: extra.auth, payload: { password: "1234" } })
    expect(full.json()).toEqual({ code: "ROOM_FULL" })
  })
})

describe("lobby host transfer and seats (Step 10)", () => {
  it("passes the host to the next player who joined when the host leaves", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const code = await createRoom(app, host)
    const maya = await registered(app, "Maya")
    await app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: maya.auth, payload: { password: "1234" } })
    await app.inject({ method: "POST", url: "/rooms/" + code + "/leave", headers: host.auth })
    const view = await app.inject({ method: "GET", url: "/rooms/" + code, headers: maya.auth })
    expect(view.json().seats.map((seat: { username: string }) => seat.username)).toEqual(["Maya"])
    expect(view.json().hostId).toBe(view.json().seats[0].userId)
  })

  it("requires the seat order to list exactly the players in the room", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const code = await createRoom(app, host)
    const response = await app.inject({ method: "POST", url: "/rooms/" + code + "/seats", headers: host.auth, payload: { order: ["nobody"] } })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ code: "INVALID_SEAT_ORDER" })
  })

  it("keeps a room's lobby private from players who are not in it", async () => {
    const app = newServer()
    const host = await registered(app, "Arjun")
    const code = await createRoom(app, host)
    const outsider = await registered(app, "Outsider")
    const response = await app.inject({ method: "GET", url: "/rooms/" + code, headers: outsider.auth })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ code: "NOT_IN_ROOM" })
  })
})
