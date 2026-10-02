import { describe, it, expect } from "vitest"
import { SIM_DEPENDS_ON, SIM_PLAYER_COUNT_RANGE } from "./index.js"

describe("scaffold", () => {
  it("Step 2: sim package resolves @game/engine player-count bounds", () => {
    expect(SIM_PLAYER_COUNT_RANGE).toEqual([5, 10])
  })

  it("Step 2: sim package resolves @game/protocol", () => {
    expect(SIM_DEPENDS_ON).toEqual(["@game/protocol"])
  })
})
