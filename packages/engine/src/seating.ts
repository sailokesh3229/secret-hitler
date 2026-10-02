/* R6: seat order is clockwise. In-person hosts arrange it (so the caller
   just passes that order through unchanged). Online shuffles it at start,
   which is what shuffleSeating does below. R7: the first President is
   chosen uniformly at random from all players. */
import { shuffle } from "./deck.js"
import type { PlayerId, RandomFn } from "./types.js"

export function shuffleSeating(playerIds: readonly PlayerId[], random: RandomFn): PlayerId[] {
  return shuffle(playerIds, random)
}

export function pickFirstPresident(playerIds: readonly PlayerId[], random: RandomFn): PlayerId {
  if (playerIds.length === 0) {
    throw new Error("R7: cannot pick a first President from zero players")
  }
  const index = Math.floor(random() * playerIds.length)
  return playerIds[index] as PlayerId
}
