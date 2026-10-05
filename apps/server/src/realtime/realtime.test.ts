import { describe, expect, it } from "vitest"
import { io as connect, type Socket } from "socket.io-client"
import { createDevVerifier } from "../auth/tokenVerifier.js"
import { composeServer } from "../server.js"
import { createMemoryRoomStore } from "../rooms/roomStore.js"
import { createMemoryUserRepository } from "../users/userRepository.js"

const fakeHasher = {
  hash: (password: string) => Promise.resolve("hash:" + password),
  verify: (hash: string, password: string) => Promise.resolve(hash === "hash:" + password),
}

interface LobbyView {
  seats: { username: string; ready: boolean }[]
  passwordHash?: string
}

function connected(url: string, token: string): Promise<Socket> {
  const socket = connect(url, { auth: { token }, transports: ["websocket"], forceNew: true })
  return new Promise((resolve) => socket.on("connect", () => resolve(socket)))
}

describe("lobby in real time (Step 10)", () => {
  it("a ready change reaches every subscribed phone as room:update, without any password hash", async () => {
    let counter = 0
    const server = composeServer({
      verifier: createDevVerifier(),
      users: createMemoryUserRepository(),
      store: createMemoryRoomStore(),
      hasher: fakeHasher,
      randomInt: (max) => (counter++ * 7) % max,
      now: () => Date.now(),
    })
    await server.app.listen({ port: 0, host: "127.0.0.1" })
    const address = server.app.server.address()
    const port = typeof address === "object" && address ? address.port : 0
    const url = "http://127.0.0.1:" + port
    const auth = (name: string) => ({ authorization: "Bearer dev:" + name })

    for (const name of ["Host", "Guest"]) {
      await server.app.inject({ method: "POST", url: "/me", headers: auth(name), payload: { username: name } })
    }
    const created = await server.app.inject({
      method: "POST",
      url: "/rooms",
      headers: auth("Host"),
      payload: { mode: "MODE_IN_PERSON", password: "1234", settings: { timers: false, chat: false } },
    })
    const code = created.json().code as string
    await server.app.inject({ method: "POST", url: "/rooms/" + code + "/join", headers: auth("Guest"), payload: { password: "1234" } })

    const hostSocket = await connected(url, "dev:Host")
    const guestSocket = await connected(url, "dev:Guest")
    try {
      await hostSocket.emitWithAck("room:subscribe", { code })
      await guestSocket.emitWithAck("room:subscribe", { code })

      const update = new Promise<LobbyView>((resolve) => {
        guestSocket.on("room:update", (view: LobbyView) => {
          if (view.seats.find((seat) => seat.username === "Host")?.ready) resolve(view)
        })
      })
      await server.app.inject({ method: "POST", url: "/rooms/" + code + "/ready", headers: auth("Host"), payload: { ready: true } })
      const view = await update
      expect(view.seats.find((seat) => seat.username === "Host")?.ready).toBe(true)
      expect(JSON.stringify(view)).not.toContain("hash:")
      expect(view.passwordHash).toBeUndefined()
    } finally {
      hostSocket.disconnect()
      guestSocket.disconnect()
      await server.app.close()
    }
  })
})
