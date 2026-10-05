import { beforeEach, describe, expect, it } from "vitest"
import { useGameStore } from "./store.js"

const SEATS = ["Arjun", "Maya", "Priya", "Rohan", "Zara"].map((name) => ({ id: name, name }))

describe("local game store (Steps 7-8)", () => {
  beforeEach(() => {
    useGameStore.getState().start(SEATS, "Arjun", true)
  })

  it("R13: a player who is not President is refused a nomination and the state does not change", () => {
    const before = useGameStore.getState().state
    const president = before?.presidentId as string
    const notPresident = SEATS.map((seat) => seat.id).find((id) => id !== president) as string
    const target = SEATS.map((seat) => seat.id).find((id) => id !== president && id !== notPresident) as string
    const accepted = useGameStore.getState().perform(notPresident, { type: "nominate", targetId: target })
    expect(accepted).toBe(false)
    expect(useGameStore.getState().state).toBe(before)
    expect(useGameStore.getState().error).toBeTruthy()
  })

  it("R13: the President nominates, the phase moves to voting and the public log records it", () => {
    const president = useGameStore.getState().state?.presidentId as string
    const target = SEATS.map((seat) => seat.id).find((id) => id !== president) as string
    const accepted = useGameStore.getState().perform(president, { type: "nominate", targetId: target })
    expect(accepted).toBe(true)
    expect(useGameStore.getState().state?.phase).toBe("PHASE_VOTING")
    expect(useGameStore.getState().log.map((line) => line.text).join(" ")).toContain("nominated")
  })

  it("R14: the President cannot nominate themselves", () => {
    const president = useGameStore.getState().state?.presidentId as string
    expect(useGameStore.getState().perform(president, { type: "nominate", targetId: president })).toBe(false)
  })
})
