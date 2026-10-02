import { describe, expect, it } from "vitest"
import { canRequestVeto, isVetoUnlocked } from "./veto.js"

describe("R33", () => {
  it("R33: veto is locked below 5 Fascist policies, for every bracket", () => {
    expect(isVetoUnlocked(4, 5)).toBe(false)
    expect(isVetoUnlocked(4, 7)).toBe(false)
    expect(isVetoUnlocked(4, 9)).toBe(false)
  })

  it("R33: veto unlocks at 5 Fascist policies, for every bracket", () => {
    expect(isVetoUnlocked(5, 5)).toBe(true)
    expect(isVetoUnlocked(5, 7)).toBe(true)
    expect(isVetoUnlocked(5, 9)).toBe(true)
  })

  it("R33: veto stays unlocked at higher Fascist counts too", () => {
    expect(isVetoUnlocked(6, 9)).toBe(true)
  })
})

describe("R34", () => {
  it("R34: cannot request a veto before it is unlocked", () => {
    expect(canRequestVeto(4, 7, false)).toBe(false)
  })

  it("R34: can request a veto once unlocked and not yet requested this session", () => {
    expect(canRequestVeto(5, 7, false)).toBe(true)
  })

  it("R34: cannot request a second veto in the same session", () => {
    expect(canRequestVeto(5, 7, true)).toBe(false)
  })
})
