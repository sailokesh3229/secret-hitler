import { describe, expect, it } from "vitest"
import {
  dealPresidentHand,
  discardFromPresidentHand,
  reshuffleIfNeeded,
  resolveChancellorChoice,
} from "./legislative.js"
import { POLICY_FASCIST, POLICY_LIBERAL } from "./types.js"
import type { Policy } from "./types.js"
import { createSeededRandom } from "./testUtils.js"

describe("R26", () => {
  it("R26: deals the top 3 tiles and shrinks the draw pile by 3", () => {
    const deck: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL, POLICY_FASCIST, POLICY_FASCIST]
    const result = dealPresidentHand(deck)
    expect(result.hand).toEqual([POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL])
    expect(result.drawPile).toEqual([POLICY_FASCIST, POLICY_FASCIST])
  })

  it("R26: throws when fewer than 3 tiles remain", () => {
    const deck: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST]
    expect(() => dealPresidentHand(deck)).toThrow()
  })
})

describe("R27", () => {
  it("R27/R28: discards the chosen tile, the other 2 go to the Chancellor in order", () => {
    const hand: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL]
    const result = discardFromPresidentHand(hand, 1)
    expect(result.discarded).toBe(POLICY_FASCIST)
    expect(result.chancellorHand).toEqual([POLICY_LIBERAL, POLICY_LIBERAL])
  })

  it("R27: throws when the hand is not exactly 3 tiles", () => {
    const hand: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST]
    expect(() => discardFromPresidentHand(hand, 0)).toThrow()
  })

  it("R27: throws when tileIndex is out of range", () => {
    const hand: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL]
    expect(() => discardFromPresidentHand(hand, 5)).toThrow()
  })
})

describe("R29", () => {
  it("R29: enacts the chosen tile, discards the other", () => {
    const hand: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST]
    const result = resolveChancellorChoice(hand, 1)
    expect(result.enacted).toBe(POLICY_FASCIST)
    expect(result.discarded).toBe(POLICY_LIBERAL)
  })

  it("R29: throws when the hand is not exactly 2 tiles", () => {
    const hand: Policy[] = [POLICY_LIBERAL]
    expect(() => resolveChancellorChoice(hand, 0)).toThrow()
  })
})

describe("R32", () => {
  it("R32: no reshuffle when 3 or more tiles remain in the draw pile", () => {
    const draw: Policy[] = [POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL]
    const discard: Policy[] = [POLICY_FASCIST]
    const result = reshuffleIfNeeded(draw, discard, createSeededRandom(1))
    expect(result.drawPile).toEqual(draw)
    expect(result.discardPile).toEqual(discard)
  })

  it("R32: reshuffles draw and discard together when fewer than 3 remain", () => {
    const draw: Policy[] = [POLICY_LIBERAL]
    const discard: Policy[] = [POLICY_FASCIST, POLICY_LIBERAL, POLICY_FASCIST]
    const result = reshuffleIfNeeded(draw, discard, createSeededRandom(1))
    expect(result.drawPile.length).toBe(4)
    expect(result.discardPile).toEqual([])
  })
})
