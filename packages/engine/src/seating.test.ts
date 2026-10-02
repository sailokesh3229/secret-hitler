import { describe, expect, it } from "vitest"
import { pickFirstPresident, shuffleSeating } from "./seating.js"
import { createSeededRandom } from "./testUtils.js"

const PLAYERS = ["a", "b", "c", "d", "e", "f", "g"]

describe("R6", () => {
  it("R6: Online shuffle is a permutation of the given seat order", () => {
    const shuffled = shuffleSeating(PLAYERS, createSeededRandom(7))
    expect(shuffled.length).toBe(PLAYERS.length)
    expect([...shuffled].sort()).toEqual([...PLAYERS].sort())
  })

  it("R6: Online shuffle differs from the input order for a given seed", () => {
    const shuffled = shuffleSeating(PLAYERS, createSeededRandom(7))
    expect(shuffled).not.toEqual(PLAYERS)
  })
})

describe("R7", () => {
  it("R7: the first President is always one of the given players, across many seeds", () => {
    let seed = 0
    while (seed < 50) {
      const president = pickFirstPresident(PLAYERS, createSeededRandom(seed))
      expect(PLAYERS).toContain(president)
      seed += 1
    }
  })

  it("R7: selection is reproducible for the same seed", () => {
    const first = pickFirstPresident(PLAYERS, createSeededRandom(99))
    const second = pickFirstPresident(PLAYERS, createSeededRandom(99))
    expect(first).toBe(second)
  })

  it("R7: throws when there are no players to choose from", () => {
    expect(() => pickFirstPresident([], createSeededRandom(1))).toThrow()
  })
})
