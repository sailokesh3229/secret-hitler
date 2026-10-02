import { describe, it, expect } from "vitest"
import { ENGINE_PACKAGE_NAME } from "./index.js"

describe("scaffold", () => {
  it("Step 1: engine package resolves its own module", () => {
    expect(ENGINE_PACKAGE_NAME).toBe("@game/engine")
  })
})
