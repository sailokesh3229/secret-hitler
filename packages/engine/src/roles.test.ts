import { describe, expect, it } from "vitest"
import { dealRoles, partyMembership, ROLE_COUNTS_BY_PLAYER_COUNT } from "./roles.js"
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL, TEAM_FASCIST, TEAM_LIBERAL } from "./types.js"
import type { PlayerCount } from "./types.js"
import { createSeededRandom } from "./testUtils.js"

const PLAYER_COUNTS: PlayerCount[] = [5, 6, 7, 8, 9, 10]

function makePlayerIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => "p" + i)
}

describe("R1", () => {
  it("R1: throws for player counts outside 5-10", () => {
    expect(() => dealRoles(makePlayerIds(4), createSeededRandom(1))).toThrow()
    expect(() => dealRoles(makePlayerIds(11), createSeededRandom(1))).toThrow()
  })
})

describe("R2", () => {
  for (const count of PLAYER_COUNTS) {
    it("R2: deals " + count + " players matching the role-count table", () => {
      const playerIds = makePlayerIds(count)
      const roles = dealRoles(playerIds, createSeededRandom(count))
      const expected = ROLE_COUNTS_BY_PLAYER_COUNT[count]
      let liberals = 0
      let fascists = 0
      let leaders = 0
      for (const role of roles.values()) {
        if (role === ROLE_LIBERAL) {
          liberals += 1
        } else if (role === ROLE_FASCIST) {
          fascists += 1
        } else {
          leaders += 1
        }
      }
      expect(liberals).toBe(expected.liberals)
      expect(fascists).toBe(expected.fascists)
      expect(leaders).toBe(expected.leaders)
      expect(roles.size).toBe(count)
    })
  }
})

describe("R3", () => {
  it("R3: Liberal maps to the Liberal team", () => {
    expect(partyMembership(ROLE_LIBERAL)).toBe(TEAM_LIBERAL)
  })

  it("R3: Fascist and the Leader both map to the Fascist team", () => {
    expect(partyMembership(ROLE_FASCIST)).toBe(TEAM_FASCIST)
    expect(partyMembership(ROLE_LEADER)).toBe(TEAM_FASCIST)
  })
})
