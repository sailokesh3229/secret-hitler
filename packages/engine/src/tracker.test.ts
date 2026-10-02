import { describe, expect, it } from "vitest"
import { hasReachedChaos, incrementElectionTracker, resetElectionTracker } from "./tracker.js"

describe("R21", () => {
  it("R21: a failed vote moves the tracker up by one", () => {
    expect(incrementElectionTracker(0)).toBe(1)
    expect(incrementElectionTracker(1)).toBe(2)
  })
})

describe("R22", () => {
  it("R22: reaching 3 triggers Chaos", () => {
    expect(hasReachedChaos(3)).toBe(true)
  })

  it("R22: below 3 does not trigger Chaos", () => {
    expect(hasReachedChaos(0)).toBe(false)
    expect(hasReachedChaos(2)).toBe(false)
  })
})

describe("R24", () => {
  it("R24: the tracker resets to 0 whenever a policy is enacted", () => {
    expect(resetElectionTracker()).toBe(0)
  })
})
