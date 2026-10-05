/* Integration tests over real Socket.IO (plan Step 11): full scripted games for
   5-10 players, the leak test on every payload a phone actually received, and
   a restart in the middle of a game. The "restart" shares the same persistent
   stores with a new server instance; it is an in-process stand-in for killing
   and restarting the process, which needs Redis and Postgres to run for real. */
import { describe, expect, it } from "vitest"
import type { PlayerView } from "@game/engine"
import { PHASE_GAME_OVER } from "@game/engine"
import { closePhones, connectAndPlay, setUpRoom, type ScriptedPhone } from "@game/sim"
import { createDevVerifier } from "../auth/tokenVerifier.js"
import { composeServer } from "../server.js"
import { createMemoryRoomStore } from "../rooms/roomStore.js"
import { createMemoryUserRepository } from "../users/userRepository.js"
import { createMemoryKeyValue } from "./gameStore.js"
import { createMemoryHistory } from "./history.js"

const fastHasher = {
  hash: (password: string) => Promise.resolve("hash:" + password),
  verify: (hash: string, password: string) => Promise.resolve(hash === "hash:" + password),
}

function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x80000000
  }
}

interface Stores {
  users: ReturnType<typeof createMemoryUserRepository>
  store: ReturnType<typeof createMemoryRoomStore>
  kv: ReturnType<typeof createMemoryKeyValue>
  history: ReturnType<typeof createMemoryHistory>
}

function newStores(): Stores {
  return {
    users: createMemoryUserRepository(),
    store: createMemoryRoomStore(),
    kv: createMemoryKeyValue(),
    history: createMemoryHistory(),
  }
}

async function startServer(stores: Stores, gameSeed: number) {
  let counter = 0
  const composed = composeServer({
    verifier: createDevVerifier(),
    users: stores.users,
    store: stores.store,
    hasher: fastHasher,
    randomInt: (max) => (counter++ * 7) % max,
    now: () => Date.now(),
    kv: stores.kv,
    history: stores.history,
    random: seeded(gameSeed),
  })
  await composed.app.listen({ port: 0, host: "127.0.0.1" })
  const address = composed.app.server.address()
  const port = typeof address === "object" && address ? address.port : 0
  return { ...composed, url: "http://127.0.0.1:" + port }
}

function allowedRolesOf(view: PlayerView): Set<string> {
  const allowed = new Set([view.ownRole])
  if (view.phase === PHASE_GAME_OVER && view.gameOverReveal) {
    for (const role of Object.values(view.gameOverReveal.roles)) allowed.add(role)
  }
  return allowed
}

/* Every payload a phone received must hold only what that phone may know. */
function assertNoLeaks(phone: ScriptedPhone): void {
  for (const view of phone.views) {
    const { myHand, myPeekedPolicies, gameOverReveal, myInvestigationResults, ...publicPart } = view
    expect(JSON.stringify(publicPart).match(/POLICY_(LIBERAL|FASCIST)/)).toBeNull()
    expect(JSON.stringify({ ...publicPart, winner: undefined }).match(/TEAM_w*/)).toBeNull()
    expect(JSON.stringify(view)).not.toMatch(/VOTE_(YES|NO)/)
    if (view.phase !== PHASE_GAME_OVER) {
      expect(gameOverReveal).toBeNull()
    }
    const allowed = allowedRolesOf(view)
    for (const role of JSON.stringify(view).match(/ROLE_[A-Z]+/g) ?? []) {
      expect(allowed.has(role)).toBe(true)
    }
    if (myHand !== null) expect([view.presidentId, view.chancellorNomineeId]).toContain(view.viewerId)
    if (myPeekedPolicies !== null) expect(view.presidentId).toBe(view.viewerId)
    for (const result of myInvestigationResults) expect(result.targetId).not.toBe(view.viewerId)
  }
  for (const event of phone.publicEvents as { kind: string }[]) {
    const text = JSON.stringify(event)
    expect(text).not.toMatch(/ROLE_/)
    if (event.kind !== "REVEALED") expect(text).not.toMatch(/VOTE_(YES|NO)/)
    if (event.kind !== "INVESTIGATED" && event.kind !== "GAME_OVER") expect(text).not.toMatch(/TEAM_/)
  }
}

describe("full games over sockets (plan Step 11)", () => {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    it(`plays a full game for ${count} players to a winner, with no rejected actions and no leaks`, async () => {
      const stores = newStores()
      const server = await startServer(stores, count * 131)
      const setup = await setUpRoom(server.url, count, "C" + count + "_")
      const result = await connectAndPlay(server.url, setup, seeded(count * 17 + 3), { timeoutMs: 60000 })
      try {
        expect(result.over).toBe(true)
        for (const phone of result.phones) {
          expect(phone.errors).toEqual([])
          expect(phone.latest?.phase).toBe(PHASE_GAME_OVER)
          expect(phone.latest?.winner).not.toBeNull()
          assertNoLeaks(phone)
        }
        expect(stores.history.all()).toHaveLength(1)
      } finally {
        closePhones(result.phones)
        await server.app.close()
      }
    }, 90000)
  }

  it("resumes a game after the server restarts in the middle of it (plan Step 11)", async () => {
    const stores = newStores()
    const first = await startServer(stores, 4242)
    const setup = await setUpRoom(first.url, 6, "R_")
    const before = await connectAndPlay(first.url, setup, seeded(9), { stopAfterActions: 30, timeoutMs: 60000 })
    expect(before.over).toBe(false)
    const midPhase = before.phones[0]?.latest?.phase
    expect(midPhase).toBeDefined()
    closePhones(before.phones)
    await first.app.close()

    const second = await startServer(stores, 4343)
    const after = await connectAndPlay(second.url, setup, seeded(11), { timeoutMs: 60000 })
    try {
      expect(after.over).toBe(true)
      for (const phone of after.phones) {
        expect(phone.errors).toEqual([])
        assertNoLeaks(phone)
      }
      expect(after.phones[0]?.views[0]).toBeDefined()
    } finally {
      closePhones(after.phones)
      await second.app.close()
    }
  }, 120000)
})
