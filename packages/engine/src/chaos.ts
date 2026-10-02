/* R23: Chaos (3 failed elections) enacts the top draw-pile policy. Its
   power is ignored - this result has no power field at all, so there is
   nothing for a caller to act on. The tracker resets to 0 (R24). Callers
   must separately clear term limits via eligibility.clearTermLimits()
   (R16) and check wins via R43-R46 once Step 4 adds those. If fewer than
   3 tiles remain after removing the top one, draw + discard reshuffle
   into a fresh draw pile (same reshuffle rule as R32). */
import { shuffle } from "./deck.js"
import { resetElectionTracker } from "./tracker.js"
import type { Policy, RandomFn } from "./types.js"

export interface ChaosResult {
  enactedPolicy: Policy
  drawPile: Policy[]
  discardPile: Policy[]
  tracker: number
}

export function resolveChaos(
  drawPile: readonly Policy[],
  discardPile: readonly Policy[],
  random: RandomFn,
): ChaosResult {
  if (drawPile.length === 0) {
    throw new Error("R23: cannot resolve Chaos with an empty draw pile")
  }
  const enactedPolicy = drawPile[0] as Policy
  const remainingDraw = drawPile.slice(1)
  const needsReshuffle = remainingDraw.length < 3
  const nextDrawPile = needsReshuffle ? shuffle([...remainingDraw, ...discardPile], random) : remainingDraw
  const nextDiscardPile = needsReshuffle ? [] : [...discardPile]
  return {
    enactedPolicy,
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    tracker: resetElectionTracker(),
  }
}
