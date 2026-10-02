/* R33: veto is available in every session once 5 Fascist policies have
   been enacted (however they got there) - read from the R5 board table
   (the slot with unlocksVeto), never hard-code "5". R34: once unlocked,
   the Chancellor may request it once per session. R35 (discard both,
   tracker +1) is implemented in reducer.ts since it touches several
   state fields at once. */
import { getFascistBoardSlots } from "./boards.js"
import type { PlayerCount } from "./types.js"

export function isVetoUnlocked(fascistPoliciesEnacted: number, playerCount: PlayerCount): boolean {
  const slots = getFascistBoardSlots(playerCount)
  const unlockSlot = slots.find((s) => s.unlocksVeto)
  if (unlockSlot === undefined) {
    return false
  }
  return fascistPoliciesEnacted >= unlockSlot.slot
}

export function canRequestVeto(
  fascistPoliciesEnacted: number,
  playerCount: PlayerCount,
  vetoRequestedThisSession: boolean,
): boolean {
  if (vetoRequestedThisSession) {
    return false
  }
  return isVetoUnlocked(fascistPoliciesEnacted, playerCount)
}
