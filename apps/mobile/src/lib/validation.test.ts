import { describe, expect, it } from "vitest"
import { isRoomIdComplete, passwordProblem, usernameProblem } from "./validation.js"

describe("S5 username rules", () => {
  it("accepts 3 to 16 letters, numbers and underscores", () => {
    expect(usernameProblem("Ari")).toBeNull()
    expect(usernameProblem("player_01")).toBeNull()
    expect(usernameProblem("A".repeat(16))).toBeNull()
  })
  it("rejects names shorter than 3 characters", () => {
    expect(usernameProblem("Al")).toBe("TOO_SHORT")
  })
  it("rejects names longer than 16 characters", () => {
    expect(usernameProblem("A".repeat(17))).toBe("TOO_LONG")
  })
  it("rejects spaces and symbols", () => {
    expect(usernameProblem("ma ya")).toBe("BAD_CHARACTERS")
    expect(usernameProblem("maya!")).toBe("BAD_CHARACTERS")
  })
})

describe("S7 room password rules", () => {
  it("accepts 4 to 8 characters", () => {
    expect(passwordProblem("1234")).toBeNull()
    expect(passwordProblem("12345678")).toBeNull()
  })
  it("rejects 3 or 9 characters", () => {
    expect(passwordProblem("123")).toBe("TOO_SHORT")
    expect(passwordProblem("123456789")).toBe("TOO_LONG")
  })
})

describe("S8 Room ID rules", () => {
  it("requires exactly 6 characters", () => {
    expect(isRoomIdComplete("K7M2QX")).toBe(true)
    expect(isRoomIdComplete("K7M2Q")).toBe(false)
  })
})
