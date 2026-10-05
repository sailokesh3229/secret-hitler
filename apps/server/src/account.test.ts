import { describe, expect, it } from "vitest"
import { createDevVerifier } from "./auth/tokenVerifier.js"
import { createMemoryHistory } from "./game/history.js"
import { composeServer } from "./server.js"
import { createMemoryRoomStore } from "./rooms/roomStore.js"
import { createMemoryUserRepository } from "./users/userRepository.js"
import { createMemoryKeyValue } from "./game/gameStore.js"

const fakeHasher = {
  hash: (password: string) => Promise.resolve("hash:" + password),
  verify: (hash: string, password: string) => Promise.resolve(hash === "hash:" + password),
}

function newServer() {
  const history = createMemoryHistory()
  const app = composeServer({
    verifier: createDevVerifier(),
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    hasher: fakeHasher,
    randomInt: () => 0,
    now: () => Date.now(),
    kv: createMemoryKeyValue(),
    history,
  }).app
  return { app, history }
}

async function signUp(app: ReturnType<typeof newServer>["app"], name: string) {
  const response = await app.inject({ method: "POST", url: "/me", headers: { authorization: "Bearer dev:" + name }, payload: { username: name } })
  return { id: String(response.json().id), auth: { authorization: "Bearer dev:" + name } }
}

describe("S20 game history (Step 14)", () => {
  it("lists my finished games with my role and whether I won, and hides games I did not play", async () => {
    const { app, history } = newServer()
    const me = await signUp(app, "Maya")
    const other = await signUp(app, "Arjun")
    await history.record({
      roomCode: "HIST01",
      hostId: other.id,
      mode: "MODE_ONLINE",
      playerCount: 5,
      winner: "TEAM_LIBERAL",
      winReason: "WIN_REASON_LIBERAL_POLICIES",
      startedAt: "2026-10-01T10:00:00.000Z",
      endedAt: "2026-10-01T10:30:00.000Z",
      players: [
        { userId: other.id, seat: 0, role: "ROLE_LIBERAL", alive: true },
        { userId: me.id, seat: 1, role: "ROLE_LIBERAL", alive: true },
      ],
      events: [],
    })
    const list = await app.inject({ method: "GET", url: "/me/games", headers: me.auth })
    expect(list.statusCode).toBe(200)
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0]).toMatchObject({ roomCode: "HIST01", myRole: "ROLE_LIBERAL", won: true })
  })

  it("does not show one player's game to someone who was not in it", async () => {
    const { app, history } = newServer()
    const outsider = await signUp(app, "Outsider")
    const player = await signUp(app, "Priya")
    const id = await history.record({
      roomCode: "HIST02",
      hostId: player.id,
      mode: "MODE_IN_PERSON",
      playerCount: 5,
      winner: "TEAM_FASCIST",
      winReason: "WIN_REASON_HITLER_EXECUTED",
      startedAt: "2026-10-01T10:00:00.000Z",
      endedAt: "2026-10-01T10:30:00.000Z",
      players: [{ userId: player.id, seat: 0, role: "ROLE_LEADER", alive: false }],
      events: [],
    })
    const response = await app.inject({ method: "GET", url: "/games/" + id, headers: outsider.auth })
    expect(response.statusCode).toBe(404)
    const mine = await app.inject({ method: "GET", url: "/games/" + id, headers: player.auth })
    expect(mine.statusCode).toBe(200)
  })
})

describe("account deletion (S21, spec Sec 15 privacy)", () => {
  it("DELETE /me removes the account, after which the player is signed out of the app's data", async () => {
    const { app } = newServer()
    const player = await signUp(app, "Rohan")
    const deleted = await app.inject({ method: "DELETE", url: "/me", headers: player.auth })
    expect(deleted.statusCode).toBe(204)
    const after = await app.inject({ method: "GET", url: "/me", headers: player.auth })
    expect(after.statusCode).toBe(404)
    expect(after.json()).toEqual({ code: "NO_USERNAME" })
  })
})

describe("rate limits (spec Sec 14)", () => {
  it("answers 429 once one client sends too many requests in a minute", async () => {
    const { app } = newServer()
    let last = 200
    for (let index = 0; index < 125; index += 1) {
      last = (await app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.9" })).statusCode
    }
    expect(last).toBe(429)
  })
})
