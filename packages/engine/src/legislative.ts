/* R26: President draws the top 3 tiles. R27: discards exactly 1 by
   explicit choice - no random/shuffle option, so the caller must always
   pass a real tileIndex. R28: the other 2 go to the Chancellor together.
   R29: Chancellor discards 1, enacts 1. R31 (discards never shown during
   the game) and R30 (no President/Chancellor chat while holding tiles)
   are UI/chat concerns handled elsewhere - this module only moves
   tiles. R32: reshuffle draw+discard if fewer than 3 remain, at the end
   of every session (including a veto). */
import { shuffle } from "./deck.js"
import type { Policy, RandomFn } from "./types.js"

export const PRESIDENT_HAND_SIZE = 3
export const CHANCELLOR_HAND_SIZE = 2
export const RESHUFFLE_THRESHOLD = 3

export interface DealResult {
  hand: Policy[]
  drawPile: Policy[]
}

export function dealPresidentHand(drawPile: readonly Policy[]): DealResult {
  if (drawPile.length < PRESIDENT_HAND_SIZE) {
    throw new Error("R26: not enough tiles in the draw pile - reshuffle (R32) should have run already")
  }
  return { hand: drawPile.slice(0, PRESIDENT_HAND_SIZE), drawPile: drawPile.slice(PRESIDENT_HAND_SIZE) }
}

export interface PresidentDiscardResult {
  discarded: Policy
  chancellorHand: Policy[]
}

export function discardFromPresidentHand(hand: readonly Policy[], tileIndex: number): PresidentDiscardResult {
  if (hand.length !== PRESIDENT_HAND_SIZE) {
    throw new Error("R27: the President must be holding exactly 3 tiles")
  }
  const inRange = tileIndex >= 0 && tileIndex < hand.length
  if (!inRange) {
    throw new Error("R27: tileIndex is out of range")
  }
  const discarded = hand[tileIndex] as Policy
  const chancellorHand = hand.filter((_, i) => i !== tileIndex)
  return { discarded, chancellorHand }
}

export interface ChancellorChoiceResult {
  enacted: Policy
  discarded: Policy
}

export function resolveChancellorChoice(hand: readonly Policy[], tileIndex: number): ChancellorChoiceResult {
  if (hand.length !== CHANCELLOR_HAND_SIZE) {
    throw new Error("R29: the Chancellor must be holding exactly 2 tiles")
  }
  const inRange = tileIndex >= 0 && tileIndex < hand.length
  if (!inRange) {
    throw new Error("R29: tileIndex is out of range")
  }
  const enacted = hand[tileIndex] as Policy
  const discarded = hand[1 - tileIndex] as Policy
  return { enacted, discarded }
}

export interface ReshuffleResult {
  drawPile: Policy[]
  discardPile: Policy[]
}

/* R32: at the end of every session (including a veto), if fewer than 3
   tiles remain in the draw pile, shuffle draw + discard together into a
   fresh draw pile. Remaining tiles are never revealed by this. */
export function reshuffleIfNeeded(
  drawPile: readonly Policy[],
  discardPile: readonly Policy[],
  random: RandomFn,
): ReshuffleResult {
  const needsReshuffle = drawPile.length < RESHUFFLE_THRESHOLD
  if (!needsReshuffle) {
    return { drawPile: [...drawPile], discardPile: [...discardPile] }
  }
  return { drawPile: shuffle([...drawPile, ...discardPile], random), discardPile: [] }
}
