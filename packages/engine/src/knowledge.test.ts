import { describe, expect, it } from "vitest"
import { getKnownTeammates } from "./knowledge.js"
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL } from "./types.js"
import type { Role } from "./types.js"

function sorted(ids: string[]): string[] {
  return [...ids].sort()
}

describe("R8", () => {
  it("R8: with 5-6 players the Fascist and the Leader know each other and nobody else", () => {
    const roles = new Map<string, Role>([
      ["p0", ROLE_LEADER],
      ["p1", ROLE_FASCIST],
      ["p2", ROLE_LIBERAL],
      ["p3", ROLE_LIBERAL],
      ["p4", ROLE_LIBERAL],
      ["p5", ROLE_LIBERAL],
    ])
    expect(getKnownTeammates("p1", roles, 6)).toEqual(["p0"])
    expect(getKnownTeammates("p0", roles, 6)).toEqual(["p1"])
  })
})

describe("R9", () => {
  it("R9: with 7-10 players each Fascist knows the other Fascists and the Leader", () => {
    const roles = new Map<string, Role>([
      ["p0", ROLE_LEADER],
      ["p1", ROLE_FASCIST],
      ["p2", ROLE_FASCIST],
      ["p3", ROLE_LIBERAL],
      ["p4", ROLE_LIBERAL],
      ["p5", ROLE_LIBERAL],
      ["p6", ROLE_LIBERAL],
      ["p7", ROLE_LIBERAL],
    ])
    expect(sorted(getKnownTeammates("p1", roles, 8))).toEqual(sorted(["p2", "p0"]))
    expect(sorted(getKnownTeammates("p2", roles, 8))).toEqual(sorted(["p1", "p0"]))
  })

  it("R9: with 7-10 players the Leader knows nobody", () => {
    const roles = new Map<string, Role>([
      ["p0", ROLE_LEADER],
      ["p1", ROLE_FASCIST],
      ["p2", ROLE_FASCIST],
      ["p3", ROLE_LIBERAL],
      ["p4", ROLE_LIBERAL],
      ["p5", ROLE_LIBERAL],
      ["p6", ROLE_LIBERAL],
      ["p7", ROLE_LIBERAL],
    ])
    expect(getKnownTeammates("p0", roles, 8)).toEqual([])
  })
})

describe("R10", () => {
  it("R10: Liberals see no teammates, at any player count", () => {
    const roles = new Map<string, Role>([
      ["p0", ROLE_LEADER],
      ["p1", ROLE_FASCIST],
      ["p2", ROLE_LIBERAL],
      ["p3", ROLE_LIBERAL],
      ["p4", ROLE_LIBERAL],
    ])
    expect(getKnownTeammates("p2", roles, 5)).toEqual([])
  })
})
