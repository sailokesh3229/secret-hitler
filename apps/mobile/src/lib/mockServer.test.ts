import { describe, expect, it } from "vitest"
import { createMockRoom, joinMockRoom, mockLobbyPlayers } from "./mockServer.js"

describe("S8 join room errors", () => {
  it("reports no such room for an unknown ID", () => {
    expect(joinMockRoom("ZZZZZZ", "1234")).toEqual({ ok: false, error: "NO_ROOM" })
  })
  it("reports a started game before checking the password", () => {
    expect(joinMockRoom("HNF4TB", "wrong")).toEqual({ ok: false, error: "STARTED" })
  })
  it("reports a full room (10 players)", () => {
    expect(joinMockRoom("P3WD9R", "1234")).toEqual({ ok: false, error: "FULL" })
  })
  it("joins a room with the right ID and password", () => {
    const result = joinMockRoom("k7m2qx", "1234")
    expect(result.ok).toBe(true)
  })
  it("creates rooms with 6-character IDs free of look-alike characters", () => {
    const room = createMockRoom("abcd")
    expect(room.id).toHaveLength(6)
    expect(room.id).not.toMatch(/[01IOL]/)
  })
  it("locks joining after 5 wrong passwords (spec S8)", () => {
    const results = Array.from({ length: 5 }, () => joinMockRoom("K7M2QX", "nope"))
    expect(results.slice(0, 4).every((result) => !result.ok && result.error === "WRONG_PASSWORD")).toBe(true)
    expect(results[4]).toEqual({ ok: false, error: "LOCKED" })
    expect(joinMockRoom("K7M2QX", "1234")).toEqual({ ok: false, error: "LOCKED" })
  })
})

describe("S9 lobby mock", () => {
  it("lists the requested number of seats in order", () => {
    expect(mockLobbyPlayers(5, false).map((player) => player.name)).toHaveLength(5)
  })
  it("leaves the last player not ready when asked", () => {
    const players = mockLobbyPlayers(5, true)
    expect(players[4]?.ready).toBe(false)
    expect(players[0]?.ready).toBe(true)
  })
})
