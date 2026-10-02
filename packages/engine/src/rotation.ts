/* R11: the presidency passes clockwise to the next living player. R42:
   executed players are skipped (they are simply not in alivePlayers).
   R12: after a Special Election round, rotation returns to the player
   clockwise from the President who CALLED it, not from the appointee -
   so a chain of Special Elections still resolves back to the original
   caller. If the rotation lands back on the appointee anyway, they are
   President twice in a row, which is allowed (R12). */
import { findNextClockwise } from "./clockwise.js"
import type { PlayerId } from "./types.js"

export function getNextPresident(
  seatOrder: readonly PlayerId[],
  currentPresidentId: PlayerId,
  specialElectionReturnTo: PlayerId | null,
  alivePlayers: ReadonlySet<PlayerId>,
): PlayerId {
  const anchor = specialElectionReturnTo ?? currentPresidentId
  const next = findNextClockwise(seatOrder, anchor, (p) => alivePlayers.has(p))
  if (next === null) {
    throw new Error("R11: no living player found to become the next President")
  }
  return next
}

/* R12 bookkeeping: what to remember as the "return to" anchor when a
   Special Election is called right now. Preserves the OLDEST pending
   anchor if one is already set (a chain of Special Elections), otherwise
   starts a new one at the calling President. */
export function getSpecialElectionReturnAnchor(
  currentPresidentId: PlayerId,
  existingReturnTo: PlayerId | null,
): PlayerId {
  return existingReturnTo ?? currentPresidentId
}
