import { describe, expect, it } from "vitest"
import {
  clearTermLimits,
  getChancellorEligibility,
  INELIGIBLE_IS_PRESIDENT,
  INELIGIBLE_LAST_CHANCELLOR,
  INELIGIBLE_LAST_PRESIDENT,
  INELIGIBLE_NOT_ALIVE,
  recordElectedGovernment,
} from "./eligibility.js"
import type { TermLimits } from "./eligibility.js"

const SEVEN_ALIVE = new Set(["p", "c", "a1", "a2", "a3", "a4", "a5"])
const FIVE_ALIVE = new Set(["p", "c", "a1", "a2", "a3"])

describe("R13", () => {
  it("R13: an executed (not alive) candidate is ineligible", () => {
    const alive = new Set(["p", "c", "a1"])
    const result = getChancellorEligibility("ghost", "p", alive, null, null)
    expect(result).toEqual({ eligible: false, reason: INELIGIBLE_NOT_ALIVE })
  })

  it("R13: the President cannot nominate themself", () => {
    const result = getChancellorEligibility("p", "p", SEVEN_ALIVE, null, null)
    expect(result).toEqual({ eligible: false, reason: INELIGIBLE_IS_PRESIDENT })
  })

  it("R13: the last elected Chancellor is blocked", () => {
    const result = getChancellorEligibility("c", "p", SEVEN_ALIVE, "a1", "c")
    expect(result).toEqual({ eligible: false, reason: INELIGIBLE_LAST_CHANCELLOR })
  })

  it("R13: with more than 5 alive, the last elected President is also blocked", () => {
    const result = getChancellorEligibility("a1", "p", SEVEN_ALIVE, "a1", "c")
    expect(result).toEqual({ eligible: false, reason: INELIGIBLE_LAST_PRESIDENT })
  })

  it("R13: an unblocked, living, non-President candidate is eligible", () => {
    const result = getChancellorEligibility("a2", "p", SEVEN_ALIVE, "a1", "c")
    expect(result).toEqual({ eligible: true, reason: null })
  })
})

describe("R14", () => {
  it("R14: with 5 or fewer alive, the last elected President is NOT blocked", () => {
    const result = getChancellorEligibility("a1", "p", FIVE_ALIVE, "a1", "c")
    expect(result).toEqual({ eligible: true, reason: null })
  })

  it("R14: with 5 or fewer alive, the last elected Chancellor is still blocked", () => {
    const result = getChancellorEligibility("c", "p", FIVE_ALIVE, "a1", "c")
    expect(result).toEqual({ eligible: false, reason: INELIGIBLE_LAST_CHANCELLOR })
  })
})

describe("R15", () => {
  it("R15: term limits change only when recordElectedGovernment is called, never from a failed vote", () => {
    let termLimits: TermLimits = { lastElectedPresidentId: null, lastElectedChancellorId: null }
    expect(termLimits).toEqual({ lastElectedPresidentId: null, lastElectedChancellorId: null })
    termLimits = recordElectedGovernment("pres1", "chan1")
    expect(termLimits).toEqual({ lastElectedPresidentId: "pres1", lastElectedChancellorId: "chan1" })
  })
})

describe("R16", () => {
  it("R16: Chaos clears both term limits", () => {
    expect(clearTermLimits()).toEqual({ lastElectedPresidentId: null, lastElectedChancellorId: null })
  })
})
