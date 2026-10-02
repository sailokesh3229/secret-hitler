import { describe, expect, it } from "vitest"
import { checkFascistPoliciesWin, checkHitlerExecutedWin, checkLiberalPoliciesWin } from "./wins.js"
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL } from "./types.js"

describe("R43", () => {
  it("R43: 5 Liberal policies win, 4 does not", () => {
    expect(checkLiberalPoliciesWin(5)).toBe(true)
    expect(checkLiberalPoliciesWin(4)).toBe(false)
  })
})

describe("R44", () => {
  it("R44: executing the Leader (Hitler) wins for the Liberals", () => {
    expect(checkHitlerExecutedWin(ROLE_LEADER)).toBe(true)
  })

  it("R44: executing anyone else does not win", () => {
    expect(checkHitlerExecutedWin(ROLE_LIBERAL)).toBe(false)
    expect(checkHitlerExecutedWin(ROLE_FASCIST)).toBe(false)
  })
})

describe("R45", () => {
  it("R45: 6 Fascist policies win, for every bracket, 5 does not", () => {
    expect(checkFascistPoliciesWin(6, 5)).toBe(true)
    expect(checkFascistPoliciesWin(6, 9)).toBe(true)
    expect(checkFascistPoliciesWin(5, 9)).toBe(false)
  })
})
