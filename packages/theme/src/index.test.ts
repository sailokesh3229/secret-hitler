import { describe, it, expect } from "vitest"
import { THEME_PACKAGE_NAME } from "./index.js"

describe("scaffold", () => {
  it("Step 1: theme package resolves its own module", () => {
    expect(THEME_PACKAGE_NAME).toBe("@game/theme")
  })
})
