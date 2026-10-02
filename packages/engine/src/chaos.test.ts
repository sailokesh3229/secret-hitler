import { describe, expect, it } from "vitest"
import { resolveChaos } from "./chaos.js"
import { POLICY_FASCIST, POLICY_LIBERAL } from "./types.js"
import type { Policy } from "./types.js"
import { createSeededRandom } from "./testUtils.js"

describe("R23", () => {
  it("R23: enacts the top policy of the draw pile and resets the tracker", () => {
    const draw: Policy[] = [POLICY_FASCIST, POLICY_LIBERAL, POLICY_LIBERAL, POLICY_FASCIST]
    const result = resolveChaos(draw, [], createSeededRandom(1))
    expect(result.enactedPolicy).toBe(POLICY_FASCIST)
    expect(result.tracker).toBe(0)
  })

  it("R23: the power is ignored - the result carries no power field at all", () => {
    const draw: Policy[] = [POLICY_FASCIST, POLICY_LIBERAL, POLICY_LIBERAL, POLICY_FASCIST]
    const result = resolveChaos(draw, [], createSeededRandom(1))
    expect(Object.keys(result).sort()).toEqual(["discardPile", "drawPile", "enactedPolicy", "tracker"])
  })
})

describe("R23 reshuffle", () => {
  it("R23: with 3 or more tiles remaining after the top one, the discard pile is untouched", () => {
    const draw: Policy[] = [POLICY_FASCIST, POLICY_LIBERAL, POLICY_LIBERAL, POLICY_FASCIST]
    const discard: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST]
    const result = resolveChaos(draw, discard, createSeededRandom(1))
    expect(result.drawPile.length).toBe(3)
    expect(result.discardPile).toEqual(discard)
  })

  it("R23: with fewer than 3 tiles remaining, draw and discard reshuffle into a fresh draw pile", () => {
    const draw: Policy[] = [POLICY_FASCIST, POLICY_LIBERAL]
    const discard: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST, POLICY_FASCIST]
    const result = resolveChaos(draw, discard, createSeededRandom(1))
    expect(result.drawPile.length).toBe(4)
    expect(result.discardPile).toEqual([])
  })

  it("R23: throws when the draw pile is empty", () => {
    expect(() => resolveChaos([], [POLICY_LIBERAL], createSeededRandom(1))).toThrow()
  })
})
