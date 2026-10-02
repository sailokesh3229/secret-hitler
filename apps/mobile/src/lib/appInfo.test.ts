import { describe, it, expect } from "vitest"
import { MOBILE_PACKAGE_NAME } from "./appInfo.js"

describe("scaffold", () => {
  it("Step 1: mobile package resolves its own module", () => {
    expect(MOBILE_PACKAGE_NAME).toBe("@game/mobile")
  })
})
