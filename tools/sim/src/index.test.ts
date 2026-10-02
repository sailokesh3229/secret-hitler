import { describe, it, expect } from "vitest"
import { SIM_DEPENDS_ON } from "./index.js"

describe("scaffold", () => {
  it("Step 1: sim package resolves @game/engine and @game/protocol", () => {
    expect(SIM_DEPENDS_ON).toEqual(["@game/engine", "@game/protocol"])
  })
})
