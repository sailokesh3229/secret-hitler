import { describe, expect, it } from "vitest"
import { generateRoomCode, ROOM_CODE_ALPHABET, roomPasswordProblem } from "./rooms.js"

describe("S7 room codes", () => {
  it("are 6 characters from an alphabet with no look-alikes", () => {
    const code = generateRoomCode((max) => max - 1)
    expect(code).toHaveLength(6)
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01IOL]/)
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/)
  })
})

describe("S7 room password", () => {
  it("is 4 to 8 characters", () => {
    expect(roomPasswordProblem("1234")).toBeNull()
    expect(roomPasswordProblem("123")).toBe("PASSWORD_TOO_SHORT")
    expect(roomPasswordProblem("123456789")).toBe("PASSWORD_TOO_LONG")
  })
})
