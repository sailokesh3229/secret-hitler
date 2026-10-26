/* Online-mode rules on the server (spec Sec 2, 10; rules R30, R42). Timers are
   driven by hand here so each timeout can be fired on purpose. */
import { describe, expect, it } from "vitest"
function createSeededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x80000000
  }
}
import { VOTE_YES } from "@game/engine"
import { createGameService, PHASE_TIMERS_MS, type TimerHost } from "./gameService.js"
import { createMemoryHistory } from "./history.js"
import { createMemoryKeyValue } from "./gameStore.js"

interface PendingTimer {
  ms: number
  fn: () => void
  cancelled: boolean
}

function manualTimers(): TimerHost & { pending: PendingTimer[]; fireLatest: () => Promise<void> } {
  const pending: PendingTimer[] = []
  return {
    pending,
    schedule(fn, ms) {
      const timer: PendingTimer = { ms, fn, cancelled: false }
      pending.push(timer)
      return () => {
        timer.cancelled = true
      }
    },
    async fireLatest() {
      const live = pending.filter((timer) => !timer.cancelled)
      const last = live[live.length - 1]
      if (!last) throw new Error("no timer is pending")
      last.cancelled = true
      last.fn()
      await new Promise((resolve) => setTimeout(resolve, 20))
    },
  }
}

function newGame(timersOn: boolean, mode = "MODE_ONLINE") {
  const timers = manualTimers()
  const random = createSeededRandom(77)
  const games = createGameService({
    kv: createMemoryKeyValue(),
    history: createMemoryHistory(),
    random,
    now: () => new Date("2026-10-26T00:00:00.000Z"),
    timers,
  })
  const seats = ["a", "b", "c", "d", "e"].map((id) => ({ userId: id, username: id.toUpperCase() }))
  return { games, timers, seats, mode, timersOn }
}

describe("online chat mute rules (R30, R42)", () => {
  it("in-person games have no in-app chat", async () => {
    const { games, seats } = newGame(false, "MODE_IN_PERSON")
    await games.start("ROOM01", seats, "a", "MODE_IN_PERSON", false)
    const reply = await games.chat("ROOM01", "b", "hello")
    expect(reply).toEqual({ ok: false, code: "CHAT_IN_PERSON" })
  })

  it("R30: the President cannot chat while holding policy tiles", async () => {
    const { games, seats } = newGame(false)
    await games.start("ROOM02", seats, "a", "MODE_ONLINE", false)
    const view = await games.view("ROOM02", "a")
    const president = view?.presidentId as string
    const others = seats.map((seat) => seat.userId).filter((id) => id !== president)
    await games.perform("ROOM02", president, { type: "nominate", targetId: others[0] as string }, new Set(seats.map((s) => s.userId)))
    const everyone = new Set(seats.map((seat) => seat.userId))
    for (const id of seats.map((seat) => seat.userId)) {
      await games.perform("ROOM02", id, { type: "vote", vote: VOTE_YES }, everyone)
    }
    await games.perform("ROOM02", "a", { type: "reveal" }, everyone)
    const chat = await games.chat("ROOM02", president, "I have three tiles")
    expect(chat).toEqual({ ok: false, code: "CHAT_MUTED_TILES" })
    const other = await games.chat("ROOM02", others[1] as string, "fine to talk")
    expect(other.ok).toBe(true)
  })
})

describe("turn timers (spec Sec 10)", () => {
  it("the nomination timer nominates a random eligible Chancellor for the President", async () => {
    const { games, timers, seats } = newGame(true)
    await games.start("ROOM03", seats, "a", "MODE_ONLINE", true)
    expect(timers.pending[0]?.ms).toBe(PHASE_TIMERS_MS["PHASE_NOMINATION"])
    await timers.fireLatest()
    const view = await games.view("ROOM03", "a")
    expect(view?.phase).toBe("PHASE_VOTING")
  })

  it("the vote timer closes voting, so missing votes count as No and the host reveals next", async () => {
    const { games, timers, seats } = newGame(true)
    await games.start("ROOM04", seats, "a", "MODE_ONLINE", true)
    const president = (await games.view("ROOM04", "a"))?.presidentId as string
    const target = seats.map((seat) => seat.userId).find((id) => id !== president) as string
    await games.perform("ROOM04", president, { type: "nominate", targetId: target }, new Set(seats.map((s) => s.userId)))
    await timers.fireLatest()
    const view = await games.view("ROOM04", "a")
    expect(view?.phase).toBe("PHASE_AWAIT_HOST_REVEAL")
  })

  it("no timer runs when the room turned timers off (in-person default)", async () => {
    const { games, timers, seats } = newGame(false, "MODE_IN_PERSON")
    await games.start("ROOM05", seats, "a", "MODE_IN_PERSON", false)
    expect(timers.pending).toHaveLength(0)
  })
})

describe("timer re-arm after a restart (plan Step 11/13)", () => {
  it("schedules only the time left, not a fresh full-length timer", async () => {
    const kv = createMemoryKeyValue()
    const history = createMemoryHistory()
    let clock = 1_000_000
    const seats = ["a", "b", "c", "d", "e"].map((id) => ({ userId: id, username: id.toUpperCase() }))

    const timersBefore = manualTimers()
    const before = createGameService({ kv, history, random: createSeededRandom(5), now: () => new Date(clock), timers: timersBefore })
    await before.start("ROOM06", seats, "a", "MODE_ONLINE", true)
    expect(timersBefore.pending[0]?.ms).toBe(PHASE_TIMERS_MS["PHASE_NOMINATION"])

    // The process "restarts": 20 seconds pass, and a brand new service (with
    // its own, empty in-memory timer state) picks up the persisted game.
    clock += 20000
    const timersAfter = manualTimers()
    const after = createGameService({ kv, history, random: createSeededRandom(5), now: () => new Date(clock), timers: timersAfter })
    await after.rearm("ROOM06")

    const fullMs = PHASE_TIMERS_MS["PHASE_NOMINATION"] as number
    expect(timersAfter.pending[0]?.ms).toBe(fullMs - 20000)

    await timersAfter.fireLatest()
    const view = await after.view("ROOM06", "a")
    expect(view?.phase).toBe("PHASE_VOTING")
  })

  it("fires immediately on rearm when the turn's time had already run out", async () => {
    const kv = createMemoryKeyValue()
    const history = createMemoryHistory()
    let clock = 2_000_000
    const seats = ["a", "b", "c", "d", "e"].map((id) => ({ userId: id, username: id.toUpperCase() }))

    const timersBefore = manualTimers()
    const before = createGameService({ kv, history, random: createSeededRandom(9), now: () => new Date(clock), timers: timersBefore })
    await before.start("ROOM07", seats, "a", "MODE_ONLINE", true)

    clock += (PHASE_TIMERS_MS["PHASE_NOMINATION"] as number) + 5000
    const timersAfter = manualTimers()
    const after = createGameService({ kv, history, random: createSeededRandom(9), now: () => new Date(clock), timers: timersAfter })
    await after.rearm("ROOM07")

    expect(timersAfter.pending[0]?.ms).toBe(0)
  })
})
