import { describe, expect, it } from "vitest"
import {
  checkHitlerChancellor,
  GOVERNMENT_OUTCOME_FASCISTS_WIN,
  GOVERNMENT_OUTCOME_NONE,
  GOVERNMENT_OUTCOME_NOT_HITLER_BADGE,
} from "./hitlerCheck.js"
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL } from "./types.js"

describe("R25", () => {
  it("R25: below 3 Fascist policies, nothing happens regardless of who is Chancellor", () => {
    expect(checkHitlerChancellor(ROLE_LEADER, 2)).toBe(GOVERNMENT_OUTCOME_NONE)
    expect(checkHitlerChancellor(ROLE_LIBERAL, 0)).toBe(GOVERNMENT_OUTCOME_NONE)
  })

  it("R25: at 3+ Fascist policies, a Leader Chancellor wins the game for the Fascists", () => {
    expect(checkHitlerChancellor(ROLE_LEADER, 3)).toBe(GOVERNMENT_OUTCOME_FASCISTS_WIN)
  })

  it("R25: at 3+ Fascist policies, a non-Leader Chancellor gets the Not Hitler badge", () => {
    expect(checkHitlerChancellor(ROLE_LIBERAL, 3)).toBe(GOVERNMENT_OUTCOME_NOT_HITLER_BADGE)
    expect(checkHitlerChancellor(ROLE_FASCIST, 4)).toBe(GOVERNMENT_OUTCOME_NOT_HITLER_BADGE)
  })
})
