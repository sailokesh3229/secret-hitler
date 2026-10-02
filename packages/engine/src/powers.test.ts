import { describe, expect, it } from "vitest"
import {
  getGenericPowerTargetError,
  getInvestigateTargetError,
  getTriggeredPower,
  POWER_TARGET_INVALID_ALREADY_INVESTIGATED,
  POWER_TARGET_INVALID_NOT_ALIVE,
  POWER_TARGET_INVALID_SELF,
} from "./powers.js"
import { POWER_INVESTIGATE, POWER_SPECIAL_ELECTION } from "./boards.js"

describe("R36", () => {
  it("R36: reads the triggered power from the R5 board table by player count", () => {
    expect(getTriggeredPower(2, 7)).toBe(POWER_INVESTIGATE)
    expect(getTriggeredPower(2, 5)).toBeNull()
    expect(getTriggeredPower(3, 7)).toBe(POWER_SPECIAL_ELECTION)
  })

  it("R36: a slot number outside the table has no power", () => {
    expect(getTriggeredPower(0, 9)).toBeNull()
  })
})

describe("R38", () => {
  const alive = new Set(["pres", "a", "b"])

  it("R38: cannot investigate a player who is not alive", () => {
    const result = getInvestigateTargetError("ghost", "pres", alive, new Set())
    expect(result).toBe(POWER_TARGET_INVALID_NOT_ALIVE)
  })

  it("R38: cannot investigate yourself", () => {
    const result = getInvestigateTargetError("pres", "pres", alive, new Set())
    expect(result).toBe(POWER_TARGET_INVALID_SELF)
  })

  it("R38: cannot investigate the same player twice", () => {
    const result = getInvestigateTargetError("a", "pres", alive, new Set(["a"]))
    expect(result).toBe(POWER_TARGET_INVALID_ALREADY_INVESTIGATED)
  })

  it("R38: a living, unvisited, non-President target is valid", () => {
    const result = getInvestigateTargetError("a", "pres", alive, new Set())
    expect(result).toBeNull()
  })
})

describe("R39 and R41", () => {
  const alive = new Set(["pres", "a", "termLimited"])

  it("R39/R41: target must be alive", () => {
    const result = getGenericPowerTargetError("ghost", "pres", alive)
    expect(result).toBe(POWER_TARGET_INVALID_NOT_ALIVE)
  })

  it("R39/R41: cannot target yourself", () => {
    const result = getGenericPowerTargetError("pres", "pres", alive)
    expect(result).toBe(POWER_TARGET_INVALID_SELF)
  })

  it("R39: a term-limited player is still a valid target for Special Election", () => {
    const result = getGenericPowerTargetError("termLimited", "pres", alive)
    expect(result).toBeNull()
  })
})
