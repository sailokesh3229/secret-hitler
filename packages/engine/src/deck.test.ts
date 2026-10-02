import { describe, expect, it } from "vitest"
import { buildPolicyDeck, FASCIST_POLICY_COUNT, LIBERAL_POLICY_COUNT, shuffle } from "./deck.js"
import { POLICY_FASCIST, POLICY_LIBERAL } from "./types.js"
import { createSeededRandom } from "./testUtils.js"

describe("R4", () => {
  it("R4: builds a 17-tile deck with 6 Liberal and 11 Fascist policies", () => {
    const deck = buildPolicyDeck()
    expect(deck.length).toBe(LIBERAL_POLICY_COUNT + FASCIST_POLICY_COUNT)
    expect(deck.filter((tile) => tile === POLICY_LIBERAL).length).toBe(6)
    expect(deck.filter((tile) => tile === POLICY_FASCIST).length).toBe(11)
  })
})

describe("R4 shuffle", () => {
  it("R4: shuffle returns a permutation of the input", () => {
    const deck = buildPolicyDeck()
    const shuffled = shuffle(deck, createSeededRandom(42))
    expect(shuffled.length).toBe(deck.length)
    expect([...shuffled].sort()).toEqual([...deck].sort())
  })

  it("R4: shuffle with a different seed produces a different order", () => {
    const deck = Array.from({ length: 17 }, (_, i) => i)
    const a = shuffle(deck, createSeededRandom(1))
    const b = shuffle(deck, createSeededRandom(2))
    expect(a).not.toEqual(b)
  })
})
