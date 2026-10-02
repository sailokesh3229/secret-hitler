import { describe, expect, it } from "vitest"
import { getNextPresident, getSpecialElectionReturnAnchor } from "./rotation.js"

const SEATS = ["a", "b", "c", "d", "e", "f"]
const ALL_ALIVE = new Set(SEATS)

describe("R11", () => {
  it("R11: presidency passes clockwise to the next living player", () => {
    expect(getNextPresident(SEATS, "b", null, ALL_ALIVE)).toBe("c")
  })

  it("R11: wraps around from the last seat back to the first", () => {
    expect(getNextPresident(SEATS, "f", null, ALL_ALIVE)).toBe("a")
  })

  it("R11/R42: skips executed players (not in alivePlayers)", () => {
    const alive = new Set(["a", "b", "e", "f"])
    expect(getNextPresident(SEATS, "b", null, alive)).toBe("e")
  })
})

describe("R12", () => {
  it("R12: a Special Election call remembers the calling President as the return anchor", () => {
    expect(getSpecialElectionReturnAnchor("b", null)).toBe("b")
  })

  it("R12: a chain of Special Elections keeps the OLDEST anchor, not the newest caller", () => {
    expect(getSpecialElectionReturnAnchor("c", "b")).toBe("b")
  })

  it("R12: after the Special Election round, rotation returns to next-from-caller, not next-from-appointee", () => {
    expect(getNextPresident(SEATS, "f", "b", ALL_ALIVE)).toBe("c")
  })

  it("R12: if the appointee was already next-from-caller, they are President twice in a row", () => {
    const returnTo = getSpecialElectionReturnAnchor("b", null)
    const appointee = "c"
    expect(getNextPresident(SEATS, appointee, returnTo, ALL_ALIVE)).toBe(appointee)
  })
})
