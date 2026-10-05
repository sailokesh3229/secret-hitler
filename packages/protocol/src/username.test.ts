import { describe, expect, it } from "vitest"
import { usernameProblem } from "./username.js"

describe("S5 username rules", () => {
  it("accepts 3 to 16 letters, numbers and underscores", () => {
    expect(usernameProblem("Ari")).toBeNull()
    expect(usernameProblem("player_01")).toBeNull()
  })
  it("rejects shorter than 3 and longer than 16", () => {
    expect(usernameProblem("Al")).toBe("USERNAME_TOO_SHORT")
    expect(usernameProblem("A".repeat(17))).toBe("USERNAME_TOO_LONG")
  })
  it("rejects spaces and symbols", () => {
    expect(usernameProblem("ma ya")).toBe("USERNAME_BAD_CHARACTERS")
  })
})
